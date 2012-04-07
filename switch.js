var async = require('async');
var hlib = require('./hash');
var util = require('./util');


// global hash of all known switches by ipp or hash
var network = {};

// callbacks must be set first, and must have 
// .data(switch, {telex for app}) and .sock.send() being udp socket send, news(switch) for new switch creation
var master = {data:function(){}, sock:{send:function(){}}, news:function(){}};
exports.setCallbacks = function(m)
{
    master = m;
}

// return array of all
function getSwitches()
{
    var arr = [];
    Object.keys(network).forEach(function(key){
        arr.push(network[key]);
    });
    return arr;
}
exports.getSwitches = getSwitches;

function getSwitch(ipp)
{
    if(network[ipp]) return network[ipp];
    return( new Switch(ipp));
    // create new one!
}
exports.getSwitch = getSwitch;

function getSelf()
{   
    var me = undefined; 
    Object.keys(network).forEach(function(key){
        if( network[key].self == true ) me = network[key];
    });
    return me;
}

// return array of switches closest to the endh, s (optional optimized staring switch), num (default 5, optional)
function getNear(endh, s, num)
{
    // for not just sort all, TODO use mesh, also can use a dirty list mixed with mesh
    if(!num) num = 5;
    var x = Object.keys(network).sort(function(a, b){
        return endh.distanceTo(network[a].hash) - endh.distanceTo(network[b].hash);
    });
    return x.slice(0, num);
}
exports.getNear = getNear;

// every seen IPP becomes a switch object that maintains itself
function Switch(ipp, via)
{
    // initialize the absolute minimum here to keep this lightweight as it's used all the time
    this.ipp = ipp;
    this.hash = new hlib.Hash(ipp);
    network[this.ipp] = this;
    this.end = this.hash.toString();
    this.via = via; // optionally, which switch introduced us
    this.ATinit = Date.now();
    this.misses = 0;
    this.seed = false;    
    this.ip = this.ipp.substr(0, this.ipp.indexOf(':'));
    this.port = parseInt(this.ipp.substr(this.ipp.indexOf(':')+1));
    console.log("New Switch created: " +this.ipp);
    return this;
}
exports.Switch = Switch;


// process incoming telex from this switch
Switch.prototype.process = function(telex, rawlen)
{
    // do all the integrity and line validation stuff
    if(!validate(this, telex)) return;
    
    if( this.ATdropped ) return; //dont process telexes from switches marked to be purged!
    // basic header tracking
    if(!this.BR) this.BR = 0;
    this.BR += rawlen;
    // they can't send us that much more than what we've told them to, bad!
    if(this.BRout && this.BR - this.BRout > 12000) return;
    this.BRin = (telex._br) ? parseInt(telex._br) : undefined;
    if(this.BRin < 0) delete this.line; // negativity is intentionally signalled line drop (experimental)

    // TODO, if no ATrecv yet but we sent only a single +end last (dialing) and a +pop request for this ip, this 
    // could be a NAT pingback and we should re-send our dial immediately

    // timer tracking
    this.ATrecv = Date.now();

    // responses mean healthy
    delete this.ATexpected;
    delete this.misses;

    // process serially per switch
    telex._ = this; // async eats 'this'
    if(!this.queue) this.queue = async.queue(worker, 1);
    this.queue.push(telex);
}

function worker(telex, callback)
{
    var s = telex._; delete telex._; // get owning switch, repair

    if( telex['_line'] == s.line ){ //assuming telex is validated there should be a _line open
      if(Array.isArray(telex['.see'])) doSee(s, telex['.see']);
      if(Array.isArray(telex['.tap'])) doTap(s, telex['.tap']);
    }

    if(telex['+end'] && (!telex._hop || parseInt(telex._hop) == 0)) doEnd(s, new hlib.Hash(null, telex['+end']));
    
    // if there's any signals, check for matching taps to relay to
    if(Object.keys(telex).some(function(x){ return x[0] == '+' }) && !(parseInt(telex['_hop']) >= 4)) doSignals(s, telex);

    // if there's any raw data, send to master
    if(Object.keys(telex).some(function(x){ return (x[0] != '+' && x[0] != '.' && x[0] != '_') })) master.data(s, telex);

    callback();
}

function doEnd(s, end)
{    
    s.popped = true;//switch was able to contact us directly so it's 'popped'
    var near = getNear(end);
    var healthyNear = [];
    near.forEach(function(ipp){
	  var s = getSwitch(ipp);
	  if(s.self) return healthyNear.push(ipp);
	  if(s.healthy() && s.line ) healthyNear.push(ipp);
    });
    s.send({'.see':healthyNear});
}

