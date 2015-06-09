var _ = require("lodash");

module.exports = (function () {
    "use strict";

    function assignPars(obj, key, val) {

        if (_.isObject(key) && !_.isArray(key)) {
            _.each(key, function (v, k) {
                obj[k] = v;
            });
        }
        else {
            obj[key] = val;
        }
    }

    function dynamicLoad(modulePath) {
        return require(modulePath);
    }

    function getCryptoSaltLength(orgLength) {
        return ((Math.ceil(orgLength / 3)) * 4);
    }

    function setImmediateProxy(){
        return setImmediate.apply(global, arguments);
    }

    return {
        assignPars: assignPars,
        dynamicLoad: dynamicLoad,
        getCryptoSaltLength: getCryptoSaltLength,
        setImmediate: setImmediateProxy
    };
})();