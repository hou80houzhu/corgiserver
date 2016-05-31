/* 
 * @packet option;
 * @require base;
 */
Option({
    name:"root",
    option:{
        override_onendinit:function(){
            this.addChild({
                type:"@base.chats"
            });
        }
    }
});

