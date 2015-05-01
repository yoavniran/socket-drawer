var METHODS = require("../common/consts").HTTP_METHODS,
    debug = require("debug")("sdrawer:requestParser");

var requestParser = (function () {
    "use strict";

    function parse(msg) {

        var data = (typeof(msg) === "string" ? JSON.parse(msg) :
            typeof(msg.data) === "string" ? JSON.parse(msg.data) : msg.data);

        var parsedData = {
            data: data.data || {},
            metadata: data.metadata || {},
            resource: data.resource,
            method: data.method || METHODS.GET
        };

        debug("parsed object = ", parsedData);

        return parsedData;
    }

    return {
        parse: parse
    };
})();

module.exports = requestParser;