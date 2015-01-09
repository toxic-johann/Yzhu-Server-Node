//this handler is set to connect the mysql database
//so it just handle the database problem
var mysql = require('mysql'),
dbInfo = require('../conf/localConf.js').database;

var pool = mysql.createPool({
	connectionLimit:10,
	host : dbInfo.host,
	user : dbInfo.user,
	password : dbInfo.password
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
		connection.query('select * from event', function(err, rows, fields) {
			if (err) throw err;
			console.log('The solution is: ', rows);
			callback(rows);
		});

		connection.release();
	});
}

exports.dbTestHandler = dbTestHandler;