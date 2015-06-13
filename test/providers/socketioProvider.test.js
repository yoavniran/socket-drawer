var chai = require("chai"),
    expect = chai.expect,
    dirtyChai = require("dirty-chai"),
    sinonChai = require("sinon-chai"),
    stirrer = require("mocha-stirrer");

describe("SocketIO Provider tests", function () {
    "use strict";

    chai.use(sinonChai);
    chai.use(dirtyChai);

    function getNewProvider(cup, options) {

        var Provider = cup.getRequired("provider");
        var provider = new Provider(options);

        return provider;
    }

    var cup = stirrer.grind({
        requires: [{path: "../../src/providers/socketio/Provider", options: {alias: "provider"}}],
        pars: {
            newProviderOptions: {test: 123},
            serverOptions: {httpServer: {foo: "Bar"}, serveClient: true,adapter: "some adapter", path: "path2", origins: "IOrigins"},
            connOptions: {foo: "hello"},
            sjConn: {connId: "1234aaa"}
        },
        spies: {
            //serverNewConnection: stirrer.EMPTY,
            //serverRemoveListener: stirrer.EMPTY,
            newConnHandler: stirrer.EMPTY,
            //serverInstallHandlers: stirrer.EMPTY
            //serverOn: stirrer.EMPTY
            serverClose: stirrer.EMPTY
        },
        stubs: {
            SIOServer: stirrer.EMPTY,
            //createServer: stirrer.EMPTY,
            serverOn: stirrer.EMPTY
        },
        before: function () {

            this.stubs.SIOServer.returns({
                on: this.stubs.serverOn,
                close: this.spies.serverClose
            });

            this.getStub("common/utils").dynamicLoad.returns(this.stubs.SIOServer);
        }
    });

    cup.pour("should start successfully", function () {

        var provider = getNewProvider(this, this.pars.newProviderOptions);
        var providerRet = provider.start(this.pars.serverOptions);

        expect(providerRet).to.equal(provider);

    }, {
        afters: function (next) {

            expect(this.stubs.SIOServer).to.have.been.called();
            var args = this.stubs.SIOServer.getCall((this.stubs.SIOServer.callCount - 1)).args;

            expect(args[0]).to.equal(this.pars.serverOptions.httpServer);
            expect(args[1].serveClient).to.equal(this.pars.serverOptions.serveClient);
            expect(args[1].path).to.equal(this.pars.serverOptions.path);
            expect(args[1].adapter).to.equal(this.pars.serverOptions.adapter);
            expect(args[1].origins).to.equal(this.pars.serverOptions.origins);

            expect(this.getStub("providers/ProviderBase").prototype.initialize).to.have.been.calledWith(this.pars.newProviderOptions);

            next();
        }
    });

    cup.pour("start should fail without options", function () {

        var provider = getNewProvider(this);

        expect(function () {
            provider.start();
        }).to.throw();
    });

    cup.pour("should register new connection handler successfully", function () {

        var provider = getNewProvider(this);

        this.pars.newConnFn = function () {
        };

        provider.start(this.pars.serverOptions);
        provider.onNewConnection(this.pars.newConnFn);
    }, {

        afters: function (next) {
            expect(this.stubs.serverOn).to.have.been.called();
            next();
        }
    });


    cup.pour("should fail to register new conn handler if not started", function () {

        var provider = getNewProvider(this);

        expect(function () {
            provider.onNewConnection();
        }).to.throw(TypeError);
    });

    cup.pour("should call on new connection handler", function () {

        var provider = getNewProvider(this);

        provider.start(this.pars.serverOptions);
        provider.onNewConnection(this.spies.newConnHandler, this.pars.connOptions);
    }, {
        befores: function (next) {
            this.stubs.serverOn.callsArgWith(1, this.pars.sjConn);
            next();
        },
        afters: function (next) {

            expect(this.getStub("providers/socketio/Connection").prototype.initialize)
                .to.have.been.calledWith(this.pars.sjConn, this.pars.connOptions);

            expect(this.spies.newConnHandler).to.have.been.called();

            this.stubs.serverOn.resetBehavior();
            next();
        }
    });

    cup.pour("should stop successfully", function () {

        var provider = getNewProvider(this);

        provider.start(this.pars.serverOptions);
        provider.onNewConnection(this.spies.newConnHandler);
        var providerRet = provider.stop();

        expect(providerRet).to.equal(provider);
    }, {
        afters: function (next) {
            expect(this.spies.serverClose).to.have.been.called();

            next();
        }
    });
});