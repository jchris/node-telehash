# Overview

Note: The code is forked from https://github.com/quartzjer/node-telehash and has a few minor implementation differences with the API. Everything works but it is not production ready.

This module presents a simple high-level API for using TeleHash, currently it has only two basic functions, *listen* and *connect*, which are used to build a higher level *channels* module.

## Listen

    var telehash = require("./telehash");
    telehash.seed( function(err){
      telehash.listen({id:"ECHO-SRV"}, function(switch,telex){				
        console.log("MESSAGE:",telex.message);		
      });
    }

This will seed you into the DHT and actively wait for any connect requests sent to the provided id (in this example: ECHO-SRV). The telex will be the JSON object sent in the original request, and switch is the sending/relaying switch. It will print out the message data field in the telex. Upon receiving the telex, a reply can be sent with:

    telehash.send( telex.from, {...}); //telex.from is the ip:port of the original sender


See server.js for a detailed example.

## Connect

    var telehash = require("./telehash");
    telehash.seed( function(err){
      telehash.connect({id:"ECHO-SRV", message:"TeleHash Rocks!"}, function(switch,telex){		
         console.log("RESPONSE MESSAGE: ", telex.message );
      });
    });

This will use the DHT to find anyone listening to that id and send the message in a JSON object. Replies will fire the callback function, which prints out the echoed message. (working to make it more general so you can send arbitrary fields)

See client.js for a detailed example.

## Channels

Using the basic *connect* and *listen* functions a *channels* module is implemented to establish a peer-to-peer UDP *session/channel* between two switches.

##Channels:Listener

Here we initialise the channels module and once we are seeded we establish a listener for 'telehash.echo.server'. 

    var channels = require('./channels');
    channels.init({
       ready:function(){
          channels.listen("telehash.echo.server", onConnect );
       }		
    });

OnConnect(peer) will be called when a channel is sucessfully opened with a new peer.

    function onConnect( peer ){
       peer.data = function(msg){
          peer.send(msg);//echo message back
       }
    }

The object peer has two methods data and send. data() is called when a packet arrives on the channel, and send() is used to send data back to the peer.

## Channels:Connector

To open a channel to a server listening on the id 'telehash.echo.server' we use channels.connect():

    var channels = require('./channels');
    channels.init({
       ready:function(){
           channels.connect("telehash.echo.server", onConnect );
       }		
    });

    function onConnect( peer ){
       peer.data = function(msg){
          console.log( msg.toString() );
       }
       setInterval( function(){				
          peer.send( new Buffer("Hello!") ); //send a message continuously 
       },5000);
    }

Once the channel is open you could build anything ontop of it: establishing voice/video streams, exchanging files, sending emails.. anything really.

see the channel-server.js and channel-client.js for detailed examples.

Note that the code produces alot of debug output so I suggest you redirect the stderr to /dev/null while running.

