//this handler is set to connect the mysql database
//so it just handle the database problem
var mysql = require('mysql'),
dbInfo = require('../conf/localConf.js').database,
utils = require('./utils.js'),
redis = require("redis"),
redisClient = redis.createClient({auth_pass:dbInfo.password}),
ERROR = {
	DUPLICATE_VALUE:1062,
	NULL_VALUE:1048
};

redisClient.on("error",function (err) {
	console.log(err);
	callback(false,err);
});

var pool = mysql.createPool({
	connectionLimit:10,
	host : dbInfo.host,
	user : dbInfo.user,
	password : dbInfo.password,
	database : dbInfo.dbname
});

//if it need to wait output it.
pool.on('enqueue', function () {
  console.log('Waiting for available connection slot');
});

function dbTestHandler (callback) {
	// here is just to test the mysql server
	callback = callback || function () {
		// nothing
	};

	pool.getConnection(function (err,connection) {
		// body...
		connection.query('SELECT 1 + 1 AS solution', function(err, rows, fields) {
			if (err) throw err;
			console.log('The solution is: ', rows[0].solution);
			callback(rows[0].solution);
		});

		connection.release();
	});
};

function getAllUser (callback) {
	callback = callback || function () {
		// nothing
	};
	// Set to see the user id
	pool.getConnection(function (err,connection) {
		// body...
		connection.query('select * from test', function(err, rows, fields) {
			if (err) throw err;
			console.log('The solution is: ', rows);
			callback(rows);
		});

		connection.release();
	});
};

//income
//user_name,cellPhone,password
function registerUser (fields,callback) {
	// database behavior to regist
	//just to insert the user,if dup,return false
	//if success return true

	callback = callback || function () {
		// nothing
	};


	//check the fields
	if(utils.isDataExistNull(fields)){
		callback(false,ERROR.NULL_VALUE);
		return;
	}

	/*pool.getConnection(function (err,connection) {
		// insert
		var sql = [];
		sql[0] = connection.escape(fields.user_name);
		sql[1] = connection.escape(fields.cellPhone);
		sql[2] = connection.escape(fields.password);
		sql = sql.join(",");
		connection.query( "INSERT INTO user (name,cellPhone,password) VALUES (" + sql +")",function (err1) {
			if(err1) {
				callback(false,err1.errno);
				console.log(err1);
			} else{
				callback(true);
			}		
		});

		connection.release();
	});*/

    var pid = parseInt(fields.cellPhone).toString(16),
    key = 'Uid'+pid+Math.floor(Math.random()*1e16).toString(16);
    //check if the phone has been registered
    redisClient.SADD("Phone",pid,function (err, reply) {
    	if(reply === 1){
    		//set the user info set
    		redisClient.HMSET("User:"+key,fields);
    		//set the phone->id set
    		redisClient.SET("Pid:"+pid,key);
    		callback(true,0,fields.cellPhone);
    	} else {
    		callback(false,ERROR.DUPLICATE_VALUE,fields.cellPhone);
    	}
    });
    //the phone and the password need to be secret!!
};

//income
//sessionId,userId
function setSession (sessionId,userId,callback) {
	callback = callback || function () {
		// nothing
	};

	// check the input
	console.log("set session!!!!!")
	if(utils.isDataExistNull(sessionId) || utils.isDataExistNull(userId)){
		callback(false,ERROR.NULL_VALUE);
		return;
	}

	redisClient.SET("Session:"+sessionId,userId,function (err,reply) {
		if(!err){
			console.log("ok");
			redisClient.EXPIRE("Session:"+sessionId,3600);
			redisClient.SET("Session:user:"+userId,sessionId,function (err,reply){
				if(!err){
					callback(true,0);
				} else {
					callback(false,err);
				}
			});
		} else {
			callback(false,err);
		}
	});

	/*pool.getConnection(function (err,connection) {
		// insert id
		var sId = connection.escape(sessionId),
		uId = connection.escape(userId),
		sql = "INSERT INTO session(sessionId,userId) VALUES ("+sId+","+uId+")";
		connection.query(sql,function (err1,rows){
			if(err1) {
				callback(false,err1.errno);
				console.log(err1);
			} else {
				callback(true);
			}
		});

		connection.release();
	});*/
}

//income
//sessionId
function refleshSession (sessionId,callback) {
	callback = callback || function () {
		// nothing
	};

	if(utils.isDataExistNull(sessionId)){
		callback(false,ERROR.NULL_VALUE);
		return;
	}
	
	redisClient.EXPIRE("Session:"+sessionId,3600,function (err,reply) {
		console.log(reply);
	});
	callback(true);
}

