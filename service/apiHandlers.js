//to handle the request from api
//action module

//global value
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

//--------------------------------------------------------
//main code
//--------------------------------------------------------
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
		console.log(fields);
		fields.sessionId = request.session;
		databaseHandlers.loginUser(fields,function (state,error_code,result) {
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
	databaseHandlers.registerUser(fields,function (state,error_code,reply) {
		if(!state){
			if(error_code === ERROR.DUPLICATE_VALUE){	
				//dup phone
				console.log('the cell phone has been registed');
			} else if(error_code === ERROR.NULL_VALUE){
				//null value
				console.log('there can not have null value');
			}
		}
		response.writeHead(200, {'content-type': 'application/json'});
      	response.end(JSON.stringify({state:state, err: error_code, cellPhone:reply}));
	});	
	 return ("Post handler 'register' was called");
}

function checkPhonePost(){

}

//--------------------------------------------------------
//export module
//--------------------------------------------------------
exports.loginPost = loginPost;
exports.registerPost = registerPost;
exports.logoutPost = logoutPost;
exports.checkPhonePost = checkPhonePost;