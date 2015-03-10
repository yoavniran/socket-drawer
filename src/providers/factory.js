/**
 * provider factory
 */
var _ = require("lodash"),
    consts = require("../common/consts");

module.exports = (function () {

    function getProvider(implementation, options) {

        var Provider = _getProviderType(implementation);

        return new Provider(options);
    }

    function _getProviderType(implementation) {

        var foundType = _.find(consts.IMPLEMENTATIONS, function (val) {
            return val === implementation;
        });

        if (!foundType) {
            throw new TypeError("unknown implementation: " + implementation);
        }

        return require("./" + implementation + "/Provider");
    }

    return {
        getProvider: getProvider
    };
})();

