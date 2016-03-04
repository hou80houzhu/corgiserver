#!/usr/bin/env node  
require("../lib/bright");
var fs = require("fs");
var server = require("../lib/server");
var version = "0.0.14";

var commander = function () {
    this._commands = {};
};
commander.blank = function (t) {
    var m = "";
    for (var i = 0; i < t; i++) {
        m += " ";
    }
    return m;
};
commander.prototype.bind = function (command, desc, paras, fn) {
    this._commands[command] = {
        name: command,
        desc: desc,
        fn: fn,
        paras: paras
    };
    return this;
};
commander.prototype.call = function (parameter) {
    var command = parameter[0];
    parameter.splice(0, 1);
    if (this._commands[command]) {
        this._commands[command].fn.apply(this, parameter);
    } else {
        this.showDesc();
    }
};
commander.prototype.showDesc = function () {
    console.log("Useage:");
    var leg = 0;
    for (var i in this._commands) {
        var info = this._commands[i];
        if (info.name.length > leg) {
            leg = info.name.length;
        }
    }
    leg = leg + 6;
    for (var i in this._commands) {
        var info = this._commands[i], t = [];
        if (info.paras) {
            console.log("   " + info.name + (info.paras ? ":" + info.paras : ""));
            console.log("   " + commander.blank(leg) + info.desc);
        } else {
            console.log("   " + info.name + commander.blank(leg - info.name.length) + info.desc);
        }
    }
};

var installProjects = function (projectName, localFolder, zipPath, fn) {
    console.log("[corgiserver] download the zip file <" + zipPath + ">");
    var zip = require("zip"), request = require('request'), path = "";
    localFolder = (localFolder + "/").replace(/[\/]+/g, "/");
    bright.file(localFolder + "/_cache_.zip").write("").done(function () {
        var ws = fs.createWriteStream(localFolder + '/_cache_.zip');
        request(zipPath).on('response', function (response) {
            var total = response.headers['content-length'], nowis = 0;
            response.on('data', function (data) {
                nowis += data.length;
                var persent = Math.round((nowis / total) * 100);
                process.stdout.clearLine();
                process.stdout.cursorTo(0);
                process.stdout.write('Loading... ' + persent + '%');
                if (persent === 100) {
                    process.stdout.write("\n");
                }
            });
        }).on('error', function (err) {
            console.log("[corgiserver] download zip file error");
        }).pipe(ws);
        ws.on('finish', function () {
            console.log("[corgiserver] zip download success.Now release the files...");
            var data = fs.readFileSync(localFolder + '/_cache_.zip');
            var files = [];
            zip.Reader(data).forEach(function (entry) {
                if (entry.isFile()) {
                    if (entry.getName().indexOf("package.json") !== -1 && path === "") {
                        path = localFolder + entry.getName();
                    }
                    files.push({
                        path: localFolder + entry.getName(),
                        data: entry.getData()
                    });
                }
            });
            bright.file(localFolder + '/_cache_.zip').remove();
            if (path !== "") {
                var qe = bright.queue();
                qe.progress(function (a) {
                    var persent = (a.runed / a.total) * 100;
                    process.stdout.clearLine();
                    process.stdout.cursorTo(0);
                    process.stdout.write('Release... ' + Math.round(persent) + '%');
                    if (persent === 100) {
                        process.stdout.write("\n");
                    }
                });
                qe.complete(function () {
                    console.log("[corgiserver] release ok,install the project...");
                    var q = path.split("/");
                    q.splice(q.length - 1, 1);
                    q = q.join("/");
                    var options = {
                        encoding: 'utf8',
                        timeout: 0,
                        maxBuffer: 200 * 1024,
                        killSignal: 'SIGTERM',
                        setsid: false,
                        cwd: q,
                        env: null
                    };
                    var cp = require('child_process');
                    cp.exec('npm install', options, function (e, stdout, stderr) {
                        console.log("[corgiserver] install the project end.");
                        fn && fn(q);
                    });
                });
                files.forEach(function (a) {
                    qe.add(function () {
                        var ths = this;
                        bright.file(a.path).write(a.data).done(function () {
                            ths.next();
                        });
                    });
                });
                qe.run();
            } else {
                console.log("[corgiserver] the zip file is not a corgiserver project.");
            }
        });
    });
};


