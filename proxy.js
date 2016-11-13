var redis = require('redis')
var httpProxy = require('http-proxy')
var http = require('http')
var client = redis.createClient(6379, 'redis-server', {})


var proxy = httpProxy.createProxyServer({});

var server = http.createServer(function(req, res){
  client.rpoplpush('server_list', 'server_list', function(err, reply){
    console.log('Request is being served by '+ reply);
    proxy.web(req, res, {target: reply});
  });
});
server.listen(8080);
