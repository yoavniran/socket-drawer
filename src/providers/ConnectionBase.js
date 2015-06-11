var ConnectionBase = (function () {
    "use strict";

    function ConnectionBase(conn, options) {
        this.initialize(conn, options);
    }

    ConnectionBase.prototype.initialize = function (/*conn, options*/) {
        //do nothing
    };

    ConnectionBase.prototype.getId = function () {
        throw new Error("ConnectionBase - getId - not implemented");
    };

    ConnectionBase.prototype.send = function (/* msg */) {
        throw new Error("ConnectionBase - send - not implemented");
    };

    ConnectionBase.prototype.onData = function (/*cb*/) {
        throw new Error("ConnectionBase - onData - not implemented");
    };

    ConnectionBase.prototype.stop = function(){
        throw new Error("ConnectionBase - stop - not implemented");
    };

    ConnectionBase.prototype.onClose = function (/*cb*/) {
        throw new Error("ConnectionBase - onClose - not implemented");
    };

    ConnectionBase.prototype.isWritable = function () {
        throw new Error("ConnectionBase - isWritable - not implemented");
    };

    return ConnectionBase;
})();


module.exports = ConnectionBase;



