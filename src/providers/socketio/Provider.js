var ProviderBase = require("../ProviderBase"),
    debug = require("debug")("sdrawer:socketioProvider"),
    Connection = require("./Connection"),
    util = require("util"),
    sdUtils = require("../../common/utils"),
    Socketio; //dynamically loading so not to have to have a hard dependency on this module

var SocketIOProvider = (function () {
    "use strict";

    var SocketIOProvider = function (options) {

        if (!Socketio) {
            Socketio = sdUtils.dynamicLoad("socket.io");
        }

        ProviderBase.call(this, options);

        this._server = null;
        this._onNewConnectionHandler = null;
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

        debug("start called - starting SocketIO provider server");

        this._server = new Socketio(options.httpServer, {
            path: options.path,
            serveClient: options.serveClient,
            adapter: options.adapter,
            origins: options.origins
        });

        return this;
    };

    SocketIOProvider.prototype.stop = function () {

        debug("stop called - stopping SocketIO provider server");

        this._server.close();
        this._server = null;

        return this;
    };

    SocketIOProvider.prototype.onNewConnection = function (cb, options) {

        this._onNewConnectionHandler = _onNewConnection.bind(this, cb, options);
        this._server.on("connection", this._onNewConnectionHandler);

        return this;
    };

    function _onNewConnection(cb, options, socket) {

        debug("new socketio connection");

        var connection = new Connection(socket, options);
        cb(connection);
    }

    return SocketIOProvider;
})();

module.exports = SocketIOProvider;