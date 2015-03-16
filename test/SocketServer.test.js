var chai = require("chai"),
    expect = chai.expect,
    dirtyChai = require("dirty-chai"),
    sinon = require("sinon"),
    sinonChai = require("sinon-chai"),
    SocketServer = require("../src/SocketsServer");

describe("SocketServer Tests", function () {
    "use strict";


    chai.use(sinonChai); //add sinon syntax to assertions
    chai.use(dirtyChai); //use lint-friendly chai assertions!


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

    describe("test start method", function () {

        var providerFactory = require("../src/providers/factory");
        var getProviderStub, getProviderStubStart;

        before(function beforeStartMethodTest() {

            getProviderStub = sinon.stub(providerFactory, "getProvider");
            getProviderStubStart = sinon.spy();

            getProviderStub.returns({
                start: getProviderStubStart,
                onNewConnection: sinon.spy()
            });
        });

        it("should initialize provider", function () {

            var server = new SocketServer({});

            server.start();

            expect(getProviderStubStart).to.have.been.called();

        });

    });

//    describe("change defaults")
});