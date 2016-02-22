require("./axes");
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
    this.basePath = axes.path(__dirname).parent().getPath();
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
            } else if (axes.is.isArray(r[b[0]])) {
                r[b[0]].push(b[1]);
            } else {
                r[b[0]] = [r[b[0]]];
            }
        });
    }
    return r;
};
corgi.prototype.startup = function () {
    axes.file(this.serverConfigPath).read().scope(this).then(function (data) {
        this.serverConfig = new serverConfig(JSON.parse(data), this.basePath);
    }).then(function () {
        return axes.file(this.webConfigPath).read();
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
corgi.prototype.stop = function () {
    var queue = axes.queue();
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
    var path = this.basePath + "webapps", ths = this, queue = axes.queue(), ps = axes.promise();
    queue.complete(function () {
        ps.resolve();
    });
    queue.progress(function (a) {
        console.log("[corgiserver] project <" + a.data + "> started");
    });
    axes.file(path).getSubPaths().done(function (data) {
        data.folder.forEach(function (pa) {
            var n = pa.substring(path.length + 1);
            var t = project(pa + "/", n, false);
            ths.projects[n] = t;
            queue.add(function () {
                t.run(code, function () {
                    this.next(n);
                }.bind(this));
            });
        });
        data.file.forEach(function (a) {
            if (a.indexOf(".json") !== -1) {
                queue.add(function (a, b) {
                    var tss = this;
                    axes.file(b).read().done(function (data) {
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
    http.createServer(function (req, res) {
        var get = corgi.parseQueryString(url.parse(req.url).query);
        if (req.method.toLowerCase() === "post") {
            var form = new formidable.IncomingForm();
            var post = {}, file = {};
            form.uploadDir = '/tmp';
            form.on('error', function (err) {
                console.log(err);
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
            }).on('file', function (field, file) {
                file[field] = file;
            }).on('end', function () {
                ths.running({
                    get: get,
                    post: post,
                    file: file
                }, req, res);
            });
            form.parse(req);
        } else {
            ths.running({
                get: get
            }, req, res);
        }
    }).listen(this.serverConfig.getPort());
    console.log("[corgiserver] server started,port:" + this.serverConfig.getPort());
};
corgi.prototype.initNspContainer = function () {
    this.cspContainer = new cspContainer();
    axes.setTemplateGlobalMacro("include", function (attrs, render) {
        var c = global.CorgiServer.getCspContent(this.basePath + attrs.path), t = "";
        if (!c) {
            c = "";
        }
        try {
            var temp = axes.template(c);
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
    axes.setTemplateGlobalMacro("error", function (attr, render) {
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
    var ps = axes.promise();
    var paths = this.serverConfig.modules, ths = this;
    if (!axes.is.isArray(paths)) {
        paths = ["lib/modules/base.js"];
    } else {
        if (paths.indexOf("lib/modules/base.js")) {
            paths.unshift("lib/modules/base.js");
        }
    }
    if (paths.length > 0) {
        var qe = axes.queue(), t = [];
        qe.complete(function () {
            ps.resolve(t);
        });
        paths.forEach(function (path) {
            qe.add(function (a, b) {
                var ths = this;
                axes.file(b).read().done(function (a) {
                    t.push(a + "\n//# sourceURL=" + b);
                    ths.next();
                });
            }, null, ths.basePath + path);
            qe.run();
        });
    } else {
        ps.resolve();
    }
    return ps;
};
corgi.prototype.running = function (data, req, res) {
    var resp = response(), reqt = request(req, axes.extend(data, {method: req.method.toLowerCase(), url: req.url, rawHeaders: req.rawHeaders}));
    var info = this.routProject(reqt.getURL());
    var prj = this.projects[info.project];
    if (!prj) {
        info.project = "ROOT";
        prj = this.projects["ROOT"];
    }
    prj.trigger(reqt, resp).done(function (a) {
        a.doRender(function () {
            console.log("[" + reqt._project_ + "]==>[" + a.type() + "]==>[" + reqt.getURL() + "]");
            var n = [];
            for (var i in resp._cookie) {
                n.push(i + "=" + resp._cookie[i]);
            }
            if (n.length > 0) {
                resp._headers["Set-Cookie"] = n.join(";");
            }
            resp._headers["Server"] = "corgiserver 0.0.3";
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
    });
};
corgi.prototype.routProject = function (url) {
    var r = {
        file: false,
        suffix: "",
        fileName: "",
        project: "",
        url: url,
        filePath: ""
    };
    var a = url.split("?");
    var b = a[0].split("/");
    if (b.length > 1) {
        if (b.length > 2) {
            r.project = b[1];
        } else {
            r.project = "ROOT";
        }
        var c = b[b.length - 1];
        var d = c.split(".");
        if (d.length > 1) {
            r.file = true;
            r.suffix = d[1];
            r.fileName = c;
            r.filePath = this.basePath + "webapps" + url;
        }
    } else {
        r.project = "ROOT";
        r.suffix = "";
        r.file = true;
        r.fileName = "index.html";
        r.filePath = this.basePath + "webapps/ROOT" + url;
    }
    return r;
};
corgi.prototype.createProject = function (name, path) {
    if (path[path.length - 1] !== "/") {
        path = path + "/";
    }
    var p = this.basePath;
    axes.file(p + "webapps/" + name + ".json").write(JSON.stringify({
        name: name,
        path: path
    }, null, 4)).then(function () {
        if (!fs.existsSync(path + "WEBINF/web.json")) {
            return axes.file(path + "WEBINF/web.json").write(JSON.stringify({
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
            return axes.file(path + "WEBINF/src/controller.js").write(
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
            return axes.file(path + "index.html").write(
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
            return axes.file(path + "index.csp").write(
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
            return axes.file(path + "package.json").write(JSON.stringify({
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
    });
};
corgi.prototype.listProjects = function () {
    var path = this.basePath + "webapps", ths = this, queue = axes.queue(), ps = axes.promise(), ls = [];
    queue.complete(function () {
        ps.resolve(ls);
    });
    axes.file(path).getSubPaths().done(function (data) {
        data.folder.forEach(function (pa) {
            var n = pa.substring(path.length + 1);
            ls.push(n);
        });
        data.file.forEach(function (a) {
            if (a.indexOf(".json") !== -1) {
                queue.add(function (a, b) {
                    var tss = this;
                    axes.file(b).read().done(function (data) {
                        var n = JSON.parse(data);
                        ls.push(n.name);
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
corgi.prototype.removeProject = function (projectName) {
    if (projectName !== "ROOT") {
        var path = this.basePath + "webapps", ths = this, queue = axes.queue(), paths = [];
        queue.complete(function () {
            if (paths.length > 0) {
                paths.forEach(function (a) {
                    axes.file(a).remove();
                });
                console.log("[corgiserver] project removed");
            } else {
                console.log("[corgiserver] project of " + projectName + " can not find.");
            }
        });
        axes.file(path).getSubPaths().done(function (data) {
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
                        axes.file(b).read().done(function (data) {
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
    var ps = axes.promise();
    axes.file(this.serverConfigPath).read().done(function (data) {
        var a = JSON.parse(data);
        a.port = parseInt(port);
        axes.file(this.serverConfigPath).write(JSON.stringify(a, null, 4)).done(function () {
            ps.resolve();
        });
    }.bind(this));
    return ps;
};
corgi.prototype.setSessionTimeout = function (time) {
    var ps = axes.promise();
    axes.file(this.webConfigPath).read().done(function (data) {
        var a = JSON.parse(data);
        a.session.timeout = parseInt(time);
        axes.file(this.webConfigPath).write(JSON.stringify(a, null, 4)).done(function () {
            ps.resolve();
        });
    }.bind(this));
    return ps;
};
corgi.prototype.getServerState = function () {
    var ps = axes.promise();
    axes.file(this.webConfigPath).read().done(function (data) {
        var web = JSON.parse(data);
        axes.file(this.serverConfigPath).read().done(function (data) {
            var server = JSON.parse(data);
            ps.resolve({
                port: server.port,
                sessionTimeout: web.session.timeout,
                cspCache: web.cspCache
            });
        });
    }.bind(this));
    return ps;
};
corgi.prototype.enableCspCache = function () {
    var ps = axes.promise();
    axes.file(this.webConfigPath).read().done(function (data) {
        var a = JSON.parse(data);
        a.cspCache = true;
        axes.file(this.webConfigPath).write(JSON.stringify(a, null, 4)).done(function () {
            ps.resolve();
        });
    }.bind(this));
    return ps;
};
corgi.prototype.disableCspCache = function () {
    var ps = axes.promise();
    axes.file(this.webConfigPath).read().done(function (data) {
        var a = JSON.parse(data);
        a.cspCache = false;
        axes.file(this.webConfigPath).write(JSON.stringify(a, null, 4)).done(function () {
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
        axes.setTemplateGlobalMacro(key, fn);
    }
};

module.exports = {
    run: function () {
        corgiserver.startup();
    },
    create: function (name, path) {
        corgiserver.createProject(name, path);
    },
    stop: function () {},
    restart: function () {},
    scan: function () {
        return corgiserver.listProjects();
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
    }
};