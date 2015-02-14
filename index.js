var server  = require("./service/server")  ;  
var router = require("./service/route");  
var requestHandlers = require("./service/requestHandlers");
var apiHandlers = require("./service/apiHandlers");
  
//创建handle映射类，就是将请求路径和具体的action函数进行映射关联
  
var handle = {
	"/":requestHandlers.start,
	"/register":requestHandlers.register,
	"/login":requestHandlers.login,
	"/start":requestHandlers.start,
	"/upload":requestHandlers.upload,
	"/lib":requestHandlers.lib,
	"/client":requestHandlers.client,
	"/image":requestHandlers.image,
	"/db-test":requestHandlers.dbTest,

	"forPost":{
		'/image':requestHandlers.imagePost,
		'/upload':requestHandlers.uploadPost,
		'/login':requestHandlers.loginPost,
		'/logout':requestHandlers.logoutPost,
		'/register':requestHandlers.registerPost
	},

	"api":{
		"forPost":{
			"auth":{
				"login":requestHandlers.loginPost,
				"register":requestHandlers.registerPost,
				"logout":requestHandlers.logoutPost,
				"checkphone":requestHandlers.checkPhonePost
			},
			"discover":{
				"setposition":requestHandlers.setPositionPost,
				"finduser":requestHandlers.findUserInAreaPost,
				"findmessage":requestHandlers.findMessageInAreaPost,
			},
			"message":{
				"sendhelp":requestHandlers.sendHelpPost,
				"offerhelp":requestHandlers.offerHelpPost,
				"receive":requestHandlers.myReceivePost,//the message push to me
				"refusetohelp":requestHandlers.refuseToHelpPost,
				"helpinfo":requestHandlers.helpInfoPost,
				"askquestion":requestHandlers.askQuestionPost
			},
			"group":{
				"accept":requestHandlers.acceptGroupPost,
				"wait":requestHandlers.waitGroupPost,
				"accepthelp":requestHandlers.acceptHelpPost,
				"ignorehelp":requestHandlers.ignoreHelpPost
			},
			"user":{
				"setuserinfo":requestHandlers.setUserInfoPost,
				"getuserinfo":requestHandlers.getUserInfoPost
			},
			"relation":{
				"tofollow":requestHandlers.toFollowPost
			}
		},
		"discover":{
			"setposition":requestHandlers.setPosition,
			"finduser":requestHandlers.findUserInArea,
			"findmessage":requestHandlers.findMessageInArea
		},
		"message":{
			"sendhelp":requestHandlers.sendHelp,
			"receive":requestHandlers.myReceive,
			"help":requestHandlers.theHelp
		},
		"relation":{
			"addfriend":requestHandlers.addFriendByUserIdPost,
			"addfriendbyphone":requestHandlers.addFreindByPhonePost,
			"confirmfriend":requestHandlers.confirmFriendPost,
			"removefriend":requestHandlers.deleteFriendPost,
			"friendlist":requestHandlers.friendListPost,
			"isfriend":requestHandlers.isFriendPost,
			"addcontact":requestHandlers.addContactByUserIdPost,
			"addContactByPhone":requestHandlers.addContactByPhone,
			"confirmcontact":requestHandlers.confrimContactPost,
			"removecontact":requestHandlers.removeContactPost,
			"iscontact":requestHandlers.isContactPost,
			"solicitlist":requestHandlers.solicitListPost
		}
	}
};
console.dir(["handle",handle]);
server.start(router.route,handle);  