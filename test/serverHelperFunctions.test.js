var chai = require("chai"),
    expect = chai.expect,
    dirtyChai = require("dirty-chai"),
    sinonChai = require("sinon-chai"),
    stirrer = require("mocha-stirrer"),
    consts = require("../src/common/consts"),
    serverHelperFunctions = require("../src/server/serverHelperFunctions");

describe("serverHelperFunctions tests", function () {
    "use strict";

    chai.use(sinonChai); //add sinon syntax to assertions
    chai.use(dirtyChai); //use lint-friendly chai assertions!

    var cup = stirrer.grind({
        pars: {
            connId: "1234",
            data: {resource: "/api/test", metadata: {clientRequestId: "abcd"}},
            publishData: {metadata: {"foo": "bar"}, something: "123"},
            resource: "/a/b/c"
        },
        stubs: {
            serverPublish: stirrer.EMPTY
        },
        before: function () {

            this.pars.server = {
                publishToConnection: this.stubs.serverPublish
            };
        }
    });

    cup.pour("should return helper functions", function () {

        var helpers = serverHelperFunctions.getFunctions(this.pars.server, this.pars.connId, this.pars.data);

        expect(helpers).to.exist();
        expect(helpers.attachSession).to.be.a("function");
        expect(helpers.get).to.be.a("function");
        expect(helpers.publish).to.be.a("function");
    });

    cup.pour("publish helper should call server publish", function () {
        var helpers = serverHelperFunctions.getFunctions(this.pars.server, this.pars.connId, this.pars.data);

        helpers.publish(this.pars.publishData, true, this.pars.resource);
    }, {
        afters: function (next) {

            expect(this.stubs.serverPublish).to.have.been.called();
            expect(this.stubs.serverPublish).to.have.been.calledWith(this.pars.connId,
                this.pars.resource, this.pars.publishData, true, this.pars.data.metadata.clientRequestId);

            next();
        }
    });

    cup.pour("publish helper should call server publish with resource from context", function () {
        var helpers = serverHelperFunctions.getFunctions(this.pars.server, this.pars.connId, this.pars.data);

        helpers.publish(this.pars.publishData, true);
    }, {
        afters: function (next) {
            expect(this.stubs.serverPublish).to.have.been.called();
            expect(this.stubs.serverPublish).to.have.been.calledWith(this.pars.connId,
                this.pars.data.resource, this.pars.publishData, true, this.pars.data.metadata.clientRequestId);

            next();
        }
    });

    describe("test attach session helper", function () {

        var cup = stirrer.grind({
            pars: {
                connId: "1234",
                attachKey: "foo",
                attachVal: "val",
                connIdKey: "conn-id-key"
            },
            spies: {
                sessionSet: stirrer.EMPTY
            },
            stubs: {
                serverGet: stirrer.EMPTY,
                smFind: stirrer.EMPTY,
                sessionGet: stirrer.EMPTY
            },
            before: function () {

                var srvGetStub = this.stubs.serverGet;

                srvGetStub.withArgs(consts.SERVER_KEYS.SESSION_MANAGER_KEY).returns({
                    find: this.stubs.smFind
                });

                srvGetStub.withArgs(consts.SERVER_KEYS.CONNECTION_ID_KEY).returns(this.pars.connIdKey);

                this.stubs.sessionGet.returns(this.pars.connId);

                this.pars.session = {
                    get: this.stubs.sessionGet,
                    set: this.spies.sessionSet
                };

                this.pars.server = {
                    get: srvGetStub
                };
            }
        });

        cup.pour("attach should work successfully", function () {

            var helpers = serverHelperFunctions.getFunctions(this.pars.server, this.pars.connId, {});

            var session = helpers.attachSession(this.pars.attachKey, this.pars.attachVal);

            expect(session).to.exist();
        }, {
            befores: function (next) {

                this.stubs.smFind.returns(this.pars.session);
                next();
            },
            afters: function (next) {

                expect(this.stubs.serverGet).to.have.been.calledWith(consts.SERVER_KEYS.SESSION_MANAGER_KEY);
                expect(this.stubs.serverGet).to.have.been.calledWith(consts.SERVER_KEYS.CONNECTION_ID_KEY);
                expect(this.stubs.smFind).to.have.been.calledWith(this.pars.attachKey, this.pars.attachVal);
                expect(this.spies.sessionSet).to.have.been.calledWith(this.pars.connIdKey, this.pars.connId);
                next();
            }
        });

        cup.pour("attach should failed on no session found", function () {

            var helpers = serverHelperFunctions.getFunctions(this.pars.server, this.pars.connId, {});

            expect(function () {
                helpers.attachSession();
            }).to.throw();
        }, {
            befores: function (next) {
                this.stubs.smFind.resetBehavior();
                next();
            }
        });

        cup.pour("attach should failed on session already attached", function () {
            var helpers = serverHelperFunctions.getFunctions(this.pars.server, this.pars.connId, {});

            expect(function () {
                helpers.attachSession();
            }).to.throw();
        }, {
            befores: function (next) {

                this.stubs.smFind.returns(this.pars.session);
                this.stubs.sessionGet.resetBehavior();
                this.stubs.sessionGet.returns("bla bla");
                next();
            }
        });
    });

    describe("test helper get", function () {

        var cup = stirrer.grind({
            pars: {
                connId: "1234",
                connIdKey: "conn-id-key",
                getKey: "foo",
                getValue: "surprise!"
            },
            stubs: {
                serverGet: stirrer.EMPTY
            },
            before: function () {

                this.stubs.serverGet.returns(this.pars.getValue);

                this.pars.server = {
                    get: this.stubs.serverGet
                };
            }
        });

        cup.pour("get should return server get result", function () {

            var helpers = serverHelperFunctions.getFunctions(this.pars.server, this.pars.connId, {});

            helpers.get(this.pars.getKey);
        }, {
            afters: function (next) {
                expect(this.stubs.serverGet).to.have.been.calledOnce();
                expect(this.stubs.serverGet).to.have.been.calledWith(this.pars.getKey);
                next();
            }
        });
    });
});