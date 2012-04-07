var telehash = require("./telehash");
var util = require('./util');

//telehash.init( {port:"7777", seeds:['172.16.200.253:7777']});
//telehash.init( {port:"7777", seeds:['127.0.0.1:7777']});
//telehash.init( {port:"7777", seeds:['164.40.143.34:7777']});

var ip = util.getLocalIP();

if(ip.length > 0 ) {
  var seeds = [ ip[0]+":7777" ];//use the first ip-address as our seed ip
  telehash.init( {port:'7777', seeds:seeds} );
  telehash.seed();
}

