//to handle the request from client
//action module
var swig = require('swig'),
fs = require('fs'),
path = require('path'),
mime = require('./mime.js').types,
config = require("../conf/config.js"),
zlib = require("zlib"),
utils = require("./utils.js"),
formidable = require("formidable"),
querystring = require("querystring"),
util = require("util"),
mongoose = require("mongoose");

function start (request,response,pathname) {
	// body...
	response.writeHead(200,{"Content-Type":"text/html"});
	response.write(swig.renderFile('./templates/text.html', {
    pagename: 'awesome people',
    authors: ['Paul', 'Jim', 'Jane']})
	);
	response.end();
	return ("Request handler 'start' was called");
}

function upload (request,response,pathname) {
	// body...
	response.writeHead(200,{"Content-Type":"text/plain"});
    response.write("upload") ;
    response.end();
    return ("Request handler 'upload' was called.");
}

function client (request,response,pathname) {
	// body...
	
	response.write(swig.renderFile('./templates/clientTest.html', {
    pagename: 'primus-rooms test'})
	);
	response.end();
	return ("Request handler 'client' was called");
}

function welcome (request,response,pathname) {
	// body...
	
	response.write(swig.renderFile('./templates/welcome.html'));
	response.end();
	return ("Request handler 'client' was called");
}

function lib (request,response,pathname) {
	// get the real file and return
	pathname = pathname.join("/");
	pathname.replace(/../g,"");
	var realPath = [".",pathname];
	realPath = realPath.join("");
	console.log(realPath);

	fileSendHandle(realPath,request,response);
	return("Request handler 'lib' was called");
}

function image (request,response,pathname) {
	// get the image
	pathname = pathname.join("/");
	pathname.replace(/../g,"");
	var realPath = [".",pathname];
	realPath = realPath.join("");
	console.log(realPath);

	fileSendHandle(realPath,request,response);
	return("Request handler 'image' was called");
}

function dbTest(request,response,pathname){
	//use to test the mongodb
	//this code is study from 
	//http://www.html-js.com/article/1697

	var db;
	db = mongoose.connection;

	db.on('error',console.error);
	db.once('open',function(){
		//create the module and schema here

		var movieSchema,MovieModel,thor;

		//we will use moveSchema as a struct
		//to create the movie model
		//at the same time
		//it will create a movie mongodb document
		movieSchema = new mongoose.Schema({
			title:{type:String},
			rating:String,
			releasYear:Number,
			hasCreditCookie:Boolean
		});

		Movie = db.model('Movie',movieSchema);
		//after it was claim
		//you can find the model by db.model('movie')

		thor = new Movie({
			title:"Thor",
			rating:'PG-13',
			releasYear:'2011',
			//though here we use a string
			//the mongoose will help us translate
			hasCreditCookie:true
		});

		thor.save(function(err,thor){
			if(err){
				return console.log(err);
			}
			console.dir(thor);
		});
		//you can see the new movie
	});

	mongoose.connect('mongodb://localhost/test');

	return("Request handler 'db-test' was called");
}

/*
-------------------------------------------------
post handler
-------------------------------------------------
*/
function imagePost (request,response,pathname) {
	// handle the image post
	var form = new formidable.IncomingForm(),
	uploadPath;

	form.uploadDir = './tmp';//the path for temp

	form.on('error',function(err){
		console.log(err);//output the error
	});


	//to parse the request
	form.parse(request,function(err, fields, files) {
		response.writeHead(200, {'content-type': 'text/plain'});
		response.write('received upload:\n\n');
		try{
			//there is a bug for formidable
			//it will create an empty temp file
			//if there is no file upload
			//if(files.uploadFile.size === 0){
				//if there is no file upload
				//delete the temp file
			//	fs.unlinkSync(files.uploadFile.path);
			//} else {
			//this bug repair by add something
			//in formidable-incoming_form.js
			//on 183 line
			fs.renameSync(files.uploadFile.path,  './tmp/' + files.uploadFile.name);
			//}
			
		} catch(err) {
			console.log(err);
		}
		response.end(util.inspect({fields: fields, files: files}));
		console.log("parse done");
		console.log(fields);
		console.log(files);
    });

	return("POST handler 'image' was called");
}

function uploadPost (request,response,pathname) {
	// handle the image post
	var form = new formidable.IncomingForm();

    form.parse(request, function(err, fields, files) {
      response.writeHead(200, {'content-type': 'text/plain'});
      response.write('received upload:\n\n');
      response.end(util.inspect({fields: fields, files: files}));
      console.log(fields);
    });

	return("POST handler 'image' was called");
}

