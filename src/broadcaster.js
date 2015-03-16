
var _ = require("lodash");

var broadcaster = (function () {
    "use strict";

    function broadcast(connections, msg) {

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

        if (conn.isWritable()) {
            conn.send(msgStr);
        }
    }

    return{
        broadcast: broadcast,
        publishToConnection: publishToConnection
    };
})();


module.exports = broadcaster;