"use strict";
var ConnectionBase = require("../ConnectionBase"),
    uuid = require("uuid"),
    util = require("util");

function WSConnection(conn, options) {

    ConnectionBase.call(this, options);

    this._conn = conn;
}

util.inherits(WSConnection, ConnectionBase);

WSConnection.prototype.initialize = function (options) {
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

WSConnection.prototype.onClose = function (cb) {

    this._conn.onclose = cb;
    return this;
};

WSConnection.prototype.isWritable = function () {
    return (this._conn.readyState === this._conn.OPEN);
};

module.exports = WSConnection;