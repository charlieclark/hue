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
var pipe = require("pipe");

var MyAppRouter = Marionette.AppRouter.extend({
	controller : {
		'roomRoute' : function(){},
		'defaultRoute' : function(value, queryString){
			var params = parseQueryString(queryString);
			_.each( params, function( value, key ){
				pipe.trigger("param:"+key, value )
			});
		}
	},
	appRoutes : {
		"room/:key" : "roomRoute",
		"*actions" : "defaultRoute"
	}
});

function parseQueryString(queryString){
    var params = {};
    if(queryString){
        _.each(
            _.map(decodeURI(queryString).split(/&/g),function(el,i){
                var aux = el.split('='), o = {};
                if(aux.length >= 1){
                    var val = undefined;
                    if(aux.length == 2)
                        val = aux[1];
                    o[aux[0]] = val;
                }
                return o;
            }),
            function(o){
                _.extend(params,o);
            }
        );
    }
    return params;
}

module.exports = new MyAppRouter();

},{"pipe":10}],4:[function(require,module,exports){
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
var pullInterval = 1000 * 10;

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
      setInterval( pullRooms, pullInterval );          
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

var pipe = require("pipe");

function init(){

	pipe.on("param:socket", connect)
}

function connect(){
	
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

init();

module.exports = {
	init : init,
	update : update,
	connected : connected
}
},{"pipe":10}],6:[function(require,module,exports){
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
		 var start = this.get("start").raw;
		 var end = this.get("end").raw;
		 var now = new Date();

		 if( now > start && now < end ){
		 	return true;
		 }

		 return false;
	}
})

module.exports = CalendarItemModel;
},{}],8:[function(require,module,exports){
var CalendarItemModel 	= require("models/calendarItemModel");

var CalendarModel = Backbone.Model.extend({
	defaults : {
		organizer : "Wes"
	},
	initialize : function(){

		_.bindAll( this, "getCurrent" );

		this.listenTo( this, "change:updated", this.updateEvents );
		this.listenTo( this, "change:updated", this.getCurrent );

		setInterval( this.getCurrent, 1000 );
	},
	getCurrent : function(){

		var eventCollection = this.get("eventCollection");

		//getting current event
		var current = eventCollection.getCurrent();
		
		if( current ){
			current = current.toJSON();
		}

		this.set("currentEvent", current );	
	},
	updateEvents : function(){

		var eventCollection = this.get("eventCollection");

		var roomData = this.get("roomData");
		var newModels = [];

		if( !roomData ) return;

		_.each( roomData.items, function( item ){

			var m = new CalendarItemModel( item );
			m.set("key", this.get("key"));
			newModels.push( m );
		}, this);

		eventCollection.reset( newModels );
	}
});

module.exports = CalendarModel;
},{"models/calendarItemModel":7}],9:[function(require,module,exports){
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
module.exports = "<% _.each( roomsData, function( data, key ){ %>\n\t<div class=\"room-container\">\n\t\t<section id=\"room-<%= key %>\" class=\"room\" data-id=\"<%= key %>\">\n\t\t\t<div class=\"number\"><%= key %></div>\n\t\t\t<div class=\"graph\"></div>\n\t\t\t<div class=\"person\"><%= data.currentEvent ? data.currentEvent.summary : 'nothing' %></div>\n\t\t</section>\n\t</div>\n<% }); %>";

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

		
	},
	onShow : function(){

		this.getRegion( "eventList" ).show( this.collectionView );
		
	},
	onClose : function(){

		AppRouter.navigate("/", {trigger: true});
	}
});

module.exports = CalendarSingle;
},{"controllers/appRouter":3,"templates/calendarSingle.html":13,"views/calendarItem":17}],19:[function(require,module,exports){
var AppRouter 		= require( "controllers/appRouter" );

var calendarLoad = require("controllers/calendarLoad");
var CalendarSingle 	= require("views/calendarSingle");
var CalendarModel 	= require("models/calendarModel");
var CalendarItemModel 	= require("models/calendarItemModel");
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

		this._splashView = new SplashView({ model : new Backbone.Model({ rooms : {}, roomsData : {} }) }) ;

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
		var myCalendarModel = this.calendarStore[ key ];
		
		if(  !myCalendarModel ){

			myCalendarModel = new CalendarModel({
				key : key,
				eventCollection : new CalendarCollection()
			});
			this._splashView.addRoom( myCalendarModel );
			this.calendarStore[ key ] = myCalendarModel;
		} 

		var roomData = data.data;
		var updated = roomData.updated;

		console.log(updated);

		myCalendarModel.set("roomData", roomData);
		myCalendarModel.set("updated", updated);

		this.checkQueue();
	} 
});


