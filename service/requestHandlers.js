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
//mongoose = require("mongoose"),
//i give up the mongodb
databaseHandlers = require("./databaseHandlers.js"),
pushHandlers = require("./pushHandlers"),
ERROR = {
	DUPLICATE_VALUE:1062,
	NULL_VALUE:1048
};

function login (request,response,pathname,register) {
	// body...
	response.writeHead(200,{"Content-Type":"text/html"});
	response.write(swig.renderFile('./templates/login.html',{
		register_state:register || 'Have not registed? try to regist.'
	}));
	response.end();
	return ("Request handler 'login' was called");
}

function register (request,response,pathname) {
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

	var today = new Date()
	,dir = [];
	dir.push("./image");
	dir.push(today.getFullYear());
	dir.push(today.getMonth()+1);
	dir.push(today.getDate());
	dir = dir.join("/");
	console.log(dir);
	utils.mkdirs(dir,0777,function (){
		form.uploadDir = dir;//the path for temp

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
				
					fs.renameSync(files.uploadFile.path,  dir + '/' + files.uploadFile.name);
				//}
				
			} catch(err) {
				console.log(err);
			}
			response.end(JSON.stringify({fields: fields, files: files}));
			console.log("parse done");
			console.log(fields);
			console.log(files);
	    });

		return("POST handler 'image' was called");
	});
}

function uploadPost (request,response,pathname) {
	// handle the image post
	var form = new formidable.IncomingForm();

    form.parse(request, function(err, fields, files) {
      response.writeHead(200, {'content-type': 'text/plain'});
      response.write('received upload:\n\n');
      response.end(JSON.stringify({fields: fields, files: files}));
      console.log(fields);
    });

	return("POST handler 'upload' was called");
}

//income
//cellPhone,password
//----------------------------------------------------------------------------
//output
//state
//0-->success;1-->not registered;2-->password wrong;
function loginPost (request,response,pathname) {
	// handle the login
	var form = new formidable.IncomingForm();

	form.parse(request,function(err,fields,files){
		//reflect to front
		fields = checkAPI(pathname,fields);
		console.log(fields);
		fields.sessionId = request.session;
		databaseHandlers.loginUser(fields,function (state,error_code,result) {
			console.log("state:"+state);
			response.writeHead(200,{"content-type":"application/json"});
			response.end(JSON.stringify({state:state,err:error_code,session:result}));
		});
	});
	return ("Post handler 'login' was called");
}

function logoutPost (request,response,pathname){
	// handle the login
	databaseHandlers.logoutUser(request.session,function (state,error_code,result) {
		if(state){
			console.log('success');
			response.writeHead(200,{"content-type":"text/plain"});
			response.end("0");
		}
		else{
			response.writeHead(200,{"content-type":"text/plain"});
			response.end(error_code.toString());
		}
	});
	return ("Post handler 'logout' was called");
}

//income
//user_name,cellPhone,password
function registerPost (request,response,pathname) {
	// handler the register
	var form = new formidable.IncomingForm();

	form.parse(request,function (err,fields,files) {
		// reflect to front
		fields = checkAPI(pathname,fields);
		databaseHandlers.registerUser(fields,function (state,error_code,reply) {
			response.writeHead(200,{"content-type":"application/json"});
			response.end(JSON.stringify({state:state,err:error_code,cellPhone:reply}));
			if(state){
				login(request,response,pathname,'You have successfully registed.Try login.');
			} else {
				if(error_code === ERROR.DUPLICATE_VALUE){	
					//dup phone
					console.log('the cell phone has been registed');
				} else if(error_code === ERROR.NULL_VALUE){
					//null value
					console.log('there can not have null value');
				}
			}
		});
	});
	return ("Post handler 'register' was called");
}

function checkPhonePost(request,response,pathname){
	var form = new formidable.IncomingForm();

	form.parse(request,function (err,fields,files) {
		// reflect to front
		fields = checkAPI(pathname,fields);
		databaseHandlers.getIdByPhone(fields.cellPhone,function (state,err,reply){
			response.writeHead(200,{"Content-Type":"application/json"});
			response.end(JSON.stringify({registed:state}));
		});
	});
	return ("Post handler 'register' was called");
}
//-------------------------------------------
//api handler GET
//mainly set for test
//-------------------------------------------

