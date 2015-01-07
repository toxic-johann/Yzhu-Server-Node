/*--------- utf-8 ------------------*/
/*
this js module is depend on the book <Professional Javascript for Web Developers>
build by johann on 12.20.2014
*/

'use strict'

//为wrox创建命名空间
var Wrox = {};
Wrox.ProJS = {};

//selector API modify the jquery
Wrox.ProJS.SelectorUtil = {
	
	//select by ID
	getElementsByID:function(ID_name,node){
		node = node||window.document;
		return node.getElementsByID(ID_name);
	},

	//select by Class name
	getElementsByClassName:function(class_name,node){
		node = node||window.document;
		if(node.getElementsByClassName){
			return node.getElementsByClassName(class_name);
		}
		else{//to check out
			var results = new Array();
			var allElems = node.getElementsByTag("*");
			for(var i=allElems.length;i>0;i--){
				if(allElems[i].className.indexOf(class_name) != -1){
					results.unshift(allElems[i]);
				}
			}
		}
	},

	//select by tag
	getElementsByTag:function(Tag_name,node){
		node = node||window.document;
		return node.getElementsByTag(Tag_name);
	}
};

Wrox.ProJS.EventUtil = {
	//add event to the element
	addHandler:function (element,type,handler){
		if(element.addEventListen){
			element.addEventListen(type,handler,false);
		} else if (element.attachEvent) {
			elemtn.attachEvent("on"+type,handler);
		} else {
			element["on"+type] = handler;
		}
	},

	//remove event from element
	removeHandler:function (element,type,handler){
		if(element.removerEventListener){
			element.removerEventListener(type,handler,false);
		} else if (element.detachEvent) {
			element.detachEvent("on"+type,handler);
		} else {
			element["on" + type] = null;
		}
	},

	//get event
	getEvent:function (event){
		return event ?　event : window.event;
	},

	//get event's target
	getTarget:function (event){
		return event.target || event.srcElement;
	},

	//remove event's default behavior
	preventDefault:function (event){
		if(event.preventDefault){
			event.preventDefault();
		} else {
			event.returnValue = false;
		}
	},

	//stop event
	stopPropagation:function (event){
		if(event.stopPropagation){
			event.stopPropagation();
		} else {
			event.cancelBubbles = true;
		}
	},

	getRelatedTarget: function(event){
		if (event.relatedTarget){
			return event.relatedTarget;
		} else if (event.toElement){
			return event.toElement;
		} else if (event.fromElement){
			return event.fromElement;
		} else {
			return null;
		}
	},

	//get the wheel of the mouse
	getWheelDelta: function(event){
		if(event.wheelDelta){
			return (client.engine.opera && client.engine.opera<9.5 ? -event.wheelDelta : event.wheelDelta);
		} else {
			return -event.detail*40
		}
	},

	//get the keyboard press
	getCharCode: function(event){
		if(typeof event.charCode === "number"){
			return event.charCode;
		} else {
			return event.keyCode;
		}
	}
};

Wrox.ProJS.AjaxUtil = {
	//create xmlhttp
	createXHR:function (){
		if(typeof XMLHttpRequest != "undefined"){
			return new XMLHttpRequest();
		} else if (typeof ActiveXObject != "undefined"){
			if (typeof arguments.callee.activeXString != "string"){
				var versions = ["MSXML2.XMLHttp.6.0","MSXML2.XMLHttp.3.0","MSXML2.XMLHttp"],
				i,len;

				for(i=0,len=versions.length;i<len;i++){
					try{
						new ActiveXObject(versions[i]);
						arguments.callee.activeXString = versions[i];
						break
					} catch (ex){
						//nothing 
						//use try and catch to find the suit version
					}
				}
			}

			return new ActiveXObject(arguments.callee.activeXString);
		} else {
			throw new Error("no XHR object available")
		}
	}
};

