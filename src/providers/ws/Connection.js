var ConnectionBase = require("../ConnectionBase"),
    uuid = require("node-uuid"),
    util = require("util");

var WSConnection = (function(){
    "use strict";

    function WSConnection(conn, options) {

        ConnectionBase.call(this, conn, options);

        this._conn = conn;
    }

    util.inherits(WSConnection, ConnectionBase);

    WSConnection.prototype.initialize = function () {
        this._id = uuid();
    };

    WSConnection.prototype.getId = function () {
        return this._id;
    };

    WSConnection.prototype.send = function (msg) {
        this._conn.send(msg);
        return this;
    };

    WSConnection.prototype.onData = function (cb) {
        this._conn.onmessage = cb;
        return this;
    };

    WSConnection.prototype.stop = function(){
        this._conn.terminate();
    };

    WSConnection.prototype.onClose = function (cb) {

        this._conn.onclose = cb;
        return this;
    };

    WSConnection.prototype.isWritable = function () {
        return (this._conn.readyState === this._conn.OPEN);
    };

    return WSConnection;
})();

module.exports = WSConnection;