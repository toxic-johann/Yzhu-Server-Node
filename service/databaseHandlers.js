//this handler is set to connect the mysql database
//so it just handle the database problem
var mysql = require('mysql'),
dbInfo = require('../conf/localConf.js').database,
utils = require('./utils.js');

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

	//check the fields
	if(utils.isDataExistNull(fields)){
		callback(false,1048);
		return;
	}

	pool.getConnection(function (err,connection) {
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
	});
};

//income
//sessionId,userId
function setSession (sessionId,userId,callback) {
	// check the input
	if(utils.isDataExistNull(sessionId) || utils.isDataExistNull(userId)){
		callback(false,1048);
		return;
	}

	pool.getConnection(function (err,connection) {
		// insert id
		var sql = "INSERT INTO session(sessionId,userId) VALUES ("+connection.escape(sessionId)+","+connection.escape(userId)+")";
		connection.query(sql,function (err1,rows){
			if(err1) {
				callback(false,err1.errno);
				console.log(err1);
			} else {
				callback(true);
			}
		});

		connection.release();
	});
}

//income
//cellPhone
//------------
//outcome
//password
function loginUser (cellPhone,callback) {
	// check cellPhone
	if(utils.isDataExistNull(cellPhone)){
		callback(false,1048);
		return;
	}

	pool.getConnection(function (err,connection) {
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
	});	
}

//income
//sessionId
//-------------------------------
//outcome
//userId
function getIdFromSession (sessionId,callback) {
	// check session
	if(utils.isDataExistNull(sessionId)){
		callback(false,1048);
		return;
	}

	pool.getConnection(function (err,connection){
		//select user_id
		connection.query("SELECT userId FROM session WHERE sessionId = "+connection.escape(sessionId),function (err1,rows){
			if(err1){
				callback(false,err1.errno);
				console.log(err1);
			} else{
				callback(true,0,rows);
			}
		});

		connection.release();
	});
}

//income
//code
//-----------------------------------------------
//output
//userId(s)
function getUserByCode (code,callback) {
	// check the code
	if(utils.isDataExistNull(code)){
		callback(false,1048);
		return;
	}

	pool.getConnection(function (err,connection) {
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
	});
}

//income
//two corner(leftup and rightbottom)
//-----------------------------------------------
//output
//userId(s)
function getUserByCoordinate (corner,callback) {
	// check corner
	if(utils.isDataExistNull(corner)){
		callback(false,1048);
		return;
	}

	console.log('woww');
	pool.getConnection(function (err,connection) {
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
	});
}

//income
//userId
//------------------------------------------------
//output
//all info
function getInfoById (userId,callback) {
	// body...
	if(utils.isDataExistNull(userId)){
		callback(false,1048);
		return;
	}

	pool.getConnection(function (err,connection) {
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
	});
}

//income
//sessionId
function deleteSession (sessionId,callback) {
	//check sessionId
	if(utils.isDataExistNull(sessionId)){
		callback(false,1048);
		return;
	}

	pool.getConnection(function (err,connection){
		connection.query("DELETE FROM session WHERE sessionId = "+connection.escape(sessionId),function (err1,rows){
			if(err1){
				callback(false,err1.errno);
				console.log(err1);
			} else {
				callback(true);
			}
		});

		connection.release();
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

exports.setSession = setSession;
exports.getIdFromSession = getIdFromSession;
exports.deleteSession = deleteSession;

exports.getUserByCode = getUserByCode;
exports.getUserByCoordinate = getUserByCoordinate;

exports.getInfoById = getInfoById;