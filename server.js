var telehash = require("./telehash");
var hlib = require("./hash");
var util = require("./util");

telehash.seed( function(err){
        if ( err ){
                console.log(err);
                return;
	}
	server("echo.message.back");
});

function server(name){
	telehash.listen({id:name}, function(s,telex){				
		console.log("Incoming telex:"+JSON.stringify(telex)+" via:"+s.ipp);
		console.log("MESSAGE:",telex.message);
		//if remote end is behind SNAT or we are behind the same NAT send back via relay via switch s
		if(telex._snat || util.IP(telex.from) == util.IP(telex._to)){
			var end = new hlib.Hash(telex.from).toString();	
		        s.send( {'+end':end,'message':telex.message,'+connect':telex['+connect']} );
		}else{
			telehash.send( telex.from, {'message':telex.message,'+connect':telex['+connect']});
		}
	});
}
