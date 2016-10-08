var topolr = require("./topolr");
var formidable = require('formidable');
var http = require('http');
var util = require("util");
var project = require("./project");
var request = require("./base/request");
var response = require("./base/response");
var fs = require("fs");
var Path = require("path");

var cspContainer = function () {
    this._data = {};
};
cspContainer.prototype.getCspContent = function (path) {
    if (global.CorgiServer.getWebConfig().cspCache) {
        if (!this._data[path]) {
            var r = null;
            try {
                r = fs.readFileSync(path, 'utf-8');
                this._data[path] = r;
            } catch (e) {
                console.error(e.stack);
            }
            return r;
        } else {
            return this._data[path];
        }
    } else {
        var r = null;
        try {
            r = fs.readFileSync(path, 'utf-8');
            this._data[path] = r;
        } catch (e) {
            console.error(e.stack);
        }
        return r;
    }
};

var corgi = function () {
    this.serverConfig = require("../conf/server");
    this.webConfig = require("../conf/web");
    this.packageConfig = require("../package");
    this.basePath = topolr.path(__dirname).parent().path();
    this.version = this.packageConfig.version;
    this.configPath = this.basePath + "conf" + Path.sep;
    this.projects = {};
};
corgi.prototype.startup = function () {
    this.getModulesCode().scope(this).then(function (code) {
        this.initCspContainer();
        return this.initProjects(code);
    }).done(function () {
        this.initServer();
    });
};
corgi.prototype.stop = function () {
    var queue = topolr.queue();
    queue.complete(function () {
        console.log("[corgiserver] server is stopped.");
    });
    queue.progress(function (a) {
        console.log("[corgiserver] project <" + a.data + "> stopped");
    });
    for (var i in this.projects) {
        queue.add(function (a, b) {
            b.stop(function () {
                this.next(a);
            }.bind(this));
        }, function (a, e, b) {
            console.error(e);
            this.next();
        }, this.projects[i]);
    }
};
corgi.prototype.initProjects = function (code) {
    var projectpath = this.basePath + "webapps", ths = this, queue = topolr.queue(), ps = topolr.promise();
    queue.complete(function () {
        ps.resolve();
    });
    queue.progress(function (a) {
        console.log("[corgiserver] project <" + a.data + "> started");
    });
    topolr.file(projectpath).subscan(function (path, isfile) {
        if (isfile && topolr.path(path, false).suffixWidth("json")) {
            queue.add(function (a, b) {
                var tss = this;
                topolr.file(b.path).read().done(function (data) {
                    var n = JSON.parse(data);
                    var t = project(n.path, n.name, true);
                    b.server.projects[n.name] = t;
                    t.run(b.code, function () {
                        tss.next(n.name);
                    });
                });
            }, function (a, e, b) {
                console.error(e);
                console.log("[corgiserver] project of <" + b.name + "> init fail");
                this.next();
            }, {
                path: path,
                code: code,
                server: ths
            });
        } else {
            queue.add(function (a, b) {
                var t = project(b.path, b.name, false);
                b.server.projects[b.name] = t;
                t.run(b.code, function () {
                    this.next(b.name);
                }.bind(this));
            }, function (a, e, b) {
                console.error(e);
                console.log("[corgiserver] project of <" + b.name + "> init fail");
                this.next();
            }, {
                path: path,
                name: path.substring(projectpath.length + Path.sep.length, path.length - Path.sep.length),
                server: ths,
                code: code
            });
        }
    });
    queue.run();
    return ps;
};
corgi.prototype.initServer = function () {
    var ths = this;
    try {
        http.createServer(function (req, res) {
            if (req.method.toLowerCase() === "post") {
                ths.doPostRequest(req, res);
            } else {
                ths.doRequest(req, res);
            }
        }).listen(this.serverConfig.port);
        console.log("[corgiserver] server started,port:" + this.serverConfig.port);
    } catch (e) {
        console.error(e.stack);
    }
};
corgi.prototype.initCspContainer = function () {
    this.cspContainer = new cspContainer();
    topolr.setTemplateGlobalMacro("include", function (attrs, render) {
        var c = global.CorgiServer.getCspContent(this.basePath + attrs.path), t = "";
        if (!c) {
            c = "";
        }
        try {
            var temp = topolr.template(c);
            temp.basePath = this.basePath;
            temp.request = this.request;
            t = temp.fn(new Function("request", "session", "data", temp.code())).render(this.request, this.request.getSession(), attrs.data);
            for (var i in temp._caching) {
                this._caching[i] = temp._caching[i];
            }
        } catch (e) {
            console.error(e.stack);
        }
        return t;
    });
    topolr.setTemplateGlobalMacro("error", function (attr, render) {
        var a = "";
        try {
            var stack = attr.stack;
            stack.split("\n").forEach(function (p) {
                if (/[\s]+at[\s]+/.test(p)) {
                    var n = p.trim().split(" ");
                    a += "<div class='line'><span class='line-a'>at</span><span class='line-b'>" + (n[1] || "") + "</span><span class='line-c'>" + (n[2] || "") + "</span></div>";
                } else {
                    a += "<div class='linen'>" + p + "</div>";
                }
            });
        } catch (e) {
            console.error(e.stack);
        }
        return a;
    });
};
corgi.prototype.getModulesCode = function () {
    var ps = topolr.promise();
    var paths = this.serverConfig.modules, ths = this;
    if (!topolr.is.isArray(paths)) {
        paths = ["lib/base.js"];
    }
    if (paths.length > 0) {
        var qe = topolr.queue(), t = [];
        qe.complete(function () {
            ps.resolve(t);
        });
        paths.forEach(function (path) {
            qe.add(function (a, b) {
                var ths = this;
                topolr.file(b).read().done(function (a) {
                    t.push(a + "\n//# sourceURL=" + b);
                    ths.next();
                });
            }, null, ths.basePath + path);
        });
        qe.run();
    } else {
        ps.resolve();
    }
    return ps;
};
corgi.prototype.getRequestInfo = function (req, res) {
    var a = req.url.split("?");
    var b = a[0].split("/");
    var r = "ROOT", t = "";
    if (b.length >= 1) {
        if (this.projects.hasOwnProperty(b[1])) {
            r = b[1];
            if (b.length === 2) {
                t = "/";
            }
        }
    }
    var prj = this.projects[r];
    if (!prj) {
        prj = this.projects["ROOT"];
    }
    var resp = response(), reqt = request(req, {method: req.method.toLowerCase(), url: req.url + t, rawHeaders: req.rawHeaders});
    return {
        project: prj,
        request: reqt,
        response: resp
    };
};
corgi.prototype.doPostRequest = function (req, res) {
    var ths = this;
    var post = {}, file = {};
    var info = this.getRequestInfo(req, res);
    var uploadInfo = info.project.getConfig().getUploadInfo();
    var form = new formidable.IncomingForm();
    form.encoding = uploadInfo.encoding;
    form.uploadDir = uploadInfo.temp;
    form.maxFieldsSize = uploadInfo.max;
    form.on('error', function (err) {
        console.error(err.stack);
        ths.doResponse(info.project.error(err), info.request, info.response, res);
    }).on('field', function (field, value) {
        if (form.type === 'multipart') {
            if (field in post) {
                if (util.isArray(post[field]) === false) {
                    post[field] = [post[field]];
                }
                post[field].push(value);
                return;
            }
        }
        post[field] = value;
    }).on('file', function (field, _file) {
        file[field] = _file;
    }).on('end', function () {
        info.request._data = topolr.extend({}, topolr.serialize.queryObject(req.url), post, file);
        ths.triggerProject(info.project, info.request, info.response, res);
    });
    form.parse(req);
};
corgi.prototype.doRequest = function (req, res) {
    var info = this.getRequestInfo(req, res);
    info.request._data = topolr.serialize.queryObject(req.url);
    this.triggerProject(info.project, info.request, info.response, res);
};
corgi.prototype.triggerProject = function (prj, reqt, resp, res) {
    var ths = this;
    prj.trigger(reqt, resp).done(function (a) {
        ths.doResponse(a, reqt, resp, res);
    });
};
corgi.prototype.doResponse = function (view, reqt, resp, res) {
    var serverName = "corgiserver " + this.version;
    view.doRender(function () {
        console.log("[" + reqt._project_ + "]==>[" + view.type() + "]==>[" + reqt.getURL() + "]");
        var n = [];
        for (var i in resp._cookie) {
            n.push(i + "=" + resp._cookie[i]);
        }
        if (n.length > 0) {
            resp._headers["Set-Cookie"] = n.join(";");
        }
        resp._headers["Server"] = serverName;
        if (resp._statusCode === "index") {
            resp._statusCode = "200";
        }
        res.writeHead(resp._statusCode, resp._headers);
        if (resp._pipe) {
            resp._pipe.pipe(res);
        } else {
            if (resp._data) {
                res.write.apply(res, resp._data);
            }
            res.end();
        }
    });
};

