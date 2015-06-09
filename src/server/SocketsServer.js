var events = require("events"),
    _ = require("lodash"),
    util = require("util"),
    debug = require("debug")("sdrawer:SocketServer"),
    async = require("async"),
    consts = require("../common/consts"),
    socketsUtils = require("../common/utils"),
    providerFactory = require("../providers/factory"),
    defaultBroadcaster = require("./broadcaster"),
    defaultRequestParser = require("../request/requestParser"),
    DefaultRequestMapper = require("../request/RequestMapper"),
    DefaultSessionManager = require("../session/SessionManager"),
    serverHelperFunctions = require("./serverHelperFunctions");

//todo: stop listening to incoming connections when server stops
//todo: stop provider when server stops
//todo: add started validation to server operations
//todo: consider using custom Error type(s)

var SocketsServer = (function () {
    "use strict";

    var KEYS = consts.SERVER_KEYS,

        defaults = {
            "tokenSecretLength": 16,
            "externalSession": false,
            "tokenizeConnection": false,
            "requestTokenKey": "token",
            "checkTokenOnMethods": null,
            "session-identifier-key": "connection-id",
            "silentFail": false
        };

    /**
     * creates a new instance of Sockets Server on top of the sock JS Server
     *
     * @param options
     *
     *              httpServer - (mandatory)
     *              implementation (default: ws) - ws, sockjs, socket.io
     *              sockUrl - (optional) location of public js file (sockjs)
     *              path - (optional) the relative path the web sockets server will listen on
     *              handlers - (optional) Array of handler maps
     *              config - (optional) collection of configs that can be used during the lifetime of the server and whe handling requests
     *                         - session-manager
     *                         - broadcaster
     *                         - request-mapper
     *                         - request-parser
     *                         - session-identifier-key (default: "connection-id") - allows to determine the key session manager or session use to store their id
     *                         - tokenSecretLength (default: 16)
     *                         - tokenizeConnection (default: false)
     *                         - requestTokenKey    (default: token)
     *                         - checkTokenOnMethods, Array (default: null = check on all methods)
     *                         - externalSession (default: false)
     *                         - dataEventName - used only by socketio connector to allow its client to emit events with a different name. default is "message"
     * @constructor
     */
    function SocketsServer(options) {

        events.EventEmitter.call(this);

        options = options || {};
        options.handlers = options.handlers || [];
        options.config = _.extend({}, defaults, options.config); //override defaults from the config received
        options.implementation = options.implementation || consts.IMPLEMENTATIONS.WS; //default to WS

        this._running = false;
        this._options = options;  //todo: clone !!!
        this._propertyBag = Object.create(null);
        this._socketsProvider = null;
        this._socketsWares = [];
        this._connections = {};

        _initialize.call(this, options);
    }

    util.inherits(SocketsServer, events.EventEmitter);  //inherit Event Emitter methods

    SocketsServer.prototype.start = function () {
        _startServer.call(this, this._options);
    };

    SocketsServer.prototype.stop = function () {
        _stopServer.call(this);
    };

    SocketsServer.prototype.isRunning = function () {
        return this._running;
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

        debug("use - registering socket ware(s)");

        var wares = socketsware;

        if (_.isFunction(socketsware)) {
            wares = [
                {handler: socketsware, name: name, options: options}
            ];
        }

        _.each(wares, function (item) {

            if (_.isFunction(item)) {
                item = {handler: item, name: item.swname};
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

        var requestMapper = this.get(KEYS.REQUEST_MAPPER_KEY);

        if (!_.isArray(handler)) {
            handler = [handler];
        }

        _.each(handler, function (h) {
            requestMapper.addHandler(h);
        });
    };

    SocketsServer.prototype.publish = function (session, resource, data, isError, clientId) {

        var connId = session.get(this.get(KEYS.CONNECTION_ID_KEY));

        this.publishToConnection(connId, resource, data, isError, clientId);
    };

    SocketsServer.prototype.publishToConnection = function (connId, resource, data, isError, clientId) {
        _publish.call(this, connId, resource, data, isError, clientId);
    };

    SocketsServer.prototype.getConnection = function (connId) {
        return this._connections[connId];
    };

    function _initialize(options) {

        this.set(options.config); //use everything in config as properties

        this.set(KEYS.REQUEST_PARSER_KEY, (options[KEYS.REQUEST_PARSER_KEY] || defaultRequestParser));
        this.set(KEYS.BROADCASTER_KEY, (options[KEYS.BROADCASTER_KEY] || defaultBroadcaster));
        this.set(KEYS.REQUEST_MAPPER_KEY, (options[KEYS.REQUEST_MAPPER_KEY] || new DefaultRequestMapper(_.clone(options.config))));
        this.set(KEYS.SESSION_MANAGER_KEY, (options[KEYS.SESSION_MANAGER_KEY] || new DefaultSessionManager(_.clone(options.config))));

        _addInitHandlers.call(this, options.handlers);
    }

    function _addInitHandlers(handlers) {

        if (handlers) {

            if (!_.isArray(handlers)) {
                handlers = _.map(handlers, function (h) {
                    return h;
                });
            }

            this.addRequestHandling(handlers);
        }
    }

    function _startServer(options) {

        if (!this.isRunning()) {
            debug("starting server. websockets implementation is: " + options.implementation);
            this._socketsProvider = providerFactory.getProvider(options.implementation, options);
            this._socketsProvider.start(options);
            this._socketsProvider.onNewConnection(_onIncomingConnection.bind(this), options);

            this._running = true;
        }
        else {
            debug("start server called when server is already running");
        }
    }

    function _stopServer() {

        if (this.isRunning()) {
            //todo: implement stopping procedures

            this._socketsProvider.stop();

        }

        this._running = false;

        throw new Error("not implemented");
    }

    function _onIncomingConnection(conn) {

        var sessionManager = this.get(KEYS.SESSION_MANAGER_KEY);
        var connId = conn.getId();

        debug("incoming connection: " + connId);

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

        session.set(this.get(KEYS.CONNECTION_ID_KEY), connId);

        this.emit("sockets:session:create", session);
    }

    function _onIncomingData(connId, msg) {

        socketsUtils.setImmediate(function () {  //defer handling of incoming data, to allow creation of session to complete

            debug("incoming data on connection: " + connId, msg);

            this.emit("incoming:msg", {connId: connId, message: msg});

            var requestParser = this.get(KEYS.REQUEST_PARSER_KEY);
            var sessionManager = this.get(KEYS.SESSION_MANAGER_KEY);

            var session = sessionManager.find(this.get(KEYS.CONNECTION_ID_KEY), connId);

            if (!session && !this.enabled("externalSession")) {   //if session was supposed to be created internally on connection
                throw new Error("SD.SocketsServer - incoming data on session-less connection");
            }

            var data = requestParser.parse(msg);

            _processRequest.call(this, connId, session, data);
        }.bind(this));
    }

    function _processRequest(connId, session, data) {

        var requestMapper = this.get(KEYS.REQUEST_MAPPER_KEY);
        var sessionManager = this.get(KEYS.SESSION_MANAGER_KEY);
        var helperFunctions = _getHelperFunctions.call(this, connId, data);   //todo: move helper fns to separate helper
        var handlerData = requestMapper.getRequestHandler(data);

        if (handlerData) {    //without a handler we dont bother with the socketwares
            _runRequestThroughWares.call(this, connId, data, handlerData, session, helperFunctions,
                function (err) {

                    if (err) {
                        var sdError = new Error("SD.SocketsServer - socketware returned an error!");
                        sdError.socketWareError = err;
                        throw sdError;
                    }

                    _runRequestHandling.call(this, connId, data, session, helperFunctions, sessionManager, handlerData);
                }.bind(this));
        }
        else {
            debug("_checkRequest - no handler found for request - ", data);

            if (!_isSilentFail.call(this)) {
                throw new Error("SD.SocketServer - handler not found for incoming request");
            }
        }
    }

    function _runRequestHandling(connId, data, session, helperFunctions, sessionManager, handlerData) {

        session = session || sessionManager.find(this.get(KEYS.CONNECTION_ID_KEY), connId); //its possible that a socketware attached a session to the connection so we need to use it

        if (_checkRequest.call(this, data, session)) { //ensure we have valid token from client if configured to check

            /* todo: refactor parameters structure
             {
             data,
             metadata
             resource,
             method,
             pathInfo: {
             keys,
             path
             },
             session,
             helpers.publish
             },
             */

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
    }

    function _getHelperFunctions(connId, data) {

        return serverHelperFunctions.getFunctions(this, connId, data);
    }

    function _checkRequest(data, session) {

        var valid = true;

        if (this.enabled("tokenizeConnection")) { //configured to check token on incoming requests

            if (!session) {
                throw new Error("SD.SocketServer - cannot check request using token as session isnt provided");
            }

            var checkOnMethods = this.get("checkTokenOnMethods"); //by default check all types of requests

            if (!checkOnMethods || checkOnMethods.indexOf(data.method) > -1) {

                var sessionChecked = session.get("session-security-checked"); //if not already checked

                if (sessionChecked !== true) {
                    valid = _isValidSessionToken.call(this, data, session);

                    if (valid) {
                        session.set("session-security-checked", true);
                    }
                }
                else {
                    valid = true;
                }
            }
        }

        return valid;
    }

    function _isValidSessionToken(data, session) {

        var valid = false;
        var tokenKey = this.get("requestTokenKey");
        var token = data.metadata[tokenKey];

        if (token) {
            valid = session.isValid(token);
        }
        else {
            if (!_isSilentFail.call(this)) {
                throw new Error("SD.SocketServer - incoming request doesn't have token in metadata '" + tokenKey + "'");
            }
        }

        return valid;
    }

    function _validateIsRunning() {

        if (!this.isRunning()) {
            throw new Error("SD.SocketsServer - server isn't running, operation not allowed");
        }
    }

    function _runRequestThroughWares(connId, data, handlerData, session, helperFunctions, callback) {

        var sessionManager = this.get(KEYS.SESSION_MANAGER_KEY);

        var wareFns = _getWaresCalls.call(this, connId, this._socketsWares, sessionManager, {
            data: data,
            handlerData: handlerData,
            session: session,
            helperFunctions: helperFunctions
        });

        async.series(wareFns, function (err) {
            callback(err);
        });
    }

    function _getWaresCalls(connId, wares, sessionManager, reqData) {

        var connIdKey = this.get(KEYS.CONNECTION_ID_KEY);
        var session = reqData.session,
            data = reqData.data;

        return _.map(wares, function (ware) {
            return function (next) {

                session = session || sessionManager.find(connIdKey, connId);  //its possible that a socketware attached a sesionn to the connection

                /* todo: refactor parameters structure into a single object instead of sep pars
                 {
                 data,
                 metadata
                 resource,
                 method,
                 pathInfo: {
                 keys,
                 path
                 },
                 session,
                 helpers
                 },
                 next
                 */

                ware.handler(
                    data.resource,
                    data.data,
                    data.metadata,
                    data.method,
                    {keys: reqData.handlerData.keys, path: reqData.handlerData.path},
                    session,
                    reqData.helperFunctions,
                    next
                );
            };
        });
    }

    function _publish(connId, resource, data, isError, clientId) {

        _validateIsRunning.call(this);

        var broadcaster = this.get(KEYS.BROADCASTER_KEY);
        var conn = this.getConnection(connId);

        if (!conn) {
            throw new Error("SD.SocketsServer - no connection found for id: " + connId);
        }

        isError = !!isError;

        var msg = {
            resource: resource,
            isError: isError,
            data: data,
            clientId: clientId
        };

        debug("about to publish msg to connection: ", msg);
        broadcaster.publishToConnection(msg, conn);
    }

    function _isSilentFail() {
        return this.enabled("silentFail");
    }

    function _onConnectionClose(connId) {

        socketsUtils.setImmediate(function () {  //defer handling of conn closing, to allow creation of session to complete

            delete this._connections[connId];

            var sessionManager = this.get(KEYS.SESSION_MANAGER_KEY);
            var session = sessionManager.find(this.get(KEYS.CONNECTION_ID_KEY), connId);

            if (session) {
                this.emit("session:destroying", session);
                sessionManager.destroySession(session.getId());
            }
        }.bind(this));
    }

    //SocketsServer.DEFAULT_PROP_NAMES = //todo: expose the names of the default properties

    return SocketsServer;
})();

module.exports = SocketsServer;