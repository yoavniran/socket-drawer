require("../../src/providers/ConnectionBase");

require("../../src/providers/ws/Provider");
require("../../src/providers/ws/Connection");

require("../../src/providers/socketio/Provider");
require("../../src/providers/socketio/Connection");

require("../../src/providers/sockjs/Provider");
require("../../src/providers/sockjs/Connection");

describe("test providers implementations", function() {
"use strict";

    before(function () {
        require("mocha-stirrer").setRequireParent(module);
    });

    require("./ConnectionBase.test");
    require("./ProviderBase.test");

    require("./wsProvider.test");
    require("./wsConnection.test");

    require("./sockjsProvider.test");
    require("./sockjsConnection.test");

    require("./socketioProvider.test");
});