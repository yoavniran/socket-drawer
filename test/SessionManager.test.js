var chai = require("chai"),
    expect = chai.expect,
    dirtyChai = require("dirty-chai"),
    sinonChai = require("sinon-chai"),
    stirrer = require("mocha-stirrer");

describe("Session Manager tests", function () {
    "use strict";

    chai.use(sinonChai);
    chai.use(dirtyChai);

    var cup = stirrer.grind({
        name: "session manager test cup",

        pars: {
            sessionId: "1234-5678",
            createErr: "oh no!"
        },

        requires: [{path: "../src/session/SessionManager", options: {dontStub: ["lodash", "debug"]}}],

        stubs: {
            sessionGet: stirrer.EMPTY,
            sessionIsDestroyed: stirrer.EMPTY,
            sessionDestroy: stirrer.EMPTY,
            debug: stirrer.EMPTY
        },

        before: function () {

            this.getStub("node-uuid/uuid").returns(this.pars.sessionId);

            var Session = this.getStub("session/SocketsSession");

            Session.create
                .callsArgWith(2, null, {
                    get: this.stubs.sessionGet,
                    isDestroyed: this.stubs.sessionIsDestroyed,
                    destroy: this.stubs.sessionDestroy
                });
        },
        afterEach: function(){
            expect(this.getStub("session/SocketsSession").create).to.have.been.called();
        }
    });

    cup.pour("should create session and add it to cache", function (done) {

        var manager = new this.required["../src/session/SessionManager"]();

        manager.createSession(function (err, session) {

            expect(err).to.not.exist();
            expect(session).to.exist();

            session.get.returns("val");

            var found = manager.find("key", "val");
            expect(found).to.equal(session);

            var notFound = manager.find("key", "val2");
            expect(notFound).to.not.exist();

            done();
        });
    }, {
        afters: function (next) {
            expect(this.getStub("node-uuid/uuid")).to.have.been.called();
            next();
        }
    });

    cup.pour("should destroy session successfully", function (done) {

        var manager = new this.required["../src/session/SessionManager"]();

        manager.createSession(function (err, session) {

            session.isDestroyed.returns(false);
            session.get.returns("val");

            manager.destroySession(this.pars.sessionId);

            var notFound = manager.find("key", "val"); //should not find because session cache should be empty
            expect(notFound).to.not.exist();

            done();
        }.bind(this));
    }, {
        afters: function(next){
            expect(this.stubs.sessionDestroy).to.have.been.called();
            next();
        }
    });

    cup.pour("should fail to add when session create fails", function (done) {

        var manager = new this.required["../src/session/SessionManager"]();

        manager.createSession(function (err, session) {

            expect(err).to.equal(this.pars.createErr);
            expect(session).to.not.exist();

            done();
        }.bind(this));

        }, {
        befores: function(next){
            var Session = this.getStub("session/SocketsSession");

            Session.create.resetBehavior();

            Session.create
                .callsArgWith(2, this.pars.createErr, {});

            next();
        },
        pars:{createFail: true}
    });
});