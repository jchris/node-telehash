var telehash = require("./telehash");

telehash.seed( function(err){
	if ( err ){
		console.log(err);
		return;
	}

	console.log("__ SEEDED __");
});