corgi.prototype.createProject = function (name, path, remotePath, localFolder, mfn) {
    if (path[path.length - 1] !== "/") {
        path = path + "/";
    }
    var p = this.basePath, q = p + "webapps/" + name + ".json";
    topolr.file(q).write(JSON.stringify({
        name: name,
        path: path,
        remotePath: remotePath || "",
        installPath: localFolder || ""
    }, null, 4)).then(function () {
        if (!fs.existsSync(path + "WEBINF/web.json")) {
            return topolr.file(path + "WEBINF/web.json").write(JSON.stringify({
                page: {index: "index.html"},
                "service": [
                    {"name": "mvcservice", "option": {
                            "database": {
                                "host": "localhost",
                                "port": "3306",
                                "debug": false,
                                "database": "yourdatabasename",
                                "user": "yourusername",
                                "password": "yourpassword",
                                "connectionLimit ": "200"
                            },
                            "view": {
                                "path": "front",
                                "suffix": "html"
                            }
                        }}
                ],
                "filter": [
                    {"name": "mvcfilter", "option": {}},
                    {"name": "cachefilter", "option": {
                            "etag": true,
                            "cacheSetting": {
                                "png": 20000,
                                "js": 2000,
                                "default": 2000
                            }
                        }},
                    {"name": "zipfilter", "option": {
                            "gzip": "js,css"
                        }}
                ]
            }, null, 4));
        }
    }).then(function () {
        if (!fs.existsSync(path + "WEBINF/src/controller.js")) {
            return topolr.file(path + "WEBINF/src/controller.js").write(
                    "/*\n" +
                    " * @packet controller;\n" +
                    " */\n" +
                    "Module({\n" +
                    "    name: \"test\",\n" +
                    "    extend: \"controller\",\n" +
                    "    path: \"/test\",\n" +
                    "    dao: \"mysql\",\n" +
                    "    \"/test\": function (done) {\n" +
                    "        this.request.setAttr(\"desc\",\"this is thr desc of the url:/test/test\");\n" +
                    "        done(this.getCspView(\"index.csp\",{data:\"this is data\"}));\n" +
                    "    }\n" +
                    "});");
        }
    }).then(function () {
        if (!fs.existsSync(path + "index.html")) {
            return topolr.file(path + "index.html").write(
                    "<!DOCTYPE html>\n" +
                    "<html>\n" +
                    "    <head>\n" +
                    "        <title>index</title>\n" +
                    "        <meta charset=\"UTF-8\">\n" +
                    "        <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n" +
                    "    </head>\n" +
                    "    <body>\n" +
                    "        <div>Hello World.</div>\n" +
                    "    </body>\n" +
                    "</html>");
        }
    }).then(function () {
        if (!fs.existsSync(path + "index.csp")) {
            return topolr.file(path + "index.csp").write(
                    "<!DOCTYPE html>\n" +
                    "<html>\n" +
                    "    <head>\n" +
                    "        <title>TODO supply a title</title>\n" +
                    "        <meta charset=\"UTF-8\">\n" +
                    "        <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n" +
                    "    </head>\n" +
                    "    <body>\n" +
                    "        <div><%=request.getAttr('desc');%></div>\n" +
                    "        <div><%=data.data;%></div>" +
                    "    </body>\n" +
                    "</html>");
        }
    }).then(function () {
        if (!fs.existsSync(path + "package.json")) {
            return topolr.file(path + "package.json").write(JSON.stringify({
                name: name,
                author: "",
                version: "0.0.1",
                description: "",
                license: "",
                bugs: "",
                dependencies: {},
                devDependencies: {},
                scripts: {}
            }, null, 4));
        }
    }).done(function () {
        console.log("[corgiserver] project build complete");
        mfn && mfn();
    });
};
corgi.prototype.listProjects = function () {
    var path = this.basePath + "webapps", ths = this, queue = topolr.queue(), ps = topolr.promise(), ls = [];
    queue.complete(function () {
        ps.resolve(ls);
    });
    topolr.file(path).getSubPaths().done(function (data) {
        data.folder.forEach(function (pa) {
            var n = pa.substring(path.length + 1);
            ls.push({
                name: n,
                path: pa,
                isout: false,
                remotePath: "",
                installPath: ""
            });
        });
        data.file.forEach(function (a) {
            if (a.indexOf(".json") !== -1) {
                queue.add(function (a, b) {
                    var tss = this;
                    topolr.file(b).read().done(function (data) {
                        var n = JSON.parse(data);
                        ls.push({
                            name: n.name,
                            path: n.path,
                            remotePath: n.remotePath || "",
                            installPath: n.installPath || "",
                            isout: true
                        });
                        tss.next(n.name);
                    });
                }, function () {
                    this.next();
                }, a);
            }
        });
        queue.run();
    });
    return ps;
};
corgi.prototype.getAllRemoteProjects = function () {
    var path = this.basePath + "webapps", queue = topolr.queue(), ps = topolr.promise(), ls = [];
    queue.complete(function () {
        ps.resolve(ls);
    });
    topolr.file(path).getSubPaths().done(function (data) {
        data.file.forEach(function (a) {
            if (a.indexOf(".json") !== -1) {
                queue.add(function (a, b) {
                    var tss = this;
                    topolr.file(b).read().done(function (data) {
                        var n = JSON.parse(data);
                        if (n.remotePath) {
                            ls.push(n);
                        }
                        tss.next(n);
                    });
                }, function () {
                    this.next();
                }, a);
            }
        });
        queue.run();
    });
    return ps;
};
corgi.prototype.editProjectRemotePath = function (projectName, path) {
    var ths = this, t = null;
    this.getAllRemoteProjects().done(function (a) {
        for (var i in a) {
            if (a[i].name === projectName) {
                t = a[i];
            }
        }
        if (t) {
            t.remotePath = path;
            var p = ths.basePath, q = p + "webapps/" + t.name + ".json";
            topolr.file(q).write(JSON.stringify(t, null, 4)).done(function () {
                console.log("[corgiserver] project <" + projectName + "> remote path is edited,new is <" + path + ">");
            });
        } else {
            console.log("[corgiserver] project <" + projectName + "> is not a remote project.");
        }
    });
};
corgi.prototype.removeProject = function (projectName) {
    if (projectName !== "ROOT") {
        var path = this.basePath + "webapps", ths = this, queue = topolr.queue(), paths = [];
        queue.complete(function () {
            if (paths.length > 0) {
                paths.forEach(function (a) {
                    topolr.file(a).remove();
                });
                console.log("[corgiserver] project removed");
            } else {
                console.log("[corgiserver] project of " + projectName + " can not find.");
            }
        });
        topolr.file(path).getSubPaths().done(function (data) {
            data.folder.forEach(function (pa) {
                var n = pa.substring(path.length + 1);
                if (n === projectName) {
                    paths.push(pa);
                }
            });
            data.file.forEach(function (a) {
                var q = a;
                if (a.indexOf(".json") !== -1) {
                    queue.add(function (a, b) {
                        var tss = this;
                        topolr.file(b).read().done(function (data) {
                            var n = JSON.parse(data);
                            if (n.name === projectName) {
                                paths.push(q);
                            }
                            tss.next(n.name);
                        });
                    }, function () {
                        this.next();
                    }, a);
                }
            });
            queue.run();
        });
    } else {
        console.log("[corgiserver] ROOT can not remove");
    }
};
corgi.prototype.setServerPort = function (port) {
    var ps = topolr.promise();
    topolr.file(this.serverConfigPath).read().done(function (data) {
        var a = JSON.parse(data);
        a.port = parseInt(port);
        topolr.file(this.serverConfigPath).write(JSON.stringify(a, null, 4)).done(function () {
            ps.resolve();
        });
    }.bind(this));
    return ps;
};
corgi.prototype.setSessionTimeout = function (time) {
    var ps = topolr.promise();
    topolr.file(this.webConfigPath).read().done(function (data) {
        var a = JSON.parse(data);
        a.session.timeout = parseInt(time);
        topolr.file(this.webConfigPath).write(JSON.stringify(a, null, 4)).done(function () {
            ps.resolve();
        });
    }.bind(this));
    return ps;
};
corgi.prototype.getServerState = function () {
    var ps = topolr.promise();
    topolr.file(this.webConfigPath).read().done(function (data) {
        var web = JSON.parse(data);
        topolr.file(this.serverConfigPath).read().done(function (data) {
            var server = JSON.parse(data);
            ps.resolve({
                "server-port": server.port,
                "session-timeout": web.session.timeout,
                "csp-cache": web.cspCache,
                "ipc-port": server.ipc.port,
                "ipc-host": server.ipc.host,
                "ipc-pat": server.ipc.socketPath,
                "log-server": server.log.server,
                "log-daemon": server.log.daemon,
                "pwd": process.cwd(),
                "node-version": process.version,
                "install-path": process.installPrefix || "unknow"
            });
        });
    }.bind(this));
    return ps;
};
corgi.prototype.enableCspCache = function () {
    var ps = topolr.promise();
    topolr.file(this.webConfigPath).read().done(function (data) {
        var a = JSON.parse(data);
        a.cspCache = true;
        topolr.file(this.webConfigPath).write(JSON.stringify(a, null, 4)).done(function () {
            ps.resolve();
        });
    }.bind(this));
    return ps;
};
corgi.prototype.disableCspCache = function () {
    var ps = topolr.promise();
    topolr.file(this.webConfigPath).read().done(function (data) {
        var a = JSON.parse(data);
        a.cspCache = false;
        topolr.file(this.webConfigPath).write(JSON.stringify(a, null, 4)).done(function () {
            ps.resolve();
        });
    }.bind(this));
    return ps;
};

