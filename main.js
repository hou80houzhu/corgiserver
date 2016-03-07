var actions = {
    getProcessInfo: function () {
        return {
            type: "getProcessInfo",
            data: {
                version: process.version,
                pid: process.pid,
                title: process.title,
                arch: process.arch,
                memory: process.memoryUsage(),
                platform: process.platform
            }
        };
    }
};
process.on("message", function (data) {
    if (data && data.type && actions[data.type]) {
        var a = null;
        try {
            a = actions[data.type]();
        } catch (e) {
            a = {
                type: "error",
                data: e.stack
            };
        }
        process.send(a);
    } else {
        process.send("");
    }
});
var server = require("./lib/server");
server.run();