"use strict";

var _ = require("lodash"),
    tokenizer = require("./tokenizer"),
    socketsUtils = require("../common/utils");

var SocketsSession = (function () {

    var idKey = "_id",
        createdTimeKey = "_created",
        tokenKey = "_token",
        secretKey = "_secret",
        tokenLengthKey = "_tokenLength";

    function SocketsSession(id) {

        this._propertyBag = {};
        this._initialized = false;
        this._initializing = false;
        this._destroyed = false;

        this._propertyBag[idKey] = id;
        this.set(createdTimeKey, Date.now());
    }

    SocketsSession.prototype.isValid = function (token) {

        var secret = this.get(secretKey);

        if (!secret) {
            throw new Error("SocketsSession - cant validate, session doesnt have secret");
        }

        return tokenizer.validate(secret, token, this.get(tokenLengthKey));
    };

    SocketsSession.prototype.getToken = function () {
        return this.get(tokenKey);
    };

    SocketsSession.prototype.isReady = function () {
        return (this._initialized && !this._initializing && !this._destroyed);
    };

    SocketsSession.prototype.isDestroyed = function(){
        return this._destroyed;
    };

    SocketsSession.prototype.getId = function () {
        return this.get(idKey);
    };

    SocketsSession.prototype.getCreatedTime = function () {
        return this.get(createdTimeKey);
    };

    SocketsSession.prototype.get = function (key) {
        return this._propertyBag[key];
    };

    SocketsSession.prototype.set = function (key, value) {

        if (key === idKey) {
            throw new Error("SocketsSession - session id cannot be modified");
        }

        socketsUtils.assignPars(this._propertyBag, key, value);
        return this;
    };

    SocketsSession.prototype.destroy = function () {
        var props = this._propertyBag;

        _.each(_.keys(props), function (key) {
            delete props[key];
        });

        this._initialized = false;
        this._destroyed = true;
    };

    SocketsSession.prototype.initialize = function (options, callback) {

        var finish = function (err) {

            this._initialized = true;
            this._initializing = false;

            callback(err);
        }.bind(this);

        if (options.tokenizeConnection) {

            if (!this._initialized && !this._initializing) {

                this._initializing = true;

                tokenizer.generate(options.tokenSecretLength, function (err, tokenData) {

                    if (!err) {
                        this.set(tokenKey, tokenData.token);
                        this.set(secretKey, tokenData.secret);
                        this.set(tokenLengthKey, options.tokenSecretLength);
                    }

                    finish(err);
                }.bind(this));
            }
        }
        else {
            finish();
        }

        return this;
    };

    function create(id, options, callback) {

        var session = new SocketsSession(id);

        session.initialize(options, function (err) {

            var s = err ? void 0 : session;

            callback(err, s);
        });
    }

    return {
        create: create
    };
})();

module.exports = SocketsSession;


