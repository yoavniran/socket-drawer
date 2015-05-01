var chai = require("chai"),
    expect = chai.expect,
    dirtyChai = require("dirty-chai"),
    sinonChai = require("sinon-chai");
//stirrer = require("mocha-stirrer");

describe("request parser tests", function () {
    "use strict";

    chai.use(sinonChai);
    chai.use(dirtyChai);

    describe("parse string messages", function () {

        var methods = require("../src/common/consts").HTTP_METHODS;
        var requestParser = require("../src/request/requestParser");

        it("should return all message data", function () {

            var msg = '{"data":{"a":"123","b":1234},"metadata":{"c":"aaa","d":123123},"resource":"/url/foo","method":"GET"}';

            var parsed = requestParser.parse(msg);

            expect(parsed).to.exist();
            expect(parsed.data).to.exist();
            expect(parsed.metadata).to.exist();

            expect(parsed.resource).to.equal("/url/foo");
            expect(parsed.method).to.equal(methods.GET);

            expect(parsed.data.b).to.equal(1234);
            expect(parsed.metadata.c).to.equal("aaa");
        });


        it("should return all message data with data prop is string", function () {

            var msg = {data: '{"data": {"a":"123","b":1234}, "resource":"/url/foo","method":"POST"}'};

            var parsed = requestParser.parse(msg);

            expect(parsed).to.exist();
            expect(parsed.data).to.exist();
            expect(parsed.resource).to.equal("/url/foo");
            expect(parsed.method).to.equal(methods.POST);

            expect(parsed.data.a).to.equal("123");
            expect(parsed.data.b).to.equal(1234);
        });
    });

});