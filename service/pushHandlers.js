var JPush = require("../node_modules/jpush-sdk/lib/JPush/JPush.js"),
client = JPush.buildClient('b5cf96ad6c8f30972b5aca09', '2650144b991243ea2df68a34'),
Primus = require('primus');

function pushNotification (alert,alias) {
	client.push().setPlatform('android')
    .setAudience(JPush.alias(alias))
    .setNotification(JPush.android(alert))
    .send(function(err, res) {
        if (err) {
            console.log(err.message);
        } else {
            console.log('Sendno: ' + res.sendno);
            console.log('Msg_id: ' + res.msg_id);
        }
    });
}

/*var primusClient = {
	primus:Primus.connect('ws://localhost:3333'),
	
	joinRoom:function (room,uid){
		primus.write({action:"join",room:room,uid:uid});
	},

	send:function (room,message,uid){
		primus.write({room:room,message:message});
	},

	leaveRoom:function (room){
		primus.write({action:'leave',room:room});
	}
}*/

exports.pushNotification = pushNotification;