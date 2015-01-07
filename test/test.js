//this one is set to test the server
var http = require('http');
http.createServer(function (req, res) {
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end('Hello World\n');
  console.log(req);
}).listen(9344);
console.log('Server running at http://127.0.0.1:1337/');
// just a test to gaurd