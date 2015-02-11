/*
code for the router
----------------------usage------------------------
pass the response object to handler module
return the answer to the page ot handle it
*/
var SessionHandler = require("./sessionHandlers.js").sessionHandler,
sessionHandler = new SessionHandler(),
getIdBySession = new require("./databaseHandlers.js").getIdBySession;

function route(handle,pathname,request,response){
	var the_path = '/'+pathname[1];
	//the lib do not use lib
	if(the_path != "/lib"){
		session = sessionHandler.getSession(request,response);//just get the session,it will handle it
		console.log(session);
		request.session = session;
	}
	

	console.log(typeof handle[the_path]);
	console.log(the_path);

	//Determine whether the current mapping of the action is a function
	if (pathname[1] === "api") {
		var content;
		if(request.method === 'POST'){
			if(typeof handle[pathname[1]]['forPost'][pathname[2]][pathname[3]] === 'function'){
				getIdBySession(session.sessionId,function(state,err,reply){
					console.log(state);
					console.log(err);
					console.log(reply);
					if(reply !== null){
						content = handle[pathname[1]]['forPost'][pathname[2]][pathname[3]](request,response,pathname);
						console.log('handle content: '+content);
						return content;
					} else {
						notLogin(request,response,pathname);
					}
				});
			} else {
				return404(request,response,pathname);
			}
		} else {
			if(typeof handle[pathname[1]][pathname[2]][pathname[3]] === 'function'){
				content = handle[pathname[1]][pathname[2]][pathname[3]](request,response,pathname);
				console.log('handle content: '+content);
				return content;
			} else {
				return404(request,response,pathname);
			}
		}
	} else {
		//take the method directly
		var content;
		if(request.method === 'POST'){
			if (typeof handle['forPost'][the_path] === 'function'){
				content = handle['forPost'][the_path](request,response,pathname);
				console.log('handle content: '+content);
				return content;
			}
			else {
				return404(request,response,pathname);
			}
		} else {
			if (typeof handle[the_path] === 'function'){
				content = handle[the_path](request,response,pathname);
				console.log('handle content: '+content);
				return content;
			}
			else {
				return404(request,response,pathname);
			}
		}
	}
}

function return404 (request,response,pathname) {
	// body...
	console.log("No request handler found for "+pathname);
	response.writeHead(404,{"Content-Type":"text/plain"});
	response.write("404 not found");
	response.end();
	return "404 not found";
}

function notLogin(request,response,pathname) {
	console.log("client has not login");
	response.writeHead(401.1,{"Content-Type":"application/json"});
	response.end(JSON.stringify({err:401.1}));
	return "not login";
}

exports.route = route;