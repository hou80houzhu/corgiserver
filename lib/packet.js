var fs = require("fs");
var hash = require("./util/md5");

var Packet = function () {};

var is = {
    isFunction: function (obj) {
        return (typeof obj === 'function') && obj.constructor === Function;
    },
    isEmptyObject: function (obj) {
        for (var a in obj) {
            return false;
        }
        return true;
    },
    isUndefined: function (obj) {
        return obj === undefined;
    },
    isWindow: function (obj) {
        return obj !== undefined && obj !== null && obj === obj.window;
    },
    isDocument: function (obj) {
        return obj !== null && obj.nodeType === obj.DOCUMENT_NODE;
    },
    isObject: function (obj) {
        return  typeof (obj) === "object" && Object.prototype.toString.call(obj).toLowerCase() === "[object object]" && !obj.length;
    },
    isString: function (obj) {
        return (typeof obj === 'string') && obj.constructor === String;
    },
    isNumber: function (obj) {
        return typeof obj === "number";
    },
    isNumeric: function (obj) {
        return !isNaN(parseFloat(obj)) && isFinite(obj);
    },
    isAvalid: function (obj) {
        return obj !== null && obj !== undefined;
    },
    isArray: function (obj) {
        return Object.prototype.toString.call(obj) === '[object Array]';
    },
    isQueryString: function (str) {
        return is.isString(str) && /(^|&).*=([^&]*)(&|$)/.test(str);
    },
    isElement: function (e) {
        return e && e.nodeType === 1 && e.nodeName;
    }
};
var json = {
    parse: function (str) {
        return window.JSON.parse(str);
    },
    stringify: function (obj) {
        return window.JSON.stringify(obj);
    },
    each: function (object, fn) {
        var name, i = 0, length = object.length, isObj = length === undefined || is.isFunction(object);
        if (isObj) {
            for (name in object) {
                if (fn.call(object[ name ], name, object[ name ]) === false) {
                    break;
                }
            }
        } else {
            while (i < length) {
                if (fn.call(object[ i ], i, object[ i++ ]) === false) {
                    break;
                }
            }
        }
        return object;
    },
    clone: function (obj) {
        var a;
        if (is.isArray(obj)) {
            a = [];
            for (var i = 0; i < obj.length; i++) {
                a[i] = json.clone(obj[i]);
            }
            return a;
        } else if (is.isObject(obj)) {
            a = {};
            for (var i in obj) {
                a[i] = json.clone(obj[i]);
            }
            return a;
        } else {
            return obj;
        }
    },
    cover: function () {
        var obj, key, val, vals, arrayis, clone, result = arguments[0] || {}, i = 1, length = arguments.length, isdeep = false;
        if (typeof result === "boolean") {
            isdeep = result;
            result = arguments[1] || {};
            i = 2;
        }
        if (typeof result !== "object" && !is.isFunction(result)) {
            result = {};
        }
        if (length === i) {
            result = this;
            i = i - 1;
        }
        while (i < length) {
            obj = arguments[i];
            if (obj !== null) {
                for (key in obj) {
                    val = result[key];
                    vals = obj[key];
                    if (result === vals) {
                        continue;
                    }
                    arrayis = is.isArray(vals);
                    if (isdeep && vals && (is.isObject(vals) || arrayis)) {
                        if (arrayis) {
                            arrayis = false;
                            clone = val && is.isArray(val) ? val : [];
                        } else {
                            clone = val && is.isObject(val) ? val : {};
                        }
                        result[key] = json.cover(isdeep, clone, vals);
                    } else if (vals !== undefined) {
                        result[key] = vals;
                    }
                }
            }
            i++;
        }
        return result;
    }
};
var util = {
    uuid: function () {
        var chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split(''), uuid = new Array(36), rnd = 0, r;
        for (var i = 0; i < 36; i++) {
            if (i === 8 || i === 13 || i === 18 || i === 23) {
                uuid[i] = '-';
            } else if (i === 14) {
                uuid[i] = '4';
            } else {
                if (rnd <= 0x02)
                    rnd = 0x2000000 + (Math.random() * 0x1000000) | 0;
                r = rnd & 0xf;
                rnd = rnd >> 4;
                uuid[i] = chars[(i === 19) ? (r & 0x3) | 0x8 : r];
            }
        }
        return uuid.join('');
    }
};
Packet.is = is;
Packet.util = util;
Packet.json = json;
Packet.extend = Packet.json.cover;
Packet.nfn = function () {};

var queue = function () {
    this.list = [];
    this.length = null;
    this.current = null;
    this.state = "init";//running,end,stop.
    this._start = null;
    this._progress = null;
    this._complete = null;
    this.result = null;
};
queue.prototype.add = function (fn, error, parameter) {
    if (this.state === "init") {
        this.list.push({
            fn: fn,
            parameter: parameter,
            error: error || null
        });
    } else {
        throw Error("[Packet]-this queue can not add task when it is not in state of init.");
    }
    return this;
};
queue.prototype.next = function (data) {
    this._progress && this._progress.call(this, {
        total: this.length,
        runed: this.length - this.list.length,
        data: data
    });
    queue._fire.call(this, data);
    return this;
};
queue.prototype.left = function () {
    return this.list.length;
};
queue.prototype.total = function () {
    return this.length;
};
queue.prototype.run = function (data) {
    if (this.length === null) {
        this._start && this._start.call(this);
        this.length = this.list.length;
    }
    this.state = 'running';
    queue._fire.call(this, data);
};
queue.prototype.stop = function () {
    if (this.state === "running") {
        this.state = "stop";
    }
    return this;
};
queue.prototype.reset = function () {
    this.length === null;
    this.state = "init";
    this.result = null;
    return this;
};
queue.prototype.clean = function () {
    this.list.length = 0;
    this.state = "end";
    this.length = 0;
    this.reuslt = null;
    return this;
};
queue.prototype.isRunning = function () {
    return this.state === "running";
};
queue.prototype.isEnd = function () {
    return this.state === "end";
};
queue.prototype.isStop = function () {
    return this.state === "stop";
};
queue.prototype.start = function (fn) {
    fn && (this._start = fn);
    return this;
};
queue.prototype.progress = function (fn) {
    fn && (this._progress = fn);
    return this;
};
queue.prototype.complete = function (fn) {
    fn && (this._complete = fn);
    if (this.state === "end") {
        this._complete.call(this, this.result);
    }
    return this;
};
queue.prototype.end = function (a) {
    this.state = "end";
    this.result = a;
    this.complete();
    this.reset();
    return this;
};
queue._fire = function (result) {
    if (this.list.length > 0) {
        var a = this.list.shift(), ths = this;
        this.current = a;
        try {
            a.fn && a.fn.call(ths, result, a.parameter);
        } catch (e) {
            queue.error.call(this, result, e);
            this.next(result);
        }
    } else {
        this.state = 'end';
        this.result = result;
        this._complete && this._complete.call(this, result);
    }
    return this;
};
queue.error = function (result, e) {
    if (this.current) {
        this.current.error && this.current.error.call(this, result, e, this.current.parameter);
    }
};
Packet.queue = function () {
    return new queue();
};

