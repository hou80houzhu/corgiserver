/*
 * @packet test; 
 * @require test2;
 */
//console.log("============>>test");
//console.log(module);
//console.log(Module);
var fs=require("fs");
Module({
    name:"bb",
    pp:function(){
        console.log("=============>>>>>>>>pp");
    }
});
Module({
    name:"aa",
    extend:"@.bb",
    init:function(){
        console.log(">>>>>>"+require("@test2").test());
        this.pp();
        console.log(fs);
    }
});