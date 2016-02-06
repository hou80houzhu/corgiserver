/* 
 * @packet filter;
 */
Module({
    name:"testfilter",
    extend:"filter",
    doFilter:function(view,done,end){
        end(this.getModule("defaultPageView",{request:this.request,response:this.response,code:"404"}));
    }
});

