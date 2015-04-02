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







         
},{"controllers/appRouter":3,"roomData":12,"views/appLayout":16,"views/calendarWrapper":19}],2:[function(require,module,exports){
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

},{"pipe":11,"roomData":12}],5:[function(require,module,exports){
var checkCalendarRate = 1000;

function CalendarStatus( collection, model ){

	this._collection = collection;
	this._model = model;
	this.init();
}

CalendarStatus.prototype = {
	init : function(){

		// this._collection.on("change:roomData", function( collection, data ){
			
		// 	this._roomData = data;
		// 	this.checkCalendar();
		// }, this );

		var _this = this;
		setInterval( function(){

			_this.checkCalendar();
		}, checkCalendarRate );
	},
	checkCalendar : function(){

		var current = this._collection.getCurrent();
		this._model.set("currentEvent", current);
		console.log(current);
		// console.log( this._collection.get("roomData") );
	}
}

module.exports = CalendarStatus;
},{}],6:[function(require,module,exports){
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
},{}],7:[function(require,module,exports){
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
},{"controllers/hueConnect":6}],8:[function(require,module,exports){
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
},{}],9:[function(require,module,exports){
var CalendarModel = Backbone.Model.extend({
	defaults : {},
	initialize : function(){}
});

module.exports = CalendarModel;
},{}],10:[function(require,module,exports){
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

},{}],11:[function(require,module,exports){
var pipe = _.extend({

	
	
}, Backbone.Events);

module.exports = pipe;
},{}],12:[function(require,module,exports){
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
},{}],13:[function(require,module,exports){
module.exports = "\n<h2>summary : <%= summary %></h2>\n\n<h3>description : <%= description %></h3>\n\n<h3>start : <%= start.formatted %></h3>\n\n<h3>end : <%= end.formatted %></h3>";

},{}],14:[function(require,module,exports){
module.exports = "<button id=\"close\">close</button>\n<div id=\"event-list\"></div> ";

},{}],15:[function(require,module,exports){
module.exports = "\n<div id=\"room-split\">\n\t<% _.each( rooms, function( data, key ){ %>\n\t\t<div id=\"room-<%= key %>\" class=\"room\" data-id=\"<%= key %>\">room <%= key %></div>\n\t<% }); %>\n</div>\n<div id=\"room-single\"></div>\n\n<!-- TEST -->\n<div class=\"test\">\n\t<div>\n\t\t<input id=\"hex-input\" type=\"text\"></input>\n\t\t<button id=\"hex\">hex</button>\n\t</div>\n\t<button id=\"test\">test</button>\n\t<input class=\"color\" type=\"color\" name=\"favcolor\">\n</div>\n\n ";

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
},{"models/state":10}],17:[function(require,module,exports){
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
},{"templates/calendarItem.html":13}],18:[function(require,module,exports){
var CalendarItem 	= require("views/calendarItem");
var CalendarItemModel 	= require("models/calendarItemModel");
var CalendarStatus = require("controllers/calendarStatus");
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

		new CalendarStatus( this.collectionView.collection, this.model );

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

		console.log("ASDASD!")

		console.log( this.collectionView.collection );

		var roomData = this.model.get("roomData");
		var newModels = [];

		_.each( roomData.items, function( item ){

			var m = new CalendarItemModel( item );
			newModels.push( m );
		}, this);

		this.collectionView.collection.reset( newModels );


		console.log(roomData);
		this.model.set("roomData", roomData);
	}
});

module.exports = CalendarSingle;
},{"controllers/appRouter":3,"controllers/calendarStatus":5,"models/calendarItemModel":8,"templates/calendarSingle.html":14,"views/calendarItem":17}],19:[function(require,module,exports){
var AppRouter 		= require( "controllers/appRouter" );

var calendarLoad = require("controllers/calendarLoad");
var CalendarSingle 	= require("views/calendarSingle");
var CalendarModel 	= require("models/calendarModel");
var CalendarCollection 	= require("collections/calendarCollection");

var hueConnect = require("controllers/hueConnect");
var LightPattern = require("controllers/lightPattern");
var roomData = require("roomData");

var CalendarView = Marionette.LayoutView.extend({
	template : _.template( require("templates/calendarWrapper.html") ),
	regions : {
		roomSingle : "#room-single",
	},
	ui : {
		colorPicker : ".color",
		test : "#test",
		hexButton : "#hex",
		hexInput : "#hex-input",
		roomSplit : "#room-split",
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

		this.listenTo( AppRouter, "route:roomRoute", function( key ){
			
			this.showRoom( key );
		});
		this.listenTo( AppRouter, "route:defaultRoute", this.showSplit );
	},
	showSplit : function(){

		var $splitEl = this.ui.roomSplit;
		var $singleEl = this.getRegion( "roomSingle" ).$el;

		$splitEl.show();
		$singleEl.hide();
	},
	showRoom : function( key ){

		var $splitEl = this.ui.roomSplit;
		
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
				eventCollection : new CalendarCollection()
			});
		} 

		this.calendarStore[ key ].set("roomData", data.data);

		this.checkQueue();
	} 
});


