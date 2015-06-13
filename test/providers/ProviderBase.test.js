var chai = require("chai"),
    expect = chai.expect,
    ProviderBase = require("../../src/providers/ProviderBase");

describe("provider base tests", function () {
    "use strict";

    var providerBase = new ProviderBase();

    it("should fail on call to start", function () {
        expect(function () {
            providerBase.start();
        }).to.throw();
    });

    it("should fail on call to stop", function () {
        expect(function () {
            providerBase.stop();
        }).to.throw();
    });

    it("should fail on call to onNewConnection", function () {
        expect(function () {
            providerBase.onNewConnection();
        }).to.throw();
    });

});
