"use strict";
var _ = require("lodash"),
    logger = require("../common/logger");

var broadcaster = (function () {

    function broadcast(connections, msg) {

        logger.debug("[broadcaster]:: broadcast: about to broadcast to connections");

        var msgStr = JSON.stringify(msg);

        _.each(connections, function (c) {
            _writeToConnection(msgStr, c);
        });

        return this;
    }

    function publishToConnection(msg, conn) {

        _writeToConnection(JSON.stringify(msg), conn);

        return this;
    }

    function _writeToConnection(msgStr, conn) {

        if (conn && conn.readyState === 1 && conn.writable) { //if connection is open, ready and writable

            logger.debug("[broadcaster]:: writeToConnection: about to write to connection");

            conn.write(msgStr);
        }
        else {
            logger.warn("[broadcaster]:: writeToConnection: connection is unavailable, not-writable or not open: " + (conn ? conn.readyState : "null"));
        }
    }

    return{
        broadcast: broadcast,
        publishToConnection: publishToConnection
    }
})();


module.exports = broadcaster;