var dynamicQueue = function () {
    this.state = "waiting";//waiting,running
    this.__list__ = [];
    this.result = null;
    this.current = null;
    this._complete = null;
    this._notify = null;
    this.waits = 1;
    this._completeTimes = 0;
    this._handleTimes = 0;
};
dynamicQueue.prototype.add = function (fn, error, parameters) {
    this.__list__.push({
        fn: fn,
        error: error,
        parameters: parameters
    });
    if (this.state === "waiting") {
        if (this.__list__.length === this.waits) {
            dynamicQueue._fire.call(this, this.result);
        }
    }
    return this;
};
dynamicQueue.prototype.size = function () {
    return this.__list__.length;
};
dynamicQueue.prototype.wait = function (num) {
    if (arguments.length === 0 || num === 0) {
        num = 10000000;
    }
    this.waits = num;
    return this;
};
dynamicQueue.prototype.work = function (data) {
    if (this.state === "waiting") {
        this.waits = 1;
        dynamicQueue.next.call(this, data);
    }
    return this;
};
dynamicQueue.prototype.delay = function (time) {
    this.add(function (data) {
        var ths = this;
        setTimeout(function () {
            ths.next(data);
        }, time);
    });
    return this;
};
dynamicQueue.prototype.notify = function (fn) {
    fn && (this._notify = fn);
    return this;
};
dynamicQueue.prototype.complete = function (fn) {
    fn && (this._complete = fn);
    return this;
};
dynamicQueue.prototype.isRunning = function () {
    return this.state === "running";
};
dynamicQueue.prototype.isWaiting = function () {
    return this.state === "waiting";
};
dynamicQueue.prototype.isHandleAtOnce = function () {
    if (this.state === "running" && this.__list__.length > 0) {
        return false;
    } else {
        return true;
    }
};
dynamicQueue.prototype.completeTimes = function () {
    return this._completeTimes;
};
dynamicQueue.prototype.handleTimes = function () {
    return this._handleTimes;
};
dynamicQueue.prototype.clean = function () {
    this.__list__.length = 0;
    this.state = "waiting";
    for (var i in this) {
        this[i] = null;
    }
};
dynamicQueue.prototype.next = function (data) {
    dynamicQueue.next.call(this, data);
    return this;
};
dynamicQueue.prototype.error = function (e) {
    return dynamicQueue.error.call(this, e);
};
dynamicQueue.next = function (data) {
    this._notify && this._notify.call(this, data);
    dynamicQueue._fire.call(this, data);
    return this;
};
dynamicQueue.error = function (data) {
    if (this.current) {
        this.current.error && this.current.error(this, data);
    }
    return this;
};
dynamicQueue._fire = function (result) {
    if (this.__list__.length > 0) {
        this.state = 'running';
        this._handleTimes = this._handleTimes + 1;
        var a = this.__list__.shift(), ths = this;
        this.current = a;
        try {
            a.fn && a.fn.call(ths, result, a.parameters);
        } catch (e) {
            dynamicQueue.error.call(e);
            dynamicQueue.next.call(ths, result);
        }
    } else {
        if (this.state === 'running') {
            this.result = result;
            this.state = 'waiting';
            this._completeTimes = this._completeTimes + 1;
            this.current = null;
        }
        this._complete && this._complete.call(this, result);
    }
    return this;
};
Packet.dynamicQueue = function () {
    return new dynamicQueue();
};

var promise = function (task) {
    this.state = 0;//0,1,2
    this.queue = new dynamicQueue();
    this._finally = null;
    this._notify = null;
    this._complete = null;
    this._result = null;
    this._scope = null;
    var ths = this;
    this.queue.complete(function (data) {
        ths._result = data;
        var a = ths._finally && ths._finally.call(ths, data);
        if (a instanceof promise) {
            a.complete(function (b) {
                ths._result = b;
                ths._complete && ths._complete.call(ths, b);
            });
        } else {
            ths._complete && ths._complete.call(ths, data);
        }
    }).notify(function (e) {
        ths._notify && ths._notify(e);
    });
    if (is.isFunction(task)) {
        this.queue.wait();
        this.done(function (a) {
            return a;
        });
        task(function (a) {
            ths.resolve(a);
        }, function (a) {
            ths.reject(a);
        });
    } else if (task) {
        this._result = task;
        this.state = 1;
        this.queue.add(function () {
            this.next(task);
        });
    } else {
        this.queue.wait();
        this.done(function (a) {
            return a;
        });
    }
};
promise.prototype.scope = function (scope) {
    if (arguments.length === 1) {
        this._scope = scope;
        return this;
    } else {
        return this._scope;
    }
};
promise.prototype.then = function (resolver, rejecter) {
    promise.add.call(this, resolver, 1);
    promise.add.call(this, rejecter, 2);
    return this;
};
promise.prototype.wait = function (fn) {
    this.queue.add(function (data) {
        var ths = this;
        fn.call(ths, function (a) {
            ths.next(a);
        }, data);
    });
    return this;
};
promise.prototype.done = function (fn) {
    promise.add.call(this, fn, 1);
    return this;
};
promise.prototype.fail = function (fn) {
    promise.add.call(this, fn, 2);
    return this;
};
promise.prototype.always = function (fn) {
    is.isFunction(fn) && (this._finally = fn);
    return this;
};
promise.prototype.reject = function (data) {
    this.state = 2;
    this.queue.work(data);
    return this;
};
promise.prototype.resolve = function (data) {
    this.state = 1;
    this.queue.work(data);
    return this;
};
promise.prototype.notify = function (fn) {
    is.isFunction(fn) && (this._notify = fn);
    return this;
};
promise.prototype.complete = function (fn) {
    is.isFunction(fn) && (this._complete = fn);
    return this;
};
promise.prototype.delay = function (time) {
    this.queue.delay(time);
    return this;
};
promise.prototype.clean = function () {
    this.queue.clean();
    for (var i in this) {
        this[i] = null;
    }
};
promise.add = function (fn, state) {
    var ps = this;
    if (fn && is.isFunction(fn)) {
        this.queue.add(function (data) {
            var ths = this;
            setTimeout(function () {
                if (ps.state === state) {
                    var a;
                    if (ps._scope) {
                        a = fn && fn.call(ps._scope, data);
                    } else {
                        a = fn && fn(data);
                    }
                    if (a instanceof promise) {
                        a.complete(function (b) {
                            ths.next(b);
                        });
                    } else {
                        ths.next(a);
                    }
                } else {
                    ths.next(data);
                }
            }, 0);
        });
    }
};
Packet.promise = function (fn) {
    return new promise(fn);
};
Packet.all = function () {
    var ps = $.promise();
    if (arguments.length > 0) {
        var a = Array.prototype.slice.call(arguments);
        var total = a.length;
        for (var i = 0; i < a.length; i++) {
            a[i].complete(function () {
                if (this.isResolve) {
                    total = total - 1;
                    if (total === 0) {
                        ps.resolve();
                    }
                }
            });
        }
    }
    return ps;
};
Packet.any = function () {
    var ps = $.promise();
    if (arguments.length > 0) {
        var a = Array.prototype.slice.call(arguments);
        var total = a.length, resolved = false;
        for (var i = 0; i < a.length; i++) {
            a[i].complete(function () {
                total = total - 1;
                if (this.isResolve) {
                    resolved = true;
                }
                if (total === 0 && resolved) {
                    ps.resolve();
                }
            });
        }
    }
    return ps;
};

