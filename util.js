var os=require('os');

exports.getLocalIP = get_local_ip_addresses;
exports.isLocalIP = is_local_ip;
exports.isSameIP = is_same_ipp;
exports.isPrivateIP = is_private_ip;
exports.isPublicIP = is_public_ip;
exports.IP = IP;
exports.PORT = PORT;
//exports.refreshIP = refresh_ifaces;


var ipAddr;

//return list of local IP addresses (excluding 127.0.0.1)
function get_local_ip_addresses(){
  if (ipAddr ) return ipAddr; //only do detecion once..
  ipAddr = [];

  console.error("Detecting Local IP Addresses..");
  var ifaces=os.networkInterfaces();//this doesn't work on windows node implementation yet :( - April 5 2012
  for (var dev in ifaces) {
    var alias=0;
    ifaces[dev].forEach(function(details){
      if (details.family=='IPv4') {
        if(details.address!='127.0.0.1') ipAddr.push(details.address);
        console.error(dev+(alias?':'+alias:''),details.address);
        ++alias;
      }
    });
  }

  return ipAddr;
}

function refresh_ifaces(){
	ipAddr = undefined;
	return get_local_ip_addresses();
}

function is_local_ip( ip ){
	var local = get_local_ip_addresses();
	var isLocal = false;
	local.forEach( function( local_ip ){
		if( local_ip == IP(ip) ) isLocal = true; 
	});
	return isLocal;
}

function IP(ipp){
	var ip;
	( ipp.indexOf(':') > 0 ) ? ip = ipp.substr(0, ipp.indexOf(':')) : ip = ipp;
	return ip;	
}

function PORT(ipp){
	return parseInt(ipp.substr(ipp.indexOf(':')+1));
}
function is_same_ipp(a,b){
	return ( IP(a) == IP(b) );
}
function is_public_ip(ipp){
	return !is_private_ip(ipp);
}
function is_private_ip(ipp){
	var ip = IP(ipp);
	if( ip.indexOf('127.0.0.1') == 0 ) return true;
	if( ip.indexOf('10.') == 0 ) return true;
	if( ip.indexOf('192.168.') == 0 ) return true;
	if( ip.indexOf('172.16.') == 0 ) return true;
	if( ip.indexOf('172.17.') == 0 ) return true;
	if( ip.indexOf('172.18.') == 0 ) return true;
	if( ip.indexOf('172.19.') == 0 ) return true;
	if( ip.indexOf('172.20.') == 0 ) return true;
	if( ip.indexOf('172.21.') == 0 ) return true;
	if( ip.indexOf('172.22.') == 0 ) return true;
	if( ip.indexOf('172.23.') == 0 ) return true;
	if( ip.indexOf('172.24.') == 0 ) return true;
	if( ip.indexOf('172.25.') == 0 ) return true;
	if( ip.indexOf('172.26.') == 0 ) return true;
	if( ip.indexOf('172.27.') == 0 ) return true;
	if( ip.indexOf('172.28.') == 0 ) return true;
	if( ip.indexOf('172.29.') == 0 ) return true;
	if( ip.indexOf('172.30.') == 0 ) return true;
	if( ip.indexOf('172.31.') == 0 ) return true;
	if( ip.indexOf('0.') == 0 ) return true;
	if( ip.indexOf('255.') == 0 ) return true;

	return false;
}

