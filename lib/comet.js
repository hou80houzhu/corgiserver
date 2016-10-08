var topolr=require("../bin/topolr");
var channel = function (id, keeptime) {
    this.channelId = id;
    this.callback = null;
    this.keeptime = keeptime;
    this.session = {};
    this.time = new Date().getTime();
    this.msg=[];
};
channel.prototype.isActive = function () {
    var a = new Date().getTime() - this.time;
//    console.log(a+"----"+this.time+"----"+this.keeptime+"----"+(this.keeptime+1000));
    return a < this.keeptime + 10000;
};
channel.prototype.isChannelId = function (id) {
    return this.channelId === id;
};
channel.prototype.setCallBack = function (fn) {
    var ths = this;
    this.callback = fn;
    clearTimeout(this.tid);
    this.time = new Date().getTime();
    if(this.msg.length===0){
        this.tid = setTimeout(function () {
            ths.callback && ths.callback({
                type:"nodata"
            });
        }, this.keeptime);
    }else{
        ths.callback&&ths.callback(this.msg.pop());
    }
    return this;
};
channel.prototype.getAttr = function (key) {
    return this.session[key];
};
channel.prototype.setAttr = function (key, obj) {
    this.session[key] = obj;
    return this;
};
channel.prototype.getAttrs = function () {
    return this.session;
};
channel.prototype.getChannelId = function () {
    return this.channelId;
};
channel.prototype.write = function (msg) {
    this.msg.push(msg);
    clearTimeout(this.tid);
    this.callback && this.callback(this.msg.pop());
};
channel.prototype.quit = function () {
    clearTimeout(this.tid);
    for (var i in this) {
        this[i] = null;
    }
};

Module({
    name: "comethandler",
    dao: "mysql",
    init: function () {
        this.dao = project.getService("daoservice").getDao(this.dao);
    },
    onquit: function (info) {
        this.getProjectInfo().getService("cometservice").broadcast({
            type:"userlogout",
            id:info.channelId
        });
    },
    getCometService:function(){
        return project.getService("cometservice");
    }
});
Module({
    name: "cometservice",
    extend: "service",
    option: {
        keeptime: 20000,
        handler: "comethandler"
    },
    start: function (done) {
        this.channels = {};
        this.handler = packetLoader.get(this.option.handler);
        this.handler.init();
        var ths = this;
        setInterval(function () {
            ths.clean();
        }, 3000);
        done();
    },
    check: function (id) {
        return this.channels[id] !== undefined;
    },
    join: function (cid) {
        var id = cid || topolr.util.uuid();
        this.channels[id] = new channel(id, this.option.keeptime, this);
        return id;
    },
    read: function (id, fn) {
        if (this.channels[id]) {
            this.channels[id].setCallBack(fn);
        } else {
            fn && fn({
                type:"offline"
            });
        }
        return this;
    },
    getChannel: function (id) {
        return this.channels[id];
    },
    write: function (id, msg) {
        if (this.check(id)) {
            this.getChannel(id).write(msg);
        }
        return this;
    },
    broadcast: function (msg) {
        for (var i in this.channels) {
            this.channels[i].write(msg);
        }
        return this;
    },
    broadcastWithout: function (id, msg) {
        for (var i in this.channels) {
            if (i !== id) {
                this.channels[i].write(msg);
            }
        }
        return this;
    },
    quit: function (id) {
        if (this.channels[id]) {
            this.channels[id].quit();
            delete this.channels[id];
        }
        return this;
    },
    clean: function () {
        for (var i in this.channels) {
            if (!this.channels[i].isActive()) {
                this.handler.onquit(this.channels[i]);
                this.channels[i].quit();
                delete this.channels[i];
            }
        }
    },
    each: function (fn) {
        if (fn) {
            for (var i in this.channels) {
                var t = fn.call(this.channels[i], i);
                if (t === false) {
                    break;
                }
            }
        }
    },
    getChannelList: function () {
        return this.channels;
    }
});
Module({
    name: "multicometservice",
    extend: "service",
    option: {
        keeptime: 20000,
        handler: "comethandler"
    },
    start: function (done) {
        this.channels = {};
        this.handler = packetLoader.get(this.option.handler);
        this.handler.init();
        var ths = this;
        setInterval(function () {
            ths.clean();
        }, 3000);
        done();
    },
    check: function (id) {
        return this.channels[id] !== undefined;
    },
    join: function (cid) {
        var id = cid || topolr.util.uuid();
        if (this.channels[cid]) {
            this.channels[cid].push(new channel(id, this.option.keeptime, this));
        } else {
            this.channels[cid] = [new channel(id, this.option.keeptime, this)];
        }
        return id;
    },
    read: function (id, fn) {
        if (this.channels[id]) {
            this.channels[id].forEach(function (a) {
                a.setCallBack(fn);
            });
        } else {
            fn && fn("join first");
        }
        return this;
    },
    getChannel: function (id) {
        return this.channels[id];
    },
    write: function (id, msg) {
        if (this.check(id)) {
            this.getChannel(id).forEach(function (a) {
                a.write(msg);
            });
        }
        return this;
    },
    broadcast: function (msg) {
        for (var i in this.channels) {
            this.channels[i].forEach(function (a) {
                a.write(msg);
            });
        }
        return this;
    },
    broadcastWithout: function (id, msg) {
        for (var i in this.channels) {
            if (i !== id) {
                this.channels[i].forEach(function (a) {
                    a.write(msg);
                });
            }
        }
        return this;
    },
    quit: function (id) {
        if (this.channels[id]) {
            this.channels[id].forEach(function (a) {
                a.quit();
            });
            delete this.channels[id];
        }
        return this;
    },
    clean: function () {
        for (var i in this.channels) {
            if (!this.channels[i]) {
                var t = false;
                for (var t in this.channels[i]) {
                    if (!this.channels[i][t].isActive()) {
                        this.channels[i][t].quit();
                        this.channels[i].splice(t, 1);
                    }
                }
                if (this.channels[i].length === 0) {
                    this.handler.onquit(this.channels[i]);
                    this.quit(i);
                }
            }
        }
    },
    each: function (fn) {
        if (fn) {
            for (var i in this.channels) {
                var t = fn.call(this.channels[i], i);
                if (t === false) {
                    break;
                }
            }
        }
    },
    getChannelList: function () {
        return this.channels;
    }
});
Module({
    name: "cometcontroller",
    extend: "controller",
    getCometService: function () {
        return this.getProjectInfo().getService("cometservice");
    }
});