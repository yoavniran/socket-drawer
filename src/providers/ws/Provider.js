var util = require("util"),
    debug = require("debug")("sdrawer:wsProvider"),
    sdUtils = require("../../common/utils"),
    ProviderBase = require("../ProviderBase"),
    Connection = require("./Connection"),
    WebSocketServer;//dynamically loading so not to have to have a hard dependency on this module

var WSProvider = (function () {
    "use strict";

    var WSProvider = function (options) {

        if (!WebSocketServer) {
            WebSocketServer = sdUtils.dynamicLoad("ws").Server;
        }

        ProviderBase.call(this, options);

        this._server = null;
        this._onNewConnectionHandler = null;
    };

    util.inherits(WSProvider, ProviderBase);  //inherit Event Emitter methods

    WSProvider.prototype.start = function (options) {

        debug("start called - creating WS provider server");

        this._server = new WebSocketServer({
            server: options.httpServer,
            path: options.path
        });

        return this;
    };

    WSProvider.prototype.stop = function () {

        debug("stop called - stopping WS provider server");

        if (this._onNewConnectionHandler) {
            this._server.removeListener(this._onNewConnectionHandler);
            this._onNewConnectionHandler = null;
        }

        this._server.close();
        this._server = null;

        return this;
    };

    WSProvider.prototype.onNewConnection = function (cb, options) {

        this._onNewConnectionHandler = _onNewConnection.bind(this, cb, options);

        this._server.on("connection", this._onNewConnectionHandler);

        return this;
    };

    function _onNewConnection(cb, options, client) {

        debug("new ws connection");
        var connection = new Connection(client, options);
        cb(connection);
    }

    return WSProvider;
})();

module.exports = WSProvider;

