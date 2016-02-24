/* 
 * @packet controller;
 */
Module({
    name: "base",
    extend: "controller",
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
    }
});
Module({
    name: "todo",
    extend: "@.base",
    path: "/todo",
    dao: "mysql",
    "/add": function (done) {
        var ths=this;
        this.dao.transaction().then(function(){
            return this.add(ths.getTable("main").with(ths.request).set("time", new Date().getTime()));
        }).done(function(c){
            done(ths.success(c.get()));
        }).fail(function(e){
            done(ths.getDefaultPageView("500",e.stack));
        });
    },
    "/remove": function (done) {
        this.dao.remove(this.getTable("main").with(this.request)).done(function () {
            done(this.success());
        }.bind(this));
    },
    "/list": function (done) {
        this.dao.find(this.getTable("main")).done(function (a) {
            done(this.success(a));
        }.bind(this));
    }
});

