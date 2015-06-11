var ProviderBase = require("../ProviderBase"),
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

        this._server = sockjs.createServer({
            sockjs_url: options.sockUrl,
            prefix: options.path
        });

        this._server.installHandlers(options.httpServer);

        return this;
    };

    SockJSProvider.prototype.onNewConnection = function (cb, options) {

        this._server.on("connection", function (sjConn) {
            var connection = new Connection(sjConn, options);
            cb(connection);
        });

        return this;
    };

    return SockJSProvider;
})();


module.exports = SockJSProvider;