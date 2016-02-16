var session = require("./base/session");

var projectConfig = function (data, path) {
    this._data = data;
    this._basepath = path;
};
projectConfig.prototype.getService = function (name) {
    if (this._data.service) {
        var r = null;
        this._data.service.forEach(function (a) {
            if (a.name === name) {
                r = a;
                return false;
            }
        });
        return r;
    }
    return null;
};
projectConfig.prototype.getFilter = function (name) {
    if (this._data.filter) {
        var r = null;
        this._data.filter.forEach(function (a) {
            if (a.name === name) {
                r = a;
                return false;
            }
        });
        return r;
    }
    return null;
};
projectConfig.prototype.hasFilter = function (name) {
    return this.getFilter(name) !== null;
};
projectConfig.prototype.hasService = function (name) {
    return this.getService(name) !== null;
};
projectConfig.prototype.getPagePath = function (name) {
    if (this._data.page) {
        return this._basepath + this._data.page[name];
    }
    return null;
};
projectConfig.prototype.hasPage = function (name) {
    return this._data.page ? (this._data.page[name] !== undefined) : false;
};
projectConfig.prototype.getServiceSize = function () {
    return this._data.service ? this._data.service.length : 0;
};
projectConfig.prototype.getFilterSize = function () {
    return this._data.filter ? this._data.filter.length : 0;
};

