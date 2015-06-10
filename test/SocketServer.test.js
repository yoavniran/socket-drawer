var chai = require("chai"),
    expect = chai.expect,
    dirtyChai = require("dirty-chai"),
    sinonChai = require("sinon-chai"),
    consts = require("../src/common/consts"),
    stirrer = require("mocha-stirrer");

describe("SocketsServer tests", function () {
    "use strict";

    chai.use(sinonChai); //add sinon syntax to assertions
    chai.use(dirtyChai); //use lint-friendly chai assertions!

    function getNewServer(cup, conf) {

        var Server = cup.getRequired("server");

        return new Server(conf);
    }

    describe("testing SocketServer defaults values", function () {

        var SocketServer = require("../src/server/SocketsServer");

        var server = new SocketServer({});

        it("tokenSecretLength should have the default value: 16", function () {
            var tokenSecretLength = server.get("tokenSecretLength");
            expect(tokenSecretLength).to.equal(16);
        });

        it("tokenizeConnection should have the default value: false", function () {
            var tokenizeConnection = server.get("tokenizeConnection");
            expect(tokenizeConnection).to.be.false();
        });

        it("requestTokenKey should have the default value: token", function () {
            var requestTokenKey = server.get("requestTokenKey");
            expect(requestTokenKey).to.equal("token");
        });

        it("checkTokenOnMethods should have the default value: null", function () {
            var checkTokenOnMethods = server.get("checkTokenOnMethods");
            expect(checkTokenOnMethods).to.be.null();
        });

        it("externalSession should have the default value: false", function () {
            var externalSession = server.get("externalSession");
            expect(externalSession).to.be.false();
        });

        var defaultBroadcaster = require("../src/server/broadcaster"),
            defaultRequestParser = require("../src/request/requestParser"),
            DefaultRequestMapper = require("../src/request/RequestMapper"),
            DefaultSessionManager = require("../src/session/SessionManager");

        it("should use default dependencies", function () {

            expect(server.get("broadcaster")).to.equal(defaultBroadcaster);
            expect(server.get("request-parser")).to.equal(defaultRequestParser);
            expect(server.get("request-mapper")).to.be.an.instanceOf(DefaultRequestMapper);
            expect(server.get("session-manager")).to.be.an.instanceOf(DefaultSessionManager);
        });
    });

    describe("test addRequestHandling", function () {

        var Server = require("../src/server/SocketsServer");
        var RequireMapper = require("../src/request/RequestMapper");

        var cup = stirrer.grind({
            stubs: {
                mapperAddHandler: [RequireMapper.prototype, "addHandler"]
            }
        });

        cup.pour("should add handlers to mapper", function () {

            var server = new Server();

            server.addRequestHandling("test1");
            server.addRequestHandling(["test2", "test3"]);

            expect(this.stubs.mapperAddHandler).to.have.been.calledThrice();

            expect(this.stubs.mapperAddHandler).to.have.been.calledWith("test1");
            expect(this.stubs.mapperAddHandler).to.have.been.calledWith("test2");
            expect(this.stubs.mapperAddHandler).to.have.been.calledWith("test3");
        });
    });

    describe("test start method", function () {

        var cup = stirrer.grind({
            restirForEach: true,

            pars: {
                wsImp: consts.IMPLEMENTATIONS.WS,
                sockjsImp: consts.IMPLEMENTATIONS.SOCK_JS
            },
            requires: [{
                path: "../src/server/SocketsServer", options: {alias: "server"}
            }],

            spies: {
                providerStart: stirrer.EMPTY,
                providerOnNewConn: stirrer.EMPTY
            },

            beforeEach: function () {

                var socketsUtils = this.getStub("common/utils");

                socketsUtils.assignPars.restore();
                this.sb.spy(socketsUtils, "assignPars");  //need to spy on this call instead of stub so it actually does what its supposed to do

                this.getStub("providers/factory").getProvider.onFirstCall().returns({
                    start: this.spies.providerStart,
                    onNewConnection: this.spies.providerOnNewConn
                });
            },

            afterEach: function () {
                var testImp = this.pars.currentImp || this.pars.wsImp;

                expect(this.getStub("providers/factory").getProvider).to.have.been.calledWith(testImp);
                expect(this.spies.providerStart).to.have.been.calledOnce();
                expect(this.spies.providerOnNewConn).to.have.been.calledOnce();

                delete this.pars.currentImp;
            }
        });

        cup.pour("should initialize provider - no options", function () {

            var server = getNewServer(this);
            server.start();
        });

        cup.pour("should only start once", function () {
            var server = getNewServer(this);
            server.start();
            server.start();
        }, {
            afters: function (next) {
                expect(this.getStub("providers/factory").getProvider).to.have.been.calledOnce();
                expect(this.spies.providerStart).to.have.been.calledOnce();
                expect(this.spies.providerOnNewConn).to.have.been.calledOnce();
                next();
            }
        });

        cup.pour("should initialize provider - empty options", function () {

            this.pars.currentImp = this.pars.wsImp;
            var server = getNewServer(this, {});
            server.start();
        });

        cup.pour("should initialize provider - sockjs imp", function () {

            this.pars.currentImp = this.pars.wsImp;
            this.pars.serverOptions = {implementation: this.pars.currentImp, text: "foo"};

            var server = getNewServer(this, this.pars.serverOptions);
            server.start();
        }, {
            afters: function (next) {
                expect(this.spies.providerStart).to.have.been.calledWith(this.pars.serverOptions); //provider start should also get the same options object
                next();
            }
        });

        cup.pour("should override default dependencies", function () {

            var broadcaster = {name: "broadcaster"};
            var requestParser = {name: "parser"};
            var RequestMapper = function () {
            };
            var SessionManager = function () {
            };

            var server = new this.required["../src/server/SocketsServer"]({
                "broadcaster": broadcaster,
                "request-parser": requestParser,
                "request-mapper": RequestMapper,
                "session-manager": SessionManager
            });

            server.start();

            var socketsUtils = this.getStub("common/utils");
            expect(socketsUtils.assignPars).to.have.been.calledWith(server._propertyBag, "broadcaster", broadcaster);
            expect(socketsUtils.assignPars).to.have.been.calledWith(server._propertyBag, "request-parser", requestParser);
            expect(socketsUtils.assignPars).to.have.been.calledWith(server._propertyBag, "request-mapper"); //, RequestMapper);
            expect(socketsUtils.assignPars).to.have.been.calledWith(server._propertyBag, "session-manager"); //, broadcaster);
        });

        describe("test add handlers on start", function () {

            cup.pour("should register handlers added on creation as array", function () {

                var handlers = ["handler1", "handler2"];

                var server = getNewServer(this, {
                    handlers: handlers
                });

                server.start();

                var RequestMapper = this.getStub("request/RequestMapper");

                expect(RequestMapper.prototype.addHandler).to.have.been.calledTwice();
                expect(RequestMapper.prototype.addHandler).to.have.been.calledWith(handlers[0]);
                expect(RequestMapper.prototype.addHandler).to.have.been.calledWith(handlers[1]);
            });

            cup.pour("should register handlers added on creation as object", function () {

                var handlers = {
                    "a": "handler1",
                    "b": "handler2"
                };

                var server = getNewServer(this, {
                    handlers: handlers
                });

                server.start();

                var RequestMapper = this.getStub("request/RequestMapper");

                expect(RequestMapper.prototype.addHandler).to.have.been.calledTwice();
                expect(RequestMapper.prototype.addHandler).to.have.been.calledWith(handlers.a);
                expect(RequestMapper.prototype.addHandler).to.have.been.calledWith(handlers.b);
            });
        });

        cup.pour("should initialize with config object from options", function () {

            var config = {
                "a": 123,
                "b": 5653
            };

            var server = getNewServer(this, {
                config: config
            });

            server.start();

            var firstCallArgs = this.getStub("common/utils").assignPars.firstCall.args;

            expect(firstCallArgs[1]).to.include.keys(["a", "b"]);
        });

        //BEFORE
        //var providerFactory = require("../src/providers/factory");
        //var providerStartSpy, providerOnNewConnectionSpy,
        //    factoryMock, factoryMockExp;
        //
        //
        //beforeEach(function beforeStartMethodTest() {
        //
        //    factoryMock = sinon.mock(providerFactory);
        //    providerStartSpy = sinon.spy();
        //    providerOnNewConnectionSpy = sinon.spy();
        //
        //    factoryMockExp = factoryMock.expects("getProvider")
        //        .once()
        //        .returns({
        //            start: providerStartSpy,
        //            onNewConnection: providerOnNewConnectionSpy
        //        });
        //});
        //
        //afterEach(function afterStartMethodText() {
        //    factoryMock.restore();
        //});
        //
        //it("should initialize provider - no options", function () {
        //
        //    factoryMockExp.withArgs(consts.IMPLEMENTATIONS.WS);
        //
        //    var server = new SocketServer({});
        //    server.start();
        //
        //    //verifications
        //    factoryMock.verify();
        //    expect(providerStartSpy).to.have.been.called();
        //    expect(providerOnNewConnectionSpy).to.have.been.called();
        //});
        //it("should initialize provider - sockjs imp", function () {
        //    var imp = consts.IMPLEMENTATIONS.SOCK_JS;
        //    factoryMockExp.withArgs(imp);
        //
        //    var server = new SocketServer({implementation: imp});
        //    server.start();
        //
        //    //verifications
        //    factoryMock.verify();
        //    expect(providerStartSpy).to.have.been.called();
        //    expect(providerOnNewConnectionSpy).to.have.been.called();
        //});
    });

    describe("test connection and session events", function () {

        var cup = stirrer.grind({
            restirForEach: true,

            pars: {
                connId: "1000aab",
                requestTokenKey: "__token",
                msg: {resource: "/api/test", data: "foo"},
                sessionToken: "abcd",
                data: {resource: "/api/test", data: "foo", metadata: {foo: "bar", __token: "abcd"}, method: "GET"},
                handlerData: {keys: [1, 2, 3], path: "/nowhere"},
                defaultConnIdKey: "connection-id",
                customConnIdKey: "custom_conn_id"
            },

            requires: [{path: "../src/server/SocketsServer", options: {alias: "server"}}],

            spies: {
                providerStart: stirrer.EMPTY,
                reqHandler: stirrer.EMPTY
            },

            stubs: {
                providerOnNewConn: stirrer.EMPTY,
                connGetId: stirrer.EMPTY,
                connOnData: stirrer.EMPTY,
                connOnClose: stirrer.EMPTY,
                sessionGet: stirrer.EMPTY,
                sessionSet: stirrer.EMPTY,
                sessionGetId: stirrer.EMPTY,
                sessionIsValid: stirrer.EMPTY,
                socketWare: stirrer.EMPTY
            },

            beforeEach: function () {

                var socketsUtils = this.getStub("common/utils");
                socketsUtils.assignPars.restore();
                this.sb.spy(socketsUtils, "assignPars");  //need to spy on this call instead of stub so it actually does what its supposed to do

                this.getStub("common/utils").setImmediate.callsArg(0);
                this.stubs.connGetId.returns(this.pars.connId);

                var conn  = this.pars.conn =  {
                    getId: this.stubs.connGetId,
                    onData: this.stubs.connOnData,
                    onClose: this.stubs.connOnClose
                };

                this.stubs.providerOnNewConn.callsArgWith(0, conn);

                this.getStub("providers/factory").getProvider.onFirstCall().returns({
                    start: this.spies.providerStart,
                    onNewConnection: this.stubs.providerOnNewConn
                });

                this.getStub("request/requestParser").parse.returns(this.pars.data);
                this.getStub("request/RequestMapper").prototype.getRequestHandler.returns(this.pars.handlerData);

                this.pars.handlerData.handler = this.spies.reqHandler;

                this.pars.session = {
                    get: this.stubs.sessionGet,
                    set: this.stubs.sessionSet,
                    getId: this.stubs.sessionGetId,
                    isValid: this.stubs.sessionIsValid
                };

                this.stubs.connOnData.callsArgWith(0, this.pars.msg);

                this.getStub("server/serverHelperFunctions").getFunctions.returns({
                    publish: function () {
                    },
                    attachSessionpublish: function () {
                    },
                    get: function () {
                    }
                });
            },
            afterEach: function () {
                expect(this.spies.providerStart).to.have.been.calledOnce();
            }
        });

        cup.pour("should handle new connection", function () {

            var server = getNewServer(this);
            server.start();

            expect(server.getConnection(this.pars.connId)).to.equal(this.pars.conn);
        }, {
            befores: function (next) {
                this.stubs.connOnData.resetBehavior(); //dont go into the full flow of connection receiving data
                next();
            },
            afters: function (next) {

                expect(this.stubs.connGetId).to.have.been.calledOnce();
                expect(this.stubs.connOnData).to.have.been.calledOnce();
                expect(this.stubs.connOnClose).to.have.been.calledOnce();
                next();
            }
        });

        cup.pour("should handle connection data event", function () {

                var server = getNewServer(this);
                server.start();
            },
            {
                befores: function (next) {

                    this.getStub("session/SessionManager").prototype.find.returns(this.pars.session);

                    next();
                },
                afters: function (next) {

                    expect(this.getStub("request/requestParser").parse).to.have.been.calledWith(this.pars.msg);
                    expect(this.getStub("request/RequestMapper").prototype
                        .getRequestHandler).to.have.been.calledWith(this.pars.data);

                    var smFind = this.getStub("session/SessionManager").prototype.find;
                    expect(smFind).to.have.been.calledWith("connection-id", this.pars.connId);
                    expect(smFind).to.have.been.calledOnce();

                    expect(this.spies.reqHandler).to.have.been.called();

                    var reqHandlerCall = this.spies.reqHandler.getCall(0);
                    var reqHandlerCallArgs = reqHandlerCall.args;

                    expect(reqHandlerCallArgs[0]).to.be.equal(this.pars.data.resource);
                    expect(reqHandlerCallArgs[1]).to.be.equal(this.pars.data.data);
                    expect(reqHandlerCallArgs[2]).to.be.equal(this.pars.data.metadata);
                    expect(reqHandlerCallArgs[3]).to.be.equal(this.pars.data.method);
                    expect(reqHandlerCallArgs[4].keys).to.be.equal(this.pars.handlerData.keys);
                    expect(reqHandlerCallArgs[4].path).to.be.equal(this.pars.handlerData.path);
                    expect(reqHandlerCallArgs[5]).to.be.equal(this.pars.session);

                    next();
                }
            });

        cup.pour("should handle connection data event with token check", function () {

            var server = getNewServer(this, {
                config: {
                    tokenizeConnection: true,
                    requestTokenKey: this.pars.requestTokenKey
                }
            });

            server.start();

        }, {
            befores: function (next) {

                this.getStub("session/SessionManager").prototype.find.returns(this.pars.session);

                this.stubs.sessionGet.returns(false);
                this.stubs.sessionIsValid.returns(true);

                next();
            },
            afters: function (next) {

                expect(this.getStub("request/requestParser").parse).to.have.been.calledOnce();
                expect(this.getStub("session/SessionManager").prototype.find).to.have.been.calledWith(this.pars.defaultConnIdKey, this.pars.connId);
                expect(this.stubs.sessionGet).to.have.been.calledWith("session-security-checked");
                expect(this.stubs.sessionIsValid).to.have.been.calledWith(this.pars.sessionToken);
                expect(this.stubs.sessionSet).to.have.been.calledWith("session-security-checked", true);

                next();
            }
        });

        cup.pour("should fail on connection data event with invalid token", function () {

            var server = getNewServer(this, {
                config: {
                    tokenizeConnection: true,
                    requestTokenKey: this.pars.requestTokenKey
                }
            });
            expect(function () {
                server.start();
            }).to.throw();

        }, {
            befores: function (next) {

                this.getStub("session/SessionManager").prototype.find.returns(this.pars.session);

                this.stubs.sessionGet.returns(false);
                this.stubs.sessionIsValid.returns(false);
                next();
            },
            afters: function (next) {
                expect(this.getStub("request/requestParser").parse).to.have.been.calledOnce();
                expect(this.stubs.sessionGet).to.have.been.calledWith("session-security-checked");
                expect(this.stubs.sessionIsValid).to.have.been.calledWith(this.pars.sessionToken);
                expect(this.stubs.sessionSet).to.not.have.been.called();

                next();
            }
        });

        cup.pour("should fail on connection data event with no token in data", function () {
            var server = getNewServer(this, {
                config: {
                    tokenizeConnection: true,
                    requestTokenKey: this.pars.requestTokenKey
                }
            });
            expect(function () {
                server.start();
            }).to.throw();
        }, {
            befores: function (next) {
                this.getStub("session/SessionManager").prototype.find.returns(this.pars.session);
                this.stubs.sessionGet.returns(false);
                this.pars.data.metadata.__token = undefined;
                next();
            },
            afters: function (next) {

                expect(this.getStub("request/requestParser").parse).to.have.been.calledOnce();
                expect(this.stubs.sessionGet).to.have.been.calledWith("session-security-checked");
                expect(this.stubs.sessionIsValid).to.not.have.been.called();
                expect(this.stubs.sessionSet).to.not.have.been.called();
                next();
            }
        });

        cup.pour("should skip token check if session marked as already checked", function () {

            var server = getNewServer(this, {
                config: {
                    tokenizeConnection: true,
                    requestTokenKey: this.pars.requestTokenKey
                }
            });

            server.start();
        }, {
            befores: function (next) {
                this.getStub("session/SessionManager").prototype.find.returns(this.pars.session);
                this.stubs.sessionGet.returns(true);
                next();
            },
            afters: function (next) {

                expect(this.stubs.sessionGet).to.have.been.calledWith("session-security-checked");
                expect(this.stubs.sessionIsValid).to.not.have.been.called();
                expect(this.stubs.sessionSet).to.not.have.been.called();
                next();
            }
        });

        cup.pour("should handle connection data event with external session not tokenized", function () {

            var server = getNewServer(this, {
                config: {
                    externalSession: true,
                    "session-identifier-key": this.pars.customConnIdKey
                }
            });
            server.start();
        }, {
            afters: function (next) {
                expect(this.getStub("session/SessionManager").prototype.find).to.have.been.calledTwice();
                expect(this.getStub("session/SessionManager").prototype.find).to.have.been.calledWith(this.pars.customConnIdKey, this.pars.connId);
                next();
            }
        });

        cup.pour("should fail on connection data event with external session and tokenized", function () {

            var server = getNewServer(this, {
                config: {
                    externalSession: true,
                    tokenizeConnection: true
                }
            });
            expect(function () {
                server.start();
            }).to.throw();
        }, {
            afters: function (next) {

                expect(this.stubs.sessionGet).to.not.have.been.called();
                expect(this.stubs.sessionIsValid).to.not.have.been.called();
                expect(this.stubs.sessionSet).to.not.have.been.called();

                next();
            }
        });

        cup.pour("should handle connection data with socket wares", function () {

            var server = getNewServer(this);

            server.use(this.stubs.socketWare, "my test ware", {test: "foo"});

            server.start();
        }, {
            befores: function (next) {

                this.getStub("session/SessionManager").prototype.find.returns(this.pars.session);
                this.stubs.socketWare.callsArg(7);

                next();
            },
            afters: function (next) {

                expect(this.getStub("request/requestParser").parse).to.have.been.calledOnce();

                expect(this.stubs.socketWare).to.have.been.calledOnce();

                var wareArgs = this.stubs.socketWare.firstCall.args;

                expect(wareArgs[0]).to.equal(this.pars.data.resource);
                expect(wareArgs[1]).to.equal(this.pars.data.data);
                expect(wareArgs[2]).to.equal(this.pars.data.metadata);
                expect(wareArgs[3]).to.equal(this.pars.data.method);
                expect(wareArgs[4].keys).to.equal(this.pars.handlerData.keys);
                expect(wareArgs[4].path).to.equal(this.pars.handlerData.path);
                expect(wareArgs[5]).to.equal(this.pars.session);

                next();
            }
        });

        cup.pour("should fail on connection data with socket wares returning error", function () {

            var server = getNewServer(this, {
                config: {
                    externalSession: true
                }
            });

            server.use(this.stubs.socketWare, "my test ware", {test: "foo"});

            expect(function () {
                server.start();
            }).to.throw();
        }, {
            befores: function (next) {

                this.stubs.socketWare.callsArgWith(7, "ERR!!!!");
                next();
            },
            afters: function (next) {

                expect(this.getStub("request/requestParser").parse).to.have.been.calledOnce();

                expect(this.stubs.socketWare).to.have.been.calledOnce();

                var wareArgs = this.stubs.socketWare.firstCall.args;

                expect(wareArgs[0]).to.equal(this.pars.data.resource);
                expect(wareArgs[1]).to.equal(this.pars.data.data);
                expect(wareArgs[2]).to.equal(this.pars.data.metadata);

                next();
            }
        });

        cup.pour("should fail on connection data with no session", function () {

            var server = getNewServer(this);

            expect(function () {
                server.start();
            }).to.throw();
        });

        cup.pour("should fail on connection data with no handler", function () {

            var server = getNewServer(this);

            expect(function () {
                server.start();
            }).to.throw();
        }, {
            befores: function (next) {

                this.getStub("session/SessionManager").prototype.find.returns(this.pars.session);
                this.getStub("request/RequestMapper").prototype.getRequestHandler.resetBehavior();
                this.getStub("request/RequestMapper").prototype.getRequestHandler.returns(undefined);

                next();
            },
            afters: function (next) {
                expect(this.getStub("request/requestParser").parse).to.have.been.calledOnce();
                next();
            }
        });

        cup.pour("should handle connection close event", function () {

            var server = getNewServer(this);
            server.start();
        }, {
            befores: function (next) {
                this.stubs.connOnData.resetBehavior(); //dont go into the full flow of connection receiving data
                this.stubs.connOnClose.callsArgWith(0, this.pars.connId);

                this.getStub("session/SessionManager").prototype.find.returns(this.pars.session);

                next();
            },
            afters: function (next) {

                expect(this.stubs.sessionGetId).to.have.been.calledOnce();
                expect(this.getStub("session/SessionManager").prototype.find).to.have.been.calledOnce();
                expect(this.getStub("session/SessionManager").prototype.destroySession).to.have.been.calledOnce();

                next();
            }
        });

        cup.pour("should handle connection close event without session", function () {

            var server = getNewServer(this);
            server.start();
        }, {
            befores: function (next) {
                this.stubs.connOnData.resetBehavior(); //dont go into the full flow of connection receiving data
                this.stubs.connOnClose.callsArgWith(0, this.pars.connId);

                next();
            },
            afters: function (next) {

                expect(this.getStub("session/SessionManager").prototype.find).to.have.been.calledOnce();
                expect(this.getStub("session/SessionManager").prototype.destroySession).to.not.have.been.called();
                expect(this.stubs.sessionGetId).to.not.have.been.called();

                next();
            }
        });

        cup.pour("should handle new session created", function () {
            var server = getNewServer(this, {
                config: {
                    "session-identifier-key": this.pars.customConnIdKey
                }
            });
            server.start();
        }, {
            befores: function (next) {
                this.getStub("session/SessionManager").prototype.createSession
                    .callsArgWith(0, null, this.pars.session);

                this.getStub("session/SessionManager").prototype.find.returns(this.pars.session);

                next();
            },
            afters: function (next) {

                expect(this.getStub("session/SessionManager").prototype.createSession).to.have.been.calledOnce();
                expect(this.stubs.sessionSet).to.have.been.calledWith(this.pars.customConnIdKey, this.pars.connId);

                next();
            }
        });

        cup.pour("should fail on failing to create session", function () {

            var server = getNewServer(this);

            expect(function () {
                server.start();
            }).to.throw();
        }, {
            befores: function (next) {

                this.getStub("session/SessionManager").prototype.find.returns(this.pars.session);
                this.getStub("session/SessionManager").prototype.createSession
                    .callsArgWith(0, "ERR!!!!");

                next();
            },
            afters: function (next) {
                expect(this.getStub("session/SessionManager").prototype.createSession).to.have.been.calledOnce();
                next();
            }
        });
    });

    describe("test use method", function () {

        var SServer = require("../src/server/SocketsServer");

        it("should register one ware at a time", function () {

            var server = new SServer({});

            var wFn = function () {
            };
            var wOpts = {test: "foo"};

            server.use(wFn, "testWare", wOpts);

            expect(server._socketsWares).to.exist();
            expect(server._socketsWares).to.have.length(1);

            var ware = server._socketsWares[0];
            expect(ware).to.exist();
            expect(ware.name).to.equal("testWare");
            expect(ware.handler).to.equal(wFn);
            expect(ware.options).to.equal(wOpts);
        });

        it("should register multiple wares from fn array", function () {

            var server = new SServer({});

            var wFn1 = function () {
            };
            wFn1.swname = "ware1";

            var wFn2 = function () {
            };
            wFn2.swname = "ware2";

            server.use([wFn1, wFn2]);

            expect(server._socketsWares).to.exist();
            expect(server._socketsWares).to.have.length(2);

            var ware = server._socketsWares[0];
            expect(ware).to.exist();
            expect(ware.name).to.equal("ware1");
            expect(ware.handler).to.equal(wFn1);
            expect(ware.options).to.not.exist();

            var ware2 = server._socketsWares[1];
            expect(ware2).to.exist();
            expect(ware2.name).to.equal("ware2");
            expect(ware2.handler).to.equal(wFn2);
            expect(ware2.options).to.not.exist();
        });

        it("should register multiple wares from obj array", function () {

            var server = new SServer({});

            var wFn1 = function () {
            };
            var wOpts1 = {test: "foo"};

            var wFn2 = function () {
            };
            var wOpts2 = {test: "bar"};

            server.use([{handler: wFn1, name: "ware1", options: wOpts1},
                {handler: wFn2, name: "ware2", options: wOpts2}]);

            expect(server._socketsWares).to.exist();
            expect(server._socketsWares).to.have.length(2);

            var ware = server._socketsWares[0];
            expect(ware).to.exist();
            expect(ware.name).to.equal("ware1");
            expect(ware.handler).to.equal(wFn1);
            expect(ware.options).to.equal(wOpts1);

            var ware2 = server._socketsWares[1];
            expect(ware2).to.exist();
            expect(ware2.name).to.equal("ware2");
            expect(ware2.handler).to.equal(wFn2);
            expect(ware2.options).to.equal(wOpts2);
        });

        it("should register multiple wares from obj", function () {

            var server = new SServer({});

            var wFn1 = function () {
            };
            var wOpts1 = {test: "foo"};

            var wFn2 = function () {
            };
            var wOpts2 = {test: "bar"};

            server.use({
                sw1: {handler: wFn1, name: "ware1", options: wOpts1},
                sw2: {handler: wFn2, name: "ware2", options: wOpts2}
            });

            expect(server._socketsWares).to.exist();
            expect(server._socketsWares).to.have.length(2);

            var ware = server._socketsWares[0];
            expect(ware).to.exist();
            expect(ware.name).to.equal("ware1");
            expect(ware.handler).to.equal(wFn1);
            expect(ware.options).to.equal(wOpts1);

            var ware2 = server._socketsWares[1];
            expect(ware2).to.exist();
            expect(ware2.name).to.equal("ware2");
            expect(ware2.handler).to.equal(wFn2);
            expect(ware2.options).to.equal(wOpts2);
        });

        it("should fail if handler isnt a fn", function () {

            var server = new SServer({});

            expect(function () {

                server.use([{
                    handler: null
                }]);

            }).to.throw(TypeError);
        });
    });

    describe("test property bag", function () {

        var SocketServer = require("../src/server/SocketsServer");

        it("set property with assigned value", function () {
            var server = new SocketServer({});
            server.set("foo", "bar");
            expect(server.get("foo")).to.equal("bar");
        });

        it("unset property successfully", function () {

            var server = new SocketServer({});

            server.set("test", "foo");
            expect(server.get("test")).to.equal("foo");

            server.unset("test");
            expect(server.get("test")).to.not.exist();
        });

        it("should return is enabled for a true property", function () {
            var server = new SocketServer({});
            server.set("js-rocks", true);
            expect(server.enabled("js-rocks")).to.be.true();
        });

        it("should return not enabled for a truish property", function () {
            var server = new SocketServer({});
            server.set("truish", 1);
            expect(server.enabled("truish")).to.be.false();
        });
    });

    describe("test publish methods", function () {

        var cup = stirrer.grind({
            restirForEach: true,
            requires: [{
                path: "../src/server/SocketsServer", options: {alias: "server"}
            }],
            pars: {
                connId: "!234",
                msg1: {
                    resource: "/bla",
                    isError: false,
                    data: "this is some data",
                    clientId: 1234
                },
                msg2: {
                    resource: undefined,
                    isError: false,
                    data: undefined,
                    clientId: undefined
                }
            },
            spies: {
                providerStart: stirrer.EMPTY
            },
            stubs: {
                sessionGet: stirrer.EMPTY,
                providerOnNewConn: stirrer.EMPTY
            },
            beforeEach: function () {

                var socketsUtils = this.getStub("common/utils");
                socketsUtils.assignPars.restore();
                this.sb.spy(socketsUtils, "assignPars");  //need to spy on this call instead of stub so it actually does what its supposed to do

                this.getStub("providers/factory").getProvider.returns({
                    start: this.spies.providerStart,
                    onNewConnection: this.stubs.providerOnNewConn
                });

                this.stubs.sessionGet.returns(this.pars.connId);

                var conn = this.pars.conn = {};

                this.sb.stub(this.getRequired("server").prototype, "getConnection");
                this.getRequired("server").prototype.getConnection.returns(conn);

                this.pars.session = {
                    get: this.stubs.sessionGet
                };
            }
        });

        cup.pour("should publish using session", function () {

            var server = getNewServer(this);
            server.start();

            var msg = this.pars.msg1;

            server.publish(this.pars.session, msg.resource, msg.data, msg.isError, msg.clientId);
        }, {

            afters: function (next) {

                expect(this.getStub("server/broadcaster").publishToConnection).to.have.been.calledOnce();
                expect(this.getStub("server/broadcaster").publishToConnection).to.have.been.calledWith(this.pars.msg1, this.pars.conn);
                expect(this.getRequired("server").prototype.getConnection).to.have.been.calledOnce();
                next();
            }
        });

        cup.pour("should publish even without data", function () {
            var server = getNewServer(this);
            server.start();

            server.publish(this.pars.session);
        }, {
            afters: function (next) {

                expect(this.getStub("server/broadcaster").publishToConnection).to.have.been.calledOnce();
                expect(this.getStub("server/broadcaster").publishToConnection).to.have.been.calledWith(this.pars.msg2, this.pars.conn);
                expect(this.getRequired("server").prototype.getConnection).to.have.been.calledOnce();
                next();
            }
        });

        cup.pour("should fail to publish if server not started", function () {

            var server = getNewServer(this);

            expect(function () {
                server.publish(cup.pars.session);
            }).to.throw();
        });

        cup.pour("should fail when no connection found for connection id", function () {

            var server = getNewServer(this);
            server.start();

            expect(function () {
                server.publish(cup.pars.session);
            }).to.throw();
        }, {
            befores: function (next) {
                this.getRequired("server").prototype.getConnection.resetBehavior();
                next();
            },
            afters: function (next) {
                expect(this.getRequired("server").prototype.getConnection).to.have.been.calledWith(this.pars.connId);
                next();
            }
        });

        cup.pour("should fail when session doesnt return connection id", function () {

            var server = getNewServer(this);
            server.start();

            expect(function () {
                server.publish(cup.pars.session);
            }).to.throw();
        }, {
            befores: function (next) {
                this.stubs.sessionGet.resetBehavior();
                this.getRequired("server").prototype.getConnection.resetBehavior();
                next();
            },
            afters: function (next) {
                expect(this.getRequired("server").prototype.getConnection).to.have.been.calledWith(undefined);
                next();
            }
        });
    });

    describe("test stopping the server", function () {

        var cup = stirrer.grind({
            restirForEach: true,

            requires: [{
                path: "../src/server/SocketsServer", options: {alias: "server"}
            }],
            stubs: {
                providerOnNewConn: stirrer.EMPTY
            },
            spies: {
                providerStart: stirrer.EMPTY,
                providerStop: stirrer.EMPTY,
                connGetId: stirrer.EMPTY,
                connOnData: stirrer.EMPTY,
                connOnClose: stirrer.EMPTY,
                connStop: stirrer.EMPTY
            },
            beforeEach: function () {

                this.getStub("common/utils").assignPars.restore();

                var conn = {
                    getId: this.spies.connGetId,
                    onData: this.spies.connOnData,
                    onClose: this.spies.connOnClose,
                    stop: this.spies.connStop
                };

                this.stubs.providerOnNewConn.callsArgWith(0, conn);

                this.getStub("providers/factory").getProvider.returns({
                    start: this.spies.providerStart,
                    stop: this.spies.providerStop,
                    onNewConnection: this.stubs.providerOnNewConn
                });
            }
        });

        cup.pour("should stop the server", function () {

            var server = getNewServer(this, {
                config: {
                    externalSession: true
                }
            });

            server.start();
            server.stop();
        }, {
            afters: function (next) {
                expect(this.spies.providerStop).to.have.been.calledOnce();
                expect(this.spies.connStop).to.have.been.calledOnce();

                next();
            }
        });

        cup.pour("shouldnt stop if not started", function(){
            var server = getNewServer(this);
            server.stop();
        }, {
            afters:function(next){
                expect(this.spies.providerStop).to.not.have.been.called();
                expect(this.spies.connStop).to.not.have.been.called();
                next();
            }
        });

        cup.pour("should stop only once", function () {

            var server = getNewServer(this, {
                config: {
                    externalSession: true
                }
            });

            server.start();
            server.stop();
            server.stop();
        }, {
            afters: function (next) {
                expect(this.spies.providerStop).to.have.been.calledOnce();
                expect(this.spies.connStop).to.have.been.calledOnce();

                next();
            }
        });
    });
});