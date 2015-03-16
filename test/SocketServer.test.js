var chai = require("chai"),
    expect = chai.expect,
    dirtyChai = require("dirty-chai"),
    SocketServer = require("../src/SocketsServer");

describe("SocketServer Tests", function () {
    "use strict";

    chai.use(dirtyChai);

    describe("testing SocketServer defaults values", function () {

        var server = new SocketServer({});

        it("tokenSecretLength should have the default value: 16", function () {
            var tokenSecretLength = server.get("tokenSecretLength");
            expect(tokenSecretLength).to.equal(16);
        });

        it("tokenizeConnection should have the default value: false", function () {
            var tokenizeConnection = server.get("tokenizeConnection");
            expect(tokenizeConnection).to.be.false();
        });

        it("requestTokenKey should have the default value: token", function () {
            var requestTokenKey = server.get("requestTokenKey");
            expect(requestTokenKey).to.equal("token");
        });

        it("checkTokenOnMethods should have the default value: null", function () {
            var checkTokenOnMethods = server.get("checkTokenOnMethods");
            expect(checkTokenOnMethods).to.be.null();
        });

        it("externalSession should have the default value: false", function () {
            var externalSession = server.get("externalSession");
            expect(externalSession).to.be.false();
        });

        it("debug should have the default value: false", function () {
            var debug = server.get("debug");
            expect(debug).to.be.false();
        });

    });

//    describe("change defaults")
});