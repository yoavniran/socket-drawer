module.exports = {

    SERVER_KEYS : {
        SESSION_MANAGER_KEY: "session-manager",
        BROADCASTER_KEY: "broadcaster",
        REQUEST_MAPPER_KEY: "request-mapper",
        REQUEST_PARSER_KEY: "request-parser",
        CONNECTION_ID_KEY: "session-identifier-key"
    },

    "IMPLEMENTATIONS": {
        "WS": "ws",
        "SOCK_JS": "sockjs",
        "SOCKET_IO": "socketio"
    },

    "HTTP_METHODS": {
        "GET": "GET",
        "POST": "POST",
        "PUT": "PUT",
        "DELETE": "DELETE"
    }
};