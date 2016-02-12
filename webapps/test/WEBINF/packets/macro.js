/* 
 * @packet macro;
 */
Module({
    name:"do",
    extend:"service",
    start:function(done){
        brooder.setTemplateGlobalMacro("error",function(attr,render){
            var a="";
            try{
                var stack=attr.stack;
                stack.split("\n").forEach(function(p){
                    a+="<div>"+p+"</div>";
                });
            }catch(e){
                console.error(e.stack);
            }
            return a;
        });
        done();
    }
});
