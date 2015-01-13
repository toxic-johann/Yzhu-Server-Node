/*
first code on 12-25-2014
the server for the Yzhu
*/
var http = require('http'),
Primus = require('primus'),
Rooms = require('primus-rooms'),
url = require('url'),
express = require('express');


/*
//the http server
var server = http.createServer(function (request,response){
	response.writeHead(200,{'Content-Type':'text/html'});
	response.end('hello');
}).listen(8080);

//primus instance
var primus = new Primus(server,{transformer:"websockets"});
primus.use('rooms', Rooms);
*/

function start (route,handle) {
	// body...
	function onRequest (request,response) {
		// body...
		var postData = "",
		pathname = url.parse(request.url).pathname.split('/');
		console.log("Request for "+pathname[1]+" received");

		//注一： setEncodeing不再需要（formidable 自身会处理)
		//注二：request.addListener("data / end ", function(){}) 不再需要，
		//如果还保留，会造成 formidable.parse不能执行
		//set the request data code
		//request.setEncoding("utf8");
		//set the request listener
		//request.addListener("data",function(data){
		//	postData += data;
		//	console.log("Received POST data: "+data);
		//});
		//handle it when the data transmit end
		//request.addListener("end",function(){
		//	//call the router module
		route(handle,pathname,request,response);
		//});
		
	}

	var server = http.createServer(onRequest);
	//about the primus server
	var primus = new Primus(server,{transformer:"websockets"});
	primus.use('rooms', Rooms);

	primus.on('connection',function(spark){
		console.log('connected');
		spark.on('data',function(data){
			data = data||{};
			var action = data.action,
			room = data.room,
			message = data.msg;
			console.log('data received')

			if('join' === action){
				spark.join(room,function(){
					//send message to this client
					spark.write('you joined room '+room);

					//send message to all clients expect this one
					spark.room(room).write('test');
					spark.room(room).except(spark.id).write(spark.id+'joined room' +room);
				});
			}


			//check if spark is already in this room
			if(~spark.rooms().indexOf(room)){
				send();
				console.log(message+'***');
			}else{
				//join the room
				spark.join(room,function(){
					send();
					console.log(message+'###');
				});
			}

			//send to all clients in the room
			function send(){
				console.log(spark.id);
				spark.room(room).except(spark.id).write(message);
			}
		});
	});

	server.listen(3333);
	console.log("Server has started");
}
exports.start = start;