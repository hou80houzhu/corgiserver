/* 
 * @packet comethandler;
 */
Module({
    name:"testhandler",
    extend:"comethandler",
    onquit:function(info){
        console.log("----quit----");
        console.log(info);
    }
});

