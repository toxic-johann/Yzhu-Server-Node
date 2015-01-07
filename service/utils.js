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