//show position
function findUserInArea (request,response,pathname) {
	// body...
	response.writeHead(200,{"Content-Type":"text/html"});
	response.write(swig.renderFile('./templates/discover_find_user.html'));
	response.end();
	return ("API handler 'find user depends on area in discover' was called");
}

//show message in area
function findMessageInArea(request,response,pathname){
	response.writeHead(200,{"Content-Type":"text/html"});
	response.write(swig.renderFile('./templates/discover_find_message.html'));
	response.end();
	return ("API handler 'find message depends on area in discover' was called");
}

//show position insert
function setPosition (request,response,pathname) {
	// body...
	response.writeHead(200,{"Content-Type":"text/html"});
	response.write(swig.renderFile('./templates/set_position.html'));
	response.end();
	return ("API handler 'set position' was called");
}

//send help to people
function sendHelp (request,response,pathname) {
	// body...
	response.writeHead(200,{"Content-Type":"text/html"});
	response.write(swig.renderFile('./templates/send_help.html'));
	response.end();
	return ("API handler 'send help' was called");
}

//to follow sb
function toFollow (request,response,pathname){
	response.writeHead(200,{"Content-Type":"text/html"});
	response.write(swig.renderFile('./templates/to_follow.html'));
	response.end();
	return ("API handler 'to follow' was called");
}

//to show the receive message page
function myReceive (request,response,pathname){
	response.writeHead(200,{"Content-Type":"text/html"});
	response.write(swig.renderFile('./templates/my_receive.html'));
	response.end();
	return ("API handler 'my receive' was called");
}

//to show the help page
function theHelp (request,response,pathname){
	console.log(pathname[4]);
	response.writeHead(200,{"Content-Type":"text/html"});
	response.write(swig.renderFile('./templates/the_help.html',{
    messageId:pathname[4]}));
	response.end();
	return ("API handler 'the_help' was called");
}

//--------------------------------------------
//api post handlers
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
				/*for(var i=result.length;i--;i>0){
					(function (j) {
						// closure
						//use this method to save i
						databaseHandlers.getInfoByUserId(result[j].userId,function (state,error_code,row) {
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
				}*/
				response.writeHead(200, {'content-type': 'text/plain'});
				response.write(result.length+"\n\n");
				response.end(JSON.stringify({users:result}));
			}
		});
	});
	return ("API Post handler 'find user depends on area in discover' was called");
}

//income
//corner or code
//decide to use corner
//--------------------
//output
//message id
function findMessageInAreaPost (request,response,pathname) {
	// body...
	var form = new formidable.IncomingForm();

	form.parse(request,function (err,fields,files) {
		databaseHandlers.getMessageByLocation(fields,function(state,error_code,result){
			if(!state){
				console.log(error_code);
				response.writeHead(200, {'content-type': 'application/json'});
				response.end("nothing");
			} else {
				result = utils.selectRandomAndUnique(result,25);
				response.writeHead(200, {'content-type': 'application/json'});
				response.end(JSON.stringify({"messages":result}));
			}
		});
	});
	return ("API Post handler 'find message depends on area in discover' was called");
}


//income
//uid,position,code
function setPositionPost (request,response,pathname) {
	// body...
	var form = new formidable.IncomingForm();

	form.parse(request,function (err,fields,files) {
		// reflect to front
		databaseHandlers.setPosition(fields,function (state,err) {
			if(state){
				response.writeHead(200, {'content-type': 'text/plain'});
				response.end("ok");
			}
		})
		
	});
	return ("Post handler 'set position' was called");
}

function askQuestionPost(request,response,pathname){
	var form = new formidable.IncomingForm();

	form.parse(request,function (err,fields,files) {
		// reflect to front
		console.log(fields);
		databaseHandlers.askQuestion(fields,function (state,err) {
			if(state){
				sendHelp(request,response,pathname);
				databaseHandlers.getFollowerSet(fields.userId,function(state,err,reply){
					if(state){
						pushHandlers.pushNotification(fields.userId+" ask you for help!!",reply);
					}
				});
			}
		});
	});
	return ("Post handler 'send help' was called");
}

