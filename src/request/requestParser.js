"use strict";
var METHODS = require("../common/consts").HTTP_METHODS;

var requestParser = (function () {

    function parse(msg) {

        var data = (typeof(msg) === "string" ? JSON.parse(msg) :
            typeof(msg.data) === "string" ? JSON.parse(msg.data) :  msg.data);

        var parsedData = {
            data: data.data || {},
            metadata: data.metadata || {},
            resource: data.resource,
            method: data.method || METHODS.GET
        };

        console.log("parsed object = ", parsedData);

        return parsedData;
    }

    return {
        parse: parse
    };
})();

module.exports = requestParser;