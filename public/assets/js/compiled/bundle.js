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
		var date = new Date( dateString );

		this.set( key, {
			raw : date,
			formatted : date.toDateString()
		});
	},
	parse : function( data ){
		console.log("ASDADASDASDASDASDSAasdsa")
		console.log(data);
		return data;
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
module.exports = "<button id=\"close\"></button>\n<div id=\"event-list\"></div> ";

},{}],12:[function(require,module,exports){
module.exports = "\n<div id=\"room-split\">\n\t<% _.each( rooms, function( data, key ){ %>\n\t\t<div id=\"room-<%= key %>\" class=\"room\" data-id=\"<%= key %>\">room <%= key %></div>\n\t<% }); %>\n</div>\n<div id=\"room-single\"></div>\n\n<!-- TEST -->\n<div class=\"test\">\n\t<div>\n\t\t<input id=\"hex-input\" type=\"text\"></input>\n\t\t<button id=\"hex\">hex</button>\n\t</div>\n\t<button id=\"test\">test</button>\n\t<input class=\"color\" type=\"color\" name=\"favcolor\">\n</div>\n\n ";

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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIuLi9wdWJsaWMvYXNzZXRzL2pzL3VzZXIvYXBwLmpzIiwiLi4vcHVibGljL2Fzc2V0cy9qcy91c2VyL2NvbnRyb2xsZXJzL2FwcFJvdXRlci5qcyIsIi4uL3B1YmxpYy9hc3NldHMvanMvdXNlci9jb250cm9sbGVycy9jYWxlbmRhckxvYWQuanMiLCIuLi9wdWJsaWMvYXNzZXRzL2pzL3VzZXIvY29udHJvbGxlcnMvaHVlQ29ubmVjdC5qcyIsIi4uL3B1YmxpYy9hc3NldHMvanMvdXNlci9jb250cm9sbGVycy9saWdodFBhdHRlcm4uanMiLCIuLi9wdWJsaWMvYXNzZXRzL2pzL3VzZXIvbW9kZWxzL2NhbGVuZGFyTW9kZWwuanMiLCIuLi9wdWJsaWMvYXNzZXRzL2pzL3VzZXIvbW9kZWxzL3N0YXRlLmpzIiwiLi4vcHVibGljL2Fzc2V0cy9qcy91c2VyL3BpcGUuanMiLCIuLi9wdWJsaWMvYXNzZXRzL2pzL3VzZXIvcm9vbURhdGEuanMiLCIuLi9wdWJsaWMvYXNzZXRzL2pzL3VzZXIvdGVtcGxhdGVzL2NhbGVuZGFySXRlbS5odG1sIiwiLi4vcHVibGljL2Fzc2V0cy9qcy91c2VyL3RlbXBsYXRlcy9jYWxlbmRhclNpbmdsZS5odG1sIiwiLi4vcHVibGljL2Fzc2V0cy9qcy91c2VyL3RlbXBsYXRlcy9jYWxlbmRhcldyYXBwZXIuaHRtbCIsIi4uL3B1YmxpYy9hc3NldHMvanMvdXNlci92aWV3cy9hcHBMYXlvdXQuanMiLCIuLi9wdWJsaWMvYXNzZXRzL2pzL3VzZXIvdmlld3MvY2FsZW5kYXJJdGVtLmpzIiwiLi4vcHVibGljL2Fzc2V0cy9qcy91c2VyL3ZpZXdzL2NhbGVuZGFyU2luZ2xlLmpzIiwiLi4vcHVibGljL2Fzc2V0cy9qcy91c2VyL3ZpZXdzL2NhbGVuZGFyV3JhcHBlci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ05BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDYkE7QUFDQTs7QUNEQTtBQUNBOztBQ0RBO0FBQ0E7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwid2luZG93LkNvbW1vbiA9IHtcblx0cGF0aCA6IHtcblx0XHRhc3NldHMgOiBcImFzc2V0cy9cIixcblx0XHRpbWcgOiBcImFzc2V0cy9pbWcvXCIsXG5cdFx0YXVkaW8gOiBcImFzc2V0cy9hdWRpby9cIlxuXHR9LFxuXHRzaXplcyA6e1xuXHRcdGZyYW1lIDogMTBcblx0fVxufTtcblxuLy9iYXNlXG52YXIgQXBwUm91dGVyIFx0XHQ9IHJlcXVpcmUoIFwiY29udHJvbGxlcnMvYXBwUm91dGVyXCIgKTtcbnZhciBBcHBMYXlvdXQgXHRcdD0gcmVxdWlyZSggXCJ2aWV3cy9hcHBMYXlvdXRcIiApO1xuXG4vL2N1c3RvbVxudmFyIENhbGVuZGFyV3JhcHBlclx0PSByZXF1aXJlKFwidmlld3MvY2FsZW5kYXJXcmFwcGVyXCIpO1xudmFyIHJvb21EYXRhID0gcmVxdWlyZShcInJvb21EYXRhXCIpO1xuXG4vL1RIRSBBUFBMSUNBVElPTlxudmFyIE15QXBwID0gTWFyaW9uZXR0ZS5BcHBsaWNhdGlvbi5leHRlbmQoe1xuXHRpbml0aWFsaXplIDogZnVuY3Rpb24oKXtcblx0XHRcblx0fSxcblx0b25TdGFydCA6IGZ1bmN0aW9uKCl7XG5cblx0XHRBcHBMYXlvdXQucmVuZGVyKCk7IFxuXG5cdFx0dmFyIG15Q2FsZW5kYXIgPSBuZXcgQ2FsZW5kYXJXcmFwcGVyKCB7IG1vZGVsIDogbmV3IEJhY2tib25lLk1vZGVsKHsgcm9vbXMgOiByb29tRGF0YSB9KSB9KTtcblx0XHRBcHBMYXlvdXQuZ2V0UmVnaW9uKFwibWFpblwiKS5zaG93KCBteUNhbGVuZGFyICk7XG5cblx0XHRCYWNrYm9uZS5oaXN0b3J5LnN0YXJ0KHtcblx0XHRcdHB1c2hTdGF0ZSA6IGZhbHNlXG5cdFx0fSk7XG5cdH0gXG59KTtcblxuXG5cbiQoZnVuY3Rpb24oKXtcblx0d2luZG93LmFwcCA9IG5ldyBNeUFwcCgpO1xuXHR3aW5kb3cuYXBwLnN0YXJ0KCk7IFxufSk7XG5cblxuXG5cblxuXG5cbiAgICAgICAgICIsInZhciBNeUFwcFJvdXRlciA9IE1hcmlvbmV0dGUuQXBwUm91dGVyLmV4dGVuZCh7XG5cdGNvbnRyb2xsZXIgOiB7XG5cdFx0XCJkZWZhdWx0Um91dGVcIiA6IGZ1bmN0aW9uKCl7fSxcblx0XHRcInJvb21Sb3V0ZVwiIDogZnVuY3Rpb24oKXt9LFxuXHR9LFxuXHRhcHBSb3V0ZXMgOiB7XG5cdFx0XCJyb29tLzprZXlcIiA6IFwicm9vbVJvdXRlXCIsXG5cdFx0XCIqYWN0aW9uc1wiIDogXCJkZWZhdWx0Um91dGVcIixcblx0fVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gbmV3IE15QXBwUm91dGVyKCk7XG4iLCJ2YXIgcGlwZSA9IHJlcXVpcmUoXCJwaXBlXCIpO1xuXG4vL2xpc3RlbmluZyBmb3IgbG9hZFxud2luZG93LmhhbmRsZUNsaWVudExvYWQgPSBmdW5jdGlvbigpe1xuXG4gIGNvbnNvbGUubG9nKFwiZ29vZ2xlIGFwaSBsb2FkZWRcIik7XG4gIGluaXQoKTtcbn1cblxudmFyIGNsaWVudElkID0gJzQzMzgzOTcyMzM2NS11N2dybGR0dmY4cGFiamtqNGZyY2lvM2N2NWhpdDhmbS5hcHBzLmdvb2dsZXVzZXJjb250ZW50LmNvbSc7XG52YXIgYXBpS2V5ID0gJ0FJemFTeUJzS2RUcGxSWHVFd2d2UFNIX2dHRjhPR3N3MzV0MTV2MCc7XG52YXIgc2NvcGVzID0gJ2h0dHBzOi8vd3d3Lmdvb2dsZWFwaXMuY29tL2F1dGgvY2FsZW5kYXInO1xudmFyIHJvb21EYXRhID0gcmVxdWlyZShcInJvb21EYXRhXCIpO1xuXG5cbi8vVE9ETyA6IGludGVncmF0ZSBhbGwgNCBjYWxlbmRhcnNcblxuZnVuY3Rpb24gaW5pdCgpe1xuXHRnYXBpLmNsaWVudC5zZXRBcGlLZXkoYXBpS2V5KTtcblx0Y2hlY2tBdXRoKCk7XG59XG5cbmZ1bmN0aW9uIGNoZWNrQXV0aCgpe1xuXHRnYXBpLmF1dGguYXV0aG9yaXplKCB7XG5cdFx0Y2xpZW50X2lkOiBjbGllbnRJZCwgXG5cdFx0c2NvcGU6IHNjb3BlcywgXG5cdFx0aW1tZWRpYXRlOiBmYWxzZVxuXHR9LCBoYW5kbGVBdXRoUmVzdWx0ICk7XG59XG5cbmZ1bmN0aW9uIGhhbmRsZUF1dGhSZXN1bHQoIGF1dGhSZXN1bHQgKXtcblxuXHRpZihhdXRoUmVzdWx0KXtcblx0XHRtYWtlQXBpQ2FsbCgpO1xuXHR9XG59XG5cbmZ1bmN0aW9uIG1ha2VBcGlDYWxsKCkge1xuICBnYXBpLmNsaWVudC5sb2FkKCdjYWxlbmRhcicsICd2MycsIGZ1bmN0aW9uKCkge1xuICAgICAgXG4gICAgICBwdWxsUm9vbXMoKTsgICAgICAgICAgXG4gIH0pO1xufVxuXG5mdW5jdGlvbiBwdWxsUm9vbXMoKXtcblxuICB2YXIgZnJvbSA9IG5ldyBEYXRlKCk7XG4gIHZhciB0byA9IG5ldyBEYXRlKCk7XG4gICAgICB0by5zZXREYXRlKCB0by5nZXREYXRlKCkgKyAxICk7XG5cbiAgXy5lYWNoKCByb29tRGF0YSwgZnVuY3Rpb24oIGRhdGEsIGtleSApe1xuXG4gICAgdmFyIHJlcXVlc3QgPSBnYXBpLmNsaWVudC5jYWxlbmRhci5ldmVudHMubGlzdCh7XG4gICAgICAgICdjYWxlbmRhcklkJzogZGF0YS5jYWxlbmRhcklkLFxuICAgICAgICB0aW1lTWluIDogZnJvbS50b0lTT1N0cmluZygpLFxuICAgICAgICB0aW1lTWF4IDogdG8udG9JU09TdHJpbmcoKSxcbiAgICAgICAgc2luZ2xlRXZlbnRzIDogdHJ1ZVxuICAgICAgfSk7XG5cbiAgICAgcmVxdWVzdC50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG5cbiAgICAgICAgICBjb25zb2xlLmxvZyhyZXNwb25zZS5yZXN1bHQpO1xuICAgICAgICAgIHJvb21Mb2FkZWQoIGtleSwgcmVzcG9uc2UucmVzdWx0ICk7XG4gICAgICB9LCBmdW5jdGlvbihyZWFzb24pIHtcblxuICAgICAgICAgIGNvbnNvbGUubG9nKCdFcnJvcjogJyArIHJlYXNvbi5yZXN1bHQuZXJyb3IubWVzc2FnZSk7XG4gICAgICB9KTtcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIHJvb21Mb2FkZWQoIGtleSwgZGF0YSApe1xuXG4gIGV2ZW50cy50cmlnZ2VyKCBcImV2ZW50c0xvYWRlZFwiLCB7IGtleSA6IGtleSwgZGF0YSA6IGRhdGEgfSApO1xufVxuXG52YXIgZXZlbnRzID0gXy5leHRlbmQoe30sIEJhY2tib25lLkV2ZW50cyk7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXG4gIGV2ZW50cyA6IGV2ZW50c1xufTtcbiIsInZhciBteVNvY2tldCA9IG51bGw7XG52YXIgY29ubmVjdGVkID0gZmFsc2U7XG5cbmZ1bmN0aW9uIGluaXQoKXtcblxuXHRteVNvY2tldCA9IGlvLmNvbm5lY3QoJy8vbG9jYWxob3N0OjMwMDAnKTtcblx0bXlTb2NrZXQub24oJ2Nvbm5lY3QnLCBmdW5jdGlvbigpe1xuXHRcdGNvbm5lY3RlZCA9IHRydWU7XG5cdH0pO1x0XG59XG5cbmZ1bmN0aW9uIHVwZGF0ZSggZGF0YSApe1xuXG5cdGlmKGNvbm5lY3RlZCl7XG5cdFx0bXlTb2NrZXQuZW1pdCggJ3VwZGF0ZV9kYXRhJywgZGF0YSApO1x0XG5cdH1cbn1cblxuLy8gdmFyIHRocm90dGxlZFVwZGF0ZSA9IF8udGhyb3R0bGUoIHVwZGF0ZSwgNTAwLCB7bGVhZGluZzogZmFsc2V9ICk7XG5cbmluaXQoKTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cdGluaXQgOiBpbml0LFxuXHR1cGRhdGUgOiB1cGRhdGUsXG5cdGNvbm5lY3RlZCA6IGNvbm5lY3RlZFxufSIsInZhciBodWVDb25uZWN0ID0gcmVxdWlyZShcImNvbnRyb2xsZXJzL2h1ZUNvbm5lY3RcIik7XG5cbmZ1bmN0aW9uIExpZ2h0UGF0dGVybiggbGlnaHRJZCwgcGF0dGVybklkICl7XG5cblx0dGhpcy5faHNsID0ge1xuXHRcdGggOiAwLFxuXHRcdHMgOiAwLFxuXHRcdGwgOiAwXG5cdH1cblxuXHR0aGlzLl9saWdodElkID0gbGlnaHRJZDtcblx0dGhpcy5fcGF0dGVybklkID0gcGF0dGVybklkO1xuXHR0aGlzLl9zdGVwID0gMDtcblxuXHR0aGlzLm5ld1NlcXVlbmNlKCB0aGlzLl9wYXR0ZXJuSWQgKTtcbn1cblxuTGlnaHRQYXR0ZXJuLnByb3RvdHlwZSA9IHtcblx0bmV3U2VxdWVuY2UgOiBmdW5jdGlvbiggaWQgKXtcblxuXHRcdHZhciBwYXR0ZXJuID0gcGF0dGVybnNbIGlkIF07XG5cdFx0dmFyIHNlcXVlbmNlID0gcGF0dGVybi5zZXF1ZW5jZTtcblxuXHRcdHRoaXMuX3R3ZWVuZXIgPSBuZXcgVGltZWxpbmVNYXgoe1xuXHRcdFx0cmVwZWF0IDogcGF0dGVybi5yZXBlYXQsXG5cdFx0XHRvbkNvbXBsZXRlIDogZnVuY3Rpb24oKXtcblx0XHRcdFx0Y29uc29sZS5sb2coXCJjb21wbGV0ZSFcIik7XG5cdFx0XHR9XG5cdFx0fSk7XG5cblx0XHRfLmVhY2goIHNlcXVlbmNlLCBmdW5jdGlvbiggc3RlcCApe1xuXG5cdFx0XHR0aGlzLnF1ZXVlQ29sb3IoIHN0ZXAgKTtcblx0XHR9LCB0aGlzICk7XG5cdH0sXG5cdHF1ZXVlQ29sb3IgOiBmdW5jdGlvbiggc3RlcCApe1xuXG5cdFx0dmFyIGNvbG9yID0gb25lLmNvbG9yKCBzdGVwLmNvbG9yICk7XG5cdFx0dmFyIGZhZGUgPSBzdGVwLmZhZGU7XG5cdFx0dmFyIHdhaXQgPSBzdGVwLndhaXQ7XG5cblx0XHR2YXIgaHNsID0ge1xuXHRcdFx0aCA6IE1hdGguZmxvb3IoIGNvbG9yLmgoKSAqIDM2MCksIFxuXHRcdFx0cyA6IE1hdGguZmxvb3IoIGNvbG9yLnMoKSAqIDEwMCksXG5cdFx0XHRsIDogTWF0aC5mbG9vciggY29sb3IubCgpICogMTAwKSBcblx0XHR9O1xuXG5cdFx0dmFyIG9wdGlvbnMgPSB7XG5cdFx0XHRvblN0YXJ0IDogZnVuY3Rpb24oKXtcblx0XHRcdFx0Ly91cGRhdGluZyBMRURzXG5cdFx0XHRcdGh1ZUNvbm5lY3QudXBkYXRlKFt7XG5cdFx0XHRcdFx0aWQgOiB0aGlzLl9saWdodElkLFxuXHRcdFx0XHRcdGRhdGEgOiB7XG5cdFx0XHRcdFx0XHRoc2wgOiBoc2wsXG5cdFx0XHRcdFx0XHRkdXJhdGlvbiA6IGZhZGVcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1dKTtcdFx0XHRcdFxuXHRcdFx0fSxcblx0XHRcdG9uU3RhcnRTY29wZSA6IHRoaXNcblx0XHR9XG5cblx0XHQvL3VwZGF0aW5nIGZyb250ZW5kXG5cdFx0dGhpcy5fdHdlZW5lci50byggdGhpcy5faHNsLCBmYWRlLCBfLmV4dGVuZCggb3B0aW9ucywgaHNsICkgKTtcblx0XHR0aGlzLl90d2VlbmVyLnRvKCB0aGlzLl9oc2wsIHdhaXQsIHt9ICk7XG5cdH1cbn1cblxudmFyIHBhdHRlcm5zID0ge1xuXHQndGVzdCcgOiB7XG5cdFx0cmVwZWF0IDogIC0xLFxuXHRcdHNlcXVlbmNlIDogW1xuXHRcdFx0eyBjb2xvciA6IFwiI0ZCMTkxMVwiLCBmYWRlIDogMSwgd2FpdCA6IDEgfSxcblx0XHRcdC8vIHsgY29sb3IgOiBcIiMwMGZmMDBcIiwgZmFkZSA6IDEsIHdhaXQgOiAxIH0sXG5cdFx0XHQvLyB7IGNvbG9yIDogXCIjNDE1NkZGXCIsIGZhZGUgOiAxLCB3YWl0IDogMSB9LFxuXHRcdFx0Ly8geyBjb2xvciA6IFwiI0ZGMDAxRFwiLCBmYWRlIDogMSwgd2FpdCA6IDEgfSxcblx0XHRcdC8vIHsgY29sb3IgOiBcIiNGRkZGMDdcIiwgZmFkZSA6IDEsIHdhaXQgOiAxIH0sXG5cdFx0XVxuXHR9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gTGlnaHRQYXR0ZXJuOyIsInZhciBDYWxlbmRhck1vZGVsID0gQmFja2JvbmUuTW9kZWwuZXh0ZW5kKHtcblx0ZGVmYXVsdHMgOiB7XG5cdFx0c3VtbWFyeSA6IFwibi9hXCIsXG5cdFx0ZGVzY3JpcHRpb24gOiBcIm4vYVwiLFxuXHRcdHN0YXJ0IDogXCJuL2FcIixcblx0XHRlbmQgOiBcIm4vYVwiLFxuXHR9LFxuXHRpbml0aWFsaXplIDogZnVuY3Rpb24oKXtcblxuXHRcdHRoaXMuY29udmVydERhdGUoXCJzdGFydFwiKTtcblx0XHR0aGlzLmNvbnZlcnREYXRlKFwiZW5kXCIpO1xuXHR9LFxuXHRjb252ZXJ0RGF0ZSA6IGZ1bmN0aW9uKCBrZXkgKXtcblxuXHRcdC8vY29udmVydCBkYXRhc1xuXHRcdHZhciBkYXRlU3RyaW5nID0gdGhpcy5nZXQoIGtleSApXG5cdFx0aWYoIWRhdGVTdHJpbmcpIHJldHVybjtcblx0XHRcblx0XHRkYXRlU3RyaW5nID0gZGF0ZVN0cmluZy5kYXRlVGltZTtcblx0XHR2YXIgZGF0ZSA9IG5ldyBEYXRlKCBkYXRlU3RyaW5nICk7XG5cblx0XHR0aGlzLnNldCgga2V5LCB7XG5cdFx0XHRyYXcgOiBkYXRlLFxuXHRcdFx0Zm9ybWF0dGVkIDogZGF0ZS50b0RhdGVTdHJpbmcoKVxuXHRcdH0pO1xuXHR9LFxuXHRwYXJzZSA6IGZ1bmN0aW9uKCBkYXRhICl7XG5cdFx0Y29uc29sZS5sb2coXCJBU0RBREFTREFTREFTREFTRFNBYXNkc2FcIilcblx0XHRjb25zb2xlLmxvZyhkYXRhKTtcblx0XHRyZXR1cm4gZGF0YTtcblx0fVxufSlcblxubW9kdWxlLmV4cG9ydHMgPSBDYWxlbmRhck1vZGVsOyIsInZhciBzdGF0ZSA9IG5ldyAoQmFja2JvbmUuTW9kZWwuZXh0ZW5kKHtcblx0ZGVmYXVsdHMgOiB7XG5cdFx0Ly8gXCJuYXZfb3BlblwiIFx0XHQ6IGZhbHNlLFxuXHRcdC8vICdzY3JvbGxfYXRfdG9wJyA6IHRydWUsXG5cdFx0Ly8gJ21pbmltYWxfbmF2JyBcdDogZmFsc2UsXG5cdFx0Ly8gJ2Z1bGxfbmF2X29wZW4nXHQ6IGZhbHNlLFxuXHRcdC8vICd1aV9kaXNwbGF5J1x0OiBmYWxzZVxuXHR9XG59KSkoKTtcblxubW9kdWxlLmV4cG9ydHMgPSBzdGF0ZTtcbiIsInZhciBwaXBlID0gXy5leHRlbmQoe1xuXG5cdFxuXHRcbn0sIEJhY2tib25lLkV2ZW50cyk7XG5cbm1vZHVsZS5leHBvcnRzID0gcGlwZTsiLCJtb2R1bGUuZXhwb3J0cyA9IHtcblx0JzEnOiB7XG5cdFx0J2NhbGVuZGFySWQnIDogXCJiLXJlZWwuY29tXzJkMzIzODM3MzkzNjM2MzIzMjM3MzgzMUByZXNvdXJjZS5jYWxlbmRhci5nb29nbGUuY29tXCJcblx0fSxcblx0JzInOiB7XG5cdFx0J2NhbGVuZGFySWQnIDogXCJiLXJlZWwuY29tXzJkMzEzMjM3MzczODM4MzMzNDJkMzIzNDMyQHJlc291cmNlLmNhbGVuZGFyLmdvb2dsZS5jb21cIlxuXHR9LFxuXHQnMyc6IHtcblx0XHQnY2FsZW5kYXJJZCcgOiBcImItcmVlbC5jb21fMzEzNjM1MzMzOTM2MzEzOTM5MzMzOEByZXNvdXJjZS5jYWxlbmRhci5nb29nbGUuY29tXCJcblx0fSxcblx0JzUnOiB7XG5cdFx0J2NhbGVuZGFySWQnIDogXCJiLXJlZWwuY29tXzJkMzQzNDMyMzgzOTM2MzczMDJkMzYzNDMzQHJlc291cmNlLmNhbGVuZGFyLmdvb2dsZS5jb21cIlxuXHR9XG59OyIsIm1vZHVsZS5leHBvcnRzID0gXCJcXG48aDI+c3VtbWFyeSA6IDwlPSBzdW1tYXJ5ICU+PC9oMj5cXG5cXG48aDM+ZGVzY3JpcHRpb24gOiA8JT0gZGVzY3JpcHRpb24gJT48L2gzPlxcblxcbjxoMz5zdGFydCA6IDwlPSBzdGFydC5mb3JtYXR0ZWQgJT48L2gzPlxcblxcbjxoMz5lbmQgOiA8JT0gZW5kLmZvcm1hdHRlZCAlPjwvaDM+XCI7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IFwiPGJ1dHRvbiBpZD1cXFwiY2xvc2VcXFwiPjwvYnV0dG9uPlxcbjxkaXYgaWQ9XFxcImV2ZW50LWxpc3RcXFwiPjwvZGl2PiBcIjtcbiIsIm1vZHVsZS5leHBvcnRzID0gXCJcXG48ZGl2IGlkPVxcXCJyb29tLXNwbGl0XFxcIj5cXG5cXHQ8JSBfLmVhY2goIHJvb21zLCBmdW5jdGlvbiggZGF0YSwga2V5ICl7ICU+XFxuXFx0XFx0PGRpdiBpZD1cXFwicm9vbS08JT0ga2V5ICU+XFxcIiBjbGFzcz1cXFwicm9vbVxcXCIgZGF0YS1pZD1cXFwiPCU9IGtleSAlPlxcXCI+cm9vbSA8JT0ga2V5ICU+PC9kaXY+XFxuXFx0PCUgfSk7ICU+XFxuPC9kaXY+XFxuPGRpdiBpZD1cXFwicm9vbS1zaW5nbGVcXFwiPjwvZGl2PlxcblxcbjwhLS0gVEVTVCAtLT5cXG48ZGl2IGNsYXNzPVxcXCJ0ZXN0XFxcIj5cXG5cXHQ8ZGl2PlxcblxcdFxcdDxpbnB1dCBpZD1cXFwiaGV4LWlucHV0XFxcIiB0eXBlPVxcXCJ0ZXh0XFxcIj48L2lucHV0PlxcblxcdFxcdDxidXR0b24gaWQ9XFxcImhleFxcXCI+aGV4PC9idXR0b24+XFxuXFx0PC9kaXY+XFxuXFx0PGJ1dHRvbiBpZD1cXFwidGVzdFxcXCI+dGVzdDwvYnV0dG9uPlxcblxcdDxpbnB1dCBjbGFzcz1cXFwiY29sb3JcXFwiIHR5cGU9XFxcImNvbG9yXFxcIiBuYW1lPVxcXCJmYXZjb2xvclxcXCI+XFxuPC9kaXY+XFxuXFxuIFwiO1xuIiwidmFyIFN0YXRlIFx0XHQ9IHJlcXVpcmUoXCJtb2RlbHMvc3RhdGVcIik7XG5cbnZhciBNeUFwcExheW91dCA9IE1hcmlvbmV0dGUuTGF5b3V0Vmlldy5leHRlbmQoe1xuXHRlbCA6IFwiI2NvbnRlbnRcIixcblx0dGVtcGxhdGUgOiBmYWxzZSxcblx0cmVnaW9ucyA6IHtcblx0XHRtYWluIDogXCIjbWFpblwiXG5cdH0sIFxuXHRpbml0aWFsaXplIDogZnVuY3Rpb24oKXtcblx0XHR2YXIgX3RoaXMgPSB0aGlzO1xuXG5cdFx0Ly93cmFwcGluZyBodG1sXG5cdFx0dGhpcy4kaHRtbCA9ICQoXCJodG1sXCIpO1xuXHRcdHRoaXMuJGh0bWwucmVtb3ZlQ2xhc3MoXCJoaWRkZW5cIik7XG5cblx0XHQvL3Jlc2l6ZSBldmVudHNcblx0XHQkKHdpbmRvdykucmVzaXplKGZ1bmN0aW9uKCl7XG5cdFx0XHRfdGhpcy5vblJlc2l6ZVdpbmRvdygpO1xuXHRcdH0pLnJlc2l6ZSgpO1xuXG5cdFx0dGhpcy5saXN0ZW5Gb3JTdGF0ZSgpO1xuXHR9LFxuXHRsaXN0ZW5Gb3JTdGF0ZSA6IGZ1bmN0aW9uKCl7XG5cdFx0Ly9zdGF0ZSBjaGFuZ2Vcblx0XHR0aGlzLmxpc3RlblRvKCBTdGF0ZSwgXCJjaGFuZ2VcIiwgZnVuY3Rpb24oIGUgKXtcblxuXHRcdFx0dGhpcy5vblN0YXRlQ2hhbmdlKCBlLmNoYW5nZWQsIGUuX3ByZXZpb3VzQXR0cmlidXRlcyApO1xuXHRcdH0sIHRoaXMpO1xuXHRcdHRoaXMub25TdGF0ZUNoYW5nZSggU3RhdGUudG9KU09OKCkgKTtcblx0fSxcblx0b25TdGF0ZUNoYW5nZSA6IGZ1bmN0aW9uKCBjaGFuZ2VkLCBwcmV2aW91cyApe1xuXG5cdFx0Xy5lYWNoKCBjaGFuZ2VkLCBmdW5jdGlvbih2YWx1ZSwga2V5KXtcblx0XHRcdFxuXHRcdFx0aWYoIF8uaXNCb29sZWFuKCB2YWx1ZSApICl7XG5cdFx0XHRcdHRoaXMuJGh0bWwudG9nZ2xlQ2xhc3MoXCJzdGF0ZS1cIitrZXksIHZhbHVlKTtcblx0XHRcdFx0dGhpcy4kaHRtbC50b2dnbGVDbGFzcyhcInN0YXRlLW5vdC1cIitrZXksICF2YWx1ZSk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR2YXIgcHJldlZhbHVlID0gcHJldmlvdXNbIGtleSBdO1xuXHRcdFx0XHRpZihwcmV2VmFsdWUpe1xuXHRcdFx0XHRcdHRoaXMuJGh0bWwudG9nZ2xlQ2xhc3MoXCJzdGF0ZS1cIitrZXkrXCItXCIrcHJldlZhbHVlLCBmYWxzZSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0dGhpcy4kaHRtbC50b2dnbGVDbGFzcyhcInN0YXRlLVwiK2tleStcIi1cIit2YWx1ZSwgdHJ1ZSk7XG5cdFx0XHR9XG5cblx0XHR9LCB0aGlzICk7XG5cdH0sXG5cdG9uUmVzaXplV2luZG93IDogZnVuY3Rpb24oKXtcblx0XHRDb21tb24ud3cgPSAkKHdpbmRvdykud2lkdGgoKTtcblx0XHRDb21tb24ud2ggPSAkKHdpbmRvdykuaGVpZ2h0KCk7XG5cdH1cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IG5ldyBNeUFwcExheW91dCgpOyIsInZhciBDYWxlbmRhckl0ZW0gPSBNYXJpb25ldHRlLkl0ZW1WaWV3LmV4dGVuZCh7XG5cdGNsYXNzTmFtZSA6IFwiaXRlbVwiLFxuXHR0ZW1wbGF0ZSA6IF8udGVtcGxhdGUoIHJlcXVpcmUoXCJ0ZW1wbGF0ZXMvY2FsZW5kYXJJdGVtLmh0bWxcIikgKSxcblx0dWkgOiB7XG5cdFx0J3RpdGxlJyA6IFwiaDJcIlxuXHR9LFxuXHRldmVudHMgOiB7XG5cdFx0J2NsaWNrIEB1aS50aXRsZScgOiBmdW5jdGlvbigpe1xuXG5cblx0XHR9XG5cdH1cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IENhbGVuZGFySXRlbTsiLCJ2YXIgQ2FsZW5kYXJJdGVtIFx0PSByZXF1aXJlKFwidmlld3MvY2FsZW5kYXJJdGVtXCIpO1xudmFyIENhbGVuZGFyTW9kZWwgXHQ9IHJlcXVpcmUoXCJtb2RlbHMvY2FsZW5kYXJNb2RlbFwiKTtcbnZhciBBcHBSb3V0ZXIgXHRcdD0gcmVxdWlyZSggXCJjb250cm9sbGVycy9hcHBSb3V0ZXJcIiApO1xuXG52YXIgQ2FsZW5kYXJTaW5nbGUgPSBNYXJpb25ldHRlLkxheW91dFZpZXcuZXh0ZW5kKHtcblx0dGVtcGxhdGUgOiBfLnRlbXBsYXRlKCByZXF1aXJlKFwidGVtcGxhdGVzL2NhbGVuZGFyU2luZ2xlLmh0bWxcIikgKSxcblx0cmVnaW9ucyA6IHtcblx0XHRldmVudExpc3QgOiBcIiNldmVudC1saXN0XCJcblx0fSxcblx0dWkgOiB7XG5cdFx0Y2xvc2VCdXR0b24gOiBcIiNjbG9zZVwiXG5cdH0sXG5cdGV2ZW50cyA6IHtcblx0XHQnY2xpY2sgQHVpLmNsb3NlQnV0dG9uJyA6IFwib25DbG9zZVwiXG5cdH0sXG5cdGluaXRpYWxpemUgOiBmdW5jdGlvbigpe1xuXG5cdFx0dGhpcy5jb2xsZWN0aW9uVmlldyA9IG5ldyBNYXJpb25ldHRlLkNvbGxlY3Rpb25WaWV3KHtcblx0XHRcdGNoaWxkVmlldyA6IENhbGVuZGFySXRlbSxcblx0XHRcdGNvbGxlY3Rpb24gOiBuZXcgQmFja2JvbmUuQ29sbGVjdGlvbigpXG5cdFx0fSk7XG5cblx0XHR0aGlzLmxpc3RlblRvKCB0aGlzLm1vZGVsLCBcImNoYW5nZTpyb29tRGF0YVwiLCB0aGlzLnVwZGF0ZUV2ZW50cyApO1xuXHR9LFxuXHRvblNob3cgOiBmdW5jdGlvbigpe1xuXG5cdFx0dGhpcy5nZXRSZWdpb24oIFwiZXZlbnRMaXN0XCIgKS5zaG93KCB0aGlzLmNvbGxlY3Rpb25WaWV3ICk7XG5cdFx0dGhpcy51cGRhdGVFdmVudHMoKTtcblx0fSxcblx0b25DbG9zZSA6IGZ1bmN0aW9uKCl7XG5cblx0XHRBcHBSb3V0ZXIubmF2aWdhdGUoXCIvXCIsIHt0cmlnZ2VyOiB0cnVlfSk7XG5cdH0sXG5cdHVwZGF0ZUV2ZW50cyA6IGZ1bmN0aW9uKCl7XG5cblx0XHR2YXIgcm9vbURhdGEgPSB0aGlzLm1vZGVsLmdldChcInJvb21EYXRhXCIpXG5cdFx0Xy5lYWNoKCByb29tRGF0YS5pdGVtcywgZnVuY3Rpb24oIGl0ZW0gKXtcblxuXHRcdFx0dmFyIG0gPSBuZXcgQ2FsZW5kYXJNb2RlbCggaXRlbSApO1xuXHRcdFx0dGhpcy5jb2xsZWN0aW9uVmlldy5jb2xsZWN0aW9uLmFkZCggbSApO1xuXHRcdH0sIHRoaXMpO1xuXHR9XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBDYWxlbmRhclNpbmdsZTsiLCJ2YXIgQXBwUm91dGVyIFx0XHQ9IHJlcXVpcmUoIFwiY29udHJvbGxlcnMvYXBwUm91dGVyXCIgKTtcblxudmFyIGNhbGVuZGFyTG9hZCA9IHJlcXVpcmUoXCJjb250cm9sbGVycy9jYWxlbmRhckxvYWRcIik7XG52YXIgQ2FsZW5kYXJTaW5nbGUgXHQ9IHJlcXVpcmUoXCJ2aWV3cy9jYWxlbmRhclNpbmdsZVwiKTtcblxudmFyIGh1ZUNvbm5lY3QgPSByZXF1aXJlKFwiY29udHJvbGxlcnMvaHVlQ29ubmVjdFwiKTtcbnZhciBMaWdodFBhdHRlcm4gPSByZXF1aXJlKFwiY29udHJvbGxlcnMvbGlnaHRQYXR0ZXJuXCIpO1xudmFyIHJvb21EYXRhID0gcmVxdWlyZShcInJvb21EYXRhXCIpO1xuXG52YXIgQ2FsZW5kYXJWaWV3ID0gTWFyaW9uZXR0ZS5MYXlvdXRWaWV3LmV4dGVuZCh7XG5cdHRlbXBsYXRlIDogXy50ZW1wbGF0ZSggcmVxdWlyZShcInRlbXBsYXRlcy9jYWxlbmRhcldyYXBwZXIuaHRtbFwiKSApLFxuXHRyZWdpb25zIDoge1xuXHRcdHJvb21TaW5nbGUgOiBcIiNyb29tLXNpbmdsZVwiLFxuXHR9LFxuXHR1aSA6IHtcblx0XHRjb2xvclBpY2tlciA6IFwiLmNvbG9yXCIsXG5cdFx0dGVzdCA6IFwiI3Rlc3RcIixcblx0XHRoZXhCdXR0b24gOiBcIiNoZXhcIixcblx0XHRoZXhJbnB1dCA6IFwiI2hleC1pbnB1dFwiLFxuXHRcdHJvb21TcGxpdCA6IFwiI3Jvb20tc3BsaXRcIixcblx0XHRyb29tIDogXCIucm9vbVwiXG5cdH0sXG5cdGV2ZW50cyA6IHtcblx0XHRcImNsaWNrIEB1aS50ZXN0XCIgOiBmdW5jdGlvbigpe1xuXHRcdFx0Zm9yKCB2YXIgaSA9IDAgOyBpIDwgNSA7IGkrKyApe1xuXHRcdFx0XHRuZXcgTGlnaHRQYXR0ZXJuKGkrMSwgXCJ0ZXN0XCIpO1xuXHRcdFx0fVxuXHRcdH0sXG5cdFx0XCJjbGljayBAdWkuaGV4QnV0dG9uXCIgOiBmdW5jdGlvbigpe1xuXHRcdFx0dmFyIGNvbG9yID0gdGhpcy51aS5oZXhJbnB1dC52YWwoKTtcblx0XHRcdHRoaXMudGVzdENvbG9yKCBjb2xvciApO1xuXHRcdH0sXG5cdFx0XCJjbGljayBAdWkucm9vbVwiIDogZnVuY3Rpb24oIGUgKXtcblx0XHRcdHZhciBrZXkgPSAkKCBlLmN1cnJlbnRUYXJnZXQgKS5kYXRhKFwiaWRcIik7XG5cdFx0XHRBcHBSb3V0ZXIubmF2aWdhdGUoXCJyb29tL1wiK2tleSwge3RyaWdnZXI6IHRydWV9KTtcblx0XHR9XG5cdH0sXG5cdGluaXRpYWxpemUgOiBmdW5jdGlvbigpe1xuXHRcdFxuXHRcdHRoaXMuY2FsZW5kYXJTdG9yZSA9IHt9O1xuXHRcdHRoaXMubGlzdGVuVG8oIGNhbGVuZGFyTG9hZC5ldmVudHMsIFwiZXZlbnRzTG9hZGVkXCIsIHRoaXMuZXZlbnRzTG9hZGVkICk7XG5cdFx0XG5cdH0sXG5cdG9uU2hvdyA6IGZ1bmN0aW9uKCl7XG5cblx0XHR2YXIgY29sb3JQaWNrZXIgPSB0aGlzLnVpLmNvbG9yUGlja2VyO1xuXHRcdHZhciBfdGhpcyA9IHRoaXM7XG5cdFx0JChjb2xvclBpY2tlcikuY2hhbmdlKGZ1bmN0aW9uKCl7XG5cdFx0XHR2YXIgdmFsID0gJCh0aGlzKS52YWwoKTtcblx0XHRcdF90aGlzLnRlc3RDb2xvciggdmFsICk7XG5cdFx0fSk7XG5cblx0XHR0aGlzLmxpc3RlblRvKCBBcHBSb3V0ZXIsIFwicm91dGU6cm9vbVJvdXRlXCIsIGZ1bmN0aW9uKCBrZXkgKXtcblx0XHRcdFxuXHRcdFx0dGhpcy5zaG93Um9vbSgga2V5ICk7XG5cdFx0fSk7XG5cdFx0dGhpcy5saXN0ZW5UbyggQXBwUm91dGVyLCBcInJvdXRlOmRlZmF1bHRSb3V0ZVwiLCB0aGlzLnNob3dTcGxpdCApO1xuXHR9LFxuXHRzaG93U3BsaXQgOiBmdW5jdGlvbigpe1xuXG5cdFx0dmFyICRzcGxpdEVsID0gdGhpcy51aS5yb29tU3BsaXQ7XG5cdFx0dmFyICRzaW5nbGVFbCA9IHRoaXMuZ2V0UmVnaW9uKCBcInJvb21TaW5nbGVcIiApLiRlbDtcblxuXHRcdCRzcGxpdEVsLnNob3coKTtcblx0XHQkc2luZ2xlRWwuaGlkZSgpO1xuXHR9LFxuXHRzaG93Um9vbSA6IGZ1bmN0aW9uKCBrZXkgKXtcblxuXHRcdHZhciAkc3BsaXRFbCA9IHRoaXMudWkucm9vbVNwbGl0O1xuXHRcdFxuXHRcdHZhciBtb2RlbCA9IHRoaXMuY2FsZW5kYXJTdG9yZVsga2V5IF07XG5cblx0XHRpZiggIW1vZGVsICl7XG5cdFx0XHR0aGlzLnF1ZXVlZEtleSA9IGtleTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dmFyIHZpZXcgPSAgbmV3IENhbGVuZGFyU2luZ2xlKCB7IG1vZGVsIDogbW9kZWwgfSk7XG5cdFx0XHR2YXIgcmVnaW9uID0gdGhpcy5nZXRSZWdpb24oIFwicm9vbVNpbmdsZVwiICkuc2hvdyggdmlldyApO1xuXHRcdFx0JHNpbmdsZUVsID0gcmVnaW9uLiRlbDtcblxuXHRcdFx0JHNpbmdsZUVsLnNob3coKTtcblx0XHRcdCRzcGxpdEVsLmhpZGUoKTtcblx0XHR9XG5cdH0sXG5cdGNoZWNrUXVldWUgOiBmdW5jdGlvbigpe1xuXG5cdFx0aWYoIHRoaXMucXVldWVkS2V5ICl7XG5cdFx0XHR0aGlzLnNob3dSb29tKCB0aGlzLnF1ZXVlZEtleSApO1xuXHRcdH1cblx0fSxcblx0dGVzdENvbG9yIDogZnVuY3Rpb24oIF9jb2xvciApe1xuXG5cdFx0dmFyIGNvbG9yID0gb25lLmNvbG9yKCBfY29sb3IgKTtcblx0XHR2YXIgaHNsID0ge1xuXHRcdFx0aCA6IE1hdGguZmxvb3IoIGNvbG9yLmgoKSAqIDM2MCksIFxuXHRcdFx0cyA6IE1hdGguZmxvb3IoIGNvbG9yLnMoKSAqIDEwMCksXG5cdFx0XHRsIDogTWF0aC5mbG9vciggY29sb3IubCgpICogMTAwKSBcblx0XHR9O1xuXHRcdGh1ZUNvbm5lY3QudXBkYXRlKFtcblx0XHRcdHtcblx0XHRcdFx0J2lkJyA6IDEsXG5cdFx0XHRcdCdkYXRhJyA6IHtcblx0XHRcdFx0XHQnaHNsJyA6IGhzbCxcblx0XHRcdFx0XHQnZHVyYXRpb24nIDogMVxuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHQnaWQnIDogMixcblx0XHRcdFx0J2RhdGEnIDoge1xuXHRcdFx0XHRcdCdoc2wnIDogaHNsLFxuXHRcdFx0XHRcdCdkdXJhdGlvbicgOiAxXG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHR7XG5cdFx0XHRcdCdpZCcgOiAzLFxuXHRcdFx0XHQnZGF0YScgOiB7XG5cdFx0XHRcdFx0J2hzbCcgOiBoc2wsXG5cdFx0XHRcdFx0J2R1cmF0aW9uJyA6IDFcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0J2lkJyA6IDQsXG5cdFx0XHRcdCdkYXRhJyA6IHtcblx0XHRcdFx0XHQnaHNsJyA6IGhzbCxcblx0XHRcdFx0XHQnZHVyYXRpb24nIDogMVxuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHQnaWQnIDogNSxcblx0XHRcdFx0J2RhdGEnIDoge1xuXHRcdFx0XHRcdCdoc2wnIDogaHNsLFxuXHRcdFx0XHRcdCdkdXJhdGlvbicgOiAxXG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRdKTtcdFx0XG5cdH0sXG5cdGV2ZW50c0xvYWRlZCA6IGZ1bmN0aW9uKCBkYXRhICl7XG5cdFx0XG5cdFx0dmFyIGtleSA9IGRhdGEua2V5O1xuXHRcdFxuXHRcdHZhciBteUNhbGVuZGFyTW9kZWwgPSB0aGlzLmNhbGVuZGFyU3RvcmVbIGtleSBdIHx8IG5ldyBCYWNrYm9uZS5Nb2RlbCgpIDtcblxuXHRcdG15Q2FsZW5kYXJNb2RlbC5zZXQoXCJyb29tRGF0YVwiLCBkYXRhLmRhdGEpO1xuXG5cdFx0dGhpcy5jYWxlbmRhclN0b3JlWyBrZXkgXSA9IG15Q2FsZW5kYXJNb2RlbDtcblxuXHRcdHRoaXMuY2hlY2tRdWV1ZSgpO1xuXHR9IFxufSk7XG5cblxubW9kdWxlLmV4cG9ydHMgPSBDYWxlbmRhclZpZXc7ICAgICAgICAgICAgICAgICAgICBcbiAgICBcbiAiXX0=
