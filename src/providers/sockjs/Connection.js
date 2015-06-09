var ConnectionBase = require("../ConnectionBase"),
    util = require("util");

var SockJSConnection = (function(){
    "use strict";

    function SockJSConnection(conn, options) {

        ConnectionBase.call(this, options);

        this._conn = conn;
    }

    util.inherits(SockJSConnection, ConnectionBase);

    SockJSConnection.prototype.initialize = function () {

    };

    SockJSConnection.prototype.getId = function () {
        return this._conn.id;
    };

    SockJSConnection.prototype.send = function (msg) {
        this._conn.emit("data", msg);
        return this;
    };

    SockJSConnection.prototype.onData = function (cb) {

        this._conn.on("data", cb);
        return this;
    };

    SockJSConnection.prototype.onClose = function (cb) {

        this._conn.on("close", cb);
        return this;
    };

    SockJSConnection.prototype.isWritable = function () {
        return (this._conn.readyState === 1 && this._conn.writable);
    };

    return SockJSConnection;
})();

module.exports = SockJSConnection;



