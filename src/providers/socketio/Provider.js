var ProviderBase = require("../ProviderBase"),
    Connection = require("./Connection"),
    util = require("util"),
    sdUtils = require("../../common/utils"),
    socketio; //dynamically loading so not to have to have a hard dependency on this module
    // = require("socket.io");

var SocketIOProvider = (function(){
    "use strict";

    var SocketIOProvider = function (options) {

        if (!socketio){
            socketio =  sdUtils.dynamicLoad( "socket.io");
        }

        ProviderBase.call(this, options);

        this._server = null;
    };

    util.inherits(SocketIOProvider, ProviderBase);

    /**
     *
     * @param options
     *          - httpServer
     *          - sockUrl
     *          - path
     */
    SocketIOProvider.prototype.start = function (options) {

        this._server = new socketio(options.httpServer,{
            path: options.path,
            serveClient:options.serveClient,
            adapter: options.adapter,
            origins: options.origins
        });

        return this;
    };

    SocketIOProvider.prototype.onNewConnection = function (cb, options) {

        this._server.on("connection", function (socket) {
            var connection = new Connection(socket, options);
            cb(connection);
        });

        return this;
    };

    return SocketIOProvider;
})();

module.exports = SocketIOProvider;