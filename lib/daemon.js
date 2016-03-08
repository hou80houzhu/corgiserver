require("./bright");
var fs = require("fs");
var ipc = require("./util/ipc");
var ipconfig = require("../conf/server.json").ipc;
var logconfig = require("../conf/server.json").log;
var worker = null;
var isrestart = true;
var _data = null;

var startServer = function () {
    var t = logconfig.server;
    var p = bright.path(__dirname).parent().getPath();
    if (!logconfig.server) {
        t = p + "log/server.log";
    } else {
        if (logconfig.server[0] !== "/" && logconfig.server.indexOf(":") === -1) {
            t = p + logconfig.server;
        }
    }
    bright.file(t).make("");
    var p = bright.path(__dirname).parent().getPath();
    worker = require('child_process').spawn('node', [p + 'main.js'], {
        detached: true,
        stdio: ['ipc', fs.openSync(t, 'a'), fs.openSync(t, 'a')]
    });
    worker.on("message", function (info) {
        _data = info;
    });
    worker.on('error', function (code, signal) {
    });
    worker.on('exit', function (code, signal) {
        if (isrestart) {
            console.log("[corgiserver] restart server automatic");
            startServer();
            isrestart = true;
        }
    });
};
var actions = {
    stopService: function () {
        isrestart = false;
        if (worker) {
            worker.kill();
        }
        worker = null;
    },
    startserver: function () {
        if (!worker) {
            isrestart = true;
            startServer();
        }
    },
    restartserver: function (data) {
        actions.stopService();
        startServer();
    },
    stopserver: function (data) {
        actions.stopService();
    },
    check: function () {
        return "ok";
    },
    stopprocess: function () {
        return "stop";
    },
    getserverinfo: function () {
        if (!_data) {
            if (worker) {
                worker.send({
                    type: "getProcessInfo"
                });
                return "goon";
            } else {
                return "noservice";
            }
        } else {
            var a = _data;
            _data = null;
            return a;
        }
    },
    daemonid: function () {
        return process.pid;
    }
};
ipc(ipconfig).on('data', function (data, conn, server) {
    var type = data.type, _data = data.data, code = "";
    if (actions[type]) {
        try {
            code = actions[type](_data);
        } catch (e) {
            console.log(e.stack);
            code = "error";
        }
    } else {
        code = "nofind";
    }
    if (code === "stop") {
        conn.write({
            type: "stopprocess",
            code: "stopped"
        });
        conn.end();
        conn.unref();
        actions.stopService();
        setTimeout(function () {
            process.exit(0);
        }, 0);
    } else {
        conn.write({
            type: type,
            code: code
        });
    }
}).on("error", function (e) {
    console.log(e.stack);
}).listen();
process.on("exit", function () {
    actions.stopService();
});
process.on("uncaughtException", function (e) {
    console.log("<<----");
    console.log(e.stack);
});
startServer();