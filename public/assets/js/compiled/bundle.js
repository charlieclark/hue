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
var CalendarWrapper	= require("views/calendarWrapper");
var roomData = require("roomData");

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

		var myCalendar = new CalendarWrapper( { model : new Backbone.Model({ rooms : roomData }) });
		AppLayout.getRegion("main").show( myCalendar );
	} 
});



$(function(){
	window.app = new MyApp();
	window.app.start(); 
});







         
},{"controllers/appRouter":3,"roomData":10,"views/appLayout":14,"views/calendarWrapper":17}],2:[function(require,module,exports){
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
var roomData = require("roomData");


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
      
      pullRooms();          
  });
}

function pullRooms(){

  var from = new Date().toISOString();

  _.each( roomData, function( data, key ){

    var request = gapi.client.calendar.events.list({
        'calendarId': data.calendarId,
        timeMin : from
      });

     request.then(function(response) {

          roomLoaded( key, response.result );
      }, function(reason) {

          console.log('Error: ' + reason.result.error.message);
      });
  });
}

function roomLoaded( key, data ){

  console.log("ROOM LOADED", data);
  events.trigger( "eventsLoaded", { key : key, data : data } );
}

var events = _.extend({

}, Backbone.Events);

module.exports = {

  events : events
};

},{"pipe":9,"roomData":10}],5:[function(require,module,exports){
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
module.exports = {
	'1': {
		'calendarId' : "b-reel.com_2d3238373936363232373831@resource.calendar.google.com"
	},
	'2': {
		'calendarId' : "b-reel.com_2d31323737383833342d323432@resource.calendar.google.com"
	},
	'3': {
		'calendarId' : "b-reel.com_3136353339363139393338@resource.calendar.google.com"
	},
	'5': {
		'calendarId' : "b-reel.com_2d34343238393637302d363433@resource.calendar.google.com"
	}
};
},{}],11:[function(require,module,exports){
module.exports = "<% if( summary ){ %>\n\t<h2>summary : <%= summary %></h2>\n<% } %>\n\n<% if( description ){ %>\n\t<h3>description : <%= description %></h3>\n<% } %>\n\n<% if( start ){ %>\n\t<h3>start : <%= start.dateTime %></h3>\n<% } %>\n\n<% if( end ){ %>\n\t<h3>end : <%= end.dateTime %></h3>\n<% } %>";

},{}],12:[function(require,module,exports){
module.exports = "<div id=\"event-list\"></div> ";

},{}],13:[function(require,module,exports){
module.exports = "<div>\n\t<input id=\"hex-input\" type=\"text\"></input>\n\t<button id=\"hex\">hex</button>\n</div>\n<button id=\"test\">test</button>\n<input class=\"color\" type=\"color\" name=\"favcolor\">\n<div class=\"main-list\"></div>\n\n<div id=\"room-split\">\n\t<% _.each( rooms, function( data, key ){ %>\n\t\t<div id=\"room-<%= key %>\" class=\"room\" data-id=\"<%= key %>\">room <%= key %></div>\n\t<% }); %>\n</div>\n<div id=\"room-single\"></div>\n\n<div id=\"calendar-container\">\n\n</div>\n\n ";

},{}],14:[function(require,module,exports){
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
},{"models/state":8}],15:[function(require,module,exports){
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
},{"templates/calendarItem.html":11}],16:[function(require,module,exports){
var CalendarItem 	= require("views/calendarItem");
var CalendarModel 	= require("models/calendarModel");

var CalendarSingle = Marionette.LayoutView.extend({
	template : _.template( require("templates/calendarSingle.html") ),
	regions : {
		eventList : "#event-list"
	},
	initialize : function(){

		this.collectionView = new Marionette.CollectionView({
			childView : CalendarItem,
			collection : new Backbone.Collection()
		});

		this.listenTo( this.model, "change:roomData", this.updateEvents );
	},
	onShow : function(){

		this.getRegion( "eventList" ).show( this.collectionView );
		this.updateEvents();
	},
	updateEvents : function(){

		var roomData = this.model.get("roomData")
		_.each( roomData.items, function( item ){

			var m = new CalendarModel( item );
			this.collectionView.collection.add( m );
		}, this);
	}
});

module.exports = CalendarSingle;
},{"models/calendarModel":7,"templates/calendarSingle.html":12,"views/calendarItem":15}],17:[function(require,module,exports){
var calendarLoad = require("controllers/calendarLoad");
var CalendarSingle 	= require("views/calendarSingle");

var hueConnect = require("controllers/hueConnect");
var LightPattern = require("controllers/lightPattern");
var roomData = require("roomData");

var CalendarView = Marionette.LayoutView.extend({
	template : _.template( require("templates/calendarWrapper.html") ),
	regions : {

		mainList : ".main-list",
		calendarContainer : "calendar-container",
		roomSplit : "#room-split",
		roomSingle : "#room-single",
	},
	ui : {
		colorPicker : ".color",
		test : "#test",
		hexButton : "#hex",
		hexInput : "#hex-input",
		room : ".room"
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
		},
		"click @ui.room" : "onClickRoom"
	},
	initialize : function(){
		
		this.calendarStore = {};
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
	onClickRoom : function( e ){

		var $room = $( e.currentTarget );
		var model = this.calendarStore[ $room.data("id") ];
		var view =  new CalendarSingle( { model : model });
		this.getRegion( "roomSingle" ).show( view );
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
		
		var key = data.key;
		
		var myCalendarModel = this.calendarStore[ key ] || new Backbone.Model() ;

		myCalendarModel.set("roomData", data.data);

		this.calendarStore[ key ] = myCalendarModel;
	} 
});


module.exports = CalendarView;                    
    
 
},{"controllers/calendarLoad":4,"controllers/hueConnect":5,"controllers/lightPattern":6,"roomData":10,"templates/calendarWrapper.html":13,"views/calendarSingle":16}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIuLi9wdWJsaWMvYXNzZXRzL2pzL3VzZXIvYXBwLmpzIiwiLi4vcHVibGljL2Fzc2V0cy9qcy91c2VyL2NvbnRyb2xsZXJzL2FwcENvbnRyb2xsZXIuanMiLCIuLi9wdWJsaWMvYXNzZXRzL2pzL3VzZXIvY29udHJvbGxlcnMvYXBwUm91dGVyLmpzIiwiLi4vcHVibGljL2Fzc2V0cy9qcy91c2VyL2NvbnRyb2xsZXJzL2NhbGVuZGFyTG9hZC5qcyIsIi4uL3B1YmxpYy9hc3NldHMvanMvdXNlci9jb250cm9sbGVycy9odWVDb25uZWN0LmpzIiwiLi4vcHVibGljL2Fzc2V0cy9qcy91c2VyL2NvbnRyb2xsZXJzL2xpZ2h0UGF0dGVybi5qcyIsIi4uL3B1YmxpYy9hc3NldHMvanMvdXNlci9tb2RlbHMvY2FsZW5kYXJNb2RlbC5qcyIsIi4uL3B1YmxpYy9hc3NldHMvanMvdXNlci9tb2RlbHMvc3RhdGUuanMiLCIuLi9wdWJsaWMvYXNzZXRzL2pzL3VzZXIvcGlwZS5qcyIsIi4uL3B1YmxpYy9hc3NldHMvanMvdXNlci9yb29tRGF0YS5qcyIsIi4uL3B1YmxpYy9hc3NldHMvanMvdXNlci90ZW1wbGF0ZXMvY2FsZW5kYXJJdGVtLmh0bWwiLCIuLi9wdWJsaWMvYXNzZXRzL2pzL3VzZXIvdGVtcGxhdGVzL2NhbGVuZGFyU2luZ2xlLmh0bWwiLCIuLi9wdWJsaWMvYXNzZXRzL2pzL3VzZXIvdGVtcGxhdGVzL2NhbGVuZGFyV3JhcHBlci5odG1sIiwiLi4vcHVibGljL2Fzc2V0cy9qcy91c2VyL3ZpZXdzL2FwcExheW91dC5qcyIsIi4uL3B1YmxpYy9hc3NldHMvanMvdXNlci92aWV3cy9jYWxlbmRhckl0ZW0uanMiLCIuLi9wdWJsaWMvYXNzZXRzL2pzL3VzZXIvdmlld3MvY2FsZW5kYXJTaW5nbGUuanMiLCIuLi9wdWJsaWMvYXNzZXRzL2pzL3VzZXIvdmlld3MvY2FsZW5kYXJXcmFwcGVyLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNiQTtBQUNBOztBQ0RBO0FBQ0E7O0FDREE7QUFDQTs7QUNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNkQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwid2luZG93LkNvbW1vbiA9IHtcblx0cGF0aCA6IHtcblx0XHRhc3NldHMgOiBcImFzc2V0cy9cIixcblx0XHRpbWcgOiBcImFzc2V0cy9pbWcvXCIsXG5cdFx0YXVkaW8gOiBcImFzc2V0cy9hdWRpby9cIlxuXHR9LFxuXHRzaXplcyA6e1xuXHRcdGZyYW1lIDogMTBcblx0fVxufTtcblxuLy9iYXNlXG52YXIgQXBwUm91dGVyIFx0XHQ9IHJlcXVpcmUoIFwiY29udHJvbGxlcnMvYXBwUm91dGVyXCIgKTtcbnZhciBBcHBMYXlvdXQgXHRcdD0gcmVxdWlyZSggXCJ2aWV3cy9hcHBMYXlvdXRcIiApO1xuXG4vL2N1c3RvbVxudmFyIENhbGVuZGFyV3JhcHBlclx0PSByZXF1aXJlKFwidmlld3MvY2FsZW5kYXJXcmFwcGVyXCIpO1xudmFyIHJvb21EYXRhID0gcmVxdWlyZShcInJvb21EYXRhXCIpO1xuXG4vL1RIRSBBUFBMSUNBVElPTlxudmFyIE15QXBwID0gTWFyaW9uZXR0ZS5BcHBsaWNhdGlvbi5leHRlbmQoe1xuXHRpbml0aWFsaXplIDogZnVuY3Rpb24oKXtcblx0XHRcblx0fSxcblx0b25TdGFydCA6IGZ1bmN0aW9uKCl7XG5cdFx0QmFja2JvbmUuaGlzdG9yeS5zdGFydCh7XG5cdFx0XHRwdXNoU3RhdGUgOiBmYWxzZVxuXHRcdH0pO1xuXHRcdEFwcExheW91dC5yZW5kZXIoKTsgXG5cdFx0Y29uc29sZS5sb2coXCIhISEhISEhIWFzZGFzZHNhZGFzISEhIVwiKVxuXG5cdFx0dmFyIG15Q2FsZW5kYXIgPSBuZXcgQ2FsZW5kYXJXcmFwcGVyKCB7IG1vZGVsIDogbmV3IEJhY2tib25lLk1vZGVsKHsgcm9vbXMgOiByb29tRGF0YSB9KSB9KTtcblx0XHRBcHBMYXlvdXQuZ2V0UmVnaW9uKFwibWFpblwiKS5zaG93KCBteUNhbGVuZGFyICk7XG5cdH0gXG59KTtcblxuXG5cbiQoZnVuY3Rpb24oKXtcblx0d2luZG93LmFwcCA9IG5ldyBNeUFwcCgpO1xuXHR3aW5kb3cuYXBwLnN0YXJ0KCk7IFxufSk7XG5cblxuXG5cblxuXG5cbiAgICAgICAgICIsInZhciBNeUFwcENvbnRyb2xsZXIgPSBNYXJpb25ldHRlLkNvbnRyb2xsZXIuZXh0ZW5kKHtcblx0bG9hZFBhZ2UgOiBmdW5jdGlvbiggcGFnZU5hbWUgKXtcblx0XHRjb25zb2xlLmxvZyhcIlBBR0UgTkFhc2Rhc2Rhc2Rhc2RNRTo6XCIsIHBhZ2VOYW1lICk7ICAgICAgICAgXG5cdFx0dGhpcy50cmlnZ2VyKFwicGFnZUxvYWRlZFwiLCBwYWdlTmFtZSk7XG5cdH1cbn0pO1xuXG5NeUFwcENvbnRyb2xsZXIuZXZlbnRzID0gXCJ0ZXN0XCI7XG5cbm1vZHVsZS5leHBvcnRzID0gIG5ldyBNeUFwcENvbnRyb2xsZXIoKTtcbiIsInZhciBBcHBDb250cm9sbGVyID0gcmVxdWlyZShcImNvbnRyb2xsZXJzL2FwcENvbnRyb2xsZXJcIik7XG5cbnZhciBNeUFwcFJvdXRlciA9IE1hcmlvbmV0dGUuQXBwUm91dGVyLmV4dGVuZCh7XG5cdGNvbnRyb2xsZXIgOiBBcHBDb250cm9sbGVyLFxuXHRhcHBSb3V0ZXMgOiB7XG5cdFx0XCI6cGFnZVwiIDogXCJsb2FkUGFnZVwiXG5cdH1cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IG5ldyBNeUFwcFJvdXRlcigpO1xuIiwidmFyIHBpcGUgPSByZXF1aXJlKFwicGlwZVwiKTtcblxuLy9saXN0ZW5pbmcgZm9yIGxvYWRcbndpbmRvdy5oYW5kbGVDbGllbnRMb2FkID0gZnVuY3Rpb24oKXtcblxuICBjb25zb2xlLmxvZyhcImdvb2dsZSBhcGkgbG9hZGVkXCIpO1xuICBpbml0KCk7XG59XG5cbnZhciBjbGllbnRJZCA9ICc0MzM4Mzk3MjMzNjUtdTdncmxkdHZmOHBhYmprajRmcmNpbzNjdjVoaXQ4Zm0uYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20nO1xudmFyIGFwaUtleSA9ICdBSXphU3lCc0tkVHBsUlh1RXdndlBTSF9nR0Y4T0dzdzM1dDE1djAnO1xudmFyIHNjb3BlcyA9ICdodHRwczovL3d3dy5nb29nbGVhcGlzLmNvbS9hdXRoL2NhbGVuZGFyJztcbnZhciByb29tRGF0YSA9IHJlcXVpcmUoXCJyb29tRGF0YVwiKTtcblxuXG4vL1RPRE8gOiBpbnRlZ3JhdGUgYWxsIDQgY2FsZW5kYXJzXG5cbmZ1bmN0aW9uIGluaXQoKXtcblx0Z2FwaS5jbGllbnQuc2V0QXBpS2V5KGFwaUtleSk7XG5cdGNoZWNrQXV0aCgpO1xufVxuXG5mdW5jdGlvbiBjaGVja0F1dGgoKXtcblx0Z2FwaS5hdXRoLmF1dGhvcml6ZSgge1xuXHRcdGNsaWVudF9pZDogY2xpZW50SWQsIFxuXHRcdHNjb3BlOiBzY29wZXMsIFxuXHRcdGltbWVkaWF0ZTogZmFsc2Vcblx0fSwgaGFuZGxlQXV0aFJlc3VsdCApO1xufVxuXG5mdW5jdGlvbiBoYW5kbGVBdXRoUmVzdWx0KCBhdXRoUmVzdWx0ICl7XG5cblx0aWYoYXV0aFJlc3VsdCl7XG5cdFx0bWFrZUFwaUNhbGwoKTtcblx0fVxufVxuXG5mdW5jdGlvbiBtYWtlQXBpQ2FsbCgpIHtcbiAgZ2FwaS5jbGllbnQubG9hZCgnY2FsZW5kYXInLCAndjMnLCBmdW5jdGlvbigpIHtcbiAgICAgIFxuICAgICAgcHVsbFJvb21zKCk7ICAgICAgICAgIFxuICB9KTtcbn1cblxuZnVuY3Rpb24gcHVsbFJvb21zKCl7XG5cbiAgdmFyIGZyb20gPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7XG5cbiAgXy5lYWNoKCByb29tRGF0YSwgZnVuY3Rpb24oIGRhdGEsIGtleSApe1xuXG4gICAgdmFyIHJlcXVlc3QgPSBnYXBpLmNsaWVudC5jYWxlbmRhci5ldmVudHMubGlzdCh7XG4gICAgICAgICdjYWxlbmRhcklkJzogZGF0YS5jYWxlbmRhcklkLFxuICAgICAgICB0aW1lTWluIDogZnJvbVxuICAgICAgfSk7XG5cbiAgICAgcmVxdWVzdC50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG5cbiAgICAgICAgICByb29tTG9hZGVkKCBrZXksIHJlc3BvbnNlLnJlc3VsdCApO1xuICAgICAgfSwgZnVuY3Rpb24ocmVhc29uKSB7XG5cbiAgICAgICAgICBjb25zb2xlLmxvZygnRXJyb3I6ICcgKyByZWFzb24ucmVzdWx0LmVycm9yLm1lc3NhZ2UpO1xuICAgICAgfSk7XG4gIH0pO1xufVxuXG5mdW5jdGlvbiByb29tTG9hZGVkKCBrZXksIGRhdGEgKXtcblxuICBjb25zb2xlLmxvZyhcIlJPT00gTE9BREVEXCIsIGRhdGEpO1xuICBldmVudHMudHJpZ2dlciggXCJldmVudHNMb2FkZWRcIiwgeyBrZXkgOiBrZXksIGRhdGEgOiBkYXRhIH0gKTtcbn1cblxudmFyIGV2ZW50cyA9IF8uZXh0ZW5kKHtcblxufSwgQmFja2JvbmUuRXZlbnRzKTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cbiAgZXZlbnRzIDogZXZlbnRzXG59O1xuIiwidmFyIG15U29ja2V0ID0gbnVsbDtcbnZhciBjb25uZWN0ZWQgPSBmYWxzZTtcblxuZnVuY3Rpb24gaW5pdCgpe1xuXG5cdG15U29ja2V0ID0gaW8uY29ubmVjdCgnLy9sb2NhbGhvc3Q6MzAwMCcpO1xuXHRteVNvY2tldC5vbignY29ubmVjdCcsIGZ1bmN0aW9uKCl7XG5cdFx0Y29ubmVjdGVkID0gdHJ1ZTtcblx0fSk7XHRcbn1cblxuZnVuY3Rpb24gdXBkYXRlKCBkYXRhICl7XG5cblx0aWYoY29ubmVjdGVkKXtcblx0XHRteVNvY2tldC5lbWl0KCAndXBkYXRlX2RhdGEnLCBkYXRhICk7XHRcblx0fVxufVxuXG4vLyB2YXIgdGhyb3R0bGVkVXBkYXRlID0gXy50aHJvdHRsZSggdXBkYXRlLCA1MDAsIHtsZWFkaW5nOiBmYWxzZX0gKTtcblxuaW5pdCgpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblx0aW5pdCA6IGluaXQsXG5cdHVwZGF0ZSA6IHVwZGF0ZSxcblx0Y29ubmVjdGVkIDogY29ubmVjdGVkXG59IiwidmFyIGh1ZUNvbm5lY3QgPSByZXF1aXJlKFwiY29udHJvbGxlcnMvaHVlQ29ubmVjdFwiKTtcblxuZnVuY3Rpb24gTGlnaHRQYXR0ZXJuKCBsaWdodElkLCBwYXR0ZXJuSWQgKXtcblxuXHR0aGlzLl9oc2wgPSB7XG5cdFx0aCA6IDAsXG5cdFx0cyA6IDAsXG5cdFx0bCA6IDBcblx0fVxuXG5cdHRoaXMuX2xpZ2h0SWQgPSBsaWdodElkO1xuXHR0aGlzLl9wYXR0ZXJuSWQgPSBwYXR0ZXJuSWQ7XG5cdHRoaXMuX3N0ZXAgPSAwO1xuXG5cdHRoaXMubmV3U2VxdWVuY2UoIHRoaXMuX3BhdHRlcm5JZCApO1xufVxuXG5MaWdodFBhdHRlcm4ucHJvdG90eXBlID0ge1xuXHRuZXdTZXF1ZW5jZSA6IGZ1bmN0aW9uKCBpZCApe1xuXG5cdFx0dmFyIHBhdHRlcm4gPSBwYXR0ZXJuc1sgaWQgXTtcblx0XHR2YXIgc2VxdWVuY2UgPSBwYXR0ZXJuLnNlcXVlbmNlO1xuXG5cdFx0dGhpcy5fdHdlZW5lciA9IG5ldyBUaW1lbGluZU1heCh7XG5cdFx0XHRyZXBlYXQgOiBwYXR0ZXJuLnJlcGVhdCxcblx0XHRcdG9uQ29tcGxldGUgOiBmdW5jdGlvbigpe1xuXHRcdFx0XHRjb25zb2xlLmxvZyhcImNvbXBsZXRlIVwiKTtcblx0XHRcdH1cblx0XHR9KTtcblxuXHRcdF8uZWFjaCggc2VxdWVuY2UsIGZ1bmN0aW9uKCBzdGVwICl7XG5cblx0XHRcdHRoaXMucXVldWVDb2xvciggc3RlcCApO1xuXHRcdH0sIHRoaXMgKTtcblx0fSxcblx0cXVldWVDb2xvciA6IGZ1bmN0aW9uKCBzdGVwICl7XG5cblx0XHR2YXIgY29sb3IgPSBvbmUuY29sb3IoIHN0ZXAuY29sb3IgKTtcblx0XHR2YXIgZmFkZSA9IHN0ZXAuZmFkZTtcblx0XHR2YXIgd2FpdCA9IHN0ZXAud2FpdDtcblxuXHRcdHZhciBoc2wgPSB7XG5cdFx0XHRoIDogTWF0aC5mbG9vciggY29sb3IuaCgpICogMzYwKSwgXG5cdFx0XHRzIDogTWF0aC5mbG9vciggY29sb3IucygpICogMTAwKSxcblx0XHRcdGwgOiBNYXRoLmZsb29yKCBjb2xvci5sKCkgKiAxMDApIFxuXHRcdH07XG5cblx0XHR2YXIgb3B0aW9ucyA9IHtcblx0XHRcdG9uU3RhcnQgOiBmdW5jdGlvbigpe1xuXHRcdFx0XHQvL3VwZGF0aW5nIExFRHNcblx0XHRcdFx0aHVlQ29ubmVjdC51cGRhdGUoW3tcblx0XHRcdFx0XHRpZCA6IHRoaXMuX2xpZ2h0SWQsXG5cdFx0XHRcdFx0ZGF0YSA6IHtcblx0XHRcdFx0XHRcdGhzbCA6IGhzbCxcblx0XHRcdFx0XHRcdGR1cmF0aW9uIDogZmFkZVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fV0pO1x0XHRcdFx0XG5cdFx0XHR9LFxuXHRcdFx0b25TdGFydFNjb3BlIDogdGhpc1xuXHRcdH1cblxuXHRcdC8vdXBkYXRpbmcgZnJvbnRlbmRcblx0XHR0aGlzLl90d2VlbmVyLnRvKCB0aGlzLl9oc2wsIGZhZGUsIF8uZXh0ZW5kKCBvcHRpb25zLCBoc2wgKSApO1xuXHRcdHRoaXMuX3R3ZWVuZXIudG8oIHRoaXMuX2hzbCwgd2FpdCwge30gKTtcblx0fVxufVxuXG52YXIgcGF0dGVybnMgPSB7XG5cdCd0ZXN0JyA6IHtcblx0XHRyZXBlYXQgOiAgLTEsXG5cdFx0c2VxdWVuY2UgOiBbXG5cdFx0XHR7IGNvbG9yIDogXCIjRkIxOTExXCIsIGZhZGUgOiAxLCB3YWl0IDogMSB9LFxuXHRcdFx0Ly8geyBjb2xvciA6IFwiIzAwZmYwMFwiLCBmYWRlIDogMSwgd2FpdCA6IDEgfSxcblx0XHRcdC8vIHsgY29sb3IgOiBcIiM0MTU2RkZcIiwgZmFkZSA6IDEsIHdhaXQgOiAxIH0sXG5cdFx0XHQvLyB7IGNvbG9yIDogXCIjRkYwMDFEXCIsIGZhZGUgOiAxLCB3YWl0IDogMSB9LFxuXHRcdFx0Ly8geyBjb2xvciA6IFwiI0ZGRkYwN1wiLCBmYWRlIDogMSwgd2FpdCA6IDEgfSxcblx0XHRdXG5cdH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBMaWdodFBhdHRlcm47IiwidmFyIENhbGVuZGFyTW9kZWwgPSBCYWNrYm9uZS5Nb2RlbC5leHRlbmQoe1xuXHRkZWZhdWx0cyA6IHtcblx0XHRzdW1tYXJ5IDogXCJuL2FcIixcblx0XHRkZXNjcmlwdGlvbiA6IFwibi9hXCIsXG5cdFx0c3RhcnQgOiBcIm4vYVwiLFxuXHRcdGVuZCA6IFwibi9hXCIsXG5cdH1cbn0pXG5cbm1vZHVsZS5leHBvcnRzID0gQ2FsZW5kYXJNb2RlbDsiLCJ2YXIgc3RhdGUgPSBuZXcgKEJhY2tib25lLk1vZGVsLmV4dGVuZCh7XG5cdGRlZmF1bHRzIDoge1xuXHRcdC8vIFwibmF2X29wZW5cIiBcdFx0OiBmYWxzZSxcblx0XHQvLyAnc2Nyb2xsX2F0X3RvcCcgOiB0cnVlLFxuXHRcdC8vICdtaW5pbWFsX25hdicgXHQ6IGZhbHNlLFxuXHRcdC8vICdmdWxsX25hdl9vcGVuJ1x0OiBmYWxzZSxcblx0XHQvLyAndWlfZGlzcGxheSdcdDogZmFsc2Vcblx0fVxufSkpKCk7XG5cbm1vZHVsZS5leHBvcnRzID0gc3RhdGU7XG4iLCJ2YXIgcGlwZSA9IF8uZXh0ZW5kKHtcblxuXHRcblx0XG59LCBCYWNrYm9uZS5FdmVudHMpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHBpcGU7IiwibW9kdWxlLmV4cG9ydHMgPSB7XG5cdCcxJzoge1xuXHRcdCdjYWxlbmRhcklkJyA6IFwiYi1yZWVsLmNvbV8yZDMyMzgzNzM5MzYzNjMyMzIzNzM4MzFAcmVzb3VyY2UuY2FsZW5kYXIuZ29vZ2xlLmNvbVwiXG5cdH0sXG5cdCcyJzoge1xuXHRcdCdjYWxlbmRhcklkJyA6IFwiYi1yZWVsLmNvbV8yZDMxMzIzNzM3MzgzODMzMzQyZDMyMzQzMkByZXNvdXJjZS5jYWxlbmRhci5nb29nbGUuY29tXCJcblx0fSxcblx0JzMnOiB7XG5cdFx0J2NhbGVuZGFySWQnIDogXCJiLXJlZWwuY29tXzMxMzYzNTMzMzkzNjMxMzkzOTMzMzhAcmVzb3VyY2UuY2FsZW5kYXIuZ29vZ2xlLmNvbVwiXG5cdH0sXG5cdCc1Jzoge1xuXHRcdCdjYWxlbmRhcklkJyA6IFwiYi1yZWVsLmNvbV8yZDM0MzQzMjM4MzkzNjM3MzAyZDM2MzQzM0ByZXNvdXJjZS5jYWxlbmRhci5nb29nbGUuY29tXCJcblx0fVxufTsiLCJtb2R1bGUuZXhwb3J0cyA9IFwiPCUgaWYoIHN1bW1hcnkgKXsgJT5cXG5cXHQ8aDI+c3VtbWFyeSA6IDwlPSBzdW1tYXJ5ICU+PC9oMj5cXG48JSB9ICU+XFxuXFxuPCUgaWYoIGRlc2NyaXB0aW9uICl7ICU+XFxuXFx0PGgzPmRlc2NyaXB0aW9uIDogPCU9IGRlc2NyaXB0aW9uICU+PC9oMz5cXG48JSB9ICU+XFxuXFxuPCUgaWYoIHN0YXJ0ICl7ICU+XFxuXFx0PGgzPnN0YXJ0IDogPCU9IHN0YXJ0LmRhdGVUaW1lICU+PC9oMz5cXG48JSB9ICU+XFxuXFxuPCUgaWYoIGVuZCApeyAlPlxcblxcdDxoMz5lbmQgOiA8JT0gZW5kLmRhdGVUaW1lICU+PC9oMz5cXG48JSB9ICU+XCI7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IFwiPGRpdiBpZD1cXFwiZXZlbnQtbGlzdFxcXCI+PC9kaXY+IFwiO1xuIiwibW9kdWxlLmV4cG9ydHMgPSBcIjxkaXY+XFxuXFx0PGlucHV0IGlkPVxcXCJoZXgtaW5wdXRcXFwiIHR5cGU9XFxcInRleHRcXFwiPjwvaW5wdXQ+XFxuXFx0PGJ1dHRvbiBpZD1cXFwiaGV4XFxcIj5oZXg8L2J1dHRvbj5cXG48L2Rpdj5cXG48YnV0dG9uIGlkPVxcXCJ0ZXN0XFxcIj50ZXN0PC9idXR0b24+XFxuPGlucHV0IGNsYXNzPVxcXCJjb2xvclxcXCIgdHlwZT1cXFwiY29sb3JcXFwiIG5hbWU9XFxcImZhdmNvbG9yXFxcIj5cXG48ZGl2IGNsYXNzPVxcXCJtYWluLWxpc3RcXFwiPjwvZGl2PlxcblxcbjxkaXYgaWQ9XFxcInJvb20tc3BsaXRcXFwiPlxcblxcdDwlIF8uZWFjaCggcm9vbXMsIGZ1bmN0aW9uKCBkYXRhLCBrZXkgKXsgJT5cXG5cXHRcXHQ8ZGl2IGlkPVxcXCJyb29tLTwlPSBrZXkgJT5cXFwiIGNsYXNzPVxcXCJyb29tXFxcIiBkYXRhLWlkPVxcXCI8JT0ga2V5ICU+XFxcIj5yb29tIDwlPSBrZXkgJT48L2Rpdj5cXG5cXHQ8JSB9KTsgJT5cXG48L2Rpdj5cXG48ZGl2IGlkPVxcXCJyb29tLXNpbmdsZVxcXCI+PC9kaXY+XFxuXFxuPGRpdiBpZD1cXFwiY2FsZW5kYXItY29udGFpbmVyXFxcIj5cXG5cXG48L2Rpdj5cXG5cXG4gXCI7XG4iLCJ2YXIgU3RhdGUgXHRcdD0gcmVxdWlyZShcIm1vZGVscy9zdGF0ZVwiKTtcblxudmFyIE15QXBwTGF5b3V0ID0gTWFyaW9uZXR0ZS5MYXlvdXRWaWV3LmV4dGVuZCh7XG5cdGVsIDogXCIjY29udGVudFwiLFxuXHR0ZW1wbGF0ZSA6IGZhbHNlLFxuXHRyZWdpb25zIDoge1xuXHRcdG1haW4gOiBcIiNtYWluXCJcblx0fSwgXG5cdGluaXRpYWxpemUgOiBmdW5jdGlvbigpe1xuXHRcdHZhciBfdGhpcyA9IHRoaXM7XG5cblx0XHQvL3dyYXBwaW5nIGh0bWxcblx0XHR0aGlzLiRodG1sID0gJChcImh0bWxcIik7XG5cdFx0dGhpcy4kaHRtbC5yZW1vdmVDbGFzcyhcImhpZGRlblwiKTtcblxuXHRcdC8vcmVzaXplIGV2ZW50c1xuXHRcdCQod2luZG93KS5yZXNpemUoZnVuY3Rpb24oKXtcblx0XHRcdF90aGlzLm9uUmVzaXplV2luZG93KCk7XG5cdFx0fSkucmVzaXplKCk7XG5cblx0XHR0aGlzLmxpc3RlbkZvclN0YXRlKCk7XG5cdH0sXG5cdGxpc3RlbkZvclN0YXRlIDogZnVuY3Rpb24oKXtcblx0XHQvL3N0YXRlIGNoYW5nZVxuXHRcdHRoaXMubGlzdGVuVG8oIFN0YXRlLCBcImNoYW5nZVwiLCBmdW5jdGlvbiggZSApe1xuXG5cdFx0XHR0aGlzLm9uU3RhdGVDaGFuZ2UoIGUuY2hhbmdlZCwgZS5fcHJldmlvdXNBdHRyaWJ1dGVzICk7XG5cdFx0fSwgdGhpcyk7XG5cdFx0dGhpcy5vblN0YXRlQ2hhbmdlKCBTdGF0ZS50b0pTT04oKSApO1xuXHR9LFxuXHRvblN0YXRlQ2hhbmdlIDogZnVuY3Rpb24oIGNoYW5nZWQsIHByZXZpb3VzICl7XG5cblx0XHRfLmVhY2goIGNoYW5nZWQsIGZ1bmN0aW9uKHZhbHVlLCBrZXkpe1xuXHRcdFx0XG5cdFx0XHRpZiggXy5pc0Jvb2xlYW4oIHZhbHVlICkgKXtcblx0XHRcdFx0dGhpcy4kaHRtbC50b2dnbGVDbGFzcyhcInN0YXRlLVwiK2tleSwgdmFsdWUpO1xuXHRcdFx0XHR0aGlzLiRodG1sLnRvZ2dsZUNsYXNzKFwic3RhdGUtbm90LVwiK2tleSwgIXZhbHVlKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHZhciBwcmV2VmFsdWUgPSBwcmV2aW91c1sga2V5IF07XG5cdFx0XHRcdGlmKHByZXZWYWx1ZSl7XG5cdFx0XHRcdFx0dGhpcy4kaHRtbC50b2dnbGVDbGFzcyhcInN0YXRlLVwiK2tleStcIi1cIitwcmV2VmFsdWUsIGZhbHNlKTtcblx0XHRcdFx0fVxuXHRcdFx0XHR0aGlzLiRodG1sLnRvZ2dsZUNsYXNzKFwic3RhdGUtXCIra2V5K1wiLVwiK3ZhbHVlLCB0cnVlKTtcblx0XHRcdH1cblxuXHRcdH0sIHRoaXMgKTtcblx0fSxcblx0b25SZXNpemVXaW5kb3cgOiBmdW5jdGlvbigpe1xuXHRcdENvbW1vbi53dyA9ICQod2luZG93KS53aWR0aCgpO1xuXHRcdENvbW1vbi53aCA9ICQod2luZG93KS5oZWlnaHQoKTtcblx0fVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gbmV3IE15QXBwTGF5b3V0KCk7IiwidmFyIENhbGVuZGFySXRlbSA9IE1hcmlvbmV0dGUuSXRlbVZpZXcuZXh0ZW5kKHtcblx0Y2xhc3NOYW1lIDogXCJpdGVtXCIsXG5cdHRlbXBsYXRlIDogXy50ZW1wbGF0ZSggcmVxdWlyZShcInRlbXBsYXRlcy9jYWxlbmRhckl0ZW0uaHRtbFwiKSApLFxuXHR1aSA6IHtcblx0XHQndGl0bGUnIDogXCJoMlwiXG5cdH0sXG5cdGV2ZW50cyA6IHtcblx0XHQnY2xpY2sgQHVpLnRpdGxlJyA6IGZ1bmN0aW9uKCl7XG5cblxuXHRcdH1cblx0fVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gQ2FsZW5kYXJJdGVtOyIsInZhciBDYWxlbmRhckl0ZW0gXHQ9IHJlcXVpcmUoXCJ2aWV3cy9jYWxlbmRhckl0ZW1cIik7XG52YXIgQ2FsZW5kYXJNb2RlbCBcdD0gcmVxdWlyZShcIm1vZGVscy9jYWxlbmRhck1vZGVsXCIpO1xuXG52YXIgQ2FsZW5kYXJTaW5nbGUgPSBNYXJpb25ldHRlLkxheW91dFZpZXcuZXh0ZW5kKHtcblx0dGVtcGxhdGUgOiBfLnRlbXBsYXRlKCByZXF1aXJlKFwidGVtcGxhdGVzL2NhbGVuZGFyU2luZ2xlLmh0bWxcIikgKSxcblx0cmVnaW9ucyA6IHtcblx0XHRldmVudExpc3QgOiBcIiNldmVudC1saXN0XCJcblx0fSxcblx0aW5pdGlhbGl6ZSA6IGZ1bmN0aW9uKCl7XG5cblx0XHR0aGlzLmNvbGxlY3Rpb25WaWV3ID0gbmV3IE1hcmlvbmV0dGUuQ29sbGVjdGlvblZpZXcoe1xuXHRcdFx0Y2hpbGRWaWV3IDogQ2FsZW5kYXJJdGVtLFxuXHRcdFx0Y29sbGVjdGlvbiA6IG5ldyBCYWNrYm9uZS5Db2xsZWN0aW9uKClcblx0XHR9KTtcblxuXHRcdHRoaXMubGlzdGVuVG8oIHRoaXMubW9kZWwsIFwiY2hhbmdlOnJvb21EYXRhXCIsIHRoaXMudXBkYXRlRXZlbnRzICk7XG5cdH0sXG5cdG9uU2hvdyA6IGZ1bmN0aW9uKCl7XG5cblx0XHR0aGlzLmdldFJlZ2lvbiggXCJldmVudExpc3RcIiApLnNob3coIHRoaXMuY29sbGVjdGlvblZpZXcgKTtcblx0XHR0aGlzLnVwZGF0ZUV2ZW50cygpO1xuXHR9LFxuXHR1cGRhdGVFdmVudHMgOiBmdW5jdGlvbigpe1xuXG5cdFx0dmFyIHJvb21EYXRhID0gdGhpcy5tb2RlbC5nZXQoXCJyb29tRGF0YVwiKVxuXHRcdF8uZWFjaCggcm9vbURhdGEuaXRlbXMsIGZ1bmN0aW9uKCBpdGVtICl7XG5cblx0XHRcdHZhciBtID0gbmV3IENhbGVuZGFyTW9kZWwoIGl0ZW0gKTtcblx0XHRcdHRoaXMuY29sbGVjdGlvblZpZXcuY29sbGVjdGlvbi5hZGQoIG0gKTtcblx0XHR9LCB0aGlzKTtcblx0fVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gQ2FsZW5kYXJTaW5nbGU7IiwidmFyIGNhbGVuZGFyTG9hZCA9IHJlcXVpcmUoXCJjb250cm9sbGVycy9jYWxlbmRhckxvYWRcIik7XG52YXIgQ2FsZW5kYXJTaW5nbGUgXHQ9IHJlcXVpcmUoXCJ2aWV3cy9jYWxlbmRhclNpbmdsZVwiKTtcblxudmFyIGh1ZUNvbm5lY3QgPSByZXF1aXJlKFwiY29udHJvbGxlcnMvaHVlQ29ubmVjdFwiKTtcbnZhciBMaWdodFBhdHRlcm4gPSByZXF1aXJlKFwiY29udHJvbGxlcnMvbGlnaHRQYXR0ZXJuXCIpO1xudmFyIHJvb21EYXRhID0gcmVxdWlyZShcInJvb21EYXRhXCIpO1xuXG52YXIgQ2FsZW5kYXJWaWV3ID0gTWFyaW9uZXR0ZS5MYXlvdXRWaWV3LmV4dGVuZCh7XG5cdHRlbXBsYXRlIDogXy50ZW1wbGF0ZSggcmVxdWlyZShcInRlbXBsYXRlcy9jYWxlbmRhcldyYXBwZXIuaHRtbFwiKSApLFxuXHRyZWdpb25zIDoge1xuXG5cdFx0bWFpbkxpc3QgOiBcIi5tYWluLWxpc3RcIixcblx0XHRjYWxlbmRhckNvbnRhaW5lciA6IFwiY2FsZW5kYXItY29udGFpbmVyXCIsXG5cdFx0cm9vbVNwbGl0IDogXCIjcm9vbS1zcGxpdFwiLFxuXHRcdHJvb21TaW5nbGUgOiBcIiNyb29tLXNpbmdsZVwiLFxuXHR9LFxuXHR1aSA6IHtcblx0XHRjb2xvclBpY2tlciA6IFwiLmNvbG9yXCIsXG5cdFx0dGVzdCA6IFwiI3Rlc3RcIixcblx0XHRoZXhCdXR0b24gOiBcIiNoZXhcIixcblx0XHRoZXhJbnB1dCA6IFwiI2hleC1pbnB1dFwiLFxuXHRcdHJvb20gOiBcIi5yb29tXCJcblx0fSxcblx0ZXZlbnRzIDoge1xuXHRcdFwiY2xpY2sgQHVpLnRlc3RcIiA6IGZ1bmN0aW9uKCl7XG5cdFx0XHRmb3IoIHZhciBpID0gMCA7IGkgPCA1IDsgaSsrICl7XG5cdFx0XHRcdG5ldyBMaWdodFBhdHRlcm4oaSsxLCBcInRlc3RcIik7XG5cdFx0XHR9XG5cdFx0fSxcblx0XHRcImNsaWNrIEB1aS5oZXhCdXR0b25cIiA6IGZ1bmN0aW9uKCl7XG5cdFx0XHR2YXIgY29sb3IgPSB0aGlzLnVpLmhleElucHV0LnZhbCgpO1xuXHRcdFx0dGhpcy50ZXN0Q29sb3IoIGNvbG9yICk7XG5cdFx0fSxcblx0XHRcImNsaWNrIEB1aS5yb29tXCIgOiBcIm9uQ2xpY2tSb29tXCJcblx0fSxcblx0aW5pdGlhbGl6ZSA6IGZ1bmN0aW9uKCl7XG5cdFx0XG5cdFx0dGhpcy5jYWxlbmRhclN0b3JlID0ge307XG5cdFx0dGhpcy5saXN0ZW5UbyggY2FsZW5kYXJMb2FkLmV2ZW50cywgXCJldmVudHNMb2FkZWRcIiwgdGhpcy5ldmVudHNMb2FkZWQgKTtcblx0fSxcblx0b25TaG93IDogZnVuY3Rpb24oKXtcblxuXHRcdHZhciBjb2xvclBpY2tlciA9IHRoaXMudWkuY29sb3JQaWNrZXI7XG5cdFx0dmFyIF90aGlzID0gdGhpcztcblx0XHQkKGNvbG9yUGlja2VyKS5jaGFuZ2UoZnVuY3Rpb24oKXtcblx0XHRcdHZhciB2YWwgPSAkKHRoaXMpLnZhbCgpO1xuXHRcdFx0X3RoaXMudGVzdENvbG9yKCB2YWwgKTtcblx0XHR9KTtcblx0fSxcblx0b25DbGlja1Jvb20gOiBmdW5jdGlvbiggZSApe1xuXG5cdFx0dmFyICRyb29tID0gJCggZS5jdXJyZW50VGFyZ2V0ICk7XG5cdFx0dmFyIG1vZGVsID0gdGhpcy5jYWxlbmRhclN0b3JlWyAkcm9vbS5kYXRhKFwiaWRcIikgXTtcblx0XHR2YXIgdmlldyA9ICBuZXcgQ2FsZW5kYXJTaW5nbGUoIHsgbW9kZWwgOiBtb2RlbCB9KTtcblx0XHR0aGlzLmdldFJlZ2lvbiggXCJyb29tU2luZ2xlXCIgKS5zaG93KCB2aWV3ICk7XG5cdH0sXG5cdHRlc3RDb2xvciA6IGZ1bmN0aW9uKCBfY29sb3IgKXtcblxuXHRcdHZhciBjb2xvciA9IG9uZS5jb2xvciggX2NvbG9yICk7XG5cdFx0dmFyIGhzbCA9IHtcblx0XHRcdGggOiBNYXRoLmZsb29yKCBjb2xvci5oKCkgKiAzNjApLCBcblx0XHRcdHMgOiBNYXRoLmZsb29yKCBjb2xvci5zKCkgKiAxMDApLFxuXHRcdFx0bCA6IE1hdGguZmxvb3IoIGNvbG9yLmwoKSAqIDEwMCkgXG5cdFx0fTtcblx0XHRodWVDb25uZWN0LnVwZGF0ZShbXG5cdFx0XHR7XG5cdFx0XHRcdCdpZCcgOiAxLFxuXHRcdFx0XHQnZGF0YScgOiB7XG5cdFx0XHRcdFx0J2hzbCcgOiBoc2wsXG5cdFx0XHRcdFx0J2R1cmF0aW9uJyA6IDFcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0J2lkJyA6IDIsXG5cdFx0XHRcdCdkYXRhJyA6IHtcblx0XHRcdFx0XHQnaHNsJyA6IGhzbCxcblx0XHRcdFx0XHQnZHVyYXRpb24nIDogMVxuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHQnaWQnIDogMyxcblx0XHRcdFx0J2RhdGEnIDoge1xuXHRcdFx0XHRcdCdoc2wnIDogaHNsLFxuXHRcdFx0XHRcdCdkdXJhdGlvbicgOiAxXG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHR7XG5cdFx0XHRcdCdpZCcgOiA0LFxuXHRcdFx0XHQnZGF0YScgOiB7XG5cdFx0XHRcdFx0J2hzbCcgOiBoc2wsXG5cdFx0XHRcdFx0J2R1cmF0aW9uJyA6IDFcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0J2lkJyA6IDUsXG5cdFx0XHRcdCdkYXRhJyA6IHtcblx0XHRcdFx0XHQnaHNsJyA6IGhzbCxcblx0XHRcdFx0XHQnZHVyYXRpb24nIDogMVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XSk7XHRcdFxuXHR9LFxuXHRldmVudHNMb2FkZWQgOiBmdW5jdGlvbiggZGF0YSApe1xuXHRcdFxuXHRcdHZhciBrZXkgPSBkYXRhLmtleTtcblx0XHRcblx0XHR2YXIgbXlDYWxlbmRhck1vZGVsID0gdGhpcy5jYWxlbmRhclN0b3JlWyBrZXkgXSB8fCBuZXcgQmFja2JvbmUuTW9kZWwoKSA7XG5cblx0XHRteUNhbGVuZGFyTW9kZWwuc2V0KFwicm9vbURhdGFcIiwgZGF0YS5kYXRhKTtcblxuXHRcdHRoaXMuY2FsZW5kYXJTdG9yZVsga2V5IF0gPSBteUNhbGVuZGFyTW9kZWw7XG5cdH0gXG59KTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IENhbGVuZGFyVmlldzsgICAgICAgICAgICAgICAgICAgIFxuICAgIFxuICJdfQ==
