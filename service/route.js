/*
code for the router
----------------------usage------------------------
pass the response object to handler module
return the answer to the page ot handle it
*/
function route(handle,pathname,request,response){
	var the_path = '/'+pathname[1];
	console.log(typeof handle[the_path]);
	console.log(the_path);

	//Determine whether the current mapping of the action is a function
	if (typeof handle[the_path] === 'function') {
		//take the method directly
		var content;
		if(request.method === 'POST'){
			content = handle['forPost'][the_path](request,response,pathname);
		} else {
			content = handle[the_path](request,response,pathname);
		}
		console.log('handle content: '+content);
		return content;
	} else {
		console.log("No request handler found for "+pathname);
		response.writeHead(404,{"Content-Type":"text/plain"});
		response.write("404 not found");
		response.end();
		return "404 not found";
	};

	

}

exports.route = route;