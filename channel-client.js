var channels = require('./channels');

channels.init({
	ready:function(){
		connect();
	}		
});

function connect(){

	channels.connect("telehash.echo.server", onConnect );
}

function onConnect( server ){

	console.log("CONNECTED");
	server.data = function(msg){

		console.log("data from server: " + msg.toString()+"on channel:"+server.channel);
	}

	setInterval( function(){				
		server.send( new Buffer("Hello!") );
	},5000);
}