//income
//userId,content,type,time
function sendHelp (fields,callback) {
	callback = callback || function () {
		// nothing
	};

	// body...
	if(utils.isDataExistNull(fields)){
		callback(false,ERROR.NULL_VALUE);
		return;
	}

	var mhid = "Mhid"+ new Date().getTime().toString(16)+Math.floor(Math.random()*1e16).toString(16);
	fields.time = new Date().getTime();
	fields.state = 0;//indicate no help accept

	getIdByPhone(fields.userId,function (state,err,reply) {
		// body...
		//use for test so do nor tab
		fields.userId = reply;
	redisClient.HMSET("Message:help:"+mhid,fields,function (err,reply) {
		if(reply === "OK"){
			//key do not exist
			console.log("message stream add");
			redisClient.ZADD("Message:send:help:"+fields.userId,fields.time,mhid);
			redisClient.ZADD("Message:type:"+fields.type,fields.time,mhid);
			redisClient.ZADD("Timeline:help:"+mhid,fields.time,JSON.stringify({
				userId:fields.userId,
				behavior:"ask for help."
			}));
			getReceiverSet(fields,mhid,function (state,err,reply){
				for(var i=reply.length-1;i>-1;i--){
					console.log(reply[i]);
					if(reply[i] == fields.userId){continue;}
					receiveMessage(reply[i],mhid,fields.time);
				}
				redisClient.ZADD("Timeline:help:"+mhid,fields.time,JSON.stringify({
				userId:fields.userId,
				behavior:"invite someone to help him."
			}));
			});
			setMessagePosition(fields,mhid);
			callback(true);
		} else {
			console.log("this is reply --> "+reply.toString());
			callback(false);
		}
	});
	});
}

//income
//userId,messageId
//---------------------------------------------
//output
//state
function offerHelp (fields,callback) {
	// body...
	callback = callback || function () {
		// nothing
	};

	// body...
	if(utils.isDataExistNull(fields)){
		callback(false,ERROR.NULL_VALUE);
		return;
	}

	getIdByPhone(fields.userId,function (state,err,reply) {
		// body...
		//use for test so do nor tab
		fields.userId = reply;
		console.log(reply);
	//use the rank to find whether the message in the set
	redisClient.ZRANK("Message:receive:help:"+fields.userId,fields.messageId,function (err,reply) {
		if(reply !== null){
			//user was recommonded
			redisClient.SADD("Group:help:accept:"+fields.messageId,fields.userId,function (err,reply){
				if(reply>0){
					callback(true,0,1);//1 for accept
					redisClient.SADD("Samaritan:help:accept:"+fields.userId,fields.messageId);
					redisClient.ZADD("Timeline:help:"+fields.messageId,new Date().getTime(),JSON.stringify({
						userId:fields.userId,
						behavior:"accept to help"
					}));
				} else callback(false);
			});
		} else {
			redisClient.SADD("Group:help:wait:"+fields.messageId,fields.userId,function (err,reply){
				if(reply>0){
					callback(true,0,2);//2 for wait for accept
					redisClient.SADD("Samaritan:help:wait:"+fields.userId,fields.messageId);
					redisClient.ZADD("Timeline:help:"+fields.messageId,new Date().getTime(),JSON.stringify({
						userId:fields.userId,
						behavior:"is willing to help and wait for accept."
					}));
				} else callback(false);
			});
		}
	});
	});
}

function refuseToHelp (fields,callback) {
	callback = callback || function () {
		// nothing
	};

	// body...
	if(utils.isDataExistNull(fields)){
		callback(false,ERROR.NULL_VALUE);
		return;
	}

	getIdByPhone(fields.userId,function (state,err,reply) {
		// body...
		//use for test so do nor tab
		fields.userId = reply;
		console.log(reply);
	//use the rank to find whether the message in the set
	redisClient.ZREM("Message:receive:help:"+fields.userId,fields.messageId,function (err,reply){
		if(reply>0){
			callback(true);
		} else {
			callback(false);
		}
	});
	});
}

function acceptHelp (fields,callback){
	callback = callback || function () {
		// nothing
	};

	// body...
	if(utils.isDataExistNull(fields)){
		callback(false,ERROR.NULL_VALUE);
		return;
	}

	//use the rank to find whether the message in the set
	redisClient.SREM("Group:help:wait:"+fields.messageId,fields.userId,function (err,reply){
		if(reply>0){
			redisClient.SADD("Samaritan:help:accept:"+fields.userId,fields.messageId,function (err,reply){
				if(!err){
					redisClient.SADD("Group:help:accept:"+fields.messageId,fields.userId,function (err,reply){
						if(!err){
							redisClient.ZADD("Message:receive:help:"+fields.userId,new Date().getTime(),fields.messageId,function (err,reply){
								console.log(fields.userId);
								if(!err){
									callback(true);
									redisClient.ZADD("Timeline:help:"+fields.messageId,new Date().getTime(),JSON.stringify({
										userId:fields.userId,
										behavior:"help was accepted"
									}));
								} else {
									callback(false);
								}
							});
						} else {
							callback(false);
						}
					});
				} else {
					callback(false);
				}
			});
		} else {
			callback(false);
		}
	});
}

function ignoreHelp (fields,callback){
	callback = callback || function () {
		// nothing
	};

	// body...
	if(utils.isDataExistNull(fields)){
		callback(false,ERROR.NULL_VALUE);
		return;
	}

	//use the rank to find whether the message in the set
	redisClient.SREM("Group:help:wait:"+fields.messageId,fields.userId,function (err,reply){
		if(reply>0){
			redisClient.SREM("Samaritan:help:wait:"+fields.userId,fields.messageId,function (err,reply){
				if(!err){
					redisClient.SADD("Samaritan:help:ignored:"+fields.userId,fields.messageId,function (err,reply){
						if(!err){
							callback(true);
						} else {
							callback(false);
						}
					});
				} else {
					callback(false);
				}
			});
		} else {
			callback(false);
		}
	});
}

