var util = require("util"),
    WebSocketServer = require("ws").Server,
    ProviderBase = require("../ProviderBase"),
    Connection = require("./Connection");

var WSProvider = (function(){
    "use strict";

    var WSProvider = function(options){

        ProviderBase.call(this, options);

        this._server = null;
    };

    util.inherits(WSProvider, ProviderBase);  //inherit Event Emitter methods

    WSProvider.prototype.start = function(options){

        this._server = new WebSocketServer({
            server: options.httpServer,
            path: options.path
        });

        return this;
    };

    WSProvider.prototype.onNewConnection = function (cb, options) {

        this._server.on("connection", function(client){
            var connection = new Connection(client, options);
            cb(connection);
        });

        return this;
    };

    return WSProvider;
})();

module.exports = WSProvider;

