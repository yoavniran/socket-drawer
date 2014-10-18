"use strict";
var _ = require("lodash"),
    logger = require("../../common/logger"),
    consts = require("../../common/consts"),
    METHODS = consts.HTTP_METHODS;

var requestParser = (function () {

    function parse(msg) {

        var data = JSON.parse(msg);

        var parsedData = {
            data: data.data || {},
            metadata: data.metadata || {},
            resource: data.resource,
            method: data.method || METHODS.GET
        };

        logger.debug("[requestParser]:: parse: received message, returning parsed data: ", parsedData);

        return parsedData;
    }

    return {
        parse: parse
    };
})();

module.exports = requestParser;