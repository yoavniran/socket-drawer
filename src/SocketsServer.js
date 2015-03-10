"use strict";
var events = require("events"),
    _ = require("lodash"),
    consts = require("./common/consts"),
    util = require("util"),
    async = require("async"),
    providerFactory = require("./providers/factory"),
    defaultBroadcaster = require("./broadcaster"),
    defaultRequestParser = require("./request/requestParser"),
    DefaultRequestMapper = require("./request/RequestMapper"),
    DefaultSessionManager = require("./session/SessionManager"),
    socketsUtils = require("./common/utils");

//todo: allow session functionality to be optional by providing a falsy session-manager property
//todo: allow configuration to run request through socketwares even if handler is not found (default: false)
//todo: add support for session resume and keep alive
//todo: move helper functions to separate class
//todo: change the wares and handlers fn signature to have less arguments
//todo: add API for closing the socket server
//todo: allow registering custom provider
//todo: implement debug module for dev/troubleshooting

var SocketsServer = (function () {

    //todo: move to consts
    var sessionManagerKey = "session-manager",
        broadcasterKey = "broadcaster",
        requestMapperKey = "request-mapper",
        requestParseKey = "request-parser",
        connectionIdKey = "connection-id";

    var defaults = {
        "sessionKeepAliveTime": 30000,
        "tokenSecretLength": 16,
        "externalSession": false,
        "tokenizeConnection": false,
        "requestTokenKey": "token",
        "checkTokenOnMethods": null,
        "silentFail": false,
        "debug": false
    };

    /**
     * creates a new instance of Sockets Server on top of the sock JS Server
     *
     * @param httpServer
     * @param options
     *
     *              httpServer - (mandatory)
     *              sockUrl - (optional) location of public js file (sockjs)
     *              path - the relative path the web sockets server will listen on
     *              handlers - (optional) Array of handler maps
     *              config - (optional) collection of configs that can be used during the lifetime of the server and whe handling requests
     *                         - implementation (default: ws) - ws, sockjs, socket.io
     *                         - session-manager
     *                         - broadcaster
     *                         - request-mapper
     *                         - request-parser
     *                         - sessionKeepAliveTime (default: 30000 ms)
     *                         - tokenSecretLength (default: 16)
     *                         - tokenizeConnection (default: false)
     *                         - requestTokenKey    (default: _token)
     *                         - checkTokenOnMethods, Array (default: null = check on all methods)
     *                         - externalSession (default: false)
     *                         - debug (default: false) - make the server log stuff to the console
     *
     *                         - dataEventName - used only by socketio connector to allow its client to emit events with a different name. default is "message"
     * @constructor
     */
    function SocketsServer(options) {

        events.EventEmitter.call(this);

        options.handlers = options.handlers || [];
        options.config = _.extend({}, defaults, options.config); //override defaults from the config received
        options.implementation = options.implementation || consts.IMPLEMENTATIONS.WS; //default to WS

        this._options = options;
        this._propertyBag = {};
        this._socketsProvider = null;
        this._socketsWares = [];
        this._connections = {};

        _initialize.call(this, options);
    }

    util.inherits(SocketsServer, events.EventEmitter);  //inherit Event Emitter methods

    SocketsServer.prototype.start = function(){
        _startServer.call(this, this._options);
    };

    SocketsServer.prototype.stop = function(){
        throw new Error("not implemented");
    };

    /**
     *  passes a socketsware method to be used during the processing of incoming requests
     *
     *  accepts either a function (socketsware) with optional name and options parameters
     *  or
     *  accepts a hash/array of objects each with 3 config :
     *          {handler: Function, name: String, options: Object}
     *  or
     *  accepts a hash/array of functions
     */
    SocketsServer.prototype.use = function (socketsware, name, options) {

        var wares = socketsware;

        if (_.isFunction(socketsware)) {
            wares = [
                {handler: socketsware, name: name, options: options}
            ];
        }

        _.each(wares, function (item) {

            if (_.isFunction(item)) {
                item = {handler: item};
            }

            item.name = item.name || _.uniqueId("sw");

            if (!_.isFunction(item.handler)) {
                throw new TypeError("SD.SocketsServer - a socketsware must be a function");
            }

            this._socketsWares.push(item);
        }, this);
    };

    /**
     *
     * @param key
     *          can either be an String or Object in order to set multiple key/value pairs
     * @param value
     *              can be any type
     */
    SocketsServer.prototype.set = function (key, value) {
        socketsUtils.assignPars(this._propertyBag, key, value);
    };

    SocketsServer.prototype.unset = function (key) {
        delete this._propertyBag[key];
    };

    SocketsServer.prototype.get = function (key) {
        return this._propertyBag[key];
    };

    /**
     * check if a given property is a Boolean true
     * @param key
     * @returns {boolean}
     */
    SocketsServer.prototype.enabled = function (key) {
        return this.get(key) === true;
    };

    /**
     * adds request handling to process incoming requests
     * @param handler
     *          handler can be:
     *              1) function which is a map of urls and their handling code
     *              2) an object with a map method
     *              3) array of either functions or objects each with a map method
     */
    SocketsServer.prototype.addRequestHandling = function (handler) {

        var requestMapper = this.get(requestMapperKey);

        if (!_.isArray(handler)) {
            handler = [handler];
        }

        _.each(handler, function (h) {
            requestMapper.addHandler(h);
        });
    };

    SocketsServer.prototype.publish = function (session, resource, data, isError, clientId) {

        var connId = session.get(connectionIdKey);

        this.publishToConnection(connId, resource, data, isError, clientId);
    };

    SocketsServer.prototype.publishToConnection = function (connId, resource, data, isError, clientId) {

        var broadcaster = this.get(broadcasterKey);
        var conn = this._connections[connId];

        if (conn) {
            _publish.call(this, broadcaster, conn, resource, data, isError, clientId);
        }
        else {
            throw new Error("SD.SocketsServer - no connection found for id: " + connId);
        }
    };

    function _initialize(options) {

        this.set(options.config); //use everything in config

        this.set(requestParseKey, (options[requestParseKey] || defaultRequestParser));
        this.set(broadcasterKey, (options[broadcasterKey] || defaultBroadcaster));
        this.set(requestMapperKey, (options[requestMapperKey] || new DefaultRequestMapper(_.clone(options.config))));
        this.set(sessionManagerKey, (options[sessionManagerKey] || new DefaultSessionManager(_.clone(options.config))));

        _addInitHandlers.call(this, options.handlers);
    }

    function _addInitHandlers(handlers) {

        if (handlers) {

            if (_.isArray(handlers)) {
                this.addRequestHandling(handlers);
            }
            else {
                _.each(handlers, function (h) {
                    this.addRequestHandling(h);
                }, this);
            }
        }
    }

    function _startServer(options) {

        _log.call(this, "SD.SocketsServer - websockets implementation is: " + options.implementation);
        this._socketsProvider = providerFactory.getProvider(options.implementation, options);

        this._socketsProvider.start(options);
        this._socketsProvider.onNewConnection(_onIncomingConnection.bind(this), options);
    }

    function _onIncomingConnection(conn) {

        var sessionManager = this.get(sessionManagerKey);
        var connId = conn.getId();

        _log.call(this, "SD.SocketsServer - incoming connection: " + connId);

        this._connections[connId] = conn;

        conn.onData(_onIncomingData.bind(this, connId));
        conn.onClose(_onConnectionClose.bind(this, connId));

        if (!this.enabled("externalSession")) {     //if not relying on external session create one now
            sessionManager.createSession(_onNewSessionCreated.bind(this, connId));
        }

        this.emit("sockets:connection:new", {id: connId}); //intentionally not passing the connection ref to the outside
    }

    function _onNewSessionCreated(connId, err, session) {

        if (err && !_isSilentFail.call(this)) {
            throw new Error("SocketsServer - Failed to create session for incoming connection");
        }

        session.set(connectionIdKey, connId);

        this.emit("sockets:session:create", session);
    }

    function _onIncomingData(connId, msg) {

        setImmediate(function () {  //defer handling of incoming data, to allow creation of session to complete

            _log.call(this, "SD.SocketsServer - incoming data on connection: " + connId, msg);

            this.emit("incoming:msg", {connId: connId, message: msg});

            var requestParser = this.get(requestParseKey);
            var sessionManager = this.get(sessionManagerKey);

            var session = sessionManager.find(connectionIdKey, connId);

            if (!session && !this.enabled("externalSession")) {   //if session was supposed to be created internally on connection
                throw new Error("SD.SocketsServer - incoming data on session-less connection");
            }

            var data = requestParser.parse(msg);

            _processRequest.call(this, connId, session, data);
        }.bind(this));
    }

    function _processRequest(connId, session, data) {

        var requestMapper = this.get(requestMapperKey);
        var sessionManager = this.get(sessionManagerKey);
        var helperFunctions = _getHelperFunctions.call(this, connId, data);
        var handlerData = requestMapper.getRequestHandler(data);

        if (handlerData) {    //without a handler we dont bother with the socketwares
            _runRequestThroughWares.call(this, connId, data, handlerData, session, helperFunctions,
                function (err) {

                    if (err) {
                        var sdError = new Error("SD.SocketsServer - socketware returned an error!");
                        sdError.socketWareError = err;
                        throw sdError;
                    }

                    session = session || sessionManager.find(connectionIdKey, connId); //its possible that a socketware attached a session to the connection so we need to use it

                    if (_checkRequest.call(this, data, session)) { //ensure we have valid token from client if configured to check

                        handlerData.handler(
                            data.resource,                                      //request resource
                            data.data,                                          //request data
                            data.metadata,                                      //request metadata
                            data.method,                                        //request method
                            {keys: handlerData.keys, path: handlerData.path},   //path data
                            session,                                            //session
                            helperFunctions.publish                             //publish helper function
                        );
                    }
                    else {
                        if (!_isSilentFail.call(this)) {
                            throw new Error("SD.SocketServer - request failed token check");
                        }
                    }

                }.bind(this));
        }
        else {
            _log.call(this, "SD.SocketServer - _checkRequest - no handler found for request - ", data);

            if (!_isSilentFail.call(this)) {
                throw new Error("SD.SocketServer - handler not found for incoming request");
            }
        }
    }

    function _getHelperFunctions(connId, data) {

        var sessionManager = this.get(sessionManagerKey);
        var clientId = (data && data.metadata && data.metadata.clientRequestId) ? data.metadata.clientRequestId : undefined;

        function publish(publishData, isError, resource) {
            resource = resource || data.resource;  //replying on the same resource as in the request
            this.publishToConnection(connId, resource, publishData, isError, clientId);
        }

        function attachSession(key, val) {

            var session = sessionManager.find(key, val);

            if (session) {

                var sessionConnId = session.get(connectionIdKey);

                if (!sessionConnId || sessionConnId === connId) {
                    session.set(connectionIdKey, connId); //match a previously created session with the sockets connection
                }
                else {
                    throw new Error("SocketsServer - attachSession - cant attach session, its already attached to different connection")
                }
            }
            else {
                throw new Error("SocketsServer - attachSession - couldnt find session object for key=" + key + ", val=" + val);
            }
        }

        function get(key) {
            return this.get(key);
        }

        return {
            publish: publish.bind(this),
            attachSession: attachSession,
            get: get.bind(this)
        }
    }

    function _checkRequest(data, session) {
        //todo: support a custom checker function
        var valid = true;

        if (this.enabled("tokenizeConnection")) { //configured to check token on incoming requests

            var checkOnMethods = this.get("checkTokenOnMethods"); //by default check all types of requests

            if (!checkOnMethods || checkOnMethods.indexOf(data.method) > -1) {

                var sessionChecked = session.get("session-security-checked"); //if not already checked

                if (sessionChecked !== true) {

                    valid = false;

                    var tokenKey = this.get("requestTokenKey");
                    var token = data.metadata[tokenKey];

                    if (token) {
                        valid = session.isValid(token);

                        if (valid) {
                            session.set("session-security-checked", true);
                        }
                    }
                    else {
                        if (!_isSilentFail.call(this)) {
                            throw new Error("SD.SocketServer - incoming request doesn't have token in metadata '" + tokenKey + "'");
                        }
                    }
                }
                else {
                    valid = true;
                }
            }
        }

        return valid;
    }

    function _runRequestThroughWares(connId, data, handlerData, session, helperFunctions, callback) {

        var sessionManager = this.get(sessionManagerKey);

        var wareFns = _.map(this._socketsWares, function (ware) {
            return function (next) {

                session = session || sessionManager.find(connectionIdKey, connId);  //its possible that a socketware attached a sesionn to the connection

                ware.handler(
                    data.resource,
                    data.data,
                    data.metadata,
                    data.method,
                    {keys: handlerData.keys, path: handlerData.path},
                    session,
                    helperFunctions,
                    next
                );
            };
        });

        async.series(wareFns, function (err) {
            callback(err);
        });
    }

    function _publish(broadcaster, conn, resource, data, isError, clientId) {

        isError = !!isError;

        var msg = {
            resource: resource,
            isError: isError,
            data: data,
            clientId: clientId
        };

        _log.call(this, "about to publish msg to connection: ", msg);
        broadcaster.publishToConnection(msg, conn);
    }

    function _isSilentFail() {
        return this.get("silentFail");
    }

    function _onConnectionClose(connId) {

        setImmediate(function () {  //defer handling of conn closing, to allow creation of session to complete

            delete this._connections[connId];

            var sessionManager = this.get(sessionManagerKey);
            var session = sessionManager.find(connectionIdKey, connId);

            if (session) {
                this.emit("session:destroying", session);
                sessionManager.destroySession(session.getId());
            }
        }.bind(this));
    }

    function _log() {
        if (this.enabled("debug")) {
            console.log.apply(console, arguments);
        }
    }

    return SocketsServer;
})();

module.exports = SocketsServer;