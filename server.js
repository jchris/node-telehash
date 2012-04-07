var telehash = require("./telehash");
var hlib = require("./hash");
  
//telehash.init({seeds:['172.16.200.253:7777']});
//telehash.init({seeds:['164.40.143.34:7777']});
//telehash.init( {seeds:['127.0.0.1:7777']});
//telehash.init({seeds:['192.168.1.69:7777']});

telehash.seed( function(err){
        if ( err ){
                console.log(err);
                return;
	}
	server("test");
});


function server(name){
	telehash.listen({id:name}, function(s,telex){			
			
		console.log("Incoming telex:"+JSON.stringify(telex)+" via:"+s.ipp);
		var end = new hlib.Hash(telex.from).toString();
		telehash.send( telex.from, {'message':'hello','+connect':telex['+connect']});
        telehash.send( s.ipp, {'+end':end,'message':'hello','+connect':telex['+connect']});


	});
}
