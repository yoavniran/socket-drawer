var _ = require("lodash"),
    debug = require("debug")("sdrawer:RequestMapper"),
    pathToRegex = require("path-to-regexp"),
    METHODS = require("../common/consts").HTTP_METHODS;

var METHOD_IN_TYPE_RGX = /^<(\w+)>\X*/;

var RequestMapper = (function () {

    function RequestMapper() {
        this._map = {};
    }

    /**
     *
     * @param handler
     *          can be either an object with a map object or map function
     *          or the map object itself
     *          see the addMapping documentation for more details
     */
    RequestMapper.prototype.addHandler = function (handler) {

        var map = _.isFunction(handler) ? handler : handler.map;

        this.addMapping(map); //map is a function returning request mappings or the mapping object
    };

    /**
     *
     * @param mapping
     *      can be either a mapping object or function that returns a mapping object
     *      mapping object is a key/val object.
     *      in each pair,  the key is the path of the request to map with an optional method.
     *      where method is one of: GET, POST, DELETE, PUT
     *      the syntax for the path is:  "<[method]>[path]"
     *      path is a string, pattern or regex. see https://www.npmjs.com/package/path-to-regexp for the options
     *      that can be used as paths in more detail
     *      if a method isnt provided GET is added by default
     *      the value of the object is a function that will be called for a matching request
     */
    RequestMapper.prototype.addMapping = function (mapping) {

        mapping = _.isFunction(mapping) ? mapping() : mapping;

        _.each(mapping, function (val, key) {
            _addMapping.call(this, key, val);
        }, this);
    };

    /**
     * returns the stored handler mapping configuration for the given key.
     *   the syntax for the key is:  "<[method]>[path]"
     * @param key
     * @returns {*}
     */
    RequestMapper.prototype.getHandlerConfig = function (key) {
        return this._map[key];
    };

    RequestMapper.prototype.getRequestHandler = function (data) {
        return _getHandlerFromData.call(this, data);
    };

    function _getHandlerFromData(data) {

        var res = data.resource;
        var handler;

        if (res) {

            var path = _getPathWithMethod(res, data.method);

            var requestMapping = _findMappingForResource.call(this, path);

            if (requestMapping) {
                debug("found matching for handler for path: " + path);
                handler = _getRequestHandler.call(this, requestMapping, path);
            }
        }

        return handler;
    }

    function _getRequestHandler(requestMapping, path) {

        var keys = _parseRequestKeys(path, requestMapping);

        return {
            handler: requestMapping.handler,
            path: path,
            keys: keys
        };
    }

    function _parseRequestKeys(res, mapping) {

        var keys = {};

        if (mapping.pathKeys && mapping.pathKeys.length > 0) {

            var match = mapping.regex.exec(res);

            _.each(mapping.pathKeys, function (val, index) {

                if ((index + 1) <= match.length) {
                    keys[val.name] = match[index + 1];
                }
            });
        }

        return keys;
    }

    function _findMappingForResource(path) {

        var requestMapping = this._map[path]; //look for immediate match

        if (!requestMapping) { //no immediate, try each one based on the registered regex

            debug("didnt find immediate match for path: " + path);

            requestMapping = _.find(this._map, function (val) {
                return val.regex.test(path);
            });
        }

        return requestMapping;
    }

    function _addMapping(rType, rHandler) {

        var methodInPath = _getMethodFromPath(rType);
        var method = methodInPath || METHODS.GET;

        if (!_.isFunction(rHandler)) { //got an object

            method = rHandler.method || method;
            rHandler = rHandler.handler;

            if (!_.isFunction(rHandler)) {
                throw new TypeError("SD.RequestMapper - Sockets request mapping requires handler to be a function");
            }
        }

        var keys = [];
        var path = (methodInPath ? rType : _getPathWithMethod(rType, method));

        var rgx = pathToRegex(path, keys);

        this._map[path] = {
            handler: rHandler,
            regex: rgx,
            pathKeys: keys
        };
    }

    function _getMethodFromPath(path) {

        var method,
            matches = METHOD_IN_TYPE_RGX.exec(path);

        if (matches && matches.length > 1) {
            method = matches[1];
        }

        return method;
    }

    function _getPathWithMethod(path, method) {
        return "<" + method + ">" + path;
    }

    return RequestMapper;
})();

module.exports = RequestMapper;