var corgiserver = new corgi();

global.CorgiServer = {
    getServerConfig: function () {
        return corgiserver.serverConfig;
    },
    getWebConfig: function () {
        return corgiserver.webConfig;
    },
    getCspContent: function (path) {
        return corgiserver.cspContainer.getCspContent(path);
    }
};

process.on('uncaughtException', function (err) {
    console.error(err.stack);
});

module.exports = {
    run: function () {
        corgiserver.startup();
    },
    version: function () {
        return corgiserver.version;
    },
    create: function (name, path, remotePath, installPath, fn) {
        corgiserver.createProject(name, path, remotePath, installPath, fn);
    },
    stop: function () {},
    restart: function () {},
    scan: function () {
        return corgiserver.listProjects();
    },
    getRemoteProjects: function () {
        return corgiserver.getAllRemoteProjects();
    },
    remove: function (projectName) {
        corgiserver.removeProject(projectName);
    },
    setPort: function (port) {
        return corgiserver.setServerPort(port);
    },
    setSessionTimeout: function (time) {
        return corgiserver.setSessionTimeout(time);
    },
    getServerState: function () {
        return corgiserver.getServerState();
    },
    enableCspCache: function () {
        return corgiserver.enableCspCache();
    },
    disableCspCache: function () {
        return corgiserver.disableCspCache();
    },
    editProjectRemotePath: function (a, b) {
        corgiserver.editProjectRemotePath(a, b);
    },
    getPathInfo: function () {
        return {
            basePath: corgiserver.basePath,
            packagePath: corgiserver.packagePath,
            configPath: corgiserver.configPath,
            serverConfigPath: corgiserver.serverConfigPath,
            webConfigPath: corgiserver.webConfigPath
        };
    }
};