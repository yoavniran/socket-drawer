"use strict";
var events = require("events"),
    _ = require("lodash"),
    util = require("util"),
    async = require("async"),
    sockjs = require("sockjs"),
    defaultBroadcaster = require("./broadcaster"),
    defaultRequestParser = require("./request/requestParser"),
    DefaultRequestMapper = require("./request/RequestMapper"),
    DefaultSessionManager = require("./session/SessionManager"),
    logger = require("../common/logger"),
    socketsUtils = require("./utils");

//todo: allow session functionality to be optional by providing a falsy session-manager property
//todo: add support for session resume and keep alive
//todo: move helper functions to separate class

var SocketsServer = (function () {

    var sessionManagerKey = "session-manager",
        broadcasterKey = "broadcaster",
        requestMapperKey = "request-mapper",
        requestParseKey = "request-parser",
        connectionIdKey = "connection-id";

    var defaults = {
        "sessionKeepAliveTime": 30000,
        "tokenSecretLength": 16,
        "externalSession": false,
        "tokenizeConnection": true,
        "requestTokenKey": "token",
        "checkTokenOnMethods": null
    };

    /**
     * creates a new instance of Sockets Server on top of the sock JS Server
     *
     * @param httpServer
     * @param options
     *
     *              sockUrl - location of publich sock js js file
     *              prefix - the sock js prefix
     *              handlers - Array of handler maps
     *              config - collection of configs that can be used during the lifetime of the server and whe handling requests
     *                         - session-manager
     *                         - broadcaster
     *                         - request-mapper
     *                         - request-parser
     *                         - sessionKeepAliveTime (default: 30000 ms)
     *                         - tokenSecretLength (default: 16)
     *                         - tokenizeConnection (default: true)
     *                         - requestTokenKey    (default: _token)
     *                         - checkTokenOnMethods, Array (default: null = check on all methods)
     *                         - externalSession (default: false)
     * @constructor
     */
    function SocketsServer(httpServer, options) {

        events.EventEmitter.call(this);

        logger.debug("[SocketsServer]:: initialize : about to configure web sockets server");

        options.handlers = options.handlers || [];
        options.config = _.extend({}, defaults, options.config);

        this._propertyBag = {};
        this._sockJsServer = null;
        this._socketsWares = [];
        this._connections = {};

        _initialize.call(this, httpServer, options);
    }

    util.inherits(SocketsServer, events.EventEmitter);  //inherit Event Emitter methods

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
                throw new TypeError("SocketsServer - a socketsware must be a function");
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

    SocketsServer.prototype.publish = function (session, resource, data, isError) {

        var connId = session.get(connectionIdKey);

        this.publishToConnection(connId, resource, data, isError);
    };

    SocketsServer.prototype.publishToConnection = function (connId, resource, data, isError) {

        var broadcaster = this.get(broadcasterKey);
        var conn = this._connections[connId];

        if (conn) {
            _publish(broadcaster, conn, resource, data, isError);
        }
        else {
            logger.warn("[SocketsServer]:: publish: failed to find connection with id: " + connId);
        }
    };

    function _initialize(httpServer, options) {

        if (!_.isEmpty(options.config)) {
            this.set(options.config);
        }

        var config = _.extend({}, options.config);

        this.set(requestParseKey, (options[requestParseKey] || defaultRequestParser));
        this.set(broadcasterKey, (options[broadcasterKey] || defaultBroadcaster));
        this.set(requestMapperKey, (options[requestMapperKey] || new DefaultRequestMapper(config)));
        this.set(sessionManagerKey, (options[sessionManagerKey] || new DefaultSessionManager(config)));

        _addInitHandlers.call(this, options.handlers);
        _startServer.call(this, httpServer, options);
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

    function _startServer(httpServer, options) {

        this._sockJsServer = sockjs.createServer({
            sockjs_url: options.sockUrl,
            prefix: options.prefix
        });

        this._sockJsServer.installHandlers(httpServer);

        this._sockJsServer.on("connection", _onIncomingConnection.bind(this));
    }

    function _onIncomingConnection(conn) {

        logger.debug("[SocketsServer]:: _onIncomingConnection: new connection has been established");

        logger.debug("[SocketsServer]:: _onIncomingConnection: >>>> connection headers = ", conn.headers);
        logger.debug("[SocketsServer]:: _onIncomingConnection: >>>> connection url = ", conn.url);
        logger.debug("[SocketsServer]:: _onIncomingConnection: >>>> connection pathname = ", conn.pathname);

        var sessionManager = this.get(sessionManagerKey);
        var connId = conn.id;

        this._connections[connId] = conn;

        conn.on("data", _onIncomingData.bind(this, connId));
        conn.on("close", _onConnectionClose.bind(this, connId));

        if (!this.enabled("externalSession")) {     //if not relying on external session create one now
            sessionManager.createSession(connId, _onNewSessionCreated.bind(this, connId));
        }

        this.emit("sockets:connection:new"); //intentionally not passing the connection ref to the outside
    }

    function _onNewSessionCreated(connId, err, session) {

        if (err) {
            throw new Error("SocketsServer - Failed to create session for incoming connection");
        }

        session.set(connectionIdKey, connId);

        logger.debug("[SocketsServer]:: _onNewSessionCreated: new sockets session created for connection");
        this.emit("sockets:session:create", session);
    }

    function _onIncomingData(connId, msg) {

        setImmediate(function () {  //defer handling of incoming data, to allow creation of session to complete

            logger.debug("[SocketsServer]:: _onIncomingData: received incoming data");
            this.emit("incoming:msg", msg);

            var requestParser = this.get(requestParseKey);
            var sessionManager = this.get(sessionManagerKey);

            var session = sessionManager.find(connectionIdKey, connId);

            if (!session && !this.enabled("externalSession")) {   //if session was supposed to be created internally on connection
                throw new Error("SocketsServer - incoming data on session-less connection");
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

        if (handlerData) {
            _runRequestThroughWares.call(this, connId, data, handlerData, session, helperFunctions,
                function (err) {

                    if (err) {
                        logger.error("SocketsServer - socketware raised an error - ", err);
                        return; //dont execute the handler
                    }

                    session = session || sessionManager.find(connectionIdKey, connId); //its possible that a socketware attached a session to the connection so we need to use it

                    if (_checkRequest.call(this, data, session)) { //ensure we have valid token from client if configured to check

                        logger.debug("[SocketsServer]:: _processRequest: about to execute handler for request on resource: " + data.resource);

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
                        logger.warn("[SocketsServer]:: _processRequest: REQUEST FAILED TOKEN CHECK!!! ");
                    }

                }.bind(this));
        }
        else {
            logger.debug("[SocketsServer]:: _processRequest: didnt find handler for incoming request");
        }
    }

    function _getHelperFunctions(connId, data) {

        var sessionManager = this.get(sessionManagerKey);

        function publish(publishData, isError, resource) {
            resource = resource || data.resource;  //replying on the same resource as in the request
            this.publishToConnection(connId, resource, publishData, isError);
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

        var valid = true;

        if (this.enabled("tokenizeConnection")) { //configured to check token on incoming requests

            var checkOnMethods = this.get("checkTokenOnMethods"); //by default check all types of requests

            if (!checkOnMethods || checkOnMethods.indexOf(data.method) > -1) {

                var sessionChecked = session.get("session-security-checked");

                if (sessionChecked !== true) {

                    valid = false;

                    var tokenKey = this.get("requestTokenKey");
                    var token = data.metadata[tokenKey];

                    if (token) {
                        valid = session.isValid(token);

                        logger.debug("[SocketsServer]:: _checkRequest: incoming request for resource: " + data.resource +" valid = " + valid);

                        if (valid){
                            session.set("session-security-checked", true);
                        }
                    }
                    else {
                        logger.debug("[SocketsServer]:: _checkRequest: incoming request doesnt have token in metadata '" + tokenKey + "'");
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

                logger.debug("[SocketsServer]:: _runRequestThroughWares: about to run socketsware - " + ware.name);

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

        logger.debug("[SocketsServer]:: _runRequestThroughWares: about to run request data through " + wareFns.length + " socketswares");

        async.series(wareFns, function (err) {
            callback(err);
        });
    }

    function _publish(broadcaster, conn, resource, data, isError) {

        isError = !!isError;

        var msg = {
            resource: resource,
            isError: isError,
            data: data
        };

        logger.debug("[SocketsServer]:: _respond : about to publish msg to connection (" + conn.id + ") on resource: " + resource);
        broadcaster.publishToConnection(msg, conn);
    }

    function _onConnectionClose(connId) {

        setImmediate(function () {  //defer handling of conn closing, to allow creation of session to complete

            logger.debug("[SocketsServer]:: _onConnectionClose: connection closing");

            delete this._connections[connId];

            var sessionManager = this.get(sessionManagerKey);
            var session = sessionManager.find(connectionIdKey, connId);

            if (session) {
                sessionManager.destroySession(session.id);
            }

            this.emit("session:destroyed", session);
        }.bind(this));
    }

    return SocketsServer;
})();

module.exports = SocketsServer;