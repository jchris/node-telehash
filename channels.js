var telehash = require("./telehash");
var hlib = require("./hash");

exports.init = init;
exports.connect = doClient;
exports.listen = doServer;

var peers = {};
var self;

function init(arg){

  if( self ) return self;
  
  self = telehash.init({handleOOB:onOOBData, seeds:arg.seeds});

  telehash.seed( function(err){
        if ( err ){
                console.log(err);
                return;
        }
	if(arg.ready) arg.ready();
  });
}

function doClient( name, onConnect ){
	console.log("Connecting...");	
	telehash.connect({id:name}, function(s,telex){			
		handleResponse(s,telex,onConnect);
	});
	
}

function doServer( name, onConnect ){
	console.log("Listening...");	
	telehash.listen( {id:name}, function(s,telex){		
		handleConnect(s,telex,onConnect);
	});    
}

function doNewPeer( peer ){
	
    peer.send = function(msg){
		OOBSendRaw( peer.ipp, msg);
	}
	peer.data = function(msg){
		//handle message from peer
		//should be set by user
	}
	peer.callback( peer );
}

function OOBSend(to, telex){
	telex['_OOB']=true;
	msg = new Buffer(JSON.stringify(telex)+'\n', "utf8");
	OOBSendRaw(to,msg);
}

function OOBSendRaw(to,buffer){
    var ip = IP(to);
    var port = PORT(to);
    self.server.send(buffer, 0, buffer.length, port, ip);
}

function onOOBData(msg, rinfo){
    var from = rinfo.address + ":" + rinfo.port;
    try {

        var telex = JSON.parse(msg.toString());

    } catch(E) {
	//raw data - pass it to the callback for handling
	for(var ipp in peers){
		if(peers[ipp].ipp == from && peers[ipp].activated ){
			peers[ipp].data(msg);
		}
	}
        return;
    }
	//telexes should be out of band channel management commands for opening the channel and activating it.
	//other end of the channel should have received a telex with the channel number and we are excpecting 
	//a channel open message.
    //console.log("OOB DATA:"+JSON.stringify(telex));
    for( var ipp in peers){
	if( ipp == from ){
		//strict will only happen if both ends not behind symmetric NATs
		if(peers[ipp].ipp == from && peers[ipp].channel==telex['channel'] && peers[ipp].id==telex['id']){
			if(!peers[ipp].activated) doNewPeer( peers[ipp] );
			peers[ipp].activated = true;
			return;
		}
	}

    }
	//..helper for SNAT ends
	//gone through all the peers and no match
    //lets look for a valid channel+id
    for( var ipp in peers){
	if( peers[ipp].channel == telex['channel'] && peers[ipp].id==telex['id'])
	{
		//likely we are not behind NAT or very nice NAT indeed (or this is spoofed!)			
		//and the other end is behind a symmetric NAT.. check for atleast the same IP
		if( IP(from) == IP(peers[ipp].ipp)){
			var newpeer = {id:telex['id'],channel:telex['channel'],ipp:from, callback:peers[ipp].callback};
			if(!peers[from]){
				peers[from]=newpeer;
				peers[from].activated = true;
				doNewPeer(newpeer);
			}
			//send a new 'channel open' message as most likely other end didn't receive it
			OOBSend( from, {id:newpeer.id,channel:newpeer.channel,ipp:self.me.ipp});
		}	
	}
    }
}
function IP(ipp){
	return ipp.substr(0, ipp.indexOf(':'));
}
function PORT(ipp){
	return parseInt(ipp.substr(ipp.indexOf(':')+1));
}
function handleConnect(s, telex, callback){
	console.log("Got A +CONNECT request from: " + telex['from']+"+connect="+telex['+connect']+" via:"+s.ipp);
	var from = telex['from'];
	var id = telex['+connect'];
	var reply = {};
	reply['+connect'] = id; //match the connection IDs
	reply['from'] = self.me.ipp;
	
	if(!peers[from]) {
		console.log("creating new channel");
		peers[from]={id:id, ipp:from, channel:Math.floor((Math.random() * 65535) + 1), callback:callback};//setup a new channel#
	}

	reply['channel']=peers[from].channel;

	if( s.ipp == telex['from'] ){
		//this is a direct message from switch originating the +connect
		//send reply telex without +end
		//this is quite rare and might only happen if there are very few switches in the DHT
		s.send(reply);

	}else{
		//this was a relayed telex				
		if( telex._snat) {
			//send telex with +end = hash(from.ipp)		
			//this method to contact the switch behin symmetric NAT via relay. it should have done a farListen
			//to receive this response.
			reply['+end'] = new hlib.Hash(from).toString();
			s.send(reply);	
		}else{
			//normal sending to the switch
			telehash.send(from, reply);
		}
	}

	setTimeout(function(){
		//this will send an out of band 'channel open' message
		OOBSend( from, {id:id,channel:peers[from].channel,ipp:self.me.ipp});
	},500);//allow time for other end to get the telex with the new channel#
}

function handleResponse(s, telex, callback){
	console.log("GOT RESPONSE from: "+telex['from']+"+connect="+telex['+connect']+" channel="+telex['channel']+" via:"+s.ipp);
    if( telex.channel ){  
    var from = telex['from'];
	var id = telex['+connect'];
        if(!peers[from]){		
		peers[from] = {id:id, channel:telex['channel'], ipp:from, callback:callback};
	}
	//send out an out of band 'channel open' message.
	OOBSend( from, {id:id,channel:peers[from].channel,ipp:self.me.ipp});
	}
}

