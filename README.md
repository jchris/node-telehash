# Overview

Note: The code is forked from: https://github.com/quartzjer/node-telehash as has a few minor implementation differences with the API.

This module presents a simple high-level API for using TeleHash, currently it has only two basic functions, *listen* and *connect*.

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

Using the basic *connect* and *listen* functions a *channels* module is implemented to establish a peer-to-peer UDP *session/channel* between two ends.

Once the channel is open you could build anything ontop of it: establishing voice/video streams, exchanging files, sending emails.. anything really.

see the channel-server.js and channel-client.js for detailed examples.


