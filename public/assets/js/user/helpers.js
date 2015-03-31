var Helpers = {};

//dimensions calculations
Helpers.dim = {
	backstretch : function(rootWidth, rootHeight, ratio){

		var returnDim = {left: 0, top: 0};

    	var bgWidth = rootWidth
    	var bgHeight = bgWidth / ratio;
    	var bgOffset;
       
		if (bgHeight >= rootHeight) {
            bgOffset = (bgHeight - rootHeight) / 2;
            returnDim.top = bgOffset;
        } else {
            bgHeight = rootHeight;
            bgWidth = bgHeight * ratio;
            bgOffset = (bgWidth - rootWidth) / 2;
            returnDim.left = bgOffset;
        }

        returnDim.width = bgWidth;
        returnDim.height = bgHeight;

        return returnDim;
	}
}

Helpers.load = {
	loadFiles : function(files, callback, prefix ){
		//check if file is in array, if not wrap
		files = Helpers.test.isString(files) ? [files] : files;
		
		//create empty object to hold copy
		var copy = Helpers.test.isArray(files) ? [] : {};

		prefix = prefix || "";
		var queue = new createjs.LoadQueue();
		queue.addEventListener("fileload", function(event){
			if(callback) callback(event);
		});
		_.each(files,function(file,key){
			queue.loadFile( prefix + file );
			copy[key] = prefix + file;
		});
		queue.load();
		return copy;
	}
}

Helpers.test = {
	isArray : function( obj ){
		return Object.prototype.toString.call( obj ) === '[object Array]';
	},
	isString : function( obj ){
		return typeof obj === 'string';
	}
}

Helpers.color = {
	randomHex : function(){

		return "#" + (Math.random().toString(16) + '000000').slice(2, 8);
	},
	changeColor : function(color, ratio, darker) {
        // Calculate ratio
        var difference = Math.round(ratio * 256) * (darker ? -1 : 1),
            // Convert hex to decimal
            decimal =  color.replace(
                /^#?([a-f0-9][a-f0-9])([a-f0-9][a-f0-9])([a-f0-9][a-f0-9])/i,
                function() {
                    return parseInt(arguments[1], 16) + ',' +
                        parseInt(arguments[2], 16) + ',' +
                        parseInt(arguments[3], 16);
                }
            ).split(/,/),
            returnValue;
        return[
                '#',
                Helpers.pad(Math[darker ? 'max' : 'min'](
                    parseInt(decimal[0], 10) + difference, darker ? 0 : 255
                ).toString(16), 2),
                Helpers.pad(Math[darker ? 'max' : 'min'](
                    parseInt(decimal[1], 10) + difference, darker ? 0 : 255
                ).toString(16), 2),
                Helpers.pad(Math[darker ? 'max' : 'min'](
                    parseInt(decimal[2], 10) + difference, darker ? 0 : 255
                ).toString(16), 2)
            ].join('');
    },
    getLuma : function(hexcolor){

    	hexcolor = hexcolor.replace("#","");
        var r = parseInt(hexcolor.substr(0,2),16);
	    var g = parseInt(hexcolor.substr(2,2),16);
	    var b = parseInt(hexcolor.substr(4,2),16);
	    var yiq = ((r*299)+(g*587)+(b*114))/1000;
        return yiq;
    },
    rgbToHex : function( r, g, b, noHash ){

    	return (noHash ? "" : "#") + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }, 
    hexToRgb : function( hex ){

    	var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	    return result ? {
	        r: parseInt(result[1], 16),
	        g: parseInt(result[2], 16),
	        b: parseInt(result[3], 16)
	    } : null;
    }
}

Helpers.canvas = {
	generateCanvas : (function(){
		function generateCanvas(){
			this.canvas = document.createElement('canvas');
			this.ctx = this.canvas.getContext("2d");
			$(this.canvas).data("helpers", this);
		}
		generateCanvas.prototype.drawImage = function(img){
			var w = img.width;
			var h = img.height;
			this.resize(w,h);
			this.ctx.drawImage( img, 0, 0 );
		}
		generateCanvas.prototype.resize = function(w,h){
			var pixelRatio = 1;
			var canvas = this.canvas;
			canvas.width = w;
			canvas.height = h;
		    canvas.style.width = w*pixelRatio + "px";
		    canvas.style.height = h*pixelRatio + "px";
		}
		return generateCanvas;
	})()
}

//misc
Helpers.bgImagesFromData = function( $el ){
	$el.find('[data-image-src]').each( function(){
		var src = $(this).data('image-src');
		$(this).css({
			'background-image' : "url('" + src + "')"
		});
	});
}

Helpers.pad = function(num, totalChars) {
    var pad = '0';
    num = num + '';
    while (num.length < totalChars) {
        num = pad + num;
    }
    return num;
}

Helpers.jQUi = function( view ){
	return this.jQEls( view.ui, view.$el );
}

Helpers.jQEls = function(els, $parent, singleKey){
	$parent = $parent || $("body");
	if(!singleKey){
		var $els = {};
		_.each( els, function(value, key){
    		$els[key] = $parent.find(value);
    	});
    	$els.body = $("body");
    	$els.html = $("html");
	} else {
		$els[singleKey] = $parent.find( els[singleKey] );
	}
	return $els;
}

module.exports = Helpers;
