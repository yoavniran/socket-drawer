require("../src/index"); //set the baseline for coverage
//******************************************

require("mocha-stirrer").RequireMocker.addGlobalDontMock(["debug", "async", "lodash", "events", "util"]);

//******************************************
require("./utils.test");

require("./providerFactory.test");

require("./tokenizer.test");
require("./SocketSession.test");
require("./SessionManager.test");

require("./requestParser.test");
require("./RequestMapper.test");

require("./broadcaster.test");
require("./serverHelperFunctions.test");
require("./SocketServer.test");