new commander().bind("v", "show version", null, function () {
    console.log('version is ' + server.version());
}).bind("version", "show version", null, function () {
    console.log('version is ' + server.version());
}).bind("h", "help", null, function () {
    this.showDesc();
}).bind("help", "help", null, function () {
    this.showDesc();
}).bind("s", "start server", null, function () {
    server.run();
}).bind("start", "start server", null, function () {
    server.run();
}).bind("stop", "stop server", null, function () {
    server.stop();
}).bind("c", "create project with a projectName and its local file path", "<projectName>,<projectPath>", function (projectName, projectPath) {
    if (projectName && projectPath) {
        server.create(projectName, projectPath);
    } else {
        console.log("parameter error.first parameter is project name,the other is project path");
    }
}).bind("create", "create project with a projectName and its local file path", "<projectName>,<projectPath>", function (projectName, projectPath) {
    if (projectName && projectPath) {
        server.create(projectName, projectPath);
    } else {
        console.log("parameter error.first parameter is project name,the other is project path");
    }
}).bind("r", "remove porject with projectName", "<projectName>", function (projectName) {
    if (projectName) {
        server.remove(projectName);
    } else {
        console.log("[corgiserver] you must input a projectName");
    }
}).bind("remove", "remove porject with projectName", "<projectName>", function (projectName) {
    if (projectName) {
        server.remove(projectName);
    } else {
        console.log("[corgiserver] you must input a projectName");
    }
}).bind("restart", "restart server", null, function () {
    server.restart();
}).bind("ls", "list all the projects", null, function () {
    server.scan().done(function (data) {
        console.log("[corgiserver] project list:");
        data.forEach(function (a) {
            console.log("    <" + a + ">");
        });
    });
}).bind("scan", "list all the projects", null, function () {
    server.scan().done(function (data) {
        console.log("[corgiserver] project list:");
        data.forEach(function (a) {
            console.log("    <" + a + ">");
        });
    });
}).bind("sport", "set current port of corgiserver", "<port>", function () {
    var port = arguments[0];
    if (port) {
        server.setPort(port).done(function () {
            console.log("[corgiserver] server port is edited with " + port);
        });
    } else {
        console.log("[corgiserver] you must input a port");
    }
}).bind("ssessiontimeout", "set current session timeout of corgiserver", "<time>", function () {
    var time = arguments[0];
    if (time) {
        server.setSessionTimeout(time).done(function () {
            console.log("[corgiserver] server session timeout is edited with " + time);
        });
    } else {
        console.log("[corgiserver] you must input session timeout time");
    }
}).bind("state", "show corgiserver state", null, function () {
    console.log("[corgiserver] server state:");
    server.getServerState().done(function (data) {
        var t = 0;
        for (var i in data) {
            if (i.length > t) {
                t = i.length;
            }
        }
        t = t + 6;
        for (var i in data) {
            console.log("    " + i + commander.blank(t - i.length) + data[i]);
        }
    });
}).bind("encache", "enable to cache csp", null, function () {
    server.enableCspCache().done(function () {
        console.log("[corgiserver] enableed csp cache.");
    });
}).bind("discache", "disable to cache csp", null, function () {
    server.disableCspCache().done(function () {
        console.log("[corgiserver] disabled csp cache.");
    });
}).bind("remoteProjects", "list all remote projects", null, function () {
    server.getRemoteProjects().done(function (a) {
        a.forEach(function (b) {
            console.log("      <" + b.name + ">" + "   <" + b.path + ">   <" + b.remotePath + ">");
        });
    });
}).bind("install", "install a website form a zip file", "<projectName>,<localFolder>,<zipPath>", function (projectName, localFolder, zipPath) {
    installProjects(projectName, localFolder, zipPath, function (q) {
        server.create(projectName, q, zipPath);
    });
}).bind("update", "update all projects which has a romote path.", "[<projectName>]", function (projectname) {
    server.getRemoteProjects().done(function (p) {
        console.log("[corgiserver] now update projects");
        var q = [];
        if (projectname) {
            for (var i in p) {
                if (p[i].name === projectname) {
                    q.push(p[i]);
                }
            }
        } else {
            q = p;
        }
        console.log("");
        for (var i in q) {
            console.log("    <" + q[i].name + ">");
        }
        var qe = bright.queue();
        qe.complete(function () {
            console.log("");
            console.log("[corgiserver] update all projects success.now you can restart the server.");
        });
        q.forEach(function (a) {
            qe.add(function () {
                console.log("");
                console.log("[corgiserver] now update project <" + a.name + ">");
                installProjects(a.name, a.path, a.remotePath, function () {
                    console.log("[corgiserver] project <" + a.name + "> updated.");
                    this.next();
                }.bind(this));
            });
        });
        qe.run();
    });
}).bind("updateremotepath", "update a project remote path.", "<projectName>,<zipPath>", function (projectName, zipPath) {
    if (projectName && zipPath) {
        server.editProjectRemotePath(projectName, zipPath);
    } else {
        console.log("[corgiserver] projectName,zipPath can not empty.");
    }
}).call(process.argv.slice(2));