var channels = require('./channels');


channels.init({
//  seeds:['164.40.143.34:7777'],
//	seeds:['172.16.200.253:7777'],
//	seeds:['127.0.0.1:7777'],
	ready:function(){
		connect();
	}		
});

function connect(){

	channels.connect("telehash.echo.server", onConnect );
}

function onConnect( server ){
    this.packets=0;
	console.log("CONNECTED");
	server.data = function(msg){
		this.packets++;
		console.log(this.packets+": data from server: " + msg.toString()+"on channel:"+server.channel);
	}

	setInterval( function(){				
		server.send( new Buffer("Hello!") );
	},5000);
}