var file = function (path) {
    this.path = path;
};
file.prototype.read = function (option) {
    var ops = {
        encoding: "utf8",
        flag: 'r'
    };
    Packet.extend(ops, option);
    var ps = Packet.promise();
    fs.readFile(this.path, ops, function (err, data) {
        if (err) {
            ps.reject(err);
        } else {
            ps.resolve(data);
        }
    });
    return ps;
};
file.prototype.scan = function (fn) {
    var path = this.path;
    var fileList = [], folderList = [];
    var walk = function (path, fileList, folderList) {
        try {
            fs.readdirSync(path).forEach(function (item) {
                var tmpPath = path + '/' + item, stats = fs.statSync(tmpPath);
                if (stats.isDirectory()) {
                    walk(tmpPath, fileList, folderList);
                    folderList.push(tmpPath);
                    fn && fn(tmpPath, false);
                } else {
                    fileList.push(tmpPath);
                    fn && fn(tmpPath, true);
                }
            });
        } catch (e) {
        }
    };
    walk(path, fileList, folderList);
};
file.prototype.write = function (content) {
    var ps = Packet.promise();
    var dirpath = this.path;
    if (!fs.existsSync(dirpath)) {
        var pathtmp = "";
        var a = dirpath.split("/");
        for (var i = 0; i < a.length - 1; i++) {
            pathtmp += a[i];
            if (!fs.existsSync(pathtmp)) {
                fs.mkdirSync(pathtmp);
            }
            pathtmp += "/";
        }
        pathtmp = pathtmp + "/" + a[a.length - 1];
        fs.open(pathtmp, "w", function () {
            fs.writeFile(dirpath, content);
            ps.resolve();
        });
    } else {
        fs.writeFile(dirpath, content);
        ps.resolve();
    }
    return ps;
};
file.prototype.getAllSubFilesPath = function () {
    var ps = Packet.promise();
    var path = this.path;
    var fileList = [];
    var walk = function (path, fileList) {
        try {
            fs.readdirSync(path).forEach(function (item) {
                var tmpPath = path + item, stats = fs.statSync(tmpPath);
                if (stats.isDirectory()) {
                    walk(tmpPath + "/", fileList);
                } else {
                    fileList.push(tmpPath);
                }
            });
        } catch (e) {
        }
    };
    walk(path, fileList);
    ps.resolve(fileList);
    return ps;
};
file.prototype.getAllSubFilesPathWithSuffix = function (suffix) {
    var ps = Packet.promise(), r = [];
    this.getAllSubFilesPath().done(function (files) {
        files.forEach(function (p) {
            if (suffix === "*") {
                r.push(p);
            } else if (p.substring(p.length - suffix.length) === suffix) {
                r.push(p);
            }
        });
        ps.resolve(r);
    });
    return ps;
};
file.prototype.getSubFilesPath = function () {
    var tmpPath = this.path, ps = Packet.promise(), r = [];
    try {
        var stats = fs.statSync(tmpPath);
        if (stats.isDirectory()) {
            fs.readdirSync(tmpPath).forEach(function (item) {
                var tmpPath = tmpPath + '/' + item;
                var stats = fs.statSync(tmpPath);
                if (!stats.isDirectory()) {
                    r.push(tmpPath);
                }
            });
            ps.resolve(r);
        } else {
            ps.resolve([]);
        }
    } catch (e) {
        ps.resolve([]);
    }
    return ps;
};
file.prototype.getSubFoldersPath = function () {
    var tmpPath = this.path, ps = Packet.promise(), r = [];
    try {
        var stats = fs.statSync(tmpPath);
        if (stats.isDirectory()) {
            fs.readdirSync(tmpPath).forEach(function (item) {
                var tmpPathp = tmpPath + '/' + item;
                var stats = fs.statSync(tmpPathp);
                if (stats.isDirectory()) {
                    r.push(tmpPathp);
                }
            });
            ps.resolve(r);
        } else {
            ps.resolve([]);
        }
    } catch (e) {
        ps.resolve([]);
    }
    return ps;
};
file.prototype.getSubPaths = function () {
    var tmpPath = this.path, ps = Packet.promise(), f = [], fd = [];
    try {
        var stats = fs.statSync(tmpPath);
        if (stats.isDirectory()) {
            fs.readdirSync(tmpPath).forEach(function (item) {
                var tmpPathp = tmpPath + '/' + item;
                var stats = fs.statSync(tmpPathp);
                if (stats.isDirectory()) {
                    fd.push(tmpPathp);
                } else {
                    f.push(tmpPathp);
                }
            });
            ps.resolve({
                file: f,
                folder: fd
            });
        } else {
            ps.resolve({
                file: [],
                folder: []
            });
        }
    } catch (e) {
        ps.resolve({
            file: [],
            folder: []
        });
    }
    return ps;
};
file.prototype.getSubFilesPathWithSuffix = function (suffix) {
    var tmpPath = this.path, ps = Packet.promise(), r = [];
    try {
        var stats = fs.statSync(tmpPath);
        if (stats.isDirectory()) {
            files = fs.readdirSync(tmpPath);
            files.forEach(function (item) {
                var p = tmpPath + item;
                var stats = fs.statSync(p);
                if (!stats.isDirectory()) {
                    if (suffix === "*") {
                        r.push(p);
                    } else if (p.substring(p.length - suffix.length) === suffix) {
                        r.push(p);
                    }
                }
            });
            ps.resolve(r);
        } else {
            ps.resolve(r);
        }
    } catch (e) {
        ps.resolve(r);
    }
    return ps;
};
file.prototype.hash = function () {
    try {
        if (fs.statSync(this.path).isFile()) {
            return hash.md5(fs.readFileSync(this.path));
        }
    } catch (e) {
    }
    return "";
};
file.prototype.lastModified = function () {};
Packet.file = function (path) {
    return new file(path);
};

