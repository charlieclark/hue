var connect = require('connect');
var serveStatic = require('serve-static');
var hue = require("./hue/index.js");


connect().use(serveStatic(__dirname)).listen(9679);

window.addEventListener('message', function(e) {

	var data = JSON.parse( e.data );
	hue.updateLights( data );
});
