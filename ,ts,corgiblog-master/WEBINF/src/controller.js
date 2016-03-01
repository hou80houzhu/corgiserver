/*
 * @packet controller;
 */
Module({
    name: "test",
    extend: "controller",
    path: "/test",
    dao: "mysql",
    "/test": function (done) {
        this.request.setAttr("desc","this is thr desc of the url:/test/test");
        done(this.getCspView("index.csp",{data:"this is data"}));
    }
});