var path = function (path, isfolder) {
    if (isfolder === undefined) {
        isfolder = true;
    }
    if (isfolder) {
        path = path.replace(/\\/g, "/");
        if (path[path.length - 1] !== "/") {
            path = path + "/";
        }
    }
    this.path = path;
    this.isfolder = isfolder;
};
path.prototype.parent = function () {
    var a = this.path.split("/");
    a.splice(a.length - 2, 2);
    return new path(a.join("/") + "/");
};
path.prototype.getPath = function () {
    return this.path;
};
path.prototype.toString = function () {
    return this.path;
};
path.prototype.suffix = function () {
    var n = this.path.split("."), suffix = "";
    if (n.length > 1) {
        suffix = n[n.length - 1] || "";
    }
    return suffix;
};
path.prototype.suffixWith = function (suffix) {
    return this.suffix() === suffix;
};
path.prototype.getRelativePathInfo = function (path) {
    var base = this.path;
    var r = "", suffix = "", c = path.split("/"), folder = false;
    var n = c[c.length - 1].match(/\*\.[a-zA-Z*]+/);
    if (n) {
        c.splice(c.length - 1, 1);
        path = c.join("/") + "/";
        suffix = n[0].substring(2);
        folder = true;
    }
    if (path[0] === "." && path[1] === "/") {
        r = base + path.substring(2);
    } else {
        var a = path.match(/\.\.\//g), b = base.split("/");
        if (a) {
            b.splice(b.length - a.length - 1, a.length + 1);
            path = path.substring(a.length * 3);
            if (b.length > 0) {
                r = b.join("/") + "/" + path;
            } else {
                r = path;
            }
        } else {
            if (path[0] === "/") {
                r = base + path;
            } else {
                r = base + "/" + path;
            }
        }
    }
    return {
        path: r,
        suffix: suffix,
        folder: folder
    };
};
Packet.path = function (p, isfolder) {
    return new path(p, isfolder);
};

var adapt = function () {
};
adapt._invoke = function (propName, pars) {
    var parent = this.__adapt__._factory.mapping[this.__adapt__._parent];
    var self = this.__adapt__._factory.mapping[this.__adapt__._type];
    var pp = [], ths = this;
    if (parent && parent.prototype[propName]) {
        var b = parent.prototype[propName];
        if (Packet.is.isFunction(b)) {
            var _a = new parent();
            var _c = Object.keys(this);
            for (var i = 0; i < _c.length; i++) {
                _a[_c[i]] = this[_c[i]];
            }
            for (var i in self.prototype) {
                if (Packet.is.isFunction(self.prototype[i])) {
                    if (i !== propName) {
                        pp.push(i);
                        (function (mp) {
                            _a[mp] = function () {
                                return ths[mp].apply(ths, Array.prototype.slice.call(arguments));
                            };
                        })(i);
                    }
                } else {
                    pp.push(i);
                    _a[i] = this[i];
                }
            }
            try {
                var r = b.apply(_a, pars), l = Object.keys(_a);
                for (var i = 0; i < l.length; i++) {
                    if (pp.indexOf(l[i]) === -1) {
                        this[l[i]] = _a[l[i]];
                    }
                }
                return r;
            } catch (e) {
                console.error(e.message);
                return null;
            }
        } else {
            return b;
        }
    } else {
        return undefined;
    }
};
adapt.prototype.privator = function (name) {
    var a = this.__adapt__._private["_" + name];
    if (a) {
        var paras = Array.prototype.slice.call(arguments);
        paras.splice(0, 1);
        return a.apply(this, paras);
    } else {
        return null;
    }
};
adapt.prototype.staticor = function (name, scope) {
    var a = this.__adapt__._static["__" + name];
    if (Packet.is.isFunction(a)) {
        var paras = Array.prototype.slice.call(arguments);
        paras.splice(0, 2);
        return a.apply(scope, paras);
    } else {
        return a;
    }
};
adapt.prototype.type = function () {
    return this.__adapt__._type;
};
adapt.prototype.shortName = function () {
    return this.__adapt__._shortName;
};
adapt.prototype.packet = function () {
    return this.__adapt__._packet;
};
adapt.prototype.typeOf = function (type) {
    return this.__adapt__._mapping[type] !== undefined;
};
adapt.prototype.extendsOf = function (type) {
    for (var i in this.__adapt__._extendslink) {
        if (this.__adapt__._extendslink[i] === type) {
            return true;
        }
    }
    return false;
};
adapt.prototype.factory = function () {
    return this.__adapt__._factory;
};
adapt.prototype.clean = function () {
    this.__adapt__._factory = null;
    var keys = Object.keys(this);
    for (var i in keys) {
        this[keys[i]] = null;
    }
};
adapt.prototype.isSingleton = function () {
    return this.__adapt__._singleton;
};
adapt.prototype.superClass = function (propName) {
    var pars = Array.prototype.slice.call(arguments);
    pars.splice(0, 1);
    return adapt._invoke.call(this, propName, pars);
};
adapt.prototype.invokeClass = function (className, propName) {
    var pars = Array.prototype.slice.call(arguments);
    pars.splice(0, 2);
    return adapt._invoke.call(this, propName, pars);
};
Object.defineProperty(adapt.prototype, "__adapt__", {
    enumerable: false,
    configurable: false,
    writable: false,
    value: {
        _type: "adapt",
        _shortName: "adapt",
        _packet: "",
        _parent: null,
        _factory: null,
        _private: null,
        _static: null,
        _option: null,
        _mapping: {},
        _original_option: [],
        _instance_props: ["privator", "staticor", "type", "shortName", "packet", "typeOf", "factory", "clean", "superClass"],
        _extendslink: []
    }
});
var factory = function () {
    this.mapping = {
        adapt: adapt
    };
};
var fsingleton = {};
factory.a = /^(init)$|^_\w*/;
factory.b = /^(name)|(extend)|(option)/;
factory.c = /^(packet)|(layout)/;
factory.d = /^__/;
factory.e = /^_/;
factory.prototype.def = function (obj) {
    var ab = new Function();
    var a = {
        _type: (obj.packet && obj.packet !== "" ? obj.packet + "." : "") + obj.name,
        _shortName: obj.name || "",
        _packet: obj.packet || "",
        _mapping: {adapt: 1},
        _extendslink: [],
        _instance_props: [],
        _private: {},
        _static: {},
        _factory: this,
        _singleton: obj.singleton === null ? obj.singleton : false,
        _option: obj.option || {},
        _original_option: []
    };
    a._mapping[a._type] = 1;
    for (var i in obj.option) {
        a._original_option.push(i);
    }
    var prpt = new adapt();
    !obj.extend && (obj.extend = ["adapt"]);
    var array = obj.extend;
    Packet.is.isString(obj.extend) && (array = [obj.extend]);
    a._parent = array[0];
    var c = Packet.extend({}, Packet.json.clone(this.mapping[array[0]].prototype.__adapt__._option));
    a._option = Packet.extend(c, a._option);
    for (var i = array.length - 1; i >= 0; i--) {
        if (array[i] !== "adapt") {
            var d = this.mapping[array[i]].prototype;
            var __mapping = {}, __private = {}, __static = {};
            Packet.extend(__mapping, Packet.json.clone(d.__adapt__._mapping));
            Packet.extend(__private, d.__adapt__._private);
            Packet.extend(__static, d.__adapt__._static);
            Packet.extend(a._mapping, __mapping);
            Packet.extend(a._private, __private);
            Packet.extend(a._static, __static);
            var q = Object.keys(d);
            for (var t = 0; t < q.length; t++) {
                if (Packet.is.isFunction(d[t])) {
                    if (!factory.a.test(t)) {
                        prpt[q[t]] = d[q[t]];
                    }
                } else {
                    prpt[q[t]] = d[q[t]];
                }
            }
        }
    }
    Object.defineProperty(prpt, "__adapt__", {
        enumerable: false,
        configurable: false,
        writable: false,
        value: a
    });
    for (var i in obj) {
        if (factory.d.test(i)) {
            a._static[i] = obj[i];
        } else {
            if (Packet.is.isFunction(obj[i])) {
                if (factory.e.test(i)) {
                    a._private[i] = obj[i];
                } else {
                    prpt[i] = obj[i];
                    if (i !== "init")
                        a._instance_props.push(i);
                }
            } else {
                if (!factory.b.test(i)) {
                    prpt[i] = obj[i];
                    if (!factory.c.test(i))
                        a._instance_props.push(i);
                }
            }
        }
    }
    ab.prototype = prpt;
    var k = ab;
    while (k) {
        a._extendslink.push(k.prototype.__adapt__._type);
        k = this.mapping[k.prototype.__adapt__._parent];
    }
    this.mapping[a._type] = ab;
    return this;
};
factory.prototype.get = function (name) {
    return this.mapping[name];
};
factory.prototype.create = function (type, option) {
    var objx = null, name = type;
    var clazz = this.mapping[name];
    if (clazz) {
        objx = new clazz();
        var _opp = Packet.extend({}, Packet.json.clone(clazz.prototype.__adapt__._option));
        objx.option = Packet.extend(_opp, option);
        for (var i = clazz.prototype.__adapt__._extendslink.length - 1; i >= 0; i--) {
            var p = this.mapping[clazz.prototype.__adapt__._extendslink[i]];
            if (p && p.prototype["init"]) {
                p.prototype["init"].call(objx, objx.option);
            }
        }
    }
    return objx;
};
factory.prototype.instance = function (type, option) {
    var objx = null, name = type;
    var clazz = this.mapping[name];
    if (clazz) {
        var sg = clazz.prototype.__adapt__._singleton;
        if (sg) {
            if (!fsingleton[type]) {
                var objxx = new clazz();
                var _opp = Packet.extend({}, Packet.json.clone(clazz.prototype.__adapt__._option));
                Packet.extend(_opp, option);
                objxx.option = _opp;
                fsingleton[type] = objxx;
            }
            objx = fsingleton[type];
        } else {
            objx = new clazz();
            var _opp = Packet.extend({}, Packet.json.clone(clazz.prototype.__adapt__._option));
            Packet.extend(_opp, option);
            objx.option = _opp;
        }
    }
    return objx;
};
factory.prototype.invoke = function (clazzName, methodName, scope) {
    var a = null;
    if (Packet.is.isString(clazzName)) {
        var j = this.mapping[clazzName];
        j && (a = new j());
    } else if (Packet.is.isObject(clazzName)) {
        a = clazzName;
    }
    if (a && a[methodName]) {
        if (Packet.is.isFunction(a[methodName]) && Packet.is.isObject(scope)) {
            var paras = Array.prototype.slice.call(arguments), keys = Object.keys(scope), obj = a;
            paras.splice(0, 3);
            for (var i = 0; i < keys.length; i++) {
                obj[keys[i]] = scope[keys[i]];
            }
            try {
                var r = obj[methodName].apply(obj, paras), n = Object.keys(obj);
                for (var i = 0; i < n.length; i++) {
                    scope[n[i]] = obj[n[i]];
                }
                return r;
            } catch (e) {
                console.error(e.message);
                return null;
            }
        }
    }
    return null;
};
factory.prototype.proxy = function (object, part, fn) {//fn(method)
    if (arguments.length > 1) {
        var some = null, proxy = null;
        if (Packet.is.isString(object)) {
            var _a = this.mapping[object];
            _a && (object = new _a());
        } else if (object instanceof adapt) {
            var _b = new this.mapping[object.__adapt__._type](), _c = Object.keys(object);
            for (var i = 0; i < _c.length; i++) {
                _b[_c[i]] = object[_c[i]];
            }
            object = _b;
        } else {
            object = null;
        }
        if (Packet.is.isObject(object)) {
            if (Packet.is.isArray(part)) {
                some = part;
                proxy = fn;
            } else if (Packet.is.isFunction(part)) {
                proxy = part;
            }
            var a = new this.mapping[object.__adapt__._type]();
            for (var i in object) {
                if (Packet.is.isFunction(object[i])) {
                    if (!some || some && some.indexOf(i) !== -1) {
                        (function (methodName) {
                            a[i] = function () {
                                var pars = arguments;
                                proxy && proxy.call(object, {
                                    methodName: methodName,
                                    invoke: function () {
                                        return object[methodName].apply(object, pars);
                                    }
                                });
                            };
                        })(i);
                    }
                } else {
                    a[i] = object[i];
                }
            }
            return a;
        } else {
            return null;
        }
    } else {
        return null;
    }
};
factory.prototype.has = function (clazzType) {
    return this.mapping[clazzType] !== undefined;
};

var modules = function (packet) {
    this.factory = new factory();
    this.packet = packet;
    this.modules = {};
};
modules.info = function () {
    var t = this.factory.mapping;
    for (var i in t) {
        this.modules[i] = new moduleInfo(this, t[i].prototype);
    }
};
modules.prototype.add = function (obj) {
    this.factory.def(obj);
    var ne = (obj.packet && obj.packet !== "" ? obj.packet + "." : "") + obj.name;
    var sobj = this.factory.get(ne).prototype;
    var cln = [obj.className || ""];
    for (var i = sobj.__adapt__._extendslink.length - 1; i >= 0; i--) {
        var b = this.factory.get(sobj.__adapt__._extendslink[i]);
        if (b) {
            var cn = b.prototype.className;
            if (cn && cn !== "") {
                if (cln.indexOf(cn) === -1) {
                    cln.push(cn);
                }
            }
        }
    }
};
modules.prototype.has = function (moduleName) {
    return  this.factory.has(moduleName);
};
modules.prototype.get = function (moduleName, option) {
    var ths = this;
    if (this.has(moduleName)) {
        return ths.factory.instance(moduleName, option);
    } else {
        return null;
    }
};
modules.prototype.getModules = function () {
    return this.modules;
};
modules.prototype.each = function (fn) {
    if (fn) {
        for (var i in this.modules) {
            var a = fn(this.modules[i], i);
            if (a === false) {
                break;
            }
        }
    }
};

var moduleInfo = function (container, protop) {
    this._fields = {};
    this._info = {};
    this._container = container;
    var keys = Object.keys(protop);
    keys.forEach(function (key) {
        this._fields[key] = protop[key];
    }.bind(this));
    keys = Object.keys(protop.__adapt__);
    keys.forEach(function (key) {
        if (key !== "_factory") {
            this._info[key] = protop.__adapt__[key];
        }
    }.bind(this));
};
moduleInfo.prototype.typeOf = function (type) {
    return this._info._mapping[type] !== undefined;
};
moduleInfo.prototype.type = function () {
    return this._info._type;
};
moduleInfo.prototype.shortName = function () {
    return this._info._shortName;
};
moduleInfo.prototype.packet = function () {
    return this._info._packet;
};
moduleInfo.prototype.extendsOf = function (type) {
    for (var i in this._info._extendslink) {
        if (this._info._extendslink[i] === type) {
            return true;
        }
    }
    return false;
};
moduleInfo.prototype.isSingleton = function () {
    return this._info._singleton;
};
moduleInfo.prototype.superClass = function () {
    var parent = this._info._parent;
    return this._container[parent];
};
moduleInfo.prototype.getPacketInfo = function () {
    return this._container.packet.getPacketInfo(this.packet());
};
moduleInfo.prototype.getFields = function () {
    return this._fields;
};

var packetInfo = function () {
    this._packets_ = {};
    this.exports = {};
    this._depends = [];
    this.children = [];
    this.packet = "";
    this.require = [];
    this.include = [];
    this.usestrict = false;
};
var packet = function (basepath) {
    this.basepath = basepath;
    this.packetmapping = [];
    this.requiremapping = {};
    this.packetDone = [];
    this.packetCode = {};
    this.option = {
        basepath: basepath
    };
    this.modules = new modules(this);
    this.packets = {};
};
packet.i = /\r\n/g;
packet.k = /\r/g;
packet.l = /\n/g;
packet.f = />[\s]+</g;
packet.isdot = /\./g;
packet.issuffix = /\[.*\]/g;
packet.isNote = /\/\*[\w\W]*?\*\//;
packet.isNoteall = /\/\*[\w\W]*?\*\//g;
packet.isInfo = /@([\s\S]*?);/g;
packet.isPacketTag = /["\']@[A-Za-z0-9_\[\]-]+\.[A-Za-z0-9_-]*["\']/g;
packet.isCurrentTag = /["\']@\.[A-Za-z0-9_-]+["\']/g;
packet.isPacket = /["\']@[A-Za-z0-9_\[\]-]+["\']/g;
packet.isOther = /["\']\\@[A-Za-z0-9_-]+["\']/g;
packet.deleteR = function (str) {
    for (var i = 0; i < 2; i++) {
        str = str.replace(/\n/, "");
    }
    return str;
};
packet.dependsSort = function (mapping) {
    var k = [], kk = [], ths = this;
    for (var i = 0; i < mapping.length; i++) {
        var a = mapping[i];
        a.dependTimes = a.info._depends.length;
        for (var j = 0; j < a.info._depends.length; j++) {
            var n = a.info._depends[j];
            if (ths.packetDone.indexOf(n) !== -1) {
                a.dependTimes = a.dependTimes - 1;
            }
        }
    }
    for (var i = 0; i < mapping.length; i++) {
        var a = mapping[i];
        if (a.dependTimes === 0 || a.info._depends.length === 0) {
            ths.packetDone.push(a.info.packet);
            k.push(a);
        } else {
            a.dependTimes = a.info._depends.length;
            kk.push(a);
        }
    }
    for (var i = 0; i < k.length; i++) {
        var a = k[i];
        for (var j = 0; j < kk.length; j++) {
            var b = kk[j];
            if (b.info._depends.indexOf(a.info.packet) !== -1) {
                b.dependTimes = b.dependTimes - 1;
                if (b.dependTimes <= 0) {
                    ths.packetDone.push(b.info.packet);
                    k.push(b);
                    kk.splice(j, 1);
                    break;
                }
            }
        }
    }
    for (var i = 0; i < kk.length; i++) {
        var a = kk[i];
        for (var j = 0; j < a.info._depends.length; j++) {
            var b = a.info._depends[j];
            if (ths.packetDone.indexOf(b) !== -1) {
                a.dependTimes = a.dependTimes - 1;
                if (a.dependTimes <= 0) {
                    ths.packetDone.push(a.packet);
                    k.push(a);
                    kk.splice(i, 1);
                    break;
                }
            }
        }
    }
    return k;
};
packet.getPacketInfo = function (str, basepath) {
    var a = str.match(packet.isNote), n = new packetInfo();
    if (a && a.length > 0) {
        var b = a[0];
        var tp = b.match(packet.isInfo);
        for (var o = 0; o < tp.length; o++) {
            var a = tp[o];
            var d = a.split(" ");
            if (d.length >= 2) {
                var key = d[0].substring(1, d[0].length), value = d[1][d[1].length - 1] === ";" ? d[1].substring(0, d[1].length - 1) : d[1], suffix = null;
                if (!n[key]) {
                    n[key] = [];
                }
                var u = value.match(packet.issuffix);
                if (u) {
                    suffix = u[0].substring(1, u[0].length - 1);
                }
                var t = value.split(":");
                if (t.length > 1) {
                    var mt = t[t.length - 1];
                    mt = mt.replace(packet.issuffix, "");
                    n._packets_[mt] = t[0];
                    t.splice(t.length - 1, 1);
                    value = t.join(":");
                } else {
                    var m = t[0].split("\.");
                    var mt = m[m.length - 1];
                    mt = mt.replace(packet.issuffix, "");
                    n._packets_[mt] = t[0];
                }
                switch (key) {
                    case "packet":
                        n.packet = value.replace(packet.issuffix, "");
                        n["path"] = basepath + n.packet.replace(packet.isdot, "/") + ".js";
                        break;
                    case "require":
                        value = {
                            packet: value.replace(packet.issuffix, ""),
                            path: "",
                            value: null
                        };
                        n._depends.push(t[0]);
                        n.children.push(t[0]);
                        value.path = basepath + t[0].replace(packet.issuffix, "").replace(packet.isdot, "/") + ".js";
                        break;
                    case "include":
                        value = {
                            packet: value.replace(packet.issuffix, ""),
                            path: "",
                            value: null
                        };
                        n.children.push(t[0]);
                        value.path = basepath + t[0].replace(packet.issuffix, "").replace(packet.isdot, "/") + ".js";
                        break;
                    default:
                        n[key] = value;
                        break;
                }
                if (n[key].indexOf(value) === -1) {
                    n[key].push(value);
                }
            }
        }
    } else {
        n.packet = "nopacket";
    }
    return n;
};
packet.replacePacketNames = function (info, code) {
    return code.replace(packet.isPacketTag, function (str) {
        var a = str.split("\."), index = 0, key = a[1].substring(0, a[1].length - 1), index = a[0].substring(2);
        if (info._packets_[index]) {
            return str[0] + info._packets_[index] + "." + key + str[str.length - 1];
        } else {
            throw Error("[Packet] packet can not find with tag of " + str + ",packet is " + info.packet);
        }
    }).replace(packet.isCurrentTag, function (str) {
        return str[0] + info.packet + "." + str.split("\.")[1];
    }).replace(packet.isPacket, function (str) {
        var index = str.substring(2, str.length - 1);
        if (info._packets_[index]) {
            return str[0] + info._packets_[index] + str[str.length - 1];
        } else {
            throw Error("[Packet] packet can not find with tag of " + str + ",packet is " + info.packet);
        }
    }).replace(packet.isOther, function (str) {
        return str.substring(1);
    });
};
packet.run = function (packetName) {
    var info = [], ths = this, basepath = this.basepath;
    var t = function (code) {
        var aa = packet.getPacketInfo(code, basepath);
        code = packet.replacePacketNames(aa, code);
        info.push({
            info: aa,
            code: code
        });
        for (var i = 0; i < aa.require.length; i++) {
            t(ths.packetCode[aa.require[i].packet]);
        }
    };
    var path = this.basepath + packetName.replace(packet.isdot, "/") + ".js";
    t(this.packetCode[packetName], path, info);

    var re = packet.dependsSort.call(this, info);
    if (re.length === info.length) {
        for (var i = 0; i < info.length; i++) {
            var d = info[i].info;
            ths.requiremapping[d.packet] = d;
            var xp = info[i].code, xcode = "";
            xp = packet.deleteR(xp) + "packet.is.isEmptyObject(module.exports)?(module.exports=exports):'';";
            if (d.usestrict === "true") {
                d.usestrict = true;
                xcode = "\"use strict\";" + xp + "//# sourceURL=" + d.path;
            } else {
                xcode = xp + "//# sourceURL=" + d.path;
            }
            try {
                d["basePath"] = ths.basepath;
                d["folder"] = d.path.substring(0, d.path.lastIndexOf("/")) + "/";
                new Function("Module", "module", "exports", "require", xcode).call(
                        d, function (obj) {
                            packet.module.call(ths, obj, d);
                        }, d, {},
                        function (packetName) {
                            var ap = ths.requiremapping[packetName];
                            if (ap) {
                                return ap.exports;
                            } else {
                                return require(packetName);
                            }
                        });
            } catch (e) {
                console.error("[Packet] packet import error name of " + d.packet + " path of " + d.path + " Message:" + e.stack);
            }
        }
        ths.packetmapping.push(path);
    } else {
        throw Error("[Packet] packet _depends error,maybe has circle _depends,or some file has no packet info.");
    }
};
packet.module = function (obj, info) {
    obj.packet = info.packet;
    this.modules.add(obj);
};
packet.loadAll = function (mapping) {
    this.packets = mapping;
    var t = {}, r = [], m = [];
    for (var i in mapping) {
        t[i] = mapping[i]._depends;
    }
    var sort = [];
    var sort = function (a) {
        for (var i in t) {
            var b = t[i].indexOf(a);
            if (b !== -1) {
                return i;
            }
        }
    };
    for (var i in t) {
        var n = sort(i);
        if (!n) {
            if (t[i].length > 0) {
                r.push(i);
            } else {
                m.push(i);
            }
        }
    }
    var ths = this;
    r.forEach(function (i) {
        packet.run.call(ths, i);
    });
    m.forEach(function (i) {
        packet.run.call(ths, i);
    });
    modules.info.call(this.modules);
};
packet.prototype.parseCode = function (codetext) {
    var info = [], a = packet.isNoteall.exec(codetext);
    while (a) {
        var _packet = a[0].match(/@packet .*;/);
        if (_packet) {
            var ab = _packet[0].substring(8, _packet[0].length - 1).split(" ");
            _packet = ab[0];
            info.push({
                index: a.index,
                packet: _packet
            });
        }
        a = packet.isNoteall.exec(codetext);
    }
    for (var i = 0; i < info.length; i++) {
        var end = info[i + 1] ? info[i + 1].index : codetext.length;
        this.packetCode[info[i].packet] = codetext.substring(info[i].index, end);
    }
    var t = {};
    for (var i in this.packetCode) {
        t[i] = packet.getPacketInfo.call(this, this.packetCode[i]);
    }
    packet.loadAll.call(this, t);
};
packet.prototype.getModuleContainer = function () {
    return this.modules;
};
packet.prototype.getPacketInfo = function (packetName) {
    return this.packets[packetName] || {};
};
Packet.packet = function (basepath) {
    return new packet(basepath);
};

var template = function (temp, macro) {
    temp = template.cache(temp);
    var a = template.precompile(temp);
    this._scope = a.info;
    this._code = template.code(a.template);
    this._fn = template.compile(this._code);
    this._session = null;
    this._caching = {};
    this._macrofn = macro || {};
    Packet.extend(this._macrofn, template.globalMacro);
};
template.a = /&lt;%/g;
template.b = /%&gt;/g;
template.c = /&quot;/g;
template.d = /<%|%>/g;
template.e = /^=.*;$/;
template.f = />[\s]+</g;
template.g = /\{\{.*\}\}/;
template.h = /\<\!\-\-[\s\S]*?\-\-\>/g;
template.j = /\{\{|\}\}/;
template.i = /\r\n/g;
template.k = /\r/g;
template.l = /\n/g;
template.m = /"/g;
template.ch = /@cache\(.*?\)/g;
template.globalMacro = {
    include: function (attrs, render) {
        var p = new template(attrs.template);
        var t = p.render(attrs.data);
        for (var i in p._caching) {
            this._caching[i] = p._caching[i];
        }
        return t;
    }
};
template.code = function (temp) {
    var fn = "var out='';";
    var tp = temp.replace(template.a, "<%").replace(template.b, "%>").split(template.d);
    for (var index = 0; index < tp.length; index++) {
        var e = tp[index];
        index % 2 !== 0 ? (template.e.test(e) ? (fn += "out+" + e) : (fn += e)) : (fn += "out+=\"" + e.replace(template.m, '\\"') + "\";");
    }
    fn += "return out;";
    return fn;
};
template.compile = function (code) {
    try {
        return  new Function("data", "fn", code);
    } catch (e) {
        console.error("[template error] " + e.message);
        console.info("[template result] " + code);
        return function () {
            return "";
        };
    }
};
template.precompile = function (str) {
    str = str.replace(template.h, "").replace(template.f, "><").replace(template.i, "").replace(template.k, "").replace(template.l, "");
    if (str.indexOf("<@") !== -1) {
        var i = -1, current = "", state = "start", tagname = "", propname = "", propnamestart, propvalue = "";
        var isbody = true, endtagname = "", props = {}, tagindex = 0, tagendindex = 0, endtagindex = 0, endtagendindex = 0, obj = [];
        while (i < str.length) {
            i++;
            current = str[i];
            if (state === "start" && current === "<" && str[i + 1] === "@") {
                state = "tagstart";
                tagindex = i;
                continue;
            }
            if (state === "tagstart" && current === "@") {
                state = "tagname";
                tagname = "";
                props = {};
                continue;
            }
            if (state === "start" && current === "<" && str[i + 1] === "/" && str[i + 2] === "@") {
                endtagindex = i;
                state = "endtag";
                endtagname = "";
                i += 2;
                continue;
            }
            if (state === "endtag" && current === ">") {
                state = "start";
                endtagendindex = i + 1;
                obj.push({
                    type: "endtag",
                    tagname: endtagname,
                    start: endtagindex,
                    end: endtagendindex
                });
                continue;
            }
            if (state === "tagname" && current === " ") {
                state = "propname";
                propname = "";
                continue;
            }
            if (state === "tagname" && (current === "/" || current === ">")) {
                if (current === ">") {
                    tagendindex = i + 1;
                    state = "start";
                    isbody = true;
                } else if (current === "/") {
                    tagendindex = i + 2;
                    state = "start";
                    isbody = false;
                }
                if (tagname !== "") {
                    obj.push({
                        type: "tag",
                        tagname: tagname,
                        props: props,
                        body: isbody,
                        start: tagindex,
                        end: tagendindex
                    });
                }
                continue;
            }
            if (state === "propname" && current === "=") {
                state = "propvalue";
                continue;
            }
            if (state === "propvalue" && (current === "'" || current === "\"")) {
                state = "propvalueing";
                propnamestart = current;
                propvalue = "";
                continue;
            }
            if (state === "propvalueing" && current === propnamestart) {
                state = "tagname";
                props[propname] = propvalue;
                continue;
            }
            if (state === "endtag") {
                endtagname += current;
            }
            if (state === "tagname") {
                tagname += current;
            }
            if (state === "propname") {
                propname += current;
            }
            if (state === "propvalueing") {
                propvalue += current;
            }
        }
        var index = 0, start = 0, end = 0, inner = false, current = null, result = [], t = "", startin = 0, info = [];
        for (var i in obj) {
            if (obj[i].type === "tag" && obj[i].body === false && inner === false) {
                obj[i].bodystr = "";
                obj[i].from = obj[i].start;
                obj[i].to = obj[i].end;
                result.push(obj[i]);
            }
            if (obj[i].type === "tag" && obj[i].body === true) {
                inner = true;
                if (current === null) {
                    current = obj[i];
                    current.from = obj[i].start;
                }
                if (index === 0) {
                    start = obj[i].start;
                    end = obj[i].end;
                }
                index++;
            }
            if (obj[i].type === "endtag") {
                index--;
                if (index === 0) {
                    current.to = obj[i].end;
                    current.bodystr = str.substring(end, obj[i].start);
                    result.push(current);
                    current = null;
                    inner = false;
                }
            }
        }
        for (var i in result) {
            var st = result[i].props, parameter = "";
            for (var tpp in st) {
                var np = st[tpp];
                if (template.g.test(np)) {
                    var qpp = np.split(template.j), cpp = "";
                    for (var ip = 1; ip <= qpp.length; ip++) {
                        if (ip % 2 === 0) {
                            if (qpp[ip - 1] !== "") {
                                cpp += qpp[ip - 1] + "+";
                            }
                        } else {
                            if (qpp[ip - 1] !== "") {
                                cpp += "'" + qpp[ip - 1] + "'+";
                            } else {
                                cpp += qpp[ip - 1];
                            }
                        }
                    }
                    var npp = (cpp.length > 0 ? cpp.substring(0, cpp.length - 1) : "''");
                    parameter += tpp + ":" + npp + ",";
                } else {
                    parameter += tpp + ":'" + st[tpp] + "',";
                }
            }
            result[i].parameter = "{" + (parameter.length > 0 ? parameter.substring(0, parameter.length - 1) : parameter) + "}";
            info.push({
                name: result[i].tagname,
                body: result[i].bodystr,
                parameter: result[i].parameter
            });
            var a = str.substring(startin, result[i].from);
            t += a;
            t += "<%=this._macro(" + i + (result[i].parameter === "" ? "" : "," + result[i].parameter) + ");%>";
            startin = result[i].to;
        }
        t += str.substring(startin, str.length);
        return {
            template: t,
            info: info
        };
    } else {
        return {template: str, info: []};
    }
};
template.cache = function (str) {
    return str.replace(template.ch, function (e) {
        var k = e.substring(7, e.length - 1);
        return "data-cache='<%=this._cache(" + k + ");%>'";
    });
};
template.prototype._cache = function (data) {
    var has = false;
    for (var i in this._caching) {
        if (this._caching[i] === data) {
            has = true;
            return i;
        }
    }
    if (!has) {
        var uuid = util.uuid();
        this._caching[uuid] = data;
        return uuid;
    }
};
template.prototype._macro = function (num, attr) {
    var n = this._scope[num], ths = this;
    if (this._macrofn[n.name]) {
        return this._macrofn[n.name].call(this, attr, function () {
            if (n.body !== "") {
                var inner = new template(n.body).macro(ths._macrofn);
                inner._caching = ths._caching;
                return inner.render.apply(inner, ths._session);
            } else {
                return "";
            }
        });
    } else {
        return "[nodata]";
    }
};
template.prototype.session = function () {
    if (arguments.length === 0) {
        return this._session;
    } else {
        this._session = arguments[0];
        return this;
    }
};
template.prototype.render = function () {
    this._session = Array.prototype.slice.call(arguments);
    return this._fn.apply(this, this._session);
};
template.prototype.flush = function (dom) {
    var ths = this;
    dom.find("[data-cache]").add(dom).each(function () {
        var c = $(this).dataset("cache");
        if (c) {
            $(this).data("-cache-", ths._caching[c]).removeAttr("data-cache");
        }
    });
};
template.prototype.code = function () {
    return this._code;
};
template.prototype.fn = function () {
    if (arguments.length === 1) {
        this._fn = arguments[0];
        return this;
    }
    return this._fn;
};
template.prototype.macro = function (name, fn) {
    if (arguments.length === 1) {
        this._macrofn = name || {};
    } else if (arguments.length === 2) {
        this._macrofn[name] = fn;
    }
    return this;
};
template.prototype.clean = function () {
    for (var i in this) {
        this[i] = null;
    }
};
Packet.template = function () {
    var temp = Array.prototype.slice.call(arguments).join("");
    return new template(temp);
};
Packet.setTemplateGlobalMacro = function (key, fn) {
    if (arguments.length === 1) {
        Packet.extend(template.globalMacro, key);
    } else if (arguments.length === 2) {
        template.globalMacro[key] = fn;
    }
    return this;
};


global.packet = Packet;