function askQuestion(fields,callback){
	callback = callback || function () {
		// nothing
	};

	// body...
	if(utils.isDataExistNull(fields)){
		callback(false,ERROR.NULL_VALUE);
		return;
	}

	var mqid = "Mqid"+ new Date().getTime().toString(16)+Math.floor(Math.random()*1e16).toString(16);
	fields.time = new Date().getTime();
	fields.state = 0;//indicate no help accept

	getIdByPhone(fields.userId,function (state,err,reply) {
		// body...
		//use for test so do nor tab
		fields.userId = reply;
	redisClient.HMSET("Message:question:"+mqid,fields,function (err,reply) {
		if(reply === "OK"){
			//key do not exist
			console.log("message stream add");
			redisClient.ZADD("Message:send:question:"+fields.userId,fields.time,mqid);
			redisClient.ZADD("Message:type:"+fields.type,fields.time,mqid);
			getReceiverSet(fields,mqid,function (state,err,reply){
				for(var i=reply.length-1;i>-1;i--){
					console.log(reply[i]);
					if(reply[i] == fields.userId){continue;}
					receiveMessage(reply[i],mqid,fields.time);
				}
			});
			setMessagePosition(fields,mqid);
			callback(true);
		} else {
			console.log("this is reply --> "+reply.toString());
			callback(false);
		}
	});
	});
}


function getReceiveById (fields,callback) {
	callback = callback || function () {
		// nothing
	};

	if(utils.isDataExistNull(fields)){
		callback(false,ERROR.NULL_VALUE);
		return;
	}

	getIdByPhone(fields.userId,function (state,err,reply) {
		// body...
		//use for test so do nor tab
		fields.userId = reply;
		console.log(reply);
	var check = new Date().getTime().toString(16)+Math.floor(Math.random()*1e16).toString(16);
	//used for multiple kind of messages
	redisClient.ZREVRANGE("Message:receive:help:"+fields.userId,fields.start,fields.start+fields.step,function (err,reply){
		if(reply.length>0){
			getMessageByMessageId(reply,function (state,err,reply){
				getUMStateByMessageId(fields.userId,reply,function(state,err,reply){
					reply.sort(function (a,b){return b.time-a.time;});
					callback(true,0,reply);
				});
			});
		} else {
			callback(false,err);
		}
	});
	});
}


//income
//userid,check(tell the message)
//---------------------------------------------
//output
//receiver set (on redis)
function getReceiverSet (fields,check,callback) {
	callback = callback || function () {
		// nothing
	};

	if(utils.isDataExistNull(fields) || utils.isDataExistNull(check)){
		callback(false,ERROR.NULL_VALUE);
		return;
	}

	getUserNearbySet(fields,check,function (state,err,reply){
		if(state){
			redisClient.SUNION("Relation:follow:"+fields.userId,"Position:temp:nearby:"+check,function (err,reply) {
				callback(true,0,reply);
				redisClient.DEL("Position:temp:nearby:"+check);
				console.log(reply);
			});
		} else {
			redisClient.SMEMBERS("Relation:follow:"+fields.userId,function (err,reply) {
				callback(true,0,reply);
				console.log(reply);
			});
		}
	});
}

//income
//location,check
//----------------------------------------------
//output
//user nearby set (on redis)
function getUserNearbySet (fields,check,callback) {
	callback = callback || function () {
		// nothing
	};

	if(utils.isDataExistNull(fields) || utils.isDataExistNull(check)){
		callback(false,ERROR.NULL_VALUE);
		return;
	}

	var delta = 1/6/Math.cos(fields.latitude/90);//about 10 km
	console.log(fields);
	redisClient.ZRANGEBYSCORE("Position:longitude",fields.longitude-delta,fields.longitude+delta,function (err,reply) {
    	if(reply.length>0){
    		//get the longitude set
    		redisClient.SADD("Position:temp:longitude:"+check,reply);
    		redisClient.ZRANGEBYSCORE("Position:latitude",fields.latitude-1/6,fields.latitude+1/6,function (err,reply) {
    			if(reply.length>0){
    				//get the latitude set
    				redisClient.SADD("Position:temp:latitude:"+check,reply,function (err,reply) {
    					if(reply>0){
    						//get the inter uid
    						redisClient.SINTER("Position:temp:longitude:"+check,"Position:temp:latitude:"+check,function (err,reply) {
    							//clean the temp set
    							redisClient.DEL("Position:temp:longitude:"+check);
    							redisClient.DEL("Position:temp:latitude:"+check);
    							redisClient.SADD("Position:temp:nearby:"+check,reply,function (err,reply) {
    								if(reply>0){
    									callback(true,0,reply);
    								} else {
    									callback(false,"null");
    								}
    							});
    						});
    					} else{
    						callback(false,"null");
    					}
    				});
    			} else {
    				callback(false,"null");
    			}
    		});
    	} else {
    		callback(false,"null");
    	}
    });
}

//income
//userId
function getFollowerSet(userId,callback){
	callback = callback || function () {
		// nothing
	};

	if(utils.isDataExistNull(userId)){
		callback(false,ERROR.NULL_VALUE);
		return;
	}

	redisClient.SMEMBERS("Relation:follow:"+userId,function(err,reply){
		if(!err){
			callback(true,0,reply);
		} else {
			callback(false);
		}
	});
}