module.exports = CalendarView;                    
    
 
},{"collections/calendarCollection":2,"controllers/appRouter":3,"controllers/calendarLoad":4,"controllers/hueConnect":6,"controllers/lightPattern":7,"models/calendarModel":9,"roomData":12,"templates/calendarWrapper.html":15,"views/calendarSingle":18}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIuLi9wdWJsaWMvYXNzZXRzL2pzL3VzZXIvYXBwLmpzIiwiLi4vcHVibGljL2Fzc2V0cy9qcy91c2VyL2NvbGxlY3Rpb25zL2NhbGVuZGFyQ29sbGVjdGlvbi5qcyIsIi4uL3B1YmxpYy9hc3NldHMvanMvdXNlci9jb250cm9sbGVycy9hcHBSb3V0ZXIuanMiLCIuLi9wdWJsaWMvYXNzZXRzL2pzL3VzZXIvY29udHJvbGxlcnMvY2FsZW5kYXJMb2FkLmpzIiwiLi4vcHVibGljL2Fzc2V0cy9qcy91c2VyL2NvbnRyb2xsZXJzL2NhbGVuZGFyU3RhdHVzLmpzIiwiLi4vcHVibGljL2Fzc2V0cy9qcy91c2VyL2NvbnRyb2xsZXJzL2h1ZUNvbm5lY3QuanMiLCIuLi9wdWJsaWMvYXNzZXRzL2pzL3VzZXIvY29udHJvbGxlcnMvbGlnaHRQYXR0ZXJuLmpzIiwiLi4vcHVibGljL2Fzc2V0cy9qcy91c2VyL21vZGVscy9jYWxlbmRhckl0ZW1Nb2RlbC5qcyIsIi4uL3B1YmxpYy9hc3NldHMvanMvdXNlci9tb2RlbHMvY2FsZW5kYXJNb2RlbC5qcyIsIi4uL3B1YmxpYy9hc3NldHMvanMvdXNlci9tb2RlbHMvc3RhdGUuanMiLCIuLi9wdWJsaWMvYXNzZXRzL2pzL3VzZXIvcGlwZS5qcyIsIi4uL3B1YmxpYy9hc3NldHMvanMvdXNlci9yb29tRGF0YS5qcyIsIi4uL3B1YmxpYy9hc3NldHMvanMvdXNlci90ZW1wbGF0ZXMvY2FsZW5kYXJJdGVtLmh0bWwiLCIuLi9wdWJsaWMvYXNzZXRzL2pzL3VzZXIvdGVtcGxhdGVzL2NhbGVuZGFyU2luZ2xlLmh0bWwiLCIuLi9wdWJsaWMvYXNzZXRzL2pzL3VzZXIvdGVtcGxhdGVzL2NhbGVuZGFyV3JhcHBlci5odG1sIiwiLi4vcHVibGljL2Fzc2V0cy9qcy91c2VyL3ZpZXdzL2FwcExheW91dC5qcyIsIi4uL3B1YmxpYy9hc3NldHMvanMvdXNlci92aWV3cy9jYWxlbmRhckl0ZW0uanMiLCIuLi9wdWJsaWMvYXNzZXRzL2pzL3VzZXIvdmlld3MvY2FsZW5kYXJTaW5nbGUuanMiLCIuLi9wdWJsaWMvYXNzZXRzL2pzL3VzZXIvdmlld3MvY2FsZW5kYXJXcmFwcGVyLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNiQTtBQUNBOztBQ0RBO0FBQ0E7O0FDREE7QUFDQTs7QUNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNkQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIndpbmRvdy5Db21tb24gPSB7XG5cdHBhdGggOiB7XG5cdFx0YXNzZXRzIDogXCJhc3NldHMvXCIsXG5cdFx0aW1nIDogXCJhc3NldHMvaW1nL1wiLFxuXHRcdGF1ZGlvIDogXCJhc3NldHMvYXVkaW8vXCJcblx0fSxcblx0c2l6ZXMgOntcblx0XHRmcmFtZSA6IDEwXG5cdH1cbn07XG5cbi8vYmFzZVxudmFyIEFwcFJvdXRlciBcdFx0PSByZXF1aXJlKCBcImNvbnRyb2xsZXJzL2FwcFJvdXRlclwiICk7XG52YXIgQXBwTGF5b3V0IFx0XHQ9IHJlcXVpcmUoIFwidmlld3MvYXBwTGF5b3V0XCIgKTtcblxuLy9jdXN0b21cbnZhciBDYWxlbmRhcldyYXBwZXJcdD0gcmVxdWlyZShcInZpZXdzL2NhbGVuZGFyV3JhcHBlclwiKTtcbnZhciByb29tRGF0YSA9IHJlcXVpcmUoXCJyb29tRGF0YVwiKTtcblxuLy9USEUgQVBQTElDQVRJT05cbnZhciBNeUFwcCA9IE1hcmlvbmV0dGUuQXBwbGljYXRpb24uZXh0ZW5kKHtcblx0aW5pdGlhbGl6ZSA6IGZ1bmN0aW9uKCl7XG5cdFx0XG5cdH0sXG5cdG9uU3RhcnQgOiBmdW5jdGlvbigpe1xuXG5cdFx0QXBwTGF5b3V0LnJlbmRlcigpOyBcblxuXHRcdHZhciBteUNhbGVuZGFyID0gbmV3IENhbGVuZGFyV3JhcHBlciggeyBtb2RlbCA6IG5ldyBCYWNrYm9uZS5Nb2RlbCh7IHJvb21zIDogcm9vbURhdGEgfSkgfSk7XG5cdFx0QXBwTGF5b3V0LmdldFJlZ2lvbihcIm1haW5cIikuc2hvdyggbXlDYWxlbmRhciApO1xuXG5cdFx0QmFja2JvbmUuaGlzdG9yeS5zdGFydCh7XG5cdFx0XHRwdXNoU3RhdGUgOiBmYWxzZVxuXHRcdH0pO1xuXHR9IFxufSk7XG5cblxuXG4kKGZ1bmN0aW9uKCl7XG5cdHdpbmRvdy5hcHAgPSBuZXcgTXlBcHAoKTtcblx0d2luZG93LmFwcC5zdGFydCgpOyBcbn0pO1xuXG5cblxuXG5cblxuXG4gICAgICAgICAiLCJ2YXIgQ2FsZW5kYXJDb2xsZWN0aW9uID0gQmFja2JvbmUuQ29sbGVjdGlvbi5leHRlbmQoe1xuXHRpbml0aWFsaXplIDogZnVuY3Rpb24oKXtcblxuXHR9LFxuXHRjb21wYXJhdG9yIDogZnVuY3Rpb24oIGEsIGIgKXtcblx0XHR2YXIgYVRpbWUgPSBhLmdldChcInN0YXJ0XCIpLnJhdztcblx0XHR2YXIgYlRpbWUgPSBiLmdldChcInN0YXJ0XCIpLnJhdztcblx0XHRyZXR1cm4gYVRpbWUgLSBiVGltZTtcblx0fSxcblx0Z2V0Q3VycmVudCA6IGZ1bmN0aW9uKCl7XG5cblx0XHRyZXR1cm4gdGhpcy5maW5kKGZ1bmN0aW9uKCBtb2RlbCApe1xuXG5cdFx0XHRyZXR1cm4gbW9kZWwuaXNBY3RpdmUoKTtcblx0XHR9KTtcblx0fVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gQ2FsZW5kYXJDb2xsZWN0aW9uOyIsInZhciBNeUFwcFJvdXRlciA9IE1hcmlvbmV0dGUuQXBwUm91dGVyLmV4dGVuZCh7XG5cdGNvbnRyb2xsZXIgOiB7XG5cdFx0XCJkZWZhdWx0Um91dGVcIiA6IGZ1bmN0aW9uKCl7fSxcblx0XHRcInJvb21Sb3V0ZVwiIDogZnVuY3Rpb24oKXt9LFxuXHR9LFxuXHRhcHBSb3V0ZXMgOiB7XG5cdFx0XCJyb29tLzprZXlcIiA6IFwicm9vbVJvdXRlXCIsXG5cdFx0XCIqYWN0aW9uc1wiIDogXCJkZWZhdWx0Um91dGVcIixcblx0fVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gbmV3IE15QXBwUm91dGVyKCk7XG4iLCJ2YXIgcGlwZSA9IHJlcXVpcmUoXCJwaXBlXCIpO1xuXG4vL2xpc3RlbmluZyBmb3IgbG9hZFxud2luZG93LmhhbmRsZUNsaWVudExvYWQgPSBmdW5jdGlvbigpe1xuXG4gIGNvbnNvbGUubG9nKFwiZ29vZ2xlIGFwaSBsb2FkZWRcIik7XG4gIGluaXQoKTtcbn1cblxudmFyIGNsaWVudElkID0gJzQzMzgzOTcyMzM2NS11N2dybGR0dmY4cGFiamtqNGZyY2lvM2N2NWhpdDhmbS5hcHBzLmdvb2dsZXVzZXJjb250ZW50LmNvbSc7XG52YXIgYXBpS2V5ID0gJ0FJemFTeUJzS2RUcGxSWHVFd2d2UFNIX2dHRjhPR3N3MzV0MTV2MCc7XG52YXIgc2NvcGVzID0gJ2h0dHBzOi8vd3d3Lmdvb2dsZWFwaXMuY29tL2F1dGgvY2FsZW5kYXInO1xudmFyIHJvb21EYXRhID0gcmVxdWlyZShcInJvb21EYXRhXCIpO1xuXG5cbi8vVE9ETyA6IGludGVncmF0ZSBhbGwgNCBjYWxlbmRhcnNcblxuZnVuY3Rpb24gaW5pdCgpe1xuXHRnYXBpLmNsaWVudC5zZXRBcGlLZXkoYXBpS2V5KTtcblx0Y2hlY2tBdXRoKCk7XG59XG5cbmZ1bmN0aW9uIGNoZWNrQXV0aCgpe1xuXHRnYXBpLmF1dGguYXV0aG9yaXplKCB7XG5cdFx0Y2xpZW50X2lkOiBjbGllbnRJZCwgXG5cdFx0c2NvcGU6IHNjb3BlcywgXG5cdFx0aW1tZWRpYXRlOiBmYWxzZVxuXHR9LCBoYW5kbGVBdXRoUmVzdWx0ICk7XG59XG5cbmZ1bmN0aW9uIGhhbmRsZUF1dGhSZXN1bHQoIGF1dGhSZXN1bHQgKXtcblxuXHRpZihhdXRoUmVzdWx0KXtcblx0XHRtYWtlQXBpQ2FsbCgpO1xuXHR9XG59XG5cbmZ1bmN0aW9uIG1ha2VBcGlDYWxsKCkge1xuICBnYXBpLmNsaWVudC5sb2FkKCdjYWxlbmRhcicsICd2MycsIGZ1bmN0aW9uKCkge1xuICAgICAgXG4gICAgICBwdWxsUm9vbXMoKTsgICAgICAgICAgXG4gIH0pO1xufVxuXG5mdW5jdGlvbiBwdWxsUm9vbXMoKXtcblxuICB2YXIgZnJvbSA9IG5ldyBEYXRlKCk7XG4gIHZhciB0byA9IG5ldyBEYXRlKCk7XG4gICAgICB0by5zZXREYXRlKCB0by5nZXREYXRlKCkgKyAxICk7XG5cbiAgXy5lYWNoKCByb29tRGF0YSwgZnVuY3Rpb24oIGRhdGEsIGtleSApe1xuXG4gICAgdmFyIHJlcXVlc3QgPSBnYXBpLmNsaWVudC5jYWxlbmRhci5ldmVudHMubGlzdCh7XG4gICAgICAgICdjYWxlbmRhcklkJzogZGF0YS5jYWxlbmRhcklkLFxuICAgICAgICB0aW1lTWluIDogZnJvbS50b0lTT1N0cmluZygpLFxuICAgICAgICB0aW1lTWF4IDogdG8udG9JU09TdHJpbmcoKSxcbiAgICAgICAgc2luZ2xlRXZlbnRzIDogdHJ1ZVxuICAgICAgfSk7XG5cbiAgICAgcmVxdWVzdC50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG5cbiAgICAgICAgICBjb25zb2xlLmxvZyhyZXNwb25zZS5yZXN1bHQpO1xuICAgICAgICAgIHJvb21Mb2FkZWQoIGtleSwgcmVzcG9uc2UucmVzdWx0ICk7XG4gICAgICB9LCBmdW5jdGlvbihyZWFzb24pIHtcblxuICAgICAgICAgIGNvbnNvbGUubG9nKCdFcnJvcjogJyArIHJlYXNvbi5yZXN1bHQuZXJyb3IubWVzc2FnZSk7XG4gICAgICB9KTtcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIHJvb21Mb2FkZWQoIGtleSwgZGF0YSApe1xuXG4gIGV2ZW50cy50cmlnZ2VyKCBcImV2ZW50c0xvYWRlZFwiLCB7IGtleSA6IGtleSwgZGF0YSA6IGRhdGEgfSApO1xufVxuXG52YXIgZXZlbnRzID0gXy5leHRlbmQoe30sIEJhY2tib25lLkV2ZW50cyk7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXG4gIGV2ZW50cyA6IGV2ZW50c1xufTtcbiIsInZhciBjaGVja0NhbGVuZGFyUmF0ZSA9IDEwMDA7XG5cbmZ1bmN0aW9uIENhbGVuZGFyU3RhdHVzKCBjb2xsZWN0aW9uLCBtb2RlbCApe1xuXG5cdHRoaXMuX2NvbGxlY3Rpb24gPSBjb2xsZWN0aW9uO1xuXHR0aGlzLl9tb2RlbCA9IG1vZGVsO1xuXHR0aGlzLmluaXQoKTtcbn1cblxuQ2FsZW5kYXJTdGF0dXMucHJvdG90eXBlID0ge1xuXHRpbml0IDogZnVuY3Rpb24oKXtcblxuXHRcdC8vIHRoaXMuX2NvbGxlY3Rpb24ub24oXCJjaGFuZ2U6cm9vbURhdGFcIiwgZnVuY3Rpb24oIGNvbGxlY3Rpb24sIGRhdGEgKXtcblx0XHRcdFxuXHRcdC8vIFx0dGhpcy5fcm9vbURhdGEgPSBkYXRhO1xuXHRcdC8vIFx0dGhpcy5jaGVja0NhbGVuZGFyKCk7XG5cdFx0Ly8gfSwgdGhpcyApO1xuXG5cdFx0dmFyIF90aGlzID0gdGhpcztcblx0XHRzZXRJbnRlcnZhbCggZnVuY3Rpb24oKXtcblxuXHRcdFx0X3RoaXMuY2hlY2tDYWxlbmRhcigpO1xuXHRcdH0sIGNoZWNrQ2FsZW5kYXJSYXRlICk7XG5cdH0sXG5cdGNoZWNrQ2FsZW5kYXIgOiBmdW5jdGlvbigpe1xuXG5cdFx0dmFyIGN1cnJlbnQgPSB0aGlzLl9jb2xsZWN0aW9uLmdldEN1cnJlbnQoKTtcblx0XHR0aGlzLl9tb2RlbC5zZXQoXCJjdXJyZW50RXZlbnRcIiwgY3VycmVudCk7XG5cdFx0Y29uc29sZS5sb2coY3VycmVudCk7XG5cdFx0Ly8gY29uc29sZS5sb2coIHRoaXMuX2NvbGxlY3Rpb24uZ2V0KFwicm9vbURhdGFcIikgKTtcblx0fVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IENhbGVuZGFyU3RhdHVzOyIsInZhciBteVNvY2tldCA9IG51bGw7XG52YXIgY29ubmVjdGVkID0gZmFsc2U7XG5cbmZ1bmN0aW9uIGluaXQoKXtcblxuXHRteVNvY2tldCA9IGlvLmNvbm5lY3QoJy8vbG9jYWxob3N0OjMwMDAnKTtcblx0bXlTb2NrZXQub24oJ2Nvbm5lY3QnLCBmdW5jdGlvbigpe1xuXHRcdGNvbm5lY3RlZCA9IHRydWU7XG5cdH0pO1x0XG59XG5cbmZ1bmN0aW9uIHVwZGF0ZSggZGF0YSApe1xuXG5cdGlmKGNvbm5lY3RlZCl7XG5cdFx0bXlTb2NrZXQuZW1pdCggJ3VwZGF0ZV9kYXRhJywgZGF0YSApO1x0XG5cdH1cbn1cblxuLy8gdmFyIHRocm90dGxlZFVwZGF0ZSA9IF8udGhyb3R0bGUoIHVwZGF0ZSwgNTAwLCB7bGVhZGluZzogZmFsc2V9ICk7XG5cbmluaXQoKTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cdGluaXQgOiBpbml0LFxuXHR1cGRhdGUgOiB1cGRhdGUsXG5cdGNvbm5lY3RlZCA6IGNvbm5lY3RlZFxufSIsInZhciBodWVDb25uZWN0ID0gcmVxdWlyZShcImNvbnRyb2xsZXJzL2h1ZUNvbm5lY3RcIik7XG5cbmZ1bmN0aW9uIExpZ2h0UGF0dGVybiggbGlnaHRJZCwgcGF0dGVybklkICl7XG5cblx0dGhpcy5faHNsID0ge1xuXHRcdGggOiAwLFxuXHRcdHMgOiAwLFxuXHRcdGwgOiAwXG5cdH1cblxuXHR0aGlzLl9saWdodElkID0gbGlnaHRJZDtcblx0dGhpcy5fcGF0dGVybklkID0gcGF0dGVybklkO1xuXHR0aGlzLl9zdGVwID0gMDtcblxuXHR0aGlzLm5ld1NlcXVlbmNlKCB0aGlzLl9wYXR0ZXJuSWQgKTtcbn1cblxuTGlnaHRQYXR0ZXJuLnByb3RvdHlwZSA9IHtcblx0bmV3U2VxdWVuY2UgOiBmdW5jdGlvbiggaWQgKXtcblxuXHRcdHZhciBwYXR0ZXJuID0gcGF0dGVybnNbIGlkIF07XG5cdFx0dmFyIHNlcXVlbmNlID0gcGF0dGVybi5zZXF1ZW5jZTtcblxuXHRcdHRoaXMuX3R3ZWVuZXIgPSBuZXcgVGltZWxpbmVNYXgoe1xuXHRcdFx0cmVwZWF0IDogcGF0dGVybi5yZXBlYXQsXG5cdFx0XHRvbkNvbXBsZXRlIDogZnVuY3Rpb24oKXtcblx0XHRcdFx0Y29uc29sZS5sb2coXCJjb21wbGV0ZSFcIik7XG5cdFx0XHR9XG5cdFx0fSk7XG5cblx0XHRfLmVhY2goIHNlcXVlbmNlLCBmdW5jdGlvbiggc3RlcCApe1xuXG5cdFx0XHR0aGlzLnF1ZXVlQ29sb3IoIHN0ZXAgKTtcblx0XHR9LCB0aGlzICk7XG5cdH0sXG5cdHF1ZXVlQ29sb3IgOiBmdW5jdGlvbiggc3RlcCApe1xuXG5cdFx0dmFyIGNvbG9yID0gb25lLmNvbG9yKCBzdGVwLmNvbG9yICk7XG5cdFx0dmFyIGZhZGUgPSBzdGVwLmZhZGU7XG5cdFx0dmFyIHdhaXQgPSBzdGVwLndhaXQ7XG5cblx0XHR2YXIgaHNsID0ge1xuXHRcdFx0aCA6IE1hdGguZmxvb3IoIGNvbG9yLmgoKSAqIDM2MCksIFxuXHRcdFx0cyA6IE1hdGguZmxvb3IoIGNvbG9yLnMoKSAqIDEwMCksXG5cdFx0XHRsIDogTWF0aC5mbG9vciggY29sb3IubCgpICogMTAwKSBcblx0XHR9O1xuXG5cdFx0dmFyIG9wdGlvbnMgPSB7XG5cdFx0XHRvblN0YXJ0IDogZnVuY3Rpb24oKXtcblx0XHRcdFx0Ly91cGRhdGluZyBMRURzXG5cdFx0XHRcdGh1ZUNvbm5lY3QudXBkYXRlKFt7XG5cdFx0XHRcdFx0aWQgOiB0aGlzLl9saWdodElkLFxuXHRcdFx0XHRcdGRhdGEgOiB7XG5cdFx0XHRcdFx0XHRoc2wgOiBoc2wsXG5cdFx0XHRcdFx0XHRkdXJhdGlvbiA6IGZhZGVcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1dKTtcdFx0XHRcdFxuXHRcdFx0fSxcblx0XHRcdG9uU3RhcnRTY29wZSA6IHRoaXNcblx0XHR9XG5cblx0XHQvL3VwZGF0aW5nIGZyb250ZW5kXG5cdFx0dGhpcy5fdHdlZW5lci50byggdGhpcy5faHNsLCBmYWRlLCBfLmV4dGVuZCggb3B0aW9ucywgaHNsICkgKTtcblx0XHR0aGlzLl90d2VlbmVyLnRvKCB0aGlzLl9oc2wsIHdhaXQsIHt9ICk7XG5cdH1cbn1cblxudmFyIHBhdHRlcm5zID0ge1xuXHQndGVzdCcgOiB7XG5cdFx0cmVwZWF0IDogIC0xLFxuXHRcdHNlcXVlbmNlIDogW1xuXHRcdFx0eyBjb2xvciA6IFwiI0ZCMTkxMVwiLCBmYWRlIDogMSwgd2FpdCA6IDEgfSxcblx0XHRcdC8vIHsgY29sb3IgOiBcIiMwMGZmMDBcIiwgZmFkZSA6IDEsIHdhaXQgOiAxIH0sXG5cdFx0XHQvLyB7IGNvbG9yIDogXCIjNDE1NkZGXCIsIGZhZGUgOiAxLCB3YWl0IDogMSB9LFxuXHRcdFx0Ly8geyBjb2xvciA6IFwiI0ZGMDAxRFwiLCBmYWRlIDogMSwgd2FpdCA6IDEgfSxcblx0XHRcdC8vIHsgY29sb3IgOiBcIiNGRkZGMDdcIiwgZmFkZSA6IDEsIHdhaXQgOiAxIH0sXG5cdFx0XVxuXHR9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gTGlnaHRQYXR0ZXJuOyIsInZhciBDYWxlbmRhckl0ZW1Nb2RlbCA9IEJhY2tib25lLk1vZGVsLmV4dGVuZCh7XG5cdGRlZmF1bHRzIDoge1xuXHRcdHN1bW1hcnkgOiBcIm4vYVwiLFxuXHRcdGRlc2NyaXB0aW9uIDogXCJuL2FcIixcblx0XHRzdGFydCA6IFwibi9hXCIsXG5cdFx0ZW5kIDogXCJuL2FcIixcblx0fSxcblx0aW5pdGlhbGl6ZSA6IGZ1bmN0aW9uKCl7XG5cblx0XHR0aGlzLmNvbnZlcnREYXRlKFwic3RhcnRcIik7XG5cdFx0dGhpcy5jb252ZXJ0RGF0ZShcImVuZFwiKTtcblx0fSxcblx0Y29udmVydERhdGUgOiBmdW5jdGlvbigga2V5ICl7XG5cdFx0Ly9jb252ZXJ0IGRhdGFzXG5cdFx0dmFyIGRhdGVTdHJpbmcgPSB0aGlzLmdldCgga2V5IClcblx0XHRpZighZGF0ZVN0cmluZykgcmV0dXJuO1xuXHRcdFxuXHRcdGRhdGVTdHJpbmcgPSBkYXRlU3RyaW5nLmRhdGVUaW1lO1xuXHRcdHZhciBub3cgPSBuZXcgRGF0ZSgpO1xuXHRcdHZhciBkYXRlID0gbmV3IERhdGUoIGRhdGVTdHJpbmcgKTtcblxuXHRcdHRoaXMuc2V0KCBrZXksIHtcblx0XHRcdHJhdyA6IGRhdGUsXG5cdFx0XHRmb3JtYXR0ZWQgOiBkYXRlLnRvU3RyaW5nKClcblx0XHR9KTtcblx0fSxcblx0aXNBY3RpdmUgOiBmdW5jdGlvbigpe1xuXHRcdCB2YXIgc3RhcnQgPSB0aGlzLmdldChcInN0YXJ0XCIpO1xuXHRcdCB2YXIgZW5kID0gdGhpcy5nZXQoXCJlbmRcIik7XG5cdFx0IHZhciBub3cgPSBuZXcgRGF0ZSgpO1xuXG5cdFx0IGlmKCBub3cgPiBzdGFydCAmJiBub3cgPCBlbmQgKXtcblx0XHQgXHRyZXR1cm4gdHJ1ZTtcblx0XHQgfVxuXG5cdFx0IHJldHVybiBmYWxzZTtcblx0fVxufSlcblxubW9kdWxlLmV4cG9ydHMgPSBDYWxlbmRhckl0ZW1Nb2RlbDsiLCJ2YXIgQ2FsZW5kYXJNb2RlbCA9IEJhY2tib25lLk1vZGVsLmV4dGVuZCh7XG5cdGRlZmF1bHRzIDoge30sXG5cdGluaXRpYWxpemUgOiBmdW5jdGlvbigpe31cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IENhbGVuZGFyTW9kZWw7IiwidmFyIHN0YXRlID0gbmV3IChCYWNrYm9uZS5Nb2RlbC5leHRlbmQoe1xuXHRkZWZhdWx0cyA6IHtcblx0XHQvLyBcIm5hdl9vcGVuXCIgXHRcdDogZmFsc2UsXG5cdFx0Ly8gJ3Njcm9sbF9hdF90b3AnIDogdHJ1ZSxcblx0XHQvLyAnbWluaW1hbF9uYXYnIFx0OiBmYWxzZSxcblx0XHQvLyAnZnVsbF9uYXZfb3BlbidcdDogZmFsc2UsXG5cdFx0Ly8gJ3VpX2Rpc3BsYXknXHQ6IGZhbHNlXG5cdH1cbn0pKSgpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHN0YXRlO1xuIiwidmFyIHBpcGUgPSBfLmV4dGVuZCh7XG5cblx0XG5cdFxufSwgQmFja2JvbmUuRXZlbnRzKTtcblxubW9kdWxlLmV4cG9ydHMgPSBwaXBlOyIsIm1vZHVsZS5leHBvcnRzID0ge1xuXHQnMSc6IHtcblx0XHQnY2FsZW5kYXJJZCcgOiBcImItcmVlbC5jb21fMmQzMjM4MzczOTM2MzYzMjMyMzczODMxQHJlc291cmNlLmNhbGVuZGFyLmdvb2dsZS5jb21cIlxuXHR9LFxuXHQnMic6IHtcblx0XHQnY2FsZW5kYXJJZCcgOiBcImItcmVlbC5jb21fMmQzMTMyMzczNzM4MzgzMzM0MmQzMjM0MzJAcmVzb3VyY2UuY2FsZW5kYXIuZ29vZ2xlLmNvbVwiXG5cdH0sXG5cdCczJzoge1xuXHRcdCdjYWxlbmRhcklkJyA6IFwiYi1yZWVsLmNvbV8zMTM2MzUzMzM5MzYzMTM5MzkzMzM4QHJlc291cmNlLmNhbGVuZGFyLmdvb2dsZS5jb21cIlxuXHR9LFxuXHQnNSc6IHtcblx0XHQnY2FsZW5kYXJJZCcgOiBcImItcmVlbC5jb21fMmQzNDM0MzIzODM5MzYzNzMwMmQzNjM0MzNAcmVzb3VyY2UuY2FsZW5kYXIuZ29vZ2xlLmNvbVwiXG5cdH1cbn07IiwibW9kdWxlLmV4cG9ydHMgPSBcIlxcbjxoMj5zdW1tYXJ5IDogPCU9IHN1bW1hcnkgJT48L2gyPlxcblxcbjxoMz5kZXNjcmlwdGlvbiA6IDwlPSBkZXNjcmlwdGlvbiAlPjwvaDM+XFxuXFxuPGgzPnN0YXJ0IDogPCU9IHN0YXJ0LmZvcm1hdHRlZCAlPjwvaDM+XFxuXFxuPGgzPmVuZCA6IDwlPSBlbmQuZm9ybWF0dGVkICU+PC9oMz5cIjtcbiIsIm1vZHVsZS5leHBvcnRzID0gXCI8YnV0dG9uIGlkPVxcXCJjbG9zZVxcXCI+Y2xvc2U8L2J1dHRvbj5cXG48ZGl2IGlkPVxcXCJldmVudC1saXN0XFxcIj48L2Rpdj4gXCI7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IFwiXFxuPGRpdiBpZD1cXFwicm9vbS1zcGxpdFxcXCI+XFxuXFx0PCUgXy5lYWNoKCByb29tcywgZnVuY3Rpb24oIGRhdGEsIGtleSApeyAlPlxcblxcdFxcdDxkaXYgaWQ9XFxcInJvb20tPCU9IGtleSAlPlxcXCIgY2xhc3M9XFxcInJvb21cXFwiIGRhdGEtaWQ9XFxcIjwlPSBrZXkgJT5cXFwiPnJvb20gPCU9IGtleSAlPjwvZGl2PlxcblxcdDwlIH0pOyAlPlxcbjwvZGl2PlxcbjxkaXYgaWQ9XFxcInJvb20tc2luZ2xlXFxcIj48L2Rpdj5cXG5cXG48IS0tIFRFU1QgLS0+XFxuPGRpdiBjbGFzcz1cXFwidGVzdFxcXCI+XFxuXFx0PGRpdj5cXG5cXHRcXHQ8aW5wdXQgaWQ9XFxcImhleC1pbnB1dFxcXCIgdHlwZT1cXFwidGV4dFxcXCI+PC9pbnB1dD5cXG5cXHRcXHQ8YnV0dG9uIGlkPVxcXCJoZXhcXFwiPmhleDwvYnV0dG9uPlxcblxcdDwvZGl2PlxcblxcdDxidXR0b24gaWQ9XFxcInRlc3RcXFwiPnRlc3Q8L2J1dHRvbj5cXG5cXHQ8aW5wdXQgY2xhc3M9XFxcImNvbG9yXFxcIiB0eXBlPVxcXCJjb2xvclxcXCIgbmFtZT1cXFwiZmF2Y29sb3JcXFwiPlxcbjwvZGl2PlxcblxcbiBcIjtcbiIsInZhciBTdGF0ZSBcdFx0PSByZXF1aXJlKFwibW9kZWxzL3N0YXRlXCIpO1xuXG52YXIgTXlBcHBMYXlvdXQgPSBNYXJpb25ldHRlLkxheW91dFZpZXcuZXh0ZW5kKHtcblx0ZWwgOiBcIiNjb250ZW50XCIsXG5cdHRlbXBsYXRlIDogZmFsc2UsXG5cdHJlZ2lvbnMgOiB7XG5cdFx0bWFpbiA6IFwiI21haW5cIlxuXHR9LCBcblx0aW5pdGlhbGl6ZSA6IGZ1bmN0aW9uKCl7XG5cdFx0dmFyIF90aGlzID0gdGhpcztcblxuXHRcdC8vd3JhcHBpbmcgaHRtbFxuXHRcdHRoaXMuJGh0bWwgPSAkKFwiaHRtbFwiKTtcblx0XHR0aGlzLiRodG1sLnJlbW92ZUNsYXNzKFwiaGlkZGVuXCIpO1xuXG5cdFx0Ly9yZXNpemUgZXZlbnRzXG5cdFx0JCh3aW5kb3cpLnJlc2l6ZShmdW5jdGlvbigpe1xuXHRcdFx0X3RoaXMub25SZXNpemVXaW5kb3coKTtcblx0XHR9KS5yZXNpemUoKTtcblxuXHRcdHRoaXMubGlzdGVuRm9yU3RhdGUoKTtcblx0fSxcblx0bGlzdGVuRm9yU3RhdGUgOiBmdW5jdGlvbigpe1xuXHRcdC8vc3RhdGUgY2hhbmdlXG5cdFx0dGhpcy5saXN0ZW5UbyggU3RhdGUsIFwiY2hhbmdlXCIsIGZ1bmN0aW9uKCBlICl7XG5cblx0XHRcdHRoaXMub25TdGF0ZUNoYW5nZSggZS5jaGFuZ2VkLCBlLl9wcmV2aW91c0F0dHJpYnV0ZXMgKTtcblx0XHR9LCB0aGlzKTtcblx0XHR0aGlzLm9uU3RhdGVDaGFuZ2UoIFN0YXRlLnRvSlNPTigpICk7XG5cdH0sXG5cdG9uU3RhdGVDaGFuZ2UgOiBmdW5jdGlvbiggY2hhbmdlZCwgcHJldmlvdXMgKXtcblxuXHRcdF8uZWFjaCggY2hhbmdlZCwgZnVuY3Rpb24odmFsdWUsIGtleSl7XG5cdFx0XHRcblx0XHRcdGlmKCBfLmlzQm9vbGVhbiggdmFsdWUgKSApe1xuXHRcdFx0XHR0aGlzLiRodG1sLnRvZ2dsZUNsYXNzKFwic3RhdGUtXCIra2V5LCB2YWx1ZSk7XG5cdFx0XHRcdHRoaXMuJGh0bWwudG9nZ2xlQ2xhc3MoXCJzdGF0ZS1ub3QtXCIra2V5LCAhdmFsdWUpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0dmFyIHByZXZWYWx1ZSA9IHByZXZpb3VzWyBrZXkgXTtcblx0XHRcdFx0aWYocHJldlZhbHVlKXtcblx0XHRcdFx0XHR0aGlzLiRodG1sLnRvZ2dsZUNsYXNzKFwic3RhdGUtXCIra2V5K1wiLVwiK3ByZXZWYWx1ZSwgZmFsc2UpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHRoaXMuJGh0bWwudG9nZ2xlQ2xhc3MoXCJzdGF0ZS1cIitrZXkrXCItXCIrdmFsdWUsIHRydWUpO1xuXHRcdFx0fVxuXG5cdFx0fSwgdGhpcyApO1xuXHR9LFxuXHRvblJlc2l6ZVdpbmRvdyA6IGZ1bmN0aW9uKCl7XG5cdFx0Q29tbW9uLnd3ID0gJCh3aW5kb3cpLndpZHRoKCk7XG5cdFx0Q29tbW9uLndoID0gJCh3aW5kb3cpLmhlaWdodCgpO1xuXHR9XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBuZXcgTXlBcHBMYXlvdXQoKTsiLCJ2YXIgQ2FsZW5kYXJJdGVtID0gTWFyaW9uZXR0ZS5JdGVtVmlldy5leHRlbmQoe1xuXHRjbGFzc05hbWUgOiBcIml0ZW1cIixcblx0dGVtcGxhdGUgOiBfLnRlbXBsYXRlKCByZXF1aXJlKFwidGVtcGxhdGVzL2NhbGVuZGFySXRlbS5odG1sXCIpICksXG5cdHVpIDoge1xuXHRcdCd0aXRsZScgOiBcImgyXCJcblx0fSxcblx0ZXZlbnRzIDoge1xuXHRcdCdjbGljayBAdWkudGl0bGUnIDogZnVuY3Rpb24oKXtcblxuXG5cdFx0fVxuXHR9XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBDYWxlbmRhckl0ZW07IiwidmFyIENhbGVuZGFySXRlbSBcdD0gcmVxdWlyZShcInZpZXdzL2NhbGVuZGFySXRlbVwiKTtcbnZhciBDYWxlbmRhckl0ZW1Nb2RlbCBcdD0gcmVxdWlyZShcIm1vZGVscy9jYWxlbmRhckl0ZW1Nb2RlbFwiKTtcbnZhciBDYWxlbmRhclN0YXR1cyA9IHJlcXVpcmUoXCJjb250cm9sbGVycy9jYWxlbmRhclN0YXR1c1wiKTtcbnZhciBBcHBSb3V0ZXIgXHRcdD0gcmVxdWlyZSggXCJjb250cm9sbGVycy9hcHBSb3V0ZXJcIiApO1xuXG52YXIgQ2FsZW5kYXJTaW5nbGUgPSBNYXJpb25ldHRlLkxheW91dFZpZXcuZXh0ZW5kKHtcblx0dGVtcGxhdGUgOiBfLnRlbXBsYXRlKCByZXF1aXJlKFwidGVtcGxhdGVzL2NhbGVuZGFyU2luZ2xlLmh0bWxcIikgKSxcblx0cmVnaW9ucyA6IHtcblx0XHRldmVudExpc3QgOiBcIiNldmVudC1saXN0XCJcblx0fSxcblx0dWkgOiB7XG5cdFx0Y2xvc2VCdXR0b24gOiBcIiNjbG9zZVwiXG5cdH0sXG5cdGV2ZW50cyA6IHtcblx0XHQnY2xpY2sgQHVpLmNsb3NlQnV0dG9uJyA6IFwib25DbG9zZVwiXG5cdH0sXG5cdGluaXRpYWxpemUgOiBmdW5jdGlvbigpe1xuXG5cdFx0dGhpcy5jb2xsZWN0aW9uVmlldyA9IG5ldyBNYXJpb25ldHRlLkNvbGxlY3Rpb25WaWV3KHtcblx0XHRcdGNoaWxkVmlldyA6IENhbGVuZGFySXRlbSxcblx0XHRcdGNvbGxlY3Rpb24gOiB0aGlzLm1vZGVsLmdldChcImV2ZW50Q29sbGVjdGlvblwiKVxuXHRcdH0pO1xuXG5cdFx0bmV3IENhbGVuZGFyU3RhdHVzKCB0aGlzLmNvbGxlY3Rpb25WaWV3LmNvbGxlY3Rpb24sIHRoaXMubW9kZWwgKTtcblxuXHRcdHRoaXMubGlzdGVuVG8oIHRoaXMubW9kZWwsIFwiY2hhbmdlOnJvb21EYXRhXCIsIHRoaXMudXBkYXRlRXZlbnRzICk7XG5cdFx0dGhpcy51cGRhdGVFdmVudHMoKTtcblx0fSxcblx0b25TaG93IDogZnVuY3Rpb24oKXtcblxuXHRcdHRoaXMuZ2V0UmVnaW9uKCBcImV2ZW50TGlzdFwiICkuc2hvdyggdGhpcy5jb2xsZWN0aW9uVmlldyApO1xuXHRcdFxuXHR9LFxuXHRvbkNsb3NlIDogZnVuY3Rpb24oKXtcblxuXHRcdEFwcFJvdXRlci5uYXZpZ2F0ZShcIi9cIiwge3RyaWdnZXI6IHRydWV9KTtcblx0fSxcblx0dXBkYXRlRXZlbnRzIDogZnVuY3Rpb24oKXtcblxuXHRcdGNvbnNvbGUubG9nKFwiQVNEQVNEIVwiKVxuXG5cdFx0Y29uc29sZS5sb2coIHRoaXMuY29sbGVjdGlvblZpZXcuY29sbGVjdGlvbiApO1xuXG5cdFx0dmFyIHJvb21EYXRhID0gdGhpcy5tb2RlbC5nZXQoXCJyb29tRGF0YVwiKTtcblx0XHR2YXIgbmV3TW9kZWxzID0gW107XG5cblx0XHRfLmVhY2goIHJvb21EYXRhLml0ZW1zLCBmdW5jdGlvbiggaXRlbSApe1xuXG5cdFx0XHR2YXIgbSA9IG5ldyBDYWxlbmRhckl0ZW1Nb2RlbCggaXRlbSApO1xuXHRcdFx0bmV3TW9kZWxzLnB1c2goIG0gKTtcblx0XHR9LCB0aGlzKTtcblxuXHRcdHRoaXMuY29sbGVjdGlvblZpZXcuY29sbGVjdGlvbi5yZXNldCggbmV3TW9kZWxzICk7XG5cblxuXHRcdGNvbnNvbGUubG9nKHJvb21EYXRhKTtcblx0XHR0aGlzLm1vZGVsLnNldChcInJvb21EYXRhXCIsIHJvb21EYXRhKTtcblx0fVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gQ2FsZW5kYXJTaW5nbGU7IiwidmFyIEFwcFJvdXRlciBcdFx0PSByZXF1aXJlKCBcImNvbnRyb2xsZXJzL2FwcFJvdXRlclwiICk7XG5cbnZhciBjYWxlbmRhckxvYWQgPSByZXF1aXJlKFwiY29udHJvbGxlcnMvY2FsZW5kYXJMb2FkXCIpO1xudmFyIENhbGVuZGFyU2luZ2xlIFx0PSByZXF1aXJlKFwidmlld3MvY2FsZW5kYXJTaW5nbGVcIik7XG52YXIgQ2FsZW5kYXJNb2RlbCBcdD0gcmVxdWlyZShcIm1vZGVscy9jYWxlbmRhck1vZGVsXCIpO1xudmFyIENhbGVuZGFyQ29sbGVjdGlvbiBcdD0gcmVxdWlyZShcImNvbGxlY3Rpb25zL2NhbGVuZGFyQ29sbGVjdGlvblwiKTtcblxudmFyIGh1ZUNvbm5lY3QgPSByZXF1aXJlKFwiY29udHJvbGxlcnMvaHVlQ29ubmVjdFwiKTtcbnZhciBMaWdodFBhdHRlcm4gPSByZXF1aXJlKFwiY29udHJvbGxlcnMvbGlnaHRQYXR0ZXJuXCIpO1xudmFyIHJvb21EYXRhID0gcmVxdWlyZShcInJvb21EYXRhXCIpO1xuXG52YXIgQ2FsZW5kYXJWaWV3ID0gTWFyaW9uZXR0ZS5MYXlvdXRWaWV3LmV4dGVuZCh7XG5cdHRlbXBsYXRlIDogXy50ZW1wbGF0ZSggcmVxdWlyZShcInRlbXBsYXRlcy9jYWxlbmRhcldyYXBwZXIuaHRtbFwiKSApLFxuXHRyZWdpb25zIDoge1xuXHRcdHJvb21TaW5nbGUgOiBcIiNyb29tLXNpbmdsZVwiLFxuXHR9LFxuXHR1aSA6IHtcblx0XHRjb2xvclBpY2tlciA6IFwiLmNvbG9yXCIsXG5cdFx0dGVzdCA6IFwiI3Rlc3RcIixcblx0XHRoZXhCdXR0b24gOiBcIiNoZXhcIixcblx0XHRoZXhJbnB1dCA6IFwiI2hleC1pbnB1dFwiLFxuXHRcdHJvb21TcGxpdCA6IFwiI3Jvb20tc3BsaXRcIixcblx0XHRyb29tIDogXCIucm9vbVwiXG5cdH0sXG5cdGV2ZW50cyA6IHtcblx0XHRcImNsaWNrIEB1aS50ZXN0XCIgOiBmdW5jdGlvbigpe1xuXHRcdFx0Zm9yKCB2YXIgaSA9IDAgOyBpIDwgNSA7IGkrKyApe1xuXHRcdFx0XHRuZXcgTGlnaHRQYXR0ZXJuKGkrMSwgXCJ0ZXN0XCIpO1xuXHRcdFx0fVxuXHRcdH0sXG5cdFx0XCJjbGljayBAdWkuaGV4QnV0dG9uXCIgOiBmdW5jdGlvbigpe1xuXHRcdFx0dmFyIGNvbG9yID0gdGhpcy51aS5oZXhJbnB1dC52YWwoKTtcblx0XHRcdHRoaXMudGVzdENvbG9yKCBjb2xvciApO1xuXHRcdH0sXG5cdFx0XCJjbGljayBAdWkucm9vbVwiIDogZnVuY3Rpb24oIGUgKXtcblx0XHRcdHZhciBrZXkgPSAkKCBlLmN1cnJlbnRUYXJnZXQgKS5kYXRhKFwiaWRcIik7XG5cdFx0XHRBcHBSb3V0ZXIubmF2aWdhdGUoXCJyb29tL1wiK2tleSwge3RyaWdnZXI6IHRydWV9KTtcblx0XHR9XG5cdH0sXG5cdGluaXRpYWxpemUgOiBmdW5jdGlvbigpe1xuXHRcdFxuXHRcdHRoaXMuY2FsZW5kYXJTdG9yZSA9IHt9O1xuXHRcdHRoaXMubGlzdGVuVG8oIGNhbGVuZGFyTG9hZC5ldmVudHMsIFwiZXZlbnRzTG9hZGVkXCIsIHRoaXMuZXZlbnRzTG9hZGVkICk7XG5cdFx0XG5cdH0sXG5cdG9uU2hvdyA6IGZ1bmN0aW9uKCl7XG5cblx0XHR2YXIgY29sb3JQaWNrZXIgPSB0aGlzLnVpLmNvbG9yUGlja2VyO1xuXHRcdHZhciBfdGhpcyA9IHRoaXM7XG5cdFx0JChjb2xvclBpY2tlcikuY2hhbmdlKGZ1bmN0aW9uKCl7XG5cdFx0XHR2YXIgdmFsID0gJCh0aGlzKS52YWwoKTtcblx0XHRcdF90aGlzLnRlc3RDb2xvciggdmFsICk7XG5cdFx0fSk7XG5cblx0XHR0aGlzLmxpc3RlblRvKCBBcHBSb3V0ZXIsIFwicm91dGU6cm9vbVJvdXRlXCIsIGZ1bmN0aW9uKCBrZXkgKXtcblx0XHRcdFxuXHRcdFx0dGhpcy5zaG93Um9vbSgga2V5ICk7XG5cdFx0fSk7XG5cdFx0dGhpcy5saXN0ZW5UbyggQXBwUm91dGVyLCBcInJvdXRlOmRlZmF1bHRSb3V0ZVwiLCB0aGlzLnNob3dTcGxpdCApO1xuXHR9LFxuXHRzaG93U3BsaXQgOiBmdW5jdGlvbigpe1xuXG5cdFx0dmFyICRzcGxpdEVsID0gdGhpcy51aS5yb29tU3BsaXQ7XG5cdFx0dmFyICRzaW5nbGVFbCA9IHRoaXMuZ2V0UmVnaW9uKCBcInJvb21TaW5nbGVcIiApLiRlbDtcblxuXHRcdCRzcGxpdEVsLnNob3coKTtcblx0XHQkc2luZ2xlRWwuaGlkZSgpO1xuXHR9LFxuXHRzaG93Um9vbSA6IGZ1bmN0aW9uKCBrZXkgKXtcblxuXHRcdHZhciAkc3BsaXRFbCA9IHRoaXMudWkucm9vbVNwbGl0O1xuXHRcdFxuXHRcdHZhciBtb2RlbCA9IHRoaXMuY2FsZW5kYXJTdG9yZVsga2V5IF07XG5cblx0XHRpZiggIW1vZGVsICl7XG5cdFx0XHR0aGlzLnF1ZXVlZEtleSA9IGtleTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0XG5cdFx0XHR2YXIgdmlldyA9IG5ldyBDYWxlbmRhclNpbmdsZSh7IG1vZGVsIDogbW9kZWwgfSlcblx0XHRcdHZhciByZWdpb24gPSB0aGlzLmdldFJlZ2lvbiggXCJyb29tU2luZ2xlXCIgKS5zaG93KCB2aWV3ICk7XG5cdFx0XHQkc2luZ2xlRWwgPSByZWdpb24uJGVsO1xuXG5cdFx0XHQkc2luZ2xlRWwuc2hvdygpO1xuXHRcdFx0JHNwbGl0RWwuaGlkZSgpO1xuXHRcdH1cblx0fSxcblx0Y2hlY2tRdWV1ZSA6IGZ1bmN0aW9uKCl7XG5cblx0XHRpZiggdGhpcy5xdWV1ZWRLZXkgKXtcblx0XHRcdHRoaXMuc2hvd1Jvb20oIHRoaXMucXVldWVkS2V5ICk7XG5cdFx0fVxuXHR9LFxuXHR0ZXN0Q29sb3IgOiBmdW5jdGlvbiggX2NvbG9yICl7XG5cblx0XHR2YXIgY29sb3IgPSBvbmUuY29sb3IoIF9jb2xvciApO1xuXHRcdHZhciBoc2wgPSB7XG5cdFx0XHRoIDogTWF0aC5mbG9vciggY29sb3IuaCgpICogMzYwKSwgXG5cdFx0XHRzIDogTWF0aC5mbG9vciggY29sb3IucygpICogMTAwKSxcblx0XHRcdGwgOiBNYXRoLmZsb29yKCBjb2xvci5sKCkgKiAxMDApIFxuXHRcdH07XG5cdFx0aHVlQ29ubmVjdC51cGRhdGUoW1xuXHRcdFx0e1xuXHRcdFx0XHQnaWQnIDogMSxcblx0XHRcdFx0J2RhdGEnIDoge1xuXHRcdFx0XHRcdCdoc2wnIDogaHNsLFxuXHRcdFx0XHRcdCdkdXJhdGlvbicgOiAxXG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHR7XG5cdFx0XHRcdCdpZCcgOiAyLFxuXHRcdFx0XHQnZGF0YScgOiB7XG5cdFx0XHRcdFx0J2hzbCcgOiBoc2wsXG5cdFx0XHRcdFx0J2R1cmF0aW9uJyA6IDFcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0J2lkJyA6IDMsXG5cdFx0XHRcdCdkYXRhJyA6IHtcblx0XHRcdFx0XHQnaHNsJyA6IGhzbCxcblx0XHRcdFx0XHQnZHVyYXRpb24nIDogMVxuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHQnaWQnIDogNCxcblx0XHRcdFx0J2RhdGEnIDoge1xuXHRcdFx0XHRcdCdoc2wnIDogaHNsLFxuXHRcdFx0XHRcdCdkdXJhdGlvbicgOiAxXG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHR7XG5cdFx0XHRcdCdpZCcgOiA1LFxuXHRcdFx0XHQnZGF0YScgOiB7XG5cdFx0XHRcdFx0J2hzbCcgOiBoc2wsXG5cdFx0XHRcdFx0J2R1cmF0aW9uJyA6IDFcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdF0pO1x0XHRcblx0fSxcblx0ZXZlbnRzTG9hZGVkIDogZnVuY3Rpb24oIGRhdGEgKXtcblx0XHRcblx0XHR2YXIga2V5ID0gZGF0YS5rZXk7XG5cdFx0XG5cdFx0aWYoICAhdGhpcy5jYWxlbmRhclN0b3JlWyBrZXkgXSApe1xuXG5cdFx0XHR0aGlzLmNhbGVuZGFyU3RvcmVbIGtleSBdID0gbmV3IENhbGVuZGFyTW9kZWwoe1xuXHRcdFx0XHRldmVudENvbGxlY3Rpb24gOiBuZXcgQ2FsZW5kYXJDb2xsZWN0aW9uKClcblx0XHRcdH0pO1xuXHRcdH0gXG5cblx0XHR0aGlzLmNhbGVuZGFyU3RvcmVbIGtleSBdLnNldChcInJvb21EYXRhXCIsIGRhdGEuZGF0YSk7XG5cblx0XHR0aGlzLmNoZWNrUXVldWUoKTtcblx0fSBcbn0pO1xuXG5cbm1vZHVsZS5leHBvcnRzID0gQ2FsZW5kYXJWaWV3OyAgICAgICAgICAgICAgICAgICAgXG4gICAgXG4gIl19
