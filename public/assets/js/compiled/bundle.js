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







         
},{"controllers/appRouter":3,"views/appLayout":13,"views/calendar":14}],2:[function(require,module,exports){
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

  console.log("google api loaded");
  init();
}

var clientId = '433839723365-u7grldtvf8pabjkj4frcio3cv5hit8fm.apps.googleusercontent.com';
var apiKey = 'AIzaSyBsKdTplRXuEwgvPSH_gGF8OGsw35t15v0';
var scopes = 'https://www.googleapis.com/auth/calendar';
var calId = "b-reel.com_2d34343238393637302d363433@resource.calendar.google.com";

//TODO : integrate all 4 calendars

function init(){
	gapi.client.setApiKey(apiKey);
	checkAuth();
}

function checkAuth(){
	gapi.auth.authorize( {
		client_id: clientId, 
		scope: scopes, 
		immediate: false
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

    var request = gapi.client.calendar.events.list({
      'calendarId': calId,
      timeMin : from
     });

   request.then(function(response) {

      events.trigger( "eventsLoaded", response.result );
    }, function(reason) {

      console.log('Error: ' + reason.result.error.message);
    });
          
  });
}

var events = _.extend({

}, Backbone.Events);

module.exports = {

  events : events
};

},{"pipe":10}],5:[function(require,module,exports){
var mySocket = null;
var connected = false;

function init(){

	mySocket = io.connect('//localhost:3000');
	mySocket.on('connect', function(){
		connected = true;
	});	
}

function update( data ){

	if(connected){
		mySocket.emit( 'update_data', data );	
	}
}

// var throttledUpdate = _.throttle( update, 500, {leading: false} );

init();

module.exports = {
	init : init,
	update : update,
	connected : connected
}
},{}],6:[function(require,module,exports){
var hueConnect = require("controllers/hueConnect");

function LightPattern( lightId, patternId ){

	this._hsl = {
		h : 0,
		s : 0,
		l : 0
	}

	this._lightId = lightId;
	this._patternId = patternId;
	this._step = 0;

	this.newSequence( this._patternId );
}

LightPattern.prototype = {
	newSequence : function( id ){

		var pattern = patterns[ id ];
		var sequence = pattern.sequence;

		this._tweener = new TimelineMax({
			repeat : pattern.repeat,
			onComplete : function(){
				console.log("complete!");
			}
		});

		_.each( sequence, function( step ){

			this.queueColor( step );
		}, this );
	},
	queueColor : function( step ){

		var color = one.color( step.color );
		var fade = step.fade;
		var wait = step.wait;

		var hsl = {
			h : Math.floor( color.h() * 360), 
			s : Math.floor( color.s() * 100),
			l : Math.floor( color.l() * 100) 
		};

		var options = {
			onStart : function(){
				//updating LEDs
				hueConnect.update([{
					id : this._lightId,
					data : {
						hsl : hsl,
						duration : fade
					}
				}]);				
			},
			onStartScope : this
		}

		//updating frontend
		this._tweener.to( this._hsl, fade, _.extend( options, hsl ) );
		this._tweener.to( this._hsl, wait, {} );
	}
}

var patterns = {
	'test' : {
		repeat :  -1,
		sequence : [
			{ color : "#FB1911", fade : 1, wait : 1 },
			// { color : "#00ff00", fade : 1, wait : 1 },
			// { color : "#4156FF", fade : 1, wait : 1 },
			// { color : "#FF001D", fade : 1, wait : 1 },
			// { color : "#FFFF07", fade : 1, wait : 1 },
		]
	}
}

module.exports = LightPattern;
},{"controllers/hueConnect":5}],7:[function(require,module,exports){
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

},{}],8:[function(require,module,exports){
var CalendarModel = Backbone.Model.extend({
	defaults : {
		summary : "n/a",
		description : "n/a",
		start : "n/a",
		end : "n/a",
	}
})

module.exports = CalendarModel;
},{}],9:[function(require,module,exports){
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

},{}],10:[function(require,module,exports){
var pipe = _.extend({

	
	
}, Backbone.Events);

module.exports = pipe;
},{}],11:[function(require,module,exports){
module.exports = "<div>\n\t<input id=\"hex-input\" type=\"text\"></input>\n\t<button id=\"hex\">hex</button>\n</div>\n<button id=\"test\">test</button>\n<input class=\"color\" type=\"color\" name=\"favcolor\">\n<div class=\"main-list\"></div>\n\n ";

},{}],12:[function(require,module,exports){
module.exports = "<% if( summary ){ %>\n\t<h2>summary : <%= summary %></h2>\n<% } %>\n\n<% if( description ){ %>\n\t<h3>description : <%= description %></h3>\n<% } %>\n\n<% if( start ){ %>\n\t<h3>start : <%= start.dateTime %></h3>\n<% } %>\n\n<% if( end ){ %>\n\t<h3>end : <%= end.dateTime %></h3>\n<% } %>";

},{}],13:[function(require,module,exports){
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
},{"models/state":9}],14:[function(require,module,exports){
var calendarLoad = require("controllers/calendarLoad");
var CalendarItems 	= require("views/calendarItems");
var CalendarModel 	= require("models/calendarModel");
var helpers = require("helpers"); 
var hueConnect = require("controllers/hueConnect");
var LightPattern = require("controllers/lightPattern");



var CalendarView = Marionette.LayoutView.extend({
	template : _.template( require("templates/calendar.html") ),
	regions : {
		mainList : ".main-list"
	},
	ui : {
		colorPicker : ".color",
		test : "#test",
		hexButton : "#hex",
		hexInput : "#hex-input"
	},
	events : {
		"click @ui.test" : function(){
			for( var i = 0 ; i < 5 ; i++ ){
				new LightPattern(i+1, "test");
			}
		},
		"click @ui.hexButton" : function(){
			var color = this.ui.hexInput.val();
			this.testColor( color );
		}
	},
	initialize : function(){
		
		this.listenTo( calendarLoad.events, "eventsLoaded", this.eventsLoaded );
	},
	onShow : function(){

		var colorPicker = this.ui.colorPicker;
		var _this = this;
		$(colorPicker).change(function(){
			var val = $(this).val();
			_this.testColor( val );
		});
	},
	testColor : function( _color ){

		var color = one.color( _color );
		var hsl = {
			h : Math.floor( color.h() * 360), 
			s : Math.floor( color.s() * 100),
			l : Math.floor( color.l() * 100) 
		};
		hueConnect.update([
			{
				'id' : 1,
				'data' : {
					'hsl' : hsl,
					'duration' : 1
				}
			},
			{
				'id' : 2,
				'data' : {
					'hsl' : hsl,
					'duration' : 1
				}
			},
			{
				'id' : 3,
				'data' : {
					'hsl' : hsl,
					'duration' : 1
				}
			},
			{
				'id' : 4,
				'data' : {
					'hsl' : hsl,
					'duration' : 1
				}
			},
			{
				'id' : 5,
				'data' : {
					'hsl' : hsl,
					'duration' : 1
				}
			}
		]);		
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
    
 
},{"controllers/calendarLoad":4,"controllers/hueConnect":5,"controllers/lightPattern":6,"helpers":7,"models/calendarModel":8,"templates/calendar.html":11,"views/calendarItems":16}],15:[function(require,module,exports){
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
},{"templates/calendarItem.html":12}],16:[function(require,module,exports){
var CalendarItem 	= require("views/calendarItem");

var CalendarItems = Marionette.CollectionView.extend({

	childView : CalendarItem,
	collection : new Backbone.Collection()
});

module.exports = CalendarItems;
},{"views/calendarItem":15}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIuLi9wdWJsaWMvYXNzZXRzL2pzL3VzZXIvYXBwLmpzIiwiLi4vcHVibGljL2Fzc2V0cy9qcy91c2VyL2NvbnRyb2xsZXJzL2FwcENvbnRyb2xsZXIuanMiLCIuLi9wdWJsaWMvYXNzZXRzL2pzL3VzZXIvY29udHJvbGxlcnMvYXBwUm91dGVyLmpzIiwiLi4vcHVibGljL2Fzc2V0cy9qcy91c2VyL2NvbnRyb2xsZXJzL2NhbGVuZGFyTG9hZC5qcyIsIi4uL3B1YmxpYy9hc3NldHMvanMvdXNlci9jb250cm9sbGVycy9odWVDb25uZWN0LmpzIiwiLi4vcHVibGljL2Fzc2V0cy9qcy91c2VyL2NvbnRyb2xsZXJzL2xpZ2h0UGF0dGVybi5qcyIsIi4uL3B1YmxpYy9hc3NldHMvanMvdXNlci9oZWxwZXJzLmpzIiwiLi4vcHVibGljL2Fzc2V0cy9qcy91c2VyL21vZGVscy9jYWxlbmRhck1vZGVsLmpzIiwiLi4vcHVibGljL2Fzc2V0cy9qcy91c2VyL21vZGVscy9zdGF0ZS5qcyIsIi4uL3B1YmxpYy9hc3NldHMvanMvdXNlci9waXBlLmpzIiwiLi4vcHVibGljL2Fzc2V0cy9qcy91c2VyL3RlbXBsYXRlcy9jYWxlbmRhci5odG1sIiwiLi4vcHVibGljL2Fzc2V0cy9qcy91c2VyL3RlbXBsYXRlcy9jYWxlbmRhckl0ZW0uaHRtbCIsIi4uL3B1YmxpYy9hc3NldHMvanMvdXNlci92aWV3cy9hcHBMYXlvdXQuanMiLCIuLi9wdWJsaWMvYXNzZXRzL2pzL3VzZXIvdmlld3MvY2FsZW5kYXIuanMiLCIuLi9wdWJsaWMvYXNzZXRzL2pzL3VzZXIvdmlld3MvY2FsZW5kYXJJdGVtLmpzIiwiLi4vcHVibGljL2Fzc2V0cy9qcy91c2VyL3ZpZXdzL2NhbGVuZGFySXRlbXMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ05BO0FBQ0E7O0FDREE7QUFDQTs7QUNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ3aW5kb3cuQ29tbW9uID0ge1xuXHRwYXRoIDoge1xuXHRcdGFzc2V0cyA6IFwiYXNzZXRzL1wiLFxuXHRcdGltZyA6IFwiYXNzZXRzL2ltZy9cIixcblx0XHRhdWRpbyA6IFwiYXNzZXRzL2F1ZGlvL1wiXG5cdH0sXG5cdHNpemVzIDp7XG5cdFx0ZnJhbWUgOiAxMFxuXHR9XG59O1xuXG4vL2Jhc2VcbnZhciBBcHBSb3V0ZXIgXHRcdD0gcmVxdWlyZSggXCJjb250cm9sbGVycy9hcHBSb3V0ZXJcIiApO1xudmFyIEFwcExheW91dCBcdFx0PSByZXF1aXJlKCBcInZpZXdzL2FwcExheW91dFwiICk7XG5cbi8vY3VzdG9tXG52YXIgQ2FsZW5kYXJWaWV3XHQ9IHJlcXVpcmUoXCJ2aWV3cy9jYWxlbmRhclwiKTtcblxuLy9USEUgQVBQTElDQVRJT05cbnZhciBNeUFwcCA9IE1hcmlvbmV0dGUuQXBwbGljYXRpb24uZXh0ZW5kKHtcblx0aW5pdGlhbGl6ZSA6IGZ1bmN0aW9uKCl7XG5cdFx0XG5cdH0sXG5cdG9uU3RhcnQgOiBmdW5jdGlvbigpe1xuXHRcdEJhY2tib25lLmhpc3Rvcnkuc3RhcnQoe1xuXHRcdFx0cHVzaFN0YXRlIDogZmFsc2Vcblx0XHR9KTtcblx0XHRBcHBMYXlvdXQucmVuZGVyKCk7IFxuXHRcdGNvbnNvbGUubG9nKFwiISEhISEhISFhc2Rhc2RzYWRhcyEhISFcIilcblxuXHRcdHZhciBteUNhbGVuZGFyID0gbmV3IENhbGVuZGFyVmlldygpO1xuXHRcdEFwcExheW91dC5nZXRSZWdpb24oXCJtYWluXCIpLnNob3coIG15Q2FsZW5kYXIgKTtcblx0fSBcbn0pO1xuXG5cblxuJChmdW5jdGlvbigpe1xuXHR3aW5kb3cuYXBwID0gbmV3IE15QXBwKCk7XG5cdHdpbmRvdy5hcHAuc3RhcnQoKTsgXG59KTtcblxuXG5cblxuXG5cblxuICAgICAgICAgIiwidmFyIE15QXBwQ29udHJvbGxlciA9IE1hcmlvbmV0dGUuQ29udHJvbGxlci5leHRlbmQoe1xuXHRsb2FkUGFnZSA6IGZ1bmN0aW9uKCBwYWdlTmFtZSApe1xuXHRcdGNvbnNvbGUubG9nKFwiUEFHRSBOQWFzZGFzZGFzZGFzZE1FOjpcIiwgcGFnZU5hbWUgKTsgICAgICAgICBcblx0XHR0aGlzLnRyaWdnZXIoXCJwYWdlTG9hZGVkXCIsIHBhZ2VOYW1lKTtcblx0fVxufSk7XG5cbk15QXBwQ29udHJvbGxlci5ldmVudHMgPSBcInRlc3RcIjtcblxubW9kdWxlLmV4cG9ydHMgPSAgbmV3IE15QXBwQ29udHJvbGxlcigpO1xuIiwidmFyIEFwcENvbnRyb2xsZXIgPSByZXF1aXJlKFwiY29udHJvbGxlcnMvYXBwQ29udHJvbGxlclwiKTtcblxudmFyIE15QXBwUm91dGVyID0gTWFyaW9uZXR0ZS5BcHBSb3V0ZXIuZXh0ZW5kKHtcblx0Y29udHJvbGxlciA6IEFwcENvbnRyb2xsZXIsXG5cdGFwcFJvdXRlcyA6IHtcblx0XHRcIjpwYWdlXCIgOiBcImxvYWRQYWdlXCJcblx0fVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gbmV3IE15QXBwUm91dGVyKCk7XG4iLCJ2YXIgcGlwZSA9IHJlcXVpcmUoXCJwaXBlXCIpO1xuXG4vL2xpc3RlbmluZyBmb3IgbG9hZFxud2luZG93LmhhbmRsZUNsaWVudExvYWQgPSBmdW5jdGlvbigpe1xuXG4gIGNvbnNvbGUubG9nKFwiZ29vZ2xlIGFwaSBsb2FkZWRcIik7XG4gIGluaXQoKTtcbn1cblxudmFyIGNsaWVudElkID0gJzQzMzgzOTcyMzM2NS11N2dybGR0dmY4cGFiamtqNGZyY2lvM2N2NWhpdDhmbS5hcHBzLmdvb2dsZXVzZXJjb250ZW50LmNvbSc7XG52YXIgYXBpS2V5ID0gJ0FJemFTeUJzS2RUcGxSWHVFd2d2UFNIX2dHRjhPR3N3MzV0MTV2MCc7XG52YXIgc2NvcGVzID0gJ2h0dHBzOi8vd3d3Lmdvb2dsZWFwaXMuY29tL2F1dGgvY2FsZW5kYXInO1xudmFyIGNhbElkID0gXCJiLXJlZWwuY29tXzJkMzQzNDMyMzgzOTM2MzczMDJkMzYzNDMzQHJlc291cmNlLmNhbGVuZGFyLmdvb2dsZS5jb21cIjtcblxuLy9UT0RPIDogaW50ZWdyYXRlIGFsbCA0IGNhbGVuZGFyc1xuXG5mdW5jdGlvbiBpbml0KCl7XG5cdGdhcGkuY2xpZW50LnNldEFwaUtleShhcGlLZXkpO1xuXHRjaGVja0F1dGgoKTtcbn1cblxuZnVuY3Rpb24gY2hlY2tBdXRoKCl7XG5cdGdhcGkuYXV0aC5hdXRob3JpemUoIHtcblx0XHRjbGllbnRfaWQ6IGNsaWVudElkLCBcblx0XHRzY29wZTogc2NvcGVzLCBcblx0XHRpbW1lZGlhdGU6IGZhbHNlXG5cdH0sIGhhbmRsZUF1dGhSZXN1bHQgKTtcbn1cblxuZnVuY3Rpb24gaGFuZGxlQXV0aFJlc3VsdCggYXV0aFJlc3VsdCApe1xuXG5cdGlmKGF1dGhSZXN1bHQpe1xuXHRcdG1ha2VBcGlDYWxsKCk7XG5cdH1cbn1cblxuZnVuY3Rpb24gbWFrZUFwaUNhbGwoKSB7XG4gIGdhcGkuY2xpZW50LmxvYWQoJ2NhbGVuZGFyJywgJ3YzJywgZnVuY3Rpb24oKSB7XG5cbiAgICB2YXIgZnJvbSA9IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKTtcblxuICAgIHZhciByZXF1ZXN0ID0gZ2FwaS5jbGllbnQuY2FsZW5kYXIuZXZlbnRzLmxpc3Qoe1xuICAgICAgJ2NhbGVuZGFySWQnOiBjYWxJZCxcbiAgICAgIHRpbWVNaW4gOiBmcm9tXG4gICAgIH0pO1xuXG4gICByZXF1ZXN0LnRoZW4oZnVuY3Rpb24ocmVzcG9uc2UpIHtcblxuICAgICAgZXZlbnRzLnRyaWdnZXIoIFwiZXZlbnRzTG9hZGVkXCIsIHJlc3BvbnNlLnJlc3VsdCApO1xuICAgIH0sIGZ1bmN0aW9uKHJlYXNvbikge1xuXG4gICAgICBjb25zb2xlLmxvZygnRXJyb3I6ICcgKyByZWFzb24ucmVzdWx0LmVycm9yLm1lc3NhZ2UpO1xuICAgIH0pO1xuICAgICAgICAgIFxuICB9KTtcbn1cblxudmFyIGV2ZW50cyA9IF8uZXh0ZW5kKHtcblxufSwgQmFja2JvbmUuRXZlbnRzKTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cbiAgZXZlbnRzIDogZXZlbnRzXG59O1xuIiwidmFyIG15U29ja2V0ID0gbnVsbDtcbnZhciBjb25uZWN0ZWQgPSBmYWxzZTtcblxuZnVuY3Rpb24gaW5pdCgpe1xuXG5cdG15U29ja2V0ID0gaW8uY29ubmVjdCgnLy9sb2NhbGhvc3Q6MzAwMCcpO1xuXHRteVNvY2tldC5vbignY29ubmVjdCcsIGZ1bmN0aW9uKCl7XG5cdFx0Y29ubmVjdGVkID0gdHJ1ZTtcblx0fSk7XHRcbn1cblxuZnVuY3Rpb24gdXBkYXRlKCBkYXRhICl7XG5cblx0aWYoY29ubmVjdGVkKXtcblx0XHRteVNvY2tldC5lbWl0KCAndXBkYXRlX2RhdGEnLCBkYXRhICk7XHRcblx0fVxufVxuXG4vLyB2YXIgdGhyb3R0bGVkVXBkYXRlID0gXy50aHJvdHRsZSggdXBkYXRlLCA1MDAsIHtsZWFkaW5nOiBmYWxzZX0gKTtcblxuaW5pdCgpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblx0aW5pdCA6IGluaXQsXG5cdHVwZGF0ZSA6IHVwZGF0ZSxcblx0Y29ubmVjdGVkIDogY29ubmVjdGVkXG59IiwidmFyIGh1ZUNvbm5lY3QgPSByZXF1aXJlKFwiY29udHJvbGxlcnMvaHVlQ29ubmVjdFwiKTtcblxuZnVuY3Rpb24gTGlnaHRQYXR0ZXJuKCBsaWdodElkLCBwYXR0ZXJuSWQgKXtcblxuXHR0aGlzLl9oc2wgPSB7XG5cdFx0aCA6IDAsXG5cdFx0cyA6IDAsXG5cdFx0bCA6IDBcblx0fVxuXG5cdHRoaXMuX2xpZ2h0SWQgPSBsaWdodElkO1xuXHR0aGlzLl9wYXR0ZXJuSWQgPSBwYXR0ZXJuSWQ7XG5cdHRoaXMuX3N0ZXAgPSAwO1xuXG5cdHRoaXMubmV3U2VxdWVuY2UoIHRoaXMuX3BhdHRlcm5JZCApO1xufVxuXG5MaWdodFBhdHRlcm4ucHJvdG90eXBlID0ge1xuXHRuZXdTZXF1ZW5jZSA6IGZ1bmN0aW9uKCBpZCApe1xuXG5cdFx0dmFyIHBhdHRlcm4gPSBwYXR0ZXJuc1sgaWQgXTtcblx0XHR2YXIgc2VxdWVuY2UgPSBwYXR0ZXJuLnNlcXVlbmNlO1xuXG5cdFx0dGhpcy5fdHdlZW5lciA9IG5ldyBUaW1lbGluZU1heCh7XG5cdFx0XHRyZXBlYXQgOiBwYXR0ZXJuLnJlcGVhdCxcblx0XHRcdG9uQ29tcGxldGUgOiBmdW5jdGlvbigpe1xuXHRcdFx0XHRjb25zb2xlLmxvZyhcImNvbXBsZXRlIVwiKTtcblx0XHRcdH1cblx0XHR9KTtcblxuXHRcdF8uZWFjaCggc2VxdWVuY2UsIGZ1bmN0aW9uKCBzdGVwICl7XG5cblx0XHRcdHRoaXMucXVldWVDb2xvciggc3RlcCApO1xuXHRcdH0sIHRoaXMgKTtcblx0fSxcblx0cXVldWVDb2xvciA6IGZ1bmN0aW9uKCBzdGVwICl7XG5cblx0XHR2YXIgY29sb3IgPSBvbmUuY29sb3IoIHN0ZXAuY29sb3IgKTtcblx0XHR2YXIgZmFkZSA9IHN0ZXAuZmFkZTtcblx0XHR2YXIgd2FpdCA9IHN0ZXAud2FpdDtcblxuXHRcdHZhciBoc2wgPSB7XG5cdFx0XHRoIDogTWF0aC5mbG9vciggY29sb3IuaCgpICogMzYwKSwgXG5cdFx0XHRzIDogTWF0aC5mbG9vciggY29sb3IucygpICogMTAwKSxcblx0XHRcdGwgOiBNYXRoLmZsb29yKCBjb2xvci5sKCkgKiAxMDApIFxuXHRcdH07XG5cblx0XHR2YXIgb3B0aW9ucyA9IHtcblx0XHRcdG9uU3RhcnQgOiBmdW5jdGlvbigpe1xuXHRcdFx0XHQvL3VwZGF0aW5nIExFRHNcblx0XHRcdFx0aHVlQ29ubmVjdC51cGRhdGUoW3tcblx0XHRcdFx0XHRpZCA6IHRoaXMuX2xpZ2h0SWQsXG5cdFx0XHRcdFx0ZGF0YSA6IHtcblx0XHRcdFx0XHRcdGhzbCA6IGhzbCxcblx0XHRcdFx0XHRcdGR1cmF0aW9uIDogZmFkZVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fV0pO1x0XHRcdFx0XG5cdFx0XHR9LFxuXHRcdFx0b25TdGFydFNjb3BlIDogdGhpc1xuXHRcdH1cblxuXHRcdC8vdXBkYXRpbmcgZnJvbnRlbmRcblx0XHR0aGlzLl90d2VlbmVyLnRvKCB0aGlzLl9oc2wsIGZhZGUsIF8uZXh0ZW5kKCBvcHRpb25zLCBoc2wgKSApO1xuXHRcdHRoaXMuX3R3ZWVuZXIudG8oIHRoaXMuX2hzbCwgd2FpdCwge30gKTtcblx0fVxufVxuXG52YXIgcGF0dGVybnMgPSB7XG5cdCd0ZXN0JyA6IHtcblx0XHRyZXBlYXQgOiAgLTEsXG5cdFx0c2VxdWVuY2UgOiBbXG5cdFx0XHR7IGNvbG9yIDogXCIjRkIxOTExXCIsIGZhZGUgOiAxLCB3YWl0IDogMSB9LFxuXHRcdFx0Ly8geyBjb2xvciA6IFwiIzAwZmYwMFwiLCBmYWRlIDogMSwgd2FpdCA6IDEgfSxcblx0XHRcdC8vIHsgY29sb3IgOiBcIiM0MTU2RkZcIiwgZmFkZSA6IDEsIHdhaXQgOiAxIH0sXG5cdFx0XHQvLyB7IGNvbG9yIDogXCIjRkYwMDFEXCIsIGZhZGUgOiAxLCB3YWl0IDogMSB9LFxuXHRcdFx0Ly8geyBjb2xvciA6IFwiI0ZGRkYwN1wiLCBmYWRlIDogMSwgd2FpdCA6IDEgfSxcblx0XHRdXG5cdH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBMaWdodFBhdHRlcm47IiwidmFyIEhlbHBlcnMgPSB7fTtcblxuLy9kaW1lbnNpb25zIGNhbGN1bGF0aW9uc1xuSGVscGVycy5kaW0gPSB7XG5cdGJhY2tzdHJldGNoIDogZnVuY3Rpb24ocm9vdFdpZHRoLCByb290SGVpZ2h0LCByYXRpbyl7XG5cblx0XHR2YXIgcmV0dXJuRGltID0ge2xlZnQ6IDAsIHRvcDogMH07XG5cbiAgICBcdHZhciBiZ1dpZHRoID0gcm9vdFdpZHRoXG4gICAgXHR2YXIgYmdIZWlnaHQgPSBiZ1dpZHRoIC8gcmF0aW87XG4gICAgXHR2YXIgYmdPZmZzZXQ7XG4gICAgICAgXG5cdFx0aWYgKGJnSGVpZ2h0ID49IHJvb3RIZWlnaHQpIHtcbiAgICAgICAgICAgIGJnT2Zmc2V0ID0gKGJnSGVpZ2h0IC0gcm9vdEhlaWdodCkgLyAyO1xuICAgICAgICAgICAgcmV0dXJuRGltLnRvcCA9IGJnT2Zmc2V0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYmdIZWlnaHQgPSByb290SGVpZ2h0O1xuICAgICAgICAgICAgYmdXaWR0aCA9IGJnSGVpZ2h0ICogcmF0aW87XG4gICAgICAgICAgICBiZ09mZnNldCA9IChiZ1dpZHRoIC0gcm9vdFdpZHRoKSAvIDI7XG4gICAgICAgICAgICByZXR1cm5EaW0ubGVmdCA9IGJnT2Zmc2V0O1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuRGltLndpZHRoID0gYmdXaWR0aDtcbiAgICAgICAgcmV0dXJuRGltLmhlaWdodCA9IGJnSGVpZ2h0O1xuXG4gICAgICAgIHJldHVybiByZXR1cm5EaW07XG5cdH1cbn1cblxuSGVscGVycy5sb2FkID0ge1xuXHRsb2FkRmlsZXMgOiBmdW5jdGlvbihmaWxlcywgY2FsbGJhY2ssIHByZWZpeCApe1xuXHRcdC8vY2hlY2sgaWYgZmlsZSBpcyBpbiBhcnJheSwgaWYgbm90IHdyYXBcblx0XHRmaWxlcyA9IEhlbHBlcnMudGVzdC5pc1N0cmluZyhmaWxlcykgPyBbZmlsZXNdIDogZmlsZXM7XG5cdFx0XG5cdFx0Ly9jcmVhdGUgZW1wdHkgb2JqZWN0IHRvIGhvbGQgY29weVxuXHRcdHZhciBjb3B5ID0gSGVscGVycy50ZXN0LmlzQXJyYXkoZmlsZXMpID8gW10gOiB7fTtcblxuXHRcdHByZWZpeCA9IHByZWZpeCB8fCBcIlwiO1xuXHRcdHZhciBxdWV1ZSA9IG5ldyBjcmVhdGVqcy5Mb2FkUXVldWUoKTtcblx0XHRxdWV1ZS5hZGRFdmVudExpc3RlbmVyKFwiZmlsZWxvYWRcIiwgZnVuY3Rpb24oZXZlbnQpe1xuXHRcdFx0aWYoY2FsbGJhY2spIGNhbGxiYWNrKGV2ZW50KTtcblx0XHR9KTtcblx0XHRfLmVhY2goZmlsZXMsZnVuY3Rpb24oZmlsZSxrZXkpe1xuXHRcdFx0cXVldWUubG9hZEZpbGUoIHByZWZpeCArIGZpbGUgKTtcblx0XHRcdGNvcHlba2V5XSA9IHByZWZpeCArIGZpbGU7XG5cdFx0fSk7XG5cdFx0cXVldWUubG9hZCgpO1xuXHRcdHJldHVybiBjb3B5O1xuXHR9XG59XG5cbkhlbHBlcnMudGVzdCA9IHtcblx0aXNBcnJheSA6IGZ1bmN0aW9uKCBvYmogKXtcblx0XHRyZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKCBvYmogKSA9PT0gJ1tvYmplY3QgQXJyYXldJztcblx0fSxcblx0aXNTdHJpbmcgOiBmdW5jdGlvbiggb2JqICl7XG5cdFx0cmV0dXJuIHR5cGVvZiBvYmogPT09ICdzdHJpbmcnO1xuXHR9XG59XG5cbkhlbHBlcnMuY29sb3IgPSB7XG5cdHJhbmRvbUhleCA6IGZ1bmN0aW9uKCl7XG5cblx0XHRyZXR1cm4gXCIjXCIgKyAoTWF0aC5yYW5kb20oKS50b1N0cmluZygxNikgKyAnMDAwMDAwJykuc2xpY2UoMiwgOCk7XG5cdH0sXG5cdGNoYW5nZUNvbG9yIDogZnVuY3Rpb24oY29sb3IsIHJhdGlvLCBkYXJrZXIpIHtcbiAgICAgICAgLy8gQ2FsY3VsYXRlIHJhdGlvXG4gICAgICAgIHZhciBkaWZmZXJlbmNlID0gTWF0aC5yb3VuZChyYXRpbyAqIDI1NikgKiAoZGFya2VyID8gLTEgOiAxKSxcbiAgICAgICAgICAgIC8vIENvbnZlcnQgaGV4IHRvIGRlY2ltYWxcbiAgICAgICAgICAgIGRlY2ltYWwgPSAgY29sb3IucmVwbGFjZShcbiAgICAgICAgICAgICAgICAvXiM/KFthLWYwLTldW2EtZjAtOV0pKFthLWYwLTldW2EtZjAtOV0pKFthLWYwLTldW2EtZjAtOV0pL2ksXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBwYXJzZUludChhcmd1bWVudHNbMV0sIDE2KSArICcsJyArXG4gICAgICAgICAgICAgICAgICAgICAgICBwYXJzZUludChhcmd1bWVudHNbMl0sIDE2KSArICcsJyArXG4gICAgICAgICAgICAgICAgICAgICAgICBwYXJzZUludChhcmd1bWVudHNbM10sIDE2KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICApLnNwbGl0KC8sLyksXG4gICAgICAgICAgICByZXR1cm5WYWx1ZTtcbiAgICAgICAgcmV0dXJuW1xuICAgICAgICAgICAgICAgICcjJyxcbiAgICAgICAgICAgICAgICBIZWxwZXJzLnBhZChNYXRoW2RhcmtlciA/ICdtYXgnIDogJ21pbiddKFxuICAgICAgICAgICAgICAgICAgICBwYXJzZUludChkZWNpbWFsWzBdLCAxMCkgKyBkaWZmZXJlbmNlLCBkYXJrZXIgPyAwIDogMjU1XG4gICAgICAgICAgICAgICAgKS50b1N0cmluZygxNiksIDIpLFxuICAgICAgICAgICAgICAgIEhlbHBlcnMucGFkKE1hdGhbZGFya2VyID8gJ21heCcgOiAnbWluJ10oXG4gICAgICAgICAgICAgICAgICAgIHBhcnNlSW50KGRlY2ltYWxbMV0sIDEwKSArIGRpZmZlcmVuY2UsIGRhcmtlciA/IDAgOiAyNTVcbiAgICAgICAgICAgICAgICApLnRvU3RyaW5nKDE2KSwgMiksXG4gICAgICAgICAgICAgICAgSGVscGVycy5wYWQoTWF0aFtkYXJrZXIgPyAnbWF4JyA6ICdtaW4nXShcbiAgICAgICAgICAgICAgICAgICAgcGFyc2VJbnQoZGVjaW1hbFsyXSwgMTApICsgZGlmZmVyZW5jZSwgZGFya2VyID8gMCA6IDI1NVxuICAgICAgICAgICAgICAgICkudG9TdHJpbmcoMTYpLCAyKVxuICAgICAgICAgICAgXS5qb2luKCcnKTtcbiAgICB9LFxuICAgIGdldEx1bWEgOiBmdW5jdGlvbihoZXhjb2xvcil7XG5cbiAgICBcdGhleGNvbG9yID0gaGV4Y29sb3IucmVwbGFjZShcIiNcIixcIlwiKTtcbiAgICAgICAgdmFyIHIgPSBwYXJzZUludChoZXhjb2xvci5zdWJzdHIoMCwyKSwxNik7XG5cdCAgICB2YXIgZyA9IHBhcnNlSW50KGhleGNvbG9yLnN1YnN0cigyLDIpLDE2KTtcblx0ICAgIHZhciBiID0gcGFyc2VJbnQoaGV4Y29sb3Iuc3Vic3RyKDQsMiksMTYpO1xuXHQgICAgdmFyIHlpcSA9ICgocioyOTkpKyhnKjU4NykrKGIqMTE0KSkvMTAwMDtcbiAgICAgICAgcmV0dXJuIHlpcTtcbiAgICB9LFxuICAgIHJnYlRvSGV4IDogZnVuY3Rpb24oIHIsIGcsIGIsIG5vSGFzaCApe1xuXG4gICAgXHRyZXR1cm4gKG5vSGFzaCA/IFwiXCIgOiBcIiNcIikgKyAoKDEgPDwgMjQpICsgKHIgPDwgMTYpICsgKGcgPDwgOCkgKyBiKS50b1N0cmluZygxNikuc2xpY2UoMSk7XG4gICAgfSwgXG4gICAgaGV4VG9SZ2IgOiBmdW5jdGlvbiggaGV4ICl7XG5cbiAgICBcdHZhciByZXN1bHQgPSAvXiM/KFthLWZcXGRdezJ9KShbYS1mXFxkXXsyfSkoW2EtZlxcZF17Mn0pJC9pLmV4ZWMoaGV4KTtcblx0ICAgIHJldHVybiByZXN1bHQgPyB7XG5cdCAgICAgICAgcjogcGFyc2VJbnQocmVzdWx0WzFdLCAxNiksXG5cdCAgICAgICAgZzogcGFyc2VJbnQocmVzdWx0WzJdLCAxNiksXG5cdCAgICAgICAgYjogcGFyc2VJbnQocmVzdWx0WzNdLCAxNilcblx0ICAgIH0gOiBudWxsO1xuICAgIH1cbn1cblxuSGVscGVycy5jYW52YXMgPSB7XG5cdGdlbmVyYXRlQ2FudmFzIDogKGZ1bmN0aW9uKCl7XG5cdFx0ZnVuY3Rpb24gZ2VuZXJhdGVDYW52YXMoKXtcblx0XHRcdHRoaXMuY2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG5cdFx0XHR0aGlzLmN0eCA9IHRoaXMuY2FudmFzLmdldENvbnRleHQoXCIyZFwiKTtcblx0XHRcdCQodGhpcy5jYW52YXMpLmRhdGEoXCJoZWxwZXJzXCIsIHRoaXMpO1xuXHRcdH1cblx0XHRnZW5lcmF0ZUNhbnZhcy5wcm90b3R5cGUuZHJhd0ltYWdlID0gZnVuY3Rpb24oaW1nKXtcblx0XHRcdHZhciB3ID0gaW1nLndpZHRoO1xuXHRcdFx0dmFyIGggPSBpbWcuaGVpZ2h0O1xuXHRcdFx0dGhpcy5yZXNpemUodyxoKTtcblx0XHRcdHRoaXMuY3R4LmRyYXdJbWFnZSggaW1nLCAwLCAwICk7XG5cdFx0fVxuXHRcdGdlbmVyYXRlQ2FudmFzLnByb3RvdHlwZS5yZXNpemUgPSBmdW5jdGlvbih3LGgpe1xuXHRcdFx0dmFyIHBpeGVsUmF0aW8gPSAxO1xuXHRcdFx0dmFyIGNhbnZhcyA9IHRoaXMuY2FudmFzO1xuXHRcdFx0Y2FudmFzLndpZHRoID0gdztcblx0XHRcdGNhbnZhcy5oZWlnaHQgPSBoO1xuXHRcdCAgICBjYW52YXMuc3R5bGUud2lkdGggPSB3KnBpeGVsUmF0aW8gKyBcInB4XCI7XG5cdFx0ICAgIGNhbnZhcy5zdHlsZS5oZWlnaHQgPSBoKnBpeGVsUmF0aW8gKyBcInB4XCI7XG5cdFx0fVxuXHRcdHJldHVybiBnZW5lcmF0ZUNhbnZhcztcblx0fSkoKVxufVxuXG4vL21pc2NcbkhlbHBlcnMuYmdJbWFnZXNGcm9tRGF0YSA9IGZ1bmN0aW9uKCAkZWwgKXtcblx0JGVsLmZpbmQoJ1tkYXRhLWltYWdlLXNyY10nKS5lYWNoKCBmdW5jdGlvbigpe1xuXHRcdHZhciBzcmMgPSAkKHRoaXMpLmRhdGEoJ2ltYWdlLXNyYycpO1xuXHRcdCQodGhpcykuY3NzKHtcblx0XHRcdCdiYWNrZ3JvdW5kLWltYWdlJyA6IFwidXJsKCdcIiArIHNyYyArIFwiJylcIlxuXHRcdH0pO1xuXHR9KTtcbn1cblxuSGVscGVycy5wYWQgPSBmdW5jdGlvbihudW0sIHRvdGFsQ2hhcnMpIHtcbiAgICB2YXIgcGFkID0gJzAnO1xuICAgIG51bSA9IG51bSArICcnO1xuICAgIHdoaWxlIChudW0ubGVuZ3RoIDwgdG90YWxDaGFycykge1xuICAgICAgICBudW0gPSBwYWQgKyBudW07XG4gICAgfVxuICAgIHJldHVybiBudW07XG59XG5cbkhlbHBlcnMualFVaSA9IGZ1bmN0aW9uKCB2aWV3ICl7XG5cdHJldHVybiB0aGlzLmpRRWxzKCB2aWV3LnVpLCB2aWV3LiRlbCApO1xufVxuXG5IZWxwZXJzLmpRRWxzID0gZnVuY3Rpb24oZWxzLCAkcGFyZW50LCBzaW5nbGVLZXkpe1xuXHQkcGFyZW50ID0gJHBhcmVudCB8fCAkKFwiYm9keVwiKTtcblx0aWYoIXNpbmdsZUtleSl7XG5cdFx0dmFyICRlbHMgPSB7fTtcblx0XHRfLmVhY2goIGVscywgZnVuY3Rpb24odmFsdWUsIGtleSl7XG4gICAgXHRcdCRlbHNba2V5XSA9ICRwYXJlbnQuZmluZCh2YWx1ZSk7XG4gICAgXHR9KTtcbiAgICBcdCRlbHMuYm9keSA9ICQoXCJib2R5XCIpO1xuICAgIFx0JGVscy5odG1sID0gJChcImh0bWxcIik7XG5cdH0gZWxzZSB7XG5cdFx0JGVsc1tzaW5nbGVLZXldID0gJHBhcmVudC5maW5kKCBlbHNbc2luZ2xlS2V5XSApO1xuXHR9XG5cdHJldHVybiAkZWxzO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEhlbHBlcnM7XG4iLCJ2YXIgQ2FsZW5kYXJNb2RlbCA9IEJhY2tib25lLk1vZGVsLmV4dGVuZCh7XG5cdGRlZmF1bHRzIDoge1xuXHRcdHN1bW1hcnkgOiBcIm4vYVwiLFxuXHRcdGRlc2NyaXB0aW9uIDogXCJuL2FcIixcblx0XHRzdGFydCA6IFwibi9hXCIsXG5cdFx0ZW5kIDogXCJuL2FcIixcblx0fVxufSlcblxubW9kdWxlLmV4cG9ydHMgPSBDYWxlbmRhck1vZGVsOyIsInZhciBzdGF0ZSA9IG5ldyAoQmFja2JvbmUuTW9kZWwuZXh0ZW5kKHtcblx0ZGVmYXVsdHMgOiB7XG5cdFx0Ly8gXCJuYXZfb3BlblwiIFx0XHQ6IGZhbHNlLFxuXHRcdC8vICdzY3JvbGxfYXRfdG9wJyA6IHRydWUsXG5cdFx0Ly8gJ21pbmltYWxfbmF2JyBcdDogZmFsc2UsXG5cdFx0Ly8gJ2Z1bGxfbmF2X29wZW4nXHQ6IGZhbHNlLFxuXHRcdC8vICd1aV9kaXNwbGF5J1x0OiBmYWxzZVxuXHR9XG59KSkoKTtcblxubW9kdWxlLmV4cG9ydHMgPSBzdGF0ZTtcbiIsInZhciBwaXBlID0gXy5leHRlbmQoe1xuXG5cdFxuXHRcbn0sIEJhY2tib25lLkV2ZW50cyk7XG5cbm1vZHVsZS5leHBvcnRzID0gcGlwZTsiLCJtb2R1bGUuZXhwb3J0cyA9IFwiPGRpdj5cXG5cXHQ8aW5wdXQgaWQ9XFxcImhleC1pbnB1dFxcXCIgdHlwZT1cXFwidGV4dFxcXCI+PC9pbnB1dD5cXG5cXHQ8YnV0dG9uIGlkPVxcXCJoZXhcXFwiPmhleDwvYnV0dG9uPlxcbjwvZGl2PlxcbjxidXR0b24gaWQ9XFxcInRlc3RcXFwiPnRlc3Q8L2J1dHRvbj5cXG48aW5wdXQgY2xhc3M9XFxcImNvbG9yXFxcIiB0eXBlPVxcXCJjb2xvclxcXCIgbmFtZT1cXFwiZmF2Y29sb3JcXFwiPlxcbjxkaXYgY2xhc3M9XFxcIm1haW4tbGlzdFxcXCI+PC9kaXY+XFxuXFxuIFwiO1xuIiwibW9kdWxlLmV4cG9ydHMgPSBcIjwlIGlmKCBzdW1tYXJ5ICl7ICU+XFxuXFx0PGgyPnN1bW1hcnkgOiA8JT0gc3VtbWFyeSAlPjwvaDI+XFxuPCUgfSAlPlxcblxcbjwlIGlmKCBkZXNjcmlwdGlvbiApeyAlPlxcblxcdDxoMz5kZXNjcmlwdGlvbiA6IDwlPSBkZXNjcmlwdGlvbiAlPjwvaDM+XFxuPCUgfSAlPlxcblxcbjwlIGlmKCBzdGFydCApeyAlPlxcblxcdDxoMz5zdGFydCA6IDwlPSBzdGFydC5kYXRlVGltZSAlPjwvaDM+XFxuPCUgfSAlPlxcblxcbjwlIGlmKCBlbmQgKXsgJT5cXG5cXHQ8aDM+ZW5kIDogPCU9IGVuZC5kYXRlVGltZSAlPjwvaDM+XFxuPCUgfSAlPlwiO1xuIiwidmFyIFN0YXRlIFx0XHQ9IHJlcXVpcmUoXCJtb2RlbHMvc3RhdGVcIik7XG5cbnZhciBNeUFwcExheW91dCA9IE1hcmlvbmV0dGUuTGF5b3V0Vmlldy5leHRlbmQoe1xuXHRlbCA6IFwiI2NvbnRlbnRcIixcblx0dGVtcGxhdGUgOiBmYWxzZSxcblx0cmVnaW9ucyA6IHtcblx0XHRtYWluIDogXCIjbWFpblwiXG5cdH0sIFxuXHRpbml0aWFsaXplIDogZnVuY3Rpb24oKXtcblx0XHR2YXIgX3RoaXMgPSB0aGlzO1xuXG5cdFx0Ly93cmFwcGluZyBodG1sXG5cdFx0dGhpcy4kaHRtbCA9ICQoXCJodG1sXCIpO1xuXHRcdHRoaXMuJGh0bWwucmVtb3ZlQ2xhc3MoXCJoaWRkZW5cIik7XG5cblx0XHQvL3Jlc2l6ZSBldmVudHNcblx0XHQkKHdpbmRvdykucmVzaXplKGZ1bmN0aW9uKCl7XG5cdFx0XHRfdGhpcy5vblJlc2l6ZVdpbmRvdygpO1xuXHRcdH0pLnJlc2l6ZSgpO1xuXG5cdFx0dGhpcy5saXN0ZW5Gb3JTdGF0ZSgpO1xuXHR9LFxuXHRsaXN0ZW5Gb3JTdGF0ZSA6IGZ1bmN0aW9uKCl7XG5cdFx0Ly9zdGF0ZSBjaGFuZ2Vcblx0XHR0aGlzLmxpc3RlblRvKCBTdGF0ZSwgXCJjaGFuZ2VcIiwgZnVuY3Rpb24oIGUgKXtcblxuXHRcdFx0dGhpcy5vblN0YXRlQ2hhbmdlKCBlLmNoYW5nZWQsIGUuX3ByZXZpb3VzQXR0cmlidXRlcyApO1xuXHRcdH0sIHRoaXMpO1xuXHRcdHRoaXMub25TdGF0ZUNoYW5nZSggU3RhdGUudG9KU09OKCkgKTtcblx0fSxcblx0b25TdGF0ZUNoYW5nZSA6IGZ1bmN0aW9uKCBjaGFuZ2VkLCBwcmV2aW91cyApe1xuXG5cdFx0Xy5lYWNoKCBjaGFuZ2VkLCBmdW5jdGlvbih2YWx1ZSwga2V5KXtcblx0XHRcdFxuXHRcdFx0aWYoIF8uaXNCb29sZWFuKCB2YWx1ZSApICl7XG5cdFx0XHRcdHRoaXMuJGh0bWwudG9nZ2xlQ2xhc3MoXCJzdGF0ZS1cIitrZXksIHZhbHVlKTtcblx0XHRcdFx0dGhpcy4kaHRtbC50b2dnbGVDbGFzcyhcInN0YXRlLW5vdC1cIitrZXksICF2YWx1ZSk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR2YXIgcHJldlZhbHVlID0gcHJldmlvdXNbIGtleSBdO1xuXHRcdFx0XHRpZihwcmV2VmFsdWUpe1xuXHRcdFx0XHRcdHRoaXMuJGh0bWwudG9nZ2xlQ2xhc3MoXCJzdGF0ZS1cIitrZXkrXCItXCIrcHJldlZhbHVlLCBmYWxzZSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0dGhpcy4kaHRtbC50b2dnbGVDbGFzcyhcInN0YXRlLVwiK2tleStcIi1cIit2YWx1ZSwgdHJ1ZSk7XG5cdFx0XHR9XG5cblx0XHR9LCB0aGlzICk7XG5cdH0sXG5cdG9uUmVzaXplV2luZG93IDogZnVuY3Rpb24oKXtcblx0XHRDb21tb24ud3cgPSAkKHdpbmRvdykud2lkdGgoKTtcblx0XHRDb21tb24ud2ggPSAkKHdpbmRvdykuaGVpZ2h0KCk7XG5cdH1cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IG5ldyBNeUFwcExheW91dCgpOyIsInZhciBjYWxlbmRhckxvYWQgPSByZXF1aXJlKFwiY29udHJvbGxlcnMvY2FsZW5kYXJMb2FkXCIpO1xudmFyIENhbGVuZGFySXRlbXMgXHQ9IHJlcXVpcmUoXCJ2aWV3cy9jYWxlbmRhckl0ZW1zXCIpO1xudmFyIENhbGVuZGFyTW9kZWwgXHQ9IHJlcXVpcmUoXCJtb2RlbHMvY2FsZW5kYXJNb2RlbFwiKTtcbnZhciBoZWxwZXJzID0gcmVxdWlyZShcImhlbHBlcnNcIik7IFxudmFyIGh1ZUNvbm5lY3QgPSByZXF1aXJlKFwiY29udHJvbGxlcnMvaHVlQ29ubmVjdFwiKTtcbnZhciBMaWdodFBhdHRlcm4gPSByZXF1aXJlKFwiY29udHJvbGxlcnMvbGlnaHRQYXR0ZXJuXCIpO1xuXG5cblxudmFyIENhbGVuZGFyVmlldyA9IE1hcmlvbmV0dGUuTGF5b3V0Vmlldy5leHRlbmQoe1xuXHR0ZW1wbGF0ZSA6IF8udGVtcGxhdGUoIHJlcXVpcmUoXCJ0ZW1wbGF0ZXMvY2FsZW5kYXIuaHRtbFwiKSApLFxuXHRyZWdpb25zIDoge1xuXHRcdG1haW5MaXN0IDogXCIubWFpbi1saXN0XCJcblx0fSxcblx0dWkgOiB7XG5cdFx0Y29sb3JQaWNrZXIgOiBcIi5jb2xvclwiLFxuXHRcdHRlc3QgOiBcIiN0ZXN0XCIsXG5cdFx0aGV4QnV0dG9uIDogXCIjaGV4XCIsXG5cdFx0aGV4SW5wdXQgOiBcIiNoZXgtaW5wdXRcIlxuXHR9LFxuXHRldmVudHMgOiB7XG5cdFx0XCJjbGljayBAdWkudGVzdFwiIDogZnVuY3Rpb24oKXtcblx0XHRcdGZvciggdmFyIGkgPSAwIDsgaSA8IDUgOyBpKysgKXtcblx0XHRcdFx0bmV3IExpZ2h0UGF0dGVybihpKzEsIFwidGVzdFwiKTtcblx0XHRcdH1cblx0XHR9LFxuXHRcdFwiY2xpY2sgQHVpLmhleEJ1dHRvblwiIDogZnVuY3Rpb24oKXtcblx0XHRcdHZhciBjb2xvciA9IHRoaXMudWkuaGV4SW5wdXQudmFsKCk7XG5cdFx0XHR0aGlzLnRlc3RDb2xvciggY29sb3IgKTtcblx0XHR9XG5cdH0sXG5cdGluaXRpYWxpemUgOiBmdW5jdGlvbigpe1xuXHRcdFxuXHRcdHRoaXMubGlzdGVuVG8oIGNhbGVuZGFyTG9hZC5ldmVudHMsIFwiZXZlbnRzTG9hZGVkXCIsIHRoaXMuZXZlbnRzTG9hZGVkICk7XG5cdH0sXG5cdG9uU2hvdyA6IGZ1bmN0aW9uKCl7XG5cblx0XHR2YXIgY29sb3JQaWNrZXIgPSB0aGlzLnVpLmNvbG9yUGlja2VyO1xuXHRcdHZhciBfdGhpcyA9IHRoaXM7XG5cdFx0JChjb2xvclBpY2tlcikuY2hhbmdlKGZ1bmN0aW9uKCl7XG5cdFx0XHR2YXIgdmFsID0gJCh0aGlzKS52YWwoKTtcblx0XHRcdF90aGlzLnRlc3RDb2xvciggdmFsICk7XG5cdFx0fSk7XG5cdH0sXG5cdHRlc3RDb2xvciA6IGZ1bmN0aW9uKCBfY29sb3IgKXtcblxuXHRcdHZhciBjb2xvciA9IG9uZS5jb2xvciggX2NvbG9yICk7XG5cdFx0dmFyIGhzbCA9IHtcblx0XHRcdGggOiBNYXRoLmZsb29yKCBjb2xvci5oKCkgKiAzNjApLCBcblx0XHRcdHMgOiBNYXRoLmZsb29yKCBjb2xvci5zKCkgKiAxMDApLFxuXHRcdFx0bCA6IE1hdGguZmxvb3IoIGNvbG9yLmwoKSAqIDEwMCkgXG5cdFx0fTtcblx0XHRodWVDb25uZWN0LnVwZGF0ZShbXG5cdFx0XHR7XG5cdFx0XHRcdCdpZCcgOiAxLFxuXHRcdFx0XHQnZGF0YScgOiB7XG5cdFx0XHRcdFx0J2hzbCcgOiBoc2wsXG5cdFx0XHRcdFx0J2R1cmF0aW9uJyA6IDFcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0J2lkJyA6IDIsXG5cdFx0XHRcdCdkYXRhJyA6IHtcblx0XHRcdFx0XHQnaHNsJyA6IGhzbCxcblx0XHRcdFx0XHQnZHVyYXRpb24nIDogMVxuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHQnaWQnIDogMyxcblx0XHRcdFx0J2RhdGEnIDoge1xuXHRcdFx0XHRcdCdoc2wnIDogaHNsLFxuXHRcdFx0XHRcdCdkdXJhdGlvbicgOiAxXG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHR7XG5cdFx0XHRcdCdpZCcgOiA0LFxuXHRcdFx0XHQnZGF0YScgOiB7XG5cdFx0XHRcdFx0J2hzbCcgOiBoc2wsXG5cdFx0XHRcdFx0J2R1cmF0aW9uJyA6IDFcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0J2lkJyA6IDUsXG5cdFx0XHRcdCdkYXRhJyA6IHtcblx0XHRcdFx0XHQnaHNsJyA6IGhzbCxcblx0XHRcdFx0XHQnZHVyYXRpb24nIDogMVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XSk7XHRcdFxuXHR9LFxuXHRldmVudHNMb2FkZWQgOiBmdW5jdGlvbiggZGF0YSApe1xuXHRcdFxuXHRcdHZhciBteUNhbGVuZGFySXRlbXMgPSBuZXcgQ2FsZW5kYXJJdGVtcygpO1xuXG5cdFx0Xy5lYWNoKCBkYXRhLml0ZW1zLCBmdW5jdGlvbiggaXRlbSApe1xuXG5cdFx0XHR2YXIgbSA9IG5ldyBDYWxlbmRhck1vZGVsKCBpdGVtICk7XG5cdFx0XHRteUNhbGVuZGFySXRlbXMuY29sbGVjdGlvbi5hZGQoIG0gKTtcblx0XHR9KTtcblxuXHRcdHRoaXMuZ2V0UmVnaW9uKFwibWFpbkxpc3RcIikuc2hvdyggbXlDYWxlbmRhckl0ZW1zICk7XG5cdH0gICAgICAgICAgXG59KTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IENhbGVuZGFyVmlldzsgICAgICAgICAgICAgICAgICAgIFxuICAgIFxuICIsInZhciBDYWxlbmRhckl0ZW0gPSBNYXJpb25ldHRlLkl0ZW1WaWV3LmV4dGVuZCh7XG5cdGNsYXNzTmFtZSA6IFwiaXRlbVwiLFxuXHR0ZW1wbGF0ZSA6IF8udGVtcGxhdGUoIHJlcXVpcmUoXCJ0ZW1wbGF0ZXMvY2FsZW5kYXJJdGVtLmh0bWxcIikgKSxcblx0dWkgOiB7XG5cdFx0J3RpdGxlJyA6IFwiaDJcIlxuXHR9LFxuXHRldmVudHMgOiB7XG5cdFx0J2NsaWNrIEB1aS50aXRsZScgOiBmdW5jdGlvbigpe1xuXG5cblx0XHR9XG5cdH1cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IENhbGVuZGFySXRlbTsiLCJ2YXIgQ2FsZW5kYXJJdGVtIFx0PSByZXF1aXJlKFwidmlld3MvY2FsZW5kYXJJdGVtXCIpO1xuXG52YXIgQ2FsZW5kYXJJdGVtcyA9IE1hcmlvbmV0dGUuQ29sbGVjdGlvblZpZXcuZXh0ZW5kKHtcblxuXHRjaGlsZFZpZXcgOiBDYWxlbmRhckl0ZW0sXG5cdGNvbGxlY3Rpb24gOiBuZXcgQmFja2JvbmUuQ29sbGVjdGlvbigpXG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBDYWxlbmRhckl0ZW1zOyJdfQ==
