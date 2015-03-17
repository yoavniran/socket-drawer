var chai = require("chai"),
    expect = chai.expect,
    dirtyChai = require("dirty-chai"),
    sinon = require("sinon"),
    sinonChai = require("sinon-chai"),
    consts = require("../src/common/consts"),
    SocketServer = require("../src/SocketsServer");

describe("SocketServer tests", function () {
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
        var providerStartSpy, providerOnNewConnectionSpy,
            factoryMock, factoryMockExp;

        beforeEach(function beforeStartMethodTest() {

            factoryMock = sinon.mock(providerFactory);
            providerStartSpy = sinon.spy();
            providerOnNewConnectionSpy = sinon.spy();

            factoryMockExp = factoryMock.expects("getProvider")
                .once()
                .returns({
                    start: providerStartSpy,
                    onNewConnection: providerOnNewConnectionSpy
                });
        });

        afterEach(function afterStartMethodText() {
            factoryMock.restore();
        });

        it("should initialize provider - no options", function () {

            factoryMockExp.withArgs(consts.IMPLEMENTATIONS.WS);

            var server = new SocketServer({});
            server.start();

            //verifications
            factoryMock.verify();
            expect(providerStartSpy).to.have.been.called();
            expect(providerOnNewConnectionSpy).to.have.been.called();
        });

        it("should initialize provider - sockjs imp", function () {
            var imp = consts.IMPLEMENTATIONS.SOCK_JS;
            factoryMockExp.withArgs(imp);

            var server = new SocketServer({implementation: imp});
            server.start();

            //verifications
            factoryMock.verify();
            expect(providerStartSpy).to.have.been.called();
            expect(providerOnNewConnectionSpy).to.have.been.called();
        });
    });
});