var project = function (path, name, isouter) {
    this._isouter = isouter;
    this._name = name;
    this._path = path;
    this._services = [];
    this._filters = [];
    this._packet = packet.packet(this._path + "WEBINF/src/");
    this.config = null;
    this._scope = {};
    this._session = {};
};
project.prototype.run = function (code, fn) {
    var ths = this;
    code.forEach(function (cod) {
        try {
            for (var i = 0; i < 2; i++) {
                cod = cod.replace(/\n/, "");
            }
            new Function("project", "packetLoader", "Module", "require", cod)({
                isOuterProject: function () {
                    return ths._isouter;
                },
                getPacketPath: function () {
                    return ths._packet;
                },
                getProjectPath: function () {
                    return ths._path;
                },
                getProjectName: function () {
                    return ths._name;
                },
                getProjectConfig: function () {
                    return ths.config;
                },
                hasAttr: function (key) {
                    return ths._scope[key] !== undefined;
                },
                getAttr: function (key) {
                    return ths._scope[key];
                },
                setAttr: function (key, value) {
                    return ths._scope[key] = value;
                }
            }, {
                get: function (name, option) {
                    var a = ths._packet.modules.get(name, option);
                    if (a.init) {
                        try {
                            a.init(option);
                        } catch (e) {
                            console.error(e.stack);
                        }
                    }
                    return a;
                },
                has: function (name) {
                    return ths._packet.modules.has(name);
                },
                each: function (fn) {
                    ths._packet.modules.each(fn);
                }
            }, function (obj) {
                if (obj) {
                    ths._packet.modules.add(obj);
                }
            }, function (a) {
                return require(a);
            });
        } catch (e) {
            console.error(e);
        }
    });
    this.sessionWatcher();
    packet.file(this._path + "WEBINF/web.json").read().done(function (data) {
        try {
            this.config = new projectConfig(JSON.parse(data), this._path);
        } catch (e) {
            console.error(e.stack);
        }
        this.packetInit(fn);
    }.bind(this)).fail(function () {
        throw Error("[corgi] can not find web.json with path of " + this._path);
    }.bind(this));
};
project.prototype.packetInit = function (fn) {
    var ths = this;
    packet.file(this._path + "WEBINF/src/").getAllSubFilesPathWithSuffix("js").done(function (t) {
        var n = "";
        if (t.length > 0) {
            var que = packet.queue(), n = "";
            que.complete(function () {
                ths._packet.parseCode(n);
                ths.doServices(function () {
                    fn && fn();
                });
            });
            t.forEach(function (path, i) {
                que.add(function (a, b) {
                    var ths = this;
                    console.log("[corgi] scan packet " + path);
                    packet.file(b).read().done(function (a) {
                        n += a + "\n";
                        ths.next();
                    });
                }, null, path);
            });
            que.run();
        } else {
            fn && fn();
        }
    });
};
project.prototype.trigger = function (request, response) {
    var ps = packet.promise();
    this.doFilters(request, response, function (a) {
        ps.resolve(a);
    });
    return ps;
};
project.prototype.getModule = function (packetName, option) {
    var c = this._packet.getModuleContainer().get(packetName, option);
    if (c) {
        return c;
    } else {
        throw Error("[packet] can not find the module of " + packetName);
    }
};
project.prototype.doFilters = function (request, response, fn) {
    var ths = this;
    var sid = request.getHeaders().getCookie().get("JSESSIONID");
    if (!this._session[sid]) {
        var k = session(sid);
        request._session = k;
        this._session[sid] = k;
    } else {
        this._session[sid]._build = new Date().getTime();
        request._session = this._session[sid];
    }
    request._project_ = ths._name;
    if (this.config._data.filter&&this.config._data.filter.length > 0) {
        var queue = packet.queue();
        queue.complete(function (a) {
            if (!a || !a.typeOf || !a.typeOf("view")) {
                if (!a) {
                    var path = "";
                    if (ths._name === "ROOT") {
                        path = ths._path + request.getURL();
                    } else {
                        path = ths._path.substring(0, ths._path.length - ths._name.length - 1) + request.getURL();
                    }
                    a = ths.getModule("fileview", {request: request, response: response, data: path});
                }
                if (!a.typeOf || !a.typeOf("view")) {
                    a = ths.getModule("defaultPageView", {request: request, response: response, code: 500});
                }
            }
            fn && fn(a);
        });
        this.config._data.filter.forEach(function (filter) {
            var packet = filter.name, option = filter.option;
            var mod = ths.getModule(packet, option);
            if (mod.typeOf("filter")) {
                mod.request = request;
                mod.response = response;
                queue.add(function (data, mode) {
                    var q = this;
                    try {
                        mode.doFilter(data, function (a) {
                            q.next(a);
                        }, function () {
                            q.end(a);
                        });
                    } catch (e) {
                        console.error(e.stack);
                        q.next(ths.getModule("defaultPageView", {request: request, response: response, code: 500, data: e.stack}));
                    }
                }, function () {
                    this.next();
                }, mod);
            }
        });
        queue.run(null);
    } else {
        var path = "";
        if (ths._name === "ROOT") {
            path = ths._path + request.getURL();
        } else {
            path = ths._path.substring(0, ths._path.length - ths._name.length - 2) + request.getURL();
        }
        var a = ths.getModule("fileview", {request: request, response: response, data: path});
        if (request.getURL() === "/") {
            a = ths.getModule("defaultPageView", {request: request, response: response, code: "index"});
        }
        fn && fn(a);
    }
};
project.prototype.doServices = function (fn) {
    var ths = this;
    if (this.config._data.service && this.config._data.service.length > 0) {
        var queue = packet.queue();
        queue.complete(function () {
            fn && fn();
        });
        this.config._data.service.forEach(function (service) {
            var packet = service.name, option = service.option;
            var mod = ths.getModule(packet, option);
            if (mod && mod.typeOf && mod.typeOf("service")) {
                queue.add(function () {
                    var q = this;
                    mod.start(function (a) {
                        q.next(a);
                    });
                });
            }
        });
        queue.run();
    } else {
        fn && fn();
    }
};
project.prototype.sessionWatcher = function () {
    var tout = CorgiServer.getWebConfig().getSessionTimeout();
    setInterval(function () {
        var a = new Date().getTime();
        for (var i in this._session) {
            var s = this._session[i];
            if (a - s._build > tout) {
                console.log("-->session timeout id:" + i);
                delete this._session[i];
            }
        }
    }.bind(this), tout * 1000);
};

module.exports = function (path, name, isouter) {
    return new project(path, name, isouter);
};