//income
//userId,messageId
function receiveMessage (userId,messageId,time,callback) {
	callback = callback || function () {
		// nothing
	};

	if(utils.isDataExistNull(userId) || utils.isDataExistNull(messageId) || utils.isDataExistNull(time)){
		callback(false,ERROR.NULL_VALUE);
		return;
	}

	var kind;
	switch(messageId[1]){
		case "h":kind="help";break;
		case "q":kind="question";break;
	}
	redisClient.ZADD("Message:receive:"+kind+":"+userId,time,messageId,function (err,reply){
		if(reply === 1){
			callback(true);
		}		
	});
}


//income
//uid,longitude,latitude,code
function setPosition (fields,callback) {
	callback = callback || function () {
		// nothing
	};

	// body...
	if(utils.isDataExistNull(fields)){
		callback(false,ERROR.NULL_VALUE);
		return;
	}

	getIdByPhone(fields.userId,function (state,err,reply) {
		// body...
		//use for test so do nor tab
		fields.userId = reply;
	//update the user's position
	redisClient.HMSET("Position:user:"+fields.userId,fields,function (err,reply) {
		if(reply === "OK"){
			//key do not exist
			console.log("positon add");
			//if user have old position,remove it.
			redisClient.ZREM("Position:longitude",fields.userId);
			redisClient.ZREM("Position:latitude",fields.userId);
			redisClient.ZREM("Position:code",fields.userId);

			//add new position
			redisClient.ZADD("Position:longitude",fields.longitude,fields.userId);
			redisClient.ZADD("Position:latitude",fields.latitude,fields.userId);
			redisClient.ZADD("Position:code",fields.code,fields.userId);

			//delete the position when it log out

			callback(true);
		} else {
			console.log("this is reply --> "+reply.toString());
			callback(false,"fail");
		}
	});
	});
}

//income
//message,longitude,latitude,code
function setMessagePosition (fields,messageId,callback) {
	// body...
	callback = callback || function () {
		// nothing
	};

	// body...
	if(utils.isDataExistNull(fields) || utils.isDataExistNull(messageId)){
		callback(false,ERROR.NULL_VALUE);
		return;
	}

	var kind;
	switch(messageId[1]){
		case "h":kind = "help";break;
		case "q":kind = "question";break;
	}
	//add new position index
	redisClient.ZADD("Position:message:"+kind+":longitude",fields.longitude,messageId);
	redisClient.ZADD("Position:message:"+kind+":latitude",fields.latitude,messageId);
	redisClient.ZADD("Position:message:"+kind+":code",fields.code,messageId);

	//add time index to delete!
	redisClient.ZADD("Live:message:"+kind,fields.time,messageId);
	callback(true);
}


//income
//cellPhone
//------------
//outcome
//password
function loginUser (fields,callback) {
	callback = callback || function () {
		// nothing
	};

	// check cellPhone
	if(utils.isDataExistNull(fields)){
		callback(false,ERROR.NULL_VALUE);
		return;
	}

	fields.cellPhone = parseInt(fields.cellPhone).toString(16);
	console.log(fields);
	redisClient.GET("Pid:"+fields.cellPhone,function (err,reply){
		if(reply){
			fields.userId = reply;
			redisClient.HGET("User:"+reply,"password",function(err,reply){
				if(fields.password === reply){
					setSession(fields.sessionId,fields.userId,function (state,err,reply){
						if(state){
							callback(true,0,fields.sessionId);
						} else {
							callback(false,3);
						}
					});
				} else {
					callback(false,2);//2-->password wrong
				}
			})
		} else {
			callback(false,1);//1-->not registered
		}
	})

	/*pool.getConnection(function (err,connection) {
		//select the password
		connection.query("SELECT id,password FROM user where cellPhone = "+connection.escape(cellPhone),function (err1,rows) {
			if(err1) {
				callback(false,err1.errno);
				console.log(err1);
			} else{
				callback(true,0,rows);
			}	
		});

		connection.release();
	});*/	
}

function logoutUser (sessionId,callback){
	callback = callback || function () {
		// nothing
	};

	// check cellPhone
	if(utils.isDataExistNull(sessionId)){
		callback(false,ERROR.NULL_VALUE);
		return;
	}

	deleteSession(sessionId,callback);
}


//income
//code
//-----------------------------------------------
//output
//userId(s)
//to test
function getUserByCode (code,callback) {
	callback = callback || function () {
		// nothing
	};

	// check the code
	if(utils.isDataExistNull(code)){
		callback(false,ERROR.NULL_VALUE);
		return;
	}

	redisClient.ZRANGEBYSCORE("Position:code",code,code,function (err,reply) {
		if(reply.length>0){
			callback(true,0,reply);
		} else {
			callback(false);
		}
	});

	/*pool.getConnection(function (err,connection) {
		// select user_id
		connection.query("SELECT userId,longitude,latitude FROM position WHERE code = "+connection.escape(code),function (err1,rows) {
			// body...
			if(err1){
				callback(false,err1.errno);
				console.log(err1);
			} else{
				callback(true,0,rows);
			}
		});

		connection.release();
	});*/
}

//income
//code
//-----------------------------------------------
//output
//messageId(s)
function getMessageByCode (fields,callback) {
	// body...
	callback = callback || function () {
		// nothing
	};

	redisClient.ZRANGEBYSCORE("Position:message:"+fields.kind+":code",fields.code,fields.code,function (err,reply){
		if(reply.length>0){
			redisClient.SADD("Position:message:temp:"+fields.kind+":"+fields.check,reply,function (err){
				callback(true,err);
			});
		} else {
			callback(false,null);
		}
	});
}

