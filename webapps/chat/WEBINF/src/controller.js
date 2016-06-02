/*
 * @packet base.controller; 
 */
Module({
    name: "index",
    extend: "cometcontroller",
    path: "/comet",
    success: function (a) {
        if (arguments.length === 0) {
            return this.getJsonView({code: "1"});
        } else {
            return this.getJsonView({code: "1", data: a});
        }
    },
    error: function (msg) {
        if (arguments.length === 0) {
            return this.getJsonView({code: "0"});
        } else {
            return this.getJsonView({code: "0", msg: msg});
        }
    },
    "/read": function (done) {
        var ths = this, id = this.request.getParameter("id");
        this.getCometService().read(id, function (msg) {
            done(ths.success(msg));
        });
    },
    "/write": function (done) {
        this.getCometService().broadcast(this.request.getParameter("msg"));
        done(this.success());
    },
    "/join": function (done) {
        var username = this.request.getParameter("username");
        if (!this.getCometService().check(username)) {
            var online = [];
            this.getCometService().each(function () {
                online.push({
                    id:this.getChannelId()
                });
            });
            this.getCometService().join(username);
            this.getCometService().broadcast({
                type:"userlogin",
                id:username
            });
            done(this.success(online));
        } else {
            done(this.error("You are in chat,check it."));
        }
    },
    "/send":function(done){
        var msg = this.request.getParameter("msg"), id = this.request.getParameter("id"), to = this.request.getParameter("to");
        this.getCometService().write(to, {
            id: id,
            msg: msg,
            type: "message",
            form:id
        });
        done(this.success());
    },
    "/sendto": function (done) {
        var msg = this.request.getParameter("msg"), id = this.request.getParameter("id");
        this.getCometService().broadcastWithout(id, {
            username: id,
            msg: msg,
            type: "broadcast"
        });
        done(this.success());
    },
    "/quit": function (done) {
        this.getCometService().quit(this.request.getParameter("id"));
        done(this.success());
    }
});