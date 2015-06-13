var chai = require("chai"),
    expect = chai.expect,
    ConnectionBase = require("../../src/providers/ConnectionBase");

describe("connection base tests", function () {
    "use strict";

    var connBase = new ConnectionBase();

    it("should fail on call to getId", function () {
        expect(function () {
            connBase.getId();
        }).to.throw();
    });

    it("should fail on call to send", function () {
        expect(function () {
            connBase.send();
        }).to.throw();
    });

    it("should fail on call to onData", function () {
        expect(function () {
            connBase.onData();
        }).to.throw();
    });

    it("should fail on call to stop", function () {
        expect(function () {
            connBase.stop();
        }).to.throw();
    });

    it("should fail on call to onClose", function () {
        expect(function () {
            connBase.onClose();
        }).to.throw();
    });

    it("should fail on call to isWritable", function () {
        expect(function () {
            connBase.isWritable();
        }).to.throw();
    });
});