var chai = require("chai"),
    expect = chai.expect,
    dirtyChai = require("dirty-chai"),
    sinonChai = require("sinon-chai"),
    stirrer = require("mocha-stirrer");

describe("Socket Session tests", function () {
    "use strict";

    chai.use(sinonChai);
    chai.use(dirtyChai);

    var cup = stirrer.grind({
        name: "socket session test cup",
        requires: [{path: "../src/session/SocketsSession", options: {dontMock: ["../common/utils"]}}],
        pars: {
            tokenSecretLength: 16,
            token: "abc",
            secret: "dddd",
            sessionId: "1234"
        },
        afterEach: function () {

            if (this.pars.testSession) {

                var session = this.pars.testSession;

                expect(session).to.exist();
                expect(session.getId()).to.equal(this.pars.sessionId);
                expect(session.isReady()).to.be.true();
                expect(session.isDestroyed()).to.be.false();

                delete this.pars.tokenize;
                delete this.pars.testSession;
            }
        }
    });

    cup.pour("should create new session with undefined options", function (done) {

        var Session = this.required["../src/session/SocketsSession"];

        Session.create(this.pars.sessionId, undefined, function (err, session) {

            expect(err).to.not.exist();
            this.pars.testSession = session;
            done();
        }.bind(this));
    });

    cup.pour("should create new session without token", function (done) {

        var Session = this.required["../src/session/SocketsSession"];

        Session.create(this.pars.sessionId, {}, function (err, session) {

            expect(err).to.not.exist();

            session.set("foo", "bar");
            expect(session.get("foo")).to.equal("bar");

            this.pars.testSession = session;

            done();
        }.bind(this));
    });

    cup.pour("should fail on setting id with reserved id key", function (done) {

        var Session = this.required["../src/session/SocketsSession"];

        Session.create(this.pars.sessionId, {}, function (err, session) {

            expect(err).to.not.exist();

            expect(function () {
                session.set("_id", "new id");
            }).to.throw();

            done();
        });
    });

    cup.pour("destroy should destroy the session", function (done) {

        var Session = this.required["../src/session/SocketsSession"];

        Session.create(this.pars.sessionId, {}, function (err, session) {

            expect(err).to.not.exist();

            expect(session.isReady()).to.be.true();
            expect(session.isDestroyed()).to.be.false();
            session.destroy();

            expect(session.isReady()).to.be.false();
            expect(session.isDestroyed()).to.be.true();

            done();
        });

    });

    cup.pour("should create session with token", function (done) {

        var Session = this.required["../src/session/SocketsSession"];

        var s = Session.create(this.pars.sessionId,
            {
                tokenizeConnection: true,
                tokenSecretLength: this.pars.tokenSecretLength
            }, function (err, session) {

                expect(err).to.not.exist();
                expect(session).to.exist();
                expect(s).to.equal(session);

                expect(session.get("_token")).is.equal(this.pars.token);
                expect(session.getToken()).is.equal(this.pars.token);
                expect(session.get("_secret")).is.equal(this.pars.secret);
                expect(session.get("_tokenLength")).is.equal(this.pars.tokenSecretLength);
                expect(session.getCreatedTime()).to.be.a("number");

                expect(session.isValid(this.pars.token)).to.be.true();

                done();
            }.bind(this));

        expect(s).to.exist();
        expect(s.isReady()).to.be.false();
    }, {
        befores: function (next) {

            var tokenizer = this.getStub("session/tokenizer");

            tokenizer.generate.callsArgWithAsync(1, null, {
                token: this.pars.token,
                secret: this.pars.secret
            });

            tokenizer.validate
                .withArgs(this.pars.secret, this.pars.token, this.pars.tokenSecretLength)
                .returns(true);

            next();
        },
        afters: function (next) {

            var tokenizer = this.getStub("session/tokenizer");
            tokenizer.generate.calledWith(this.pars.tokenSecretLength);

            next();
        }
    });

    cup.pour("should create an invalid session if token generate fails", function () {

        var Session = this.required["../src/session/SocketsSession"];

        Session.create(this.pars.sessionId, {
            tokenizeConnection: true
        }, function (err, session) {

            expect(err).to.equal("ERR!");
            expect(session).to.not.exist();

            expect(session.isReady()).to.be.false();
        });
    }, {
        befores: function (next) {

            var tokenizer = this.getStub("session/tokenizer");
            tokenizer.generate.callsArgWithAsync(1, "ERR!", null);
            next();
        },
        afters: function (next) {
            var tokenizer = this.getStub("session/tokenizer");
            tokenizer.generate.calledWith(this.pars.tokenSecretLength);
            next();
        }
    });

    cup.pour("should throw on isValid with no secret found", function () {

        var Session = this.required["../src/session/SocketsSession"];

        Session.create(this.pars.sessionId, {}, function (err, session) {

            expect(err).to.not.exist();
            expect(session).to.exist();

            expect(function(){session.isValid();}).to.throw();
        });
    });
});