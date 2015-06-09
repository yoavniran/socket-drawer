var ConnectionBase = (function () {
    "use strict";

    function ConnectionBase(conn, options) {
        this.initialize(options);
    }

    ConnectionBase.prototype.initialize = function (/*options*/) {
        //do nothing
    };

    ConnectionBase.prototype.getId = function () {
        throw new Error("ConnectionBase - getId - not implemented");
    };

    ConnectionBase.prototype.send = function (/* msg */) {
        throw new Error("ConnectionBase - send - not implemented");
    };

    ConnectionBase.prototype.onData = function () {
        throw new Error("ConnectionBase - onData - not implemented");
    };

    ConnectionBase.prototype.onClose = function () {
        throw new Error("ConnectionBase - onClose - not implemented");
    };

    ConnectionBase.prototype.isWritable = function () {
        throw new Error("ConnectionBase - isWritable - not implemented");
    };

    return ConnectionBase;
})();


module.exports = ConnectionBase;



