var consts = require("../common/consts");

var serverHelperFunction = (function () {
    "use strict";

    function getFunctions(server, connId, data) {

        var contextData = {
            connId: connId,
            data: data,
            clientId: (data && data.metadata && data.metadata.clientRequestId) ? data.metadata.clientRequestId : undefined
        };

        return {
            publish: _publish.bind(null, server, contextData),
            attachSession: _attachSession.bind(null, server, contextData),
            get: _get.bind(null, server)
        };
    }

    /**
     * publish data to the connection that the request came on
     */
    function _publish(server, contextData,  publishData, isError, resource) {
        resource = resource || contextData.data.resource;  //replying on the same resource as in the request
        server.publishToConnection(contextData.connId, resource, publishData, isError, contextData.clientId);
    }

    /**
     * makes it possible to attach an existing session (registered by a session manager) to a WS connection
     * the session to attach is found using key/value, the session that has a match for this pair will be selected for attaching
     * In case the session is already attached to a connection the process will fail with an error
     * this will cancel the processing of the request
     *
     * returns the attached session
     */
    function _attachSession(server, contextData, key, val) {

        var sessionManager = server.get(consts.SERVER_KEYS.SESSION_MANAGER_KEY);
        var connIdKey = server.get(consts.SERVER_KEYS.CONNECTION_ID_KEY);
        var session = sessionManager.find(key, val);

        if (session) {

            var sessionConnId = session.get(connIdKey);

            if (!sessionConnId || sessionConnId === contextData.connId) {
                session.set(connIdKey, contextData.connId); //match a previously created session with the sockets connection
            }
            else {
                throw new Error("SocketsServer - attachSession - cant attach session, its already attached to different connection");
            }
        }
        else {
            throw new Error("SocketsServer - attachSession - couldnt find session object for key=" + key + ", val=" + val);
        }

        return session;
    }

    /**
     * get a value stored using the passed key from the server instance's properties
     */
    function _get(server, key) {
        return server.get(key);
    }

    return {
        getFunctions: getFunctions
    };
})();

module.exports = serverHelperFunction;