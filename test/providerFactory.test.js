var chai = require("chai"),
    expect = chai.expect,
    dirtyChai = require("dirty-chai"),
    sinon = require("sinon"),
    sinonChai = require("sinon-chai"),
    consts = require("../src/common/consts"),
    utils = require("../src/common/utils"),
    providerFactory = require("../src/providers/factory");

describe("provider factory tests", function () {
    "use strict";

    chai.use(sinonChai); //add sinon syntax to assertions
    chai.use(dirtyChai); //use lint-friendly chai assertions!

    it("should fail when using unknown implementation", function () {

        expect(function () {
            providerFactory.getProvider("foo");
        }).to.throw(TypeError);
    });

    describe("valid implementations", function () {

        var utilsMock;

        beforeEach(function () {
            utilsMock = sinon.mock(utils);

            utilsMock.expects("dynamicLoad")
                .once()
                .returns(sinon.spy());
        });

        afterEach(function () {
            utilsMock.restore();
        });

        it("should succeed for WS imp", function () {

            providerFactory.getProvider(consts.IMPLEMENTATIONS.WS);
            utilsMock.verify();
        });

        it("should succeed for SockJS imp", function () {

            providerFactory.getProvider(consts.IMPLEMENTATIONS.SOCK_JS);
            utilsMock.verify();
        });

        it("should succeed for SocketIO imp", function () {

            providerFactory.getProvider(consts.IMPLEMENTATIONS.SOCKET_IO);
            utilsMock.verify();
        });
    });

    describe("get provider with options", function () {

        it("should pass options to the provider constructor", function () {

            var providerConstructorSpy = sinon.spy();

            var providerLoadStub = sinon.stub(utils, "dynamicLoad")
                .returns(providerConstructorSpy);

            var opts = {foo: "bar"};

            providerFactory.getProvider(consts.IMPLEMENTATIONS.SOCKET_IO, opts);

            expect(providerConstructorSpy).to.have.been.calledWith(opts);

            providerLoadStub.restore();
        });
    });
});
