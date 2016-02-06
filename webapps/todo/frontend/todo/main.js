/* 
 * @packet todo.main;
 * @template todo.template.tmp;
 * @css todo.style.style;
 * @css todo.style.main;
 */
Module({
    name: "base",
    extend: "viewgroup",
    className: "base",
    layout: module.getTemplate("@tmp", "base"),
    option: {
        template: module.getTemplate("@tmp", "list"),
        list: []
    },
    init: function () {
        var ths=this;
        this.observe("data", this.option);
        this.postRequest("todo/list").data(function(a){
            a.forEach(function(c){
                ths.option.list.push(c);
            });
        });
    },
    find_btn: function (dom) {
        var ths = this;
        dom.click(function () {
            var val = ths.finders("input").val();
            if (val !== "") {
                var ts=$(this);
                ts.addClass("loading");
                ths.postRequest("todo/add",{content:val}).data(function(a){
                    ths.option.list.push(a);
                    ts.removeClass("loading");
                });
            }
        });
    },
    group_item: function (dom) {
        var ths=this;
        dom.items("btn").click(function () {
            var t=$(this).group().cache();
            var ts=$(this);
            ts.addClass("loading");
            ths.postRequest("todo/remove",t).data(function(){
                t.remove();
                ts.removeClass("loading");
            });
        });
    },
    "data_list_add": function (e) {
        $.template(this.option.template).renderAppendTo(this.finders("body"), [e.value]);
        this.delegate();
    },
    "data_list_remove": function (e) {
        this.groups().eq(e.value[0].getIndex()).remove();
        this.delegate();
    }
});

Option({
    name: "root",
    option: {
        override_onendinit: function () {
            this.addChild({
                type: "@.base"
            });
        }
    }
});