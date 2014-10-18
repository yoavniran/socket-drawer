"use strict";

var server = require("./SocketsServer");
var tokenizer = require("./session/tokenizer");

server.tokenizer = tokenizer;

module.exports = server;
