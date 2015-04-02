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







         
},{"controllers/appRouter":2,"roomData":9,"views/appLayout":13,"views/calendarWrapper":16}],2:[function(require,module,exports){
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

},{}],3:[function(require,module,exports){
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

},{"pipe":8,"roomData":9}],4:[function(require,module,exports){
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
},{}],5:[function(require,module,exports){
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
},{"controllers/hueConnect":4}],6:[function(require,module,exports){
var CalendarModel = Backbone.Model.extend({
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
	}
})

module.exports = CalendarModel;
},{}],7:[function(require,module,exports){
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

},{}],8:[function(require,module,exports){
var pipe = _.extend({

	
	
}, Backbone.Events);

module.exports = pipe;
},{}],9:[function(require,module,exports){
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
},{}],10:[function(require,module,exports){
module.exports = "\n<h2>summary : <%= summary %></h2>\n\n<h3>description : <%= description %></h3>\n\n<h3>start : <%= start.formatted %></h3>\n\n<h3>end : <%= end.formatted %></h3>";

},{}],11:[function(require,module,exports){
module.exports = "<button id=\"close\">close</button>\n<div id=\"event-list\"></div> ";

},{}],12:[function(require,module,exports){
module.exports = "\n<div id=\"splash-page\">\n\t<div id=\"room-split\">\n\t\t<% _.each( rooms, function( data, key ){ %>\n\t\t\t<div class=\"room-container\">\n\t\t\t\t<section id=\"room-<%= key %>\" class=\"room\" data-id=\"<%= key %>\">\n\t\t\t\t\t<div class=\"number\"><%= key %></div>\n\t\t\t\t\t<div class=\"graph\"></div>\n\t\t\t\t\t<div class=\"person\">Charlie Clark</div>\n\t\t\t\t</section>\n\t\t\t</div>\n\t\t<% }); %>\n\t</div>\n</div>\n\n<div id=\"room-single\"></div>\n\n<!-- TEST -->\n<div class=\"test\" style=\"position:absolute;top:0;\">\n\t<div>\n\t\t<input id=\"hex-input\" type=\"text\"></input>\n\t\t<button id=\"hex\">hex</button>\n\t</div>\n\t<button id=\"test\">test</button>\n\t<input class=\"color\" type=\"color\" name=\"favcolor\">\n</div>";

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
},{"models/state":7}],14:[function(require,module,exports){
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
},{"templates/calendarItem.html":10}],15:[function(require,module,exports){
var CalendarItem 	= require("views/calendarItem");
var CalendarModel 	= require("models/calendarModel");
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
			collection : new Backbone.Collection()
		});

		this.listenTo( this.model, "change:roomData", this.updateEvents );
	},
	onShow : function(){

		this.getRegion( "eventList" ).show( this.collectionView );
		this.updateEvents();
	},
	onClose : function(){

		AppRouter.navigate("/", {trigger: true});
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
},{"controllers/appRouter":2,"models/calendarModel":6,"templates/calendarSingle.html":11,"views/calendarItem":14}],16:[function(require,module,exports){
var AppRouter 		= require( "controllers/appRouter" );

var calendarLoad = require("controllers/calendarLoad");
var CalendarSingle 	= require("views/calendarSingle");

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
			var view =  new CalendarSingle( { model : model });
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
		
		var myCalendarModel = this.calendarStore[ key ] || new Backbone.Model() ;

		myCalendarModel.set("roomData", data.data);

		this.calendarStore[ key ] = myCalendarModel;

		this.checkQueue();
	} 
});