//income
//two corner(leftup and rightbottom)
//-----------------------------------------------
//output
//userId(s)
function getUserByCoordinate (corner,callback) {
	callback = callback || function () {
		// nothing
	};

	// check corner
	if(utils.isDataExistNull(corner)){
		callback(false,ERROR.NULL_VALUE);
		return;
	}

    var check=new Date().getTime().toString(16)+Math.floor(Math.random()*1e16).toString(16);
    redisClient.ZRANGEBYSCORE("Position:longitude",corner[0].longitude,corner[1].longitude,function (err,reply) {
    	if(reply.length>0){
    		//get the longitude set
    		redisClient.SADD("Position:temp:longitude:"+check,reply);
    		redisClient.ZRANGEBYSCORE("Position:latitude",corner[1].latitude,corner[0].latitude,function (err,reply) {
    			if(reply.length>0){
    				//get the latitude set
    				redisClient.SADD("Position:temp:latitude:"+check,reply,function (err,reply) {
    					if(reply>0){
    						//get the inter uid
    						redisClient.SINTER("Position:temp:longitude:"+check,"Position:temp:latitude:"+check,function (err,reply) {
    							callback(true,0,reply);
    							//clean the temp set
    							redisClient.DEL("Position:temp:longitude:"+check);
    							redisClient.DEL("Position:temp:latitude:"+check);
    						});
    					}
    				});
    			}
    		});
    	}
    });
	/*pool.getConnection(function (err,connection) {
		// select user_id
		var sql = [],sqlString;
		sql[0] = "SELECT userId,longitude,latitude FROM position WHERE longitude>";
		sql[1] = connection.escape(corner[0].longitude);
		sql[2] = "AND longitude<";
		sql[3] = connection.escape(corner[1].longitude);
		sql[4] = "AND latitude<";
		sql[5] = connection.escape(corner[0].latitude);
		sql[6] = "AND latitude>";
		sql[7] = connection.escape(corner[1].latitude);
		sqlString = sql.join("");
		connection.query(sqlString,function (err1,rows) {
			// body...
			if(err1){
				callback(false,err1.errno);
				console.log(err1);
			} else{
				callback(true,0,rows);
			}
		});

		connection.release();
	});*/
}

//income
//longitude,latitude,scale
//------------------------------------------------
//output
//messageId(s)
function getMessageByCoordinate (fields,callback) {
	callback = callback || function () {
		// nothing
	};

	// check corner
	if(utils.isDataExistNull(fields)){
		callback(false,ERROR.NULL_VALUE);
		return;
	}

	fields.deltaLong = fields.scale/60/Math.cos(fields.latitude/90);//about fields.scale km
	fields.deltaLa = fields.scale/60;//about fields.scale km

	getDifferentMessageByCoordinate(fields,"help",function (state,err,result){
		callback(true);
	});
}

//income
//longitude,latitude,scale，check,delta
//------------------------------------------------
//output
//helpId(s)
function getDifferentMessageByCoordinate (fields,callback) {
	callback = callback || function () {
		// nothing
	};

	// check corner
	if(utils.isDataExistNull(fields) || utils.isDataExistNull(kind)){
		callback(false,ERROR.NULL_VALUE);
		return;
	}

	var kind = fields.kind;
	
	redisClient.ZRANGEBYSCORE("Position:message:"+kind+":longitude",
		fields.longitude-fields.deltaLong,
		fields.longitude+fields.longitude,
		function (err,reply){
		if(reply.length>0){
			redisClient.SADD("Position:message:temp:"+kind+":longitude:"+fields.check,reply);
			redisClient.ZRANGEBYSCORE("Position:message:"+kind+":latitude",
				fields.latitude-fields.deltaLa,
				fields.latitude+fields.deltaLa,
				function (err,reply){
				if(reply.length>0){
					redisClient.SADD("Position:message:temp:"+kind+":latitude:"+fields.check,reply,function (err,reply){
						redisClient.SINTERSTORE("Position:message:temp:"+kind+":"+fields.check,
							"Position:message:temp:"+kind+":longitude:"+fields.check,
							"Position:message:temp:"+kind+":latitude:"+fields.check,function (err,reply){
								callback(true,0,reply);
							});
						redisClient.DEL("Position:message:temp:"+kind+":longitude:"+fields.check);
						redisClient.DEL("Position:message:temp:"+kind+":latitude:"+fields.check);
					});
				} else callback(false,"null");
			});
		} else callback(false,"null");
	});		
}

