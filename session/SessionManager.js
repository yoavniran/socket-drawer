"use strict";
var _ = require("lodash"),
    uuid = require("node-uuid"),
    logger = require("../../common/logger"),
    Session = require("./SocketsSession");

        //todo: add support for resume and keep alive

var SessionManager = (function () {

    function SessionManager(options) {

        this._config = _.extend({}, options);
        this._sessions = {};
        this._keepAlives = {};
    }

    SessionManager.prototype.createSession = function (callback) {

        var id = uuid(); //make sure we have an id for the session

        logger.debug("[SessionManager]:: createSession: called for connection: " + id);

        var opts = {
            tokenizeConnection: this._config.tokenizeConnection,
            tokenSecretLength: this._config.tokenSecretLength
        };

        Session.create(id, opts, _sessionCreated.bind(this, callback, id));

        return this;
    };

    SessionManager.prototype.destroySession = function (id, immediate) {

        //move to keep alives
        //schedule real destroy after configured keep alive time
        //todo: how to resume session for a reconnected session??? using token? need to keep alive the token for a while
    };

    SessionManager.prototype.resumeSession = function () {

    };

    /**
     * get session with property matching the value passed
     * @param key
     *      the name of the property
     * @param value
     *      the value of the property
     */
    SessionManager.prototype.find = function (key, value) {

        var match = _.find(this._sessions, function (session) {
            return session.get(key) === value;
        });

        return match;
    };

    SessionManager.prototype.isKeptAlive = function (token) {


    };

    function _sessionCreated(callback, id, err, session) {

        logger.debug("[SessionManager]:: _sessionCreated: session created -- err = ", err);

        if (!err && session) {
            this._sessions[id] = session;
        }

        callback(err, session);
    }

    return SessionManager;
})();

module.exports = SessionManager;