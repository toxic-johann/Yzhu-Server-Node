/*
save for some utils for backstage
*/

//determine the range request
//Range: bytes=[start]-[end][,[start]-[end]]
/*
 bytes=0-99，从0到99之间的数据字节。
    bytes=-100，文件的最后100个字节。
    bytes=100-，第100个字节开始之后的所有字节。
    bytes=0-99,200-299，从0到99之间的数据字节和200到299之间的数据字节。
    */
exports.parseRange = function (str,size){
	if(str.indexOf(",") != -1){
		return;
	}

	var range = str.split("-"),
	start = parseInt(range[0],10),
	end = parseInt(range[1],10);
	//get the range

	//case:-100
	if(isNaN(start)){
		start = size - end;
		end = size -1;
		//caculate it
	} else if (isNaN(end)) {
		//case:100-
		end = size -1;
	}

	//Invalid
	if(isNaN(start) || isNaN(end) || start > end || end >size){
		return;
	}

	return {start:start,end:end};
};

exports.isDataExistNull = function (data) {
	// judge whether the data is null
	if(data instanceof Array){
		//why not use for-in
		//because for-in will throw error
		//when it detected null or undefined
		for(var i = data.length-1;i--;i>=0 ){
			if(data[i] === '' || data[i] === undefined || data[i] === null){
				return true;
			}
		}
		return false;
	} else if (data instanceof Object){
		for (var sample in data){
			if(data[sample] === ""){
				return true;
			}
		}
		return false;
	} else {
		if(data === '' || data === undefined || data === null){
			return true;
		}
		return false;
	}
}

exports.objectMerge = function (a,b) {
	// body...
	var len_a = Object.getOwnPropertyNames(a).length,
	len_b = Object.getOwnPropertyNames(b).length,
	result={};
	if(len_a >= len_b){
		result = a;
		for(var prop in b){
			if(b.hasOwnProperty(prop) && !a.hasOwnProperty(prop)){
				result[prop] = b[prop];
			}
		}
		return result;
	} else {
		return arguments.callee(b,a);
	}
}

exports.selectRandomAndUnique = function (object,num) {
	// random sort the object
	// then return the upper one
	if(object.length <= num){
		return object;
	}
	var result=[];
	object.sort(function () {return 0.5-Math.random();});
	for(var i=0;i<num;i++){
		result[i] = object[i];
	}
	return result;
}