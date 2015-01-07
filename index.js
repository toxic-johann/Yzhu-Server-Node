var server  = require("./service/server")  ;  
var router = require("./service/route");  
var requestHandlers = require("./service/requestHandlers"); 
//one more stupid test
  
//创建handle映射类，就是将请求路径和具体的action函数进行映射关联
  
var handle = {
	"/":requestHandlers.start,
	"/start":requestHandlers.start,
	"/upload":requestHandlers.upload,
	"/lib":requestHandlers.lib,
	"/client":requestHandlers.client,
	"/image":requestHandlers.image,
	"/db-test":requestHandlers.dbTest,

	"forPost":{
		'/image':requestHandlers.imagePost,
		'/upload':requestHandlers.uploadPost
	}
};
console.dir(["handle",handle]);
server.start(router.route,handle);  