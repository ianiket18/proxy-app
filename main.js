var redis = require('redis')
var multer  = require('multer')
var express = require('express')
var fs      = require('fs')
var app = express()
var request = require('request')
var enableDestroy = require('server-destroy')
var ip = require('ip')

// REDIS
var client = redis.createClient(6379, 'redis-server', {})

///////////// WEB ROUTES

var spawned_servers = [];

var server_list = [];

function createServer(portnumber, callback){
  // console.log(args[0]);
  // HTTP SERVER
  var server = app.listen(portnumber, function () {

    var port = server.address().port
    var host = ip.address();
    
    spawned_servers.push('http://'+host+':'+port);
    client.lpush(['server_list', 'http://'+host+':'+port],function(err,reply){
      console.log(reply);
    });
    
    console.log('Server listening at http://%s:%s', host, port)
  })
  return callback(server);
}

var server = createServer(3000, function(server){
  // console.log(server.address().port);
  return server;
});


// Add hook to make it easier to get all visited URLS.
app.use(function(req, res, next) 
{

  next();
  // console.log(req.method, req.url);
  client.lpush(['recent', req.url],function(err,reply){
    // console.log(reply);
    if (err) throw err;
  });
  client.ltrim('recent', 0, 4, function(err, reply) {
    // console.log(reply); // ['angularjs', 'backbone']
    if (err) throw err;
  });
  // next(); // Passing the request to the next handler in the stack.
  
});


app.post('/upload',[ multer({ dest: './uploads/'}), function(req, res){
  // console.log("in here");
   if( req.files.image )
   {
     fs.readFile( req.files.image.path, function (err, data) {
        if (err) throw err;
        var img = new Buffer(data).toString('base64');
        client.lpush(['images', img],function(err,reply){
        // console.log(reply);
        });
        // console.log(img);
    });
   }
   res.status(204).end()
}]);

app.get('/', function(req, res) {
  client.set("key", "hello");
  client.get("key", function(err,value){ 
    if (err) throw err;
  });

  res.send('hello world')
})

app.get('/recent', function(req, res) {
  client.lrange('recent', 0, 0, function(err, reply) {
    // console.log(reply);
    res.send(reply); // ['angularjs', 'backbone']
  });
})


app.get('/recent/all', function(req, res) {
  client.lrange('recent', 0, -1, function(err, reply) {
    // console.log(reply);
    res.send(reply); // ['angularjs', 'backbone']
  });
})

app.get('/set/:key', function(req, res) {
  // console.log(req.params.key);
  client.set("key", req.params.key);
  client.expire("key", 10);
  res.send("Key is created");
  // console.log(req.params.key);
})

app.get('/spawn/:port', function(req, res) {
  server = createServer(req.params.port, function(server){
    server_list.push(server);
    return server
  })  
  res.send("Server is spawned");
})

app.get('/destroy/random', function(req, res) {
  server = server_list[Math.floor(Math.random() * server_list.length)];

  var host = server.address().address
  var port = server.address().port
  
  if(host == "::")
  {
    // console.log("In here");
    host = '127.0.0.1';
  }
  client.lrem('server_list', 1, 'http://'+host+':'+port, function(err, reply){
    if (err) throw err;
    // process.exit();
  })

  enableDestroy(server);
  server.destroy();
  res.send("Server is destroyed");
})

app.get('/listservers', function(req, res) {
  client.lrange('server_list', 0, -1, function(err, reply) {
  // console.log(reply);
    res.send(reply); // ['angularjs', 'backbone']
  });
})

app.get('/get', function(req,res){
  client.get("key", function(err,value){
    if(value == null)
    {
      res.send("Value has destructed");
    }
    else
    res.send("The value of key is "+ value)}
    )
})

app.get('/meow', function(req, res) {
  {
    client.lpop('images', function(err,reply){
      if (err) throw err
      res.writeHead(200, {'content-type':'text/html'});
      res.write("<h1>\n<img src='data:my_pic.jpg;base64,"+reply+"'/>");
      res.end();
    });
  }
})





process.stdin.resume();

process.on('SIGINT', function () {
  console.log('Clearing RedisHosts');
  clearRedisHosts();
});

process.on('exit', function(){
  clearRedisHosts();
});

if(process.argv.slice(2)[0] == 'clearRedisHost'){
    clearRedisHosts();
}

function clearRedisHosts(){
  // console.log(server.address().port);
  // var host = server.address().address
  // var port = server.address().port

  // if(host == "::")
  // {
  //   // console.log("In here");
  //   host = '127.0.0.1';
  // }
  // client.lrem('server_list', 1, "http://"+host+":"+port, function(err,reply){
  //   if (err) throw err;
  //   console.log(reply);
  //   process.exit();
  // })
  spawned_servers.forEach(function(item){
    client.lrem('server_list', 1, item, function(err, reply){
      if (err) throw err;
      process.exit();
    })
  })
}
