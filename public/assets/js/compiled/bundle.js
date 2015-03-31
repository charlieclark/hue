(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
window.Common = {
	path : {
		assets : "assets/",
		img : "assets/img/",
		audio : "assets/audio/"
	},
	sizes :{
		frame : 10
	}
};

//base
var AppRouter 		= require( "controllers/appRouter" );
var AppLayout 		= require( "views/appLayout" );

//custom
var CalendarView	= require("views/calendar");

//THE APPLICATION
var MyApp = Marionette.Application.extend({
	initialize : function(){
		
	},
	onStart : function(){
		Backbone.history.start({
			pushState : false
		});
		AppLayout.render(); 
		console.log("!!!!!!!!asdasdsadas!!!!")

		var myCalendar = new CalendarView();
		AppLayout.getRegion("main").show( myCalendar );
	} 
});



$(function(){
	window.app = new MyApp();
	window.app.start(); 
});







         
},{"controllers/appRouter":3,"views/appLayout":12,"views/calendar":13}],2:[function(require,module,exports){
var MyAppController = Marionette.Controller.extend({
	loadPage : function( pageName ){
		console.log("PAGE NAasdasdasdasdME::", pageName );         
		this.trigger("pageLoaded", pageName);
	}
});

MyAppController.events = "test";

module.exports =  new MyAppController();

},{}],3:[function(require,module,exports){
var AppController = require("controllers/appController");

var MyAppRouter = Marionette.AppRouter.extend({
	controller : AppController,
	appRoutes : {
		":page" : "loadPage"
	}
});

module.exports = new MyAppRouter();

},{"controllers/appController":2}],4:[function(require,module,exports){
var pipe = require("pipe");

//listening for load
window.handleClientLoad = function(){

	console.log("ASDASDSA")
	init();
}

var clientId = '433839723365-u7grldtvf8pabjkj4frcio3cv5hit8fm.apps.googleusercontent.com';
var apiKey = 'AIzaSyBsKdTplRXuEwgvPSH_gGF8OGsw35t15v0';
var scopes = 'https://www.googleapis.com/auth/calendar';
var calId = "b-reel.com_2d34343238393637302d363433@resource.calendar.google.com";



function init(){
	gapi.client.setApiKey(apiKey);
	checkAuth();
}

function checkAuth(){
	gapi.auth.authorize( {
		client_id: clientId, 
		scope: scopes, 
		immediate: true
	}, handleAuthResult );
}

function handleAuthResult( authResult ){

	if(authResult){
		makeApiCall();
	}
}

function makeApiCall() {
  gapi.client.load('calendar', 'v3', function() {

    var from = new Date().toISOString();

    console.log(from)

    var request = gapi.client.calendar.events.list({
      'calendarId': calId,
      timeMin : from
     });

   request.then(function(response) {
      // appendResults(response.result.longUrl);
      console.log(response.result);
      events.trigger( "eventsLoaded", response.result );
    }, function(reason) {
      console.log('Error: ' + reason.result.error.message);
    });
          
    // request.execute(function(resp) {
    //   for (var i = 0; i < resp.items.length; i++) {
    //     var li = document.createElement('li');
    //     li.appendChild(document.createTextNode(resp.items[i].summary));
    //     document.getElementById('events').appendChild(li);
    //   }
    // });
  });
}

var events = _.extend({

}, Backbone.Events);

module.exports = {

  events : events
};

},{"pipe":9}],5:[function(require,module,exports){
var windowParent = null;

function init(){

	windowParent = window.parent;
}

function update( data ){

	var stringData = JSON.stringify( data );

	if( windowParent ){

		windowParent.postMessage( stringData, "*" );		
	}
}

var throttledUpdate = _.throttle( update, 1000, {leading: false} );

init();

module.exports = {
	init : init,
	update : throttledUpdate
}
},{}],6:[function(require,module,exports){
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

},{}],7:[function(require,module,exports){
var CalendarModel = Backbone.Model.extend({
	defaults : {
		summary : "n/a",
		description : "n/a",
		start : "n/a",
		end : "n/a",
	}
})

module.exports = CalendarModel;
},{}],8:[function(require,module,exports){
var state = new (Backbone.Model.extend({
	defaults : {
		// "nav_open" 		: false,
		// 'scroll_at_top' : true,
		// 'minimal_nav' 	: false,
		// 'full_nav_open'	: false,
		// 'ui_display'	: false
	}
}))();

module.exports = state;

},{}],9:[function(require,module,exports){
var pipe = _.extend({

	
	
}, Backbone.Events);

module.exports = pipe;
},{}],10:[function(require,module,exports){
module.exports = "<input class=\"color\" type=\"color\" name=\"favcolor\">\n<div class=\"main-list\"></div>\n\n";

},{}],11:[function(require,module,exports){
module.exports = "<% if( summary ){ %>\n\t<h2>summary : <%= summary %></h2>\n<% } %>\n\n<% if( description ){ %>\n\t<h3>description : <%= description %></h3>\n<% } %>\n\n<% if( start ){ %>\n\t<h3>start : <%= start.dateTime %></h3>\n<% } %>\n\n<% if( end ){ %>\n\t<h3>end : <%= end.dateTime %></h3>\n<% } %>";

},{}],12:[function(require,module,exports){
var State 		= require("models/state");

var MyAppLayout = Marionette.LayoutView.extend({
	el : "#content",
	template : false,
	regions : {
		main : "#main"
	}, 
	initialize : function(){
		var _this = this;

		//wrapping html
		this.$html = $("html");
		this.$html.removeClass("hidden");

		//resize events
		$(window).resize(function(){
			_this.onResizeWindow();
		}).resize();

		this.listenForState();
	},
	listenForState : function(){
		//state change
		this.listenTo( State, "change", function( e ){

			this.onStateChange( e.changed, e._previousAttributes );
		}, this);
		this.onStateChange( State.toJSON() );
	},
	onStateChange : function( changed, previous ){

		_.each( changed, function(value, key){
			
			if( _.isBoolean( value ) ){
				this.$html.toggleClass("state-"+key, value);
				this.$html.toggleClass("state-not-"+key, !value);
			} else {
				var prevValue = previous[ key ];
				if(prevValue){
					this.$html.toggleClass("state-"+key+"-"+prevValue, false);
				}
				this.$html.toggleClass("state-"+key+"-"+value, true);
			}

		}, this );
	},
	onResizeWindow : function(){
		Common.ww = $(window).width();
		Common.wh = $(window).height();
	}
});

module.exports = new MyAppLayout();
},{"models/state":8}],13:[function(require,module,exports){
var calendarLoad = require("controllers/calendarLoad");
var CalendarItems 	= require("views/calendarItems");
var CalendarModel 	= require("models/calendarModel");
var helpers = require("helpers"); 
var updateLights = require("controllers/updateLights");

var CalendarView = Marionette.LayoutView.extend({
	template : _.template( require("templates/calendar.html") ),
	regions : {
		mainList : ".main-list"
	},
	ui : {
		colorPicker : ".color"
	},
	initialize : function(){
		
		this.listenTo( calendarLoad.events, "eventsLoaded", this.eventsLoaded );
	},
	onShow : function(){

		var colorPicker = this.ui.colorPicker;
		$(colorPicker).change(function(){
			var val = $(this).val();
			var color = one.color(val);

			var hsl = {
				h : Math.floor( color.h() * 360), 
				s : Math.floor( color.s() * 100),
				l : Math.floor( color.l() * 100) 
			};

			console.log(hsl)

			// updateLights.update([
			// 	{
			// 		'id' : 1,
			// 		'data' : {
			// 			'hsl' : hsl
			// 		}
			// 	},
			// 	{
			// 		'id' : 2,
			// 		'data' : {
			// 			'hsl' : hsl
			// 		}
			// 	},
			// 	{
			// 		'id' : 3,
			// 		'data' : {
			// 			'hsl' : hsl
			// 		}
			// 	}
			// ]);
		});

	},
	eventsLoaded : function( data ){
		
		var myCalendarItems = new CalendarItems();

		_.each( data.items, function( item ){

			var m = new CalendarModel( item );
			myCalendarItems.collection.add( m );
		});

		this.getRegion("mainList").show( myCalendarItems );
	}          
});


module.exports = CalendarView;                    
    
 
},{"controllers/calendarLoad":4,"controllers/updateLights":5,"helpers":6,"models/calendarModel":7,"templates/calendar.html":10,"views/calendarItems":15}],14:[function(require,module,exports){
var CalendarItem = Marionette.ItemView.extend({
	className : "item",
	template : _.template( require("templates/calendarItem.html") ),
	ui : {
		'title' : "h2"
	},
	events : {
		'click @ui.title' : function(){


		}
	}
});

module.exports = CalendarItem;
},{"templates/calendarItem.html":11}],15:[function(require,module,exports){
var CalendarItem 	= require("views/calendarItem");

var CalendarItems = Marionette.CollectionView.extend({

	childView : CalendarItem,
	collection : new Backbone.Collection()
});

module.exports = CalendarItems;
},{"views/calendarItem":14}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIuLi9wdWJsaWMvYXNzZXRzL2pzL3VzZXIvYXBwLmpzIiwiLi4vcHVibGljL2Fzc2V0cy9qcy91c2VyL2NvbnRyb2xsZXJzL2FwcENvbnRyb2xsZXIuanMiLCIuLi9wdWJsaWMvYXNzZXRzL2pzL3VzZXIvY29udHJvbGxlcnMvYXBwUm91dGVyLmpzIiwiLi4vcHVibGljL2Fzc2V0cy9qcy91c2VyL2NvbnRyb2xsZXJzL2NhbGVuZGFyTG9hZC5qcyIsIi4uL3B1YmxpYy9hc3NldHMvanMvdXNlci9jb250cm9sbGVycy91cGRhdGVMaWdodHMuanMiLCIuLi9wdWJsaWMvYXNzZXRzL2pzL3VzZXIvaGVscGVycy5qcyIsIi4uL3B1YmxpYy9hc3NldHMvanMvdXNlci9tb2RlbHMvY2FsZW5kYXJNb2RlbC5qcyIsIi4uL3B1YmxpYy9hc3NldHMvanMvdXNlci9tb2RlbHMvc3RhdGUuanMiLCIuLi9wdWJsaWMvYXNzZXRzL2pzL3VzZXIvcGlwZS5qcyIsIi4uL3B1YmxpYy9hc3NldHMvanMvdXNlci90ZW1wbGF0ZXMvY2FsZW5kYXIuaHRtbCIsIi4uL3B1YmxpYy9hc3NldHMvanMvdXNlci90ZW1wbGF0ZXMvY2FsZW5kYXJJdGVtLmh0bWwiLCIuLi9wdWJsaWMvYXNzZXRzL2pzL3VzZXIvdmlld3MvYXBwTGF5b3V0LmpzIiwiLi4vcHVibGljL2Fzc2V0cy9qcy91c2VyL3ZpZXdzL2NhbGVuZGFyLmpzIiwiLi4vcHVibGljL2Fzc2V0cy9qcy91c2VyL3ZpZXdzL2NhbGVuZGFySXRlbS5qcyIsIi4uL3B1YmxpYy9hc3NldHMvanMvdXNlci92aWV3cy9jYWxlbmRhckl0ZW1zLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkxBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNOQTtBQUNBOztBQ0RBO0FBQ0E7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIndpbmRvdy5Db21tb24gPSB7XG5cdHBhdGggOiB7XG5cdFx0YXNzZXRzIDogXCJhc3NldHMvXCIsXG5cdFx0aW1nIDogXCJhc3NldHMvaW1nL1wiLFxuXHRcdGF1ZGlvIDogXCJhc3NldHMvYXVkaW8vXCJcblx0fSxcblx0c2l6ZXMgOntcblx0XHRmcmFtZSA6IDEwXG5cdH1cbn07XG5cbi8vYmFzZVxudmFyIEFwcFJvdXRlciBcdFx0PSByZXF1aXJlKCBcImNvbnRyb2xsZXJzL2FwcFJvdXRlclwiICk7XG52YXIgQXBwTGF5b3V0IFx0XHQ9IHJlcXVpcmUoIFwidmlld3MvYXBwTGF5b3V0XCIgKTtcblxuLy9jdXN0b21cbnZhciBDYWxlbmRhclZpZXdcdD0gcmVxdWlyZShcInZpZXdzL2NhbGVuZGFyXCIpO1xuXG4vL1RIRSBBUFBMSUNBVElPTlxudmFyIE15QXBwID0gTWFyaW9uZXR0ZS5BcHBsaWNhdGlvbi5leHRlbmQoe1xuXHRpbml0aWFsaXplIDogZnVuY3Rpb24oKXtcblx0XHRcblx0fSxcblx0b25TdGFydCA6IGZ1bmN0aW9uKCl7XG5cdFx0QmFja2JvbmUuaGlzdG9yeS5zdGFydCh7XG5cdFx0XHRwdXNoU3RhdGUgOiBmYWxzZVxuXHRcdH0pO1xuXHRcdEFwcExheW91dC5yZW5kZXIoKTsgXG5cdFx0Y29uc29sZS5sb2coXCIhISEhISEhIWFzZGFzZHNhZGFzISEhIVwiKVxuXG5cdFx0dmFyIG15Q2FsZW5kYXIgPSBuZXcgQ2FsZW5kYXJWaWV3KCk7XG5cdFx0QXBwTGF5b3V0LmdldFJlZ2lvbihcIm1haW5cIikuc2hvdyggbXlDYWxlbmRhciApO1xuXHR9IFxufSk7XG5cblxuXG4kKGZ1bmN0aW9uKCl7XG5cdHdpbmRvdy5hcHAgPSBuZXcgTXlBcHAoKTtcblx0d2luZG93LmFwcC5zdGFydCgpOyBcbn0pO1xuXG5cblxuXG5cblxuXG4gICAgICAgICAiLCJ2YXIgTXlBcHBDb250cm9sbGVyID0gTWFyaW9uZXR0ZS5Db250cm9sbGVyLmV4dGVuZCh7XG5cdGxvYWRQYWdlIDogZnVuY3Rpb24oIHBhZ2VOYW1lICl7XG5cdFx0Y29uc29sZS5sb2coXCJQQUdFIE5BYXNkYXNkYXNkYXNkTUU6OlwiLCBwYWdlTmFtZSApOyAgICAgICAgIFxuXHRcdHRoaXMudHJpZ2dlcihcInBhZ2VMb2FkZWRcIiwgcGFnZU5hbWUpO1xuXHR9XG59KTtcblxuTXlBcHBDb250cm9sbGVyLmV2ZW50cyA9IFwidGVzdFwiO1xuXG5tb2R1bGUuZXhwb3J0cyA9ICBuZXcgTXlBcHBDb250cm9sbGVyKCk7XG4iLCJ2YXIgQXBwQ29udHJvbGxlciA9IHJlcXVpcmUoXCJjb250cm9sbGVycy9hcHBDb250cm9sbGVyXCIpO1xuXG52YXIgTXlBcHBSb3V0ZXIgPSBNYXJpb25ldHRlLkFwcFJvdXRlci5leHRlbmQoe1xuXHRjb250cm9sbGVyIDogQXBwQ29udHJvbGxlcixcblx0YXBwUm91dGVzIDoge1xuXHRcdFwiOnBhZ2VcIiA6IFwibG9hZFBhZ2VcIlxuXHR9XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBuZXcgTXlBcHBSb3V0ZXIoKTtcbiIsInZhciBwaXBlID0gcmVxdWlyZShcInBpcGVcIik7XG5cbi8vbGlzdGVuaW5nIGZvciBsb2FkXG53aW5kb3cuaGFuZGxlQ2xpZW50TG9hZCA9IGZ1bmN0aW9uKCl7XG5cblx0Y29uc29sZS5sb2coXCJBU0RBU0RTQVwiKVxuXHRpbml0KCk7XG59XG5cbnZhciBjbGllbnRJZCA9ICc0MzM4Mzk3MjMzNjUtdTdncmxkdHZmOHBhYmprajRmcmNpbzNjdjVoaXQ4Zm0uYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20nO1xudmFyIGFwaUtleSA9ICdBSXphU3lCc0tkVHBsUlh1RXdndlBTSF9nR0Y4T0dzdzM1dDE1djAnO1xudmFyIHNjb3BlcyA9ICdodHRwczovL3d3dy5nb29nbGVhcGlzLmNvbS9hdXRoL2NhbGVuZGFyJztcbnZhciBjYWxJZCA9IFwiYi1yZWVsLmNvbV8yZDM0MzQzMjM4MzkzNjM3MzAyZDM2MzQzM0ByZXNvdXJjZS5jYWxlbmRhci5nb29nbGUuY29tXCI7XG5cblxuXG5mdW5jdGlvbiBpbml0KCl7XG5cdGdhcGkuY2xpZW50LnNldEFwaUtleShhcGlLZXkpO1xuXHRjaGVja0F1dGgoKTtcbn1cblxuZnVuY3Rpb24gY2hlY2tBdXRoKCl7XG5cdGdhcGkuYXV0aC5hdXRob3JpemUoIHtcblx0XHRjbGllbnRfaWQ6IGNsaWVudElkLCBcblx0XHRzY29wZTogc2NvcGVzLCBcblx0XHRpbW1lZGlhdGU6IHRydWVcblx0fSwgaGFuZGxlQXV0aFJlc3VsdCApO1xufVxuXG5mdW5jdGlvbiBoYW5kbGVBdXRoUmVzdWx0KCBhdXRoUmVzdWx0ICl7XG5cblx0aWYoYXV0aFJlc3VsdCl7XG5cdFx0bWFrZUFwaUNhbGwoKTtcblx0fVxufVxuXG5mdW5jdGlvbiBtYWtlQXBpQ2FsbCgpIHtcbiAgZ2FwaS5jbGllbnQubG9hZCgnY2FsZW5kYXInLCAndjMnLCBmdW5jdGlvbigpIHtcblxuICAgIHZhciBmcm9tID0gbmV3IERhdGUoKS50b0lTT1N0cmluZygpO1xuXG4gICAgY29uc29sZS5sb2coZnJvbSlcblxuICAgIHZhciByZXF1ZXN0ID0gZ2FwaS5jbGllbnQuY2FsZW5kYXIuZXZlbnRzLmxpc3Qoe1xuICAgICAgJ2NhbGVuZGFySWQnOiBjYWxJZCxcbiAgICAgIHRpbWVNaW4gOiBmcm9tXG4gICAgIH0pO1xuXG4gICByZXF1ZXN0LnRoZW4oZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICAgIC8vIGFwcGVuZFJlc3VsdHMocmVzcG9uc2UucmVzdWx0LmxvbmdVcmwpO1xuICAgICAgY29uc29sZS5sb2cocmVzcG9uc2UucmVzdWx0KTtcbiAgICAgIGV2ZW50cy50cmlnZ2VyKCBcImV2ZW50c0xvYWRlZFwiLCByZXNwb25zZS5yZXN1bHQgKTtcbiAgICB9LCBmdW5jdGlvbihyZWFzb24pIHtcbiAgICAgIGNvbnNvbGUubG9nKCdFcnJvcjogJyArIHJlYXNvbi5yZXN1bHQuZXJyb3IubWVzc2FnZSk7XG4gICAgfSk7XG4gICAgICAgICAgXG4gICAgLy8gcmVxdWVzdC5leGVjdXRlKGZ1bmN0aW9uKHJlc3ApIHtcbiAgICAvLyAgIGZvciAodmFyIGkgPSAwOyBpIDwgcmVzcC5pdGVtcy5sZW5ndGg7IGkrKykge1xuICAgIC8vICAgICB2YXIgbGkgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdsaScpO1xuICAgIC8vICAgICBsaS5hcHBlbmRDaGlsZChkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShyZXNwLml0ZW1zW2ldLnN1bW1hcnkpKTtcbiAgICAvLyAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2V2ZW50cycpLmFwcGVuZENoaWxkKGxpKTtcbiAgICAvLyAgIH1cbiAgICAvLyB9KTtcbiAgfSk7XG59XG5cbnZhciBldmVudHMgPSBfLmV4dGVuZCh7XG5cbn0sIEJhY2tib25lLkV2ZW50cyk7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXG4gIGV2ZW50cyA6IGV2ZW50c1xufTtcbiIsInZhciB3aW5kb3dQYXJlbnQgPSBudWxsO1xuXG5mdW5jdGlvbiBpbml0KCl7XG5cblx0d2luZG93UGFyZW50ID0gd2luZG93LnBhcmVudDtcbn1cblxuZnVuY3Rpb24gdXBkYXRlKCBkYXRhICl7XG5cblx0dmFyIHN0cmluZ0RhdGEgPSBKU09OLnN0cmluZ2lmeSggZGF0YSApO1xuXG5cdGlmKCB3aW5kb3dQYXJlbnQgKXtcblxuXHRcdHdpbmRvd1BhcmVudC5wb3N0TWVzc2FnZSggc3RyaW5nRGF0YSwgXCIqXCIgKTtcdFx0XG5cdH1cbn1cblxudmFyIHRocm90dGxlZFVwZGF0ZSA9IF8udGhyb3R0bGUoIHVwZGF0ZSwgMTAwMCwge2xlYWRpbmc6IGZhbHNlfSApO1xuXG5pbml0KCk7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXHRpbml0IDogaW5pdCxcblx0dXBkYXRlIDogdGhyb3R0bGVkVXBkYXRlXG59IiwidmFyIEhlbHBlcnMgPSB7fTtcblxuLy9kaW1lbnNpb25zIGNhbGN1bGF0aW9uc1xuSGVscGVycy5kaW0gPSB7XG5cdGJhY2tzdHJldGNoIDogZnVuY3Rpb24ocm9vdFdpZHRoLCByb290SGVpZ2h0LCByYXRpbyl7XG5cblx0XHR2YXIgcmV0dXJuRGltID0ge2xlZnQ6IDAsIHRvcDogMH07XG5cbiAgICBcdHZhciBiZ1dpZHRoID0gcm9vdFdpZHRoXG4gICAgXHR2YXIgYmdIZWlnaHQgPSBiZ1dpZHRoIC8gcmF0aW87XG4gICAgXHR2YXIgYmdPZmZzZXQ7XG4gICAgICAgXG5cdFx0aWYgKGJnSGVpZ2h0ID49IHJvb3RIZWlnaHQpIHtcbiAgICAgICAgICAgIGJnT2Zmc2V0ID0gKGJnSGVpZ2h0IC0gcm9vdEhlaWdodCkgLyAyO1xuICAgICAgICAgICAgcmV0dXJuRGltLnRvcCA9IGJnT2Zmc2V0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYmdIZWlnaHQgPSByb290SGVpZ2h0O1xuICAgICAgICAgICAgYmdXaWR0aCA9IGJnSGVpZ2h0ICogcmF0aW87XG4gICAgICAgICAgICBiZ09mZnNldCA9IChiZ1dpZHRoIC0gcm9vdFdpZHRoKSAvIDI7XG4gICAgICAgICAgICByZXR1cm5EaW0ubGVmdCA9IGJnT2Zmc2V0O1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuRGltLndpZHRoID0gYmdXaWR0aDtcbiAgICAgICAgcmV0dXJuRGltLmhlaWdodCA9IGJnSGVpZ2h0O1xuXG4gICAgICAgIHJldHVybiByZXR1cm5EaW07XG5cdH1cbn1cblxuSGVscGVycy5sb2FkID0ge1xuXHRsb2FkRmlsZXMgOiBmdW5jdGlvbihmaWxlcywgY2FsbGJhY2ssIHByZWZpeCApe1xuXHRcdC8vY2hlY2sgaWYgZmlsZSBpcyBpbiBhcnJheSwgaWYgbm90IHdyYXBcblx0XHRmaWxlcyA9IEhlbHBlcnMudGVzdC5pc1N0cmluZyhmaWxlcykgPyBbZmlsZXNdIDogZmlsZXM7XG5cdFx0XG5cdFx0Ly9jcmVhdGUgZW1wdHkgb2JqZWN0IHRvIGhvbGQgY29weVxuXHRcdHZhciBjb3B5ID0gSGVscGVycy50ZXN0LmlzQXJyYXkoZmlsZXMpID8gW10gOiB7fTtcblxuXHRcdHByZWZpeCA9IHByZWZpeCB8fCBcIlwiO1xuXHRcdHZhciBxdWV1ZSA9IG5ldyBjcmVhdGVqcy5Mb2FkUXVldWUoKTtcblx0XHRxdWV1ZS5hZGRFdmVudExpc3RlbmVyKFwiZmlsZWxvYWRcIiwgZnVuY3Rpb24oZXZlbnQpe1xuXHRcdFx0aWYoY2FsbGJhY2spIGNhbGxiYWNrKGV2ZW50KTtcblx0XHR9KTtcblx0XHRfLmVhY2goZmlsZXMsZnVuY3Rpb24oZmlsZSxrZXkpe1xuXHRcdFx0cXVldWUubG9hZEZpbGUoIHByZWZpeCArIGZpbGUgKTtcblx0XHRcdGNvcHlba2V5XSA9IHByZWZpeCArIGZpbGU7XG5cdFx0fSk7XG5cdFx0cXVldWUubG9hZCgpO1xuXHRcdHJldHVybiBjb3B5O1xuXHR9XG59XG5cbkhlbHBlcnMudGVzdCA9IHtcblx0aXNBcnJheSA6IGZ1bmN0aW9uKCBvYmogKXtcblx0XHRyZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKCBvYmogKSA9PT0gJ1tvYmplY3QgQXJyYXldJztcblx0fSxcblx0aXNTdHJpbmcgOiBmdW5jdGlvbiggb2JqICl7XG5cdFx0cmV0dXJuIHR5cGVvZiBvYmogPT09ICdzdHJpbmcnO1xuXHR9XG59XG5cbkhlbHBlcnMuY29sb3IgPSB7XG5cdHJhbmRvbUhleCA6IGZ1bmN0aW9uKCl7XG5cblx0XHRyZXR1cm4gXCIjXCIgKyAoTWF0aC5yYW5kb20oKS50b1N0cmluZygxNikgKyAnMDAwMDAwJykuc2xpY2UoMiwgOCk7XG5cdH0sXG5cdGNoYW5nZUNvbG9yIDogZnVuY3Rpb24oY29sb3IsIHJhdGlvLCBkYXJrZXIpIHtcbiAgICAgICAgLy8gQ2FsY3VsYXRlIHJhdGlvXG4gICAgICAgIHZhciBkaWZmZXJlbmNlID0gTWF0aC5yb3VuZChyYXRpbyAqIDI1NikgKiAoZGFya2VyID8gLTEgOiAxKSxcbiAgICAgICAgICAgIC8vIENvbnZlcnQgaGV4IHRvIGRlY2ltYWxcbiAgICAgICAgICAgIGRlY2ltYWwgPSAgY29sb3IucmVwbGFjZShcbiAgICAgICAgICAgICAgICAvXiM/KFthLWYwLTldW2EtZjAtOV0pKFthLWYwLTldW2EtZjAtOV0pKFthLWYwLTldW2EtZjAtOV0pL2ksXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBwYXJzZUludChhcmd1bWVudHNbMV0sIDE2KSArICcsJyArXG4gICAgICAgICAgICAgICAgICAgICAgICBwYXJzZUludChhcmd1bWVudHNbMl0sIDE2KSArICcsJyArXG4gICAgICAgICAgICAgICAgICAgICAgICBwYXJzZUludChhcmd1bWVudHNbM10sIDE2KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICApLnNwbGl0KC8sLyksXG4gICAgICAgICAgICByZXR1cm5WYWx1ZTtcbiAgICAgICAgcmV0dXJuW1xuICAgICAgICAgICAgICAgICcjJyxcbiAgICAgICAgICAgICAgICBIZWxwZXJzLnBhZChNYXRoW2RhcmtlciA/ICdtYXgnIDogJ21pbiddKFxuICAgICAgICAgICAgICAgICAgICBwYXJzZUludChkZWNpbWFsWzBdLCAxMCkgKyBkaWZmZXJlbmNlLCBkYXJrZXIgPyAwIDogMjU1XG4gICAgICAgICAgICAgICAgKS50b1N0cmluZygxNiksIDIpLFxuICAgICAgICAgICAgICAgIEhlbHBlcnMucGFkKE1hdGhbZGFya2VyID8gJ21heCcgOiAnbWluJ10oXG4gICAgICAgICAgICAgICAgICAgIHBhcnNlSW50KGRlY2ltYWxbMV0sIDEwKSArIGRpZmZlcmVuY2UsIGRhcmtlciA/IDAgOiAyNTVcbiAgICAgICAgICAgICAgICApLnRvU3RyaW5nKDE2KSwgMiksXG4gICAgICAgICAgICAgICAgSGVscGVycy5wYWQoTWF0aFtkYXJrZXIgPyAnbWF4JyA6ICdtaW4nXShcbiAgICAgICAgICAgICAgICAgICAgcGFyc2VJbnQoZGVjaW1hbFsyXSwgMTApICsgZGlmZmVyZW5jZSwgZGFya2VyID8gMCA6IDI1NVxuICAgICAgICAgICAgICAgICkudG9TdHJpbmcoMTYpLCAyKVxuICAgICAgICAgICAgXS5qb2luKCcnKTtcbiAgICB9LFxuICAgIGdldEx1bWEgOiBmdW5jdGlvbihoZXhjb2xvcil7XG5cbiAgICBcdGhleGNvbG9yID0gaGV4Y29sb3IucmVwbGFjZShcIiNcIixcIlwiKTtcbiAgICAgICAgdmFyIHIgPSBwYXJzZUludChoZXhjb2xvci5zdWJzdHIoMCwyKSwxNik7XG5cdCAgICB2YXIgZyA9IHBhcnNlSW50KGhleGNvbG9yLnN1YnN0cigyLDIpLDE2KTtcblx0ICAgIHZhciBiID0gcGFyc2VJbnQoaGV4Y29sb3Iuc3Vic3RyKDQsMiksMTYpO1xuXHQgICAgdmFyIHlpcSA9ICgocioyOTkpKyhnKjU4NykrKGIqMTE0KSkvMTAwMDtcbiAgICAgICAgcmV0dXJuIHlpcTtcbiAgICB9LFxuICAgIHJnYlRvSGV4IDogZnVuY3Rpb24oIHIsIGcsIGIsIG5vSGFzaCApe1xuXG4gICAgXHRyZXR1cm4gKG5vSGFzaCA/IFwiXCIgOiBcIiNcIikgKyAoKDEgPDwgMjQpICsgKHIgPDwgMTYpICsgKGcgPDwgOCkgKyBiKS50b1N0cmluZygxNikuc2xpY2UoMSk7XG4gICAgfSwgXG4gICAgaGV4VG9SZ2IgOiBmdW5jdGlvbiggaGV4ICl7XG5cbiAgICBcdHZhciByZXN1bHQgPSAvXiM/KFthLWZcXGRdezJ9KShbYS1mXFxkXXsyfSkoW2EtZlxcZF17Mn0pJC9pLmV4ZWMoaGV4KTtcblx0ICAgIHJldHVybiByZXN1bHQgPyB7XG5cdCAgICAgICAgcjogcGFyc2VJbnQocmVzdWx0WzFdLCAxNiksXG5cdCAgICAgICAgZzogcGFyc2VJbnQocmVzdWx0WzJdLCAxNiksXG5cdCAgICAgICAgYjogcGFyc2VJbnQocmVzdWx0WzNdLCAxNilcblx0ICAgIH0gOiBudWxsO1xuICAgIH1cbn1cblxuSGVscGVycy5jYW52YXMgPSB7XG5cdGdlbmVyYXRlQ2FudmFzIDogKGZ1bmN0aW9uKCl7XG5cdFx0ZnVuY3Rpb24gZ2VuZXJhdGVDYW52YXMoKXtcblx0XHRcdHRoaXMuY2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG5cdFx0XHR0aGlzLmN0eCA9IHRoaXMuY2FudmFzLmdldENvbnRleHQoXCIyZFwiKTtcblx0XHRcdCQodGhpcy5jYW52YXMpLmRhdGEoXCJoZWxwZXJzXCIsIHRoaXMpO1xuXHRcdH1cblx0XHRnZW5lcmF0ZUNhbnZhcy5wcm90b3R5cGUuZHJhd0ltYWdlID0gZnVuY3Rpb24oaW1nKXtcblx0XHRcdHZhciB3ID0gaW1nLndpZHRoO1xuXHRcdFx0dmFyIGggPSBpbWcuaGVpZ2h0O1xuXHRcdFx0dGhpcy5yZXNpemUodyxoKTtcblx0XHRcdHRoaXMuY3R4LmRyYXdJbWFnZSggaW1nLCAwLCAwICk7XG5cdFx0fVxuXHRcdGdlbmVyYXRlQ2FudmFzLnByb3RvdHlwZS5yZXNpemUgPSBmdW5jdGlvbih3LGgpe1xuXHRcdFx0dmFyIHBpeGVsUmF0aW8gPSAxO1xuXHRcdFx0dmFyIGNhbnZhcyA9IHRoaXMuY2FudmFzO1xuXHRcdFx0Y2FudmFzLndpZHRoID0gdztcblx0XHRcdGNhbnZhcy5oZWlnaHQgPSBoO1xuXHRcdCAgICBjYW52YXMuc3R5bGUud2lkdGggPSB3KnBpeGVsUmF0aW8gKyBcInB4XCI7XG5cdFx0ICAgIGNhbnZhcy5zdHlsZS5oZWlnaHQgPSBoKnBpeGVsUmF0aW8gKyBcInB4XCI7XG5cdFx0fVxuXHRcdHJldHVybiBnZW5lcmF0ZUNhbnZhcztcblx0fSkoKVxufVxuXG4vL21pc2NcbkhlbHBlcnMuYmdJbWFnZXNGcm9tRGF0YSA9IGZ1bmN0aW9uKCAkZWwgKXtcblx0JGVsLmZpbmQoJ1tkYXRhLWltYWdlLXNyY10nKS5lYWNoKCBmdW5jdGlvbigpe1xuXHRcdHZhciBzcmMgPSAkKHRoaXMpLmRhdGEoJ2ltYWdlLXNyYycpO1xuXHRcdCQodGhpcykuY3NzKHtcblx0XHRcdCdiYWNrZ3JvdW5kLWltYWdlJyA6IFwidXJsKCdcIiArIHNyYyArIFwiJylcIlxuXHRcdH0pO1xuXHR9KTtcbn1cblxuSGVscGVycy5wYWQgPSBmdW5jdGlvbihudW0sIHRvdGFsQ2hhcnMpIHtcbiAgICB2YXIgcGFkID0gJzAnO1xuICAgIG51bSA9IG51bSArICcnO1xuICAgIHdoaWxlIChudW0ubGVuZ3RoIDwgdG90YWxDaGFycykge1xuICAgICAgICBudW0gPSBwYWQgKyBudW07XG4gICAgfVxuICAgIHJldHVybiBudW07XG59XG5cbkhlbHBlcnMualFVaSA9IGZ1bmN0aW9uKCB2aWV3ICl7XG5cdHJldHVybiB0aGlzLmpRRWxzKCB2aWV3LnVpLCB2aWV3LiRlbCApO1xufVxuXG5IZWxwZXJzLmpRRWxzID0gZnVuY3Rpb24oZWxzLCAkcGFyZW50LCBzaW5nbGVLZXkpe1xuXHQkcGFyZW50ID0gJHBhcmVudCB8fCAkKFwiYm9keVwiKTtcblx0aWYoIXNpbmdsZUtleSl7XG5cdFx0dmFyICRlbHMgPSB7fTtcblx0XHRfLmVhY2goIGVscywgZnVuY3Rpb24odmFsdWUsIGtleSl7XG4gICAgXHRcdCRlbHNba2V5XSA9ICRwYXJlbnQuZmluZCh2YWx1ZSk7XG4gICAgXHR9KTtcbiAgICBcdCRlbHMuYm9keSA9ICQoXCJib2R5XCIpO1xuICAgIFx0JGVscy5odG1sID0gJChcImh0bWxcIik7XG5cdH0gZWxzZSB7XG5cdFx0JGVsc1tzaW5nbGVLZXldID0gJHBhcmVudC5maW5kKCBlbHNbc2luZ2xlS2V5XSApO1xuXHR9XG5cdHJldHVybiAkZWxzO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEhlbHBlcnM7XG4iLCJ2YXIgQ2FsZW5kYXJNb2RlbCA9IEJhY2tib25lLk1vZGVsLmV4dGVuZCh7XG5cdGRlZmF1bHRzIDoge1xuXHRcdHN1bW1hcnkgOiBcIm4vYVwiLFxuXHRcdGRlc2NyaXB0aW9uIDogXCJuL2FcIixcblx0XHRzdGFydCA6IFwibi9hXCIsXG5cdFx0ZW5kIDogXCJuL2FcIixcblx0fVxufSlcblxubW9kdWxlLmV4cG9ydHMgPSBDYWxlbmRhck1vZGVsOyIsInZhciBzdGF0ZSA9IG5ldyAoQmFja2JvbmUuTW9kZWwuZXh0ZW5kKHtcblx0ZGVmYXVsdHMgOiB7XG5cdFx0Ly8gXCJuYXZfb3BlblwiIFx0XHQ6IGZhbHNlLFxuXHRcdC8vICdzY3JvbGxfYXRfdG9wJyA6IHRydWUsXG5cdFx0Ly8gJ21pbmltYWxfbmF2JyBcdDogZmFsc2UsXG5cdFx0Ly8gJ2Z1bGxfbmF2X29wZW4nXHQ6IGZhbHNlLFxuXHRcdC8vICd1aV9kaXNwbGF5J1x0OiBmYWxzZVxuXHR9XG59KSkoKTtcblxubW9kdWxlLmV4cG9ydHMgPSBzdGF0ZTtcbiIsInZhciBwaXBlID0gXy5leHRlbmQoe1xuXG5cdFxuXHRcbn0sIEJhY2tib25lLkV2ZW50cyk7XG5cbm1vZHVsZS5leHBvcnRzID0gcGlwZTsiLCJtb2R1bGUuZXhwb3J0cyA9IFwiPGlucHV0IGNsYXNzPVxcXCJjb2xvclxcXCIgdHlwZT1cXFwiY29sb3JcXFwiIG5hbWU9XFxcImZhdmNvbG9yXFxcIj5cXG48ZGl2IGNsYXNzPVxcXCJtYWluLWxpc3RcXFwiPjwvZGl2PlxcblxcblwiO1xuIiwibW9kdWxlLmV4cG9ydHMgPSBcIjwlIGlmKCBzdW1tYXJ5ICl7ICU+XFxuXFx0PGgyPnN1bW1hcnkgOiA8JT0gc3VtbWFyeSAlPjwvaDI+XFxuPCUgfSAlPlxcblxcbjwlIGlmKCBkZXNjcmlwdGlvbiApeyAlPlxcblxcdDxoMz5kZXNjcmlwdGlvbiA6IDwlPSBkZXNjcmlwdGlvbiAlPjwvaDM+XFxuPCUgfSAlPlxcblxcbjwlIGlmKCBzdGFydCApeyAlPlxcblxcdDxoMz5zdGFydCA6IDwlPSBzdGFydC5kYXRlVGltZSAlPjwvaDM+XFxuPCUgfSAlPlxcblxcbjwlIGlmKCBlbmQgKXsgJT5cXG5cXHQ8aDM+ZW5kIDogPCU9IGVuZC5kYXRlVGltZSAlPjwvaDM+XFxuPCUgfSAlPlwiO1xuIiwidmFyIFN0YXRlIFx0XHQ9IHJlcXVpcmUoXCJtb2RlbHMvc3RhdGVcIik7XG5cbnZhciBNeUFwcExheW91dCA9IE1hcmlvbmV0dGUuTGF5b3V0Vmlldy5leHRlbmQoe1xuXHRlbCA6IFwiI2NvbnRlbnRcIixcblx0dGVtcGxhdGUgOiBmYWxzZSxcblx0cmVnaW9ucyA6IHtcblx0XHRtYWluIDogXCIjbWFpblwiXG5cdH0sIFxuXHRpbml0aWFsaXplIDogZnVuY3Rpb24oKXtcblx0XHR2YXIgX3RoaXMgPSB0aGlzO1xuXG5cdFx0Ly93cmFwcGluZyBodG1sXG5cdFx0dGhpcy4kaHRtbCA9ICQoXCJodG1sXCIpO1xuXHRcdHRoaXMuJGh0bWwucmVtb3ZlQ2xhc3MoXCJoaWRkZW5cIik7XG5cblx0XHQvL3Jlc2l6ZSBldmVudHNcblx0XHQkKHdpbmRvdykucmVzaXplKGZ1bmN0aW9uKCl7XG5cdFx0XHRfdGhpcy5vblJlc2l6ZVdpbmRvdygpO1xuXHRcdH0pLnJlc2l6ZSgpO1xuXG5cdFx0dGhpcy5saXN0ZW5Gb3JTdGF0ZSgpO1xuXHR9LFxuXHRsaXN0ZW5Gb3JTdGF0ZSA6IGZ1bmN0aW9uKCl7XG5cdFx0Ly9zdGF0ZSBjaGFuZ2Vcblx0XHR0aGlzLmxpc3RlblRvKCBTdGF0ZSwgXCJjaGFuZ2VcIiwgZnVuY3Rpb24oIGUgKXtcblxuXHRcdFx0dGhpcy5vblN0YXRlQ2hhbmdlKCBlLmNoYW5nZWQsIGUuX3ByZXZpb3VzQXR0cmlidXRlcyApO1xuXHRcdH0sIHRoaXMpO1xuXHRcdHRoaXMub25TdGF0ZUNoYW5nZSggU3RhdGUudG9KU09OKCkgKTtcblx0fSxcblx0b25TdGF0ZUNoYW5nZSA6IGZ1bmN0aW9uKCBjaGFuZ2VkLCBwcmV2aW91cyApe1xuXG5cdFx0Xy5lYWNoKCBjaGFuZ2VkLCBmdW5jdGlvbih2YWx1ZSwga2V5KXtcblx0XHRcdFxuXHRcdFx0aWYoIF8uaXNCb29sZWFuKCB2YWx1ZSApICl7XG5cdFx0XHRcdHRoaXMuJGh0bWwudG9nZ2xlQ2xhc3MoXCJzdGF0ZS1cIitrZXksIHZhbHVlKTtcblx0XHRcdFx0dGhpcy4kaHRtbC50b2dnbGVDbGFzcyhcInN0YXRlLW5vdC1cIitrZXksICF2YWx1ZSk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR2YXIgcHJldlZhbHVlID0gcHJldmlvdXNbIGtleSBdO1xuXHRcdFx0XHRpZihwcmV2VmFsdWUpe1xuXHRcdFx0XHRcdHRoaXMuJGh0bWwudG9nZ2xlQ2xhc3MoXCJzdGF0ZS1cIitrZXkrXCItXCIrcHJldlZhbHVlLCBmYWxzZSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0dGhpcy4kaHRtbC50b2dnbGVDbGFzcyhcInN0YXRlLVwiK2tleStcIi1cIit2YWx1ZSwgdHJ1ZSk7XG5cdFx0XHR9XG5cblx0XHR9LCB0aGlzICk7XG5cdH0sXG5cdG9uUmVzaXplV2luZG93IDogZnVuY3Rpb24oKXtcblx0XHRDb21tb24ud3cgPSAkKHdpbmRvdykud2lkdGgoKTtcblx0XHRDb21tb24ud2ggPSAkKHdpbmRvdykuaGVpZ2h0KCk7XG5cdH1cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IG5ldyBNeUFwcExheW91dCgpOyIsInZhciBjYWxlbmRhckxvYWQgPSByZXF1aXJlKFwiY29udHJvbGxlcnMvY2FsZW5kYXJMb2FkXCIpO1xudmFyIENhbGVuZGFySXRlbXMgXHQ9IHJlcXVpcmUoXCJ2aWV3cy9jYWxlbmRhckl0ZW1zXCIpO1xudmFyIENhbGVuZGFyTW9kZWwgXHQ9IHJlcXVpcmUoXCJtb2RlbHMvY2FsZW5kYXJNb2RlbFwiKTtcbnZhciBoZWxwZXJzID0gcmVxdWlyZShcImhlbHBlcnNcIik7IFxudmFyIHVwZGF0ZUxpZ2h0cyA9IHJlcXVpcmUoXCJjb250cm9sbGVycy91cGRhdGVMaWdodHNcIik7XG5cbnZhciBDYWxlbmRhclZpZXcgPSBNYXJpb25ldHRlLkxheW91dFZpZXcuZXh0ZW5kKHtcblx0dGVtcGxhdGUgOiBfLnRlbXBsYXRlKCByZXF1aXJlKFwidGVtcGxhdGVzL2NhbGVuZGFyLmh0bWxcIikgKSxcblx0cmVnaW9ucyA6IHtcblx0XHRtYWluTGlzdCA6IFwiLm1haW4tbGlzdFwiXG5cdH0sXG5cdHVpIDoge1xuXHRcdGNvbG9yUGlja2VyIDogXCIuY29sb3JcIlxuXHR9LFxuXHRpbml0aWFsaXplIDogZnVuY3Rpb24oKXtcblx0XHRcblx0XHR0aGlzLmxpc3RlblRvKCBjYWxlbmRhckxvYWQuZXZlbnRzLCBcImV2ZW50c0xvYWRlZFwiLCB0aGlzLmV2ZW50c0xvYWRlZCApO1xuXHR9LFxuXHRvblNob3cgOiBmdW5jdGlvbigpe1xuXG5cdFx0dmFyIGNvbG9yUGlja2VyID0gdGhpcy51aS5jb2xvclBpY2tlcjtcblx0XHQkKGNvbG9yUGlja2VyKS5jaGFuZ2UoZnVuY3Rpb24oKXtcblx0XHRcdHZhciB2YWwgPSAkKHRoaXMpLnZhbCgpO1xuXHRcdFx0dmFyIGNvbG9yID0gb25lLmNvbG9yKHZhbCk7XG5cblx0XHRcdHZhciBoc2wgPSB7XG5cdFx0XHRcdGggOiBNYXRoLmZsb29yKCBjb2xvci5oKCkgKiAzNjApLCBcblx0XHRcdFx0cyA6IE1hdGguZmxvb3IoIGNvbG9yLnMoKSAqIDEwMCksXG5cdFx0XHRcdGwgOiBNYXRoLmZsb29yKCBjb2xvci5sKCkgKiAxMDApIFxuXHRcdFx0fTtcblxuXHRcdFx0Y29uc29sZS5sb2coaHNsKVxuXG5cdFx0XHQvLyB1cGRhdGVMaWdodHMudXBkYXRlKFtcblx0XHRcdC8vIFx0e1xuXHRcdFx0Ly8gXHRcdCdpZCcgOiAxLFxuXHRcdFx0Ly8gXHRcdCdkYXRhJyA6IHtcblx0XHRcdC8vIFx0XHRcdCdoc2wnIDogaHNsXG5cdFx0XHQvLyBcdFx0fVxuXHRcdFx0Ly8gXHR9LFxuXHRcdFx0Ly8gXHR7XG5cdFx0XHQvLyBcdFx0J2lkJyA6IDIsXG5cdFx0XHQvLyBcdFx0J2RhdGEnIDoge1xuXHRcdFx0Ly8gXHRcdFx0J2hzbCcgOiBoc2xcblx0XHRcdC8vIFx0XHR9XG5cdFx0XHQvLyBcdH0sXG5cdFx0XHQvLyBcdHtcblx0XHRcdC8vIFx0XHQnaWQnIDogMyxcblx0XHRcdC8vIFx0XHQnZGF0YScgOiB7XG5cdFx0XHQvLyBcdFx0XHQnaHNsJyA6IGhzbFxuXHRcdFx0Ly8gXHRcdH1cblx0XHRcdC8vIFx0fVxuXHRcdFx0Ly8gXSk7XG5cdFx0fSk7XG5cblx0fSxcblx0ZXZlbnRzTG9hZGVkIDogZnVuY3Rpb24oIGRhdGEgKXtcblx0XHRcblx0XHR2YXIgbXlDYWxlbmRhckl0ZW1zID0gbmV3IENhbGVuZGFySXRlbXMoKTtcblxuXHRcdF8uZWFjaCggZGF0YS5pdGVtcywgZnVuY3Rpb24oIGl0ZW0gKXtcblxuXHRcdFx0dmFyIG0gPSBuZXcgQ2FsZW5kYXJNb2RlbCggaXRlbSApO1xuXHRcdFx0bXlDYWxlbmRhckl0ZW1zLmNvbGxlY3Rpb24uYWRkKCBtICk7XG5cdFx0fSk7XG5cblx0XHR0aGlzLmdldFJlZ2lvbihcIm1haW5MaXN0XCIpLnNob3coIG15Q2FsZW5kYXJJdGVtcyApO1xuXHR9ICAgICAgICAgIFxufSk7XG5cblxubW9kdWxlLmV4cG9ydHMgPSBDYWxlbmRhclZpZXc7ICAgICAgICAgICAgICAgICAgICBcbiAgICBcbiAiLCJ2YXIgQ2FsZW5kYXJJdGVtID0gTWFyaW9uZXR0ZS5JdGVtVmlldy5leHRlbmQoe1xuXHRjbGFzc05hbWUgOiBcIml0ZW1cIixcblx0dGVtcGxhdGUgOiBfLnRlbXBsYXRlKCByZXF1aXJlKFwidGVtcGxhdGVzL2NhbGVuZGFySXRlbS5odG1sXCIpICksXG5cdHVpIDoge1xuXHRcdCd0aXRsZScgOiBcImgyXCJcblx0fSxcblx0ZXZlbnRzIDoge1xuXHRcdCdjbGljayBAdWkudGl0bGUnIDogZnVuY3Rpb24oKXtcblxuXG5cdFx0fVxuXHR9XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBDYWxlbmRhckl0ZW07IiwidmFyIENhbGVuZGFySXRlbSBcdD0gcmVxdWlyZShcInZpZXdzL2NhbGVuZGFySXRlbVwiKTtcblxudmFyIENhbGVuZGFySXRlbXMgPSBNYXJpb25ldHRlLkNvbGxlY3Rpb25WaWV3LmV4dGVuZCh7XG5cblx0Y2hpbGRWaWV3IDogQ2FsZW5kYXJJdGVtLFxuXHRjb2xsZWN0aW9uIDogbmV3IEJhY2tib25lLkNvbGxlY3Rpb24oKVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gQ2FsZW5kYXJJdGVtczsiXX0=
