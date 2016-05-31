require("./bright");
var formidable = require('formidable');
var http = require('http');
var url = require('url');
var util = require("util");
var project = require("./project");
var request = require("./base/request");
var response = require("./base/response");
var fs = require("fs");

var cspContainer = function () {
    this._data = {};
};
cspContainer.prototype.getCspContent = function (path) {
    if (global.CorgiServer.getWebConfig().isCspCache()) {
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

var serverConfig = function (data, path) {
    this._data = data;
    this._basepath = path;
};
serverConfig.prototype.getHost = function () {
    return this._data.host;
};
serverConfig.prototype.getPort = function () {
    return this._data.port;
};
serverConfig.prototype.getModules = function () {
    return this._data.modules;
};
serverConfig.prototype.getBasePath = function () {
    return this._basepath;
};
serverConfig.prototype.getConfigPath = function () {
    return this._basepath + "conf/";
};

var webConfig = function (data, basePath) {
    this._data = data;
    this._basepath = basePath;
};
webConfig.prototype.getSessionConfig = function () {
    return this._data.session;
};
webConfig.prototype.getSessionTimeout = function () {
    return this._data.session ? this._data.session.timeout : 2000;
};
webConfig.prototype.getPagePath = function (name) {
    return this._basepath + "conf/pages/" + this._data.page[name];
};
webConfig.prototype.getMimeType = function (name) {
    return this._data.mime[name];
};
webConfig.prototype.getBasePath = function () {
    return this._basepath;
};
webConfig.prototype.getConfigPath = function () {
    return this._basepath + "conf/";
};
webConfig.prototype.isCspCache = function () {
    return this._data.cspCache === true;
};

var corgi = function () {
    this.corgiversion = 0;
    this.basePath = bright.path(__dirname).parent().getPath();
    this.packagePath = this.basePath + "package.json";
    this.configPath = this.basePath + "conf/";
    this.serverConfigPath = this.configPath + "server.json";
    this.webConfigPath = this.configPath + "web.json";
    this.projects = {};
};
corgi.parseQueryString = function (str) {
    var r = {};
    if (str) {
        str.split("&").forEach(function (a) {
            var b = a.split("=");
            if (!r[b[0]]) {
                r[b[0]] = b[1];
            } else if (bright.is.isArray(r[b[0]])) {
                r[b[0]].push(b[1]);
            } else {
                r[b[0]] = [r[b[0]]];
            }
        });
    }
    return r;
};
corgi.prototype.startup = function () {
    bright.file(this.packagePath).read().scope(this).then(function (data) {
        this.corgiversion = JSON.parse(data).version;
        return bright.file(this.serverConfigPath).read();
    }).then(function (data) {
        this.serverConfig = new serverConfig(JSON.parse(data), this.basePath);
    }).then(function () {
        return bright.file(this.webConfigPath).read();
    }).then(function (data) {
        this.webConfig = new webConfig(JSON.parse(data), this.basePath);
    }).then(function () {
        return this.getModulesCode();
    }).then(function (code) {
        this.initNspContainer();
        return this.initProjects(code);
    }).done(function () {
        this.initServer();
    });
};
corgi.prototype.version = function () {
    return this.corgiversion;
};
corgi.prototype.stop = function () {
    var queue = bright.queue();
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
        }, null, this.projects[i]);
    }
};
corgi.prototype.initProjects = function (code) {
    var path = this.basePath + "webapps", ths = this, queue = bright.queue(), ps = bright.promise();
    queue.complete(function () {
        ps.resolve();
    });
    queue.progress(function (a) {
        console.log("[corgiserver] project <" + a.data + "> started");
    });
    bright.file(path).getSubPaths().done(function (data) {
        data.folder.forEach(function (pa) {
            var n = pa.substring(path.length + 1);
            var t = project(pa + "/", n, false);
            ths.projects[n] = t;
            queue.add(function () {
                t.run(code, function () {
                    this.next(n);
                }.bind(this));
            }, function () {
                console.log("[corgiserver] project of <" + n + "> init fail");
                this.next();
            });
        });
        data.file.forEach(function (a) {
            if (a.indexOf(".json") !== -1) {
                queue.add(function (a, b) {
                    var tss = this;
                    bright.file(b).read().done(function (data) {
                        var n = JSON.parse(data);
                        var t = project(n.path, n.name, true);
                        ths.projects[n.name] = t;
                        t.run(code, function () {
                            tss.next(n.name);
                        });
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
corgi.prototype.initServer = function () {
    var ths = this;
    try {
        http.createServer(function (req, res) {
            if (req.method.toLowerCase() === "post") {
                ths.doPostRequest(req, res);
            } else {
                ths.doRequest(req, res);
            }
        }).listen(this.serverConfig.getPort());
        console.log("[corgiserver] server started,port:" + this.serverConfig.getPort());
    } catch (e) {
        console.error(e.stack);
    }
};
corgi.prototype.initNspContainer = function () {
    this.cspContainer = new cspContainer();
    bright.setTemplateGlobalMacro("include", function (attrs, render) {
        var c = global.CorgiServer.getCspContent(this.basePath + attrs.path), t = "";
        if (!c) {
            c = "";
        }
        try {
            var temp = bright.template(c);
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
    bright.setTemplateGlobalMacro("error", function (attr, render) {
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
    var ps = bright.promise();
    var paths = this.serverConfig.getModules(), ths = this;
    if (!bright.is.isArray(paths)) {
        paths = ["lib/modules/base.js"];
    } else {
        if (paths.indexOf("lib/modules/base.js")===-1) {
            paths.unshift("lib/modules/base.js");
        }
    }
    if (paths.length > 0) {
        var qe = bright.queue(), t = [];
        qe.complete(function () {
            ps.resolve(t);
        });
        paths.forEach(function (path) {
            qe.add(function (a, b) {
                var ths = this;
                bright.file(b).read().done(function (a) {
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
        info.request._data = bright.extend({}, corgi.parseQueryString(url.parse(req.url).query), post, file);
        ths.triggerProject(info.project, info.request, info.response, res);
    });
    form.parse(req);
};
corgi.prototype.doRequest = function (req, res) {
    var info = this.getRequestInfo(req, res);
    info.request._data = corgi.parseQueryString(url.parse(req.url).query);
    this.triggerProject(info.project, info.request, info.response, res);
};
corgi.prototype.triggerProject = function (prj, reqt, resp, res) {
    var ths = this;
    prj.trigger(reqt, resp).done(function (a) {
        ths.doResponse(a, reqt, resp, res);
    });
};
corgi.prototype.doResponse = function (view, reqt, resp, res) {
    var serverName = "corgiserver " + this.version();
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
    bright.file(q).write(JSON.stringify({
        name: name,
        path: path,
        remotePath: remotePath || "",
        installPath: localFolder || ""
    }, null, 4)).then(function () {
        if (!fs.existsSync(path + "WEBINF/web.json")) {
            return bright.file(path + "WEBINF/web.json").write(JSON.stringify({
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
            return bright.file(path + "WEBINF/src/controller.js").write(
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
            return bright.file(path + "index.html").write(
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
            return bright.file(path + "index.csp").write(
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
            return bright.file(path + "package.json").write(JSON.stringify({
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
    var path = this.basePath + "webapps", ths = this, queue = bright.queue(), ps = bright.promise(), ls = [];
    queue.complete(function () {
        ps.resolve(ls);
    });
    bright.file(path).getSubPaths().done(function (data) {
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
                    bright.file(b).read().done(function (data) {
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
    var path = this.basePath + "webapps", queue = bright.queue(), ps = bright.promise(), ls = [];
    queue.complete(function () {
        ps.resolve(ls);
    });
    bright.file(path).getSubPaths().done(function (data) {
        data.file.forEach(function (a) {
            if (a.indexOf(".json") !== -1) {
                queue.add(function (a, b) {
                    var tss = this;
                    bright.file(b).read().done(function (data) {
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
            bright.file(q).write(JSON.stringify(t, null, 4)).done(function () {
                console.log("[corgiserver] project <" + projectName + "> remote path is edited,new is <" + path + ">");
            });
        } else {
            console.log("[corgiserver] project <" + projectName + "> is not a remote project.");
        }
    });
};
corgi.prototype.removeProject = function (projectName) {
    if (projectName !== "ROOT") {
        var path = this.basePath + "webapps", ths = this, queue = bright.queue(), paths = [];
        queue.complete(function () {
            if (paths.length > 0) {
                paths.forEach(function (a) {
                    bright.file(a).remove();
                });
                console.log("[corgiserver] project removed");
            } else {
                console.log("[corgiserver] project of " + projectName + " can not find.");
            }
        });
        bright.file(path).getSubPaths().done(function (data) {
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
                        bright.file(b).read().done(function (data) {
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
    var ps = bright.promise();
    bright.file(this.serverConfigPath).read().done(function (data) {
        var a = JSON.parse(data);
        a.port = parseInt(port);
        bright.file(this.serverConfigPath).write(JSON.stringify(a, null, 4)).done(function () {
            ps.resolve();
        });
    }.bind(this));
    return ps;
};
corgi.prototype.setSessionTimeout = function (time) {
    var ps = bright.promise();
    bright.file(this.webConfigPath).read().done(function (data) {
        var a = JSON.parse(data);
        a.session.timeout = parseInt(time);
        bright.file(this.webConfigPath).write(JSON.stringify(a, null, 4)).done(function () {
            ps.resolve();
        });
    }.bind(this));
    return ps;
};
corgi.prototype.getServerState = function () {
    var ps = bright.promise();
    bright.file(this.webConfigPath).read().done(function (data) {
        var web = JSON.parse(data);
        bright.file(this.serverConfigPath).read().done(function (data) {
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
    var ps = bright.promise();
    bright.file(this.webConfigPath).read().done(function (data) {
        var a = JSON.parse(data);
        a.cspCache = true;
        bright.file(this.webConfigPath).write(JSON.stringify(a, null, 4)).done(function () {
            ps.resolve();
        });
    }.bind(this));
    return ps;
};
corgi.prototype.disableCspCache = function () {
    var ps = bright.promise();
    bright.file(this.webConfigPath).read().done(function (data) {
        var a = JSON.parse(data);
        a.cspCache = false;
        bright.file(this.webConfigPath).write(JSON.stringify(a, null, 4)).done(function () {
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
    },
    setTemplateMacro: function (key, fn) {
        bright.setTemplateGlobalMacro(key, fn);
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
        var t = fs.readFileSync(corgiserver.packagePath);
        return JSON.parse(t).version;
    },
    create: function (name, path, remotePath, installPath,fn) {
        corgiserver.createProject(name, path, remotePath, installPath,fn);
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