var ProviderBase = (function () {
    "use strict";
    function ProviderBase(options) {
        this.initialize(options);
    }

    ProviderBase.prototype.initialize = function (/*options*/) {
        //do nothing
    };

    ProviderBase.prototype.start = function (/*options*/) {
        throw new Error("ProviderBase - start - not implemented");
    };

    ProviderBase.prototype.stop = function () {
        throw new Error("ProviderBase - stop - not implemented");
    };

    ProviderBase.prototype.onNewConnection = function (/*cb*/) {
        throw new Error("ProviderBase - onNewConnection - not implemented");
    };
    return ProviderBase;
})();

module.exports = ProviderBase;

