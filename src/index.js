var Server = require("./server/SocketsServer");
var tokenizer = require("./session/tokenizer");
var consts = require("./common/consts");

var api =(function(){
    "use strict";

    return  {
        SocketsServer: Server,
        tokenizer: tokenizer,

        IMPLEMENTATIONS: consts.IMPLEMENTATIONS
    };
})();

module.exports = api;
