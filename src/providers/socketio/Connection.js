var ConnectionBase = require("../ConnectionBase"),
    util = require("util");

var SocketIOConnection  = (function(){
    "use strict";

    function SocketIOConnection(conn, options) {

        ConnectionBase.call(this, conn, options);

        this._conn = conn;
        this._listenOnEventName = (options && options.dataEventName) || "message";
    }

    util.inherits(SocketIOConnection, ConnectionBase);

    SocketIOConnection.prototype.initialize = function () {
    };

    SocketIOConnection.prototype.getId = function () {
        return this._conn.id;
    };

    SocketIOConnection.prototype.send = function (msg) {
        this._conn.send(msg);
        return this;
    };

    SocketIOConnection.prototype.stop = function(){
        this._conn.onclose();
        return this;
    };

    SocketIOConnection.prototype.onData = function (cb) {
        this._conn.on(this._listenOnEventName, cb);
        return this;
    };

    SocketIOConnection.prototype.onClose = function (cb) {
        this._conn.on("disconnect", cb);
        return this;
    };

    SocketIOConnection.prototype.isWritable = function () {
        return (this._conn.conn.readyState === "open");
    };

    return SocketIOConnection;
})();

module.exports = SocketIOConnection;
