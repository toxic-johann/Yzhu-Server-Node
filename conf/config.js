exports.Expires = {
    fileMatch: /^(gif|png|jpg|js|css)$/ig,
    maxAge: 6
};

exports.Compress = {
    match: /css|js|html/ig
};

exports.Dir = {
	uploadDir:'./upload'
};