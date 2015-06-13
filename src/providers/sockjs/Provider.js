var ProviderBase = require("../ProviderBase"),
    debug = require("debug")("sdrawer:sockjsProvider"),
    Connection = require("./Connection"),
    util = require("util"),
    sdUtils = require("../../common/utils"),
    sockjs; //dynamically loading so not to have to have a hard dependency on this module

var SockJSProvider = (function () {
    "use strict";

    var SockJSProvider = function (options) {

        if (!sockjs) {
            sockjs = sdUtils.dynamicLoad("sockjs");
        }

        ProviderBase.call(this, options);

        this._server = null;
        this._onNewConnectionHandler = null;
    };

    util.inherits(SockJSProvider, ProviderBase);

    /**
     *
     * @param options
     *          - httpServer
     *          - sockUrl
     *          - path
     */
    SockJSProvider.prototype.start = function (options) {

        debug("start called - starting SockJS provider server");

        this._server = sockjs.createServer({
            sockjs_url: options.sockUrl,
            prefix: options.path
        });

        this._server.installHandlers(options.httpServer);

        return this;
    };

    SockJSProvider.prototype.stop = function () {

        debug("stop called - stopping SockJS provider server");

        if (this._onNewConnectionHandler) {
            this._server.removeListener("connection", this._onNewConnectionHandler);
            this._onNewConnectionHandler = null;
        }

        this._server = null;

        return this;
    };

    SockJSProvider.prototype.onNewConnection = function (cb, options) {

        this._onNewConnectionHandler = _onNewConnection.bind(this, cb, options);
        this._server.on("connection", this._onNewConnectionHandler);

        return this;
    };

    function _onNewConnection(cb, options, sjConn) {

        debug("new sock js connection");
        var connection = new Connection(sjConn, options);
        cb(connection);
    }

    return SockJSProvider;
})();


module.exports = SockJSProvider;