var http = require("http"),
//var sd = require("../index");
    consts = require("../src/common/consts"),
    SocketsServer = require("../src/SocketsServer");

(function () {
             "use strict";
    console.log("starting test...");

    var httpServer = http.createServer();
    httpServer.listen(9991, "0.0.0.0");

    var server = new SocketsServer({
        httpServer: httpServer,
        sockUrl: "url",
        prefix: "prefix",
        handlers: {},
        config: {
            debug: true,
            implementation: consts.IMPLEMENTATIONS.SOCK_JS
        }
    });

})();