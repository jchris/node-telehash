var telehash = require("./telehash");
var hlib = require("./hash");

telehash.seed( function(err){
        if ( err ){
                console.log(err);
                return;
	}
	connect("echo.message.back");
});

function connect(name){
	telehash.connect({id:name, message:'telehash rocks!'}, function(s,telex){			
			
		console.log("Reply MESSAGE: ", telex.message );

	});
}

