var telehash = require("./telehash");
var util = require('./util');

var ip = util.getLocalIP();

if(ip.length > 0 ) {
  var seeds = [ ip[0]+":42424" ];//use the first ip-address as our seed ip
  telehash.init( {port:'42424', seeds:seeds} );
  telehash.seed();
}