/*
----------------------------------------------
these handlers is utils handlers
----------------------------------------------
*/
function fileSendHandle (realPath,request,response) {
	//use this utils handler to send file

	fs.stat(realPath,function(err,stat){
		if(err){
			response.writeHead(404,{'Content-Type':'text/plain'});
			response.write("This request URL was not found on the server.");
			console.log("can't found");
			response.end();
		} else {
			//judge the type of the file
			var ext = path.extname(realPath);
			ext = ext ? ext.slice(1):'unknown';
			var contentType = mime[ext]||"text/plain";
			response.setHeader('Content-Type',contentType);
						
			var lastModified = stat.mtime.toUTCString();
			var ifModifiedSince = "If-Modified-Since".toLowerCase();
			response.setHeader("Last-Modified",lastModified);

			//judge if we have to read the new file
			//if not read from cache
			if(ext.match(config.Expires.fileMatch)){
				var expires = new Date();
				expires.setTime(expires.getTime() + config.Expires.maxAge*1000);
				response.setHeader("Expires",expires.toUTCString());
				response.setHeader("Cache-Control","max-age="+config.Expires.maxAge);
			}

			//test if ask if modified since
			if(request.headers[ifModifiedSince] && lastModified == request.headers[ifModifiedSince]){
				response.writeHead(304,"Not modified");
				response.end();
			} else if(request.headers["range"]){		
				var range = utils.parseRange(request.headers["range"],stat.size);
				if(range){
					response.setHeader("Content-Range","bytes "+range.start+"-"+range.end+"/"+range.size);
					response.setHeader("Content-Length",(range.end-range.start+1));
					var raw = fs.createReadStream(realPath,{"start":range.start,"end":range.end});
					compressHandle(raw,206,"Partial Content",request,response,ext);
				} else {
					response.removeHeader("Content-Length");
					response.writeHead(416,"Request Range Not Satisfiable");
					response.end();
				}
			} else {
				var raw = fs.createReadStream(realPath);
				compressHandle(raw,200,"Ok",request,response,ext);
			}	
		}
	});
}

//send the image back to the website accroding the request
function imageSendHandle (argument) {
	// body...
	fs.stat(realPath,function(err,stat){
		if(err){
			response.writeHead(404,{'Content-Type':'text/plain'});
			response.write("This request URL "+pathname+" was not found on the server.");
			response.end();
		} else {
			//judge the type of the file
			var ext = path.extname(realPath);
			ext = ext ? ext.slice(1):'unknown';
			var contentType = mime[ext]||"text/plain";
			response.setHeader('Content-Type',contentType);
						
			var lastModified = stat.mtime.toUTCString();
			var ifModifiedSince = "If-Modified-Since".toLowerCase();
			response.setHeader("Last-Modified",lastModified);

			//judge if we have to read the new file
			//if not read from cache
			if(ext.match(config.Expires.fileMatch)){
				var expires = new Date();
				expires.setTime(expires.getTime() + config.Expires.maxAge*1000);
				response.setHeader("Expires",expires.toUTCString());
				response.setHeader("Cache-Control","max-age="+config.Expires.maxAge);
			}

			//test if ask if modified since
			if(request.headers[ifModifiedSince] && lastModified == request.headers[ifModifiedSince]){
				response.writeHead(304,"Not modified");
				response.end();
			} else if(request.headers["range"]){		
				var range = utils.parseRange(request.headers["range"],stat.size);
				if(range){
					response.setHeader("Content-Range","bytes "+range.start+"-"+range.end+"/"+range.size);
					response.setHeader("Content-Length",(range.end-range.start+1));
					var raw = fs.createReadStream(realPath,{"start":range.start,"end":range.end});
					compressHandle(raw,206,"Partial Content",request,response,ext);
				} else {
					response.removeHeader("Content-Length");
					response.writeHead(416,"Request Range Not Satisfiable");
					response.end();
				}
			} else {
				var raw = fs.createReadStream(realPath);
				compressHandle(raw,200,"Ok",request,response,ext);
			}	
		}
	});
}

function compressHandle (raw,statusCode,reasonPhrase,request,response,ext){
	//if we can compress we compress
	//else we pipe
	var stream = raw;
	var acceptEncoding = request.headers['accept-encoding'] || "";
	var matched = ext.match(config.Compress.match);

	if(matched && acceptEncoding.match(/bgzipb/)){
		response.setHeader("Content-Encoding","gzip");
		stream = raw.pipe(zlib.createGzip());
	} else if (matched && acceptEncoding.match(/bdeflateb/)){
		response.setHeader("Content-Encoding","deflate");
		stream = raw.pipe(zlib.createDeflate()); 
	} else {
		response.writeHead(statusCode, reasonPhrase);
		stream.pipe(response);
	}
}

/*
-------------------------------------------
export the module
-------------------------------------------
*/
exports.start = start;
exports.upload = upload;
exports.client = client;
exports.lib = lib;
exports.image = image;
exports.uploadPost = uploadPost;
exports.imagePost = imagePost;
exports.dbTest = dbTest;