/* 
 * @packet chat;
 * @template template.chatemp;
 * @css style.chatyle;
 */
Module({
    name: "chatlogin",
    extend: "view",
    className: "chatlogin",
    template: module.getTemplate("@chatemp", "chatlogin"),
    init: function () {
        this.render();
    },
    find_login: function (dom) {
        dom.click(function () {
            var un = this.finders("input").val();
            if (un) {
                this.postRequest(basePath + "comet/join", {username: un}).done(function (a) {
                    this.out().done(function () {
                        this.dispatchEvent("loginend", {
                            id: un,
                            onlines: a
                        });
                    }.bind(this));
                }).fail(function (a) {
                    $.toast(a.msg);
                });
            } else {
                $.toast("username can not empty.");
            }
        }.bind(this));
    },
    out: function () {
        var a = this.dom.transition().all();
        a.scope().css("opacity", 0);
        return a;
    }
});
Module({
    name: "chatcontainer",
    extend: "viewgroup",
    className: "chatcontainer",
    layout: module.getTemplate("@chatemp", "chatcontainer"),
    option: {
        chatlistType: "@.chatlist",
        id: "",
        onlines: []
    },
    onbeforeinit: function () {
        this.option[this.option.chatlistType] = {
            onlines: this.option.onlines
        };
    },
    init: function () {
        this.boxs={};
        this.read();
        this.currentbox=null;
    },
    read: function () {
        this.postRequest(basePath + "comet/read", {id: this.option.id}).done(function (a) {
            if(a.type&&a.type!=="offline"){
                this.read();
                this.dispatchEvent("message", a);
            }else{
                $.toast("You are offline!");
            }
        });
    },
    event_message: function (a) {
        var type = a.data.type;
        if (this["comet_" + type]) {
            console.log("---->"+type+"<------");
            this["comet_" + type](a.data);
        }
    },
    event_openbox:function(e){
        var info=e.data;
        this.currentbox=info.id;
        if(!this.boxs[info.id]){
            this.boxs[info.id]="in";
            this.addChild({
                type:"@.chatbox",
                option:{
                    id:this.option.id,
                    info:info
                },
                container:this.finders("boxcontainer")
            }).done(function(a){
                this.boxs[info.id]=a;
            });
        }else{
            for(var i in this.boxs){
                this.boxs[i].hide();
            }
            this.boxs[info.id].show();
        }
    },
    event_sendmsg:function(e){
        this.postRequest(basePath+"comet/send",{
            id:this.option.id,
            to:e.data.info.id,
            msg:e.data.msg
        }).done(function(){
            
        });
    },
    comet_userlogin: function (a) {
        this.getFirstChild().add(a.id);
    },
    comet_userlogout:function(a){
        this.getFirstChild().remove(a.id);
    },
    comet_message:function(e){
        var info=e;
        if(!this.boxs[info.id]){
            this.boxs[info.id]="in";
            this.addChild({
                type:"@.chatbox",
                option:{
                    id:this.option.id,
                    info:{id:info.id}
                },
                container:this.finders("boxcontainer")
            }).done(function(a){
                this.boxs[info.id]=a;
                if(this.currentbox!==null){
                    if(this.currentbox!==info.id){
                        a.hide();
                    }
                }
                a.addMessage(info);
            });
        }else{
            this.boxs[info.id].addMessage(info);
            if(this.currentbox!==info.id){
                this.getFirstChild().setstate(info);
            }
        }
    }
});
Module({
    name: "chatbox",
    extend: "view",
    className: "chatbox",
    autoupdate: true,
    option: {
        id:"",
        info:null
    },
    template: module.getTemplate("@chatemp", "chatbox"),
    init: function () {
        this.message = {
            id:this.option.id,
            info:this.option.info,
            message:[]
        };
        this.render(this.message);
    },
    find_send:function(dom){
        var ths=this;
        dom.click(function(){
            var msg=ths.finders("input").val();
            if(msg){
                ths.dispatchEvent("sendmsg",{
                    info:ths.option.info,
                    msg:msg
                });
                ths.addMessage({
                    id:ths.option.id,
                    msg:msg
                });
            }else{
                $.toast("Message can not empty!");
            }
        });
    },
    hide:function(){
        this.dom.hide();
    },
    show:function(){
        this.dom.show();
    },
    addMessage:function(a){
        this.message.message.push(a);
        this.update(this.message);
        this.finders("messbox").scrollTop(10000000000);
    }
});
Module({
    name: "chatlist",
    extend: "view",
    className: "chatlist",
    autoupdate: true,
    option: {
        onlines: []
    },
    template: module.getTemplate("@chatemp", "chatlist"),
    init: function () {
        this.render(this.option.onlines);
    },
    find_item:function(dom){
        var ths=this;
        dom.click(function(){
            $(this).removeClass("state");
            ths.dispatchEvent("openbox",$(this).cache());
        });
    },
    add: function (a) {
        this.option.onlines.push({
            id: a
        });
        this.update(this.option.onlines);
        $.toast("user "+a+" login now.");
    },
    remove:function(a){
        var istrue=false;
        for(var i in this.option.onlines){
            if(this.option.onlines[i].id===a){
                this.option.onlines.splice(i,1);
                istrue=true;
            }
        }
        if(istrue){
            $.toast("user "+a+" logout now.");
            this.update(this.option.onlines);
        }
    },
    setstate:function(info){
        this.finders("item").each(function(){
            if($(this).cache().id===info.id){
                $(this).addClass("state");
            }
        });
    }
});

$.toast = function (text) {
    $("<div class='toast'><div class='toast_text'>" + text + "</div></div>").appendTo("body").transition().set("-all-transform").done(function () {
        this.transition().removeAll().set("opacity", {time: 1000}).delay(2000).then(function () {
            this.css("opacity", 0);
        }).delay(1000).done(function () {
            this.remove();
        }).resolve();
    }).scope().transform().y(-150);
};
$.loadingbar = function () {
    var a = $("#loadingbar");
    if (a.length === 0) {
        a = $("<div id='loadingbar'>" +
                "<div class='loadingbar-bg'></div>" +
                "<div class='loadingbar-desc'></div></div>").appendTo("body");
    }
    return new loadingbar(a);
};
var loadingbar = function (dom) {
    this.dom = dom;
};
loadingbar.prototype.showLoading = function (text) {
    this.dom.children(1).html("<i class='fa fa-repeat fa-spin'></i> " + (text || 'Loading...'));
    return this;
};
loadingbar.prototype.showError = function (text) {
    var ps = $.promise(), ths = this;
    setTimeout(function () {
        ths.close();
        ps.resolve();
    }, 2000);
    this.dom.children(1).html("<i class='fa fa-circle-cross'></i> " + (text || '操作错误'));
    return ps;
};
loadingbar.prototype.showSuccess = function (text) {
    var ps = $.promise(), ths = this;
    setTimeout(function () {
        ths.close();
        ps.resolve();
    }, 2000);
    this.dom.children(1).html("<i class='fa fa-circle-check'></i> " + (text || '操作成功'));
    return ps;
};
loadingbar.prototype.close = function () {
    this.dom.remove();
};