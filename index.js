var server  = require("./service/server")  ;  
var router = require("./service/route");  
var requestHandlers = require("./service/requestHandlers");
var apiHandlers = require("./api/apiHandlers");
  
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
		'/register':requestHandlers.registerPost
	},

	"api":{
		"forPost":{
			"discover":{
				"findUser":requestHandlers.findUserInAreaPost
			}
		},
		"discover":{
			"findUser":requestHandlers.findUserInArea
		}	
	}
};
console.dir(["handle",handle]);
server.start(router.route,handle);  