function getHelpByLocation (fields,callback) {
	callback = callback || function () {
		// nothing
	};

	// check corner
	if(utils.isDataExistNull(fields)){
		callback(false,ERROR.NULL_VALUE);
		return;
	}

	fields.check=new Date().getTime().toString(16) + Math.floor(Math.random()*1e16).toString(16);
	fields.kind = help;
	var toGet = function(state,error_code,result){
		if(state){
			redisClient.SUNIONSTORE("Message:temp:"+fields.check,"Live:message:temp:help:"+fields.check,"Position:message:temp:help:"+fields.check,function (err,reply){
				if(reply>0){
					ZtoS("Message:receive:help:"+fields.userId,"Message:receive:help:temp:"+fields.userId,function (state,err){
						redisClient.SDIFF("Message:temp:"+fields.check,"Message:receive:help:temp:"+fields.userId,"Samaritan:help:accept:"+fields.userId,function (err,reply){
							getMessageByMessageId(reply,function(state,err,reply){
								getUMStateByMessageId(fields.userId,reply,function(state,err,reply){
									reply.sort(function (a,b){ return b.time - a.time;});//sort by time,from big to small
									console.log(reply);
									callback(true,0,reply);
								});
							});
							redisClient.DEL("Message:temp:"+fields.check);
							redisClient.DEL("Message:receive:help:temp"+fields.userId);
						});
					});
				} else {
					callback(false,null);
				}
				redisClient.DEL("Position:message:temp:help:"+fields.check);
				redisClient.DEL("Live:message:temp:help:"+fields.check);
			});
		} else {
			callback(false,error_code);
		}
	}

	// check the code
	if(utils.isDataExistNull(fields)){
		callback(false,ERROR.NULL_VALUE);
		return;
	}
	
	getIdByPhone(fields.userId,function (state,err,reply) {
		// body...
		//use for test so do nor tab
		fields.userId = reply;
	redisClient.ZRANGEBYSCORE("Live:message:help","-inf",fields.timeLimit,function (err,reply){
		if(reply.length>0){
			redisClient.SADD("Live:message:temp:help:"+fields.check,reply,function (err,reply){
				if(fields.scale === 0){
					getMessageByCode(fields,toGet);
				} else {
					getMessageByCoordinate(fields,toGet);
				}
			});
		}
	});
	});
}

//income
//userId
//------------------------------------------------
//output
//all info
function getInfoByUserId (userId,callback) {
	callback = callback || function () {
		// nothing
	};

	// body...
	if(utils.isDataExistNull(userId)){
		callback(false,ERROR.NULL_VALUE);
		return;
	}

	redisClient.HGETALL("Info:user:"+uid,function (err,reply){
		if(!err){
			callback(true,err,reply);
		} else {
			callback(false,err,reply);
		}
	});

	/*pool.getConnection(function (err,connection) {
		// select user_id
		connection.query("SELECT * FROM info WHERE userId = "+connection.escape(userId),function (err1,rows) {
			// body...
			if(err1){
				callback(false,err1.errno);
				console.log(err1);
			} else{
				callback(true,0,rows);
			}
		});

		connection.release();
	});*/
}

//income
//user info(s)        
//sex,age
function setUserInfo(fields,callback){
	callback = callback || function () {
		// nothing
	};

	//check sessionId
	if(utils.isDataExistNull(fields)){
		callback(false,ERROR.NULL_VALUE);
		return;
	}

	redisClient.HMSET("Info:user:"+fields.userId,fields,function (err,reply){
		if(!err){
			if(fields.age){
				redisClient.ZADD("Info:age",fields.age,fields.userId);
			}
			if(fields.sex){
				redisClient.ZADD("Info:sex",fields.sex,fields.userId);
			}
			callback(true);
		} else {
			callback(false,err);
		}
	});
}

//income
//sessionId
function deleteSession (sessionId,callback) {
	callback = callback || function () {
		// nothing
	};

	//check sessionId
	if(utils.isDataExistNull(sessionId)){
		callback(false,ERROR.NULL_VALUE);
		return;
	}

	redisClient.GET("Session:"+sessionId,function (err,reply){
		if(!err){
			var userId = reply;
			redisClient.DEL("Session:"+sessionId,function (err,reply){
				if(!err){
					callback(true);
				} else {
					callback(false,1);
				}
			});
		} else {
			callback(false,1);
		}
	});
	/*pool.getConnection(function (err,connection){
		connection.query("DELETE FROM session WHERE sessionId = "+connection.escape(sessionId),function (err1,rows){
			if(err1){
				callback(false,err1.errno);
				console.log(err1);
			} else {
				callback(true);
			}
		});

		connection.release();
	});*/
}


//--------------------------------------------------
//these handlers is utils of database handler
//we usually use these handler only in this module
//--------------------------------------------------

//income
// phone
//--------------------------------------------------
//output
//userId
function getIdByPhone (cellPhone,callback) {
	callback = callback || function () {
		// nothing
	};

	if(utils.isDataExistNull(cellPhone)){
		callback(false,ERROR.NULL_VALUE);
		return
	}

    // use pid set
    var pid = parseInt(cellPhone).toString(16);
    //check if the phone has been registered
    redisClient.GET("Pid:"+pid,function (err, reply) {
    	if(!err){
    		callback(true,0,reply);
    	} else {
    		callback(false);
    	}
    });
}

//income
//sessionId
//--------------------------------------------------
//outcome
//userId
function getIdBySession(sessionId,callback){
	callback = callback || function () {
		// nothing
	};

	if(utils.isDataExistNull(sessionId)){
		callback(false,ERROR.NULL_VALUE);
		return
	}

    redisClient.GET("Session:"+sessionId,function (err, reply) {
    	if(!err){
    		callback(true,0,reply);
    	} else {
    		callback(false,err,reply);
    	}
    });
}

//income
//userId
//--------------------------------------------------
//outcome
//sessionId


