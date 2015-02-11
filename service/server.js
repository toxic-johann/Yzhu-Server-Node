/*
first code on 12-25-2014
the server for the Yzhu
*/
var http = require('http'),
Primus = require('primus'),
Rooms = require('primus-rooms'),
url = require('url'),
express = require('express'),
cleanMessagePosition = require("./databaseHandlers").cleanMessagePosition;


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
		pathname = url.parse(request.url).pathname.toLowerCase().split('/');
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
			message = data.message;
			console.log('data received');

			if('join' === action){
				spark.join(room,function(){
					//send message to this client
					//spark.uid = data.id;
					spark.room(room).write({uid:"system",message:spark.id+' joined room ' +room});
				});
			}


			//check if spark is already in this room
			else if(~spark.rooms().indexOf(room)){
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
				spark.room(room)/*.except(spark.id)*/.write({uid:spark.id,message:message});
			}
		});
	});

	server.listen(3333);
	console.log("Server has started");

	setInterval(cleanMessagePosition,1000*60*60);
}
exports.start = start;