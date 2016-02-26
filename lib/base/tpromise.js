var tpromise = function (fn) {
    this._complete = null;
    this._error = null;
    this._queue = bright.queue();
    this._tasks = [];
    this._scope = null;
    this._fail = null;
    this._done = null;
    var ths = this;
    setTimeout(function () {
        if (fn) {
            fn(function (a) {
                ths.resolve(a);
            }, function (a) {
                ths.reject(a);
            });
        }
    });
};
tpromise.run = function (a) {
    var ths = this;
    this._tasks.forEach(function (fn) {
        this._queue.add(function (c, b) {
            var e = b.fn.call(b.scope, c);
            if (e instanceof tpromise) {
                e._done = function (p) {
                    b.tps._queue.next(p);
                };
                e._error = function (m) {
                    b.tps.reject(m);
                };
            } else {
                this.next(e);
            }
        }, function () {
            this.next();
        }, {
            scope: this._scope,
            fn: fn,
            tps: this
        });
    }.bind(this));
    this._queue.add(function (a) {
        var thss = this;
        if (ths._complete) {
            ths._complete(a, function (b) {
                thss.next(b);
            });
        } else {
            thss.next(a);
        }
    }, function () {
        this.next();
    });
    this._queue.complete(function (a) {
        if (this._done) {
            try {
                this._done(a);
            } catch (e) {
                this.reject(e);
            }
        }
    }.bind(this));
    this._queue.run(a);
};
tpromise.prototype.scope = function (scope) {
    this._scope = scope;
};
tpromise.prototype.then = function (fn) {
    if (fn) {
        this._tasks.push(fn);
    }
    return this;
};
tpromise.prototype.done = function (fn) {
    this._done = fn;
    return this;
};
tpromise.prototype.fail = function (fn) {
    this._fail = fn;
    return this;
};

tpromise.prototype.resolve = function (a) {
    tpromise.run.call(this, a);
};
tpromise.prototype.reject = function (e) {
    try {
        this._error && this._error(e);
        this._queue.clean();
        this._fail && this._fail(e);
    } catch (e) {
        console.error(e.stack);
    }
};

tpromise.prototype.oncomplete = function (fn) {
    if (!this._complete) {
        this._complete = fn;
    }
    return this;
};
tpromise.prototype.onerror = function (fn) {
    if (!this._error) {
        this._error = fn;
    }
    return this;
};

module.exports = function (fn) {
    return new tpromise(fn);
};