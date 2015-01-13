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
mongoose = require("mongoose"),
databaseHandlers = require("./databaseHandlers.js");

function login (request,response,pathname,register) {
	// body...
	response.writeHead(200,{"Content-Type":"text/html"});
	response.write(swig.renderFile('./templates/login.html',{
		register_state:register || 'Have not registed? try to regist.'
	}));
	response.end();
	return ("Request handler 'login' was called");
}

function register (request,response,pathnname) {
	// show the register page
	response.writeHead(200,{"Content-Type":"text/html"});
	response.write(swig.renderFile('./templates/register.html'));
	response.end();
	return ("Request handler 'register' was called");
}

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
	//test the mysql database

	databaseHandlers.getAllUser(function (data) {
		// show the answer
		response.writeHead(200,{"Content-Type":"text/plain"});
    	response.write("the soulution is "+JSON.stringify(data));
    	response.end();
	});

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

//income
//cellPhone,password
function loginPost (request,response,pathname) {
	// handle the login
	var form = new formidable.IncomingForm();

	form.parse(request,function(err,fields,files){
		//reflect to front
		databaseHandlers.loginUser(fields.cellPhone,function (state,error_code,result) {
			if(state){
				if(!result[0]){
					console.log('the phone has not been registed');
				}
				else{
					if(result[0].password !== querystring.escape(fields.password)){
						console.log('the password is wrong');
					}
					else{
						console.log('success');
						databaseHandlers.setSession()
					}
				}
			}
			else{

			}
		});
	});
	return ("Post handler 'login' was called");
}

//income
//user_name,cellPhone,password
function registerPost (request,response,pathname) {
	// handler the register
	var form = new formidable.IncomingForm();

	form.parse(request,function (err,fields,files) {
		// reflect to front
		databaseHandlers.registerUser(fields,function (state,error_code) {
			if(state){
				login(request,response,pathname,'You have successfully registed.Try login.')
			} else {
				if(error_code === 1062){	
					//dup phone
					console.log('the cell phone has been registed');
				} else if(error_code === 1048){
					//null value
					console.log('there can not have null value');
				}
			}
		});
	});
	return ("Post handler 'register' was called");
}

//--------------------------------------------
//api handlers
//set for mobile phone
//--------------------------------------------

//income
//corner or code
//decide to use corner
//--------------------
//output
//users and their info
function findUserInAreaPost (request,response,pathname) {
	// get the corners and parse it
	var form = new formidable.IncomingForm();

	form.parse(request,function (err,fields,files) {
		databaseHandlers.getUserByCoordinate(fields.corner,function (state,error_code,result) {
			if(!state){
				console.log(error_code);
			} else {
				result = utils.selectRandomAndUnique(result,25);
				for(var i=result.length;i--;i>0){
					(function (j) {
						// closure
						//use this method to save i
						databaseHandlers.getInfoById(result[j].userId,function (state,error_code,row) {
							// body...
							if(!state){
								console.log(error_code);
							} else {
								result[j] = utils.objectMerge(result[j],row[0]);
							}
							if(j === 0){
								//finish process
								response.writeHead(200, {'content-type': 'text/plain'});
								response.write(result.length+"\n\n");
								response.end(util.inspect({users:result}));
							}
						});
					}(i));
				}
			}
		});
	});
	return ("API Post handler 'find user depends on area in discover' was called");
}

//income
function findUserInArea (request,response,pathname) {
	// body...
	response.writeHead(200,{"Content-Type":"text/html"});
	response.write(swig.renderFile('./templates/discover_find_user.html'));
	response.end();
	return ("API handler 'find user depends on area in discover' was called");
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
exports.login = login;
exports.register = register;
exports.upload = upload;
exports.client = client;
exports.lib = lib;
exports.image = image;


exports.uploadPost = uploadPost;
exports.imagePost = imagePost;
exports.loginPost = loginPost;
exports.registerPost = registerPost;


exports.findUserInArea = findUserInArea;

exports.findUserInAreaPost = findUserInAreaPost;


exports.dbTest = dbTest;