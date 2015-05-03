var chai = require("chai"),
    expect = chai.expect,
    dirtyChai = require("dirty-chai"),
    sinonChai = require("sinon-chai"),
    stirrer = require("mocha-stirrer");

describe("request mapper tests", function () {
    "use strict";

    chai.use(sinonChai);
    chai.use(dirtyChai);

    describe("test mapper handler addition", function () {

        var cup = stirrer.grind({

            pars: {
                mapKey: "<GET>/api/url/:id",
                mapKeyPOST: "<POST>/api/url/:id",
                urlAsRgx: "url-as-regex",
                mapFn: function () {
                },
                mapFnPost: function () {
                }
            },
            before: function () {
                this.getStub("path-to-regexp/index").returns(this.pars.urlAsRgx);
            },
            afterEach: function () {
                expect(this.getStub("path-to-regexp/index")).to.have.been.calledWith(this.pars.mapKey);
            },
            requires: [{
                path: "../src/request/RequestMapper",
                options: {dontStub: ["lodash", "../common/consts", "debug"]}
            }]
        });

        cup.pour("should add handler with map object prop", function () {

            var mapper = new this.required["../src/request/RequestMapper"]();

            mapper.addHandler({
                map: {
                    "/api/url/:id": this.pars.mapFn
                }
            });

            console.log("mappings::: ", mapper._map);

            var config = mapper.getHandlerConfig(this.pars.mapKey);

            expect(config).to.exist();
            expect(config.handler).to.equal(this.pars.mapFn);
            expect(config.regex).to.equal(this.pars.urlAsRgx);
        });

        cup.pour("should add handler with map as function of object prop", function () {

            var mapper = new this.required["../src/request/RequestMapper"]();
            var mapFn = this.pars.mapFn;

            mapper.addHandler({
                map: function () {
                    return {
                        "/api/url/:id": mapFn
                    };
                }
            });

            var config = mapper.getHandlerConfig(this.pars.mapKey);

            expect(config).to.exist();
            expect(config.handler).to.equal(this.pars.mapFn);
            expect(config.regex).to.equal(this.pars.urlAsRgx);
        });

        cup.pour("should add handler map as function", function () {

            var mapper = new this.required["../src/request/RequestMapper"]();
            var mapFn = this.pars.mapFn;

            mapper.addHandler(function () {
                return {
                    "/api/url/:id": mapFn
                }
            });

            var config = mapper.getHandlerConfig(this.pars.mapKey);

            expect(config).to.exist();
            expect(config.handler).to.equal(this.pars.mapFn);
            expect(config.regex).to.equal(this.pars.urlAsRgx);
        });

        cup.pour("should add handler map as function using addMapping", function () {

            var mapper = new this.required["../src/request/RequestMapper"]();
            var mapFn = this.pars.mapFn;

            mapper.addMapping(function () {
                return {
                    "/api/url/:id": mapFn
                }
            });

            var config = mapper.getHandlerConfig(this.pars.mapKey);

            expect(config).to.exist();
            expect(config.handler).to.equal(this.pars.mapFn);
            expect(config.regex).to.equal(this.pars.urlAsRgx);
        });

        cup.pour("should throw if handler isnt a function", function () {

            var mapper = new this.required["../src/request/RequestMapper"]();

            expect(function () {
                mapper.addHandler(function () {
                    return {
                        "bla": "this isnt a handler"
                    };
                });
            }).to.throw(TypeError);
        });

        cup.pour("should add mapping same url different method", function () {

                var mapper = new this.required["../src/request/RequestMapper"]();

                mapper.addHandler({
                    map: {
                        "/api/url/:id": this.pars.mapFn,
                        "<POST>/api/url/:id": this.pars.mapFnPost
                    }
                });

                var config = mapper.getHandlerConfig(this.pars.mapKey);
                expect(config).to.exist();
                expect(config.handler).to.equal(this.pars.mapFn);
                expect(config.regex).to.equal(this.pars.urlAsRgx);

                var postConfig = mapper.getHandlerConfig(this.pars.mapKeyPOST);
                expect(postConfig).to.exist();
                expect(postConfig.handler).to.equal(this.pars.mapFnPost);
                expect(postConfig.regex).to.equal(this.pars.urlAsRgx);
            },
            {
                afters: function (next) {
                    expect(this.getStub("path-to-regexp/index")).to.have.been.calledWith(this.pars.mapKey);
                    expect(this.getStub("path-to-regexp/index")).to.have.been.calledWith(this.pars.mapKeyPOST);
                    next();
                }
            });
    });

    describe("test mapper handler resolution", function () {

        var cup = stirrer.grind({

            pars: {
                mapKey: "/api/url/:id",
                mapKeyPOST: "<POST>/api/url/:id",
                urlAsRgx: "url-as-regex",
                mapFn: function () {
                },
                mapFnPost: function () {
                }
            },
            stubs: {
                pathToRgxTest: stirrer.EMPTY
            },
            requires: [{
                path: "../src/request/RequestMapper",
                options: {dontStub: ["lodash", "../common/consts", "debug"]}
            }],
            before: function () {
                this.getStub("path-to-regexp/index").returns({test: this.stubs.pathToRgxTest});
            }
        });

        cup.pour("should not find anything when no registered handlers", function () {

            var mapper = new this.required["../src/request/RequestMapper"]();

            var handler = mapper.getRequestHandler({
                resource: this.pars.mapKey,
                method: "GET"
            });

            expect(handler).to.not.exist();
        });

        cup.pour("should find immediate matching handler", function () {

            var mapper = new this.required["../src/request/RequestMapper"]();

            mapper.addHandler({
                map: {
                    "/api/url/:id": this.pars.mapFn,
                    "<POST>/api/url/:id": this.pars.mapFnPost
                }
            });

            var handler = mapper.getRequestHandler({
                resource: this.pars.mapKey,
                method: "GET"
            });

            expect(handler).to.exist();
            expect(handler.handler).to.equal(this.pars.mapFn);

            expect(this.stubs.pathToRgxTest).to.not.have.been.called();
        });

        cup.pour("should find matching handler using rgx", function () {

            var mapper = new this.required["../src/request/RequestMapper"]();

            mapper.addHandler({
                map: {
                    "/api/url/:id": this.pars.mapFn,
                    "<POST>/api/url/:id": this.pars.mapFnPost
                }
            });

            var handler = mapper.getRequestHandler({
                resource: this.pars.urlAsRgx,
                method: "GET"
            });

            expect(handler).to.exist();
            expect(this.stubs.pathToRgxTest).to.have.been.called();
            expect(handler.handler).to.equal(this.pars.mapFn);
        },{
            befores: function(next){
                this.stubs.pathToRgxTest.returns(true);
                next();
            }
        });
    });
});