//income
//messageId(s)
//--------------------------------------------------
//output
//userId
function getMessageByMessageId (messageId,callback){
	callback = callback || function () {
		// nothing
	};

	if(utils.isDataExistNull(messageId)){
		callback(false,ERROR.NULL_VALUE,[]);
		return;
	}

	var result = [];
	
	for(var i=messageId.length-1;i>-1;i--){
		//use closure
		(function (j) {
			var kind;
			switch(messageId[j][1]){
				case "h":kind = "help";break;
				case "q":kind = "question";break;
			}

			redisClient.HGETALL("Message:"+kind+":"+messageId[j],function (err,reply){
				if(reply !== null){
					//use push
					//because it's sort from big to small
					//big time means newest
					console.log(messageId[j]);
					reply.messageId = messageId[j];
					result.push(reply);
				}
				if(j === 0){
					callback(true,0,result);
				}
			});
		})(i);
	}
}

//--------------------------------------------------
//to get the user have not offer help to the message
//--------------------------------------------------
//income
//message,userId
//--------------------------------------------------
//output
//UMState
function getUMStateByMessageId(userId,message,callback){
	//0--user has no relation with message
	//1--user and asker both accept
	//2--user accept and asker do not accept
	//3--user do not accpet and asker accpet
	callback = callback || function () {
		// nothing
	};

	if(utils.isDataExistNull(message) || utils.isDataExistNull(userId)){
		callback(false,ERROR.NULL_VALUE);
		return;
	}

	var finishQuest = 0;
	finish = function(){
		finishQuest++;
		if(finishQuest === message.length){
			callback(true,0,message);
		}
	}

	for(var i=message.length-1;i>-1;i--){
		//use closure
		(function (j) {
			switch(message[j].messageId[1]){
				case "h":
				redisClient.SISMEMBER("Group:help:accept:"+message[j].messageId,userId,function (err,reply){
					if(reply === 1){
						message[j].UMState = "1";
						finish();
					} else {
						redisClient.SISMEMBER("Group:help:wait:"+message[j].messageId,userId,function (err,reply){
							if(reply === 1){
								message[j].UMState = "2";
								finish();
							} else {
								redisClient.ZRANK("Message:receive:help:"+userId,message[j].messageId,function (err,reply){
									console.log(reply+"h="+j);
									console.log(message[j]);
									if(reply !== null){
										message[j].UMState = "3";
									} else {
										message[j].UMState = "0";
									}
									finish();	
								});
							}
						});
					}
				});
				break;
			}
		})(i);
	}
}

//input
//messageId
//----------------------------------------------------------------
//output
//accept group
function getAcceptGroupByMessageId (messageId,callback){
	callback = callback || function () {
		// nothing
	};

	if(utils.isDataExistNull(messageId)){
		callback(false,ERROR.NULL_VALUE);
		return;
	}

	redisClient.SMEMBERS("Group:help:accept:"+messageId,function (err,reply){
		if(!err){
			callback(true,0,reply);
		} else {
			callback(false,err);
		}
	});
}

//input
//messageId
//----------------------------------------------------------------
//output
//wait group
function getWaitGroupByMessageId (messageId,callback){
	callback = callback || function () {
		// nothing
	};

	if(utils.isDataExistNull(messageId)){
		callback(false,ERROR.NULL_VALUE);
		return;
	}

	redisClient.SMEMBERS("Group:help:wait:"+messageId,function (err,reply){
		if(!err){
			callback(true,0,reply);
		} else {
			callback(false,err);
		}
	});
}

//input
//userId,friendId
//---------------------------------------------------------------
//output
//state
function addFriend(fields,callback){
	callback = callback || function(){};

	if(utils.isDataExistNull(fields)){
		callback(false,ERROR.NULL_VALUE);
		return;
	}

	if(fields.userId === fields.friendId){
		callback(false,ERROR.DUPLICATE_VALUE);
		return;
	}

	redisClient.ZADD(fields.kind+":"+fields.userId+":wait",new Date().getTime(),fields.friendId,function(err,reply){
		if(!err){
			redisClient.ZADD(fields.kind+":"+fields.friendId+":solicit",new Date().getTime(),fields.userId,function(err,reply){
				if(!err){
					callback(true,err,reply);
				} else {
					callback(false,err,reply);
				}
			});
		} else {
			callback(false,err,reply);
		}
	});
}

function confirmFriend(fields,callback){
	callback = callback || function(){};

	if(utils.isDataExistNull(fields)){
		callback(false,ERROR.NULL_VALUE);
		return;
	}

	if(fields.userId === fields.friendId){
		callback(false,ERROR.DUPLICATE_VALUE);
		return;
	}

	redisClient.ZREM(fields.kind+":"+fields.userId+":solicit",fields.friendId,function(err,reply){
		if(!err && reply>0){
			redisClient.SADD(fields.kind+":"+fields.userId+":"+fields.relation,fields.friendId,function(err,reply){
				if(!err){
					redisClient.SADD(fields.kind+":"+fields.friendId+":"+fields.relation,fields.userId,function(err,reply){
						if(!err){
							callback(true,err,reply);
						} else {
							callback(false,err,reply);
						}
					});
					redisClient.ZREM(fields.kind+":"+fields.friendId+":wait",fields.userId);
				} else {
					callback(false,err,reply);
				}
			});
		} else {
			callback(false,err,reply);
		}
	});
}

function removeFriend(fields,callback){
	callback = callback || function(){};

	if(utils.isDataExistNull(fields)){
		callback(false,ERROR.NULL_VALUE);
		return;
	}

	if(fields.userId === fields.friendId){
		callback(false,ERROR.DUPLICATE_VALUE);
		return;
	}

	redisClient.SREM(fields.kind+":"+fields.userId+":"+fields.relation,field.friendId,function(err,reply){
		if(!err && reply>0){
			redisClient.SREM(fields.kind+":"+fields.friendId+":"+fields.relation,fields.userId,function(err,reply){
				if(!err && reply>0){
					callback(true,err,reply);
				} else {
					callback(false,err,reply);
				}
			});
		} else {
			callback(false,err,reply);
		}
	});
}

