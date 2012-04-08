var telehash = require("./telehash"), slib = require("./switch")
  , color = require("colors");

telehash.seed(function(err){
  console.log("seed callback".red, err||"no error")
  var swtch = new slib.Switch("69.181.252.192:49025"),
    me = this.me;
    console.log("sending to", swtch)
    console.log("me", me)
  var i = 0
  setInterval(function() {
    swtch.send({id:"hello", i : i++})
  }, 5000)
  
  // telehash.listen({id:"jchanimal"}, function(telex){
  //   console.log("jchanimal".green, telex);
  //   telehash.send(telex.from, {"totally":"rad"});
  // })
})
