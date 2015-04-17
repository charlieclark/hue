var Rainbow = require("libs/rainbow");

module.exports = {
	getParameterByName : function(name) {
	    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
	    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
	        results = regex.exec(location.search);
	    return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
	},
	generateUUID : function(){
	    var d = new Date().getTime();
	    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
	        var r = (d + Math.random()*16)%16 | 0;
	        d = Math.floor(d/16);
	        return (c=='x' ? r : (r&0x3|0x8)).toString(16);
	    });
	    return uuid;
	},
	addLeadingZero : function(n, length) {
    var str = (n > 0 ? n : -n) + "";
    var zeros = "";
    for (var i = length - str.length; i > 0; i--)
        zeros += "0";
    zeros += str;
    return n >= 0 ? zeros : "-" + zeros;
	},
	extendColors : function(colors, n) {
		var result = colors.slice(0, colors.length);
		var l = result.length;
		while(l < n) {
			var copiedColors = colors.slice(0, colors.length);
			result.push.apply(result, copiedColors);
			l = result.length;
		}
		result = result.slice(result, n);
		return result;
	},
	createGradientStops : function(colors, n) {
			var rainbow = new Rainbow();
			rainbow.setSpectrum.apply( rainbow, colors );

			var gradients = [];
			for(var i = 0; i < n; i++) {
				var i1 = i/n;
				var i2 = (i+1)/n;
				var color1 = rainbow.colourAt( i1 * 100 );
				var color2 = rainbow.colourAt( i2 * 100 );
				gradients.push( ['#'+color1, '#'+color2] );
			}

			return gradients;
	}
}