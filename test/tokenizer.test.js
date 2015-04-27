var chai = require("chai"),
    expect = chai.expect,
    dirtyChai = require("dirty-chai"),
    sinonChai = require("sinon-chai"),
    crypto = require("crypto"),
    stirrer = require("mocha-stirrer");

describe("tokenizer tests", function () {
    "use strict";

    chai.use(sinonChai); //add sinon syntax to assertions
    chai.use(dirtyChai); //use lint-friendly chai assertions!

    describe("validate token tests", function () {

        var tokenizer;

        var cup = stirrer.grind({
            pars: {
                length: 16,
                digestResult: "1234"
            },
            requires: [
                "../src/session/tokenizer"
            ],
            stubs: {
                "hashUpdate": stirrer.EMPTY,
                "hashDigest": stirrer.EMPTY
            },
            before: function () {
                var stubs = this.stubs;

                this.getStub("common/utils").getCryptoSaltLength.returns(0);
                stubs.hashDigest.returns(this.pars.digestResult);
                stubs.hashUpdate.returns({digest: stubs.hashDigest});
                stubs.crypto.createHash.returns({update: stubs.hashUpdate});
            }
        });

        cup.pour("should validate token+secret successfully", function () {

            var tokenizer = this.required["../src/session/tokenizer"];

            var isValid = tokenizer.validate("bla", "1234", this.pars.length);

            expect(isValid).to.be.true();
        });

        cup.pour("should fail on validating token", function () {

            var tokenizer = this.required["../src/session/tokenizer"];

            var isValid = tokenizer.validate("bla", "12345", this.pars.length);

            expect(isValid).to.be.false();
        });
    });

    describe("generate token tests", function () {

        var cup = stirrer.grind({
            name: "generate-token-tests-cup",
            transformForEach: true,
            restirForEach: true,

            pars: {
                length: 16,
                saltBfr: new Buffer("test-salt")
            },

            transform: function (pars) {

                pars.secretBfr = pars.secret ?
                    new Buffer(pars.secret) :
                    new Buffer("test-secret");

                return pars;
            },

            stubs: {
                "randomBytesStub": [crypto, "randomBytes"],
                "pRandomBytesStub": [crypto, "pseudoRandomBytes"],
                "hashDigestStub": stirrer.EMPTY,
                "hashUpdateStub": stirrer.EMPTY,
                "createHashStub": [crypto, "createHash"]
            },

            beforeEach: function () {

                expect(this).to.equal(cup);

                var stubs = this.stubs;
                var pars = this.pars;
                stubs.pRandomBytesStub.callsArgWith(1, null, pars.saltBfr);
                stubs.hashDigestStub.returns("test-hash");

                stubs.hashUpdateStub.returns({
                    digest: stubs.hashDigestStub
                });

                stubs.createHashStub.returns({
                    update: stubs.hashUpdateStub
                });
            },

            afterEach: function () {

                var stubs = this.stubs,
                    pars = this.pars,
                    length = pars.length;

                if (!pars.generateFail) {

                    if (!pars.secret) {
                        expect(stubs.randomBytesStub).to.have.been.calledWith(length);
                    }

                    expect(stubs.pRandomBytesStub).to.have.been.calledWith(length);
                    expect(stubs.hashUpdateStub).to.have.been.calledWith(pars.secretBfr.toString("base64") + pars.saltBfr.toString("base64"));
                }
            }
        });

        describe("successful generation of token tests", function () {

            var tokenizer = require("../src/session/tokenizer");

            function successGenerateHandler(done, cup, err, data) {

                var pars = cup.pars;

                expect(data).to.exist();
                expect(err).to.not.exist();
                expect(data.secret).to.equal(pars.secretBfr.toString("base64"));
                expect(data.token).to.equal(pars.saltBfr.toString("base64") + "test-hash");

                done();
            }

            function stubSetupFirstTimeFail(next) {

                this.stubs.randomBytesStub
                    .onFirstCall().callsArgWith(1, "on no !!!") //fail first call
                    .onSecondCall().callsArgWith(1, null, this.pars.secretBfr); //succeed second call

                next();
            }

            cup.pour("should generate token successfully with the supplied secret", function (done) {
                tokenizer.generate(this.pars.length, this.pars.secret,
                    successGenerateHandler.bind(null, done, this));
            }, {
                pars: {
                    "secret": "my-very-own-secret",
                    generateFail: false
                },
                befores: function (next) {
                    this.stubs.randomBytesStub.callsArgWith(1, null, this.pars.secretBfr);
                    next();
                }
            });

            cup.pour("should generate token successfully without secret", function (done) {

                tokenizer.generate(this.pars.length,
                    successGenerateHandler.bind(null, done, this));
            }, {
                pars: {
                    "secret": null,
                    generateFail: false
                },
                befores: function (next) {
                    this.stubs.randomBytesStub.callsArgWith(1, null, this.pars.secretBfr);
                    next();
                }
            });

            cup.pour("should generate token successfully  with first time randomBytes failing", function (done) {

                tokenizer.generate(this.pars.length,
                    successGenerateHandler.bind(null, done, this));
            }, {
                pars: {
                    "secret": null,
                    generateFail: false
                },
                befores: stubSetupFirstTimeFail
            });
        });

        describe("generation failure of token tests", function () {

            var tokenizer = require("../src/session/tokenizer");

            function failedGenerateHandler(done, err, data) {

                expect(data).to.not.exist();
                expect(err).to.exist();
                expect(err).to.equal("still oh no !!!");

                done();
            }

            cup.pour("should fail without length", function () {
                expect(tokenizer.generate).to.throw(TypeError);
            }, {
                pars: {
                    generateFail: true
                }
            });

            cup.pour("should fail with invalid length", function () {
                expect(function () {
                    tokenizer.generate("adas", "123", function () {
                    });
                }).to.throw(TypeError);

            }, {
                pars: {
                    generateFail: true
                }
            });

            cup.pour("should fail to generate token without secret", function (done) {

                tokenizer.generate(this.pars.length,
                    failedGenerateHandler.bind(null, done));
            }, {
                pars: {
                    generateFail: true
                },
                befores: function (next) {
                    cup.stubs.randomBytesStub.resetBehavior();
                    this.stubs.randomBytesStub
                        .onFirstCall().callsArgWith(1, "on no !!!") //fail first call
                        .onSecondCall().callsArgWith(1, "still oh no !!!"); //succeed second call

                    next();
                }
            });
        });
    });
});