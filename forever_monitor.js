var forever = require('forever-monitor');
var ip = require('ip');
var redis = require('redis');

var client = redis.createClient(6379, 'redis-server', {})

var child = new(forever.Monitor)('/home/main-app/main.js',{
    max: 1,
    silent: true,
    options: []
});

child.on('exit', function(){
    exit();
})

child.on('SIGINT', function(){
    exit();
});

child.on('SIGKILL', function(){
    exit();
});

function exit(){
   console.log("file has exited");
    var host = ip.address();
    var port = 3000;
    client.lrem("server_list", 0, "http://"+host+":"+port, function(err, reply){
        if(err) throw err;
        console.log(reply);
    });
}
