var chai = require("chai"),
    expect = chai.expect,
    dirtyChai = require("dirty-chai"),
    sinonChai = require("sinon-chai"),
    stirrer = require("mocha-stirrer");

describe("SocketIO Connection tests", function () {
    "use strict";

    chai.use(sinonChai);
    chai.use(dirtyChai);

    function getNewConn(cup, options) {

        var Connection = cup.getRequired("connection");
        return new Connection(cup.pars.conn, options);
    }

    var cup = stirrer.grind({
        requires: [{path: "../../src/providers/socketio/Connection", options: {alias: "connection"}}],
        pars: {
            connId: "1234-abc123",
            dataEventName: "blabla"
        },
        spies: {
            connSend: stirrer.EMPTY,
            connOn: stirrer.EMPTY,
            connOnClose: stirrer.EMPTY
        },
        before: function () {

            this.pars.conn = {
                id: this.pars.connId,
                send: this.spies.connSend,
                onclose: this.spies.connOnClose,
                on: this.spies.connOn,
                OPEN: "open",
                conn: {readyState: "open"}
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
            expect(this.pars.conn.send).to.have.been.calledWith("hello");
            next();
        }
    });

    cup.pour("on data should register handler", function () {
        var conn = getNewConn(this, {dataEventName: this.pars.dataEventName});

        var retConn = conn.onData("data");
        expect(retConn).to.equal(conn);
    }, {
        afters: function (next) {
            expect(this.spies.connOn).to.have.been.calledWith(this.pars.dataEventName, "data");
            next();
        }
    });

    cup.pour("stop should use conn terminate", function () {
        var conn = getNewConn(this);

        var retConn = conn.stop();
        expect(retConn).to.equal(conn);
    }, {
        afters: function (next) {
            expect(this.pars.conn.onclose).to.have.been.called();
            next();
        }
    });

    cup.pour("on close should register handler", function () {
        var conn = getNewConn(this);

        var retConn = conn.onClose("close");

        expect(retConn).to.equal(conn);
    }, {
        afters: function (next) {
            expect(this.spies.connOn).to.have.been.calledWith("disconnect", "close");
            next();
        }
    });

    cup.pour("isWritable shuold return status from conn", function () {
        var conn = getNewConn(this);

        expect(conn.isWritable()).to.be.true();
    });
});