//income
//userId,content,type
function sendHelpPost (request,response,pathname) {
	// body...
	var form = new formidable.IncomingForm();

	form.parse(request,function (err,fields,files) {
		// reflect to front
		console.log(fields);
		databaseHandlers.sendHelp(fields,function (state,err,reply) {
			if(state){
				sendHelp(request,response,pathname);
				databaseHandlers.getFollowerSet(fields.userId,function(state,err,reply){
					if(state){
						pushHandlers.pushNotification(fields.userId+" ask you for help!!",reply);
					}
				});
			}
		});
	});
	return ("Post handler 'send help' was called");
}

function offerHelpPost (request,response,pathname) {
	// body...
	var form = new formidable.IncomingForm();

	form.parse(request,function (err,fields,files) {
		// reflect to front
		console.log(fields);
		databaseHandlers.offerHelp(fields,function (state,err,reply) {
			console.log(state);
			if(state){
				response.writeHead(200, {'content-type': 'text/plain'});
				response.end(reply.toString());	
				if(reply === 1){
					pushHandlers.pushNotification(fields.userId+" decide to help you.",fields.caller);
				} else if(reply === 1){
					pushHandlers.pushNotification(fields.userId+" want to help you,would you accept?",fields.caller);
				}
				
			} else {
				response.writeHead(200, {'content-type': 'text/plain'});
				response.end("failed");	
			}
		});
	});
	return ("Post handler 'send help' was called");
}

function refuseToHelpPost(request,response,pathname){
	var form = new formidable.IncomingForm();

	form.parse(request,function (err,fields,files) {
		// reflect to front
		console.log(fields);
		databaseHandlers.refuseToHelp(fields,function (state,err,reply) {
			console.log(state);
			if(state){
				response.writeHead(200, {'content-type': 'text/plain'});
				response.end("1");	
				pushHandlers.pushNotification(fields.userId+" is sorry that he can't help you.",fields.caller);
			} else {
				response.writeHead(200, {'content-type': 'text/plain'});
				response.end("0");	
			}
		})
	});
	return ("Post handler 'refuse to help' was called");
}

function acceptHelpPost (request,response,pathname){
	var form = new formidable.IncomingForm();

	form.parse(request,function (err,fields,files) {
		// reflect to front
		console.log(fields);
		databaseHandlers.acceptHelp(fields,function (state,err,reply) {
			if(state){
				response.writeHead(200, {'content-type': 'text/plain'});
				response.end("1");	
				pushHandlers.pushNotification(fields.caller+" accept your help.",fields.userId);
			} else {
				response.writeHead(200, {'content-type': 'text/plain'});
				response.end("0");	
			}
		})
	});
	return ("Post handler 'accept help' was called");
}

function ignoreHelpPost (request,response,pathname){
	var form = new formidable.IncomingForm();

	form.parse(request,function (err,fields,files) {
		// reflect to front
		console.log(fields);
		databaseHandlers.ignoreHelp(fields,function (state,err,reply) {
			if(state){
				response.writeHead(200, {'content-type': 'text/plain'});
				response.end("1");
				pushHandlers.pushNotification(fields.caller+" thanks for your kindness,but he can solve the problem now.",fields.userId);	
			} else {
				response.writeHead(200, {'content-type': 'text/plain'});
				response.end("0");	
			}
		})
	});
	return ("Post handler 'accept help' was called");
}

function helpInfoPost (request,response,pathname) {
	var form = new formidable.IncomingForm();

	form.parse(request,function (err,fields,files) {
		// reflect to front
		console.log(fields.messageId);
		databaseHandlers.getMessageByMessageId([fields.messageId],function (state,err,reply) {
			console.log(state);
			if(state){
				response.writeHead(200, {'content-type': 'text/plain'});
				response.end(JSON.stringify({message:reply}));	
			} else {
				response.writeHead(200, {'content-type': 'text/plain'});
				response.end("0");	
			}
		})
	});
	return ("Post handler 'help info' was called");
}

