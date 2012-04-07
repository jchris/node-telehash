var telehash = require("./telehash");
var hlib = require("./hash");
  
//telehash.init({seeds:['172.16.200.253:7777']});
//telehash.init({seeds:['164.40.143.34:7777']});
//telehash.init({seeds:['127.0.0.1:7777']});
//telehash.init({seeds:['192.168.1.69:7777']});

telehash.seed( function(err){
        if ( err ){
                console.log(err);
                return;
	}
	connect("test");
});


function connect(name){
	telehash.connect({id:name}, function(s,telex){			
			
		console.log("Reply: " + JSON.stringify(telex));

	});
}

