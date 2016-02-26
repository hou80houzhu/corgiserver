var fs = require('fs');
var zlib = require("zlib");
var request = require('request');
var promise = require("./base/tpromise");
var hash = require("./util/md5");
var router = require("./base/router");

Module({
    name: "filter",
    doFilter: function (data, next) {
        next(data);
    },
    getModule: function (type, option) {
        return packetLoader.get(type, bright.extend({
            request: this.request,
            response: this.response
        }, option));
    }
});
Module({
    name: "service",
    option: {},
    start: function (done) {
        done();
    }
});
Module({
    name: "controller",
    path: "",
    dao: "",
    before: function (a, b) {
        a();
    },
    after: function (a, b) {
        b(a);
    },
    getProjectInfo: function () {
        return project;
    },
    getTable: function (tableName) {
        var a = project.getAttr("tableMapping")[tableName];
        if (a) {
            var b = packetLoader.get(a);
            b.init();
            return b;
        }
        return null;
    },
    getJsonView: function (data) {
        return packetLoader.get("jsonview", {request: this.request, response: this.response, data: data});
    },
    getFileView: function (path) {
        return packetLoader.get("fileview", {request: this.request, response: this.response, data: path});
    },
    getTemplateView: function (template, data) {
        var a = packetLoader.get("templateview", {request: this.request, response: this.response, data: data, template: project.getAttr("templatemapping")[template]});
        return a;
    },
    getStringView: function (string) {
        return packetLoader.get("stringview", {request: this.request, response: this.response, data: string});
    },
    getCspView: function (path, data) {
        return packetLoader.get("cspview", {request: this.request, response: this.response, data: data, path: project.getProjectPath() + path});
    },
    getRequestView: function (url, data) {
        return packetLoader.get("requestview", {request: this.request, response: this.response, data: data, url: url});
    },
    getDefaultPageView: function (code, data) {
        return packetLoader.get("defaultPageView", {request: this.request, response: this.response, data: data, code: code});
    },
    getModule: function (type, option) {
        return packetLoader.get(type, option);
    }
});
Module({
    name: "view",
    option: {
        request: null,
        response: null,
        data: null
    },
    doRender: function (fn) {
        this._end = fn;
        if (!this._queue) {
            this._queue = bright.queue();
            this.goon(this.render);
        }
        this._queue.complete(function () {
            fn && fn();
        });
        this._queue.run();
    },
    goon: function (fn) {
        var thss = this;
        if (!this._queue) {
            this._queue = bright.queue();
            this._queue.add(function (a, b) {
                var ths = this;
                b.call(thss, function () {
                    ths.next();
                });
            }, function (e, b) {
                this.next();
                console.error(b.stack);
            }, this.render);
        }
        this._queue.add(function (a, b) {
            var ths = this;
            b.call(thss, function () {
                ths.next();
            });
        }, function (e, b) {
            this.next();
            console.error(b.stack);
        }, fn);
    },
    done: function () {
        this._queue.clean();
        this._end && this._end();
    },
    render: function (done) {
        done();
    },
    getRequest: function () {
        return this.option.request;
    },
    getResponse: function () {
        return this.option.response;
    },
    getModule: function (type, option) {
        return packetLoader.get(type, bright.extend({
            request: this.option.request,
            response: this.option.response
        }, option));
    }
});
Module({
    name: "stringview",
    extend: "view",
    render: function (done) {
        var res = this.option.response;
        res.setContentType("text/html");
        res.setStatusCode(200);
        res.write(this.option.data);
        done();
    }
});
Module({
    name: "jsonview",
    extend: "view",
    render: function (done) {
        var res = this.option.response;
        res.setContentType("application/json");
        res.setStatusCode(200);
        res.write(JSON.stringify(this.option.data));
        this.done();
    }
});
Module({
    name: "fileview",
    extend: "view",
    init: function () {
        this.option.data = this.option.data.split("?")[0];
    },
    render: function (goon) {
        var ths = this;
        var path = this.option.data.split("?")[0], response = this.option.response;
        if (path.indexOf("WEBINF") === -1 && path.indexOf("node_modules") === -1) {
            var a = path.split("."), suffix = "";
            if (a.length > 1) {
                suffix = a[a.length - 1];
            }
            if (suffix === "csp") {
                ths.getModule("cspview", {path: path}).doRender(function () {
                    ths.done();
                });
            } else {
                var mime = CorgiServer.getWebConfig().getMimeType(suffix);
                this.info = {
                    path: path,
                    suffix: suffix,
                    mime: mime
                };
                if (suffix !== "") {
                    fs.stat(path, function (err, data) {
                        if (err) {
                            ths.info.err = true;
                            ths.getModule("defaultPageView", {code: "404"}).doRender(function () {
                                ths.done();
                            });
                        } else {
                            ths.info.fileInfo = data;
                            response.setStatusCode(200);
                            response.setContentType(mime);
                            response.pipe(fs.createReadStream(path));
                            goon();
                        }
                    });
                } else {
                    if (path === project.getProjectPath()) {
                        this.getModule("defaultPageView", {code: "index"}).doRender(function () {
                            ths.done();
                        });
                    } else {
                        this.getModule("defaultPageView", {code: "404"}).doRender(function () {
                            ths.done();
                        });
                    }
                }
            }
        } else {
            this.getModule("defaultPageView", {code: "403"}).doRender(function () {
                ths.done();
            });
        }
    }
});
Module({
    name: "templateview",
    extend: "view",
    option: {
        template: ""
    },
    render: function (goon) {
        var res = this.option.response;
        res.setContentType("text/html");
        res.setStatusCode(200);
        var t = "";
        try {
            t = bright.template(this.option.template).render(this.option.data);
        } catch (e) {
            console.error(e.stack);
        }
        res.write(t);
        this.done();
    }
});
Module({
    name: "cspview",
    extend: "view",
    option: {
        path: "",
        data: {}
    },
    render: function (goon) {
        var ths = this, path = this.option.path, response = this.option.response;
        var content = global.CorgiServer.getCspContent(path);
        if (content) {
            response.setStatusCode(200);
            response.setContentType("text/html");
            try {
                var temp = bright.template(content);
                temp.basePath = project.getProjectPath();
                temp.request = ths.option.request;
                var t = temp.fn(new Function("request", "session", "data", temp.code())).render(ths.option.request, ths.option.request.getSession(), ths.option.data);
                response.write(t);
                ths.done();
            } catch (e) {
                console.error(e.stack);
                ths.getModule("defaultPageView", {code: "500"}).doRender(function () {
                    ths.done();
                });
            }
        } else {
            ths.getModule("defaultPageView", {code: "404"}).doRender(function () {
                ths.done();
            });
        }
    }
});
Module({
    name: "requestview",
    extend: "view",
    option: {
        url: "",
        data: {}
    },
    render: function (goon) {
        this.option.response.pipe(this.option.request.getRealRequest().pipe(request(this.option.url)));
        this.done();
    }
});
Module({
    name: "defaultPageView",
    extend: "view",
    option: {
        code: "",
        data: {}
    },
    render: function (goon) {
        var response = this.option.response, ths = this, path = "";
        if (project.getProjectConfig().hasPage(this.option.code)) {
            path = project.getProjectConfig().getPagePath(this.option.code);
        } else {
            path = global.CorgiServer.getWebConfig().getPagePath(this.option.code);
        }
        if (this.option.code === "404") {
            var content = global.CorgiServer.getCspContent(path);
            if (content) {
                this.getModule("cspview", {path: path, data: this.option.data}).doRender(function () {
                    response.setStatusCode(ths.option.code);
                    ths.done();
                });
            } else {
                response.setStatusCode("404");
                ths.done();
            }
        } else {
            this.getModule("cspview", {path: path, data: this.option.data}).doRender(function () {
                response.setStatusCode(ths.option.code);
                ths.done();
            });
        }
    }
});
Module({
    name: "mvcservice",
    extend: "service",
    option: {
    },
    start: function (done) {
        var b = {}, d = {}, _router = router();
        packetLoader.each(function (mod) {
            if (mod.typeOf("controller")) {
                var t = mod.getFields();
                var p = t["path"];
                if (p === "" || p === "/") {
                    p = "";
                } else if (p[0] !== "/") {
                    p = "/" + p + "/";
                } else {
                    p = p + "/";
                }
                for (var i in t) {
                    if (i[0] === "/") {
                        _router.add(p + i, i, mod.type());
                    }
                }
            }
        });
        packetLoader.each(function (mod) {
            if (mod.typeOf("table")) {
                b[mod.getFields()["tableName"]] = mod.type();
            }
        });
        packetLoader.each(function (mod) {
            if (mod.typeOf("dao")) {
                d[mod.getFields()["daoName"]] = mod.type();
            }
        });
        project.setAttr("router", _router);
        project.setAttr("tableMapping", b);
        project.setAttr("daoMapping", d);
        this.privator("startdb");
        this.privator("startview", done);
    },
    _startdb: function () {
        var pool = require('mysql').createPool(this.option.database);
        project.setAttr("pool", pool);
    },
    _startview: function (done) {
        var ths = this, tempPath = (project.getProjectPath() + this.option.view.path + "/").replace(/[\/]+/g, "/"), suffix = this.option.view.suffix;
        bright.file(tempPath).getAllSubFilesPathWithSuffix(suffix).done(function (p) {
            if (p.length > 0) {
                var n = "", que = bright.queue();
                que.complete(function () {
                    ths.privator("parseTemplate", n);
                    done();
                });
                p.forEach(function (path) {
                    que.add(function (a, b) {
                        var q = this;
                        bright.file(b).read().done(function (content) {
                            var m = b.substring(tempPath.length, b.length - suffix.length - 1).replace(/\//g, ".");
                            n += "<!--[@packet " + m + ";]-->" + content + "\n";
                            q.next();
                        });
                    }, null, path);
                });
                que.run();
            } else {
                done();
            }
        });
    },
    _parseTemplate: function (template) {
        template = template.replace(/>[\s]+</g, "><").replace(/\r\n/g, "").replace(/\r/g, "").replace(/\n/g, "");
        var _a = template.split(/\<\!\-\-\[@[\s\S]*?;\]\-\-\>/), cd = {};
        if (_a.length > 1) {
            var _b = template.match(/\<\!\-\-\[@[\s\S]*?;\]\-\-\>/g);
            for (var i = 0; i < _b.length; i++) {
                var _pn = _b[i].substring(13, _b[i].length - 5).split(" ");
                var pn = _pn[0];
                var temp = _a[i + 1];
                if (temp !== "") {
                    var p = temp.split(/\<\!\-\-\[[0-9a-zA-Z-_]*?\]\-\-\>/), b = temp.match(/\<\!\-\-\[[0-9a-zA-Z-_]*?\]\-\-\>/g);
                    for (var j = 0; j < b.length; j++) {
                        var c = b[j].substring(5, b[j].length - 4);
                        cd[pn + "." + c] = p[j + 1].replace(/\<\!\-\-[\s\S]*?\-\-\>/g, "");
                    }
                }
            }
        }
        project.setAttr("templatemapping", cd);
    }
});
Module({
    name: "table",
    tableName: "",
    id: "",
    cols: [],
    init: function () {
        this._data = {};
        this.cols.forEach(function (a) {
            this._data[a] = null;
        }.bind(this));
    },
    set: function (key, value) {
        if (arguments.length === 2) {
            if (this._data.hasOwnProperty(key)) {
                this._data[key] = value;
            }
        } else if (arguments.length === 1) {
            for (var i in key) {
                if (this._data.hasOwnProperty(i)) {
                    this._data[i] = key[i];
                }
            }
        }
        return this;
    },
    get: function (key) {
        if (arguments.length === 0) {
            return this._data;
        } else {
            return this._data[key];
        }
    },
    with : function (req) {
        bright.extend(this._data, req._data);
        return this;
    },
    getSelectSqlInfo: function () {
        var str = "select ", a = [], b = [], c = [];
        for (var i in this._data) {
            a.push(i);
            if (this._data[i]) {
                b.push(this._data[i]);
                c.push(i + "=?");
            }
        }
        str += a.join(",") + " from " + this.tableName + (c.length > 0 ? (" where " + c.join(" and ")) : "");
        return {
            sql: str,
            value: b
        };
    },
    getSelectPageSqlInfo: function (from, size) {
        var a = this.getSelectSqlInfo();
        a.sql = a.sql + " limit ?,?";
        a.value.push(parseInt(from));
        a.value.push(parseInt(size));
        return a;
    },
    getInsertSqlInfo: function () {
        var str = "insert into " + this.tableName + " set ", b = [], c = [];
        for (var i in this._data) {
            if (this._data[i]) {
                b.push(this._data[i]);
                c.push(i + "=?");
            }
        }
        str += c.join(",");
        return {
            sql: str,
            value: b
        };
    },
    getUpdateSqlInfo: function () {
        var str = "update " + this.tableName + " set ", b = [], c = [];
        for (var i in this._data) {
            if (this._data[i]) {
                b.push(this._data[i]);
                c.push(i + "=?");
            }
        }
        str += c.join(",") + " where " + this.id + "=?";
        b.push(this._data[this.id]);
        return {
            sql: str,
            value: b
        };
    },
    getDeleteSqlInfo: function () {
        var str = "delete from " + this.tableName, b = [], c = [];
        for (var i in this._data) {
            if (this._data[i]) {
                b.push(this._data[i]);
                c.push(i + "=?");
            }
        }
        str += (c.length > 0 ? (" where " + c.join(" and ")) : "");
        return {
            sql: str,
            value: b
        };
    }
});
Module({
    name: "dao",
    daoName: "",
    option: {
        pool: null
    },
    _release: function () {
        if (this.connection) {
            console.log("-->connection release");
            this.connection.release();
        }
    },
    getConnection: function (fn) {
        var ths = this;
        if (!this.connection) {
            this.option.pool.getConnection(function (err, connection) {
                if (err) {
                } else {
                    console.log("-->get connection");
                    ths.connection = connection;
                    fn && fn(connection);
                }
            });
        } else {
            fn && fn(this.connection);
        }
    }
});
Module({
    name: "mysqldao",
    extend: "dao",
    daoName: "mysql",
    query: function (sql, values) {
        var ps = promise(), str = sql, value = values;
        if (bright.is.isObject(sql)) {
            if (sql.typeOf && sql.typeOf("table")) {
                var a = sql.getSelectSqlInfo();
                console.log(a);
                str = a.sql;
                value = a.value;
            }
        }
        this.getConnection(function (con) {
            con.query(str, value, function (err, rows) {
                if (err) {
                    ps.reject(err);
                } else {
                    ps.resolve(rows);
                }
            });
        });
        return ps;
    },
    transaction: function () {
        var ths = this, con = null;
        var ps = promise(function (p) {
            ths.getConnection(function (connection) {
                con = connection;
                connection.beginTransaction(function (err) {
                    console.log("-->start transaction");
                    p();
                });
            });
        }).oncomplete(function (a, next) {
            console.log("-->database done");
            con.commit(function () {
                console.log("-->commit transaction done");
                next(a);
            });
        }).onerror(function () {
            console.log("-->error rollback");
            con.rollback();
        });
        ps.scope(this);
        return ps;
    },
    add: function (table) {
        var c = table.getInsertSqlInfo();
        var ps = promise(), str = c.sql, value = c.value;
        console.log(c);
        this.getConnection(function (con) {
            con.query(str, value, function (err, rows) {
                if (err) {
                    ps.reject(err);
                } else {
                    table._data[table.id] = rows.insertId;
                    ps.resolve(table);
                }
            });
        });
        return ps;
    },
    remove: function (table) {
        var c = table.getDeleteSqlInfo();
        var ps = promise(), str = c.sql, value = c.value;
        console.log(c);
        this.getConnection(function (con) {
            con.query(str, value, function (err, rows) {
                if (err) {
                    ps.reject(err);
                } else {
                    table._data[table.id] = rows.insertId;
                    ps.resolve(table);
                }
            });
        });
        return ps;
    },
    update: function (table) {
        var c = table.getUpdateSqlInfo();
        var ps = promise(), str = c.sql, value = c.value;
        console.log(c);
        this.getConnection(function (con) {
            con.query(str, value, function (err, rows) {
                if (err) {
                    ps.reject(err);
                } else {
                    table._data[table.id] = rows.insertId;
                    ps.resolve(table);
                }
            });
        });
        return ps;
    },
    find: function (table) {
        var c = table.getSelectSqlInfo();
        var ps = promise(), str = c.sql, value = c.value;
        console.log(c);
        this.getConnection(function (con) {
            con.query(str, value, function (err, rows) {
                if (err) {
                    ps.reject(err);
                } else {
                    ps.resolve(rows);
                }
            });
        });
        return ps;
    },
    findPage: function (table, from, size) {
        var c = table.getSelectPageSqlInfo(from, size);
        var ps = promise(), str = c.sql, value = c.value;
        console.log(c);
        this.getConnection(function (con) {
            con.query(str, value, function (err, rows) {
                if (err) {
                    ps.reject(err);
                } else {
                    ps.resolve(rows);
                }
            });
        });
        return ps;
    }
});
Module({
    name: "mvcfilter",
    extend: "filter",
    doFilter: function (data, next) {
        var request = this.request, response = this.response;
        var url = request.getURL();
        var name = project.getProjectName();
        var a = url.split("?")[0].trim();
        var b = a.substring(name.length + 1);
        var router = project.getAttr("router");
        var relt = router.check(b);
        var doit = false;
        if (relt.found) {
            var action = relt.action, controller = relt.controller;
            console.log("controller:[" + controller + "]   action:[" + action + "]");
            var mod = packetLoader.get(controller);
            if (mod && mod.typeOf("controller")) {
                mod.request = request;
                mod.response = response;
                if (mod.dao) {
                    var r = project.getAttr("daoMapping")[mod.dao];
                    if (r) {
                        mod["dao"] = packetLoader.get(r, {pool: project.getAttr("pool")});
                    }
                }
                if (mod[action]) {
                    doit = true, _filter = this;
                    bright.queue().scope({
                        map: relt.map,
                        mod: mod,
                        action: action
                    }).complete(function (a) {
                        if (this.scope().mod.dao) {
                            this.scope().mod.dao.privator("release");
                        }
                        next(a);
                    }).add(function (a, b) {
                        var ths = this;
                        this.scope().mod.before(function () {
                            ths.next();
                        }, function (a) {
                            ths.end(a);
                        });
                    }, function (a, e) {
                        console.error(e.stack);
                        this.end(_filter.getModule("defaultPageView", {code: "500", data: e.stack}));
                    }).add(function (a, b) {
                        var ths = this;
                        this.scope().mod[this.scope().action](function (view) {
                            ths.next(view);
                        });
                    }, function (a, e) {
                        console.error(e.stack);
                        this.end(_filter.getModule("defaultPageView", {code: "500", data: e.stack}));
                    }).add(function (a, b) {
                        var ths = this;
                        this.scope().mod.after(a, function (view) {
                            ths.next(view);
                        });
                    }, function (a, e) {
                        console.error(e.stack);
                        this.end(_filter.getModule("defaultPageView", {code: "500", data: e.stack}));
                    }).run();
                } else {
                    doit = true;
                    next(this.getModule("defaultPageView", {code: "404"}));
                }
            }
        } else {
            if (b === "/") {
                doit = true;
                next(this.getModule("defaultPageView", {code: "index"}));
            }
        }
        if (!doit) {
            var path = "";
            if (name === "ROOT") {
                path = project.getProjectPath() + request.getURL();
            } else {
                if (!project.isOuterProject()) {
                    path = project.getProjectPath().substring(0, project.getProjectPath().length - name.length - 2) + request.getURL();
                } else {
                    path = project.getProjectPath() + request.getURL().substring(project.getProjectName().length + 1);
                }
            }
            next(this.getModule("fileview", {data: path}));
        }
    }
});
Module({
    name: "cachefilter",
    extend: "filter",
    option: {
        expires: 4000
    },
    doFilter: function (view, next) {
        if (this.request.getMethod() === "get" && view && view.typeOf && view.typeOf("fileview")) {
            var ths = this, response = this.response;
            view.goon(function (done) {
                var info = this.info, c = false, sh = hash.md5(this.info.path + this.info.fileInfo.mtime);
                var hs = this.getRequest().getHeaders();
                var ms = hs.getAttr("If-Modified-Since");
                var nm = hs.getAttr("If-None-Match");
                var code = "200";
                if (ths.option.etag) {
                    response.setHeader("Etag", sh);
                }
                var tmt = ths.option.cacheSetting[this.info.suffix];
                if (!tmt) {
                    tmt = ths.option.cacheSetting.default || 2;
                }
                response.setContentType(this.info.mime);
                response.setHeader("Expires", new Date(Date.now() + tmt * 1000).toUTCString());
                response.setHeader("Cache-Control", "max-age=" + tmt);
                response.setHeader("Last-Modified", new Date(this.info.fileInfo.mtime).toUTCString());
                if (ms) {
                    if (new Date(ms).getTime() === new Date(this.info.fileInfo.mtime).getTime()) {
                        if (ths.option.etag) {
                            if (nm && nm === sh) {
                                code = "304";
                                c = true;
                            }
                        } else {
                            code = "304";
                            c = true;
                        }
                    }
                    response.setStatusCode(code);
                    response.write('Not Modified');
                    done();
                    return;
                }
                if (!c) {
                    response.setStatusCode(code);
                    response.pipe(fs.createReadStream(this.info.path));
                    done();
                }
            });
        }
        next(view);
    }
});
Module({
    name: "zipfilter",
    extend: "filter",
    doFilter: function (view, next) {
        if (view && view.typeOf && view.typeOf("fileview")) {
            var ths = this;
            view.goon(function (done) {
                var suffix = this.info.suffix, doit = false;
                if (ths.request.getHeaders().getAcceptEncoding().indexOf("gzip") !== -1) {
                    if (ths.option.gzip) {
                        if (ths.option.gzip.indexOf(suffix) !== -1) {
                            doit = true;
                        }
                    }
                    if (doit && ths.response._pipe) {
                        ths.response.setHeader("Content-Encoding", "gzip");
                        ths.response._pipe = ths.response._pipe.pipe(zlib.createGzip());
                    }
                } else if (ths.request.getHeaders().getAcceptEncoding().indexOf("deflate") !== -1) {
                    if (ths.option.deflate) {
                        if (ths.option.deflate.indexOf(suffix) !== -1) {
                            doit = true;
                        }
                    }
                    if (doit && ths.response._pipe) {
                        ths.response.setHeader("Content-Encoding", "deflate");
                        ths.response._pipe = ths.response._pipe.pipe(zlib.createDeflate());
                    }
                }
                done();
            });
        }
        next(view);
    }
});