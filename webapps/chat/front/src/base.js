/* 
 * @packet base;
 * @template template.temp;
 * @css style.chat;
 */
Module({
    name: "chats",
    extend: "viewgroup",
    className: "chats",
    layout: module.getTemplate("@temp", "chats"),
    option: {
        type: "@.chat"
    },
    init: function () {
    }
});
Module({
    name: "chat",
    extend: "view",
    className: "chat",
    autoupdate: true,
    template: module.getTemplate("@temp", "chat"),
    init: function () {
        this.chatMessage = {
            username:"",
            message:[]
        };
        this.render(this.chatMessage);
    },
    find_login: function (dom) {
        var ths = this;
        dom.click(function () {
            var username = ths.finders("username").val();
            ths.postRequest(basePath + "comet/join", {username: username}).done(function (a) {
                this.id = a;
                this.chatMessage.username=a;
                this.read();
                this.finders("logincon").remove();
                this.update(this.chatMessage);
            }).fail(function(a){
                this.finders("logintip").html(a.msg);
            });
        });
    },
    find_send: function (dom) {
        var ths = this;
        dom.click(function () {
            var msg = ths.finders("msg").val();
            ths.chatMessage.message.push({
                username: ths.id,
                msg: msg
            });
            ths.update(ths.chatMessage);
            ths.finders("msg").val("");
            ths.finders("box").scrollTop(10000000);
            ths.sendTo(msg);
        });
    },
    read: function () {
        this.postRequest(basePath + "comet/read", {id: this.id}).done(function (a) {
            this.read();
            this.dispatchEvent("message", a);
        });
    },
    sendTo: function (msg) {
        this.postRequest(basePath + "comet/sendto", {id: this.id, msg: msg}).done(function (a) {
            console.log("send");
        });
    },
    event_message:function(e){
        if(e.data.type==="broadcast"){
            this.chatMessage.message.push(e.data);
            this.update(this.chatMessage);
            this.finders("box").scrollTop(10000000);
        }
    }
});
Module({
    name: "comet",
    extend: "view",
    option: {},
    init: function () {
        this.join();
    },
    join: function () {
        this.postRequest(basePath + "comet/join").done(function (a) {
            this.id = a;
            this.read();
        });
    },
    read: function () {
        this.postRequest(basePath + "comet/read", {id: this.id}).done(function (a) {
            console.log(a);
            this.dispatchEvent("message", a);
            this.read();
        });
    },
    write: function (a) {
        this.postRequest(basePath + "comet/write", $.extend({id: this.id}, a)).done(function (a) {
            console.log(a);
        });
    },
    quit: function () {
        this.postRequest(basePath + "comet/quit", {id: this.id}).done(function (a) {
            console.log("quit-%o", a);
        });
    },
    broadcast: function (a) {
        this.write(a);
    }
});

