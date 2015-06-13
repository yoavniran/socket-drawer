var chai = require("chai"),
    expect = chai.expect,
    dirtyChai = require("dirty-chai"),
    sinonChai = require("sinon-chai"),
    stirrer = require("mocha-stirrer");


describe("WS Connection tests", function () {
    "use strict";

    chai.use(sinonChai);
    chai.use(dirtyChai);

    function getNewConn(cup, options) {

        var Connection = cup.getRequired("connection");
        var conn = new Connection(cup.pars.conn, options);

        return conn;
    }

    var cup = stirrer.grind({
        requires: [{path: "../../src/providers/ws/Connection", options: {alias: "connection"}}],
        pars: {
            uuid: "1234-abc"
        },
        spies: {
            connSend: stirrer.EMPTY,
            connTerminate: stirrer.EMPTY
        },
        before: function () {
            this.getStub("node-uuid").returns(this.pars.uuid);

            this.pars.conn = {
                send: this.spies.connSend,
                terminate: this.spies.connTerminate,
                OPEN: 1,
                readyState: 1
            };
        }
    });

    cup.pour("should initialize with uuid", function () {

        var conn = getNewConn(this);

        conn.initialize();

        expect(conn.getId()).to.equal(this.pars.uuid);
    }, {
        afters: function (next) {

            expect(this.getStub("node-uuid")).to.have.been.called();
            next();
        }
    });

    cup.pour("send should use conn send", function () {
        var conn = getNewConn(this);

        var retConn = conn.send("hello");
        expect(retConn).to.equal(conn);
    }, {
        afters: function (next) {
            expect(this.pars.conn.send).to.have.been.calledWith("hello");
            next();
        }
    });

    cup.pour("send should use conn send", function () {
        var conn = getNewConn(this);

        var retConn = conn.onData("foo");
        expect(retConn).to.equal(conn);
    }, {
        afters: function (next) {
            expect(this.pars.conn.onmessage).to.equal("foo");
            next();
        }
    });

    cup.pour("stop should use conn terminate", function () {
        var conn = getNewConn(this);

        var retConn = conn.stop();
        expect(retConn).to.equal(conn);
    }, {
        afters: function (next) {
            expect(this.pars.conn.terminate).to.have.been.called();
            next();
        }
    });

    cup.pour("send should use conn send", function () {
        var conn = getNewConn(this);

        var retConn = conn.onClose("foo");

        expect(retConn).to.equal(conn);
    }, {
        afters: function (next) {
            expect(this.pars.conn.onclose).to.equal("foo");
            next();
        }
    });

    cup.pour("send should use conn send", function () {
        var conn = getNewConn(this);

        expect(conn.isWritable()).to.be.true();
    });

});