// automatically turn every new ipp into a switch, important for getNear being useful too
function doSee(s, see)
{
    var me = getSelf();   
    if(!me) return; //make sure we have established our identity first..

    see.forEach(function(ipp){

	if(master.behindNAT() ){
	  //if we are behing NAT and this new switch matches our ip then it is behind the same NAT
	  //we can't talk so ignore it.(unless the NAT router supports hair pinning..which is rare)
	  if(util.isSameIP(me.ipp, ipp) ) return;		
	  //TODO - ignore non-internet routable addresses.. 192.168.x.x/16 172.16.x.x/12 and 10.x.x.x/8 ..
	  if(util.isPrivateIP(ipp) ) return;
	}else{
		//only allow private IPs if we are seeding with a private DHT
		//and only allow public IPs if we are seeding with a public DHT
		if( util.isPrivateIP(me.ipp) && util.isPublicIP(ipp) ) return;
		if( util.isPublicIP(me.ipp) && util.isPrivateIP(ipp) ) return;
	}
	if(network[ipp]) return;
	console.log('.seeing '+ipp);
	master.news(new Switch(ipp, s.ipp));
    });
}

function doTap(s, tap)
{
    // do some validation?
    // todo: index these much faster
    console.error("Got TAP Request:"+JSON.stringify(tap));
    s.rules = tap;
    //check: should we send a response to a .tap request?
}

function doSignals(s, telex)
{    
    	//only if we are not behind a symmetric NAT, parse the th:ipp and send them an empty telex to pop!
	//we dont need to pop if we are not behind a NAT..
	if( master.behindNAT() && !master.behindSNAT() ){
		var me = getSelf();
		if( me && me.end == telex['+end'] && telex['+pop'] ) {
			var empty_telex = new Buffer(JSON.stringify({'.pop':1})+'\n', "utf8");
			var ipp = telex['+pop'].substr(3); //stip off the 'th:'
			var ip = util.IP(ipp);
			var port = util.PORT(ipp);
			master.sock.send(empty_telex, 0, empty_telex.length, port, ip);
			console.log("Sending EMPTY TELEX TO:"+ip+":"+port);
			return;
		}
	}
    // find any network.*.rules and match, relay the signals and DATA
    var switches = getSwitches();

    switches.forEach( function( aswitch ){
	if(!aswitch.rules) return;	
	for( var i in aswitch.rules){
		if( telexMatchesRule(telex,aswitch.rules[i]) ){
			aswitch.relay(telex);
			return; //relay telex only once to the switch
		}
	}
    });
}

function telexMatchesRule(telex,rule) {
	
	if( !rule['is'] && !rule['has'] ) return false;//not a valid rule to match

	if( rule['is'] ){
	  var is = rule['is'];
	  if(telex['+end'] != is['+end']) return false;
	}

	if( rule['has'] ){
	  var miss = false;
	  rule['has'].forEach( function(h){
		if( !telex[h] ) miss=true;
	  });
	  if( miss ) return false;
	}
	//if we made it here telex matched rule!
	return true;
}

//relay an incoming telex, strip out headers keeping signals and raw data
Switch.prototype.relay = function(telex, arg){
   var newTelex = {};
   if( !telex['_hop'] ) newTelex['_hop']=0;

   Object.keys(telex).forEach(function(key){
		//stip off headers
	        //if( key == '_snat' ) return; //should we strip off the _snat header ? 
	        if( key == '_line' ) return; //this will be set by .send anyway
	        if( key == '_br' ) return;   // "
	        if( key == '_to' ) return;  // "
	        if( key == '_ring' ) return; // just in case
	        if( key == '_hop' ) {
			//increase _hop by 1
			newTelex['_hop']= telex['_hop'] + 1;
			return;
		}
		newTelex[key] = telex[key];
    });

    console.error("Relaying:"+JSON.stringify(newTelex)+" TO:"+this.ipp);
    this.send(newTelex);
}
// send telex to switch, arg.ephemeral === true means don't have to send _ring
Switch.prototype.send = function(telex, arg)
{
    if(this.self) return; // flag to not send to ourselves!
    if(this.ATdropped) return; //dont send to switches marked to be purged

    // if last time we sent there was an expected response and never got it, count it as a miss for health check
    if(this.ATexpected < Date.now()) this.misses = this.misses + 1 || 1;
    delete this.ATexpected;
    // if we expect a reponse, in 10sec we should count it as a miss if nothing
    if(telex['+end']) this.ATexpected = Date.now() + 10000;
    //if(telex['.tap']) this.ATexpected = Date.now() + 10000; //check: do we excpect a response to a .tap?

    // check bytes sent vs received and drop if too much so we don't flood
    if(!this.Bsent) this.Bsent = 0;
    if(this.Bsent - this.BRin > 10000) {
        console.error("FLOODING "+this.ipp+", dropping "+JSON.stringify(telex));
        return;
    }

    if(!this.ring) this.ring = Math.floor((Math.random() * 32768) + 1);

    telex._to = this.ipp;

    // always try to handshake in case we need to talk again
    this.line ? telex._line = this.line : telex._ring = this.ring;

    // send the bytes we've received, if any
    if(this.BR) telex._br = this.BRout = this.BR;

    var msg = new Buffer(JSON.stringify(telex)+'\n', "utf8"); // \n is nice for testing w/ netcat

    if(msg.length > 1400) console.error("WARNING, large datagram might not survive MTU "+msg.length);

    // track bytes we've sent
    if(!this.Bsent) this.Bsent = 0;
    this.Bsent += msg.length;
    this.ATsent = Date.now();

    
    console.error("-->\t"+ this.ipp+"\t"+msg.toString());
    master.sock.send(msg, 0, msg.length, this.port, this.ip);
}

