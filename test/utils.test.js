var chai = require("chai"),
    expect = chai.expect,
    dirtyChai = require("dirty-chai"),
    sinonChai = require("sinon-chai"),
    utils = require("../src/common/utils");

describe("utils tests", function () {
    "use strict";

    chai.use(sinonChai); //add sinon syntax to assertions
    chai.use(dirtyChai); //use lint-friendly chai assertions!

    describe("test assign pars", function () {

        it("should add key and value", function () {
            var obj = {};
            utils.assignPars(obj, "foo", "bar");
            expect(obj.foo).to.equal("bar");
        });

        it("should add override key with value", function () {
            var obj = {
                foo: "bla"
            };

            utils.assignPars(obj, "foo", "bar");
            expect(obj.foo).to.equal("bar");
        });

        it("should add multiple keys/vals", function () {

            var obj = {
                foo: "bla"
            };

            utils.assignPars(obj, {"foo": "bar", "test": "123"});

            expect(obj.foo).to.equal("bar");
            expect(obj.test).to.equal("123");
        });
    });

    describe("test dynamic load", function () {

        it("should fail to load unknown module", function () {

            expect(function () {
                utils.dynamicLoad("bla");
            }).to.throw();
        });

        it("should load module", function () {

            var path = utils.dynamicLoad("path");
            expect(path).to.exist();
            expect(path.sep).to.exist();
        });
    });

    describe("test crypto length", function () {

        it("should return correct length", function () {
            expect(utils.getCryptoSaltLength(0)).to.equal(0);
            expect(utils.getCryptoSaltLength(8)).to.equal(12);
            expect(utils.getCryptoSaltLength(11)).to.equal(16);
            expect(utils.getCryptoSaltLength(12)).to.equal(16);
            expect(utils.getCryptoSaltLength(16)).to.equal(24);
        });
    });

    describe("test set immediate", function () {

        var counter = 0;

        it("should call set immediate", function (done) {

            utils.setImmediate(function () {
                counter += 1;
                done();
            });
        });

        after(function () {
            expect(counter).to.equal(1);
        });
    });
});
