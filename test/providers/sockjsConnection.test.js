var chai = require("chai"),
    expect = chai.expect,
    dirtyChai = require("dirty-chai"),
    sinonChai = require("sinon-chai"),
    stirrer = require("mocha-stirrer");

describe("SockJS Connection tests", function () {
    "use strict";

    chai.use(sinonChai);
    chai.use(dirtyChai);

    function getNewConn(cup, options) {

        var Connection = cup.getRequired("connection");
        return new Connection(cup.pars.conn, options);
    }

    var cup = stirrer.grind({
        requires: [{path: "../../src/providers/sockjs/Connection", options: {alias: "connection"}}],
        pars: {
            connId: "1234-abcde"
        },
        spies: {
            connSend: stirrer.EMPTY,
            connOn: stirrer.EMPTY,
            connTerminate: stirrer.EMPTY
        },
        before: function () {

            this.pars.conn = {
                id: this.pars.connId,
                on: this.spies.connOn,
                emit: this.spies.connSend,
                close: this.spies.connTerminate,
                OPEN: 1,
                writable: true,
                readyState: 1
            };
        }
    });

    cup.pour("should initialize with uuid", function () {

        var conn = getNewConn(this);

        conn.initialize();

        expect(conn.getId()).to.equal(this.pars.connId);
    });

    cup.pour("send should use conn send", function () {
        var conn = getNewConn(this);

        var retConn = conn.send("hello");
        expect(retConn).to.equal(conn);
    }, {
        afters: function (next) {
            expect(this.pars.conn.emit).to.have.been.calledWith("data","hello");
            next();
        }
    });

    cup.pour("on data should register handler", function () {
        var conn = getNewConn(this);

        var retConn = conn.onData("data");
        expect(retConn).to.equal(conn);
    }, {
        afters: function (next) {
            expect(this.spies.connOn).to.have.been.calledWith("data", "data");
            next();
        }
    });

    cup.pour("stop should use conn terminate", function () {
        var conn = getNewConn(this);

        var retConn = conn.stop();
        expect(retConn).to.equal(conn);
    }, {
        afters: function (next) {
            expect(this.pars.conn.close).to.have.been.called();
            next();
        }
    });

    cup.pour("on close should register handler", function () {
        var conn = getNewConn(this);

        var retConn = conn.onClose("close");

        expect(retConn).to.equal(conn);
    }, {
        afters: function (next) {
            expect(this.spies.connOn).to.have.been.calledWith("close", "close");
            next();
        }
    });

    cup.pour("isWritable shuold return status from conn", function () {
        var conn = getNewConn(this);

        expect(conn.isWritable()).to.be.true();
    });

});