function acceptGroupPost (request,response,pathname){
	var form = new formidable.IncomingForm();

	form.parse(request,function (err,fields,files) {
		// reflect to front
		console.log(fields.messageId);
		databaseHandlers.getAcceptGroupByMessageId(fields.messageId,function (state,err,reply) {
			console.log(state);
			if(state){
				response.writeHead(200, {'content-type': 'text/plain'});
				response.end(JSON.stringify({user:reply}));	
			} else {
				response.writeHead(200, {'content-type': 'text/plain'});
				response.end("0");	
			}
		})
	});
	return ("Post handler 'help info' was called");
}

function waitGroupPost (request,response,pathname){
	var form = new formidable.IncomingForm();

	form.parse(request,function (err,fields,files) {
		// reflect to front
		console.log(fields.messageId);
		databaseHandlers.getWaitGroupByMessageId(fields.messageId,function (state,err,reply) {
			console.log(state);
			if(state){
				response.writeHead(200, {'content-type': 'text/plain'});
				response.end(JSON.stringify({user:reply}));	
			} else {
				response.writeHead(200, {'content-type': 'text/plain'});
				response.end("0");	
			}
		})
	});
	return ("Post handler 'help info' was called");
}

//income
function setUserInfoPost (request,response,pathname){
	var form = new formidable.IncomingForm();

	form.parse(request,function (err,fields,files) {
		// reflect to front
		fields = checkAPI(pathname,fields);
		console.log(fields);
		databaseHandlers.setUserInfo(fields,function (state,err,reply){
			response.writeHead(200,{"Content-Type":"application/json"});
			response.end(JSON.stringify({state:state}));
		});
	});
	return ("Post handler 'to follow' was called");
}

//income
//userId,toFollowPhone
function toFollowPost (request,response,pathname) {
	// body...
	var form = new formidable.IncomingForm();

	form.parse(request,function (err,fields,files) {
		// reflect to front
		console.log(fields);
		databaseHandlers.followUser(fields,function (state,err) {
			if(state){
				response.writeHead(200, {'content-type': 'text/plain'});
				response.end("ok");
			}
		})
		
	});
	return ("Post handler 'to follow' was called");
}

//income
//userId
//---------------------------------------------------
//ouput
//messages receive set
function myReceivePost (request,response,pathname) {
	var form = new formidable.IncomingForm();

	form.parse(request,function (err,fields,files) {
		// reflect to front
		console.log(fields);
		databaseHandlers.getReceiveById(fields,function (state,err,result) {
			if(state){
				response.writeHead(200, {'content-type': 'text/plain'});
				response.end(JSON.stringify({"messages":result}));
			} else {
				response.writeHead(200, {'content-type': 'text/plain'});
				response.end("nothing");
			}
		})
		
	});
	return ("Post handler 'to follow' was called");
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

function checkAPI(pathname,fields){
	if(pathname[1] === 'api'){
		return JSON.parse(fields.fields);
	} else {
		return fields;
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
exports.logoutPost = logoutPost;
exports.checkPhonePost = checkPhonePost;


exports.setPosition = setPosition;
exports.findUserInArea = findUserInArea;
exports.findMessageInArea = findMessageInArea;
exports.sendHelp = sendHelp;
exports.toFollow = toFollow;
exports.myReceive = myReceive;
exports.theHelp = theHelp;

exports.setPositionPost = setPositionPost;
exports.findUserInAreaPost = findUserInAreaPost;
exports.findMessageInAreaPost = findMessageInAreaPost;
exports.sendHelpPost = sendHelpPost;
exports.offerHelpPost = offerHelpPost;
exports.refuseToHelpPost = refuseToHelpPost;
exports.ignoreHelpPost = ignoreHelpPost;
exports.acceptHelpPost =acceptHelpPost;
exports.toFollowPost = toFollowPost;
exports.myReceivePost = myReceivePost;
exports.helpInfoPost = helpInfoPost;
exports.acceptGroupPost = acceptGroupPost;
exports.waitGroupPost = waitGroupPost;
exports.setUserInfoPost = setUserInfoPost;
exports.askQuestionPost = askQuestionPost;


exports.dbTest = dbTest;