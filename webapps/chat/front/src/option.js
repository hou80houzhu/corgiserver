/* 
 * @packet option;
 * @require base;
 * @require chat;
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
Option({
    name:"chat",
    option:{
        override:{
            onendinit:function(){
                this.addChild({
                    type:"@chat.chatlogin"
                });
            },
            event_loginend:function(e){
                this.getFirstChild().remove();
                this.addChild({
                    type:"@chat.chatcontainer",
                    option:e.data
                });
            }
        }
    }
});
