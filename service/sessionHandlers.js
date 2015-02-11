//this handler is to manage session
var Session = require('./session.js').Session,
setSession = require('./databaseHandlers.js').setSession,
refleshSession = require('./databaseHandlers.js').refleshSession,
deleteSession = require('./databaseHandlers.js').deleteSession;

exports.sessionHandler = function (cookieName,maxAge,checkInterval) {
	// body...
	var cookieName = cookieName ?  cookieName : 'SESSION',
	maxAge = maxAge ? maxAge*1000 : 600000,//10 min
	checkInterval = checkInterval ? checkInterval : 1000,//one sec
	sessions = new Array();

	this.forEachSession = function(callback){
		for (var key in sessions){
			callback(sessions[key]);
		}
	}

	this.deleteSession = function (session){
		if (sessions[session]){
			deleteSession(session,function (state,error_code) {
				if(!state){
					console.log(error_code);
				} else {
					delete sessions[session];
				}
			});
			return true;
		}
		return false;
	}

	this.getSession = function (request,response){
		//find session in sessions pool
		//if not exist
		//return a new session
		var cookie = request.headers.cookie;
		console.log(cookie);
		if(cookie && cookie.indexOf(cookieName) != -1){
			//cookie found
			var start = cookie.indexOf(cookieName) + cookieName.length + 1;
			var end = cookie.indexOf(';',start);
			end = end === -1 ? cookie.length : end;
			var value = cookie.substring(start,end);

			if(sessions[value]){
				console.log('this way');
				refleshSession(sessions[value].sessionId);
				return sessions[value];
			}
		}
		console.log('no,not done');

		//if cookie not found || sessions[value] not found
		var session = new Session();

		//to check
		setSession(session.sessionId,0,function (state,error_code) {
			// body...
			if(!state){
				console.log(error_code);
				return;
			} else {
				//nothing
				console.log('ok');
			}
		});
		response.setHeader('Set-Cookie',[cookieName +'='+ session +';Max-Age='+ maxAge/1000]);
		return sessions[session] = session;
	}

	//garbage collection
	// to rebuild
	setInterval(function(){
		var now = new Date().getTime();

		//if need to destroy || pass the limit time
		//delete it
		for(var key in sessions){
			var session = sessions[key];
			if(session.doDestroy){
				deleteSession(session.sessionId,function (state,error_code) {
				if(!state){
					console.log(error_code);
				} else {
					delete sessions[session];
				}
			});
			} else if(now - session.getTime() > maxAge){
				deleteSession(session.sessionId,function (state,error_code) {
				if(!state){
					console.log(error_code);
				} else {
					delete sessions[session];
				}
			});
			}
		}
	},checkInterval);
}