var chai = require("chai"),
    expect = chai.expect,
    dirtyChai = require("dirty-chai"),
    sinonChai = require("sinon-chai"),
    stirrer = require("mocha-stirrer");

describe("WS Provider tests", function () {
    "use strict";

    chai.use(sinonChai);
    chai.use(dirtyChai);

    function getNewProvider(cup, options){

        var Provider = cup.getRequired("provider");
        var provider = new Provider(options);

        return provider;
    }

    var cup = stirrer.grind({
        requires: [{path: "../../src/providers/ws/Provider", options: {alias: "provider"}}],
        pars: {
            newProviderOptions: {test: 123},
            serverOptions: {httpServer: {}, path: "path"},
            connOptions: {foo: "Bar"},
            wsClient: {clientId: "1234aaa"}
        },
        spies: {
            serverStop: stirrer.EMPTY,
            serverNewConnection: stirrer.EMPTY,
            serverRemoveListener: stirrer.EMPTY,
            newConnHandler: stirrer.EMPTY
        },
        stubs: {
            WSServer: stirrer.EMPTY,
            serverOn: stirrer.EMPTY
        },
        before: function () {

            this.stubs.WSServer.returns({
                close: this.spies.serverStop,
                onNewConnection: this.spies.serverNewConnection,
                on: this.stubs.serverOn,
                removeListener: this.spies.serverRemoveListener
            });

            this.getStub("common/utils").dynamicLoad.returns({
                Server: this.stubs.WSServer
            });
        }
    });

    cup.pour("should start successfully", function () {

        var provider = getNewProvider(this, this.pars.newProviderOptions);
        provider.start(this.pars.serverOptions);

    }, {
        afters: function (next) {

            expect(this.stubs.WSServer).to.have.been.called();
            var args = this.stubs.WSServer.getCall(0).args;

            expect(args[0].server).to.equal(this.pars.serverOptions.httpServer);
            expect(args[0].path).to.equal(this.pars.serverOptions.path);

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
            this.stubs.serverOn.callsArgWith(1, this.pars.wsClient);
            next();
        },
        afters: function (next) {

            expect(this.getStub("providers/ws/Connection").prototype.initialize)
                .to.have.been.calledWith(this.pars.wsClient, this.pars.connOptions);

            this.stubs.serverOn.resetBehavior();
            next();
        }
    });

    cup.pour("should stop successfully", function () {

        var provider = getNewProvider(this);

        provider.start(this.pars.serverOptions);
        provider.onNewConnection(this.spies.newConnHandler);
        provider.stop();
    }, {
        afters: function (next) {
            expect(this.spies.serverRemoveListener).to.have.been.called();
            expect(this.spies.serverStop).to.have.been.called();

            next();
        }
    });
});