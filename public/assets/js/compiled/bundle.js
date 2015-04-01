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
			{ color : "#ff00ff", fade : 1, wait : 1 },
			{ color : "#00ff00", fade : 1, wait : 1 },
			{ color : "#4156FF", fade : 1, wait : 1 },
			{ color : "#FF001D", fade : 1, wait : 1 },
			{ color : "#FFFF07", fade : 1, wait : 1 },
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
module.exports = "<button id=\"test\">test</button>\n<input class=\"color\" type=\"color\" name=\"favcolor\">\n<div class=\"main-list\"></div>\n\n ";

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
		test : "#test"
	},
	events : {
		"click @ui.test" : function(){
			for( var i = 0 ; i < 5 ; i++ ){
				new LightPattern(i+1, "test");
			}
		}
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

			hueConnect.update([
				{
					'id' : 1,
					'data' : {
						'hsl' : hsl
					}
				},
				{
					'id' : 2,
					'data' : {
						'hsl' : hsl
					}
				},
				{
					'id' : 3,
					'data' : {
						'hsl' : hsl
					}
				},
				{
					'id' : 4,
					'data' : {
						'hsl' : hsl
					}
				},
				{
					'id' : 5,
					'data' : {
						'hsl' : hsl
					}
				}
			]);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIuLi9wdWJsaWMvYXNzZXRzL2pzL3VzZXIvYXBwLmpzIiwiLi4vcHVibGljL2Fzc2V0cy9qcy91c2VyL2NvbnRyb2xsZXJzL2FwcENvbnRyb2xsZXIuanMiLCIuLi9wdWJsaWMvYXNzZXRzL2pzL3VzZXIvY29udHJvbGxlcnMvYXBwUm91dGVyLmpzIiwiLi4vcHVibGljL2Fzc2V0cy9qcy91c2VyL2NvbnRyb2xsZXJzL2NhbGVuZGFyTG9hZC5qcyIsIi4uL3B1YmxpYy9hc3NldHMvanMvdXNlci9jb250cm9sbGVycy9odWVDb25uZWN0LmpzIiwiLi4vcHVibGljL2Fzc2V0cy9qcy91c2VyL2NvbnRyb2xsZXJzL2xpZ2h0UGF0dGVybi5qcyIsIi4uL3B1YmxpYy9hc3NldHMvanMvdXNlci9oZWxwZXJzLmpzIiwiLi4vcHVibGljL2Fzc2V0cy9qcy91c2VyL21vZGVscy9jYWxlbmRhck1vZGVsLmpzIiwiLi4vcHVibGljL2Fzc2V0cy9qcy91c2VyL21vZGVscy9zdGF0ZS5qcyIsIi4uL3B1YmxpYy9hc3NldHMvanMvdXNlci9waXBlLmpzIiwiLi4vcHVibGljL2Fzc2V0cy9qcy91c2VyL3RlbXBsYXRlcy9jYWxlbmRhci5odG1sIiwiLi4vcHVibGljL2Fzc2V0cy9qcy91c2VyL3RlbXBsYXRlcy9jYWxlbmRhckl0ZW0uaHRtbCIsIi4uL3B1YmxpYy9hc3NldHMvanMvdXNlci92aWV3cy9hcHBMYXlvdXQuanMiLCIuLi9wdWJsaWMvYXNzZXRzL2pzL3VzZXIvdmlld3MvY2FsZW5kYXIuanMiLCIuLi9wdWJsaWMvYXNzZXRzL2pzL3VzZXIvdmlld3MvY2FsZW5kYXJJdGVtLmpzIiwiLi4vcHVibGljL2Fzc2V0cy9qcy91c2VyL3ZpZXdzL2NhbGVuZGFySXRlbXMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ05BO0FBQ0E7O0FDREE7QUFDQTs7QUNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIndpbmRvdy5Db21tb24gPSB7XG5cdHBhdGggOiB7XG5cdFx0YXNzZXRzIDogXCJhc3NldHMvXCIsXG5cdFx0aW1nIDogXCJhc3NldHMvaW1nL1wiLFxuXHRcdGF1ZGlvIDogXCJhc3NldHMvYXVkaW8vXCJcblx0fSxcblx0c2l6ZXMgOntcblx0XHRmcmFtZSA6IDEwXG5cdH1cbn07XG5cbi8vYmFzZVxudmFyIEFwcFJvdXRlciBcdFx0PSByZXF1aXJlKCBcImNvbnRyb2xsZXJzL2FwcFJvdXRlclwiICk7XG52YXIgQXBwTGF5b3V0IFx0XHQ9IHJlcXVpcmUoIFwidmlld3MvYXBwTGF5b3V0XCIgKTtcblxuLy9jdXN0b21cbnZhciBDYWxlbmRhclZpZXdcdD0gcmVxdWlyZShcInZpZXdzL2NhbGVuZGFyXCIpO1xuXG4vL1RIRSBBUFBMSUNBVElPTlxudmFyIE15QXBwID0gTWFyaW9uZXR0ZS5BcHBsaWNhdGlvbi5leHRlbmQoe1xuXHRpbml0aWFsaXplIDogZnVuY3Rpb24oKXtcblx0XHRcblx0fSxcblx0b25TdGFydCA6IGZ1bmN0aW9uKCl7XG5cdFx0QmFja2JvbmUuaGlzdG9yeS5zdGFydCh7XG5cdFx0XHRwdXNoU3RhdGUgOiBmYWxzZVxuXHRcdH0pO1xuXHRcdEFwcExheW91dC5yZW5kZXIoKTsgXG5cdFx0Y29uc29sZS5sb2coXCIhISEhISEhIWFzZGFzZHNhZGFzISEhIVwiKVxuXG5cdFx0dmFyIG15Q2FsZW5kYXIgPSBuZXcgQ2FsZW5kYXJWaWV3KCk7XG5cdFx0QXBwTGF5b3V0LmdldFJlZ2lvbihcIm1haW5cIikuc2hvdyggbXlDYWxlbmRhciApO1xuXHR9IFxufSk7XG5cblxuXG4kKGZ1bmN0aW9uKCl7XG5cdHdpbmRvdy5hcHAgPSBuZXcgTXlBcHAoKTtcblx0d2luZG93LmFwcC5zdGFydCgpOyBcbn0pO1xuXG5cblxuXG5cblxuXG4gICAgICAgICAiLCJ2YXIgTXlBcHBDb250cm9sbGVyID0gTWFyaW9uZXR0ZS5Db250cm9sbGVyLmV4dGVuZCh7XG5cdGxvYWRQYWdlIDogZnVuY3Rpb24oIHBhZ2VOYW1lICl7XG5cdFx0Y29uc29sZS5sb2coXCJQQUdFIE5BYXNkYXNkYXNkYXNkTUU6OlwiLCBwYWdlTmFtZSApOyAgICAgICAgIFxuXHRcdHRoaXMudHJpZ2dlcihcInBhZ2VMb2FkZWRcIiwgcGFnZU5hbWUpO1xuXHR9XG59KTtcblxuTXlBcHBDb250cm9sbGVyLmV2ZW50cyA9IFwidGVzdFwiO1xuXG5tb2R1bGUuZXhwb3J0cyA9ICBuZXcgTXlBcHBDb250cm9sbGVyKCk7XG4iLCJ2YXIgQXBwQ29udHJvbGxlciA9IHJlcXVpcmUoXCJjb250cm9sbGVycy9hcHBDb250cm9sbGVyXCIpO1xuXG52YXIgTXlBcHBSb3V0ZXIgPSBNYXJpb25ldHRlLkFwcFJvdXRlci5leHRlbmQoe1xuXHRjb250cm9sbGVyIDogQXBwQ29udHJvbGxlcixcblx0YXBwUm91dGVzIDoge1xuXHRcdFwiOnBhZ2VcIiA6IFwibG9hZFBhZ2VcIlxuXHR9XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBuZXcgTXlBcHBSb3V0ZXIoKTtcbiIsInZhciBwaXBlID0gcmVxdWlyZShcInBpcGVcIik7XG5cbi8vbGlzdGVuaW5nIGZvciBsb2FkXG53aW5kb3cuaGFuZGxlQ2xpZW50TG9hZCA9IGZ1bmN0aW9uKCl7XG5cbiAgY29uc29sZS5sb2coXCJnb29nbGUgYXBpIGxvYWRlZFwiKTtcbiAgaW5pdCgpO1xufVxuXG52YXIgY2xpZW50SWQgPSAnNDMzODM5NzIzMzY1LXU3Z3JsZHR2ZjhwYWJqa2o0ZnJjaW8zY3Y1aGl0OGZtLmFwcHMuZ29vZ2xldXNlcmNvbnRlbnQuY29tJztcbnZhciBhcGlLZXkgPSAnQUl6YVN5QnNLZFRwbFJYdUV3Z3ZQU0hfZ0dGOE9Hc3czNXQxNXYwJztcbnZhciBzY29wZXMgPSAnaHR0cHM6Ly93d3cuZ29vZ2xlYXBpcy5jb20vYXV0aC9jYWxlbmRhcic7XG52YXIgY2FsSWQgPSBcImItcmVlbC5jb21fMmQzNDM0MzIzODM5MzYzNzMwMmQzNjM0MzNAcmVzb3VyY2UuY2FsZW5kYXIuZ29vZ2xlLmNvbVwiO1xuXG4vL1RPRE8gOiBpbnRlZ3JhdGUgYWxsIDQgY2FsZW5kYXJzXG5cbmZ1bmN0aW9uIGluaXQoKXtcblx0Z2FwaS5jbGllbnQuc2V0QXBpS2V5KGFwaUtleSk7XG5cdGNoZWNrQXV0aCgpO1xufVxuXG5mdW5jdGlvbiBjaGVja0F1dGgoKXtcblx0Z2FwaS5hdXRoLmF1dGhvcml6ZSgge1xuXHRcdGNsaWVudF9pZDogY2xpZW50SWQsIFxuXHRcdHNjb3BlOiBzY29wZXMsIFxuXHRcdGltbWVkaWF0ZTogZmFsc2Vcblx0fSwgaGFuZGxlQXV0aFJlc3VsdCApO1xufVxuXG5mdW5jdGlvbiBoYW5kbGVBdXRoUmVzdWx0KCBhdXRoUmVzdWx0ICl7XG5cblx0aWYoYXV0aFJlc3VsdCl7XG5cdFx0bWFrZUFwaUNhbGwoKTtcblx0fVxufVxuXG5mdW5jdGlvbiBtYWtlQXBpQ2FsbCgpIHtcbiAgZ2FwaS5jbGllbnQubG9hZCgnY2FsZW5kYXInLCAndjMnLCBmdW5jdGlvbigpIHtcblxuICAgIHZhciBmcm9tID0gbmV3IERhdGUoKS50b0lTT1N0cmluZygpO1xuXG4gICAgdmFyIHJlcXVlc3QgPSBnYXBpLmNsaWVudC5jYWxlbmRhci5ldmVudHMubGlzdCh7XG4gICAgICAnY2FsZW5kYXJJZCc6IGNhbElkLFxuICAgICAgdGltZU1pbiA6IGZyb21cbiAgICAgfSk7XG5cbiAgIHJlcXVlc3QudGhlbihmdW5jdGlvbihyZXNwb25zZSkge1xuXG4gICAgICBldmVudHMudHJpZ2dlciggXCJldmVudHNMb2FkZWRcIiwgcmVzcG9uc2UucmVzdWx0ICk7XG4gICAgfSwgZnVuY3Rpb24ocmVhc29uKSB7XG5cbiAgICAgIGNvbnNvbGUubG9nKCdFcnJvcjogJyArIHJlYXNvbi5yZXN1bHQuZXJyb3IubWVzc2FnZSk7XG4gICAgfSk7XG4gICAgICAgICAgXG4gIH0pO1xufVxuXG52YXIgZXZlbnRzID0gXy5leHRlbmQoe1xuXG59LCBCYWNrYm9uZS5FdmVudHMpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblxuICBldmVudHMgOiBldmVudHNcbn07XG4iLCJ2YXIgbXlTb2NrZXQgPSBudWxsO1xudmFyIGNvbm5lY3RlZCA9IGZhbHNlO1xuXG5mdW5jdGlvbiBpbml0KCl7XG5cblx0bXlTb2NrZXQgPSBpby5jb25uZWN0KCcvL2xvY2FsaG9zdDozMDAwJyk7XG5cdG15U29ja2V0Lm9uKCdjb25uZWN0JywgZnVuY3Rpb24oKXtcblx0XHRjb25uZWN0ZWQgPSB0cnVlO1xuXHR9KTtcdFxufVxuXG5mdW5jdGlvbiB1cGRhdGUoIGRhdGEgKXtcblxuXHRpZihjb25uZWN0ZWQpe1xuXHRcdG15U29ja2V0LmVtaXQoICd1cGRhdGVfZGF0YScsIGRhdGEgKTtcdFxuXHR9XG59XG5cbi8vIHZhciB0aHJvdHRsZWRVcGRhdGUgPSBfLnRocm90dGxlKCB1cGRhdGUsIDUwMCwge2xlYWRpbmc6IGZhbHNlfSApO1xuXG5pbml0KCk7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXHRpbml0IDogaW5pdCxcblx0dXBkYXRlIDogdXBkYXRlLFxuXHRjb25uZWN0ZWQgOiBjb25uZWN0ZWRcbn0iLCJ2YXIgaHVlQ29ubmVjdCA9IHJlcXVpcmUoXCJjb250cm9sbGVycy9odWVDb25uZWN0XCIpO1xuXG5mdW5jdGlvbiBMaWdodFBhdHRlcm4oIGxpZ2h0SWQsIHBhdHRlcm5JZCApe1xuXG5cdHRoaXMuX2hzbCA9IHtcblx0XHRoIDogMCxcblx0XHRzIDogMCxcblx0XHRsIDogMFxuXHR9XG5cblx0dGhpcy5fbGlnaHRJZCA9IGxpZ2h0SWQ7XG5cdHRoaXMuX3BhdHRlcm5JZCA9IHBhdHRlcm5JZDtcblx0dGhpcy5fc3RlcCA9IDA7XG5cblx0dGhpcy5uZXdTZXF1ZW5jZSggdGhpcy5fcGF0dGVybklkICk7XG59XG5cbkxpZ2h0UGF0dGVybi5wcm90b3R5cGUgPSB7XG5cdG5ld1NlcXVlbmNlIDogZnVuY3Rpb24oIGlkICl7XG5cblx0XHR2YXIgcGF0dGVybiA9IHBhdHRlcm5zWyBpZCBdO1xuXHRcdHZhciBzZXF1ZW5jZSA9IHBhdHRlcm4uc2VxdWVuY2U7XG5cblx0XHR0aGlzLl90d2VlbmVyID0gbmV3IFRpbWVsaW5lTWF4KHtcblx0XHRcdHJlcGVhdCA6IHBhdHRlcm4ucmVwZWF0LFxuXHRcdFx0b25Db21wbGV0ZSA6IGZ1bmN0aW9uKCl7XG5cdFx0XHRcdGNvbnNvbGUubG9nKFwiY29tcGxldGUhXCIpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXG5cdFx0Xy5lYWNoKCBzZXF1ZW5jZSwgZnVuY3Rpb24oIHN0ZXAgKXtcblxuXHRcdFx0dGhpcy5xdWV1ZUNvbG9yKCBzdGVwICk7XG5cdFx0fSwgdGhpcyApO1xuXHR9LFxuXHRxdWV1ZUNvbG9yIDogZnVuY3Rpb24oIHN0ZXAgKXtcblxuXHRcdHZhciBjb2xvciA9IG9uZS5jb2xvciggc3RlcC5jb2xvciApO1xuXHRcdHZhciBmYWRlID0gc3RlcC5mYWRlO1xuXHRcdHZhciB3YWl0ID0gc3RlcC53YWl0O1xuXG5cdFx0dmFyIGhzbCA9IHtcblx0XHRcdGggOiBNYXRoLmZsb29yKCBjb2xvci5oKCkgKiAzNjApLCBcblx0XHRcdHMgOiBNYXRoLmZsb29yKCBjb2xvci5zKCkgKiAxMDApLFxuXHRcdFx0bCA6IE1hdGguZmxvb3IoIGNvbG9yLmwoKSAqIDEwMCkgXG5cdFx0fTtcblxuXHRcdHZhciBvcHRpb25zID0ge1xuXHRcdFx0b25TdGFydCA6IGZ1bmN0aW9uKCl7XG5cdFx0XHRcdC8vdXBkYXRpbmcgTEVEc1xuXHRcdFx0XHRodWVDb25uZWN0LnVwZGF0ZShbe1xuXHRcdFx0XHRcdGlkIDogdGhpcy5fbGlnaHRJZCxcblx0XHRcdFx0XHRkYXRhIDoge1xuXHRcdFx0XHRcdFx0aHNsIDogaHNsLFxuXHRcdFx0XHRcdFx0ZHVyYXRpb24gOiBmYWRlXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XSk7XHRcdFx0XHRcblx0XHRcdH0sXG5cdFx0XHRvblN0YXJ0U2NvcGUgOiB0aGlzXG5cdFx0fVxuXG5cdFx0Ly91cGRhdGluZyBmcm9udGVuZFxuXHRcdHRoaXMuX3R3ZWVuZXIudG8oIHRoaXMuX2hzbCwgZmFkZSwgXy5leHRlbmQoIG9wdGlvbnMsIGhzbCApICk7XG5cdFx0dGhpcy5fdHdlZW5lci50byggdGhpcy5faHNsLCB3YWl0LCB7fSApO1xuXHR9XG59XG5cbnZhciBwYXR0ZXJucyA9IHtcblx0J3Rlc3QnIDoge1xuXHRcdHJlcGVhdCA6ICAtMSxcblx0XHRzZXF1ZW5jZSA6IFtcblx0XHRcdHsgY29sb3IgOiBcIiNmZjAwZmZcIiwgZmFkZSA6IDEsIHdhaXQgOiAxIH0sXG5cdFx0XHR7IGNvbG9yIDogXCIjMDBmZjAwXCIsIGZhZGUgOiAxLCB3YWl0IDogMSB9LFxuXHRcdFx0eyBjb2xvciA6IFwiIzQxNTZGRlwiLCBmYWRlIDogMSwgd2FpdCA6IDEgfSxcblx0XHRcdHsgY29sb3IgOiBcIiNGRjAwMURcIiwgZmFkZSA6IDEsIHdhaXQgOiAxIH0sXG5cdFx0XHR7IGNvbG9yIDogXCIjRkZGRjA3XCIsIGZhZGUgOiAxLCB3YWl0IDogMSB9LFxuXHRcdF1cblx0fVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IExpZ2h0UGF0dGVybjsiLCJ2YXIgSGVscGVycyA9IHt9O1xuXG4vL2RpbWVuc2lvbnMgY2FsY3VsYXRpb25zXG5IZWxwZXJzLmRpbSA9IHtcblx0YmFja3N0cmV0Y2ggOiBmdW5jdGlvbihyb290V2lkdGgsIHJvb3RIZWlnaHQsIHJhdGlvKXtcblxuXHRcdHZhciByZXR1cm5EaW0gPSB7bGVmdDogMCwgdG9wOiAwfTtcblxuICAgIFx0dmFyIGJnV2lkdGggPSByb290V2lkdGhcbiAgICBcdHZhciBiZ0hlaWdodCA9IGJnV2lkdGggLyByYXRpbztcbiAgICBcdHZhciBiZ09mZnNldDtcbiAgICAgICBcblx0XHRpZiAoYmdIZWlnaHQgPj0gcm9vdEhlaWdodCkge1xuICAgICAgICAgICAgYmdPZmZzZXQgPSAoYmdIZWlnaHQgLSByb290SGVpZ2h0KSAvIDI7XG4gICAgICAgICAgICByZXR1cm5EaW0udG9wID0gYmdPZmZzZXQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBiZ0hlaWdodCA9IHJvb3RIZWlnaHQ7XG4gICAgICAgICAgICBiZ1dpZHRoID0gYmdIZWlnaHQgKiByYXRpbztcbiAgICAgICAgICAgIGJnT2Zmc2V0ID0gKGJnV2lkdGggLSByb290V2lkdGgpIC8gMjtcbiAgICAgICAgICAgIHJldHVybkRpbS5sZWZ0ID0gYmdPZmZzZXQ7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm5EaW0ud2lkdGggPSBiZ1dpZHRoO1xuICAgICAgICByZXR1cm5EaW0uaGVpZ2h0ID0gYmdIZWlnaHQ7XG5cbiAgICAgICAgcmV0dXJuIHJldHVybkRpbTtcblx0fVxufVxuXG5IZWxwZXJzLmxvYWQgPSB7XG5cdGxvYWRGaWxlcyA6IGZ1bmN0aW9uKGZpbGVzLCBjYWxsYmFjaywgcHJlZml4ICl7XG5cdFx0Ly9jaGVjayBpZiBmaWxlIGlzIGluIGFycmF5LCBpZiBub3Qgd3JhcFxuXHRcdGZpbGVzID0gSGVscGVycy50ZXN0LmlzU3RyaW5nKGZpbGVzKSA/IFtmaWxlc10gOiBmaWxlcztcblx0XHRcblx0XHQvL2NyZWF0ZSBlbXB0eSBvYmplY3QgdG8gaG9sZCBjb3B5XG5cdFx0dmFyIGNvcHkgPSBIZWxwZXJzLnRlc3QuaXNBcnJheShmaWxlcykgPyBbXSA6IHt9O1xuXG5cdFx0cHJlZml4ID0gcHJlZml4IHx8IFwiXCI7XG5cdFx0dmFyIHF1ZXVlID0gbmV3IGNyZWF0ZWpzLkxvYWRRdWV1ZSgpO1xuXHRcdHF1ZXVlLmFkZEV2ZW50TGlzdGVuZXIoXCJmaWxlbG9hZFwiLCBmdW5jdGlvbihldmVudCl7XG5cdFx0XHRpZihjYWxsYmFjaykgY2FsbGJhY2soZXZlbnQpO1xuXHRcdH0pO1xuXHRcdF8uZWFjaChmaWxlcyxmdW5jdGlvbihmaWxlLGtleSl7XG5cdFx0XHRxdWV1ZS5sb2FkRmlsZSggcHJlZml4ICsgZmlsZSApO1xuXHRcdFx0Y29weVtrZXldID0gcHJlZml4ICsgZmlsZTtcblx0XHR9KTtcblx0XHRxdWV1ZS5sb2FkKCk7XG5cdFx0cmV0dXJuIGNvcHk7XG5cdH1cbn1cblxuSGVscGVycy50ZXN0ID0ge1xuXHRpc0FycmF5IDogZnVuY3Rpb24oIG9iaiApe1xuXHRcdHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoIG9iaiApID09PSAnW29iamVjdCBBcnJheV0nO1xuXHR9LFxuXHRpc1N0cmluZyA6IGZ1bmN0aW9uKCBvYmogKXtcblx0XHRyZXR1cm4gdHlwZW9mIG9iaiA9PT0gJ3N0cmluZyc7XG5cdH1cbn1cblxuSGVscGVycy5jb2xvciA9IHtcblx0cmFuZG9tSGV4IDogZnVuY3Rpb24oKXtcblxuXHRcdHJldHVybiBcIiNcIiArIChNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDE2KSArICcwMDAwMDAnKS5zbGljZSgyLCA4KTtcblx0fSxcblx0Y2hhbmdlQ29sb3IgOiBmdW5jdGlvbihjb2xvciwgcmF0aW8sIGRhcmtlcikge1xuICAgICAgICAvLyBDYWxjdWxhdGUgcmF0aW9cbiAgICAgICAgdmFyIGRpZmZlcmVuY2UgPSBNYXRoLnJvdW5kKHJhdGlvICogMjU2KSAqIChkYXJrZXIgPyAtMSA6IDEpLFxuICAgICAgICAgICAgLy8gQ29udmVydCBoZXggdG8gZGVjaW1hbFxuICAgICAgICAgICAgZGVjaW1hbCA9ICBjb2xvci5yZXBsYWNlKFxuICAgICAgICAgICAgICAgIC9eIz8oW2EtZjAtOV1bYS1mMC05XSkoW2EtZjAtOV1bYS1mMC05XSkoW2EtZjAtOV1bYS1mMC05XSkvaSxcbiAgICAgICAgICAgICAgICBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHBhcnNlSW50KGFyZ3VtZW50c1sxXSwgMTYpICsgJywnICtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcnNlSW50KGFyZ3VtZW50c1syXSwgMTYpICsgJywnICtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcnNlSW50KGFyZ3VtZW50c1szXSwgMTYpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICkuc3BsaXQoLywvKSxcbiAgICAgICAgICAgIHJldHVyblZhbHVlO1xuICAgICAgICByZXR1cm5bXG4gICAgICAgICAgICAgICAgJyMnLFxuICAgICAgICAgICAgICAgIEhlbHBlcnMucGFkKE1hdGhbZGFya2VyID8gJ21heCcgOiAnbWluJ10oXG4gICAgICAgICAgICAgICAgICAgIHBhcnNlSW50KGRlY2ltYWxbMF0sIDEwKSArIGRpZmZlcmVuY2UsIGRhcmtlciA/IDAgOiAyNTVcbiAgICAgICAgICAgICAgICApLnRvU3RyaW5nKDE2KSwgMiksXG4gICAgICAgICAgICAgICAgSGVscGVycy5wYWQoTWF0aFtkYXJrZXIgPyAnbWF4JyA6ICdtaW4nXShcbiAgICAgICAgICAgICAgICAgICAgcGFyc2VJbnQoZGVjaW1hbFsxXSwgMTApICsgZGlmZmVyZW5jZSwgZGFya2VyID8gMCA6IDI1NVxuICAgICAgICAgICAgICAgICkudG9TdHJpbmcoMTYpLCAyKSxcbiAgICAgICAgICAgICAgICBIZWxwZXJzLnBhZChNYXRoW2RhcmtlciA/ICdtYXgnIDogJ21pbiddKFxuICAgICAgICAgICAgICAgICAgICBwYXJzZUludChkZWNpbWFsWzJdLCAxMCkgKyBkaWZmZXJlbmNlLCBkYXJrZXIgPyAwIDogMjU1XG4gICAgICAgICAgICAgICAgKS50b1N0cmluZygxNiksIDIpXG4gICAgICAgICAgICBdLmpvaW4oJycpO1xuICAgIH0sXG4gICAgZ2V0THVtYSA6IGZ1bmN0aW9uKGhleGNvbG9yKXtcblxuICAgIFx0aGV4Y29sb3IgPSBoZXhjb2xvci5yZXBsYWNlKFwiI1wiLFwiXCIpO1xuICAgICAgICB2YXIgciA9IHBhcnNlSW50KGhleGNvbG9yLnN1YnN0cigwLDIpLDE2KTtcblx0ICAgIHZhciBnID0gcGFyc2VJbnQoaGV4Y29sb3Iuc3Vic3RyKDIsMiksMTYpO1xuXHQgICAgdmFyIGIgPSBwYXJzZUludChoZXhjb2xvci5zdWJzdHIoNCwyKSwxNik7XG5cdCAgICB2YXIgeWlxID0gKChyKjI5OSkrKGcqNTg3KSsoYioxMTQpKS8xMDAwO1xuICAgICAgICByZXR1cm4geWlxO1xuICAgIH0sXG4gICAgcmdiVG9IZXggOiBmdW5jdGlvbiggciwgZywgYiwgbm9IYXNoICl7XG5cbiAgICBcdHJldHVybiAobm9IYXNoID8gXCJcIiA6IFwiI1wiKSArICgoMSA8PCAyNCkgKyAociA8PCAxNikgKyAoZyA8PCA4KSArIGIpLnRvU3RyaW5nKDE2KS5zbGljZSgxKTtcbiAgICB9LCBcbiAgICBoZXhUb1JnYiA6IGZ1bmN0aW9uKCBoZXggKXtcblxuICAgIFx0dmFyIHJlc3VsdCA9IC9eIz8oW2EtZlxcZF17Mn0pKFthLWZcXGRdezJ9KShbYS1mXFxkXXsyfSkkL2kuZXhlYyhoZXgpO1xuXHQgICAgcmV0dXJuIHJlc3VsdCA/IHtcblx0ICAgICAgICByOiBwYXJzZUludChyZXN1bHRbMV0sIDE2KSxcblx0ICAgICAgICBnOiBwYXJzZUludChyZXN1bHRbMl0sIDE2KSxcblx0ICAgICAgICBiOiBwYXJzZUludChyZXN1bHRbM10sIDE2KVxuXHQgICAgfSA6IG51bGw7XG4gICAgfVxufVxuXG5IZWxwZXJzLmNhbnZhcyA9IHtcblx0Z2VuZXJhdGVDYW52YXMgOiAoZnVuY3Rpb24oKXtcblx0XHRmdW5jdGlvbiBnZW5lcmF0ZUNhbnZhcygpe1xuXHRcdFx0dGhpcy5jYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKTtcblx0XHRcdHRoaXMuY3R4ID0gdGhpcy5jYW52YXMuZ2V0Q29udGV4dChcIjJkXCIpO1xuXHRcdFx0JCh0aGlzLmNhbnZhcykuZGF0YShcImhlbHBlcnNcIiwgdGhpcyk7XG5cdFx0fVxuXHRcdGdlbmVyYXRlQ2FudmFzLnByb3RvdHlwZS5kcmF3SW1hZ2UgPSBmdW5jdGlvbihpbWcpe1xuXHRcdFx0dmFyIHcgPSBpbWcud2lkdGg7XG5cdFx0XHR2YXIgaCA9IGltZy5oZWlnaHQ7XG5cdFx0XHR0aGlzLnJlc2l6ZSh3LGgpO1xuXHRcdFx0dGhpcy5jdHguZHJhd0ltYWdlKCBpbWcsIDAsIDAgKTtcblx0XHR9XG5cdFx0Z2VuZXJhdGVDYW52YXMucHJvdG90eXBlLnJlc2l6ZSA9IGZ1bmN0aW9uKHcsaCl7XG5cdFx0XHR2YXIgcGl4ZWxSYXRpbyA9IDE7XG5cdFx0XHR2YXIgY2FudmFzID0gdGhpcy5jYW52YXM7XG5cdFx0XHRjYW52YXMud2lkdGggPSB3O1xuXHRcdFx0Y2FudmFzLmhlaWdodCA9IGg7XG5cdFx0ICAgIGNhbnZhcy5zdHlsZS53aWR0aCA9IHcqcGl4ZWxSYXRpbyArIFwicHhcIjtcblx0XHQgICAgY2FudmFzLnN0eWxlLmhlaWdodCA9IGgqcGl4ZWxSYXRpbyArIFwicHhcIjtcblx0XHR9XG5cdFx0cmV0dXJuIGdlbmVyYXRlQ2FudmFzO1xuXHR9KSgpXG59XG5cbi8vbWlzY1xuSGVscGVycy5iZ0ltYWdlc0Zyb21EYXRhID0gZnVuY3Rpb24oICRlbCApe1xuXHQkZWwuZmluZCgnW2RhdGEtaW1hZ2Utc3JjXScpLmVhY2goIGZ1bmN0aW9uKCl7XG5cdFx0dmFyIHNyYyA9ICQodGhpcykuZGF0YSgnaW1hZ2Utc3JjJyk7XG5cdFx0JCh0aGlzKS5jc3Moe1xuXHRcdFx0J2JhY2tncm91bmQtaW1hZ2UnIDogXCJ1cmwoJ1wiICsgc3JjICsgXCInKVwiXG5cdFx0fSk7XG5cdH0pO1xufVxuXG5IZWxwZXJzLnBhZCA9IGZ1bmN0aW9uKG51bSwgdG90YWxDaGFycykge1xuICAgIHZhciBwYWQgPSAnMCc7XG4gICAgbnVtID0gbnVtICsgJyc7XG4gICAgd2hpbGUgKG51bS5sZW5ndGggPCB0b3RhbENoYXJzKSB7XG4gICAgICAgIG51bSA9IHBhZCArIG51bTtcbiAgICB9XG4gICAgcmV0dXJuIG51bTtcbn1cblxuSGVscGVycy5qUVVpID0gZnVuY3Rpb24oIHZpZXcgKXtcblx0cmV0dXJuIHRoaXMualFFbHMoIHZpZXcudWksIHZpZXcuJGVsICk7XG59XG5cbkhlbHBlcnMualFFbHMgPSBmdW5jdGlvbihlbHMsICRwYXJlbnQsIHNpbmdsZUtleSl7XG5cdCRwYXJlbnQgPSAkcGFyZW50IHx8ICQoXCJib2R5XCIpO1xuXHRpZighc2luZ2xlS2V5KXtcblx0XHR2YXIgJGVscyA9IHt9O1xuXHRcdF8uZWFjaCggZWxzLCBmdW5jdGlvbih2YWx1ZSwga2V5KXtcbiAgICBcdFx0JGVsc1trZXldID0gJHBhcmVudC5maW5kKHZhbHVlKTtcbiAgICBcdH0pO1xuICAgIFx0JGVscy5ib2R5ID0gJChcImJvZHlcIik7XG4gICAgXHQkZWxzLmh0bWwgPSAkKFwiaHRtbFwiKTtcblx0fSBlbHNlIHtcblx0XHQkZWxzW3NpbmdsZUtleV0gPSAkcGFyZW50LmZpbmQoIGVsc1tzaW5nbGVLZXldICk7XG5cdH1cblx0cmV0dXJuICRlbHM7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gSGVscGVycztcbiIsInZhciBDYWxlbmRhck1vZGVsID0gQmFja2JvbmUuTW9kZWwuZXh0ZW5kKHtcblx0ZGVmYXVsdHMgOiB7XG5cdFx0c3VtbWFyeSA6IFwibi9hXCIsXG5cdFx0ZGVzY3JpcHRpb24gOiBcIm4vYVwiLFxuXHRcdHN0YXJ0IDogXCJuL2FcIixcblx0XHRlbmQgOiBcIm4vYVwiLFxuXHR9XG59KVxuXG5tb2R1bGUuZXhwb3J0cyA9IENhbGVuZGFyTW9kZWw7IiwidmFyIHN0YXRlID0gbmV3IChCYWNrYm9uZS5Nb2RlbC5leHRlbmQoe1xuXHRkZWZhdWx0cyA6IHtcblx0XHQvLyBcIm5hdl9vcGVuXCIgXHRcdDogZmFsc2UsXG5cdFx0Ly8gJ3Njcm9sbF9hdF90b3AnIDogdHJ1ZSxcblx0XHQvLyAnbWluaW1hbF9uYXYnIFx0OiBmYWxzZSxcblx0XHQvLyAnZnVsbF9uYXZfb3BlbidcdDogZmFsc2UsXG5cdFx0Ly8gJ3VpX2Rpc3BsYXknXHQ6IGZhbHNlXG5cdH1cbn0pKSgpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHN0YXRlO1xuIiwidmFyIHBpcGUgPSBfLmV4dGVuZCh7XG5cblx0XG5cdFxufSwgQmFja2JvbmUuRXZlbnRzKTtcblxubW9kdWxlLmV4cG9ydHMgPSBwaXBlOyIsIm1vZHVsZS5leHBvcnRzID0gXCI8YnV0dG9uIGlkPVxcXCJ0ZXN0XFxcIj50ZXN0PC9idXR0b24+XFxuPGlucHV0IGNsYXNzPVxcXCJjb2xvclxcXCIgdHlwZT1cXFwiY29sb3JcXFwiIG5hbWU9XFxcImZhdmNvbG9yXFxcIj5cXG48ZGl2IGNsYXNzPVxcXCJtYWluLWxpc3RcXFwiPjwvZGl2PlxcblxcbiBcIjtcbiIsIm1vZHVsZS5leHBvcnRzID0gXCI8JSBpZiggc3VtbWFyeSApeyAlPlxcblxcdDxoMj5zdW1tYXJ5IDogPCU9IHN1bW1hcnkgJT48L2gyPlxcbjwlIH0gJT5cXG5cXG48JSBpZiggZGVzY3JpcHRpb24gKXsgJT5cXG5cXHQ8aDM+ZGVzY3JpcHRpb24gOiA8JT0gZGVzY3JpcHRpb24gJT48L2gzPlxcbjwlIH0gJT5cXG5cXG48JSBpZiggc3RhcnQgKXsgJT5cXG5cXHQ8aDM+c3RhcnQgOiA8JT0gc3RhcnQuZGF0ZVRpbWUgJT48L2gzPlxcbjwlIH0gJT5cXG5cXG48JSBpZiggZW5kICl7ICU+XFxuXFx0PGgzPmVuZCA6IDwlPSBlbmQuZGF0ZVRpbWUgJT48L2gzPlxcbjwlIH0gJT5cIjtcbiIsInZhciBTdGF0ZSBcdFx0PSByZXF1aXJlKFwibW9kZWxzL3N0YXRlXCIpO1xuXG52YXIgTXlBcHBMYXlvdXQgPSBNYXJpb25ldHRlLkxheW91dFZpZXcuZXh0ZW5kKHtcblx0ZWwgOiBcIiNjb250ZW50XCIsXG5cdHRlbXBsYXRlIDogZmFsc2UsXG5cdHJlZ2lvbnMgOiB7XG5cdFx0bWFpbiA6IFwiI21haW5cIlxuXHR9LCBcblx0aW5pdGlhbGl6ZSA6IGZ1bmN0aW9uKCl7XG5cdFx0dmFyIF90aGlzID0gdGhpcztcblxuXHRcdC8vd3JhcHBpbmcgaHRtbFxuXHRcdHRoaXMuJGh0bWwgPSAkKFwiaHRtbFwiKTtcblx0XHR0aGlzLiRodG1sLnJlbW92ZUNsYXNzKFwiaGlkZGVuXCIpO1xuXG5cdFx0Ly9yZXNpemUgZXZlbnRzXG5cdFx0JCh3aW5kb3cpLnJlc2l6ZShmdW5jdGlvbigpe1xuXHRcdFx0X3RoaXMub25SZXNpemVXaW5kb3coKTtcblx0XHR9KS5yZXNpemUoKTtcblxuXHRcdHRoaXMubGlzdGVuRm9yU3RhdGUoKTtcblx0fSxcblx0bGlzdGVuRm9yU3RhdGUgOiBmdW5jdGlvbigpe1xuXHRcdC8vc3RhdGUgY2hhbmdlXG5cdFx0dGhpcy5saXN0ZW5UbyggU3RhdGUsIFwiY2hhbmdlXCIsIGZ1bmN0aW9uKCBlICl7XG5cblx0XHRcdHRoaXMub25TdGF0ZUNoYW5nZSggZS5jaGFuZ2VkLCBlLl9wcmV2aW91c0F0dHJpYnV0ZXMgKTtcblx0XHR9LCB0aGlzKTtcblx0XHR0aGlzLm9uU3RhdGVDaGFuZ2UoIFN0YXRlLnRvSlNPTigpICk7XG5cdH0sXG5cdG9uU3RhdGVDaGFuZ2UgOiBmdW5jdGlvbiggY2hhbmdlZCwgcHJldmlvdXMgKXtcblxuXHRcdF8uZWFjaCggY2hhbmdlZCwgZnVuY3Rpb24odmFsdWUsIGtleSl7XG5cdFx0XHRcblx0XHRcdGlmKCBfLmlzQm9vbGVhbiggdmFsdWUgKSApe1xuXHRcdFx0XHR0aGlzLiRodG1sLnRvZ2dsZUNsYXNzKFwic3RhdGUtXCIra2V5LCB2YWx1ZSk7XG5cdFx0XHRcdHRoaXMuJGh0bWwudG9nZ2xlQ2xhc3MoXCJzdGF0ZS1ub3QtXCIra2V5LCAhdmFsdWUpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0dmFyIHByZXZWYWx1ZSA9IHByZXZpb3VzWyBrZXkgXTtcblx0XHRcdFx0aWYocHJldlZhbHVlKXtcblx0XHRcdFx0XHR0aGlzLiRodG1sLnRvZ2dsZUNsYXNzKFwic3RhdGUtXCIra2V5K1wiLVwiK3ByZXZWYWx1ZSwgZmFsc2UpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHRoaXMuJGh0bWwudG9nZ2xlQ2xhc3MoXCJzdGF0ZS1cIitrZXkrXCItXCIrdmFsdWUsIHRydWUpO1xuXHRcdFx0fVxuXG5cdFx0fSwgdGhpcyApO1xuXHR9LFxuXHRvblJlc2l6ZVdpbmRvdyA6IGZ1bmN0aW9uKCl7XG5cdFx0Q29tbW9uLnd3ID0gJCh3aW5kb3cpLndpZHRoKCk7XG5cdFx0Q29tbW9uLndoID0gJCh3aW5kb3cpLmhlaWdodCgpO1xuXHR9XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBuZXcgTXlBcHBMYXlvdXQoKTsiLCJ2YXIgY2FsZW5kYXJMb2FkID0gcmVxdWlyZShcImNvbnRyb2xsZXJzL2NhbGVuZGFyTG9hZFwiKTtcbnZhciBDYWxlbmRhckl0ZW1zIFx0PSByZXF1aXJlKFwidmlld3MvY2FsZW5kYXJJdGVtc1wiKTtcbnZhciBDYWxlbmRhck1vZGVsIFx0PSByZXF1aXJlKFwibW9kZWxzL2NhbGVuZGFyTW9kZWxcIik7XG52YXIgaGVscGVycyA9IHJlcXVpcmUoXCJoZWxwZXJzXCIpOyBcbnZhciBodWVDb25uZWN0ID0gcmVxdWlyZShcImNvbnRyb2xsZXJzL2h1ZUNvbm5lY3RcIik7XG52YXIgTGlnaHRQYXR0ZXJuID0gcmVxdWlyZShcImNvbnRyb2xsZXJzL2xpZ2h0UGF0dGVyblwiKTtcblxuXG5cbnZhciBDYWxlbmRhclZpZXcgPSBNYXJpb25ldHRlLkxheW91dFZpZXcuZXh0ZW5kKHtcblx0dGVtcGxhdGUgOiBfLnRlbXBsYXRlKCByZXF1aXJlKFwidGVtcGxhdGVzL2NhbGVuZGFyLmh0bWxcIikgKSxcblx0cmVnaW9ucyA6IHtcblx0XHRtYWluTGlzdCA6IFwiLm1haW4tbGlzdFwiXG5cdH0sXG5cdHVpIDoge1xuXHRcdGNvbG9yUGlja2VyIDogXCIuY29sb3JcIixcblx0XHR0ZXN0IDogXCIjdGVzdFwiXG5cdH0sXG5cdGV2ZW50cyA6IHtcblx0XHRcImNsaWNrIEB1aS50ZXN0XCIgOiBmdW5jdGlvbigpe1xuXHRcdFx0Zm9yKCB2YXIgaSA9IDAgOyBpIDwgNSA7IGkrKyApe1xuXHRcdFx0XHRuZXcgTGlnaHRQYXR0ZXJuKGkrMSwgXCJ0ZXN0XCIpO1xuXHRcdFx0fVxuXHRcdH1cblx0fSxcblx0aW5pdGlhbGl6ZSA6IGZ1bmN0aW9uKCl7XG5cdFx0XG5cdFx0dGhpcy5saXN0ZW5UbyggY2FsZW5kYXJMb2FkLmV2ZW50cywgXCJldmVudHNMb2FkZWRcIiwgdGhpcy5ldmVudHNMb2FkZWQgKTtcblx0fSxcblx0b25TaG93IDogZnVuY3Rpb24oKXtcblxuXHRcdHZhciBjb2xvclBpY2tlciA9IHRoaXMudWkuY29sb3JQaWNrZXI7XG5cdFx0JChjb2xvclBpY2tlcikuY2hhbmdlKGZ1bmN0aW9uKCl7XG5cdFx0XHR2YXIgdmFsID0gJCh0aGlzKS52YWwoKTtcblx0XHRcdHZhciBjb2xvciA9IG9uZS5jb2xvcih2YWwpO1xuXG5cdFx0XHR2YXIgaHNsID0ge1xuXHRcdFx0XHRoIDogTWF0aC5mbG9vciggY29sb3IuaCgpICogMzYwKSwgXG5cdFx0XHRcdHMgOiBNYXRoLmZsb29yKCBjb2xvci5zKCkgKiAxMDApLFxuXHRcdFx0XHRsIDogTWF0aC5mbG9vciggY29sb3IubCgpICogMTAwKSBcblx0XHRcdH07XG5cblx0XHRcdGNvbnNvbGUubG9nKGhzbClcblxuXHRcdFx0aHVlQ29ubmVjdC51cGRhdGUoW1xuXHRcdFx0XHR7XG5cdFx0XHRcdFx0J2lkJyA6IDEsXG5cdFx0XHRcdFx0J2RhdGEnIDoge1xuXHRcdFx0XHRcdFx0J2hzbCcgOiBoc2xcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0sXG5cdFx0XHRcdHtcblx0XHRcdFx0XHQnaWQnIDogMixcblx0XHRcdFx0XHQnZGF0YScgOiB7XG5cdFx0XHRcdFx0XHQnaHNsJyA6IGhzbFxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSxcblx0XHRcdFx0e1xuXHRcdFx0XHRcdCdpZCcgOiAzLFxuXHRcdFx0XHRcdCdkYXRhJyA6IHtcblx0XHRcdFx0XHRcdCdoc2wnIDogaHNsXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9LFxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0J2lkJyA6IDQsXG5cdFx0XHRcdFx0J2RhdGEnIDoge1xuXHRcdFx0XHRcdFx0J2hzbCcgOiBoc2xcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0sXG5cdFx0XHRcdHtcblx0XHRcdFx0XHQnaWQnIDogNSxcblx0XHRcdFx0XHQnZGF0YScgOiB7XG5cdFx0XHRcdFx0XHQnaHNsJyA6IGhzbFxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XSk7XG5cdFx0fSk7XG5cblx0fSxcblx0ZXZlbnRzTG9hZGVkIDogZnVuY3Rpb24oIGRhdGEgKXtcblx0XHRcblx0XHR2YXIgbXlDYWxlbmRhckl0ZW1zID0gbmV3IENhbGVuZGFySXRlbXMoKTtcblxuXHRcdF8uZWFjaCggZGF0YS5pdGVtcywgZnVuY3Rpb24oIGl0ZW0gKXtcblxuXHRcdFx0dmFyIG0gPSBuZXcgQ2FsZW5kYXJNb2RlbCggaXRlbSApO1xuXHRcdFx0bXlDYWxlbmRhckl0ZW1zLmNvbGxlY3Rpb24uYWRkKCBtICk7XG5cdFx0fSk7XG5cblx0XHR0aGlzLmdldFJlZ2lvbihcIm1haW5MaXN0XCIpLnNob3coIG15Q2FsZW5kYXJJdGVtcyApO1xuXHR9ICAgICAgICAgIFxufSk7XG5cblxubW9kdWxlLmV4cG9ydHMgPSBDYWxlbmRhclZpZXc7ICAgICAgICAgICAgICAgICAgICBcbiAgICBcbiAiLCJ2YXIgQ2FsZW5kYXJJdGVtID0gTWFyaW9uZXR0ZS5JdGVtVmlldy5leHRlbmQoe1xuXHRjbGFzc05hbWUgOiBcIml0ZW1cIixcblx0dGVtcGxhdGUgOiBfLnRlbXBsYXRlKCByZXF1aXJlKFwidGVtcGxhdGVzL2NhbGVuZGFySXRlbS5odG1sXCIpICksXG5cdHVpIDoge1xuXHRcdCd0aXRsZScgOiBcImgyXCJcblx0fSxcblx0ZXZlbnRzIDoge1xuXHRcdCdjbGljayBAdWkudGl0bGUnIDogZnVuY3Rpb24oKXtcblxuXG5cdFx0fVxuXHR9XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBDYWxlbmRhckl0ZW07IiwidmFyIENhbGVuZGFySXRlbSBcdD0gcmVxdWlyZShcInZpZXdzL2NhbGVuZGFySXRlbVwiKTtcblxudmFyIENhbGVuZGFySXRlbXMgPSBNYXJpb25ldHRlLkNvbGxlY3Rpb25WaWV3LmV4dGVuZCh7XG5cblx0Y2hpbGRWaWV3IDogQ2FsZW5kYXJJdGVtLFxuXHRjb2xsZWN0aW9uIDogbmV3IEJhY2tib25lLkNvbGxlY3Rpb24oKVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gQ2FsZW5kYXJJdGVtczsiXX0=