module.exports = CalendarView;                    
    
 
},{"controllers/appRouter":2,"controllers/calendarLoad":3,"controllers/hueConnect":4,"controllers/lightPattern":5,"roomData":9,"templates/calendarWrapper.html":12,"views/calendarSingle":15}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIuLi9wdWJsaWMvYXNzZXRzL2pzL3VzZXIvYXBwLmpzIiwiLi4vcHVibGljL2Fzc2V0cy9qcy91c2VyL2NvbnRyb2xsZXJzL2FwcFJvdXRlci5qcyIsIi4uL3B1YmxpYy9hc3NldHMvanMvdXNlci9jb250cm9sbGVycy9jYWxlbmRhckxvYWQuanMiLCIuLi9wdWJsaWMvYXNzZXRzL2pzL3VzZXIvY29udHJvbGxlcnMvaHVlQ29ubmVjdC5qcyIsIi4uL3B1YmxpYy9hc3NldHMvanMvdXNlci9jb250cm9sbGVycy9saWdodFBhdHRlcm4uanMiLCIuLi9wdWJsaWMvYXNzZXRzL2pzL3VzZXIvbW9kZWxzL2NhbGVuZGFyTW9kZWwuanMiLCIuLi9wdWJsaWMvYXNzZXRzL2pzL3VzZXIvbW9kZWxzL3N0YXRlLmpzIiwiLi4vcHVibGljL2Fzc2V0cy9qcy91c2VyL3BpcGUuanMiLCIuLi9wdWJsaWMvYXNzZXRzL2pzL3VzZXIvcm9vbURhdGEuanMiLCIuLi9wdWJsaWMvYXNzZXRzL2pzL3VzZXIvdGVtcGxhdGVzL2NhbGVuZGFySXRlbS5odG1sIiwiLi4vcHVibGljL2Fzc2V0cy9qcy91c2VyL3RlbXBsYXRlcy9jYWxlbmRhclNpbmdsZS5odG1sIiwiLi4vcHVibGljL2Fzc2V0cy9qcy91c2VyL3RlbXBsYXRlcy9jYWxlbmRhcldyYXBwZXIuaHRtbCIsIi4uL3B1YmxpYy9hc3NldHMvanMvdXNlci92aWV3cy9hcHBMYXlvdXQuanMiLCIuLi9wdWJsaWMvYXNzZXRzL2pzL3VzZXIvdmlld3MvY2FsZW5kYXJJdGVtLmpzIiwiLi4vcHVibGljL2Fzc2V0cy9qcy91c2VyL3ZpZXdzL2NhbGVuZGFyU2luZ2xlLmpzIiwiLi4vcHVibGljL2Fzc2V0cy9qcy91c2VyL3ZpZXdzL2NhbGVuZGFyV3JhcHBlci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2JBO0FBQ0E7O0FDREE7QUFDQTs7QUNEQTtBQUNBOztBQ0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIndpbmRvdy5Db21tb24gPSB7XG5cdHBhdGggOiB7XG5cdFx0YXNzZXRzIDogXCJhc3NldHMvXCIsXG5cdFx0aW1nIDogXCJhc3NldHMvaW1nL1wiLFxuXHRcdGF1ZGlvIDogXCJhc3NldHMvYXVkaW8vXCJcblx0fSxcblx0c2l6ZXMgOntcblx0XHRmcmFtZSA6IDEwXG5cdH1cbn07XG5cbi8vYmFzZVxudmFyIEFwcFJvdXRlciBcdFx0PSByZXF1aXJlKCBcImNvbnRyb2xsZXJzL2FwcFJvdXRlclwiICk7XG52YXIgQXBwTGF5b3V0IFx0XHQ9IHJlcXVpcmUoIFwidmlld3MvYXBwTGF5b3V0XCIgKTtcblxuLy9jdXN0b21cbnZhciBDYWxlbmRhcldyYXBwZXJcdD0gcmVxdWlyZShcInZpZXdzL2NhbGVuZGFyV3JhcHBlclwiKTtcbnZhciByb29tRGF0YSA9IHJlcXVpcmUoXCJyb29tRGF0YVwiKTtcblxuLy9USEUgQVBQTElDQVRJT05cbnZhciBNeUFwcCA9IE1hcmlvbmV0dGUuQXBwbGljYXRpb24uZXh0ZW5kKHtcblx0aW5pdGlhbGl6ZSA6IGZ1bmN0aW9uKCl7XG5cdFx0XG5cdH0sXG5cdG9uU3RhcnQgOiBmdW5jdGlvbigpe1xuXG5cdFx0QXBwTGF5b3V0LnJlbmRlcigpOyBcblxuXHRcdHZhciBteUNhbGVuZGFyID0gbmV3IENhbGVuZGFyV3JhcHBlciggeyBtb2RlbCA6IG5ldyBCYWNrYm9uZS5Nb2RlbCh7IHJvb21zIDogcm9vbURhdGEgfSkgfSk7XG5cdFx0QXBwTGF5b3V0LmdldFJlZ2lvbihcIm1haW5cIikuc2hvdyggbXlDYWxlbmRhciApO1xuXG5cdFx0QmFja2JvbmUuaGlzdG9yeS5zdGFydCh7XG5cdFx0XHRwdXNoU3RhdGUgOiBmYWxzZVxuXHRcdH0pO1xuXHR9IFxufSk7XG5cblxuXG4kKGZ1bmN0aW9uKCl7XG5cdHdpbmRvdy5hcHAgPSBuZXcgTXlBcHAoKTtcblx0d2luZG93LmFwcC5zdGFydCgpOyBcbn0pO1xuXG5cblxuXG5cblxuXG4gICAgICAgICAiLCJ2YXIgTXlBcHBSb3V0ZXIgPSBNYXJpb25ldHRlLkFwcFJvdXRlci5leHRlbmQoe1xuXHRjb250cm9sbGVyIDoge1xuXHRcdFwiZGVmYXVsdFJvdXRlXCIgOiBmdW5jdGlvbigpe30sXG5cdFx0XCJyb29tUm91dGVcIiA6IGZ1bmN0aW9uKCl7fSxcblx0fSxcblx0YXBwUm91dGVzIDoge1xuXHRcdFwicm9vbS86a2V5XCIgOiBcInJvb21Sb3V0ZVwiLFxuXHRcdFwiKmFjdGlvbnNcIiA6IFwiZGVmYXVsdFJvdXRlXCIsXG5cdH1cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IG5ldyBNeUFwcFJvdXRlcigpO1xuIiwidmFyIHBpcGUgPSByZXF1aXJlKFwicGlwZVwiKTtcblxuLy9saXN0ZW5pbmcgZm9yIGxvYWRcbndpbmRvdy5oYW5kbGVDbGllbnRMb2FkID0gZnVuY3Rpb24oKXtcblxuICBjb25zb2xlLmxvZyhcImdvb2dsZSBhcGkgbG9hZGVkXCIpO1xuICBpbml0KCk7XG59XG5cbnZhciBjbGllbnRJZCA9ICc0MzM4Mzk3MjMzNjUtdTdncmxkdHZmOHBhYmprajRmcmNpbzNjdjVoaXQ4Zm0uYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20nO1xudmFyIGFwaUtleSA9ICdBSXphU3lCc0tkVHBsUlh1RXdndlBTSF9nR0Y4T0dzdzM1dDE1djAnO1xudmFyIHNjb3BlcyA9ICdodHRwczovL3d3dy5nb29nbGVhcGlzLmNvbS9hdXRoL2NhbGVuZGFyJztcbnZhciByb29tRGF0YSA9IHJlcXVpcmUoXCJyb29tRGF0YVwiKTtcblxuXG4vL1RPRE8gOiBpbnRlZ3JhdGUgYWxsIDQgY2FsZW5kYXJzXG5cbmZ1bmN0aW9uIGluaXQoKXtcblx0Z2FwaS5jbGllbnQuc2V0QXBpS2V5KGFwaUtleSk7XG5cdGNoZWNrQXV0aCgpO1xufVxuXG5mdW5jdGlvbiBjaGVja0F1dGgoKXtcblx0Z2FwaS5hdXRoLmF1dGhvcml6ZSgge1xuXHRcdGNsaWVudF9pZDogY2xpZW50SWQsIFxuXHRcdHNjb3BlOiBzY29wZXMsIFxuXHRcdGltbWVkaWF0ZTogZmFsc2Vcblx0fSwgaGFuZGxlQXV0aFJlc3VsdCApO1xufVxuXG5mdW5jdGlvbiBoYW5kbGVBdXRoUmVzdWx0KCBhdXRoUmVzdWx0ICl7XG5cblx0aWYoYXV0aFJlc3VsdCl7XG5cdFx0bWFrZUFwaUNhbGwoKTtcblx0fVxufVxuXG5mdW5jdGlvbiBtYWtlQXBpQ2FsbCgpIHtcbiAgZ2FwaS5jbGllbnQubG9hZCgnY2FsZW5kYXInLCAndjMnLCBmdW5jdGlvbigpIHtcbiAgICAgIFxuICAgICAgcHVsbFJvb21zKCk7ICAgICAgICAgIFxuICB9KTtcbn1cblxuZnVuY3Rpb24gcHVsbFJvb21zKCl7XG5cbiAgdmFyIGZyb20gPSBuZXcgRGF0ZSgpO1xuICB2YXIgdG8gPSBuZXcgRGF0ZSgpO1xuICAgICAgdG8uc2V0RGF0ZSggdG8uZ2V0RGF0ZSgpICsgMSApO1xuXG4gIF8uZWFjaCggcm9vbURhdGEsIGZ1bmN0aW9uKCBkYXRhLCBrZXkgKXtcblxuICAgIHZhciByZXF1ZXN0ID0gZ2FwaS5jbGllbnQuY2FsZW5kYXIuZXZlbnRzLmxpc3Qoe1xuICAgICAgICAnY2FsZW5kYXJJZCc6IGRhdGEuY2FsZW5kYXJJZCxcbiAgICAgICAgdGltZU1pbiA6IGZyb20udG9JU09TdHJpbmcoKSxcbiAgICAgICAgdGltZU1heCA6IHRvLnRvSVNPU3RyaW5nKCksXG4gICAgICAgIHNpbmdsZUV2ZW50cyA6IHRydWVcbiAgICAgIH0pO1xuXG4gICAgIHJlcXVlc3QudGhlbihmdW5jdGlvbihyZXNwb25zZSkge1xuXG4gICAgICAgICAgY29uc29sZS5sb2cocmVzcG9uc2UucmVzdWx0KTtcbiAgICAgICAgICByb29tTG9hZGVkKCBrZXksIHJlc3BvbnNlLnJlc3VsdCApO1xuICAgICAgfSwgZnVuY3Rpb24ocmVhc29uKSB7XG5cbiAgICAgICAgICBjb25zb2xlLmxvZygnRXJyb3I6ICcgKyByZWFzb24ucmVzdWx0LmVycm9yLm1lc3NhZ2UpO1xuICAgICAgfSk7XG4gIH0pO1xufVxuXG5mdW5jdGlvbiByb29tTG9hZGVkKCBrZXksIGRhdGEgKXtcblxuICBldmVudHMudHJpZ2dlciggXCJldmVudHNMb2FkZWRcIiwgeyBrZXkgOiBrZXksIGRhdGEgOiBkYXRhIH0gKTtcbn1cblxudmFyIGV2ZW50cyA9IF8uZXh0ZW5kKHt9LCBCYWNrYm9uZS5FdmVudHMpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblxuICBldmVudHMgOiBldmVudHNcbn07XG4iLCJ2YXIgbXlTb2NrZXQgPSBudWxsO1xudmFyIGNvbm5lY3RlZCA9IGZhbHNlO1xuXG5mdW5jdGlvbiBpbml0KCl7XG5cblx0bXlTb2NrZXQgPSBpby5jb25uZWN0KCcvL2xvY2FsaG9zdDozMDAwJyk7XG5cdG15U29ja2V0Lm9uKCdjb25uZWN0JywgZnVuY3Rpb24oKXtcblx0XHRjb25uZWN0ZWQgPSB0cnVlO1xuXHR9KTtcdFxufVxuXG5mdW5jdGlvbiB1cGRhdGUoIGRhdGEgKXtcblxuXHRpZihjb25uZWN0ZWQpe1xuXHRcdG15U29ja2V0LmVtaXQoICd1cGRhdGVfZGF0YScsIGRhdGEgKTtcdFxuXHR9XG59XG5cbi8vIHZhciB0aHJvdHRsZWRVcGRhdGUgPSBfLnRocm90dGxlKCB1cGRhdGUsIDUwMCwge2xlYWRpbmc6IGZhbHNlfSApO1xuXG5pbml0KCk7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXHRpbml0IDogaW5pdCxcblx0dXBkYXRlIDogdXBkYXRlLFxuXHRjb25uZWN0ZWQgOiBjb25uZWN0ZWRcbn0iLCJ2YXIgaHVlQ29ubmVjdCA9IHJlcXVpcmUoXCJjb250cm9sbGVycy9odWVDb25uZWN0XCIpO1xuXG5mdW5jdGlvbiBMaWdodFBhdHRlcm4oIGxpZ2h0SWQsIHBhdHRlcm5JZCApe1xuXG5cdHRoaXMuX2hzbCA9IHtcblx0XHRoIDogMCxcblx0XHRzIDogMCxcblx0XHRsIDogMFxuXHR9XG5cblx0dGhpcy5fbGlnaHRJZCA9IGxpZ2h0SWQ7XG5cdHRoaXMuX3BhdHRlcm5JZCA9IHBhdHRlcm5JZDtcblxuXHR0aGlzLl9zdGVwID0gMDtcblx0dGhpcy5faXRlcmF0aW9uID0gMDtcblx0dGhpcy5fcmVwZWF0ID0gcGF0dGVybnNbIHRoaXMuX3BhdHRlcm5JZCBdLnJlcGVhdDtcblxuXHR0aGlzLl9zZXF1ZW5jZSA9IHRoaXMuc3RhcnRTZXF1ZW5jZSggdGhpcy5fcGF0dGVybklkICk7XG5cblx0dGhpcy5fdGltZW91dCA9IG51bGw7XG59XG5cbkxpZ2h0UGF0dGVybi5wcm90b3R5cGUgPSB7XG5cdHN0YXJ0U2VxdWVuY2UgOiBmdW5jdGlvbiggaWQgKXtcblxuXHRcdHRoaXMuX3NlcXVlbmNlID0gcGF0dGVybnNbIGlkIF0uc2VxdWVuY2U7XG5cblx0XHR0aGlzLnN0b3BTZXF1ZW5jZSgpO1xuXHRcdHRoaXMucGxheVNlcXVlbmNlU3RlcCgwKTtcblxuXHRcdHJldHVybiB0aGlzLl9zZXF1ZW5jZTtcblx0fSxcblx0c3RvcFNlcXVlbmNlIDogZnVuY3Rpb24oKXtcblxuXHRcdHRoaXMuX3N0ZXAgPSAwO1xuXHRcdHRoaXMuX2l0ZXJhdGlvbiA9IDA7XG5cblx0XHR3aW5kb3cuY2xlYXJUaW1lb3V0KCB0aGlzLl90aW1lb3V0ICk7XG5cdH0sXG5cdHBsYXlTZXF1ZW5jZVN0ZXA6IGZ1bmN0aW9uKCBzdGVwICl7XG5cblx0XHR0aGlzLl9zdGVwID0gc3RlcDtcblxuXHRcdHZhciBzZWdtZW50ID0gdGhpcy5fc2VxdWVuY2VbdGhpcy5fc3RlcF07XG5cblx0XHR2YXIgY29sb3IgPSBvbmUuY29sb3IoIHNlZ21lbnQuY29sb3IgKTtcblx0XHR2YXIgZmFkZSA9IHNlZ21lbnQuZmFkZTtcblx0XHR2YXIgd2FpdCA9IHNlZ21lbnQud2FpdDtcblxuXHRcdHZhciBoc2wgPSB7XG5cdFx0XHRoIDogTWF0aC5mbG9vciggY29sb3IuaCgpICogMzYwKSwgXG5cdFx0XHRzIDogTWF0aC5mbG9vciggY29sb3IucygpICogMTAwKSxcblx0XHRcdGwgOiBNYXRoLmZsb29yKCBjb2xvci5sKCkgKiAxMDApIFxuXHRcdH07XG5cblx0XHRodWVDb25uZWN0LnVwZGF0ZShbe1xuXHRcdFx0aWQgOiB0aGlzLl9saWdodElkLFxuXHRcdFx0ZGF0YSA6IHtcblx0XHRcdFx0aHNsIDogaHNsLFxuXHRcdFx0XHRkdXJhdGlvbiA6IGZhZGVcblx0XHRcdH1cblx0XHR9XSk7XG5cblx0XHR3aW5kb3cuY2xlYXJUaW1lb3V0KCB0aGlzLl90aW1lb3V0ICk7XG5cdFx0dGhpcy5fdGltZW91dCA9IHdpbmRvdy5zZXRUaW1lb3V0KCQucHJveHkodGhpcy5uZXh0U2VxdWVuY2VTdGVwLCB0aGlzKSwgd2FpdCoxMDAwKTtcblx0fSxcblx0bmV4dFNlcXVlbmNlU3RlcDogZnVuY3Rpb24oKXtcblxuXHRcdHZhciB0b3RhbFN0ZXBzID0gdGhpcy5fc2VxdWVuY2UubGVuZ3RoO1xuXHRcdHZhciByZXBlYXQgPSB0aGlzLl9yZXBlYXQ7XG5cblx0XHR0aGlzLl9zdGVwICsrO1xuXHRcdGlmKHRoaXMuX3N0ZXAgPiB0b3RhbFN0ZXBzIC0gMSkge1xuXHRcdFx0dGhpcy5fc3RlcCA9IDA7XG5cdFx0XHR0aGlzLl9pdGVyYXRpb24gKys7XG5cdFx0fVxuXG5cdFx0aWYocmVwZWF0ID4gLTEgJiYgdGhpcy5faXRlcmF0aW9uID4gcmVwZWF0KSB7XG5cdFx0XHR0aGlzLnN0b3BTZXF1ZW5jZSgpO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdHRoaXMucGxheVNlcXVlbmNlU3RlcCggdGhpcy5fc3RlcCApO1xuXHR9XG59XG5cbnZhciBwYXR0ZXJucyA9IHtcblx0J3Rlc3QnIDoge1xuXHRcdHJlcGVhdCA6ICAtMSxcblx0XHRzZXF1ZW5jZSA6IFtcblx0XHRcdHsgY29sb3IgOiBcIiNGQjE5MTFcIiwgZmFkZSA6IDEsIHdhaXQgOiAxIH0sXG5cdFx0XHR7IGNvbG9yIDogXCIjMDBmZjAwXCIsIGZhZGUgOiAxLCB3YWl0IDogMSB9LFxuXHRcdFx0eyBjb2xvciA6IFwiIzQxNTZGRlwiLCBmYWRlIDogMSwgd2FpdCA6IDEgfSxcblx0XHRcdHsgY29sb3IgOiBcIiNGRjAwMURcIiwgZmFkZSA6IDEsIHdhaXQgOiAxIH0sXG5cdFx0XHR7IGNvbG9yIDogXCIjRkZGRjA3XCIsIGZhZGUgOiAxLCB3YWl0IDogMSB9LFxuXHRcdF1cblx0fVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IExpZ2h0UGF0dGVybjsiLCJ2YXIgQ2FsZW5kYXJNb2RlbCA9IEJhY2tib25lLk1vZGVsLmV4dGVuZCh7XG5cdGRlZmF1bHRzIDoge1xuXHRcdHN1bW1hcnkgOiBcIm4vYVwiLFxuXHRcdGRlc2NyaXB0aW9uIDogXCJuL2FcIixcblx0XHRzdGFydCA6IFwibi9hXCIsXG5cdFx0ZW5kIDogXCJuL2FcIixcblx0fSxcblx0aW5pdGlhbGl6ZSA6IGZ1bmN0aW9uKCl7XG5cblx0XHR0aGlzLmNvbnZlcnREYXRlKFwic3RhcnRcIik7XG5cdFx0dGhpcy5jb252ZXJ0RGF0ZShcImVuZFwiKTtcblx0fSxcblx0Y29udmVydERhdGUgOiBmdW5jdGlvbigga2V5ICl7XG5cdFx0Ly9jb252ZXJ0IGRhdGFzXG5cdFx0dmFyIGRhdGVTdHJpbmcgPSB0aGlzLmdldCgga2V5IClcblx0XHRpZighZGF0ZVN0cmluZykgcmV0dXJuO1xuXHRcdFxuXHRcdGRhdGVTdHJpbmcgPSBkYXRlU3RyaW5nLmRhdGVUaW1lO1xuXHRcdHZhciBub3cgPSBuZXcgRGF0ZSgpO1xuXHRcdHZhciBkYXRlID0gbmV3IERhdGUoIGRhdGVTdHJpbmcgKTtcblxuXHRcdHRoaXMuc2V0KCBrZXksIHtcblx0XHRcdHJhdyA6IGRhdGUsXG5cdFx0XHRmb3JtYXR0ZWQgOiBkYXRlLnRvU3RyaW5nKClcblx0XHR9KTtcblx0fVxufSlcblxubW9kdWxlLmV4cG9ydHMgPSBDYWxlbmRhck1vZGVsOyIsInZhciBzdGF0ZSA9IG5ldyAoQmFja2JvbmUuTW9kZWwuZXh0ZW5kKHtcblx0ZGVmYXVsdHMgOiB7XG5cdFx0Ly8gXCJuYXZfb3BlblwiIFx0XHQ6IGZhbHNlLFxuXHRcdC8vICdzY3JvbGxfYXRfdG9wJyA6IHRydWUsXG5cdFx0Ly8gJ21pbmltYWxfbmF2JyBcdDogZmFsc2UsXG5cdFx0Ly8gJ2Z1bGxfbmF2X29wZW4nXHQ6IGZhbHNlLFxuXHRcdC8vICd1aV9kaXNwbGF5J1x0OiBmYWxzZVxuXHR9XG59KSkoKTtcblxubW9kdWxlLmV4cG9ydHMgPSBzdGF0ZTtcbiIsInZhciBwaXBlID0gXy5leHRlbmQoe1xuXG5cdFxuXHRcbn0sIEJhY2tib25lLkV2ZW50cyk7XG5cbm1vZHVsZS5leHBvcnRzID0gcGlwZTsiLCJtb2R1bGUuZXhwb3J0cyA9IHtcblx0JzEnOiB7XG5cdFx0J2NhbGVuZGFySWQnIDogXCJiLXJlZWwuY29tXzJkMzIzODM3MzkzNjM2MzIzMjM3MzgzMUByZXNvdXJjZS5jYWxlbmRhci5nb29nbGUuY29tXCJcblx0fSxcblx0JzInOiB7XG5cdFx0J2NhbGVuZGFySWQnIDogXCJiLXJlZWwuY29tXzJkMzEzMjM3MzczODM4MzMzNDJkMzIzNDMyQHJlc291cmNlLmNhbGVuZGFyLmdvb2dsZS5jb21cIlxuXHR9LFxuXHQnMyc6IHtcblx0XHQnY2FsZW5kYXJJZCcgOiBcImItcmVlbC5jb21fMzEzNjM1MzMzOTM2MzEzOTM5MzMzOEByZXNvdXJjZS5jYWxlbmRhci5nb29nbGUuY29tXCJcblx0fSxcblx0JzUnOiB7XG5cdFx0J2NhbGVuZGFySWQnIDogXCJiLXJlZWwuY29tXzJkMzQzNDMyMzgzOTM2MzczMDJkMzYzNDMzQHJlc291cmNlLmNhbGVuZGFyLmdvb2dsZS5jb21cIlxuXHR9XG59OyIsIm1vZHVsZS5leHBvcnRzID0gXCJcXG48aDI+c3VtbWFyeSA6IDwlPSBzdW1tYXJ5ICU+PC9oMj5cXG5cXG48aDM+ZGVzY3JpcHRpb24gOiA8JT0gZGVzY3JpcHRpb24gJT48L2gzPlxcblxcbjxoMz5zdGFydCA6IDwlPSBzdGFydC5mb3JtYXR0ZWQgJT48L2gzPlxcblxcbjxoMz5lbmQgOiA8JT0gZW5kLmZvcm1hdHRlZCAlPjwvaDM+XCI7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IFwiPGJ1dHRvbiBpZD1cXFwiY2xvc2VcXFwiPmNsb3NlPC9idXR0b24+XFxuPGRpdiBpZD1cXFwiZXZlbnQtbGlzdFxcXCI+PC9kaXY+IFwiO1xuIiwibW9kdWxlLmV4cG9ydHMgPSBcIlxcbjxkaXYgaWQ9XFxcInNwbGFzaC1wYWdlXFxcIj5cXG5cXHQ8ZGl2IGlkPVxcXCJyb29tLXNwbGl0XFxcIj5cXG5cXHRcXHQ8JSBfLmVhY2goIHJvb21zLCBmdW5jdGlvbiggZGF0YSwga2V5ICl7ICU+XFxuXFx0XFx0XFx0PGRpdiBjbGFzcz1cXFwicm9vbS1jb250YWluZXJcXFwiPlxcblxcdFxcdFxcdFxcdDxzZWN0aW9uIGlkPVxcXCJyb29tLTwlPSBrZXkgJT5cXFwiIGNsYXNzPVxcXCJyb29tXFxcIiBkYXRhLWlkPVxcXCI8JT0ga2V5ICU+XFxcIj5cXG5cXHRcXHRcXHRcXHRcXHQ8ZGl2IGNsYXNzPVxcXCJudW1iZXJcXFwiPjwlPSBrZXkgJT48L2Rpdj5cXG5cXHRcXHRcXHRcXHRcXHQ8ZGl2IGNsYXNzPVxcXCJncmFwaFxcXCI+PC9kaXY+XFxuXFx0XFx0XFx0XFx0XFx0PGRpdiBjbGFzcz1cXFwicGVyc29uXFxcIj5DaGFybGllIENsYXJrPC9kaXY+XFxuXFx0XFx0XFx0XFx0PC9zZWN0aW9uPlxcblxcdFxcdFxcdDwvZGl2PlxcblxcdFxcdDwlIH0pOyAlPlxcblxcdDwvZGl2PlxcbjwvZGl2PlxcblxcbjxkaXYgaWQ9XFxcInJvb20tc2luZ2xlXFxcIj48L2Rpdj5cXG5cXG48IS0tIFRFU1QgLS0+XFxuPGRpdiBjbGFzcz1cXFwidGVzdFxcXCIgc3R5bGU9XFxcInBvc2l0aW9uOmFic29sdXRlO3RvcDowO1xcXCI+XFxuXFx0PGRpdj5cXG5cXHRcXHQ8aW5wdXQgaWQ9XFxcImhleC1pbnB1dFxcXCIgdHlwZT1cXFwidGV4dFxcXCI+PC9pbnB1dD5cXG5cXHRcXHQ8YnV0dG9uIGlkPVxcXCJoZXhcXFwiPmhleDwvYnV0dG9uPlxcblxcdDwvZGl2PlxcblxcdDxidXR0b24gaWQ9XFxcInRlc3RcXFwiPnRlc3Q8L2J1dHRvbj5cXG5cXHQ8aW5wdXQgY2xhc3M9XFxcImNvbG9yXFxcIiB0eXBlPVxcXCJjb2xvclxcXCIgbmFtZT1cXFwiZmF2Y29sb3JcXFwiPlxcbjwvZGl2PlwiO1xuIiwidmFyIFN0YXRlIFx0XHQ9IHJlcXVpcmUoXCJtb2RlbHMvc3RhdGVcIik7XG5cbnZhciBNeUFwcExheW91dCA9IE1hcmlvbmV0dGUuTGF5b3V0Vmlldy5leHRlbmQoe1xuXHRlbCA6IFwiI2NvbnRlbnRcIixcblx0dGVtcGxhdGUgOiBmYWxzZSxcblx0cmVnaW9ucyA6IHtcblx0XHRtYWluIDogXCIjbWFpblwiXG5cdH0sIFxuXHRpbml0aWFsaXplIDogZnVuY3Rpb24oKXtcblx0XHR2YXIgX3RoaXMgPSB0aGlzO1xuXG5cdFx0Ly93cmFwcGluZyBodG1sXG5cdFx0dGhpcy4kaHRtbCA9ICQoXCJodG1sXCIpO1xuXHRcdHRoaXMuJGh0bWwucmVtb3ZlQ2xhc3MoXCJoaWRkZW5cIik7XG5cblx0XHQvL3Jlc2l6ZSBldmVudHNcblx0XHQkKHdpbmRvdykucmVzaXplKGZ1bmN0aW9uKCl7XG5cdFx0XHRfdGhpcy5vblJlc2l6ZVdpbmRvdygpO1xuXHRcdH0pLnJlc2l6ZSgpO1xuXG5cdFx0dGhpcy5saXN0ZW5Gb3JTdGF0ZSgpO1xuXHR9LFxuXHRsaXN0ZW5Gb3JTdGF0ZSA6IGZ1bmN0aW9uKCl7XG5cdFx0Ly9zdGF0ZSBjaGFuZ2Vcblx0XHR0aGlzLmxpc3RlblRvKCBTdGF0ZSwgXCJjaGFuZ2VcIiwgZnVuY3Rpb24oIGUgKXtcblxuXHRcdFx0dGhpcy5vblN0YXRlQ2hhbmdlKCBlLmNoYW5nZWQsIGUuX3ByZXZpb3VzQXR0cmlidXRlcyApO1xuXHRcdH0sIHRoaXMpO1xuXHRcdHRoaXMub25TdGF0ZUNoYW5nZSggU3RhdGUudG9KU09OKCkgKTtcblx0fSxcblx0b25TdGF0ZUNoYW5nZSA6IGZ1bmN0aW9uKCBjaGFuZ2VkLCBwcmV2aW91cyApe1xuXG5cdFx0Xy5lYWNoKCBjaGFuZ2VkLCBmdW5jdGlvbih2YWx1ZSwga2V5KXtcblx0XHRcdFxuXHRcdFx0aWYoIF8uaXNCb29sZWFuKCB2YWx1ZSApICl7XG5cdFx0XHRcdHRoaXMuJGh0bWwudG9nZ2xlQ2xhc3MoXCJzdGF0ZS1cIitrZXksIHZhbHVlKTtcblx0XHRcdFx0dGhpcy4kaHRtbC50b2dnbGVDbGFzcyhcInN0YXRlLW5vdC1cIitrZXksICF2YWx1ZSk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR2YXIgcHJldlZhbHVlID0gcHJldmlvdXNbIGtleSBdO1xuXHRcdFx0XHRpZihwcmV2VmFsdWUpe1xuXHRcdFx0XHRcdHRoaXMuJGh0bWwudG9nZ2xlQ2xhc3MoXCJzdGF0ZS1cIitrZXkrXCItXCIrcHJldlZhbHVlLCBmYWxzZSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0dGhpcy4kaHRtbC50b2dnbGVDbGFzcyhcInN0YXRlLVwiK2tleStcIi1cIit2YWx1ZSwgdHJ1ZSk7XG5cdFx0XHR9XG5cblx0XHR9LCB0aGlzICk7XG5cdH0sXG5cdG9uUmVzaXplV2luZG93IDogZnVuY3Rpb24oKXtcblx0XHRDb21tb24ud3cgPSAkKHdpbmRvdykud2lkdGgoKTtcblx0XHRDb21tb24ud2ggPSAkKHdpbmRvdykuaGVpZ2h0KCk7XG5cdH1cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IG5ldyBNeUFwcExheW91dCgpOyIsInZhciBDYWxlbmRhckl0ZW0gPSBNYXJpb25ldHRlLkl0ZW1WaWV3LmV4dGVuZCh7XG5cdGNsYXNzTmFtZSA6IFwiaXRlbVwiLFxuXHR0ZW1wbGF0ZSA6IF8udGVtcGxhdGUoIHJlcXVpcmUoXCJ0ZW1wbGF0ZXMvY2FsZW5kYXJJdGVtLmh0bWxcIikgKSxcblx0dWkgOiB7XG5cdFx0J3RpdGxlJyA6IFwiaDJcIlxuXHR9LFxuXHRldmVudHMgOiB7XG5cdFx0J2NsaWNrIEB1aS50aXRsZScgOiBmdW5jdGlvbigpe1xuXG5cblx0XHR9XG5cdH1cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IENhbGVuZGFySXRlbTsiLCJ2YXIgQ2FsZW5kYXJJdGVtIFx0PSByZXF1aXJlKFwidmlld3MvY2FsZW5kYXJJdGVtXCIpO1xudmFyIENhbGVuZGFyTW9kZWwgXHQ9IHJlcXVpcmUoXCJtb2RlbHMvY2FsZW5kYXJNb2RlbFwiKTtcbnZhciBBcHBSb3V0ZXIgXHRcdD0gcmVxdWlyZSggXCJjb250cm9sbGVycy9hcHBSb3V0ZXJcIiApO1xuXG52YXIgQ2FsZW5kYXJTaW5nbGUgPSBNYXJpb25ldHRlLkxheW91dFZpZXcuZXh0ZW5kKHtcblx0dGVtcGxhdGUgOiBfLnRlbXBsYXRlKCByZXF1aXJlKFwidGVtcGxhdGVzL2NhbGVuZGFyU2luZ2xlLmh0bWxcIikgKSxcblx0cmVnaW9ucyA6IHtcblx0XHRldmVudExpc3QgOiBcIiNldmVudC1saXN0XCJcblx0fSxcblx0dWkgOiB7XG5cdFx0Y2xvc2VCdXR0b24gOiBcIiNjbG9zZVwiXG5cdH0sXG5cdGV2ZW50cyA6IHtcblx0XHQnY2xpY2sgQHVpLmNsb3NlQnV0dG9uJyA6IFwib25DbG9zZVwiXG5cdH0sXG5cdGluaXRpYWxpemUgOiBmdW5jdGlvbigpe1xuXG5cdFx0dGhpcy5jb2xsZWN0aW9uVmlldyA9IG5ldyBNYXJpb25ldHRlLkNvbGxlY3Rpb25WaWV3KHtcblx0XHRcdGNoaWxkVmlldyA6IENhbGVuZGFySXRlbSxcblx0XHRcdGNvbGxlY3Rpb24gOiBuZXcgQmFja2JvbmUuQ29sbGVjdGlvbigpXG5cdFx0fSk7XG5cblx0XHR0aGlzLmxpc3RlblRvKCB0aGlzLm1vZGVsLCBcImNoYW5nZTpyb29tRGF0YVwiLCB0aGlzLnVwZGF0ZUV2ZW50cyApO1xuXHR9LFxuXHRvblNob3cgOiBmdW5jdGlvbigpe1xuXG5cdFx0dGhpcy5nZXRSZWdpb24oIFwiZXZlbnRMaXN0XCIgKS5zaG93KCB0aGlzLmNvbGxlY3Rpb25WaWV3ICk7XG5cdFx0dGhpcy51cGRhdGVFdmVudHMoKTtcblx0fSxcblx0b25DbG9zZSA6IGZ1bmN0aW9uKCl7XG5cblx0XHRBcHBSb3V0ZXIubmF2aWdhdGUoXCIvXCIsIHt0cmlnZ2VyOiB0cnVlfSk7XG5cdH0sXG5cdHVwZGF0ZUV2ZW50cyA6IGZ1bmN0aW9uKCl7XG5cblx0XHR2YXIgcm9vbURhdGEgPSB0aGlzLm1vZGVsLmdldChcInJvb21EYXRhXCIpXG5cdFx0Xy5lYWNoKCByb29tRGF0YS5pdGVtcywgZnVuY3Rpb24oIGl0ZW0gKXtcblxuXHRcdFx0dmFyIG0gPSBuZXcgQ2FsZW5kYXJNb2RlbCggaXRlbSApO1xuXHRcdFx0dGhpcy5jb2xsZWN0aW9uVmlldy5jb2xsZWN0aW9uLmFkZCggbSApO1xuXHRcdH0sIHRoaXMpO1xuXHR9XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBDYWxlbmRhclNpbmdsZTsiLCJ2YXIgQXBwUm91dGVyIFx0XHQ9IHJlcXVpcmUoIFwiY29udHJvbGxlcnMvYXBwUm91dGVyXCIgKTtcblxudmFyIGNhbGVuZGFyTG9hZCA9IHJlcXVpcmUoXCJjb250cm9sbGVycy9jYWxlbmRhckxvYWRcIik7XG52YXIgQ2FsZW5kYXJTaW5nbGUgXHQ9IHJlcXVpcmUoXCJ2aWV3cy9jYWxlbmRhclNpbmdsZVwiKTtcblxudmFyIGh1ZUNvbm5lY3QgPSByZXF1aXJlKFwiY29udHJvbGxlcnMvaHVlQ29ubmVjdFwiKTtcbnZhciBMaWdodFBhdHRlcm4gPSByZXF1aXJlKFwiY29udHJvbGxlcnMvbGlnaHRQYXR0ZXJuXCIpO1xudmFyIHJvb21EYXRhID0gcmVxdWlyZShcInJvb21EYXRhXCIpO1xuXG52YXIgQ2FsZW5kYXJWaWV3ID0gTWFyaW9uZXR0ZS5MYXlvdXRWaWV3LmV4dGVuZCh7XG5cdHRlbXBsYXRlIDogXy50ZW1wbGF0ZSggcmVxdWlyZShcInRlbXBsYXRlcy9jYWxlbmRhcldyYXBwZXIuaHRtbFwiKSApLFxuXHRyZWdpb25zIDoge1xuXHRcdHJvb21TaW5nbGUgOiBcIiNyb29tLXNpbmdsZVwiLFxuXHR9LFxuXHR1aSA6IHtcblx0XHRjb2xvclBpY2tlciA6IFwiLmNvbG9yXCIsXG5cdFx0dGVzdCA6IFwiI3Rlc3RcIixcblx0XHRoZXhCdXR0b24gOiBcIiNoZXhcIixcblx0XHRoZXhJbnB1dCA6IFwiI2hleC1pbnB1dFwiLFxuXHRcdHJvb21TcGxpdCA6IFwiI3Jvb20tc3BsaXRcIixcblx0XHRyb29tIDogXCIucm9vbVwiXG5cdH0sXG5cdGV2ZW50cyA6IHtcblx0XHRcImNsaWNrIEB1aS50ZXN0XCIgOiBmdW5jdGlvbigpe1xuXHRcdFx0Zm9yKCB2YXIgaSA9IDAgOyBpIDwgNSA7IGkrKyApe1xuXHRcdFx0XHRuZXcgTGlnaHRQYXR0ZXJuKGkrMSwgXCJ0ZXN0XCIpO1xuXHRcdFx0fVxuXHRcdH0sXG5cdFx0XCJjbGljayBAdWkuaGV4QnV0dG9uXCIgOiBmdW5jdGlvbigpe1xuXHRcdFx0dmFyIGNvbG9yID0gdGhpcy51aS5oZXhJbnB1dC52YWwoKTtcblx0XHRcdHRoaXMudGVzdENvbG9yKCBjb2xvciApO1xuXHRcdH0sXG5cdFx0XCJjbGljayBAdWkucm9vbVwiIDogZnVuY3Rpb24oIGUgKXtcblx0XHRcdHZhciBrZXkgPSAkKCBlLmN1cnJlbnRUYXJnZXQgKS5kYXRhKFwiaWRcIik7XG5cdFx0XHRBcHBSb3V0ZXIubmF2aWdhdGUoXCJyb29tL1wiK2tleSwge3RyaWdnZXI6IHRydWV9KTtcblx0XHR9XG5cdH0sXG5cdGluaXRpYWxpemUgOiBmdW5jdGlvbigpe1xuXHRcdFxuXHRcdHRoaXMuY2FsZW5kYXJTdG9yZSA9IHt9O1xuXHRcdHRoaXMubGlzdGVuVG8oIGNhbGVuZGFyTG9hZC5ldmVudHMsIFwiZXZlbnRzTG9hZGVkXCIsIHRoaXMuZXZlbnRzTG9hZGVkICk7XG5cdFx0XG5cdH0sXG5cdG9uU2hvdyA6IGZ1bmN0aW9uKCl7XG5cblx0XHR2YXIgY29sb3JQaWNrZXIgPSB0aGlzLnVpLmNvbG9yUGlja2VyO1xuXHRcdHZhciBfdGhpcyA9IHRoaXM7XG5cdFx0JChjb2xvclBpY2tlcikuY2hhbmdlKGZ1bmN0aW9uKCl7XG5cdFx0XHR2YXIgdmFsID0gJCh0aGlzKS52YWwoKTtcblx0XHRcdF90aGlzLnRlc3RDb2xvciggdmFsICk7XG5cdFx0fSk7XG5cblx0XHR0aGlzLmxpc3RlblRvKCBBcHBSb3V0ZXIsIFwicm91dGU6cm9vbVJvdXRlXCIsIGZ1bmN0aW9uKCBrZXkgKXtcblx0XHRcdFxuXHRcdFx0dGhpcy5zaG93Um9vbSgga2V5ICk7XG5cdFx0fSk7XG5cdFx0dGhpcy5saXN0ZW5UbyggQXBwUm91dGVyLCBcInJvdXRlOmRlZmF1bHRSb3V0ZVwiLCB0aGlzLnNob3dTcGxpdCApO1xuXHR9LFxuXHRzaG93U3BsaXQgOiBmdW5jdGlvbigpe1xuXG5cdFx0dmFyICRzcGxpdEVsID0gdGhpcy51aS5yb29tU3BsaXQ7XG5cdFx0dmFyICRzaW5nbGVFbCA9IHRoaXMuZ2V0UmVnaW9uKCBcInJvb21TaW5nbGVcIiApLiRlbDtcblxuXHRcdCRzcGxpdEVsLnNob3coKTtcblx0XHQkc2luZ2xlRWwuaGlkZSgpO1xuXHR9LFxuXHRzaG93Um9vbSA6IGZ1bmN0aW9uKCBrZXkgKXtcblxuXHRcdHZhciAkc3BsaXRFbCA9IHRoaXMudWkucm9vbVNwbGl0O1xuXHRcdFxuXHRcdHZhciBtb2RlbCA9IHRoaXMuY2FsZW5kYXJTdG9yZVsga2V5IF07XG5cblx0XHRpZiggIW1vZGVsICl7XG5cdFx0XHR0aGlzLnF1ZXVlZEtleSA9IGtleTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dmFyIHZpZXcgPSAgbmV3IENhbGVuZGFyU2luZ2xlKCB7IG1vZGVsIDogbW9kZWwgfSk7XG5cdFx0XHR2YXIgcmVnaW9uID0gdGhpcy5nZXRSZWdpb24oIFwicm9vbVNpbmdsZVwiICkuc2hvdyggdmlldyApO1xuXHRcdFx0JHNpbmdsZUVsID0gcmVnaW9uLiRlbDtcblxuXHRcdFx0JHNpbmdsZUVsLnNob3coKTtcblx0XHRcdCRzcGxpdEVsLmhpZGUoKTtcblx0XHR9XG5cdH0sXG5cdGNoZWNrUXVldWUgOiBmdW5jdGlvbigpe1xuXG5cdFx0aWYoIHRoaXMucXVldWVkS2V5ICl7XG5cdFx0XHR0aGlzLnNob3dSb29tKCB0aGlzLnF1ZXVlZEtleSApO1xuXHRcdH1cblx0fSxcblx0dGVzdENvbG9yIDogZnVuY3Rpb24oIF9jb2xvciApe1xuXG5cdFx0dmFyIGNvbG9yID0gb25lLmNvbG9yKCBfY29sb3IgKTtcblx0XHR2YXIgaHNsID0ge1xuXHRcdFx0aCA6IE1hdGguZmxvb3IoIGNvbG9yLmgoKSAqIDM2MCksIFxuXHRcdFx0cyA6IE1hdGguZmxvb3IoIGNvbG9yLnMoKSAqIDEwMCksXG5cdFx0XHRsIDogTWF0aC5mbG9vciggY29sb3IubCgpICogMTAwKSBcblx0XHR9O1xuXHRcdGh1ZUNvbm5lY3QudXBkYXRlKFtcblx0XHRcdHtcblx0XHRcdFx0J2lkJyA6IDEsXG5cdFx0XHRcdCdkYXRhJyA6IHtcblx0XHRcdFx0XHQnaHNsJyA6IGhzbCxcblx0XHRcdFx0XHQnZHVyYXRpb24nIDogMVxuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHQnaWQnIDogMixcblx0XHRcdFx0J2RhdGEnIDoge1xuXHRcdFx0XHRcdCdoc2wnIDogaHNsLFxuXHRcdFx0XHRcdCdkdXJhdGlvbicgOiAxXG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHR7XG5cdFx0XHRcdCdpZCcgOiAzLFxuXHRcdFx0XHQnZGF0YScgOiB7XG5cdFx0XHRcdFx0J2hzbCcgOiBoc2wsXG5cdFx0XHRcdFx0J2R1cmF0aW9uJyA6IDFcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0J2lkJyA6IDQsXG5cdFx0XHRcdCdkYXRhJyA6IHtcblx0XHRcdFx0XHQnaHNsJyA6IGhzbCxcblx0XHRcdFx0XHQnZHVyYXRpb24nIDogMVxuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHQnaWQnIDogNSxcblx0XHRcdFx0J2RhdGEnIDoge1xuXHRcdFx0XHRcdCdoc2wnIDogaHNsLFxuXHRcdFx0XHRcdCdkdXJhdGlvbicgOiAxXG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRdKTtcdFx0XG5cdH0sXG5cdGV2ZW50c0xvYWRlZCA6IGZ1bmN0aW9uKCBkYXRhICl7XG5cdFx0XG5cdFx0dmFyIGtleSA9IGRhdGEua2V5O1xuXHRcdFxuXHRcdHZhciBteUNhbGVuZGFyTW9kZWwgPSB0aGlzLmNhbGVuZGFyU3RvcmVbIGtleSBdIHx8IG5ldyBCYWNrYm9uZS5Nb2RlbCgpIDtcblxuXHRcdG15Q2FsZW5kYXJNb2RlbC5zZXQoXCJyb29tRGF0YVwiLCBkYXRhLmRhdGEpO1xuXG5cdFx0dGhpcy5jYWxlbmRhclN0b3JlWyBrZXkgXSA9IG15Q2FsZW5kYXJNb2RlbDtcblxuXHRcdHRoaXMuY2hlY2tRdWV1ZSgpO1xuXHR9IFxufSk7XG5cblxubW9kdWxlLmV4cG9ydHMgPSBDYWxlbmRhclZpZXc7ICAgICAgICAgICAgICAgICAgICBcbiAgICBcbiAiXX0=