// necessary utility to see if the switch is in a known healthy state
Switch.prototype.healthy = function()
{
    if(this.self) return true; // we're always healthy haha
    //if(!this.popped) return true; //give a chance for switch to atleast get popped
    if(this.ATdropped ) return false;
    if(this.ATinit > (Date.now() - 10000)) return true; // new switches are healthy for 10 seconds!
    if(!this.ATrecv) return false; // no packet, no love
    if(Date.now() > (this.ATrecv +60000)) return false; //haven't recieved anything in last minute 
    if(this.misses > 2) return false; // three strikes
    if(this.Bsent - this.BRin > 10000) return false; // more than 10k hasn't been acked
    return true; // <3 everyone else
}

// destroy/drop
Switch.prototype.drop = function()
{    
    if(this.healthy()) this.send({_br:-10000});

    if( !this.ATdropped ) { 
	//mark switch as dropped.. dont process incoming packets anymore or send packets to this switch
	this.ATdropped = Date.now(); //switch will hang around until next scan
	console.error("dropping switch@ " + this.ipp );

    }else{    	
    	if(Date.now() > (this.ATdropped + 30000)) {
		this.purge();
	}
    }
    //TODO if meshed, remove all back references
    
}
Switch.prototype.purge = function(){
	//PURGE!:  delete main reference to self, should auto-GC if no others
	console.error('purging.. ' + this.ipp );
	delete network[this.ipp];
}

// make sure this telex is valid coming from this switch, and twiddle our bits
function validate(s, t)
{
    // first, if it's been more than 10 seconds after a line opened,
    // be super strict, no more ringing allowed, _line absolutely required
    if (s.ATline && s.ATline + 10000 < Date.now() && t._line != s.line) return false;

    // second, process incoming _line
    if (t._line) {
        // can't get a _line w/o having sent a _ring
        if(s.ring == undefined) return false;

        // be nice in what we accept, strict in what we send
        t._line = parseInt(t._line);

        // must match if exist
        if (s.line && t._line != s.line) return false;

        // must be a product of our sent ring!!
        if (t._line % s.ring != 0) return false;

        // we can set up the line now if needed
        if(!s.line) {
            s.ringin = t._line / s.ring; // will be valid if the % = 0 above
            s.line = t._line;
            s.ATline = Date.now();
        }
    }

    // last, process any incoming _ring's (remember, could be out of order after a _line and still be valid)
    if (t._ring) {

        // be nice in what we accept, strict in what we send
        t._ring = parseInt(t._ring);

        // already had a ring and this one doesn't match, should be rare
        if (s.ringin && t._ring != s.ringin) return false;

        // make sure within valid range
        if (t._ring <= 0 || t._ring > 32768) return false;

        // we can set up the line now if needed
	//if(s.ATline == 0){ //will never be true!
	if (!s.ATline) {	//changed this to calculate the _line on first packet received from a switch with _ring
            s.ringin = t._ring;
            if(!s.ring) s.ring = Math.floor((Math.random() * 32768) + 1);
            s.line = s.ringin * s.ring;
            s.ATline = Date.now();
        }
    }

    // we're valid at this point, line or otherwise
    return true;
}
