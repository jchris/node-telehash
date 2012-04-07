var channels = require('./channels');


channels.init({
//	seeds:['164.40.143.34:7777'],
//	seeds:['172.16.200.253:7777'],
//	seeds:['127.0.0.1:7777'],
	ready:function(){
		server();		
	}		
});

function server(){
	channels.listen("telehash.echo.server", onConnect );
}

function onConnect( peer ){

	console.log("NEW CLIENT: "+peer.ipp+" channel:"+peer.channel);
	peer.data = function(msg){
	
		this.send(msg);//echo message back
		
	}
}
