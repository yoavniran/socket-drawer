var chai = require("chai"),
    expect = chai.expect,
    dirtyChai = require("dirty-chai"),
    sinonChai = require("sinon-chai"),
    stirrer = require("mocha-stirrer"),
    broadcaster = require("../src/server/broadcaster");

describe("broadcaster tests", function () {
    "use strict";

    chai.use(sinonChai);
    chai.use(dirtyChai);

    var cup = stirrer.grind({
        restirForEach: true,
        pars: {
            msg: '{"test":"foo"}',
            emptyMsg: '{}'
        },
        stubs: {
            isWritable: stirrer.EMPTY,
            send: stirrer.EMPTY
        },
        beforeEach: function () {
            this.stubs.isWritable.returns(true);
            this.pars.conn = {
                isWritable: this.stubs.isWritable,
                send: this.stubs.send
            };

            this.pars.conn2 = {
                isWritable: this.stubs.isWritable,
                send: this.stubs.send
            };
        }
    });

    cup.pour("should publish to connection", function () {

        broadcaster.publishToConnection({test: "foo"}, this.pars.conn);
    }, {
        afters: function (next) {
            expect(this.stubs.isWritable).to.have.been.called();
            expect(this.stubs.send).to.have.been.calledWith(this.pars.msg);
            next();
        }
    });

    cup.pour("should broadcast to multiple connections", function () {
              broadcaster.broadcast([
                  this.pars.conn,
                  this.pars.conn2
              ],{test: "foo"} );
    }, {
        afters: function(next){
            expect(this.stubs.send).to.have.been.calledTwice();
            expect(this.stubs.send).to.always.have.been.calledWith(this.pars.msg);
            next();
        }
    });

    cup.pour("should broadcast to multiple connections with empty object", function () {
        broadcaster.broadcast([
            this.pars.conn,
            this.pars.conn2
        ],{} );
    }, {
        afters: function(next){
            expect(this.stubs.send).to.have.been.calledTwice();
            expect(this.stubs.send).to.always.have.been.calledWith(this.pars.emptyMsg);
            next();
        }
    });

    cup.pour("broadcast should not break on empty array of connections", function () {
        broadcaster.broadcast([], {test: "foo"});
    }, {
        afters: function (next) {
            expect(this.stubs.send).to.not.have.been.called();
            next();
        }
    });

    cup.pour("broadcast should not break on undefined array of connections", function () {
        broadcaster.broadcast(undefined, {test: "foo"});
    }, {
        afters: function (next) {
            expect(this.stubs.send).to.not.have.been.called();
            next();
        }
    });

    cup.pour("should not broadcast if undefined msg", function(){
               broadcaster.broadcast([  this.pars.conn,
                   this.pars.conn2],undefined );
    },{
        afters: function (next) {
            expect(this.stubs.send).to.not.have.been.called();
            next();
        }
    });
});