var crypto = require("crypto"),
    debug = require("debug")("sdrawer:tokenizer"),
    async = require("async"),
    utils = require("../common/utils");

var token = (function () {
    "use strict";

    function generate(length, secret, callback) {

        if (!length || isNaN(length)){
            throw new TypeError("tokenizer - length must be a number");
        }

        if (arguments.length === 2) {
            callback = secret;
            secret = null;
        }

        async.parallel([
                _createSecret.bind(null, length, secret),
                _createSalt.bind(null, length)
            ],
            function (err, results) {
                var data;

                if (!err) {
                    debug("finished generating token successfully");

                    var secret = results[0];
                    var salt = results[1];

                    var token = _createToken(secret, salt);

                    data = {
                        token: token,
                        secret: secret
                    };
                }

                callback(err, data);
            });
    }

    function validate(secret, token, length) {

        var actualSaltLength = utils.getCryptoSaltLength(length);  //get the actual length of the salt calculated from the length requested

        var salt = token.substr(0, actualSaltLength); //the plain salt is the first part of the token

        return (token === _createToken(secret, salt));
    }

    function _createToken(secret, salt) {

        var hash = crypto.createHash("sha256").update(secret + salt);

        var token = (salt + hash.digest("base64"));

        return token;
    }

    function _createSecret(length, secret, done) {

        function finish(err, buffer) {

            var secret = (err ? void 0 : buffer.toString("base64"));
            done(err, secret);
        }

        if (secret) {
            finish(null, new Buffer(secret));   //secret provided, no need to create one
        }
        else {
            debug("_createSecret: about to create secret with random bytes");
            crypto.randomBytes(length, function (err, buffer) {

                if (err) {
                    debug("_createSecret: random bytes #1 failed - will try again");
                    setImmediate(function () { //give another try - perhaps now we got enough entropy
                        crypto.randomBytes(length, function (err, buffer2) {
                            finish(err, buffer2);
                        });
                    });
                }
                else {
                    finish(err, buffer);
                }
            });
        }
    }

    function _createSalt(length, done) {

        crypto.pseudoRandomBytes(length, function (err, buffer) {
            var salt = err ? void 0 : buffer.toString("base64");
            done(err, salt);
        });
    }

    return {
        generate: generate,
        validate: validate
    };
})();

module.exports = token;
