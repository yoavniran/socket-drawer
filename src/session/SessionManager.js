var _ = require("lodash"),
    debug = require("debug")("sdrawer:SessionManager"),
    uuid = require("node-uuid"),
    Session = require("./SocketsSession");

var SessionManager = (function () {
    "use strict";

    function SessionManager(options) {

        this._config = _.extend({}, options);
        this._sessions = {};
    }

    SessionManager.prototype.createSession = function (callback) {

        var id = uuid(); //make sure we have an id for the session

        var opts = {
            tokenizeConnection: this._config.tokenizeConnection,
            tokenSecretLength: this._config.tokenSecretLength
        };

        debug("about to create a new session with id: " + id);

        Session.create(id, opts, _sessionCreated.bind(this, callback, id));

        return this;
    };

    SessionManager.prototype.destroySession = function (id) {

        var session = this._sessions[id];

        if (session && !session.isDestroyed()) {
            session.destroy();
        }

        delete this._sessions[id];
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

    function _sessionCreated(callback, id, err, session) {

        if (!err && session) {
            debug("created new session");
            this._sessions[id] = session;
        }
        else {
            session = null;
            debug("failed to create session! - ", err);
        }

        callback(err, session);
    }

    return SessionManager;
})();

module.exports = SessionManager;