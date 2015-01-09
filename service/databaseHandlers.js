//this handler is set to connect the mysql database
//so it just handle the database problem
var mysql = require('mysql'),
dbInfo = require('../conf/localConf.js').database;

var connection = mysql.createConnection({
	host : dbInfo.host,
	user : dbInfo.user,
	password : dbInfo.password
});

function dbTestHandler (callback) {
	// here is just to test the mysql server
	connection.connect();

	connection.query('SELECT 1 + 1 AS solution', function(err, rows, fields) {
		if (err) throw err;
		console.log('The solution is: ', rows[0].solution);
		callback(rows[0].solution);
	});

	connection.end();
};

exports.dbTestHandler = dbTestHandler;