module.exports = CalendarView;                    
    
 
},{"collections/calendarCollection":2,"controllers/appRouter":3,"controllers/calendarLoad":4,"controllers/hueConnect":5,"controllers/lightPattern":6,"models/calendarItemModel":7,"models/calendarModel":8,"roomData":11,"templates/calendarWrapper.html":14,"views/calendarSingle":18,"views/splashView":20}],20:[function(require,module,exports){
var SplashView = Marionette.LayoutView.extend({
	id : "room-split",
	template : _.template( require("templates/splashWrapper.html") ),
	initialize : function(){
		
	},
	addRoom : function( model ){
		var rooms = this.model.get("rooms");
		rooms[ model.get("key") ] = model;

		this.listenTo( model, "change:currentEvent", this.render );
		this.render();
	},
	onBeforeRender : function(){

		console.log("RERENDER SPLASH");
		var rooms =  this.model.get("rooms");
		var roomsData =  this.model.get("roomsData");
		
		_.each( rooms, function( room, key ) {
			roomsData[ key ] = room.toJSON();
		});
	}
});

module.exports = SplashView;
},{"templates/splashWrapper.html":15}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIuLi9wdWJsaWMvYXNzZXRzL2pzL3VzZXIvYXBwLmpzIiwiLi4vcHVibGljL2Fzc2V0cy9qcy91c2VyL2NvbGxlY3Rpb25zL2NhbGVuZGFyQ29sbGVjdGlvbi5qcyIsIi4uL3B1YmxpYy9hc3NldHMvanMvdXNlci9jb250cm9sbGVycy9hcHBSb3V0ZXIuanMiLCIuLi9wdWJsaWMvYXNzZXRzL2pzL3VzZXIvY29udHJvbGxlcnMvY2FsZW5kYXJMb2FkLmpzIiwiLi4vcHVibGljL2Fzc2V0cy9qcy91c2VyL2NvbnRyb2xsZXJzL2h1ZUNvbm5lY3QuanMiLCIuLi9wdWJsaWMvYXNzZXRzL2pzL3VzZXIvY29udHJvbGxlcnMvbGlnaHRQYXR0ZXJuLmpzIiwiLi4vcHVibGljL2Fzc2V0cy9qcy91c2VyL21vZGVscy9jYWxlbmRhckl0ZW1Nb2RlbC5qcyIsIi4uL3B1YmxpYy9hc3NldHMvanMvdXNlci9tb2RlbHMvY2FsZW5kYXJNb2RlbC5qcyIsIi4uL3B1YmxpYy9hc3NldHMvanMvdXNlci9tb2RlbHMvc3RhdGUuanMiLCIuLi9wdWJsaWMvYXNzZXRzL2pzL3VzZXIvcGlwZS5qcyIsIi4uL3B1YmxpYy9hc3NldHMvanMvdXNlci9yb29tRGF0YS5qcyIsIi4uL3B1YmxpYy9hc3NldHMvanMvdXNlci90ZW1wbGF0ZXMvY2FsZW5kYXJJdGVtLmh0bWwiLCIuLi9wdWJsaWMvYXNzZXRzL2pzL3VzZXIvdGVtcGxhdGVzL2NhbGVuZGFyU2luZ2xlLmh0bWwiLCIuLi9wdWJsaWMvYXNzZXRzL2pzL3VzZXIvdGVtcGxhdGVzL2NhbGVuZGFyV3JhcHBlci5odG1sIiwiLi4vcHVibGljL2Fzc2V0cy9qcy91c2VyL3RlbXBsYXRlcy9zcGxhc2hXcmFwcGVyLmh0bWwiLCIuLi9wdWJsaWMvYXNzZXRzL2pzL3VzZXIvdmlld3MvYXBwTGF5b3V0LmpzIiwiLi4vcHVibGljL2Fzc2V0cy9qcy91c2VyL3ZpZXdzL2NhbGVuZGFySXRlbS5qcyIsIi4uL3B1YmxpYy9hc3NldHMvanMvdXNlci92aWV3cy9jYWxlbmRhclNpbmdsZS5qcyIsIi4uL3B1YmxpYy9hc3NldHMvanMvdXNlci92aWV3cy9jYWxlbmRhcldyYXBwZXIuanMiLCIuLi9wdWJsaWMvYXNzZXRzL2pzL3VzZXIvdmlld3Mvc3BsYXNoVmlldy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25HQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2JBO0FBQ0E7O0FDREE7QUFDQTs7QUNEQTtBQUNBOztBQ0RBO0FBQ0E7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwid2luZG93LkNvbW1vbiA9IHtcblx0cGF0aCA6IHtcblx0XHRhc3NldHMgOiBcImFzc2V0cy9cIixcblx0XHRpbWcgOiBcImFzc2V0cy9pbWcvXCIsXG5cdFx0YXVkaW8gOiBcImFzc2V0cy9hdWRpby9cIlxuXHR9LFxuXHRzaXplcyA6e1xuXHRcdGZyYW1lIDogMTBcblx0fVxufTtcblxuLy9iYXNlXG52YXIgQXBwUm91dGVyIFx0XHQ9IHJlcXVpcmUoIFwiY29udHJvbGxlcnMvYXBwUm91dGVyXCIgKTtcbnZhciBBcHBMYXlvdXQgXHRcdD0gcmVxdWlyZSggXCJ2aWV3cy9hcHBMYXlvdXRcIiApO1xuXG4vL2N1c3RvbVxudmFyIENhbGVuZGFyV3JhcHBlclx0PSByZXF1aXJlKFwidmlld3MvY2FsZW5kYXJXcmFwcGVyXCIpO1xudmFyIHJvb21EYXRhID0gcmVxdWlyZShcInJvb21EYXRhXCIpO1xuXG4vL1RIRSBBUFBMSUNBVElPTlxudmFyIE15QXBwID0gTWFyaW9uZXR0ZS5BcHBsaWNhdGlvbi5leHRlbmQoe1xuXHRpbml0aWFsaXplIDogZnVuY3Rpb24oKXtcblx0XHRcblx0fSxcblx0b25TdGFydCA6IGZ1bmN0aW9uKCl7XG5cblx0XHRBcHBMYXlvdXQucmVuZGVyKCk7IFxuXG5cdFx0dmFyIG15Q2FsZW5kYXIgPSBuZXcgQ2FsZW5kYXJXcmFwcGVyKCB7IG1vZGVsIDogbmV3IEJhY2tib25lLk1vZGVsKHsgcm9vbXMgOiByb29tRGF0YSB9KSB9KTtcblx0XHRBcHBMYXlvdXQuZ2V0UmVnaW9uKFwibWFpblwiKS5zaG93KCBteUNhbGVuZGFyICk7XG5cblx0XHRCYWNrYm9uZS5oaXN0b3J5LnN0YXJ0KHtcblx0XHRcdHB1c2hTdGF0ZSA6IGZhbHNlXG5cdFx0fSk7XG5cdH0gXG59KTtcblxuXG5cbiQoZnVuY3Rpb24oKXtcblx0d2luZG93LmFwcCA9IG5ldyBNeUFwcCgpO1xuXHR3aW5kb3cuYXBwLnN0YXJ0KCk7IFxufSk7XG5cblxuXG5cblxuXG5cbiAgICAgICAgICIsInZhciBDYWxlbmRhckNvbGxlY3Rpb24gPSBCYWNrYm9uZS5Db2xsZWN0aW9uLmV4dGVuZCh7XG5cdGluaXRpYWxpemUgOiBmdW5jdGlvbigpe1xuXG5cdH0sXG5cdGNvbXBhcmF0b3IgOiBmdW5jdGlvbiggYSwgYiApe1xuXHRcdHZhciBhVGltZSA9IGEuZ2V0KFwic3RhcnRcIikucmF3O1xuXHRcdHZhciBiVGltZSA9IGIuZ2V0KFwic3RhcnRcIikucmF3O1xuXHRcdHJldHVybiBhVGltZSAtIGJUaW1lO1xuXHR9LFxuXHRnZXRDdXJyZW50IDogZnVuY3Rpb24oKXtcblxuXHRcdHJldHVybiB0aGlzLmZpbmQoZnVuY3Rpb24oIG1vZGVsICl7XG5cblx0XHRcdHJldHVybiBtb2RlbC5pc0FjdGl2ZSgpO1xuXHRcdH0pO1xuXHR9XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBDYWxlbmRhckNvbGxlY3Rpb247IiwidmFyIHBpcGUgPSByZXF1aXJlKFwicGlwZVwiKTtcblxudmFyIE15QXBwUm91dGVyID0gTWFyaW9uZXR0ZS5BcHBSb3V0ZXIuZXh0ZW5kKHtcblx0Y29udHJvbGxlciA6IHtcblx0XHQncm9vbVJvdXRlJyA6IGZ1bmN0aW9uKCl7fSxcblx0XHQnZGVmYXVsdFJvdXRlJyA6IGZ1bmN0aW9uKHZhbHVlLCBxdWVyeVN0cmluZyl7XG5cdFx0XHR2YXIgcGFyYW1zID0gcGFyc2VRdWVyeVN0cmluZyhxdWVyeVN0cmluZyk7XG5cdFx0XHRfLmVhY2goIHBhcmFtcywgZnVuY3Rpb24oIHZhbHVlLCBrZXkgKXtcblx0XHRcdFx0cGlwZS50cmlnZ2VyKFwicGFyYW06XCIra2V5LCB2YWx1ZSApXG5cdFx0XHR9KTtcblx0XHR9XG5cdH0sXG5cdGFwcFJvdXRlcyA6IHtcblx0XHRcInJvb20vOmtleVwiIDogXCJyb29tUm91dGVcIixcblx0XHRcIiphY3Rpb25zXCIgOiBcImRlZmF1bHRSb3V0ZVwiXG5cdH1cbn0pO1xuXG5mdW5jdGlvbiBwYXJzZVF1ZXJ5U3RyaW5nKHF1ZXJ5U3RyaW5nKXtcbiAgICB2YXIgcGFyYW1zID0ge307XG4gICAgaWYocXVlcnlTdHJpbmcpe1xuICAgICAgICBfLmVhY2goXG4gICAgICAgICAgICBfLm1hcChkZWNvZGVVUkkocXVlcnlTdHJpbmcpLnNwbGl0KC8mL2cpLGZ1bmN0aW9uKGVsLGkpe1xuICAgICAgICAgICAgICAgIHZhciBhdXggPSBlbC5zcGxpdCgnPScpLCBvID0ge307XG4gICAgICAgICAgICAgICAgaWYoYXV4Lmxlbmd0aCA+PSAxKXtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHZhbCA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICAgICAgaWYoYXV4Lmxlbmd0aCA9PSAyKVxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsID0gYXV4WzFdO1xuICAgICAgICAgICAgICAgICAgICBvW2F1eFswXV0gPSB2YWw7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBvO1xuICAgICAgICAgICAgfSksXG4gICAgICAgICAgICBmdW5jdGlvbihvKXtcbiAgICAgICAgICAgICAgICBfLmV4dGVuZChwYXJhbXMsbyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICk7XG4gICAgfVxuICAgIHJldHVybiBwYXJhbXM7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gbmV3IE15QXBwUm91dGVyKCk7XG4iLCJ2YXIgcGlwZSA9IHJlcXVpcmUoXCJwaXBlXCIpO1xuXG4vL2xpc3RlbmluZyBmb3IgbG9hZFxud2luZG93LmhhbmRsZUNsaWVudExvYWQgPSBmdW5jdGlvbigpe1xuXG4gIGNvbnNvbGUubG9nKFwiZ29vZ2xlIGFwaSBsb2FkZWRcIik7XG4gIF8uZGVmZXIoIGZ1bmN0aW9uKCl7IGluaXQoKSB9KTtcbn1cblxudmFyIGNsaWVudElkID0gJzQzMzgzOTcyMzM2NS11N2dybGR0dmY4cGFiamtqNGZyY2lvM2N2NWhpdDhmbS5hcHBzLmdvb2dsZXVzZXJjb250ZW50LmNvbSc7XG52YXIgYXBpS2V5ID0gJ0FJemFTeUJzS2RUcGxSWHVFd2d2UFNIX2dHRjhPR3N3MzV0MTV2MCc7XG52YXIgc2NvcGVzID0gJ2h0dHBzOi8vd3d3Lmdvb2dsZWFwaXMuY29tL2F1dGgvY2FsZW5kYXInO1xudmFyIHJvb21EYXRhID0gcmVxdWlyZShcInJvb21EYXRhXCIpO1xudmFyIHB1bGxJbnRlcnZhbCA9IDEwMDAgKiAxMDtcblxuLy9UT0RPIDogaW50ZWdyYXRlIGFsbCA0IGNhbGVuZGFyc1xuXG5mdW5jdGlvbiBpbml0KCl7XG5cdGdhcGkuY2xpZW50LnNldEFwaUtleShhcGlLZXkpO1xuXHRjaGVja0F1dGgoKTtcbn1cblxuZnVuY3Rpb24gY2hlY2tBdXRoKCl7XG5cdGdhcGkuYXV0aC5hdXRob3JpemUoIHtcblx0XHRjbGllbnRfaWQ6IGNsaWVudElkLCBcblx0XHRzY29wZTogc2NvcGVzLCBcblx0XHRpbW1lZGlhdGU6IGZhbHNlXG5cdH0sIGhhbmRsZUF1dGhSZXN1bHQgKTtcbn1cblxuZnVuY3Rpb24gaGFuZGxlQXV0aFJlc3VsdCggYXV0aFJlc3VsdCApe1xuXG5cdGlmKGF1dGhSZXN1bHQpe1xuXHRcdG1ha2VBcGlDYWxsKCk7XG5cdH1cbn1cblxuZnVuY3Rpb24gbWFrZUFwaUNhbGwoKSB7XG4gIGdhcGkuY2xpZW50LmxvYWQoJ2NhbGVuZGFyJywgJ3YzJywgZnVuY3Rpb24oKSB7XG4gICAgICBcbiAgICAgIHB1bGxSb29tcygpO1xuICAgICAgc2V0SW50ZXJ2YWwoIHB1bGxSb29tcywgcHVsbEludGVydmFsICk7ICAgICAgICAgIFxuICB9KTtcbn1cblxuZnVuY3Rpb24gcHVsbFJvb21zKCl7XG5cbiAgdmFyIGZyb20gPSBuZXcgRGF0ZSgpO1xuICB2YXIgdG8gPSBuZXcgRGF0ZSgpO1xuICAgICAgdG8uc2V0RGF0ZSggdG8uZ2V0RGF0ZSgpICsgMSApO1xuXG4gIF8uZWFjaCggcm9vbURhdGEsIGZ1bmN0aW9uKCBkYXRhLCBrZXkgKXtcblxuICAgIHZhciByZXF1ZXN0ID0gZ2FwaS5jbGllbnQuY2FsZW5kYXIuZXZlbnRzLmxpc3Qoe1xuICAgICAgICAnY2FsZW5kYXJJZCc6IGRhdGEuY2FsZW5kYXJJZCxcbiAgICAgICAgdGltZU1pbiA6IGZyb20udG9JU09TdHJpbmcoKSxcbiAgICAgICAgdGltZU1heCA6IHRvLnRvSVNPU3RyaW5nKCksXG4gICAgICAgIHNpbmdsZUV2ZW50cyA6IHRydWVcbiAgICAgIH0pO1xuXG4gICAgIHJlcXVlc3QudGhlbihmdW5jdGlvbihyZXNwb25zZSkge1xuXG4gICAgICAgICAgcm9vbUxvYWRlZCgga2V5LCByZXNwb25zZS5yZXN1bHQgKTtcbiAgICAgIH0sIGZ1bmN0aW9uKHJlYXNvbikge1xuXG4gICAgICAgICAgY29uc29sZS5sb2coJ0Vycm9yOiAnICsgcmVhc29uLnJlc3VsdC5lcnJvci5tZXNzYWdlKTtcbiAgICAgIH0pO1xuICB9KTtcbn1cblxuZnVuY3Rpb24gcm9vbUxvYWRlZCgga2V5LCBkYXRhICl7XG5cbiAgZXZlbnRzLnRyaWdnZXIoIFwiZXZlbnRzTG9hZGVkXCIsIHsga2V5IDoga2V5LCBkYXRhIDogZGF0YSB9ICk7XG59XG5cbnZhciBldmVudHMgPSBfLmV4dGVuZCh7fSwgQmFja2JvbmUuRXZlbnRzKTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cbiAgZXZlbnRzIDogZXZlbnRzXG59O1xuIiwidmFyIG15U29ja2V0ID0gbnVsbDtcbnZhciBjb25uZWN0ZWQgPSBmYWxzZTtcblxudmFyIHBpcGUgPSByZXF1aXJlKFwicGlwZVwiKTtcblxuZnVuY3Rpb24gaW5pdCgpe1xuXG5cdHBpcGUub24oXCJwYXJhbTpzb2NrZXRcIiwgY29ubmVjdClcbn1cblxuZnVuY3Rpb24gY29ubmVjdCgpe1xuXHRcblx0bXlTb2NrZXQgPSBpby5jb25uZWN0KCcvL2xvY2FsaG9zdDozMDAwJyk7XG5cdG15U29ja2V0Lm9uKCdjb25uZWN0JywgZnVuY3Rpb24oKXtcblx0XHRjb25uZWN0ZWQgPSB0cnVlO1xuXHR9KTtcdFxufVxuXG5mdW5jdGlvbiB1cGRhdGUoIGRhdGEgKXtcblxuXHRpZihjb25uZWN0ZWQpe1xuXHRcdG15U29ja2V0LmVtaXQoICd1cGRhdGVfZGF0YScsIGRhdGEgKTtcdFxuXHR9XG59XG5cbmluaXQoKTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cdGluaXQgOiBpbml0LFxuXHR1cGRhdGUgOiB1cGRhdGUsXG5cdGNvbm5lY3RlZCA6IGNvbm5lY3RlZFxufSIsInZhciBodWVDb25uZWN0ID0gcmVxdWlyZShcImNvbnRyb2xsZXJzL2h1ZUNvbm5lY3RcIik7XG5cbmZ1bmN0aW9uIExpZ2h0UGF0dGVybiggbGlnaHRJZCwgcGF0dGVybklkICl7XG5cblx0dGhpcy5faHNsID0ge1xuXHRcdGggOiAwLFxuXHRcdHMgOiAwLFxuXHRcdGwgOiAwXG5cdH1cblxuXHR0aGlzLl9saWdodElkID0gbGlnaHRJZDtcblx0dGhpcy5fcGF0dGVybklkID0gcGF0dGVybklkO1xuXG5cdHRoaXMuX3N0ZXAgPSAwO1xuXHR0aGlzLl9pdGVyYXRpb24gPSAwO1xuXHR0aGlzLl9yZXBlYXQgPSBwYXR0ZXJuc1sgdGhpcy5fcGF0dGVybklkIF0ucmVwZWF0O1xuXG5cdHRoaXMuX3NlcXVlbmNlID0gdGhpcy5zdGFydFNlcXVlbmNlKCB0aGlzLl9wYXR0ZXJuSWQgKTtcblxuXHR0aGlzLl90aW1lb3V0ID0gbnVsbDtcbn1cblxuTGlnaHRQYXR0ZXJuLnByb3RvdHlwZSA9IHtcblx0c3RhcnRTZXF1ZW5jZSA6IGZ1bmN0aW9uKCBpZCApe1xuXG5cdFx0dGhpcy5fc2VxdWVuY2UgPSBwYXR0ZXJuc1sgaWQgXS5zZXF1ZW5jZTtcblxuXHRcdHRoaXMuc3RvcFNlcXVlbmNlKCk7XG5cdFx0dGhpcy5wbGF5U2VxdWVuY2VTdGVwKDApO1xuXG5cdFx0cmV0dXJuIHRoaXMuX3NlcXVlbmNlO1xuXHR9LFxuXHRzdG9wU2VxdWVuY2UgOiBmdW5jdGlvbigpe1xuXG5cdFx0dGhpcy5fc3RlcCA9IDA7XG5cdFx0dGhpcy5faXRlcmF0aW9uID0gMDtcblxuXHRcdHdpbmRvdy5jbGVhclRpbWVvdXQoIHRoaXMuX3RpbWVvdXQgKTtcblx0fSxcblx0cGxheVNlcXVlbmNlU3RlcDogZnVuY3Rpb24oIHN0ZXAgKXtcblxuXHRcdHRoaXMuX3N0ZXAgPSBzdGVwO1xuXG5cdFx0dmFyIHNlZ21lbnQgPSB0aGlzLl9zZXF1ZW5jZVt0aGlzLl9zdGVwXTtcblxuXHRcdHZhciBjb2xvciA9IG9uZS5jb2xvciggc2VnbWVudC5jb2xvciApO1xuXHRcdHZhciBmYWRlID0gc2VnbWVudC5mYWRlO1xuXHRcdHZhciB3YWl0ID0gc2VnbWVudC53YWl0O1xuXG5cdFx0dmFyIGhzbCA9IHtcblx0XHRcdGggOiBNYXRoLmZsb29yKCBjb2xvci5oKCkgKiAzNjApLCBcblx0XHRcdHMgOiBNYXRoLmZsb29yKCBjb2xvci5zKCkgKiAxMDApLFxuXHRcdFx0bCA6IE1hdGguZmxvb3IoIGNvbG9yLmwoKSAqIDEwMCkgXG5cdFx0fTtcblxuXHRcdGh1ZUNvbm5lY3QudXBkYXRlKFt7XG5cdFx0XHRpZCA6IHRoaXMuX2xpZ2h0SWQsXG5cdFx0XHRkYXRhIDoge1xuXHRcdFx0XHRoc2wgOiBoc2wsXG5cdFx0XHRcdGR1cmF0aW9uIDogZmFkZVxuXHRcdFx0fVxuXHRcdH1dKTtcblxuXHRcdHdpbmRvdy5jbGVhclRpbWVvdXQoIHRoaXMuX3RpbWVvdXQgKTtcblx0XHR0aGlzLl90aW1lb3V0ID0gd2luZG93LnNldFRpbWVvdXQoJC5wcm94eSh0aGlzLm5leHRTZXF1ZW5jZVN0ZXAsIHRoaXMpLCB3YWl0KjEwMDApO1xuXHR9LFxuXHRuZXh0U2VxdWVuY2VTdGVwOiBmdW5jdGlvbigpe1xuXG5cdFx0dmFyIHRvdGFsU3RlcHMgPSB0aGlzLl9zZXF1ZW5jZS5sZW5ndGg7XG5cdFx0dmFyIHJlcGVhdCA9IHRoaXMuX3JlcGVhdDtcblxuXHRcdHRoaXMuX3N0ZXAgKys7XG5cdFx0aWYodGhpcy5fc3RlcCA+IHRvdGFsU3RlcHMgLSAxKSB7XG5cdFx0XHR0aGlzLl9zdGVwID0gMDtcblx0XHRcdHRoaXMuX2l0ZXJhdGlvbiArKztcblx0XHR9XG5cblx0XHRpZihyZXBlYXQgPiAtMSAmJiB0aGlzLl9pdGVyYXRpb24gPiByZXBlYXQpIHtcblx0XHRcdHRoaXMuc3RvcFNlcXVlbmNlKCk7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0dGhpcy5wbGF5U2VxdWVuY2VTdGVwKCB0aGlzLl9zdGVwICk7XG5cdH1cbn1cblxudmFyIHBhdHRlcm5zID0ge1xuXHQndGVzdCcgOiB7XG5cdFx0cmVwZWF0IDogIC0xLFxuXHRcdHNlcXVlbmNlIDogW1xuXHRcdFx0eyBjb2xvciA6IFwiI0ZCMTkxMVwiLCBmYWRlIDogMSwgd2FpdCA6IDEgfSxcblx0XHRcdHsgY29sb3IgOiBcIiMwMGZmMDBcIiwgZmFkZSA6IDEsIHdhaXQgOiAxIH0sXG5cdFx0XHR7IGNvbG9yIDogXCIjNDE1NkZGXCIsIGZhZGUgOiAxLCB3YWl0IDogMSB9LFxuXHRcdFx0eyBjb2xvciA6IFwiI0ZGMDAxRFwiLCBmYWRlIDogMSwgd2FpdCA6IDEgfSxcblx0XHRcdHsgY29sb3IgOiBcIiNGRkZGMDdcIiwgZmFkZSA6IDEsIHdhaXQgOiAxIH0sXG5cdFx0XVxuXHR9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gTGlnaHRQYXR0ZXJuOyIsInZhciBDYWxlbmRhckl0ZW1Nb2RlbCA9IEJhY2tib25lLk1vZGVsLmV4dGVuZCh7XG5cdGRlZmF1bHRzIDoge1xuXHRcdHN1bW1hcnkgOiBcIm4vYVwiLFxuXHRcdGRlc2NyaXB0aW9uIDogXCJuL2FcIixcblx0XHRzdGFydCA6IFwibi9hXCIsXG5cdFx0ZW5kIDogXCJuL2FcIixcblx0fSxcblx0aW5pdGlhbGl6ZSA6IGZ1bmN0aW9uKCl7XG5cblx0XHR0aGlzLmNvbnZlcnREYXRlKFwic3RhcnRcIik7XG5cdFx0dGhpcy5jb252ZXJ0RGF0ZShcImVuZFwiKTtcblx0fSxcblx0Y29udmVydERhdGUgOiBmdW5jdGlvbigga2V5ICl7XG5cdFx0Ly9jb252ZXJ0IGRhdGFzXG5cdFx0dmFyIGRhdGVTdHJpbmcgPSB0aGlzLmdldCgga2V5IClcblx0XHRpZighZGF0ZVN0cmluZykgcmV0dXJuO1xuXHRcdFxuXHRcdGRhdGVTdHJpbmcgPSBkYXRlU3RyaW5nLmRhdGVUaW1lO1xuXHRcdHZhciBub3cgPSBuZXcgRGF0ZSgpO1xuXHRcdHZhciBkYXRlID0gbmV3IERhdGUoIGRhdGVTdHJpbmcgKTtcblxuXHRcdHRoaXMuc2V0KCBrZXksIHtcblx0XHRcdHJhdyA6IGRhdGUsXG5cdFx0XHRmb3JtYXR0ZWQgOiBkYXRlLnRvU3RyaW5nKClcblx0XHR9KTtcblx0fSxcblx0aXNBY3RpdmUgOiBmdW5jdGlvbigpe1xuXHRcdCB2YXIgc3RhcnQgPSB0aGlzLmdldChcInN0YXJ0XCIpLnJhdztcblx0XHQgdmFyIGVuZCA9IHRoaXMuZ2V0KFwiZW5kXCIpLnJhdztcblx0XHQgdmFyIG5vdyA9IG5ldyBEYXRlKCk7XG5cblx0XHQgaWYoIG5vdyA+IHN0YXJ0ICYmIG5vdyA8IGVuZCApe1xuXHRcdCBcdHJldHVybiB0cnVlO1xuXHRcdCB9XG5cblx0XHQgcmV0dXJuIGZhbHNlO1xuXHR9XG59KVxuXG5tb2R1bGUuZXhwb3J0cyA9IENhbGVuZGFySXRlbU1vZGVsOyIsInZhciBDYWxlbmRhckl0ZW1Nb2RlbCBcdD0gcmVxdWlyZShcIm1vZGVscy9jYWxlbmRhckl0ZW1Nb2RlbFwiKTtcblxudmFyIENhbGVuZGFyTW9kZWwgPSBCYWNrYm9uZS5Nb2RlbC5leHRlbmQoe1xuXHRkZWZhdWx0cyA6IHtcblx0XHRvcmdhbml6ZXIgOiBcIldlc1wiXG5cdH0sXG5cdGluaXRpYWxpemUgOiBmdW5jdGlvbigpe1xuXG5cdFx0Xy5iaW5kQWxsKCB0aGlzLCBcImdldEN1cnJlbnRcIiApO1xuXG5cdFx0dGhpcy5saXN0ZW5UbyggdGhpcywgXCJjaGFuZ2U6dXBkYXRlZFwiLCB0aGlzLnVwZGF0ZUV2ZW50cyApO1xuXHRcdHRoaXMubGlzdGVuVG8oIHRoaXMsIFwiY2hhbmdlOnVwZGF0ZWRcIiwgdGhpcy5nZXRDdXJyZW50ICk7XG5cblx0XHRzZXRJbnRlcnZhbCggdGhpcy5nZXRDdXJyZW50LCAxMDAwICk7XG5cdH0sXG5cdGdldEN1cnJlbnQgOiBmdW5jdGlvbigpe1xuXG5cdFx0dmFyIGV2ZW50Q29sbGVjdGlvbiA9IHRoaXMuZ2V0KFwiZXZlbnRDb2xsZWN0aW9uXCIpO1xuXG5cdFx0Ly9nZXR0aW5nIGN1cnJlbnQgZXZlbnRcblx0XHR2YXIgY3VycmVudCA9IGV2ZW50Q29sbGVjdGlvbi5nZXRDdXJyZW50KCk7XG5cdFx0XG5cdFx0aWYoIGN1cnJlbnQgKXtcblx0XHRcdGN1cnJlbnQgPSBjdXJyZW50LnRvSlNPTigpO1xuXHRcdH1cblxuXHRcdHRoaXMuc2V0KFwiY3VycmVudEV2ZW50XCIsIGN1cnJlbnQgKTtcdFxuXHR9LFxuXHR1cGRhdGVFdmVudHMgOiBmdW5jdGlvbigpe1xuXG5cdFx0dmFyIGV2ZW50Q29sbGVjdGlvbiA9IHRoaXMuZ2V0KFwiZXZlbnRDb2xsZWN0aW9uXCIpO1xuXG5cdFx0dmFyIHJvb21EYXRhID0gdGhpcy5nZXQoXCJyb29tRGF0YVwiKTtcblx0XHR2YXIgbmV3TW9kZWxzID0gW107XG5cblx0XHRpZiggIXJvb21EYXRhICkgcmV0dXJuO1xuXG5cdFx0Xy5lYWNoKCByb29tRGF0YS5pdGVtcywgZnVuY3Rpb24oIGl0ZW0gKXtcblxuXHRcdFx0dmFyIG0gPSBuZXcgQ2FsZW5kYXJJdGVtTW9kZWwoIGl0ZW0gKTtcblx0XHRcdG0uc2V0KFwia2V5XCIsIHRoaXMuZ2V0KFwia2V5XCIpKTtcblx0XHRcdG5ld01vZGVscy5wdXNoKCBtICk7XG5cdFx0fSwgdGhpcyk7XG5cblx0XHRldmVudENvbGxlY3Rpb24ucmVzZXQoIG5ld01vZGVscyApO1xuXHR9XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBDYWxlbmRhck1vZGVsOyIsInZhciBzdGF0ZSA9IG5ldyAoQmFja2JvbmUuTW9kZWwuZXh0ZW5kKHtcblx0ZGVmYXVsdHMgOiB7XG5cdFx0Ly8gXCJuYXZfb3BlblwiIFx0XHQ6IGZhbHNlLFxuXHRcdC8vICdzY3JvbGxfYXRfdG9wJyA6IHRydWUsXG5cdFx0Ly8gJ21pbmltYWxfbmF2JyBcdDogZmFsc2UsXG5cdFx0Ly8gJ2Z1bGxfbmF2X29wZW4nXHQ6IGZhbHNlLFxuXHRcdC8vICd1aV9kaXNwbGF5J1x0OiBmYWxzZVxuXHR9XG59KSkoKTtcblxubW9kdWxlLmV4cG9ydHMgPSBzdGF0ZTtcbiIsInZhciBwaXBlID0gXy5leHRlbmQoe1xuXG5cdFxuXHRcbn0sIEJhY2tib25lLkV2ZW50cyk7XG5cbm1vZHVsZS5leHBvcnRzID0gcGlwZTsiLCJtb2R1bGUuZXhwb3J0cyA9IHtcblx0JzEnOiB7XG5cdFx0J2NhbGVuZGFySWQnIDogXCJiLXJlZWwuY29tXzJkMzIzODM3MzkzNjM2MzIzMjM3MzgzMUByZXNvdXJjZS5jYWxlbmRhci5nb29nbGUuY29tXCJcblx0fSxcblx0JzInOiB7XG5cdFx0J2NhbGVuZGFySWQnIDogXCJiLXJlZWwuY29tXzJkMzEzMjM3MzczODM4MzMzNDJkMzIzNDMyQHJlc291cmNlLmNhbGVuZGFyLmdvb2dsZS5jb21cIlxuXHR9LFxuXHQnMyc6IHtcblx0XHQnY2FsZW5kYXJJZCcgOiBcImItcmVlbC5jb21fMzEzNjM1MzMzOTM2MzEzOTM5MzMzOEByZXNvdXJjZS5jYWxlbmRhci5nb29nbGUuY29tXCJcblx0fSxcblx0JzUnOiB7XG5cdFx0J2NhbGVuZGFySWQnIDogXCJiLXJlZWwuY29tXzJkMzQzNDMyMzgzOTM2MzczMDJkMzYzNDMzQHJlc291cmNlLmNhbGVuZGFyLmdvb2dsZS5jb21cIlxuXHR9XG59OyIsIm1vZHVsZS5leHBvcnRzID0gXCI8aDI+c3VtbWFyeSA6IDwlPSBzdW1tYXJ5ICU+PC9oMj5cXG5cXG48aDM+ZGVzY3JpcHRpb24gOiA8JT0gZGVzY3JpcHRpb24gJT48L2gzPlxcblxcbjxoMz5zdGFydCA6IDwlPSBzdGFydC5mb3JtYXR0ZWQgJT48L2gzPlxcblxcbjxoMz5lbmQgOiA8JT0gZW5kLmZvcm1hdHRlZCAlPjwvaDM+XCI7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IFwiPGJ1dHRvbiBpZD1cXFwiY2xvc2VcXFwiPmNsb3NlPC9idXR0b24+XFxuPGRpdiBpZD1cXFwiZXZlbnQtbGlzdFxcXCI+PC9kaXY+IFwiO1xuIiwibW9kdWxlLmV4cG9ydHMgPSBcIjxkaXYgaWQ9XFxcInNwbGFzaC1wYWdlXFxcIj48L2Rpdj5cXG5cXG48ZGl2IGlkPVxcXCJyb29tLXNpbmdsZVxcXCI+PC9kaXY+XFxuXFxuPCEtLSBURVNUIC0tPlxcbjxkaXYgY2xhc3M9XFxcInRlc3RcXFwiIHN0eWxlPVxcXCJwb3NpdGlvbjphYnNvbHV0ZTt0b3A6MDtcXFwiPlxcblxcdDxkaXY+XFxuXFx0XFx0PGlucHV0IGlkPVxcXCJoZXgtaW5wdXRcXFwiIHR5cGU9XFxcInRleHRcXFwiPjwvaW5wdXQ+XFxuXFx0XFx0PGJ1dHRvbiBpZD1cXFwiaGV4XFxcIj5oZXg8L2J1dHRvbj5cXG5cXHQ8L2Rpdj5cXG5cXHQ8YnV0dG9uIGlkPVxcXCJ0ZXN0XFxcIj50ZXN0PC9idXR0b24+XFxuXFx0PGlucHV0IGNsYXNzPVxcXCJjb2xvclxcXCIgdHlwZT1cXFwiY29sb3JcXFwiIG5hbWU9XFxcImZhdmNvbG9yXFxcIj5cXG48L2Rpdj5cIjtcbiIsIm1vZHVsZS5leHBvcnRzID0gXCI8JSBfLmVhY2goIHJvb21zRGF0YSwgZnVuY3Rpb24oIGRhdGEsIGtleSApeyAlPlxcblxcdDxkaXYgY2xhc3M9XFxcInJvb20tY29udGFpbmVyXFxcIj5cXG5cXHRcXHQ8c2VjdGlvbiBpZD1cXFwicm9vbS08JT0ga2V5ICU+XFxcIiBjbGFzcz1cXFwicm9vbVxcXCIgZGF0YS1pZD1cXFwiPCU9IGtleSAlPlxcXCI+XFxuXFx0XFx0XFx0PGRpdiBjbGFzcz1cXFwibnVtYmVyXFxcIj48JT0ga2V5ICU+PC9kaXY+XFxuXFx0XFx0XFx0PGRpdiBjbGFzcz1cXFwiZ3JhcGhcXFwiPjwvZGl2PlxcblxcdFxcdFxcdDxkaXYgY2xhc3M9XFxcInBlcnNvblxcXCI+PCU9IGRhdGEuY3VycmVudEV2ZW50ID8gZGF0YS5jdXJyZW50RXZlbnQuc3VtbWFyeSA6ICdub3RoaW5nJyAlPjwvZGl2PlxcblxcdFxcdDwvc2VjdGlvbj5cXG5cXHQ8L2Rpdj5cXG48JSB9KTsgJT5cIjtcbiIsInZhciBTdGF0ZSBcdFx0PSByZXF1aXJlKFwibW9kZWxzL3N0YXRlXCIpO1xuXG52YXIgTXlBcHBMYXlvdXQgPSBNYXJpb25ldHRlLkxheW91dFZpZXcuZXh0ZW5kKHtcblx0ZWwgOiBcIiNjb250ZW50XCIsXG5cdHRlbXBsYXRlIDogZmFsc2UsXG5cdHJlZ2lvbnMgOiB7XG5cdFx0bWFpbiA6IFwiI21haW5cIlxuXHR9LCBcblx0aW5pdGlhbGl6ZSA6IGZ1bmN0aW9uKCl7XG5cdFx0dmFyIF90aGlzID0gdGhpcztcblxuXHRcdC8vd3JhcHBpbmcgaHRtbFxuXHRcdHRoaXMuJGh0bWwgPSAkKFwiaHRtbFwiKTtcblx0XHR0aGlzLiRodG1sLnJlbW92ZUNsYXNzKFwiaGlkZGVuXCIpO1xuXG5cdFx0Ly9yZXNpemUgZXZlbnRzXG5cdFx0JCh3aW5kb3cpLnJlc2l6ZShmdW5jdGlvbigpe1xuXHRcdFx0X3RoaXMub25SZXNpemVXaW5kb3coKTtcblx0XHR9KS5yZXNpemUoKTtcblxuXHRcdHRoaXMubGlzdGVuRm9yU3RhdGUoKTtcblx0fSxcblx0bGlzdGVuRm9yU3RhdGUgOiBmdW5jdGlvbigpe1xuXHRcdC8vc3RhdGUgY2hhbmdlXG5cdFx0dGhpcy5saXN0ZW5UbyggU3RhdGUsIFwiY2hhbmdlXCIsIGZ1bmN0aW9uKCBlICl7XG5cblx0XHRcdHRoaXMub25TdGF0ZUNoYW5nZSggZS5jaGFuZ2VkLCBlLl9wcmV2aW91c0F0dHJpYnV0ZXMgKTtcblx0XHR9LCB0aGlzKTtcblx0XHR0aGlzLm9uU3RhdGVDaGFuZ2UoIFN0YXRlLnRvSlNPTigpICk7XG5cdH0sXG5cdG9uU3RhdGVDaGFuZ2UgOiBmdW5jdGlvbiggY2hhbmdlZCwgcHJldmlvdXMgKXtcblxuXHRcdF8uZWFjaCggY2hhbmdlZCwgZnVuY3Rpb24odmFsdWUsIGtleSl7XG5cdFx0XHRcblx0XHRcdGlmKCBfLmlzQm9vbGVhbiggdmFsdWUgKSApe1xuXHRcdFx0XHR0aGlzLiRodG1sLnRvZ2dsZUNsYXNzKFwic3RhdGUtXCIra2V5LCB2YWx1ZSk7XG5cdFx0XHRcdHRoaXMuJGh0bWwudG9nZ2xlQ2xhc3MoXCJzdGF0ZS1ub3QtXCIra2V5LCAhdmFsdWUpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0dmFyIHByZXZWYWx1ZSA9IHByZXZpb3VzWyBrZXkgXTtcblx0XHRcdFx0aWYocHJldlZhbHVlKXtcblx0XHRcdFx0XHR0aGlzLiRodG1sLnRvZ2dsZUNsYXNzKFwic3RhdGUtXCIra2V5K1wiLVwiK3ByZXZWYWx1ZSwgZmFsc2UpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHRoaXMuJGh0bWwudG9nZ2xlQ2xhc3MoXCJzdGF0ZS1cIitrZXkrXCItXCIrdmFsdWUsIHRydWUpO1xuXHRcdFx0fVxuXG5cdFx0fSwgdGhpcyApO1xuXHR9LFxuXHRvblJlc2l6ZVdpbmRvdyA6IGZ1bmN0aW9uKCl7XG5cdFx0Q29tbW9uLnd3ID0gJCh3aW5kb3cpLndpZHRoKCk7XG5cdFx0Q29tbW9uLndoID0gJCh3aW5kb3cpLmhlaWdodCgpO1xuXHR9XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBuZXcgTXlBcHBMYXlvdXQoKTsiLCJ2YXIgQ2FsZW5kYXJJdGVtID0gTWFyaW9uZXR0ZS5JdGVtVmlldy5leHRlbmQoe1xuXHRjbGFzc05hbWUgOiBcIml0ZW1cIixcblx0dGVtcGxhdGUgOiBfLnRlbXBsYXRlKCByZXF1aXJlKFwidGVtcGxhdGVzL2NhbGVuZGFySXRlbS5odG1sXCIpICksXG5cdHVpIDoge1xuXHRcdCd0aXRsZScgOiBcImgyXCJcblx0fSxcblx0ZXZlbnRzIDoge1xuXHRcdCdjbGljayBAdWkudGl0bGUnIDogZnVuY3Rpb24oKXtcblxuXG5cdFx0fVxuXHR9XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBDYWxlbmRhckl0ZW07IiwidmFyIENhbGVuZGFySXRlbSBcdD0gcmVxdWlyZShcInZpZXdzL2NhbGVuZGFySXRlbVwiKTtcbnZhciBBcHBSb3V0ZXIgXHRcdD0gcmVxdWlyZSggXCJjb250cm9sbGVycy9hcHBSb3V0ZXJcIiApO1xuXG52YXIgQ2FsZW5kYXJTaW5nbGUgPSBNYXJpb25ldHRlLkxheW91dFZpZXcuZXh0ZW5kKHtcblx0dGVtcGxhdGUgOiBfLnRlbXBsYXRlKCByZXF1aXJlKFwidGVtcGxhdGVzL2NhbGVuZGFyU2luZ2xlLmh0bWxcIikgKSxcblx0cmVnaW9ucyA6IHtcblx0XHRldmVudExpc3QgOiBcIiNldmVudC1saXN0XCJcblx0fSxcblx0dWkgOiB7XG5cdFx0Y2xvc2VCdXR0b24gOiBcIiNjbG9zZVwiXG5cdH0sXG5cdGV2ZW50cyA6IHtcblx0XHQnY2xpY2sgQHVpLmNsb3NlQnV0dG9uJyA6IFwib25DbG9zZVwiXG5cdH0sXG5cdGluaXRpYWxpemUgOiBmdW5jdGlvbigpe1xuXG5cdFx0dGhpcy5jb2xsZWN0aW9uVmlldyA9IG5ldyBNYXJpb25ldHRlLkNvbGxlY3Rpb25WaWV3KHtcblx0XHRcdGNoaWxkVmlldyA6IENhbGVuZGFySXRlbSxcblx0XHRcdGNvbGxlY3Rpb24gOiB0aGlzLm1vZGVsLmdldChcImV2ZW50Q29sbGVjdGlvblwiKVxuXHRcdH0pO1xuXG5cdFx0XG5cdH0sXG5cdG9uU2hvdyA6IGZ1bmN0aW9uKCl7XG5cblx0XHR0aGlzLmdldFJlZ2lvbiggXCJldmVudExpc3RcIiApLnNob3coIHRoaXMuY29sbGVjdGlvblZpZXcgKTtcblx0XHRcblx0fSxcblx0b25DbG9zZSA6IGZ1bmN0aW9uKCl7XG5cblx0XHRBcHBSb3V0ZXIubmF2aWdhdGUoXCIvXCIsIHt0cmlnZ2VyOiB0cnVlfSk7XG5cdH1cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IENhbGVuZGFyU2luZ2xlOyIsInZhciBBcHBSb3V0ZXIgXHRcdD0gcmVxdWlyZSggXCJjb250cm9sbGVycy9hcHBSb3V0ZXJcIiApO1xuXG52YXIgY2FsZW5kYXJMb2FkID0gcmVxdWlyZShcImNvbnRyb2xsZXJzL2NhbGVuZGFyTG9hZFwiKTtcbnZhciBDYWxlbmRhclNpbmdsZSBcdD0gcmVxdWlyZShcInZpZXdzL2NhbGVuZGFyU2luZ2xlXCIpO1xudmFyIENhbGVuZGFyTW9kZWwgXHQ9IHJlcXVpcmUoXCJtb2RlbHMvY2FsZW5kYXJNb2RlbFwiKTtcbnZhciBDYWxlbmRhckl0ZW1Nb2RlbCBcdD0gcmVxdWlyZShcIm1vZGVscy9jYWxlbmRhckl0ZW1Nb2RlbFwiKTtcbnZhciBDYWxlbmRhckNvbGxlY3Rpb24gXHQ9IHJlcXVpcmUoXCJjb2xsZWN0aW9ucy9jYWxlbmRhckNvbGxlY3Rpb25cIik7XG52YXIgU3BsYXNoVmlldyBcdD0gcmVxdWlyZShcInZpZXdzL3NwbGFzaFZpZXdcIik7XG5cbnZhciBodWVDb25uZWN0ID0gcmVxdWlyZShcImNvbnRyb2xsZXJzL2h1ZUNvbm5lY3RcIik7XG52YXIgTGlnaHRQYXR0ZXJuID0gcmVxdWlyZShcImNvbnRyb2xsZXJzL2xpZ2h0UGF0dGVyblwiKTtcbnZhciByb29tRGF0YSA9IHJlcXVpcmUoXCJyb29tRGF0YVwiKTtcblxudmFyIENhbGVuZGFyVmlldyA9IE1hcmlvbmV0dGUuTGF5b3V0Vmlldy5leHRlbmQoe1xuXHR0ZW1wbGF0ZSA6IF8udGVtcGxhdGUoIHJlcXVpcmUoXCJ0ZW1wbGF0ZXMvY2FsZW5kYXJXcmFwcGVyLmh0bWxcIikgKSxcblx0cmVnaW9ucyA6IHtcblx0XHRyb29tU2luZ2xlIDogXCIjcm9vbS1zaW5nbGVcIixcblx0XHRzcGxhc2hQYWdlIDogXCIjc3BsYXNoLXBhZ2VcIlxuXHR9LFxuXHR1aSA6IHtcblx0XHRjb2xvclBpY2tlciA6IFwiLmNvbG9yXCIsXG5cdFx0dGVzdCA6IFwiI3Rlc3RcIixcblx0XHRoZXhCdXR0b24gOiBcIiNoZXhcIixcblx0XHRoZXhJbnB1dCA6IFwiI2hleC1pbnB1dFwiLFxuXHRcdHJvb20gOiBcIi5yb29tXCJcblx0fSxcblx0ZXZlbnRzIDoge1xuXHRcdFwiY2xpY2sgQHVpLnRlc3RcIiA6IGZ1bmN0aW9uKCl7XG5cdFx0XHRmb3IoIHZhciBpID0gMCA7IGkgPCA1IDsgaSsrICl7XG5cdFx0XHRcdG5ldyBMaWdodFBhdHRlcm4oaSsxLCBcInRlc3RcIik7XG5cdFx0XHR9XG5cdFx0fSxcblx0XHRcImNsaWNrIEB1aS5oZXhCdXR0b25cIiA6IGZ1bmN0aW9uKCl7XG5cdFx0XHR2YXIgY29sb3IgPSB0aGlzLnVpLmhleElucHV0LnZhbCgpO1xuXHRcdFx0dGhpcy50ZXN0Q29sb3IoIGNvbG9yICk7XG5cdFx0fSxcblx0XHRcImNsaWNrIEB1aS5yb29tXCIgOiBmdW5jdGlvbiggZSApe1xuXHRcdFx0dmFyIGtleSA9ICQoIGUuY3VycmVudFRhcmdldCApLmRhdGEoXCJpZFwiKTtcblx0XHRcdEFwcFJvdXRlci5uYXZpZ2F0ZShcInJvb20vXCIra2V5LCB7dHJpZ2dlcjogdHJ1ZX0pO1xuXHRcdH1cblx0fSxcblx0aW5pdGlhbGl6ZSA6IGZ1bmN0aW9uKCl7XG5cdFx0XG5cdFx0dGhpcy5jYWxlbmRhclN0b3JlID0ge307XG5cdFx0dGhpcy5saXN0ZW5UbyggY2FsZW5kYXJMb2FkLmV2ZW50cywgXCJldmVudHNMb2FkZWRcIiwgdGhpcy5ldmVudHNMb2FkZWQgKTtcblx0XHRcblx0fSxcblx0b25TaG93IDogZnVuY3Rpb24oKXtcblxuXHRcdHZhciBjb2xvclBpY2tlciA9IHRoaXMudWkuY29sb3JQaWNrZXI7XG5cdFx0dmFyIF90aGlzID0gdGhpcztcblx0XHQkKGNvbG9yUGlja2VyKS5jaGFuZ2UoZnVuY3Rpb24oKXtcblx0XHRcdHZhciB2YWwgPSAkKHRoaXMpLnZhbCgpO1xuXHRcdFx0X3RoaXMudGVzdENvbG9yKCB2YWwgKTtcblx0XHR9KTtcblxuXHRcdHRoaXMuX3NwbGFzaFZpZXcgPSBuZXcgU3BsYXNoVmlldyh7IG1vZGVsIDogbmV3IEJhY2tib25lLk1vZGVsKHsgcm9vbXMgOiB7fSwgcm9vbXNEYXRhIDoge30gfSkgfSkgO1xuXG5cdFx0dGhpcy5nZXRSZWdpb24oXCJzcGxhc2hQYWdlXCIpLnNob3coIHRoaXMuX3NwbGFzaFZpZXcgKTtcblxuXHRcdHRoaXMubGlzdGVuVG8oIEFwcFJvdXRlciwgXCJyb3V0ZTpyb29tUm91dGVcIiwgZnVuY3Rpb24oIGtleSApe1xuXHRcdFx0XG5cdFx0XHR0aGlzLnNob3dSb29tKCBrZXkgKTtcblx0XHR9KTtcblx0XHR0aGlzLmxpc3RlblRvKCBBcHBSb3V0ZXIsIFwicm91dGU6ZGVmYXVsdFJvdXRlXCIsIHRoaXMuc2hvd1NwbGl0ICk7XG5cdH0sXG5cdHNob3dTcGxpdCA6IGZ1bmN0aW9uKCl7XG5cblx0XHR2YXIgJHNwbGl0RWwgPSB0aGlzLmdldFJlZ2lvbiggXCJzcGxhc2hQYWdlXCIgKS4kZWw7XG5cdFx0dmFyICRzaW5nbGVFbCA9IHRoaXMuZ2V0UmVnaW9uKCBcInJvb21TaW5nbGVcIiApLiRlbDtcblxuXHRcdCRzcGxpdEVsLnNob3coKTtcblx0XHQkc2luZ2xlRWwuaGlkZSgpO1xuXHR9LFxuXHRzaG93Um9vbSA6IGZ1bmN0aW9uKCBrZXkgKXtcblxuXHRcdHZhciAkc3BsaXRFbCA9IHRoaXMuZ2V0UmVnaW9uKCBcInNwbGFzaFBhZ2VcIiApLiRlbDtcblx0XHRcblx0XHR2YXIgbW9kZWwgPSB0aGlzLmNhbGVuZGFyU3RvcmVbIGtleSBdO1xuXG5cdFx0aWYoICFtb2RlbCApe1xuXHRcdFx0dGhpcy5xdWV1ZWRLZXkgPSBrZXk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdFxuXHRcdFx0dmFyIHZpZXcgPSBuZXcgQ2FsZW5kYXJTaW5nbGUoeyBtb2RlbCA6IG1vZGVsIH0pXG5cdFx0XHR2YXIgcmVnaW9uID0gdGhpcy5nZXRSZWdpb24oIFwicm9vbVNpbmdsZVwiICkuc2hvdyggdmlldyApO1xuXHRcdFx0JHNpbmdsZUVsID0gcmVnaW9uLiRlbDtcblxuXHRcdFx0JHNpbmdsZUVsLnNob3coKTtcblx0XHRcdCRzcGxpdEVsLmhpZGUoKTtcblx0XHR9XG5cdH0sXG5cdGNoZWNrUXVldWUgOiBmdW5jdGlvbigpe1xuXG5cdFx0aWYoIHRoaXMucXVldWVkS2V5ICl7XG5cdFx0XHR0aGlzLnNob3dSb29tKCB0aGlzLnF1ZXVlZEtleSApO1xuXHRcdH1cblx0fSxcblx0dGVzdENvbG9yIDogZnVuY3Rpb24oIF9jb2xvciApe1xuXG5cdFx0dmFyIGNvbG9yID0gb25lLmNvbG9yKCBfY29sb3IgKTtcblx0XHR2YXIgaHNsID0ge1xuXHRcdFx0aCA6IE1hdGguZmxvb3IoIGNvbG9yLmgoKSAqIDM2MCksIFxuXHRcdFx0cyA6IE1hdGguZmxvb3IoIGNvbG9yLnMoKSAqIDEwMCksXG5cdFx0XHRsIDogTWF0aC5mbG9vciggY29sb3IubCgpICogMTAwKSBcblx0XHR9O1xuXHRcdGh1ZUNvbm5lY3QudXBkYXRlKFtcblx0XHRcdHtcblx0XHRcdFx0J2lkJyA6IDEsXG5cdFx0XHRcdCdkYXRhJyA6IHtcblx0XHRcdFx0XHQnaHNsJyA6IGhzbCxcblx0XHRcdFx0XHQnZHVyYXRpb24nIDogMVxuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHQnaWQnIDogMixcblx0XHRcdFx0J2RhdGEnIDoge1xuXHRcdFx0XHRcdCdoc2wnIDogaHNsLFxuXHRcdFx0XHRcdCdkdXJhdGlvbicgOiAxXG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHR7XG5cdFx0XHRcdCdpZCcgOiAzLFxuXHRcdFx0XHQnZGF0YScgOiB7XG5cdFx0XHRcdFx0J2hzbCcgOiBoc2wsXG5cdFx0XHRcdFx0J2R1cmF0aW9uJyA6IDFcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0J2lkJyA6IDQsXG5cdFx0XHRcdCdkYXRhJyA6IHtcblx0XHRcdFx0XHQnaHNsJyA6IGhzbCxcblx0XHRcdFx0XHQnZHVyYXRpb24nIDogMVxuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHQnaWQnIDogNSxcblx0XHRcdFx0J2RhdGEnIDoge1xuXHRcdFx0XHRcdCdoc2wnIDogaHNsLFxuXHRcdFx0XHRcdCdkdXJhdGlvbicgOiAxXG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRdKTtcdFx0XG5cdH0sXG5cdGV2ZW50c0xvYWRlZCA6IGZ1bmN0aW9uKCBkYXRhICl7XG5cdFx0XG5cdFx0dmFyIGtleSA9IGRhdGEua2V5O1xuXHRcdHZhciBteUNhbGVuZGFyTW9kZWwgPSB0aGlzLmNhbGVuZGFyU3RvcmVbIGtleSBdO1xuXHRcdFxuXHRcdGlmKCAgIW15Q2FsZW5kYXJNb2RlbCApe1xuXG5cdFx0XHRteUNhbGVuZGFyTW9kZWwgPSBuZXcgQ2FsZW5kYXJNb2RlbCh7XG5cdFx0XHRcdGtleSA6IGtleSxcblx0XHRcdFx0ZXZlbnRDb2xsZWN0aW9uIDogbmV3IENhbGVuZGFyQ29sbGVjdGlvbigpXG5cdFx0XHR9KTtcblx0XHRcdHRoaXMuX3NwbGFzaFZpZXcuYWRkUm9vbSggbXlDYWxlbmRhck1vZGVsICk7XG5cdFx0XHR0aGlzLmNhbGVuZGFyU3RvcmVbIGtleSBdID0gbXlDYWxlbmRhck1vZGVsO1xuXHRcdH0gXG5cblx0XHR2YXIgcm9vbURhdGEgPSBkYXRhLmRhdGE7XG5cdFx0dmFyIHVwZGF0ZWQgPSByb29tRGF0YS51cGRhdGVkO1xuXG5cdFx0Y29uc29sZS5sb2codXBkYXRlZCk7XG5cblx0XHRteUNhbGVuZGFyTW9kZWwuc2V0KFwicm9vbURhdGFcIiwgcm9vbURhdGEpO1xuXHRcdG15Q2FsZW5kYXJNb2RlbC5zZXQoXCJ1cGRhdGVkXCIsIHVwZGF0ZWQpO1xuXG5cdFx0dGhpcy5jaGVja1F1ZXVlKCk7XG5cdH0gXG59KTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IENhbGVuZGFyVmlldzsgICAgICAgICAgICAgICAgICAgIFxuICAgIFxuICIsInZhciBTcGxhc2hWaWV3ID0gTWFyaW9uZXR0ZS5MYXlvdXRWaWV3LmV4dGVuZCh7XG5cdGlkIDogXCJyb29tLXNwbGl0XCIsXG5cdHRlbXBsYXRlIDogXy50ZW1wbGF0ZSggcmVxdWlyZShcInRlbXBsYXRlcy9zcGxhc2hXcmFwcGVyLmh0bWxcIikgKSxcblx0aW5pdGlhbGl6ZSA6IGZ1bmN0aW9uKCl7XG5cdFx0XG5cdH0sXG5cdGFkZFJvb20gOiBmdW5jdGlvbiggbW9kZWwgKXtcblx0XHR2YXIgcm9vbXMgPSB0aGlzLm1vZGVsLmdldChcInJvb21zXCIpO1xuXHRcdHJvb21zWyBtb2RlbC5nZXQoXCJrZXlcIikgXSA9IG1vZGVsO1xuXG5cdFx0dGhpcy5saXN0ZW5UbyggbW9kZWwsIFwiY2hhbmdlOmN1cnJlbnRFdmVudFwiLCB0aGlzLnJlbmRlciApO1xuXHRcdHRoaXMucmVuZGVyKCk7XG5cdH0sXG5cdG9uQmVmb3JlUmVuZGVyIDogZnVuY3Rpb24oKXtcblxuXHRcdGNvbnNvbGUubG9nKFwiUkVSRU5ERVIgU1BMQVNIXCIpO1xuXHRcdHZhciByb29tcyA9ICB0aGlzLm1vZGVsLmdldChcInJvb21zXCIpO1xuXHRcdHZhciByb29tc0RhdGEgPSAgdGhpcy5tb2RlbC5nZXQoXCJyb29tc0RhdGFcIik7XG5cdFx0XG5cdFx0Xy5lYWNoKCByb29tcywgZnVuY3Rpb24oIHJvb20sIGtleSApIHtcblx0XHRcdHJvb21zRGF0YVsga2V5IF0gPSByb29tLnRvSlNPTigpO1xuXHRcdH0pO1xuXHR9XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBTcGxhc2hWaWV3OyJdfQ==
