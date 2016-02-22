/*
 * @packet base.controller; 
 */
Module({
    name: "index",
    extend: "controller",
    path: "/",
    "/":function(done){
        done(this.getJsonView({
            aa: "aa"
        }));
    }
});
Module({
    name: "test",
    extend: "controller",
    path: "/test",
    "/test": function () {
        console.log("------controller---------");
    }
});
Module({
    name: "test2",
    extend: "controller",
    path: "/test/good",
    "/good": function (done) {
        done(this.getJsonView({
            aa: "aa"
        }));
    }
});
Module({
    name: "image",
    extend: "controller",
    path: "/images",
    "/icon": function (done) {
        done(this.getFileView(this.getProjectInfo().getProjectPath() + "images/aa.png"));
    }
});
Module({
    name: "template",
    extend: "controller",
    path: "/template",
    "/test": function (done) {
        console.log(this.request.getParameters());
        this.response.setCookie("aa", "cccc");
        done(this.getTemplateView("template.test.test", {name: "rendered..."}));
    }
});
Module({
    name: "db",
    extend: "controller",
    path: "/db",
    dao: "mysql",
    "/test": function (done) {
        var user = this.getTable("user");
        this.dao.query(user).done(function (data) {
            done(this.getTemplateView("template.db.user", {users: data}));
        }.bind(this)).fail(function () {
            done(this.getTemplateView("template.test.test", {name: "fucking..."}));
        });
    },
    "/test2": function (done) {
        this.dao.transaction().then(function () {
            console.log("-->insert one");
            return this.query("INSERT INTO user SET username=?,password=?", ["a", "a"]);
        }).then(function () {
            console.log("-->insert two");
            return this.query("INSERT INTO user SET username=?,password=?", ["b", "b"]);
        }).done(function (data) {
            console.log("-->done");
            done(this.getTemplateView("template.test.test", {name: "fucking..."}));
        }.bind(this));
    }
});
Module({
    name: "session",
    extend: "controller",
    path: "/session",
    "/add": function (done) {
        if (!this.request.getSession().hasAttribute("test")) {
            this.request.getSession().setAttribute("test", "fuck man");
            done(this.getStringView("not had"));
        } else {
            done(this.getStringView("founded"));
        }
    }
});
Module({
    name: "csp",
    extend: "controller",
    path: "/csp",
    "/test": function (done) {
        done(this.getCspView("test.html", {aa: "aa"}));
    }
});
Module({
    name:"request",
    extend:"controller",
    path:"/request",
    "/test":function(done){
        throw Error("fuck done");
        done(this.getRequestView("https://nodei.co/npm/request.png"));
    }
});