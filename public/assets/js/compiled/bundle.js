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

		AppLayout.render(); 

		var myCalendar = new CalendarWrapper( { model : new Backbone.Model({ rooms : roomData }) });
		AppLayout.getRegion("main").show( myCalendar );

		Backbone.history.start({
			pushState : false
		});
	} 
});



$(function(){
	window.app = new MyApp();
	window.app.start(); 
});







         
},{"controllers/appRouter":3,"roomData":11,"views/appLayout":16,"views/calendarWrapper":19}],2:[function(require,module,exports){
var CalendarCollection = Backbone.Collection.extend({
	initialize : function(){

	},
	comparator : function( a, b ){
		var aTime = a.get("start").raw;
		var bTime = b.get("start").raw;
		return aTime - bTime;
	},
	getCurrent : function(){

		return this.find(function( model ){

			return model.isActive();
		});
	}
});

module.exports = CalendarCollection;
},{}],3:[function(require,module,exports){
var MyAppRouter = Marionette.AppRouter.extend({
	controller : {
		"defaultRoute" : function(){},
		"roomRoute" : function(){},
	},
	appRoutes : {
		"room/:key" : "roomRoute",
		"*actions" : "defaultRoute",
	}
});

module.exports = new MyAppRouter();

},{}],4:[function(require,module,exports){
var pipe = require("pipe");

//listening for load
window.handleClientLoad = function(){

  console.log("google api loaded");
  _.defer( function(){ init() });
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

  var from = new Date();
  var to = new Date();
      to.setDate( to.getDate() + 1 );

  _.each( roomData, function( data, key ){

    var request = gapi.client.calendar.events.list({
        'calendarId': data.calendarId,
        timeMin : from.toISOString(),
        timeMax : to.toISOString(),
        singleEvents : true
      });

     request.then(function(response) {

          console.log(response.result);
          roomLoaded( key, response.result );
      }, function(reason) {

          console.log('Error: ' + reason.result.error.message);
      });
  });
}

function roomLoaded( key, data ){

  events.trigger( "eventsLoaded", { key : key, data : data } );
}

var events = _.extend({}, Backbone.Events);

module.exports = {

  events : events
};

},{"pipe":10,"roomData":11}],5:[function(require,module,exports){
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
	this._iteration = 0;
	this._repeat = patterns[ this._patternId ].repeat;

	this._sequence = this.startSequence( this._patternId );

	this._timeout = null;
}

LightPattern.prototype = {
	startSequence : function( id ){

		this._sequence = patterns[ id ].sequence;

		this.stopSequence();
		this.playSequenceStep(0);

		return this._sequence;
	},
	stopSequence : function(){

		this._step = 0;
		this._iteration = 0;

		window.clearTimeout( this._timeout );
	},
	playSequenceStep: function( step ){

		this._step = step;

		var segment = this._sequence[this._step];

		var color = one.color( segment.color );
		var fade = segment.fade;
		var wait = segment.wait;

		var hsl = {
			h : Math.floor( color.h() * 360), 
			s : Math.floor( color.s() * 100),
			l : Math.floor( color.l() * 100) 
		};

		hueConnect.update([{
			id : this._lightId,
			data : {
				hsl : hsl,
				duration : fade
			}
		}]);

		window.clearTimeout( this._timeout );
		this._timeout = window.setTimeout($.proxy(this.nextSequenceStep, this), wait*1000);
	},
	nextSequenceStep: function(){

		var totalSteps = this._sequence.length;
		var repeat = this._repeat;

		this._step ++;
		if(this._step > totalSteps - 1) {
			this._step = 0;
			this._iteration ++;
		}

		if(repeat > -1 && this._iteration > repeat) {
			this.stopSequence();
			return;
		}

		this.playSequenceStep( this._step );
	}
}

var patterns = {
	'test' : {
		repeat :  -1,
		sequence : [
			{ color : "#FB1911", fade : 1, wait : 1 },
			{ color : "#00ff00", fade : 1, wait : 1 },
			{ color : "#4156FF", fade : 1, wait : 1 },
			{ color : "#FF001D", fade : 1, wait : 1 },
			{ color : "#FFFF07", fade : 1, wait : 1 },
		]
	}
}

module.exports = LightPattern;
},{"controllers/hueConnect":5}],7:[function(require,module,exports){
var CalendarItemModel = Backbone.Model.extend({
	defaults : {
		summary : "n/a",
		description : "n/a",
		start : "n/a",
		end : "n/a",
	},
	initialize : function(){

		this.convertDate("start");
		this.convertDate("end");
	},
	convertDate : function( key ){
		//convert datas
		var dateString = this.get( key )
		if(!dateString) return;
		
		dateString = dateString.dateTime;
		var now = new Date();
		var date = new Date( dateString );

		this.set( key, {
			raw : date,
			formatted : date.toString()
		});
	},
	isActive : function(){
		 var start = this.get("start");
		 var end = this.get("end");
		 var now = new Date();

		 if( now > start && now < end ){
		 	return true;
		 }

		 return false;
	}
})

module.exports = CalendarItemModel;
},{}],8:[function(require,module,exports){
var CalendarModel = Backbone.Model.extend({
	checkCalendarRate : 1000,
	defaults : {
		organizer : "Wes"
	},
	initialize : function(){
		_.bindAll( this, "checkCalendar" );
		setInterval( this.checkCalendar, this.checkCalendarRate );
	},
	checkCalendar : function(){

		var eventCollection = this.get("eventCollection");

		//getting current event
		var current = eventCollection.getCurrent();
		this.set("currentEvent", current);
	}
});

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
},{}],12:[function(require,module,exports){
module.exports = "<h2>summary : <%= summary %></h2>\n\n<h3>description : <%= description %></h3>\n\n<h3>start : <%= start.formatted %></h3>\n\n<h3>end : <%= end.formatted %></h3>";

},{}],13:[function(require,module,exports){
module.exports = "<button id=\"close\">close</button>\n<div id=\"event-list\"></div> ";

},{}],14:[function(require,module,exports){
module.exports = "<div id=\"splash-page\"></div>\n\n<div id=\"room-single\"></div>\n\n<!-- TEST -->\n<div class=\"test\" style=\"position:absolute;top:0;\">\n\t<div>\n\t\t<input id=\"hex-input\" type=\"text\"></input>\n\t\t<button id=\"hex\">hex</button>\n\t</div>\n\t<button id=\"test\">test</button>\n\t<input class=\"color\" type=\"color\" name=\"favcolor\">\n</div>";

},{}],15:[function(require,module,exports){
module.exports = "<% _.each( rooms, function( data, key ){ %>\n\t<div class=\"room-container\">\n\t\t<section id=\"room-<%= key %>\" class=\"room\" data-id=\"<%= key %>\">\n\t\t\t<div class=\"number\"><%= key %></div>\n\t\t\t<div class=\"graph\"></div>\n\t\t\t<div class=\"person\"><%= data.organizer %></div>\n\t\t</section>\n\t</div>\n<% }); %>";

},{}],16:[function(require,module,exports){
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
},{"models/state":9}],17:[function(require,module,exports){
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
},{"templates/calendarItem.html":12}],18:[function(require,module,exports){
var CalendarItem 	= require("views/calendarItem");
var CalendarItemModel 	= require("models/calendarItemModel");
var AppRouter 		= require( "controllers/appRouter" );

var CalendarSingle = Marionette.LayoutView.extend({
	template : _.template( require("templates/calendarSingle.html") ),
	regions : {
		eventList : "#event-list"
	},
	ui : {
		closeButton : "#close"
	},
	events : {
		'click @ui.closeButton' : "onClose"
	},
	initialize : function(){

		this.collectionView = new Marionette.CollectionView({
			childView : CalendarItem,
			collection : this.model.get("eventCollection")
		});

		this.listenTo( this.model, "change:roomData", this.updateEvents );
		this.updateEvents();
	},
	onShow : function(){

		this.getRegion( "eventList" ).show( this.collectionView );
		
	},
	onClose : function(){

		AppRouter.navigate("/", {trigger: true});
	},
	updateEvents : function(){

		var roomData = this.model.get("roomData");
		var newModels = [];

		_.each( roomData.items, function( item ){

			var m = new CalendarItemModel( item );
			newModels.push( m );
		}, this);

		this.collectionView.collection.reset( newModels );

		this.model.set("roomData", roomData);
	}
});

module.exports = CalendarSingle;
},{"controllers/appRouter":3,"models/calendarItemModel":7,"templates/calendarSingle.html":13,"views/calendarItem":17}],19:[function(require,module,exports){
var AppRouter 		= require( "controllers/appRouter" );

var calendarLoad = require("controllers/calendarLoad");
var CalendarSingle 	= require("views/calendarSingle");
var CalendarModel 	= require("models/calendarModel");
var CalendarCollection 	= require("collections/calendarCollection");
var SplashView 	= require("views/splashView");

var hueConnect = require("controllers/hueConnect");
var LightPattern = require("controllers/lightPattern");
var roomData = require("roomData");

var CalendarView = Marionette.LayoutView.extend({
	template : _.template( require("templates/calendarWrapper.html") ),
	regions : {
		roomSingle : "#room-single",
		splashPage : "#splash-page"
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
		"click @ui.room" : function( e ){
			var key = $( e.currentTarget ).data("id");
			AppRouter.navigate("room/"+key, {trigger: true});
		}
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

		this._splashView = new SplashView({ model : new Backbone.Model({ rooms : {} }) }) ;

		this.getRegion("splashPage").show( this._splashView );

		this.listenTo( AppRouter, "route:roomRoute", function( key ){
			
			this.showRoom( key );
		});
		this.listenTo( AppRouter, "route:defaultRoute", this.showSplit );
	},
	showSplit : function(){

		var $splitEl = this.getRegion( "splashPage" ).$el;
		var $singleEl = this.getRegion( "roomSingle" ).$el;

		$splitEl.show();
		$singleEl.hide();
	},
	showRoom : function( key ){

		var $splitEl = this.getRegion( "splashPage" ).$el;
		
		var model = this.calendarStore[ key ];

		if( !model ){
			this.queuedKey = key;
		} else {
			
			var view = new CalendarSingle({ model : model })
			var region = this.getRegion( "roomSingle" ).show( view );
			$singleEl = region.$el;

			$singleEl.show();
			$splitEl.hide();
		}
	},
	checkQueue : function(){

		if( this.queuedKey ){
			this.showRoom( this.queuedKey );
		}
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
		
		if(  !this.calendarStore[ key ] ){

			this.calendarStore[ key ] = new CalendarModel({
				key : key,
				eventCollection : new CalendarCollection()
			});
			this._splashView.addRoom( this.calendarStore[ key ] );
		} 

		this.calendarStore[ key ].set("roomData", data.data);

		this.checkQueue();
	} 
});


module.exports = CalendarView;                    
    
 
},{"collections/calendarCollection":2,"controllers/appRouter":3,"controllers/calendarLoad":4,"controllers/hueConnect":5,"controllers/lightPattern":6,"models/calendarModel":8,"roomData":11,"templates/calendarWrapper.html":14,"views/calendarSingle":18,"views/splashView":20}],20:[function(require,module,exports){
var SplashView = Marionette.LayoutView.extend({
	id : "room-split",
	template : _.template( require("templates/splashWrapper.html") ),
	addRoom : function( model ){
		var rooms = this.model.get("rooms");
		rooms[ model.get("key") ] = model.toJSON();
		this.render();
	}
});

module.exports = SplashView;
},{"templates/splashWrapper.html":15}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIuLi9wdWJsaWMvYXNzZXRzL2pzL3VzZXIvYXBwLmpzIiwiLi4vcHVibGljL2Fzc2V0cy9qcy91c2VyL2NvbGxlY3Rpb25zL2NhbGVuZGFyQ29sbGVjdGlvbi5qcyIsIi4uL3B1YmxpYy9hc3NldHMvanMvdXNlci9jb250cm9sbGVycy9hcHBSb3V0ZXIuanMiLCIuLi9wdWJsaWMvYXNzZXRzL2pzL3VzZXIvY29udHJvbGxlcnMvY2FsZW5kYXJMb2FkLmpzIiwiLi4vcHVibGljL2Fzc2V0cy9qcy91c2VyL2NvbnRyb2xsZXJzL2h1ZUNvbm5lY3QuanMiLCIuLi9wdWJsaWMvYXNzZXRzL2pzL3VzZXIvY29udHJvbGxlcnMvbGlnaHRQYXR0ZXJuLmpzIiwiLi4vcHVibGljL2Fzc2V0cy9qcy91c2VyL21vZGVscy9jYWxlbmRhckl0ZW1Nb2RlbC5qcyIsIi4uL3B1YmxpYy9hc3NldHMvanMvdXNlci9tb2RlbHMvY2FsZW5kYXJNb2RlbC5qcyIsIi4uL3B1YmxpYy9hc3NldHMvanMvdXNlci9tb2RlbHMvc3RhdGUuanMiLCIuLi9wdWJsaWMvYXNzZXRzL2pzL3VzZXIvcGlwZS5qcyIsIi4uL3B1YmxpYy9hc3NldHMvanMvdXNlci9yb29tRGF0YS5qcyIsIi4uL3B1YmxpYy9hc3NldHMvanMvdXNlci90ZW1wbGF0ZXMvY2FsZW5kYXJJdGVtLmh0bWwiLCIuLi9wdWJsaWMvYXNzZXRzL2pzL3VzZXIvdGVtcGxhdGVzL2NhbGVuZGFyU2luZ2xlLmh0bWwiLCIuLi9wdWJsaWMvYXNzZXRzL2pzL3VzZXIvdGVtcGxhdGVzL2NhbGVuZGFyV3JhcHBlci5odG1sIiwiLi4vcHVibGljL2Fzc2V0cy9qcy91c2VyL3RlbXBsYXRlcy9zcGxhc2hXcmFwcGVyLmh0bWwiLCIuLi9wdWJsaWMvYXNzZXRzL2pzL3VzZXIvdmlld3MvYXBwTGF5b3V0LmpzIiwiLi4vcHVibGljL2Fzc2V0cy9qcy91c2VyL3ZpZXdzL2NhbGVuZGFySXRlbS5qcyIsIi4uL3B1YmxpYy9hc3NldHMvanMvdXNlci92aWV3cy9jYWxlbmRhclNpbmdsZS5qcyIsIi4uL3B1YmxpYy9hc3NldHMvanMvdXNlci92aWV3cy9jYWxlbmRhcldyYXBwZXIuanMiLCIuLi9wdWJsaWMvYXNzZXRzL2pzL3VzZXIvdmlld3Mvc3BsYXNoVmlldy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25HQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ05BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDYkE7QUFDQTs7QUNEQTtBQUNBOztBQ0RBO0FBQ0E7O0FDREE7QUFDQTs7QUNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNkQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcktBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwid2luZG93LkNvbW1vbiA9IHtcblx0cGF0aCA6IHtcblx0XHRhc3NldHMgOiBcImFzc2V0cy9cIixcblx0XHRpbWcgOiBcImFzc2V0cy9pbWcvXCIsXG5cdFx0YXVkaW8gOiBcImFzc2V0cy9hdWRpby9cIlxuXHR9LFxuXHRzaXplcyA6e1xuXHRcdGZyYW1lIDogMTBcblx0fVxufTtcblxuLy9iYXNlXG52YXIgQXBwUm91dGVyIFx0XHQ9IHJlcXVpcmUoIFwiY29udHJvbGxlcnMvYXBwUm91dGVyXCIgKTtcbnZhciBBcHBMYXlvdXQgXHRcdD0gcmVxdWlyZSggXCJ2aWV3cy9hcHBMYXlvdXRcIiApO1xuXG4vL2N1c3RvbVxudmFyIENhbGVuZGFyV3JhcHBlclx0PSByZXF1aXJlKFwidmlld3MvY2FsZW5kYXJXcmFwcGVyXCIpO1xudmFyIHJvb21EYXRhID0gcmVxdWlyZShcInJvb21EYXRhXCIpO1xuXG4vL1RIRSBBUFBMSUNBVElPTlxudmFyIE15QXBwID0gTWFyaW9uZXR0ZS5BcHBsaWNhdGlvbi5leHRlbmQoe1xuXHRpbml0aWFsaXplIDogZnVuY3Rpb24oKXtcblx0XHRcblx0fSxcblx0b25TdGFydCA6IGZ1bmN0aW9uKCl7XG5cblx0XHRBcHBMYXlvdXQucmVuZGVyKCk7IFxuXG5cdFx0dmFyIG15Q2FsZW5kYXIgPSBuZXcgQ2FsZW5kYXJXcmFwcGVyKCB7IG1vZGVsIDogbmV3IEJhY2tib25lLk1vZGVsKHsgcm9vbXMgOiByb29tRGF0YSB9KSB9KTtcblx0XHRBcHBMYXlvdXQuZ2V0UmVnaW9uKFwibWFpblwiKS5zaG93KCBteUNhbGVuZGFyICk7XG5cblx0XHRCYWNrYm9uZS5oaXN0b3J5LnN0YXJ0KHtcblx0XHRcdHB1c2hTdGF0ZSA6IGZhbHNlXG5cdFx0fSk7XG5cdH0gXG59KTtcblxuXG5cbiQoZnVuY3Rpb24oKXtcblx0d2luZG93LmFwcCA9IG5ldyBNeUFwcCgpO1xuXHR3aW5kb3cuYXBwLnN0YXJ0KCk7IFxufSk7XG5cblxuXG5cblxuXG5cbiAgICAgICAgICIsInZhciBDYWxlbmRhckNvbGxlY3Rpb24gPSBCYWNrYm9uZS5Db2xsZWN0aW9uLmV4dGVuZCh7XG5cdGluaXRpYWxpemUgOiBmdW5jdGlvbigpe1xuXG5cdH0sXG5cdGNvbXBhcmF0b3IgOiBmdW5jdGlvbiggYSwgYiApe1xuXHRcdHZhciBhVGltZSA9IGEuZ2V0KFwic3RhcnRcIikucmF3O1xuXHRcdHZhciBiVGltZSA9IGIuZ2V0KFwic3RhcnRcIikucmF3O1xuXHRcdHJldHVybiBhVGltZSAtIGJUaW1lO1xuXHR9LFxuXHRnZXRDdXJyZW50IDogZnVuY3Rpb24oKXtcblxuXHRcdHJldHVybiB0aGlzLmZpbmQoZnVuY3Rpb24oIG1vZGVsICl7XG5cblx0XHRcdHJldHVybiBtb2RlbC5pc0FjdGl2ZSgpO1xuXHRcdH0pO1xuXHR9XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBDYWxlbmRhckNvbGxlY3Rpb247IiwidmFyIE15QXBwUm91dGVyID0gTWFyaW9uZXR0ZS5BcHBSb3V0ZXIuZXh0ZW5kKHtcblx0Y29udHJvbGxlciA6IHtcblx0XHRcImRlZmF1bHRSb3V0ZVwiIDogZnVuY3Rpb24oKXt9LFxuXHRcdFwicm9vbVJvdXRlXCIgOiBmdW5jdGlvbigpe30sXG5cdH0sXG5cdGFwcFJvdXRlcyA6IHtcblx0XHRcInJvb20vOmtleVwiIDogXCJyb29tUm91dGVcIixcblx0XHRcIiphY3Rpb25zXCIgOiBcImRlZmF1bHRSb3V0ZVwiLFxuXHR9XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBuZXcgTXlBcHBSb3V0ZXIoKTtcbiIsInZhciBwaXBlID0gcmVxdWlyZShcInBpcGVcIik7XG5cbi8vbGlzdGVuaW5nIGZvciBsb2FkXG53aW5kb3cuaGFuZGxlQ2xpZW50TG9hZCA9IGZ1bmN0aW9uKCl7XG5cbiAgY29uc29sZS5sb2coXCJnb29nbGUgYXBpIGxvYWRlZFwiKTtcbiAgXy5kZWZlciggZnVuY3Rpb24oKXsgaW5pdCgpIH0pO1xufVxuXG52YXIgY2xpZW50SWQgPSAnNDMzODM5NzIzMzY1LXU3Z3JsZHR2ZjhwYWJqa2o0ZnJjaW8zY3Y1aGl0OGZtLmFwcHMuZ29vZ2xldXNlcmNvbnRlbnQuY29tJztcbnZhciBhcGlLZXkgPSAnQUl6YVN5QnNLZFRwbFJYdUV3Z3ZQU0hfZ0dGOE9Hc3czNXQxNXYwJztcbnZhciBzY29wZXMgPSAnaHR0cHM6Ly93d3cuZ29vZ2xlYXBpcy5jb20vYXV0aC9jYWxlbmRhcic7XG52YXIgcm9vbURhdGEgPSByZXF1aXJlKFwicm9vbURhdGFcIik7XG5cblxuLy9UT0RPIDogaW50ZWdyYXRlIGFsbCA0IGNhbGVuZGFyc1xuXG5mdW5jdGlvbiBpbml0KCl7XG5cdGdhcGkuY2xpZW50LnNldEFwaUtleShhcGlLZXkpO1xuXHRjaGVja0F1dGgoKTtcbn1cblxuZnVuY3Rpb24gY2hlY2tBdXRoKCl7XG5cdGdhcGkuYXV0aC5hdXRob3JpemUoIHtcblx0XHRjbGllbnRfaWQ6IGNsaWVudElkLCBcblx0XHRzY29wZTogc2NvcGVzLCBcblx0XHRpbW1lZGlhdGU6IGZhbHNlXG5cdH0sIGhhbmRsZUF1dGhSZXN1bHQgKTtcbn1cblxuZnVuY3Rpb24gaGFuZGxlQXV0aFJlc3VsdCggYXV0aFJlc3VsdCApe1xuXG5cdGlmKGF1dGhSZXN1bHQpe1xuXHRcdG1ha2VBcGlDYWxsKCk7XG5cdH1cbn1cblxuZnVuY3Rpb24gbWFrZUFwaUNhbGwoKSB7XG4gIGdhcGkuY2xpZW50LmxvYWQoJ2NhbGVuZGFyJywgJ3YzJywgZnVuY3Rpb24oKSB7XG4gICAgICBcbiAgICAgIHB1bGxSb29tcygpOyAgICAgICAgICBcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIHB1bGxSb29tcygpe1xuXG4gIHZhciBmcm9tID0gbmV3IERhdGUoKTtcbiAgdmFyIHRvID0gbmV3IERhdGUoKTtcbiAgICAgIHRvLnNldERhdGUoIHRvLmdldERhdGUoKSArIDEgKTtcblxuICBfLmVhY2goIHJvb21EYXRhLCBmdW5jdGlvbiggZGF0YSwga2V5ICl7XG5cbiAgICB2YXIgcmVxdWVzdCA9IGdhcGkuY2xpZW50LmNhbGVuZGFyLmV2ZW50cy5saXN0KHtcbiAgICAgICAgJ2NhbGVuZGFySWQnOiBkYXRhLmNhbGVuZGFySWQsXG4gICAgICAgIHRpbWVNaW4gOiBmcm9tLnRvSVNPU3RyaW5nKCksXG4gICAgICAgIHRpbWVNYXggOiB0by50b0lTT1N0cmluZygpLFxuICAgICAgICBzaW5nbGVFdmVudHMgOiB0cnVlXG4gICAgICB9KTtcblxuICAgICByZXF1ZXN0LnRoZW4oZnVuY3Rpb24ocmVzcG9uc2UpIHtcblxuICAgICAgICAgIGNvbnNvbGUubG9nKHJlc3BvbnNlLnJlc3VsdCk7XG4gICAgICAgICAgcm9vbUxvYWRlZCgga2V5LCByZXNwb25zZS5yZXN1bHQgKTtcbiAgICAgIH0sIGZ1bmN0aW9uKHJlYXNvbikge1xuXG4gICAgICAgICAgY29uc29sZS5sb2coJ0Vycm9yOiAnICsgcmVhc29uLnJlc3VsdC5lcnJvci5tZXNzYWdlKTtcbiAgICAgIH0pO1xuICB9KTtcbn1cblxuZnVuY3Rpb24gcm9vbUxvYWRlZCgga2V5LCBkYXRhICl7XG5cbiAgZXZlbnRzLnRyaWdnZXIoIFwiZXZlbnRzTG9hZGVkXCIsIHsga2V5IDoga2V5LCBkYXRhIDogZGF0YSB9ICk7XG59XG5cbnZhciBldmVudHMgPSBfLmV4dGVuZCh7fSwgQmFja2JvbmUuRXZlbnRzKTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cbiAgZXZlbnRzIDogZXZlbnRzXG59O1xuIiwidmFyIG15U29ja2V0ID0gbnVsbDtcbnZhciBjb25uZWN0ZWQgPSBmYWxzZTtcblxuZnVuY3Rpb24gaW5pdCgpe1xuXG5cdG15U29ja2V0ID0gaW8uY29ubmVjdCgnLy9sb2NhbGhvc3Q6MzAwMCcpO1xuXHRteVNvY2tldC5vbignY29ubmVjdCcsIGZ1bmN0aW9uKCl7XG5cdFx0Y29ubmVjdGVkID0gdHJ1ZTtcblx0fSk7XHRcbn1cblxuZnVuY3Rpb24gdXBkYXRlKCBkYXRhICl7XG5cblx0aWYoY29ubmVjdGVkKXtcblx0XHRteVNvY2tldC5lbWl0KCAndXBkYXRlX2RhdGEnLCBkYXRhICk7XHRcblx0fVxufVxuXG4vLyB2YXIgdGhyb3R0bGVkVXBkYXRlID0gXy50aHJvdHRsZSggdXBkYXRlLCA1MDAsIHtsZWFkaW5nOiBmYWxzZX0gKTtcblxuaW5pdCgpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblx0aW5pdCA6IGluaXQsXG5cdHVwZGF0ZSA6IHVwZGF0ZSxcblx0Y29ubmVjdGVkIDogY29ubmVjdGVkXG59IiwidmFyIGh1ZUNvbm5lY3QgPSByZXF1aXJlKFwiY29udHJvbGxlcnMvaHVlQ29ubmVjdFwiKTtcblxuZnVuY3Rpb24gTGlnaHRQYXR0ZXJuKCBsaWdodElkLCBwYXR0ZXJuSWQgKXtcblxuXHR0aGlzLl9oc2wgPSB7XG5cdFx0aCA6IDAsXG5cdFx0cyA6IDAsXG5cdFx0bCA6IDBcblx0fVxuXG5cdHRoaXMuX2xpZ2h0SWQgPSBsaWdodElkO1xuXHR0aGlzLl9wYXR0ZXJuSWQgPSBwYXR0ZXJuSWQ7XG5cblx0dGhpcy5fc3RlcCA9IDA7XG5cdHRoaXMuX2l0ZXJhdGlvbiA9IDA7XG5cdHRoaXMuX3JlcGVhdCA9IHBhdHRlcm5zWyB0aGlzLl9wYXR0ZXJuSWQgXS5yZXBlYXQ7XG5cblx0dGhpcy5fc2VxdWVuY2UgPSB0aGlzLnN0YXJ0U2VxdWVuY2UoIHRoaXMuX3BhdHRlcm5JZCApO1xuXG5cdHRoaXMuX3RpbWVvdXQgPSBudWxsO1xufVxuXG5MaWdodFBhdHRlcm4ucHJvdG90eXBlID0ge1xuXHRzdGFydFNlcXVlbmNlIDogZnVuY3Rpb24oIGlkICl7XG5cblx0XHR0aGlzLl9zZXF1ZW5jZSA9IHBhdHRlcm5zWyBpZCBdLnNlcXVlbmNlO1xuXG5cdFx0dGhpcy5zdG9wU2VxdWVuY2UoKTtcblx0XHR0aGlzLnBsYXlTZXF1ZW5jZVN0ZXAoMCk7XG5cblx0XHRyZXR1cm4gdGhpcy5fc2VxdWVuY2U7XG5cdH0sXG5cdHN0b3BTZXF1ZW5jZSA6IGZ1bmN0aW9uKCl7XG5cblx0XHR0aGlzLl9zdGVwID0gMDtcblx0XHR0aGlzLl9pdGVyYXRpb24gPSAwO1xuXG5cdFx0d2luZG93LmNsZWFyVGltZW91dCggdGhpcy5fdGltZW91dCApO1xuXHR9LFxuXHRwbGF5U2VxdWVuY2VTdGVwOiBmdW5jdGlvbiggc3RlcCApe1xuXG5cdFx0dGhpcy5fc3RlcCA9IHN0ZXA7XG5cblx0XHR2YXIgc2VnbWVudCA9IHRoaXMuX3NlcXVlbmNlW3RoaXMuX3N0ZXBdO1xuXG5cdFx0dmFyIGNvbG9yID0gb25lLmNvbG9yKCBzZWdtZW50LmNvbG9yICk7XG5cdFx0dmFyIGZhZGUgPSBzZWdtZW50LmZhZGU7XG5cdFx0dmFyIHdhaXQgPSBzZWdtZW50LndhaXQ7XG5cblx0XHR2YXIgaHNsID0ge1xuXHRcdFx0aCA6IE1hdGguZmxvb3IoIGNvbG9yLmgoKSAqIDM2MCksIFxuXHRcdFx0cyA6IE1hdGguZmxvb3IoIGNvbG9yLnMoKSAqIDEwMCksXG5cdFx0XHRsIDogTWF0aC5mbG9vciggY29sb3IubCgpICogMTAwKSBcblx0XHR9O1xuXG5cdFx0aHVlQ29ubmVjdC51cGRhdGUoW3tcblx0XHRcdGlkIDogdGhpcy5fbGlnaHRJZCxcblx0XHRcdGRhdGEgOiB7XG5cdFx0XHRcdGhzbCA6IGhzbCxcblx0XHRcdFx0ZHVyYXRpb24gOiBmYWRlXG5cdFx0XHR9XG5cdFx0fV0pO1xuXG5cdFx0d2luZG93LmNsZWFyVGltZW91dCggdGhpcy5fdGltZW91dCApO1xuXHRcdHRoaXMuX3RpbWVvdXQgPSB3aW5kb3cuc2V0VGltZW91dCgkLnByb3h5KHRoaXMubmV4dFNlcXVlbmNlU3RlcCwgdGhpcyksIHdhaXQqMTAwMCk7XG5cdH0sXG5cdG5leHRTZXF1ZW5jZVN0ZXA6IGZ1bmN0aW9uKCl7XG5cblx0XHR2YXIgdG90YWxTdGVwcyA9IHRoaXMuX3NlcXVlbmNlLmxlbmd0aDtcblx0XHR2YXIgcmVwZWF0ID0gdGhpcy5fcmVwZWF0O1xuXG5cdFx0dGhpcy5fc3RlcCArKztcblx0XHRpZih0aGlzLl9zdGVwID4gdG90YWxTdGVwcyAtIDEpIHtcblx0XHRcdHRoaXMuX3N0ZXAgPSAwO1xuXHRcdFx0dGhpcy5faXRlcmF0aW9uICsrO1xuXHRcdH1cblxuXHRcdGlmKHJlcGVhdCA+IC0xICYmIHRoaXMuX2l0ZXJhdGlvbiA+IHJlcGVhdCkge1xuXHRcdFx0dGhpcy5zdG9wU2VxdWVuY2UoKTtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHR0aGlzLnBsYXlTZXF1ZW5jZVN0ZXAoIHRoaXMuX3N0ZXAgKTtcblx0fVxufVxuXG52YXIgcGF0dGVybnMgPSB7XG5cdCd0ZXN0JyA6IHtcblx0XHRyZXBlYXQgOiAgLTEsXG5cdFx0c2VxdWVuY2UgOiBbXG5cdFx0XHR7IGNvbG9yIDogXCIjRkIxOTExXCIsIGZhZGUgOiAxLCB3YWl0IDogMSB9LFxuXHRcdFx0eyBjb2xvciA6IFwiIzAwZmYwMFwiLCBmYWRlIDogMSwgd2FpdCA6IDEgfSxcblx0XHRcdHsgY29sb3IgOiBcIiM0MTU2RkZcIiwgZmFkZSA6IDEsIHdhaXQgOiAxIH0sXG5cdFx0XHR7IGNvbG9yIDogXCIjRkYwMDFEXCIsIGZhZGUgOiAxLCB3YWl0IDogMSB9LFxuXHRcdFx0eyBjb2xvciA6IFwiI0ZGRkYwN1wiLCBmYWRlIDogMSwgd2FpdCA6IDEgfSxcblx0XHRdXG5cdH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBMaWdodFBhdHRlcm47IiwidmFyIENhbGVuZGFySXRlbU1vZGVsID0gQmFja2JvbmUuTW9kZWwuZXh0ZW5kKHtcblx0ZGVmYXVsdHMgOiB7XG5cdFx0c3VtbWFyeSA6IFwibi9hXCIsXG5cdFx0ZGVzY3JpcHRpb24gOiBcIm4vYVwiLFxuXHRcdHN0YXJ0IDogXCJuL2FcIixcblx0XHRlbmQgOiBcIm4vYVwiLFxuXHR9LFxuXHRpbml0aWFsaXplIDogZnVuY3Rpb24oKXtcblxuXHRcdHRoaXMuY29udmVydERhdGUoXCJzdGFydFwiKTtcblx0XHR0aGlzLmNvbnZlcnREYXRlKFwiZW5kXCIpO1xuXHR9LFxuXHRjb252ZXJ0RGF0ZSA6IGZ1bmN0aW9uKCBrZXkgKXtcblx0XHQvL2NvbnZlcnQgZGF0YXNcblx0XHR2YXIgZGF0ZVN0cmluZyA9IHRoaXMuZ2V0KCBrZXkgKVxuXHRcdGlmKCFkYXRlU3RyaW5nKSByZXR1cm47XG5cdFx0XG5cdFx0ZGF0ZVN0cmluZyA9IGRhdGVTdHJpbmcuZGF0ZVRpbWU7XG5cdFx0dmFyIG5vdyA9IG5ldyBEYXRlKCk7XG5cdFx0dmFyIGRhdGUgPSBuZXcgRGF0ZSggZGF0ZVN0cmluZyApO1xuXG5cdFx0dGhpcy5zZXQoIGtleSwge1xuXHRcdFx0cmF3IDogZGF0ZSxcblx0XHRcdGZvcm1hdHRlZCA6IGRhdGUudG9TdHJpbmcoKVxuXHRcdH0pO1xuXHR9LFxuXHRpc0FjdGl2ZSA6IGZ1bmN0aW9uKCl7XG5cdFx0IHZhciBzdGFydCA9IHRoaXMuZ2V0KFwic3RhcnRcIik7XG5cdFx0IHZhciBlbmQgPSB0aGlzLmdldChcImVuZFwiKTtcblx0XHQgdmFyIG5vdyA9IG5ldyBEYXRlKCk7XG5cblx0XHQgaWYoIG5vdyA+IHN0YXJ0ICYmIG5vdyA8IGVuZCApe1xuXHRcdCBcdHJldHVybiB0cnVlO1xuXHRcdCB9XG5cblx0XHQgcmV0dXJuIGZhbHNlO1xuXHR9XG59KVxuXG5tb2R1bGUuZXhwb3J0cyA9IENhbGVuZGFySXRlbU1vZGVsOyIsInZhciBDYWxlbmRhck1vZGVsID0gQmFja2JvbmUuTW9kZWwuZXh0ZW5kKHtcblx0Y2hlY2tDYWxlbmRhclJhdGUgOiAxMDAwLFxuXHRkZWZhdWx0cyA6IHtcblx0XHRvcmdhbml6ZXIgOiBcIldlc1wiXG5cdH0sXG5cdGluaXRpYWxpemUgOiBmdW5jdGlvbigpe1xuXHRcdF8uYmluZEFsbCggdGhpcywgXCJjaGVja0NhbGVuZGFyXCIgKTtcblx0XHRzZXRJbnRlcnZhbCggdGhpcy5jaGVja0NhbGVuZGFyLCB0aGlzLmNoZWNrQ2FsZW5kYXJSYXRlICk7XG5cdH0sXG5cdGNoZWNrQ2FsZW5kYXIgOiBmdW5jdGlvbigpe1xuXG5cdFx0dmFyIGV2ZW50Q29sbGVjdGlvbiA9IHRoaXMuZ2V0KFwiZXZlbnRDb2xsZWN0aW9uXCIpO1xuXG5cdFx0Ly9nZXR0aW5nIGN1cnJlbnQgZXZlbnRcblx0XHR2YXIgY3VycmVudCA9IGV2ZW50Q29sbGVjdGlvbi5nZXRDdXJyZW50KCk7XG5cdFx0dGhpcy5zZXQoXCJjdXJyZW50RXZlbnRcIiwgY3VycmVudCk7XG5cdH1cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IENhbGVuZGFyTW9kZWw7IiwidmFyIHN0YXRlID0gbmV3IChCYWNrYm9uZS5Nb2RlbC5leHRlbmQoe1xuXHRkZWZhdWx0cyA6IHtcblx0XHQvLyBcIm5hdl9vcGVuXCIgXHRcdDogZmFsc2UsXG5cdFx0Ly8gJ3Njcm9sbF9hdF90b3AnIDogdHJ1ZSxcblx0XHQvLyAnbWluaW1hbF9uYXYnIFx0OiBmYWxzZSxcblx0XHQvLyAnZnVsbF9uYXZfb3BlbidcdDogZmFsc2UsXG5cdFx0Ly8gJ3VpX2Rpc3BsYXknXHQ6IGZhbHNlXG5cdH1cbn0pKSgpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHN0YXRlO1xuIiwidmFyIHBpcGUgPSBfLmV4dGVuZCh7XG5cblx0XG5cdFxufSwgQmFja2JvbmUuRXZlbnRzKTtcblxubW9kdWxlLmV4cG9ydHMgPSBwaXBlOyIsIm1vZHVsZS5leHBvcnRzID0ge1xuXHQnMSc6IHtcblx0XHQnY2FsZW5kYXJJZCcgOiBcImItcmVlbC5jb21fMmQzMjM4MzczOTM2MzYzMjMyMzczODMxQHJlc291cmNlLmNhbGVuZGFyLmdvb2dsZS5jb21cIlxuXHR9LFxuXHQnMic6IHtcblx0XHQnY2FsZW5kYXJJZCcgOiBcImItcmVlbC5jb21fMmQzMTMyMzczNzM4MzgzMzM0MmQzMjM0MzJAcmVzb3VyY2UuY2FsZW5kYXIuZ29vZ2xlLmNvbVwiXG5cdH0sXG5cdCczJzoge1xuXHRcdCdjYWxlbmRhcklkJyA6IFwiYi1yZWVsLmNvbV8zMTM2MzUzMzM5MzYzMTM5MzkzMzM4QHJlc291cmNlLmNhbGVuZGFyLmdvb2dsZS5jb21cIlxuXHR9LFxuXHQnNSc6IHtcblx0XHQnY2FsZW5kYXJJZCcgOiBcImItcmVlbC5jb21fMmQzNDM0MzIzODM5MzYzNzMwMmQzNjM0MzNAcmVzb3VyY2UuY2FsZW5kYXIuZ29vZ2xlLmNvbVwiXG5cdH1cbn07IiwibW9kdWxlLmV4cG9ydHMgPSBcIjxoMj5zdW1tYXJ5IDogPCU9IHN1bW1hcnkgJT48L2gyPlxcblxcbjxoMz5kZXNjcmlwdGlvbiA6IDwlPSBkZXNjcmlwdGlvbiAlPjwvaDM+XFxuXFxuPGgzPnN0YXJ0IDogPCU9IHN0YXJ0LmZvcm1hdHRlZCAlPjwvaDM+XFxuXFxuPGgzPmVuZCA6IDwlPSBlbmQuZm9ybWF0dGVkICU+PC9oMz5cIjtcbiIsIm1vZHVsZS5leHBvcnRzID0gXCI8YnV0dG9uIGlkPVxcXCJjbG9zZVxcXCI+Y2xvc2U8L2J1dHRvbj5cXG48ZGl2IGlkPVxcXCJldmVudC1saXN0XFxcIj48L2Rpdj4gXCI7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IFwiPGRpdiBpZD1cXFwic3BsYXNoLXBhZ2VcXFwiPjwvZGl2PlxcblxcbjxkaXYgaWQ9XFxcInJvb20tc2luZ2xlXFxcIj48L2Rpdj5cXG5cXG48IS0tIFRFU1QgLS0+XFxuPGRpdiBjbGFzcz1cXFwidGVzdFxcXCIgc3R5bGU9XFxcInBvc2l0aW9uOmFic29sdXRlO3RvcDowO1xcXCI+XFxuXFx0PGRpdj5cXG5cXHRcXHQ8aW5wdXQgaWQ9XFxcImhleC1pbnB1dFxcXCIgdHlwZT1cXFwidGV4dFxcXCI+PC9pbnB1dD5cXG5cXHRcXHQ8YnV0dG9uIGlkPVxcXCJoZXhcXFwiPmhleDwvYnV0dG9uPlxcblxcdDwvZGl2PlxcblxcdDxidXR0b24gaWQ9XFxcInRlc3RcXFwiPnRlc3Q8L2J1dHRvbj5cXG5cXHQ8aW5wdXQgY2xhc3M9XFxcImNvbG9yXFxcIiB0eXBlPVxcXCJjb2xvclxcXCIgbmFtZT1cXFwiZmF2Y29sb3JcXFwiPlxcbjwvZGl2PlwiO1xuIiwibW9kdWxlLmV4cG9ydHMgPSBcIjwlIF8uZWFjaCggcm9vbXMsIGZ1bmN0aW9uKCBkYXRhLCBrZXkgKXsgJT5cXG5cXHQ8ZGl2IGNsYXNzPVxcXCJyb29tLWNvbnRhaW5lclxcXCI+XFxuXFx0XFx0PHNlY3Rpb24gaWQ9XFxcInJvb20tPCU9IGtleSAlPlxcXCIgY2xhc3M9XFxcInJvb21cXFwiIGRhdGEtaWQ9XFxcIjwlPSBrZXkgJT5cXFwiPlxcblxcdFxcdFxcdDxkaXYgY2xhc3M9XFxcIm51bWJlclxcXCI+PCU9IGtleSAlPjwvZGl2PlxcblxcdFxcdFxcdDxkaXYgY2xhc3M9XFxcImdyYXBoXFxcIj48L2Rpdj5cXG5cXHRcXHRcXHQ8ZGl2IGNsYXNzPVxcXCJwZXJzb25cXFwiPjwlPSBkYXRhLm9yZ2FuaXplciAlPjwvZGl2PlxcblxcdFxcdDwvc2VjdGlvbj5cXG5cXHQ8L2Rpdj5cXG48JSB9KTsgJT5cIjtcbiIsInZhciBTdGF0ZSBcdFx0PSByZXF1aXJlKFwibW9kZWxzL3N0YXRlXCIpO1xuXG52YXIgTXlBcHBMYXlvdXQgPSBNYXJpb25ldHRlLkxheW91dFZpZXcuZXh0ZW5kKHtcblx0ZWwgOiBcIiNjb250ZW50XCIsXG5cdHRlbXBsYXRlIDogZmFsc2UsXG5cdHJlZ2lvbnMgOiB7XG5cdFx0bWFpbiA6IFwiI21haW5cIlxuXHR9LCBcblx0aW5pdGlhbGl6ZSA6IGZ1bmN0aW9uKCl7XG5cdFx0dmFyIF90aGlzID0gdGhpcztcblxuXHRcdC8vd3JhcHBpbmcgaHRtbFxuXHRcdHRoaXMuJGh0bWwgPSAkKFwiaHRtbFwiKTtcblx0XHR0aGlzLiRodG1sLnJlbW92ZUNsYXNzKFwiaGlkZGVuXCIpO1xuXG5cdFx0Ly9yZXNpemUgZXZlbnRzXG5cdFx0JCh3aW5kb3cpLnJlc2l6ZShmdW5jdGlvbigpe1xuXHRcdFx0X3RoaXMub25SZXNpemVXaW5kb3coKTtcblx0XHR9KS5yZXNpemUoKTtcblxuXHRcdHRoaXMubGlzdGVuRm9yU3RhdGUoKTtcblx0fSxcblx0bGlzdGVuRm9yU3RhdGUgOiBmdW5jdGlvbigpe1xuXHRcdC8vc3RhdGUgY2hhbmdlXG5cdFx0dGhpcy5saXN0ZW5UbyggU3RhdGUsIFwiY2hhbmdlXCIsIGZ1bmN0aW9uKCBlICl7XG5cblx0XHRcdHRoaXMub25TdGF0ZUNoYW5nZSggZS5jaGFuZ2VkLCBlLl9wcmV2aW91c0F0dHJpYnV0ZXMgKTtcblx0XHR9LCB0aGlzKTtcblx0XHR0aGlzLm9uU3RhdGVDaGFuZ2UoIFN0YXRlLnRvSlNPTigpICk7XG5cdH0sXG5cdG9uU3RhdGVDaGFuZ2UgOiBmdW5jdGlvbiggY2hhbmdlZCwgcHJldmlvdXMgKXtcblxuXHRcdF8uZWFjaCggY2hhbmdlZCwgZnVuY3Rpb24odmFsdWUsIGtleSl7XG5cdFx0XHRcblx0XHRcdGlmKCBfLmlzQm9vbGVhbiggdmFsdWUgKSApe1xuXHRcdFx0XHR0aGlzLiRodG1sLnRvZ2dsZUNsYXNzKFwic3RhdGUtXCIra2V5LCB2YWx1ZSk7XG5cdFx0XHRcdHRoaXMuJGh0bWwudG9nZ2xlQ2xhc3MoXCJzdGF0ZS1ub3QtXCIra2V5LCAhdmFsdWUpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0dmFyIHByZXZWYWx1ZSA9IHByZXZpb3VzWyBrZXkgXTtcblx0XHRcdFx0aWYocHJldlZhbHVlKXtcblx0XHRcdFx0XHR0aGlzLiRodG1sLnRvZ2dsZUNsYXNzKFwic3RhdGUtXCIra2V5K1wiLVwiK3ByZXZWYWx1ZSwgZmFsc2UpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHRoaXMuJGh0bWwudG9nZ2xlQ2xhc3MoXCJzdGF0ZS1cIitrZXkrXCItXCIrdmFsdWUsIHRydWUpO1xuXHRcdFx0fVxuXG5cdFx0fSwgdGhpcyApO1xuXHR9LFxuXHRvblJlc2l6ZVdpbmRvdyA6IGZ1bmN0aW9uKCl7XG5cdFx0Q29tbW9uLnd3ID0gJCh3aW5kb3cpLndpZHRoKCk7XG5cdFx0Q29tbW9uLndoID0gJCh3aW5kb3cpLmhlaWdodCgpO1xuXHR9XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBuZXcgTXlBcHBMYXlvdXQoKTsiLCJ2YXIgQ2FsZW5kYXJJdGVtID0gTWFyaW9uZXR0ZS5JdGVtVmlldy5leHRlbmQoe1xuXHRjbGFzc05hbWUgOiBcIml0ZW1cIixcblx0dGVtcGxhdGUgOiBfLnRlbXBsYXRlKCByZXF1aXJlKFwidGVtcGxhdGVzL2NhbGVuZGFySXRlbS5odG1sXCIpICksXG5cdHVpIDoge1xuXHRcdCd0aXRsZScgOiBcImgyXCJcblx0fSxcblx0ZXZlbnRzIDoge1xuXHRcdCdjbGljayBAdWkudGl0bGUnIDogZnVuY3Rpb24oKXtcblxuXG5cdFx0fVxuXHR9XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBDYWxlbmRhckl0ZW07IiwidmFyIENhbGVuZGFySXRlbSBcdD0gcmVxdWlyZShcInZpZXdzL2NhbGVuZGFySXRlbVwiKTtcbnZhciBDYWxlbmRhckl0ZW1Nb2RlbCBcdD0gcmVxdWlyZShcIm1vZGVscy9jYWxlbmRhckl0ZW1Nb2RlbFwiKTtcbnZhciBBcHBSb3V0ZXIgXHRcdD0gcmVxdWlyZSggXCJjb250cm9sbGVycy9hcHBSb3V0ZXJcIiApO1xuXG52YXIgQ2FsZW5kYXJTaW5nbGUgPSBNYXJpb25ldHRlLkxheW91dFZpZXcuZXh0ZW5kKHtcblx0dGVtcGxhdGUgOiBfLnRlbXBsYXRlKCByZXF1aXJlKFwidGVtcGxhdGVzL2NhbGVuZGFyU2luZ2xlLmh0bWxcIikgKSxcblx0cmVnaW9ucyA6IHtcblx0XHRldmVudExpc3QgOiBcIiNldmVudC1saXN0XCJcblx0fSxcblx0dWkgOiB7XG5cdFx0Y2xvc2VCdXR0b24gOiBcIiNjbG9zZVwiXG5cdH0sXG5cdGV2ZW50cyA6IHtcblx0XHQnY2xpY2sgQHVpLmNsb3NlQnV0dG9uJyA6IFwib25DbG9zZVwiXG5cdH0sXG5cdGluaXRpYWxpemUgOiBmdW5jdGlvbigpe1xuXG5cdFx0dGhpcy5jb2xsZWN0aW9uVmlldyA9IG5ldyBNYXJpb25ldHRlLkNvbGxlY3Rpb25WaWV3KHtcblx0XHRcdGNoaWxkVmlldyA6IENhbGVuZGFySXRlbSxcblx0XHRcdGNvbGxlY3Rpb24gOiB0aGlzLm1vZGVsLmdldChcImV2ZW50Q29sbGVjdGlvblwiKVxuXHRcdH0pO1xuXG5cdFx0dGhpcy5saXN0ZW5UbyggdGhpcy5tb2RlbCwgXCJjaGFuZ2U6cm9vbURhdGFcIiwgdGhpcy51cGRhdGVFdmVudHMgKTtcblx0XHR0aGlzLnVwZGF0ZUV2ZW50cygpO1xuXHR9LFxuXHRvblNob3cgOiBmdW5jdGlvbigpe1xuXG5cdFx0dGhpcy5nZXRSZWdpb24oIFwiZXZlbnRMaXN0XCIgKS5zaG93KCB0aGlzLmNvbGxlY3Rpb25WaWV3ICk7XG5cdFx0XG5cdH0sXG5cdG9uQ2xvc2UgOiBmdW5jdGlvbigpe1xuXG5cdFx0QXBwUm91dGVyLm5hdmlnYXRlKFwiL1wiLCB7dHJpZ2dlcjogdHJ1ZX0pO1xuXHR9LFxuXHR1cGRhdGVFdmVudHMgOiBmdW5jdGlvbigpe1xuXG5cdFx0dmFyIHJvb21EYXRhID0gdGhpcy5tb2RlbC5nZXQoXCJyb29tRGF0YVwiKTtcblx0XHR2YXIgbmV3TW9kZWxzID0gW107XG5cblx0XHRfLmVhY2goIHJvb21EYXRhLml0ZW1zLCBmdW5jdGlvbiggaXRlbSApe1xuXG5cdFx0XHR2YXIgbSA9IG5ldyBDYWxlbmRhckl0ZW1Nb2RlbCggaXRlbSApO1xuXHRcdFx0bmV3TW9kZWxzLnB1c2goIG0gKTtcblx0XHR9LCB0aGlzKTtcblxuXHRcdHRoaXMuY29sbGVjdGlvblZpZXcuY29sbGVjdGlvbi5yZXNldCggbmV3TW9kZWxzICk7XG5cblx0XHR0aGlzLm1vZGVsLnNldChcInJvb21EYXRhXCIsIHJvb21EYXRhKTtcblx0fVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gQ2FsZW5kYXJTaW5nbGU7IiwidmFyIEFwcFJvdXRlciBcdFx0PSByZXF1aXJlKCBcImNvbnRyb2xsZXJzL2FwcFJvdXRlclwiICk7XG5cbnZhciBjYWxlbmRhckxvYWQgPSByZXF1aXJlKFwiY29udHJvbGxlcnMvY2FsZW5kYXJMb2FkXCIpO1xudmFyIENhbGVuZGFyU2luZ2xlIFx0PSByZXF1aXJlKFwidmlld3MvY2FsZW5kYXJTaW5nbGVcIik7XG52YXIgQ2FsZW5kYXJNb2RlbCBcdD0gcmVxdWlyZShcIm1vZGVscy9jYWxlbmRhck1vZGVsXCIpO1xudmFyIENhbGVuZGFyQ29sbGVjdGlvbiBcdD0gcmVxdWlyZShcImNvbGxlY3Rpb25zL2NhbGVuZGFyQ29sbGVjdGlvblwiKTtcbnZhciBTcGxhc2hWaWV3IFx0PSByZXF1aXJlKFwidmlld3Mvc3BsYXNoVmlld1wiKTtcblxudmFyIGh1ZUNvbm5lY3QgPSByZXF1aXJlKFwiY29udHJvbGxlcnMvaHVlQ29ubmVjdFwiKTtcbnZhciBMaWdodFBhdHRlcm4gPSByZXF1aXJlKFwiY29udHJvbGxlcnMvbGlnaHRQYXR0ZXJuXCIpO1xudmFyIHJvb21EYXRhID0gcmVxdWlyZShcInJvb21EYXRhXCIpO1xuXG52YXIgQ2FsZW5kYXJWaWV3ID0gTWFyaW9uZXR0ZS5MYXlvdXRWaWV3LmV4dGVuZCh7XG5cdHRlbXBsYXRlIDogXy50ZW1wbGF0ZSggcmVxdWlyZShcInRlbXBsYXRlcy9jYWxlbmRhcldyYXBwZXIuaHRtbFwiKSApLFxuXHRyZWdpb25zIDoge1xuXHRcdHJvb21TaW5nbGUgOiBcIiNyb29tLXNpbmdsZVwiLFxuXHRcdHNwbGFzaFBhZ2UgOiBcIiNzcGxhc2gtcGFnZVwiXG5cdH0sXG5cdHVpIDoge1xuXHRcdGNvbG9yUGlja2VyIDogXCIuY29sb3JcIixcblx0XHR0ZXN0IDogXCIjdGVzdFwiLFxuXHRcdGhleEJ1dHRvbiA6IFwiI2hleFwiLFxuXHRcdGhleElucHV0IDogXCIjaGV4LWlucHV0XCIsXG5cdFx0cm9vbSA6IFwiLnJvb21cIlxuXHR9LFxuXHRldmVudHMgOiB7XG5cdFx0XCJjbGljayBAdWkudGVzdFwiIDogZnVuY3Rpb24oKXtcblx0XHRcdGZvciggdmFyIGkgPSAwIDsgaSA8IDUgOyBpKysgKXtcblx0XHRcdFx0bmV3IExpZ2h0UGF0dGVybihpKzEsIFwidGVzdFwiKTtcblx0XHRcdH1cblx0XHR9LFxuXHRcdFwiY2xpY2sgQHVpLmhleEJ1dHRvblwiIDogZnVuY3Rpb24oKXtcblx0XHRcdHZhciBjb2xvciA9IHRoaXMudWkuaGV4SW5wdXQudmFsKCk7XG5cdFx0XHR0aGlzLnRlc3RDb2xvciggY29sb3IgKTtcblx0XHR9LFxuXHRcdFwiY2xpY2sgQHVpLnJvb21cIiA6IGZ1bmN0aW9uKCBlICl7XG5cdFx0XHR2YXIga2V5ID0gJCggZS5jdXJyZW50VGFyZ2V0ICkuZGF0YShcImlkXCIpO1xuXHRcdFx0QXBwUm91dGVyLm5hdmlnYXRlKFwicm9vbS9cIitrZXksIHt0cmlnZ2VyOiB0cnVlfSk7XG5cdFx0fVxuXHR9LFxuXHRpbml0aWFsaXplIDogZnVuY3Rpb24oKXtcblx0XHRcblx0XHR0aGlzLmNhbGVuZGFyU3RvcmUgPSB7fTtcblx0XHR0aGlzLmxpc3RlblRvKCBjYWxlbmRhckxvYWQuZXZlbnRzLCBcImV2ZW50c0xvYWRlZFwiLCB0aGlzLmV2ZW50c0xvYWRlZCApO1xuXHRcdFxuXHR9LFxuXHRvblNob3cgOiBmdW5jdGlvbigpe1xuXG5cdFx0dmFyIGNvbG9yUGlja2VyID0gdGhpcy51aS5jb2xvclBpY2tlcjtcblx0XHR2YXIgX3RoaXMgPSB0aGlzO1xuXHRcdCQoY29sb3JQaWNrZXIpLmNoYW5nZShmdW5jdGlvbigpe1xuXHRcdFx0dmFyIHZhbCA9ICQodGhpcykudmFsKCk7XG5cdFx0XHRfdGhpcy50ZXN0Q29sb3IoIHZhbCApO1xuXHRcdH0pO1xuXG5cdFx0dGhpcy5fc3BsYXNoVmlldyA9IG5ldyBTcGxhc2hWaWV3KHsgbW9kZWwgOiBuZXcgQmFja2JvbmUuTW9kZWwoeyByb29tcyA6IHt9IH0pIH0pIDtcblxuXHRcdHRoaXMuZ2V0UmVnaW9uKFwic3BsYXNoUGFnZVwiKS5zaG93KCB0aGlzLl9zcGxhc2hWaWV3ICk7XG5cblx0XHR0aGlzLmxpc3RlblRvKCBBcHBSb3V0ZXIsIFwicm91dGU6cm9vbVJvdXRlXCIsIGZ1bmN0aW9uKCBrZXkgKXtcblx0XHRcdFxuXHRcdFx0dGhpcy5zaG93Um9vbSgga2V5ICk7XG5cdFx0fSk7XG5cdFx0dGhpcy5saXN0ZW5UbyggQXBwUm91dGVyLCBcInJvdXRlOmRlZmF1bHRSb3V0ZVwiLCB0aGlzLnNob3dTcGxpdCApO1xuXHR9LFxuXHRzaG93U3BsaXQgOiBmdW5jdGlvbigpe1xuXG5cdFx0dmFyICRzcGxpdEVsID0gdGhpcy5nZXRSZWdpb24oIFwic3BsYXNoUGFnZVwiICkuJGVsO1xuXHRcdHZhciAkc2luZ2xlRWwgPSB0aGlzLmdldFJlZ2lvbiggXCJyb29tU2luZ2xlXCIgKS4kZWw7XG5cblx0XHQkc3BsaXRFbC5zaG93KCk7XG5cdFx0JHNpbmdsZUVsLmhpZGUoKTtcblx0fSxcblx0c2hvd1Jvb20gOiBmdW5jdGlvbigga2V5ICl7XG5cblx0XHR2YXIgJHNwbGl0RWwgPSB0aGlzLmdldFJlZ2lvbiggXCJzcGxhc2hQYWdlXCIgKS4kZWw7XG5cdFx0XG5cdFx0dmFyIG1vZGVsID0gdGhpcy5jYWxlbmRhclN0b3JlWyBrZXkgXTtcblxuXHRcdGlmKCAhbW9kZWwgKXtcblx0XHRcdHRoaXMucXVldWVkS2V5ID0ga2V5O1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRcblx0XHRcdHZhciB2aWV3ID0gbmV3IENhbGVuZGFyU2luZ2xlKHsgbW9kZWwgOiBtb2RlbCB9KVxuXHRcdFx0dmFyIHJlZ2lvbiA9IHRoaXMuZ2V0UmVnaW9uKCBcInJvb21TaW5nbGVcIiApLnNob3coIHZpZXcgKTtcblx0XHRcdCRzaW5nbGVFbCA9IHJlZ2lvbi4kZWw7XG5cblx0XHRcdCRzaW5nbGVFbC5zaG93KCk7XG5cdFx0XHQkc3BsaXRFbC5oaWRlKCk7XG5cdFx0fVxuXHR9LFxuXHRjaGVja1F1ZXVlIDogZnVuY3Rpb24oKXtcblxuXHRcdGlmKCB0aGlzLnF1ZXVlZEtleSApe1xuXHRcdFx0dGhpcy5zaG93Um9vbSggdGhpcy5xdWV1ZWRLZXkgKTtcblx0XHR9XG5cdH0sXG5cdHRlc3RDb2xvciA6IGZ1bmN0aW9uKCBfY29sb3IgKXtcblxuXHRcdHZhciBjb2xvciA9IG9uZS5jb2xvciggX2NvbG9yICk7XG5cdFx0dmFyIGhzbCA9IHtcblx0XHRcdGggOiBNYXRoLmZsb29yKCBjb2xvci5oKCkgKiAzNjApLCBcblx0XHRcdHMgOiBNYXRoLmZsb29yKCBjb2xvci5zKCkgKiAxMDApLFxuXHRcdFx0bCA6IE1hdGguZmxvb3IoIGNvbG9yLmwoKSAqIDEwMCkgXG5cdFx0fTtcblx0XHRodWVDb25uZWN0LnVwZGF0ZShbXG5cdFx0XHR7XG5cdFx0XHRcdCdpZCcgOiAxLFxuXHRcdFx0XHQnZGF0YScgOiB7XG5cdFx0XHRcdFx0J2hzbCcgOiBoc2wsXG5cdFx0XHRcdFx0J2R1cmF0aW9uJyA6IDFcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0J2lkJyA6IDIsXG5cdFx0XHRcdCdkYXRhJyA6IHtcblx0XHRcdFx0XHQnaHNsJyA6IGhzbCxcblx0XHRcdFx0XHQnZHVyYXRpb24nIDogMVxuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHQnaWQnIDogMyxcblx0XHRcdFx0J2RhdGEnIDoge1xuXHRcdFx0XHRcdCdoc2wnIDogaHNsLFxuXHRcdFx0XHRcdCdkdXJhdGlvbicgOiAxXG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHR7XG5cdFx0XHRcdCdpZCcgOiA0LFxuXHRcdFx0XHQnZGF0YScgOiB7XG5cdFx0XHRcdFx0J2hzbCcgOiBoc2wsXG5cdFx0XHRcdFx0J2R1cmF0aW9uJyA6IDFcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0J2lkJyA6IDUsXG5cdFx0XHRcdCdkYXRhJyA6IHtcblx0XHRcdFx0XHQnaHNsJyA6IGhzbCxcblx0XHRcdFx0XHQnZHVyYXRpb24nIDogMVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XSk7XHRcdFxuXHR9LFxuXHRldmVudHNMb2FkZWQgOiBmdW5jdGlvbiggZGF0YSApe1xuXHRcdFxuXHRcdHZhciBrZXkgPSBkYXRhLmtleTtcblx0XHRcblx0XHRpZiggICF0aGlzLmNhbGVuZGFyU3RvcmVbIGtleSBdICl7XG5cblx0XHRcdHRoaXMuY2FsZW5kYXJTdG9yZVsga2V5IF0gPSBuZXcgQ2FsZW5kYXJNb2RlbCh7XG5cdFx0XHRcdGtleSA6IGtleSxcblx0XHRcdFx0ZXZlbnRDb2xsZWN0aW9uIDogbmV3IENhbGVuZGFyQ29sbGVjdGlvbigpXG5cdFx0XHR9KTtcblx0XHRcdHRoaXMuX3NwbGFzaFZpZXcuYWRkUm9vbSggdGhpcy5jYWxlbmRhclN0b3JlWyBrZXkgXSApO1xuXHRcdH0gXG5cblx0XHR0aGlzLmNhbGVuZGFyU3RvcmVbIGtleSBdLnNldChcInJvb21EYXRhXCIsIGRhdGEuZGF0YSk7XG5cblx0XHR0aGlzLmNoZWNrUXVldWUoKTtcblx0fSBcbn0pO1xuXG5cbm1vZHVsZS5leHBvcnRzID0gQ2FsZW5kYXJWaWV3OyAgICAgICAgICAgICAgICAgICAgXG4gICAgXG4gIiwidmFyIFNwbGFzaFZpZXcgPSBNYXJpb25ldHRlLkxheW91dFZpZXcuZXh0ZW5kKHtcblx0aWQgOiBcInJvb20tc3BsaXRcIixcblx0dGVtcGxhdGUgOiBfLnRlbXBsYXRlKCByZXF1aXJlKFwidGVtcGxhdGVzL3NwbGFzaFdyYXBwZXIuaHRtbFwiKSApLFxuXHRhZGRSb29tIDogZnVuY3Rpb24oIG1vZGVsICl7XG5cdFx0dmFyIHJvb21zID0gdGhpcy5tb2RlbC5nZXQoXCJyb29tc1wiKTtcblx0XHRyb29tc1sgbW9kZWwuZ2V0KFwia2V5XCIpIF0gPSBtb2RlbC50b0pTT04oKTtcblx0XHR0aGlzLnJlbmRlcigpO1xuXHR9XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBTcGxhc2hWaWV3OyJdfQ==