//income
//userId,kind
//----------------------------------------------------------------
//outcome
//list
function getSolicitList(fields,callback){
	callback = callback || function(){};

	if(utils.isDataExistNull(fields)){
		callback(false,ERROR.NULL_VALUE);
		return;
	}

	redisClient.ZRANGEBYSCORE(fields.kind+":"+fields.userId+":solicit","-inf","+inf","WITHSCORES",function(err,reply){
		if(!err){
			var result=[];
			for(var i=reply.length-1;i>-1;i=i-2){
				if(i%2 === 1){
					result[(i-1)/2] = {};
					result[(i-1)/2]["time"] = reply[i];
				} else {
					result[i/2]["userId"] = reply[i];
				}
			}
			callback(true,err,result);
		} else {
			callback(false,err,reply);
		}
	});
}

//income
//userId,kind
//----------------------------------------------------------------
//outcome
//list
function getFriendList(fields,callback){
	callback = callback || function(){}

	if(utils.isDataExistNull(fields)){
		callback(false,ERROR.NULL_VALUE);
		return;
	}

	redisClient.SMEMBERS(fields.kind+":"+fields.userId+":friend",function(err,reply){
		if(!err){
			callback(true,err,reply);
		} else {
			callback(false,err,reply);
		}
	});
}

//income
//userId,friendId,relation,level
//----------------------------------------------------------------
//outcome
//1 for true,0 for false
function checkRelation(fields,callback){
	callback = callback || function(){}

	if(utils.isDataExistNull(fields)){
		callback(false,ERROR.NULL_VALUE);
		return;
	}

	redisClient.SISMEMBER(fields.kind+":"+fields.userId+":"+fields.relation,function(err,reply){
		if(!err){
			callback(true,err,reply);
		} else {
			callback(false,err,reply);
		}
	});
}

//--------------------------------------------------
//to clean the message position record an hour
//--------------------------------------------------
function cleanMessagePosition(){
	var now = new Date().getTime();
	console.log("clean!!");
	redisClient.ZRANGEBYSCORE("Live:message:help","-inf",now-1000*60*60,function (err,reply){
		if(reply.length>0){
			console.log("reply-->"+reply);
			for(var i=reply.length-1;i>-1;i--){
				redisClient.ZREM("Position:message:help:code",reply[i]);
				redisClient.ZREM("Position:message:help:longitude",reply[i]);
				redisClient.ZREM("Position:message:help:latitude",reply[i]);
				redisClient.ZREM("Live:message:help",reply[i]);
			}
		}
	});
}

//--------------------------------------------------
//to change Sorted set to set
//--------------------------------------------------
//income 
//two key
function ZtoS (zkey,skey,callback) {
	callback = callback || function () {
		// nothing
	};

	if(utils.isDataExistNull(zkey) || utils.isDataExistNull(skey)){
		callback(false,ERROR.NULL_VALUE);
		return;
	}
	console.log("zkey="+zkey);

	redisClient.ZRANGEBYSCORE(zkey,"-inf","+inf",function (err,reply){
		if(reply.length>0){
			redisClient.SADD(skey,reply,function (err,reply){
				callback(true);
			});
		} else {
			callback(false,null);
		}
	});
}

//
//--------------------------------------------------
//export the module
//--------------------------------------------------
//

exports.dbTestHandler = dbTestHandler;
exports.getAllUser = getAllUser;

exports.registerUser = registerUser;
exports.loginUser = loginUser;
exports.logoutUser = logoutUser;

exports.setSession = setSession;
exports.refleshSession = refleshSession;
exports.deleteSession = deleteSession;

exports.getUserByCode = getUserByCode;
exports.getUserByCoordinate = getUserByCoordinate;
exports.getMessageByCode = getMessageByCode;
exports.getMessageByCoordinate = getMessageByCoordinate;
exports.getHelpByLocation = getHelpByLocation;
exports.setPosition = setPosition;

exports.sendHelp = sendHelp;
exports.offerHelp = offerHelp;
exports.refuseToHelp = refuseToHelp;
exports.getReceiveById = getReceiveById;
exports.acceptHelp = acceptHelp;
exports.ignoreHelp = ignoreHelp;
exports.askQuestion = askQuestion;

exports.addFriend = addFriend;
exports.confirmFriend = confirmFriend;
exports.removeFriend = removeFriend; 
exports.getSolicitList = getSolicitList;
exports.getFriendList = getFriendList;
exports.checkRelation = checkRelation;

exports.getInfoByUserId = getInfoByUserId;
exports.setUserInfo = setUserInfo;

exports.getIdByPhone = getIdByPhone;
exports.getIdBySession = getIdBySession;
exports.getMessageByMessageId = getMessageByMessageId;
exports.getUMStateByMessageId = getUMStateByMessageId;
exports.getAcceptGroupByMessageId = getAcceptGroupByMessageId;
exports.getWaitGroupByMessageId = getWaitGroupByMessageId;

exports.getUserNearbySet = getUserNearbySet;
exports.getFollowerSet = getFollowerSet;


exports.cleanMessagePosition = cleanMessagePosition;