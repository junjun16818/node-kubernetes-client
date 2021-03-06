// add header strictSSL: false
// modified by huangqg

var errors  = require('./errors');

var request = require('request');

require('sugar');

var url     = require('url'),
    util    = require('util'),
    path    = require('path');

module.exports = function (info) {
    var protocol = info.protocol || 'https', 
    host = info.host,
    version = info.version, 
    token = info.token,
    timeout = info.timeout,
    namespace = info.namespace;
    
    var getUrl = function (object) {
        var prefix = 'api';
        
        if (object.options && object.options.apiPrefix){
          prefix = object.options.apiPrefix;
        }
        
        // v1beta3 and greater moves to lowercase endpoints, no longer camel case. Also intros namespacing in the URL
        if ((version === 'v1beta3' || version === 'v1')){
          object.endpoint = object.endpoint.toLowerCase();
          if (namespace && !object.endpoint.match(/^namespace/)){
            return protocol + '://' + host + '/' + path.join(prefix, version, 'namespaces', namespace, object.endpoint);
          }
        }
        
        return protocol + '://' + host + '/' + path.join(prefix, version, object.endpoint);
        
    };

    var getAuthUrl = function (callback) {
        request({
            url: getUrl({ endpoint: 'info' }),
            json: true,
            strictSSL: false
        }, function (err, resp, body) {
            if (err) {
                return callback(err);
            }

            if (resp.statusCode !== 200) {
                return callback(resp.statusCode, body);
            }

            callback(null, body.authorization_endpoint + '/oauth/token');
        });
    };
    var isSuccess = function (code) {
        return (code - (code % 200)) === 200;
    };

    var makeRequest = function (object, callback) {
        object = Object.clone(object);
        object.url = getUrl(object);
        delete object.endpoint;
        object.json = object.json || true;
        object.timeout = timeout;
        if (object.json) {
            if ([ 'object', 'boolean' ].none(typeof object.json)) {
                object.body = object.json;
                object.json = undefined;
            }
        }
        if (object.page) {
            if (! object.qs) {
                object.qs = {};
            }

            object.qs.page = object.page;
            delete object.page;
        }
        //@important! add by huangqg
        //skip-ssl
        object.strictSSL = false;
        
        return request(object, function (err, resp, body) {
            if (err) {
                return callback(err);
            }

            if (isSuccess(resp.statusCode)) {
                return callback(null, body);
            }

            return callback(errors.get(resp));
        });
    };

    return function (object, callback) {
        if (token) {
            object.headers = {
                Authorization: 'bearer ' + token
            };
        }
        if (namespace && version.match(/v1beta(1|2)/)){
          object.qs = object.qs || {};
          object.qs.namespace = namespace;
        }
        return makeRequest(object, callback);
    };
};
