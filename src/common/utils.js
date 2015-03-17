"use strict";

var _ = require("lodash");

exports.assignPars = function(obj, key, val){

    if (_.isObject(key) && !_.isArray(key)) {
        _.each(key, function (v, k) {
            obj[k] = v;
        });
    }
    else {
        obj[key] = val;
    }
};

exports.dynamicLoad = function(modulePath){

    return require(modulePath);
};