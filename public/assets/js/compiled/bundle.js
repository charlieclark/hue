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







         
},{"controllers/appRouter":3,"roomData":12,"views/appLayout":17,"views/calendarWrapper":20}],2:[function(require,module,exports){
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

},{"pipe":11}],4:[function(require,module,exports){
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

},{"pipe":11,"roomData":12}],5:[function(require,module,exports){
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
},{"pipe":11}],6:[function(require,module,exports){
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
var LightPattern = require("controllers/lightPattern");

function LightPatternController( model ){
	
	this._model = model;
	this.init( );
}

LightPatternController.prototype = {
	init : function(){

		this._model.on( "change:currentEvent", this.currentChanged, this  );
	},
	currentChanged : function( parent, model ){

		this.stopExisting();

		if( !model ) return;

		var type = model.getPatternType();
		var start = model.get("start").raw;
		var end = model.get("end").raw;
		var key = model.get("key");

		this._currentPattern = new LightPattern( key, type, {
			start : start,
			end : end
		});
	},
	stopExisting : function(){

		if( this._currentPattern ){
			this._currentPattern.stopSequence();	
		}
	}
}

module.exports = LightPatternController;
},{"controllers/lightPattern":6}],8:[function(require,module,exports){
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
	},
	getPatternType : function(){

		var type = "occupied";
		return type;
	}
})

module.exports = CalendarItemModel;
},{}],9:[function(require,module,exports){
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
			this.set("currentEventData", current.toJSON());
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
},{"models/calendarItemModel":8}],10:[function(require,module,exports){
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
module.exports = "<h2>summary : <%= summary %></h2>\n\n<h3>description : <%= description %></h3>\n\n<h3>start : <%= start.formatted %></h3>\n\n<h3>end : <%= end.formatted %></h3>";

},{}],14:[function(require,module,exports){
module.exports = "<button id=\"close\">close</button>\n<div id=\"event-list\"></div> ";

},{}],15:[function(require,module,exports){
module.exports = "<div id=\"splash-page\"></div>\n\n<div id=\"room-single\"></div>\n\n<!-- TEST -->\n<div class=\"test\" style=\"position:absolute;top:0;\">\n\t<div>\n\t\t<input id=\"hex-input\" type=\"text\"></input>\n\t\t<button id=\"hex\">hex</button>\n\t</div>\n\t<button id=\"test\">test</button>\n\t<input class=\"color\" type=\"color\" name=\"favcolor\">\n</div>";

},{}],16:[function(require,module,exports){
module.exports = "<% _.each( roomsData, function( data, key ){ %>\n\t<div class=\"room-container\">\n\t\t<section id=\"room-<%= key %>\" class=\"room\" data-id=\"<%= key %>\">\n\t\t\t<div class=\"number\"><%= key %></div>\n\t\t\t<div class=\"graph\"></div>\n\t\t\t<div class=\"person\"><%= data.currentEventData ? data.currentEventData.summary : 'nothing' %></div>\n\t\t</section>\n\t</div>\n<% }); %>";

},{}],17:[function(require,module,exports){
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
},{"models/state":10}],18:[function(require,module,exports){
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
},{"templates/calendarItem.html":13}],19:[function(require,module,exports){
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
},{"controllers/appRouter":3,"templates/calendarSingle.html":14,"views/calendarItem":18}],20:[function(require,module,exports){
var AppRouter 		= require( "controllers/appRouter" );

var calendarLoad = require("controllers/calendarLoad");
var CalendarSingle 	= require("views/calendarSingle");
var CalendarModel 	= require("models/calendarModel");
var CalendarItemModel 	= require("models/calendarItemModel");
var CalendarCollection 	= require("collections/calendarCollection");
var SplashView 	= require("views/splashView");

var hueConnect = require("controllers/hueConnect");
var LightPattern = require("controllers/lightPattern");
var LightPatternController = require("controllers/lightPatternController");

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
			new LightPatternController( myCalendarModel );
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
    
 
},{"collections/calendarCollection":2,"controllers/appRouter":3,"controllers/calendarLoad":4,"controllers/hueConnect":5,"controllers/lightPattern":6,"controllers/lightPatternController":7,"models/calendarItemModel":8,"models/calendarModel":9,"templates/calendarWrapper.html":15,"views/calendarSingle":19,"views/splashView":21}],21:[function(require,module,exports){
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
},{"templates/splashWrapper.html":16}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIuLi9wdWJsaWMvYXNzZXRzL2pzL3VzZXIvYXBwLmpzIiwiLi4vcHVibGljL2Fzc2V0cy9qcy91c2VyL2NvbGxlY3Rpb25zL2NhbGVuZGFyQ29sbGVjdGlvbi5qcyIsIi4uL3B1YmxpYy9hc3NldHMvanMvdXNlci9jb250cm9sbGVycy9hcHBSb3V0ZXIuanMiLCIuLi9wdWJsaWMvYXNzZXRzL2pzL3VzZXIvY29udHJvbGxlcnMvY2FsZW5kYXJMb2FkLmpzIiwiLi4vcHVibGljL2Fzc2V0cy9qcy91c2VyL2NvbnRyb2xsZXJzL2h1ZUNvbm5lY3QuanMiLCIuLi9wdWJsaWMvYXNzZXRzL2pzL3VzZXIvY29udHJvbGxlcnMvbGlnaHRQYXR0ZXJuLmpzIiwiLi4vcHVibGljL2Fzc2V0cy9qcy91c2VyL2NvbnRyb2xsZXJzL2xpZ2h0UGF0dGVybkNvbnRyb2xsZXIuanMiLCIuLi9wdWJsaWMvYXNzZXRzL2pzL3VzZXIvbW9kZWxzL2NhbGVuZGFySXRlbU1vZGVsLmpzIiwiLi4vcHVibGljL2Fzc2V0cy9qcy91c2VyL21vZGVscy9jYWxlbmRhck1vZGVsLmpzIiwiLi4vcHVibGljL2Fzc2V0cy9qcy91c2VyL21vZGVscy9zdGF0ZS5qcyIsIi4uL3B1YmxpYy9hc3NldHMvanMvdXNlci9waXBlLmpzIiwiLi4vcHVibGljL2Fzc2V0cy9qcy91c2VyL3Jvb21EYXRhLmpzIiwiLi4vcHVibGljL2Fzc2V0cy9qcy91c2VyL3RlbXBsYXRlcy9jYWxlbmRhckl0ZW0uaHRtbCIsIi4uL3B1YmxpYy9hc3NldHMvanMvdXNlci90ZW1wbGF0ZXMvY2FsZW5kYXJTaW5nbGUuaHRtbCIsIi4uL3B1YmxpYy9hc3NldHMvanMvdXNlci90ZW1wbGF0ZXMvY2FsZW5kYXJXcmFwcGVyLmh0bWwiLCIuLi9wdWJsaWMvYXNzZXRzL2pzL3VzZXIvdGVtcGxhdGVzL3NwbGFzaFdyYXBwZXIuaHRtbCIsIi4uL3B1YmxpYy9hc3NldHMvanMvdXNlci92aWV3cy9hcHBMYXlvdXQuanMiLCIuLi9wdWJsaWMvYXNzZXRzL2pzL3VzZXIvdmlld3MvY2FsZW5kYXJJdGVtLmpzIiwiLi4vcHVibGljL2Fzc2V0cy9qcy91c2VyL3ZpZXdzL2NhbGVuZGFyU2luZ2xlLmpzIiwiLi4vcHVibGljL2Fzc2V0cy9qcy91c2VyL3ZpZXdzL2NhbGVuZGFyV3JhcHBlci5qcyIsIi4uL3B1YmxpYy9hc3NldHMvanMvdXNlci92aWV3cy9zcGxhc2hWaWV3LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ05BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDYkE7QUFDQTs7QUNEQTtBQUNBOztBQ0RBO0FBQ0E7O0FDREE7QUFDQTs7QUNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNkQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9LQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIndpbmRvdy5Db21tb24gPSB7XG5cdHBhdGggOiB7XG5cdFx0YXNzZXRzIDogXCJhc3NldHMvXCIsXG5cdFx0aW1nIDogXCJhc3NldHMvaW1nL1wiLFxuXHRcdGF1ZGlvIDogXCJhc3NldHMvYXVkaW8vXCJcblx0fSxcblx0c2l6ZXMgOntcblx0XHRmcmFtZSA6IDEwXG5cdH1cbn07XG5cbi8vYmFzZVxudmFyIEFwcFJvdXRlciBcdFx0PSByZXF1aXJlKCBcImNvbnRyb2xsZXJzL2FwcFJvdXRlclwiICk7XG52YXIgQXBwTGF5b3V0IFx0XHQ9IHJlcXVpcmUoIFwidmlld3MvYXBwTGF5b3V0XCIgKTtcblxuLy9jdXN0b21cbnZhciBDYWxlbmRhcldyYXBwZXJcdD0gcmVxdWlyZShcInZpZXdzL2NhbGVuZGFyV3JhcHBlclwiKTtcbnZhciByb29tRGF0YSA9IHJlcXVpcmUoXCJyb29tRGF0YVwiKTtcblxuLy9USEUgQVBQTElDQVRJT05cbnZhciBNeUFwcCA9IE1hcmlvbmV0dGUuQXBwbGljYXRpb24uZXh0ZW5kKHtcblx0aW5pdGlhbGl6ZSA6IGZ1bmN0aW9uKCl7XG5cdFx0XG5cdH0sXG5cdG9uU3RhcnQgOiBmdW5jdGlvbigpe1xuXG5cdFx0QXBwTGF5b3V0LnJlbmRlcigpOyBcblxuXHRcdHZhciBteUNhbGVuZGFyID0gbmV3IENhbGVuZGFyV3JhcHBlciggeyBtb2RlbCA6IG5ldyBCYWNrYm9uZS5Nb2RlbCh7IHJvb21zIDogcm9vbURhdGEgfSkgfSk7XG5cdFx0QXBwTGF5b3V0LmdldFJlZ2lvbihcIm1haW5cIikuc2hvdyggbXlDYWxlbmRhciApO1xuXG5cdFx0QmFja2JvbmUuaGlzdG9yeS5zdGFydCh7XG5cdFx0XHRwdXNoU3RhdGUgOiBmYWxzZVxuXHRcdH0pO1xuXHR9IFxufSk7XG5cblxuXG4kKGZ1bmN0aW9uKCl7XG5cdHdpbmRvdy5hcHAgPSBuZXcgTXlBcHAoKTtcblx0d2luZG93LmFwcC5zdGFydCgpOyBcbn0pO1xuXG5cblxuXG5cblxuXG4gICAgICAgICAiLCJ2YXIgQ2FsZW5kYXJDb2xsZWN0aW9uID0gQmFja2JvbmUuQ29sbGVjdGlvbi5leHRlbmQoe1xuXHRpbml0aWFsaXplIDogZnVuY3Rpb24oKXtcblxuXHR9LFxuXHRjb21wYXJhdG9yIDogZnVuY3Rpb24oIGEsIGIgKXtcblx0XHR2YXIgYVRpbWUgPSBhLmdldChcInN0YXJ0XCIpLnJhdztcblx0XHR2YXIgYlRpbWUgPSBiLmdldChcInN0YXJ0XCIpLnJhdztcblx0XHRyZXR1cm4gYVRpbWUgLSBiVGltZTtcblx0fSxcblx0Z2V0Q3VycmVudCA6IGZ1bmN0aW9uKCl7XG5cblx0XHRyZXR1cm4gdGhpcy5maW5kKGZ1bmN0aW9uKCBtb2RlbCApe1xuXG5cdFx0XHRyZXR1cm4gbW9kZWwuaXNBY3RpdmUoKTtcblx0XHR9KTtcblx0fVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gQ2FsZW5kYXJDb2xsZWN0aW9uOyIsInZhciBwaXBlID0gcmVxdWlyZShcInBpcGVcIik7XG5cbnZhciBNeUFwcFJvdXRlciA9IE1hcmlvbmV0dGUuQXBwUm91dGVyLmV4dGVuZCh7XG5cdGNvbnRyb2xsZXIgOiB7XG5cdFx0J3Jvb21Sb3V0ZScgOiBmdW5jdGlvbigpe30sXG5cdFx0J2RlZmF1bHRSb3V0ZScgOiBmdW5jdGlvbih2YWx1ZSwgcXVlcnlTdHJpbmcpe1xuXHRcdFx0dmFyIHBhcmFtcyA9IHBhcnNlUXVlcnlTdHJpbmcocXVlcnlTdHJpbmcpO1xuXHRcdFx0Xy5lYWNoKCBwYXJhbXMsIGZ1bmN0aW9uKCB2YWx1ZSwga2V5ICl7XG5cdFx0XHRcdHBpcGUudHJpZ2dlcihcInBhcmFtOlwiK2tleSwgdmFsdWUgKVxuXHRcdFx0fSk7XG5cdFx0fVxuXHR9LFxuXHRhcHBSb3V0ZXMgOiB7XG5cdFx0XCJyb29tLzprZXlcIiA6IFwicm9vbVJvdXRlXCIsXG5cdFx0XCIqYWN0aW9uc1wiIDogXCJkZWZhdWx0Um91dGVcIlxuXHR9XG59KTtcblxuZnVuY3Rpb24gcGFyc2VRdWVyeVN0cmluZyhxdWVyeVN0cmluZyl7XG4gICAgdmFyIHBhcmFtcyA9IHt9O1xuICAgIGlmKHF1ZXJ5U3RyaW5nKXtcbiAgICAgICAgXy5lYWNoKFxuICAgICAgICAgICAgXy5tYXAoZGVjb2RlVVJJKHF1ZXJ5U3RyaW5nKS5zcGxpdCgvJi9nKSxmdW5jdGlvbihlbCxpKXtcbiAgICAgICAgICAgICAgICB2YXIgYXV4ID0gZWwuc3BsaXQoJz0nKSwgbyA9IHt9O1xuICAgICAgICAgICAgICAgIGlmKGF1eC5sZW5ndGggPj0gMSl7XG4gICAgICAgICAgICAgICAgICAgIHZhciB2YWwgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgICAgIGlmKGF1eC5sZW5ndGggPT0gMilcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbCA9IGF1eFsxXTtcbiAgICAgICAgICAgICAgICAgICAgb1thdXhbMF1dID0gdmFsO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gbztcbiAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgZnVuY3Rpb24obyl7XG4gICAgICAgICAgICAgICAgXy5leHRlbmQocGFyYW1zLG8pO1xuICAgICAgICAgICAgfVxuICAgICAgICApO1xuICAgIH1cbiAgICByZXR1cm4gcGFyYW1zO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IG5ldyBNeUFwcFJvdXRlcigpO1xuIiwidmFyIHBpcGUgPSByZXF1aXJlKFwicGlwZVwiKTtcblxuLy9saXN0ZW5pbmcgZm9yIGxvYWRcbndpbmRvdy5oYW5kbGVDbGllbnRMb2FkID0gZnVuY3Rpb24oKXtcblxuICBjb25zb2xlLmxvZyhcImdvb2dsZSBhcGkgbG9hZGVkXCIpO1xuICBfLmRlZmVyKCBmdW5jdGlvbigpeyBpbml0KCkgfSk7XG59XG5cbnZhciBjbGllbnRJZCA9ICc0MzM4Mzk3MjMzNjUtdTdncmxkdHZmOHBhYmprajRmcmNpbzNjdjVoaXQ4Zm0uYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20nO1xudmFyIGFwaUtleSA9ICdBSXphU3lCc0tkVHBsUlh1RXdndlBTSF9nR0Y4T0dzdzM1dDE1djAnO1xudmFyIHNjb3BlcyA9ICdodHRwczovL3d3dy5nb29nbGVhcGlzLmNvbS9hdXRoL2NhbGVuZGFyJztcbnZhciByb29tRGF0YSA9IHJlcXVpcmUoXCJyb29tRGF0YVwiKTtcbnZhciBwdWxsSW50ZXJ2YWwgPSAxMDAwICogMTA7XG5cbi8vVE9ETyA6IGludGVncmF0ZSBhbGwgNCBjYWxlbmRhcnNcblxuZnVuY3Rpb24gaW5pdCgpe1xuXHRnYXBpLmNsaWVudC5zZXRBcGlLZXkoYXBpS2V5KTtcblx0Y2hlY2tBdXRoKCk7XG59XG5cbmZ1bmN0aW9uIGNoZWNrQXV0aCgpe1xuXHRnYXBpLmF1dGguYXV0aG9yaXplKCB7XG5cdFx0Y2xpZW50X2lkOiBjbGllbnRJZCwgXG5cdFx0c2NvcGU6IHNjb3BlcywgXG5cdFx0aW1tZWRpYXRlOiBmYWxzZVxuXHR9LCBoYW5kbGVBdXRoUmVzdWx0ICk7XG59XG5cbmZ1bmN0aW9uIGhhbmRsZUF1dGhSZXN1bHQoIGF1dGhSZXN1bHQgKXtcblxuXHRpZihhdXRoUmVzdWx0KXtcblx0XHRtYWtlQXBpQ2FsbCgpO1xuXHR9XG59XG5cbmZ1bmN0aW9uIG1ha2VBcGlDYWxsKCkge1xuICBnYXBpLmNsaWVudC5sb2FkKCdjYWxlbmRhcicsICd2MycsIGZ1bmN0aW9uKCkge1xuICAgICAgXG4gICAgICBwdWxsUm9vbXMoKTtcbiAgICAgIHNldEludGVydmFsKCBwdWxsUm9vbXMsIHB1bGxJbnRlcnZhbCApOyAgICAgICAgICBcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIHB1bGxSb29tcygpe1xuXG4gIHZhciBmcm9tID0gbmV3IERhdGUoKTtcbiAgdmFyIHRvID0gbmV3IERhdGUoKTtcbiAgICAgIHRvLnNldERhdGUoIHRvLmdldERhdGUoKSArIDEgKTtcblxuICBfLmVhY2goIHJvb21EYXRhLCBmdW5jdGlvbiggZGF0YSwga2V5ICl7XG5cbiAgICB2YXIgcmVxdWVzdCA9IGdhcGkuY2xpZW50LmNhbGVuZGFyLmV2ZW50cy5saXN0KHtcbiAgICAgICAgJ2NhbGVuZGFySWQnOiBkYXRhLmNhbGVuZGFySWQsXG4gICAgICAgIHRpbWVNaW4gOiBmcm9tLnRvSVNPU3RyaW5nKCksXG4gICAgICAgIHRpbWVNYXggOiB0by50b0lTT1N0cmluZygpLFxuICAgICAgICBzaW5nbGVFdmVudHMgOiB0cnVlXG4gICAgICB9KTtcblxuICAgICByZXF1ZXN0LnRoZW4oZnVuY3Rpb24ocmVzcG9uc2UpIHtcblxuICAgICAgICAgIHJvb21Mb2FkZWQoIGtleSwgcmVzcG9uc2UucmVzdWx0ICk7XG4gICAgICB9LCBmdW5jdGlvbihyZWFzb24pIHtcblxuICAgICAgICAgIGNvbnNvbGUubG9nKCdFcnJvcjogJyArIHJlYXNvbi5yZXN1bHQuZXJyb3IubWVzc2FnZSk7XG4gICAgICB9KTtcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIHJvb21Mb2FkZWQoIGtleSwgZGF0YSApe1xuXG4gIGV2ZW50cy50cmlnZ2VyKCBcImV2ZW50c0xvYWRlZFwiLCB7IGtleSA6IGtleSwgZGF0YSA6IGRhdGEgfSApO1xufVxuXG52YXIgZXZlbnRzID0gXy5leHRlbmQoe30sIEJhY2tib25lLkV2ZW50cyk7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXG4gIGV2ZW50cyA6IGV2ZW50c1xufTtcbiIsInZhciBteVNvY2tldCA9IG51bGw7XG52YXIgY29ubmVjdGVkID0gZmFsc2U7XG5cbnZhciBwaXBlID0gcmVxdWlyZShcInBpcGVcIik7XG5cbmZ1bmN0aW9uIGluaXQoKXtcblxuXHRwaXBlLm9uKFwicGFyYW06c29ja2V0XCIsIGNvbm5lY3QpXG59XG5cbmZ1bmN0aW9uIGNvbm5lY3QoKXtcblx0XG5cdG15U29ja2V0ID0gaW8uY29ubmVjdCgnLy9sb2NhbGhvc3Q6MzAwMCcpO1xuXHRteVNvY2tldC5vbignY29ubmVjdCcsIGZ1bmN0aW9uKCl7XG5cdFx0Y29ubmVjdGVkID0gdHJ1ZTtcblx0fSk7XHRcbn1cblxuZnVuY3Rpb24gdXBkYXRlKCBkYXRhICl7XG5cblx0aWYoY29ubmVjdGVkKXtcblx0XHRteVNvY2tldC5lbWl0KCAndXBkYXRlX2RhdGEnLCBkYXRhICk7XHRcblx0fVxufVxuXG5pbml0KCk7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXHRpbml0IDogaW5pdCxcblx0dXBkYXRlIDogdXBkYXRlLFxuXHRjb25uZWN0ZWQgOiBjb25uZWN0ZWRcbn0iLCJ2YXIgaHVlQ29ubmVjdCA9IHJlcXVpcmUoXCJjb250cm9sbGVycy9odWVDb25uZWN0XCIpO1xuXG5mdW5jdGlvbiBMaWdodFBhdHRlcm4oIGxpZ2h0SWQsIHBhdHRlcm5JZCApe1xuXG5cdHRoaXMuX2hzbCA9IHtcblx0XHRoIDogMCxcblx0XHRzIDogMCxcblx0XHRsIDogMFxuXHR9XG5cblx0dGhpcy5fbGlnaHRJZCA9IGxpZ2h0SWQ7XG5cdHRoaXMuX3BhdHRlcm5JZCA9IHBhdHRlcm5JZDtcblxuXHR0aGlzLl9zdGVwID0gMDtcblx0dGhpcy5faXRlcmF0aW9uID0gMDtcblx0dGhpcy5fcmVwZWF0ID0gcGF0dGVybnNbIHRoaXMuX3BhdHRlcm5JZCBdLnJlcGVhdDtcblxuXHR0aGlzLl9zZXF1ZW5jZSA9IHRoaXMuc3RhcnRTZXF1ZW5jZSggdGhpcy5fcGF0dGVybklkICk7XG5cblx0dGhpcy5fdGltZW91dCA9IG51bGw7XG59XG5cbkxpZ2h0UGF0dGVybi5wcm90b3R5cGUgPSB7XG5cdHN0YXJ0U2VxdWVuY2UgOiBmdW5jdGlvbiggaWQgKXtcblxuXHRcdHRoaXMuX3NlcXVlbmNlID0gcGF0dGVybnNbIGlkIF0uc2VxdWVuY2U7XG5cblx0XHR0aGlzLnN0b3BTZXF1ZW5jZSgpO1xuXHRcdHRoaXMucGxheVNlcXVlbmNlU3RlcCgwKTtcblxuXHRcdHJldHVybiB0aGlzLl9zZXF1ZW5jZTtcblx0fSxcblx0c3RvcFNlcXVlbmNlIDogZnVuY3Rpb24oKXtcblxuXHRcdHRoaXMuX3N0ZXAgPSAwO1xuXHRcdHRoaXMuX2l0ZXJhdGlvbiA9IDA7XG5cblx0XHR3aW5kb3cuY2xlYXJUaW1lb3V0KCB0aGlzLl90aW1lb3V0ICk7XG5cdH0sXG5cdHBsYXlTZXF1ZW5jZVN0ZXA6IGZ1bmN0aW9uKCBzdGVwICl7XG5cblx0XHR0aGlzLl9zdGVwID0gc3RlcDtcblxuXHRcdHZhciBzZWdtZW50ID0gdGhpcy5fc2VxdWVuY2VbdGhpcy5fc3RlcF07XG5cblx0XHR2YXIgY29sb3IgPSBvbmUuY29sb3IoIHNlZ21lbnQuY29sb3IgKTtcblx0XHR2YXIgZmFkZSA9IHNlZ21lbnQuZmFkZTtcblx0XHR2YXIgd2FpdCA9IHNlZ21lbnQud2FpdDtcblxuXHRcdHZhciBoc2wgPSB7XG5cdFx0XHRoIDogTWF0aC5mbG9vciggY29sb3IuaCgpICogMzYwKSwgXG5cdFx0XHRzIDogTWF0aC5mbG9vciggY29sb3IucygpICogMTAwKSxcblx0XHRcdGwgOiBNYXRoLmZsb29yKCBjb2xvci5sKCkgKiAxMDApIFxuXHRcdH07XG5cblx0XHRodWVDb25uZWN0LnVwZGF0ZShbe1xuXHRcdFx0aWQgOiB0aGlzLl9saWdodElkLFxuXHRcdFx0ZGF0YSA6IHtcblx0XHRcdFx0aHNsIDogaHNsLFxuXHRcdFx0XHRkdXJhdGlvbiA6IGZhZGVcblx0XHRcdH1cblx0XHR9XSk7XG5cblx0XHR3aW5kb3cuY2xlYXJUaW1lb3V0KCB0aGlzLl90aW1lb3V0ICk7XG5cdFx0dGhpcy5fdGltZW91dCA9IHdpbmRvdy5zZXRUaW1lb3V0KCQucHJveHkodGhpcy5uZXh0U2VxdWVuY2VTdGVwLCB0aGlzKSwgd2FpdCoxMDAwKTtcblx0fSxcblx0bmV4dFNlcXVlbmNlU3RlcDogZnVuY3Rpb24oKXtcblxuXHRcdHZhciB0b3RhbFN0ZXBzID0gdGhpcy5fc2VxdWVuY2UubGVuZ3RoO1xuXHRcdHZhciByZXBlYXQgPSB0aGlzLl9yZXBlYXQ7XG5cblx0XHR0aGlzLl9zdGVwICsrO1xuXHRcdGlmKHRoaXMuX3N0ZXAgPiB0b3RhbFN0ZXBzIC0gMSkge1xuXHRcdFx0dGhpcy5fc3RlcCA9IDA7XG5cdFx0XHR0aGlzLl9pdGVyYXRpb24gKys7XG5cdFx0fVxuXG5cdFx0aWYocmVwZWF0ID4gLTEgJiYgdGhpcy5faXRlcmF0aW9uID4gcmVwZWF0KSB7XG5cdFx0XHR0aGlzLnN0b3BTZXF1ZW5jZSgpO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdHRoaXMucGxheVNlcXVlbmNlU3RlcCggdGhpcy5fc3RlcCApO1xuXHR9XG59XG5cbnZhciBwYXR0ZXJucyA9IHtcblx0J3Rlc3QnIDoge1xuXHRcdHJlcGVhdCA6ICAtMSxcblx0XHRzZXF1ZW5jZSA6IFtcblx0XHRcdHsgY29sb3IgOiBcIiNGQjE5MTFcIiwgZmFkZSA6IDEsIHdhaXQgOiAxIH0sXG5cdFx0XHR7IGNvbG9yIDogXCIjMDBmZjAwXCIsIGZhZGUgOiAxLCB3YWl0IDogMSB9LFxuXHRcdFx0eyBjb2xvciA6IFwiIzQxNTZGRlwiLCBmYWRlIDogMSwgd2FpdCA6IDEgfSxcblx0XHRcdHsgY29sb3IgOiBcIiNGRjAwMURcIiwgZmFkZSA6IDEsIHdhaXQgOiAxIH0sXG5cdFx0XHR7IGNvbG9yIDogXCIjRkZGRjA3XCIsIGZhZGUgOiAxLCB3YWl0IDogMSB9LFxuXHRcdF1cblx0fVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IExpZ2h0UGF0dGVybjsiLCJ2YXIgTGlnaHRQYXR0ZXJuID0gcmVxdWlyZShcImNvbnRyb2xsZXJzL2xpZ2h0UGF0dGVyblwiKTtcblxuZnVuY3Rpb24gTGlnaHRQYXR0ZXJuQ29udHJvbGxlciggbW9kZWwgKXtcblx0XG5cdHRoaXMuX21vZGVsID0gbW9kZWw7XG5cdHRoaXMuaW5pdCggKTtcbn1cblxuTGlnaHRQYXR0ZXJuQ29udHJvbGxlci5wcm90b3R5cGUgPSB7XG5cdGluaXQgOiBmdW5jdGlvbigpe1xuXG5cdFx0dGhpcy5fbW9kZWwub24oIFwiY2hhbmdlOmN1cnJlbnRFdmVudFwiLCB0aGlzLmN1cnJlbnRDaGFuZ2VkLCB0aGlzICApO1xuXHR9LFxuXHRjdXJyZW50Q2hhbmdlZCA6IGZ1bmN0aW9uKCBwYXJlbnQsIG1vZGVsICl7XG5cblx0XHR0aGlzLnN0b3BFeGlzdGluZygpO1xuXG5cdFx0aWYoICFtb2RlbCApIHJldHVybjtcblxuXHRcdHZhciB0eXBlID0gbW9kZWwuZ2V0UGF0dGVyblR5cGUoKTtcblx0XHR2YXIgc3RhcnQgPSBtb2RlbC5nZXQoXCJzdGFydFwiKS5yYXc7XG5cdFx0dmFyIGVuZCA9IG1vZGVsLmdldChcImVuZFwiKS5yYXc7XG5cdFx0dmFyIGtleSA9IG1vZGVsLmdldChcImtleVwiKTtcblxuXHRcdHRoaXMuX2N1cnJlbnRQYXR0ZXJuID0gbmV3IExpZ2h0UGF0dGVybigga2V5LCB0eXBlLCB7XG5cdFx0XHRzdGFydCA6IHN0YXJ0LFxuXHRcdFx0ZW5kIDogZW5kXG5cdFx0fSk7XG5cdH0sXG5cdHN0b3BFeGlzdGluZyA6IGZ1bmN0aW9uKCl7XG5cblx0XHRpZiggdGhpcy5fY3VycmVudFBhdHRlcm4gKXtcblx0XHRcdHRoaXMuX2N1cnJlbnRQYXR0ZXJuLnN0b3BTZXF1ZW5jZSgpO1x0XG5cdFx0fVxuXHR9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gTGlnaHRQYXR0ZXJuQ29udHJvbGxlcjsiLCJ2YXIgQ2FsZW5kYXJJdGVtTW9kZWwgPSBCYWNrYm9uZS5Nb2RlbC5leHRlbmQoe1xuXHRkZWZhdWx0cyA6IHtcblx0XHRzdW1tYXJ5IDogXCJuL2FcIixcblx0XHRkZXNjcmlwdGlvbiA6IFwibi9hXCIsXG5cdFx0c3RhcnQgOiBcIm4vYVwiLFxuXHRcdGVuZCA6IFwibi9hXCIsXG5cdH0sXG5cdGluaXRpYWxpemUgOiBmdW5jdGlvbigpe1xuXG5cdFx0dGhpcy5jb252ZXJ0RGF0ZShcInN0YXJ0XCIpO1xuXHRcdHRoaXMuY29udmVydERhdGUoXCJlbmRcIik7XG5cdH0sXG5cdGNvbnZlcnREYXRlIDogZnVuY3Rpb24oIGtleSApe1xuXHRcdC8vY29udmVydCBkYXRhc1xuXHRcdHZhciBkYXRlU3RyaW5nID0gdGhpcy5nZXQoIGtleSApXG5cdFx0aWYoIWRhdGVTdHJpbmcpIHJldHVybjtcblx0XHRcblx0XHRkYXRlU3RyaW5nID0gZGF0ZVN0cmluZy5kYXRlVGltZTtcblx0XHR2YXIgbm93ID0gbmV3IERhdGUoKTtcblx0XHR2YXIgZGF0ZSA9IG5ldyBEYXRlKCBkYXRlU3RyaW5nICk7XG5cblx0XHR0aGlzLnNldCgga2V5LCB7XG5cdFx0XHRyYXcgOiBkYXRlLFxuXHRcdFx0Zm9ybWF0dGVkIDogZGF0ZS50b1N0cmluZygpXG5cdFx0fSk7XG5cdH0sXG5cdGlzQWN0aXZlIDogZnVuY3Rpb24oKXtcblx0XHRcblx0XHQgdmFyIHN0YXJ0ID0gdGhpcy5nZXQoXCJzdGFydFwiKS5yYXc7XG5cdFx0IHZhciBlbmQgPSB0aGlzLmdldChcImVuZFwiKS5yYXc7XG5cdFx0IHZhciBub3cgPSBuZXcgRGF0ZSgpO1xuXG5cdFx0IGlmKCBub3cgPiBzdGFydCAmJiBub3cgPCBlbmQgKXtcblx0XHQgXHRyZXR1cm4gdHJ1ZTtcblx0XHQgfVxuXG5cdFx0IHJldHVybiBmYWxzZTtcblx0fSxcblx0Z2V0UGF0dGVyblR5cGUgOiBmdW5jdGlvbigpe1xuXG5cdFx0dmFyIHR5cGUgPSBcIm9jY3VwaWVkXCI7XG5cdFx0cmV0dXJuIHR5cGU7XG5cdH1cbn0pXG5cbm1vZHVsZS5leHBvcnRzID0gQ2FsZW5kYXJJdGVtTW9kZWw7IiwidmFyIENhbGVuZGFySXRlbU1vZGVsIFx0PSByZXF1aXJlKFwibW9kZWxzL2NhbGVuZGFySXRlbU1vZGVsXCIpO1xuXG52YXIgQ2FsZW5kYXJNb2RlbCA9IEJhY2tib25lLk1vZGVsLmV4dGVuZCh7XG5cdGRlZmF1bHRzIDoge1xuXHRcdG9yZ2FuaXplciA6IFwiV2VzXCJcblx0fSxcblx0aW5pdGlhbGl6ZSA6IGZ1bmN0aW9uKCl7XG5cblx0XHRfLmJpbmRBbGwoIHRoaXMsIFwiZ2V0Q3VycmVudFwiICk7XG5cblx0XHR0aGlzLmxpc3RlblRvKCB0aGlzLCBcImNoYW5nZTp1cGRhdGVkXCIsIHRoaXMudXBkYXRlRXZlbnRzICk7XG5cdFx0dGhpcy5saXN0ZW5UbyggdGhpcywgXCJjaGFuZ2U6dXBkYXRlZFwiLCB0aGlzLmdldEN1cnJlbnQgKTtcblxuXHRcdHNldEludGVydmFsKCB0aGlzLmdldEN1cnJlbnQsIDEwMDAgKTtcblx0fSxcblx0Z2V0Q3VycmVudCA6IGZ1bmN0aW9uKCl7XG5cblx0XHR2YXIgZXZlbnRDb2xsZWN0aW9uID0gdGhpcy5nZXQoXCJldmVudENvbGxlY3Rpb25cIik7XG5cblx0XHQvL2dldHRpbmcgY3VycmVudCBldmVudFxuXHRcdHZhciBjdXJyZW50ID0gZXZlbnRDb2xsZWN0aW9uLmdldEN1cnJlbnQoKTtcblx0XHRcblx0XHRpZiggY3VycmVudCApe1xuXHRcdFx0dGhpcy5zZXQoXCJjdXJyZW50RXZlbnREYXRhXCIsIGN1cnJlbnQudG9KU09OKCkpO1xuXHRcdH1cblxuXHRcdHRoaXMuc2V0KFwiY3VycmVudEV2ZW50XCIsIGN1cnJlbnQgKTtcdFxuXHR9LFxuXHR1cGRhdGVFdmVudHMgOiBmdW5jdGlvbigpe1xuXG5cdFx0dmFyIGV2ZW50Q29sbGVjdGlvbiA9IHRoaXMuZ2V0KFwiZXZlbnRDb2xsZWN0aW9uXCIpO1xuXG5cdFx0dmFyIHJvb21EYXRhID0gdGhpcy5nZXQoXCJyb29tRGF0YVwiKTtcblx0XHR2YXIgbmV3TW9kZWxzID0gW107XG5cblx0XHRpZiggIXJvb21EYXRhICkgcmV0dXJuO1xuXG5cdFx0Xy5lYWNoKCByb29tRGF0YS5pdGVtcywgZnVuY3Rpb24oIGl0ZW0gKXtcblxuXHRcdFx0dmFyIG0gPSBuZXcgQ2FsZW5kYXJJdGVtTW9kZWwoIGl0ZW0gKTtcblx0XHRcdG0uc2V0KFwia2V5XCIsIHRoaXMuZ2V0KFwia2V5XCIpKTtcblx0XHRcdG5ld01vZGVscy5wdXNoKCBtICk7XG5cdFx0fSwgdGhpcyk7XG5cblx0XHRldmVudENvbGxlY3Rpb24ucmVzZXQoIG5ld01vZGVscyApO1xuXHR9XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBDYWxlbmRhck1vZGVsOyIsInZhciBzdGF0ZSA9IG5ldyAoQmFja2JvbmUuTW9kZWwuZXh0ZW5kKHtcblx0ZGVmYXVsdHMgOiB7XG5cdFx0Ly8gXCJuYXZfb3BlblwiIFx0XHQ6IGZhbHNlLFxuXHRcdC8vICdzY3JvbGxfYXRfdG9wJyA6IHRydWUsXG5cdFx0Ly8gJ21pbmltYWxfbmF2JyBcdDogZmFsc2UsXG5cdFx0Ly8gJ2Z1bGxfbmF2X29wZW4nXHQ6IGZhbHNlLFxuXHRcdC8vICd1aV9kaXNwbGF5J1x0OiBmYWxzZVxuXHR9XG59KSkoKTtcblxubW9kdWxlLmV4cG9ydHMgPSBzdGF0ZTtcbiIsInZhciBwaXBlID0gXy5leHRlbmQoe1xuXG5cdFxuXHRcbn0sIEJhY2tib25lLkV2ZW50cyk7XG5cbm1vZHVsZS5leHBvcnRzID0gcGlwZTsiLCJtb2R1bGUuZXhwb3J0cyA9IHtcblx0JzEnOiB7XG5cdFx0J2NhbGVuZGFySWQnIDogXCJiLXJlZWwuY29tXzJkMzIzODM3MzkzNjM2MzIzMjM3MzgzMUByZXNvdXJjZS5jYWxlbmRhci5nb29nbGUuY29tXCJcblx0fSxcblx0JzInOiB7XG5cdFx0J2NhbGVuZGFySWQnIDogXCJiLXJlZWwuY29tXzJkMzEzMjM3MzczODM4MzMzNDJkMzIzNDMyQHJlc291cmNlLmNhbGVuZGFyLmdvb2dsZS5jb21cIlxuXHR9LFxuXHQnMyc6IHtcblx0XHQnY2FsZW5kYXJJZCcgOiBcImItcmVlbC5jb21fMzEzNjM1MzMzOTM2MzEzOTM5MzMzOEByZXNvdXJjZS5jYWxlbmRhci5nb29nbGUuY29tXCJcblx0fSxcblx0JzUnOiB7XG5cdFx0J2NhbGVuZGFySWQnIDogXCJiLXJlZWwuY29tXzJkMzQzNDMyMzgzOTM2MzczMDJkMzYzNDMzQHJlc291cmNlLmNhbGVuZGFyLmdvb2dsZS5jb21cIlxuXHR9XG59OyIsIm1vZHVsZS5leHBvcnRzID0gXCI8aDI+c3VtbWFyeSA6IDwlPSBzdW1tYXJ5ICU+PC9oMj5cXG5cXG48aDM+ZGVzY3JpcHRpb24gOiA8JT0gZGVzY3JpcHRpb24gJT48L2gzPlxcblxcbjxoMz5zdGFydCA6IDwlPSBzdGFydC5mb3JtYXR0ZWQgJT48L2gzPlxcblxcbjxoMz5lbmQgOiA8JT0gZW5kLmZvcm1hdHRlZCAlPjwvaDM+XCI7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IFwiPGJ1dHRvbiBpZD1cXFwiY2xvc2VcXFwiPmNsb3NlPC9idXR0b24+XFxuPGRpdiBpZD1cXFwiZXZlbnQtbGlzdFxcXCI+PC9kaXY+IFwiO1xuIiwibW9kdWxlLmV4cG9ydHMgPSBcIjxkaXYgaWQ9XFxcInNwbGFzaC1wYWdlXFxcIj48L2Rpdj5cXG5cXG48ZGl2IGlkPVxcXCJyb29tLXNpbmdsZVxcXCI+PC9kaXY+XFxuXFxuPCEtLSBURVNUIC0tPlxcbjxkaXYgY2xhc3M9XFxcInRlc3RcXFwiIHN0eWxlPVxcXCJwb3NpdGlvbjphYnNvbHV0ZTt0b3A6MDtcXFwiPlxcblxcdDxkaXY+XFxuXFx0XFx0PGlucHV0IGlkPVxcXCJoZXgtaW5wdXRcXFwiIHR5cGU9XFxcInRleHRcXFwiPjwvaW5wdXQ+XFxuXFx0XFx0PGJ1dHRvbiBpZD1cXFwiaGV4XFxcIj5oZXg8L2J1dHRvbj5cXG5cXHQ8L2Rpdj5cXG5cXHQ8YnV0dG9uIGlkPVxcXCJ0ZXN0XFxcIj50ZXN0PC9idXR0b24+XFxuXFx0PGlucHV0IGNsYXNzPVxcXCJjb2xvclxcXCIgdHlwZT1cXFwiY29sb3JcXFwiIG5hbWU9XFxcImZhdmNvbG9yXFxcIj5cXG48L2Rpdj5cIjtcbiIsIm1vZHVsZS5leHBvcnRzID0gXCI8JSBfLmVhY2goIHJvb21zRGF0YSwgZnVuY3Rpb24oIGRhdGEsIGtleSApeyAlPlxcblxcdDxkaXYgY2xhc3M9XFxcInJvb20tY29udGFpbmVyXFxcIj5cXG5cXHRcXHQ8c2VjdGlvbiBpZD1cXFwicm9vbS08JT0ga2V5ICU+XFxcIiBjbGFzcz1cXFwicm9vbVxcXCIgZGF0YS1pZD1cXFwiPCU9IGtleSAlPlxcXCI+XFxuXFx0XFx0XFx0PGRpdiBjbGFzcz1cXFwibnVtYmVyXFxcIj48JT0ga2V5ICU+PC9kaXY+XFxuXFx0XFx0XFx0PGRpdiBjbGFzcz1cXFwiZ3JhcGhcXFwiPjwvZGl2PlxcblxcdFxcdFxcdDxkaXYgY2xhc3M9XFxcInBlcnNvblxcXCI+PCU9IGRhdGEuY3VycmVudEV2ZW50RGF0YSA/IGRhdGEuY3VycmVudEV2ZW50RGF0YS5zdW1tYXJ5IDogJ25vdGhpbmcnICU+PC9kaXY+XFxuXFx0XFx0PC9zZWN0aW9uPlxcblxcdDwvZGl2PlxcbjwlIH0pOyAlPlwiO1xuIiwidmFyIFN0YXRlIFx0XHQ9IHJlcXVpcmUoXCJtb2RlbHMvc3RhdGVcIik7XG5cbnZhciBNeUFwcExheW91dCA9IE1hcmlvbmV0dGUuTGF5b3V0Vmlldy5leHRlbmQoe1xuXHRlbCA6IFwiI2NvbnRlbnRcIixcblx0dGVtcGxhdGUgOiBmYWxzZSxcblx0cmVnaW9ucyA6IHtcblx0XHRtYWluIDogXCIjbWFpblwiXG5cdH0sIFxuXHRpbml0aWFsaXplIDogZnVuY3Rpb24oKXtcblx0XHR2YXIgX3RoaXMgPSB0aGlzO1xuXG5cdFx0Ly93cmFwcGluZyBodG1sXG5cdFx0dGhpcy4kaHRtbCA9ICQoXCJodG1sXCIpO1xuXHRcdHRoaXMuJGh0bWwucmVtb3ZlQ2xhc3MoXCJoaWRkZW5cIik7XG5cblx0XHQvL3Jlc2l6ZSBldmVudHNcblx0XHQkKHdpbmRvdykucmVzaXplKGZ1bmN0aW9uKCl7XG5cdFx0XHRfdGhpcy5vblJlc2l6ZVdpbmRvdygpO1xuXHRcdH0pLnJlc2l6ZSgpO1xuXG5cdFx0dGhpcy5saXN0ZW5Gb3JTdGF0ZSgpO1xuXHR9LFxuXHRsaXN0ZW5Gb3JTdGF0ZSA6IGZ1bmN0aW9uKCl7XG5cdFx0Ly9zdGF0ZSBjaGFuZ2Vcblx0XHR0aGlzLmxpc3RlblRvKCBTdGF0ZSwgXCJjaGFuZ2VcIiwgZnVuY3Rpb24oIGUgKXtcblxuXHRcdFx0dGhpcy5vblN0YXRlQ2hhbmdlKCBlLmNoYW5nZWQsIGUuX3ByZXZpb3VzQXR0cmlidXRlcyApO1xuXHRcdH0sIHRoaXMpO1xuXHRcdHRoaXMub25TdGF0ZUNoYW5nZSggU3RhdGUudG9KU09OKCkgKTtcblx0fSxcblx0b25TdGF0ZUNoYW5nZSA6IGZ1bmN0aW9uKCBjaGFuZ2VkLCBwcmV2aW91cyApe1xuXG5cdFx0Xy5lYWNoKCBjaGFuZ2VkLCBmdW5jdGlvbih2YWx1ZSwga2V5KXtcblx0XHRcdFxuXHRcdFx0aWYoIF8uaXNCb29sZWFuKCB2YWx1ZSApICl7XG5cdFx0XHRcdHRoaXMuJGh0bWwudG9nZ2xlQ2xhc3MoXCJzdGF0ZS1cIitrZXksIHZhbHVlKTtcblx0XHRcdFx0dGhpcy4kaHRtbC50b2dnbGVDbGFzcyhcInN0YXRlLW5vdC1cIitrZXksICF2YWx1ZSk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR2YXIgcHJldlZhbHVlID0gcHJldmlvdXNbIGtleSBdO1xuXHRcdFx0XHRpZihwcmV2VmFsdWUpe1xuXHRcdFx0XHRcdHRoaXMuJGh0bWwudG9nZ2xlQ2xhc3MoXCJzdGF0ZS1cIitrZXkrXCItXCIrcHJldlZhbHVlLCBmYWxzZSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0dGhpcy4kaHRtbC50b2dnbGVDbGFzcyhcInN0YXRlLVwiK2tleStcIi1cIit2YWx1ZSwgdHJ1ZSk7XG5cdFx0XHR9XG5cblx0XHR9LCB0aGlzICk7XG5cdH0sXG5cdG9uUmVzaXplV2luZG93IDogZnVuY3Rpb24oKXtcblx0XHRDb21tb24ud3cgPSAkKHdpbmRvdykud2lkdGgoKTtcblx0XHRDb21tb24ud2ggPSAkKHdpbmRvdykuaGVpZ2h0KCk7XG5cdH1cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IG5ldyBNeUFwcExheW91dCgpOyIsInZhciBDYWxlbmRhckl0ZW0gPSBNYXJpb25ldHRlLkl0ZW1WaWV3LmV4dGVuZCh7XG5cdGNsYXNzTmFtZSA6IFwiaXRlbVwiLFxuXHR0ZW1wbGF0ZSA6IF8udGVtcGxhdGUoIHJlcXVpcmUoXCJ0ZW1wbGF0ZXMvY2FsZW5kYXJJdGVtLmh0bWxcIikgKSxcblx0dWkgOiB7XG5cdFx0J3RpdGxlJyA6IFwiaDJcIlxuXHR9LFxuXHRldmVudHMgOiB7XG5cdFx0J2NsaWNrIEB1aS50aXRsZScgOiBmdW5jdGlvbigpe1xuXG5cblx0XHR9XG5cdH1cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IENhbGVuZGFySXRlbTsiLCJ2YXIgQ2FsZW5kYXJJdGVtIFx0PSByZXF1aXJlKFwidmlld3MvY2FsZW5kYXJJdGVtXCIpO1xudmFyIEFwcFJvdXRlciBcdFx0PSByZXF1aXJlKCBcImNvbnRyb2xsZXJzL2FwcFJvdXRlclwiICk7XG5cbnZhciBDYWxlbmRhclNpbmdsZSA9IE1hcmlvbmV0dGUuTGF5b3V0Vmlldy5leHRlbmQoe1xuXHR0ZW1wbGF0ZSA6IF8udGVtcGxhdGUoIHJlcXVpcmUoXCJ0ZW1wbGF0ZXMvY2FsZW5kYXJTaW5nbGUuaHRtbFwiKSApLFxuXHRyZWdpb25zIDoge1xuXHRcdGV2ZW50TGlzdCA6IFwiI2V2ZW50LWxpc3RcIlxuXHR9LFxuXHR1aSA6IHtcblx0XHRjbG9zZUJ1dHRvbiA6IFwiI2Nsb3NlXCJcblx0fSxcblx0ZXZlbnRzIDoge1xuXHRcdCdjbGljayBAdWkuY2xvc2VCdXR0b24nIDogXCJvbkNsb3NlXCJcblx0fSxcblx0aW5pdGlhbGl6ZSA6IGZ1bmN0aW9uKCl7XG5cblx0XHR0aGlzLmNvbGxlY3Rpb25WaWV3ID0gbmV3IE1hcmlvbmV0dGUuQ29sbGVjdGlvblZpZXcoe1xuXHRcdFx0Y2hpbGRWaWV3IDogQ2FsZW5kYXJJdGVtLFxuXHRcdFx0Y29sbGVjdGlvbiA6IHRoaXMubW9kZWwuZ2V0KFwiZXZlbnRDb2xsZWN0aW9uXCIpXG5cdFx0fSk7XG5cblx0XHRcblx0fSxcblx0b25TaG93IDogZnVuY3Rpb24oKXtcblxuXHRcdHRoaXMuZ2V0UmVnaW9uKCBcImV2ZW50TGlzdFwiICkuc2hvdyggdGhpcy5jb2xsZWN0aW9uVmlldyApO1xuXHRcdFxuXHR9LFxuXHRvbkNsb3NlIDogZnVuY3Rpb24oKXtcblxuXHRcdEFwcFJvdXRlci5uYXZpZ2F0ZShcIi9cIiwge3RyaWdnZXI6IHRydWV9KTtcblx0fVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gQ2FsZW5kYXJTaW5nbGU7IiwidmFyIEFwcFJvdXRlciBcdFx0PSByZXF1aXJlKCBcImNvbnRyb2xsZXJzL2FwcFJvdXRlclwiICk7XG5cbnZhciBjYWxlbmRhckxvYWQgPSByZXF1aXJlKFwiY29udHJvbGxlcnMvY2FsZW5kYXJMb2FkXCIpO1xudmFyIENhbGVuZGFyU2luZ2xlIFx0PSByZXF1aXJlKFwidmlld3MvY2FsZW5kYXJTaW5nbGVcIik7XG52YXIgQ2FsZW5kYXJNb2RlbCBcdD0gcmVxdWlyZShcIm1vZGVscy9jYWxlbmRhck1vZGVsXCIpO1xudmFyIENhbGVuZGFySXRlbU1vZGVsIFx0PSByZXF1aXJlKFwibW9kZWxzL2NhbGVuZGFySXRlbU1vZGVsXCIpO1xudmFyIENhbGVuZGFyQ29sbGVjdGlvbiBcdD0gcmVxdWlyZShcImNvbGxlY3Rpb25zL2NhbGVuZGFyQ29sbGVjdGlvblwiKTtcbnZhciBTcGxhc2hWaWV3IFx0PSByZXF1aXJlKFwidmlld3Mvc3BsYXNoVmlld1wiKTtcblxudmFyIGh1ZUNvbm5lY3QgPSByZXF1aXJlKFwiY29udHJvbGxlcnMvaHVlQ29ubmVjdFwiKTtcbnZhciBMaWdodFBhdHRlcm4gPSByZXF1aXJlKFwiY29udHJvbGxlcnMvbGlnaHRQYXR0ZXJuXCIpO1xudmFyIExpZ2h0UGF0dGVybkNvbnRyb2xsZXIgPSByZXF1aXJlKFwiY29udHJvbGxlcnMvbGlnaHRQYXR0ZXJuQ29udHJvbGxlclwiKTtcblxudmFyIENhbGVuZGFyVmlldyA9IE1hcmlvbmV0dGUuTGF5b3V0Vmlldy5leHRlbmQoe1xuXHR0ZW1wbGF0ZSA6IF8udGVtcGxhdGUoIHJlcXVpcmUoXCJ0ZW1wbGF0ZXMvY2FsZW5kYXJXcmFwcGVyLmh0bWxcIikgKSxcblx0cmVnaW9ucyA6IHtcblx0XHRyb29tU2luZ2xlIDogXCIjcm9vbS1zaW5nbGVcIixcblx0XHRzcGxhc2hQYWdlIDogXCIjc3BsYXNoLXBhZ2VcIlxuXHR9LFxuXHR1aSA6IHtcblx0XHRjb2xvclBpY2tlciA6IFwiLmNvbG9yXCIsXG5cdFx0dGVzdCA6IFwiI3Rlc3RcIixcblx0XHRoZXhCdXR0b24gOiBcIiNoZXhcIixcblx0XHRoZXhJbnB1dCA6IFwiI2hleC1pbnB1dFwiLFxuXHRcdHJvb20gOiBcIi5yb29tXCJcblx0fSxcblx0ZXZlbnRzIDoge1xuXHRcdFwiY2xpY2sgQHVpLnRlc3RcIiA6IGZ1bmN0aW9uKCl7XG5cdFx0XHRmb3IoIHZhciBpID0gMCA7IGkgPCA1IDsgaSsrICl7XG5cdFx0XHRcdG5ldyBMaWdodFBhdHRlcm4oaSsxLCBcInRlc3RcIik7XG5cdFx0XHR9XG5cdFx0fSxcblx0XHRcImNsaWNrIEB1aS5oZXhCdXR0b25cIiA6IGZ1bmN0aW9uKCl7XG5cdFx0XHR2YXIgY29sb3IgPSB0aGlzLnVpLmhleElucHV0LnZhbCgpO1xuXHRcdFx0dGhpcy50ZXN0Q29sb3IoIGNvbG9yICk7XG5cdFx0fSxcblx0XHRcImNsaWNrIEB1aS5yb29tXCIgOiBmdW5jdGlvbiggZSApe1xuXHRcdFx0dmFyIGtleSA9ICQoIGUuY3VycmVudFRhcmdldCApLmRhdGEoXCJpZFwiKTtcblx0XHRcdEFwcFJvdXRlci5uYXZpZ2F0ZShcInJvb20vXCIra2V5LCB7dHJpZ2dlcjogdHJ1ZX0pO1xuXHRcdH1cblx0fSxcblx0aW5pdGlhbGl6ZSA6IGZ1bmN0aW9uKCl7XG5cdFx0XG5cdFx0dGhpcy5jYWxlbmRhclN0b3JlID0ge307XG5cdFx0dGhpcy5saXN0ZW5UbyggY2FsZW5kYXJMb2FkLmV2ZW50cywgXCJldmVudHNMb2FkZWRcIiwgdGhpcy5ldmVudHNMb2FkZWQgKTtcblx0XHRcblx0fSxcblx0b25TaG93IDogZnVuY3Rpb24oKXtcblxuXHRcdHZhciBjb2xvclBpY2tlciA9IHRoaXMudWkuY29sb3JQaWNrZXI7XG5cdFx0dmFyIF90aGlzID0gdGhpcztcblx0XHQkKGNvbG9yUGlja2VyKS5jaGFuZ2UoZnVuY3Rpb24oKXtcblx0XHRcdHZhciB2YWwgPSAkKHRoaXMpLnZhbCgpO1xuXHRcdFx0X3RoaXMudGVzdENvbG9yKCB2YWwgKTtcblx0XHR9KTtcblxuXHRcdHRoaXMuX3NwbGFzaFZpZXcgPSBuZXcgU3BsYXNoVmlldyh7IG1vZGVsIDogbmV3IEJhY2tib25lLk1vZGVsKHsgcm9vbXMgOiB7fSwgcm9vbXNEYXRhIDoge30gfSkgfSkgO1xuXG5cdFx0dGhpcy5nZXRSZWdpb24oXCJzcGxhc2hQYWdlXCIpLnNob3coIHRoaXMuX3NwbGFzaFZpZXcgKTtcblxuXHRcdHRoaXMubGlzdGVuVG8oIEFwcFJvdXRlciwgXCJyb3V0ZTpyb29tUm91dGVcIiwgZnVuY3Rpb24oIGtleSApe1xuXHRcdFx0XG5cdFx0XHR0aGlzLnNob3dSb29tKCBrZXkgKTtcblx0XHR9KTtcblx0XHR0aGlzLmxpc3RlblRvKCBBcHBSb3V0ZXIsIFwicm91dGU6ZGVmYXVsdFJvdXRlXCIsIHRoaXMuc2hvd1NwbGl0ICk7XG5cdH0sXG5cdHNob3dTcGxpdCA6IGZ1bmN0aW9uKCl7XG5cblx0XHR2YXIgJHNwbGl0RWwgPSB0aGlzLmdldFJlZ2lvbiggXCJzcGxhc2hQYWdlXCIgKS4kZWw7XG5cdFx0dmFyICRzaW5nbGVFbCA9IHRoaXMuZ2V0UmVnaW9uKCBcInJvb21TaW5nbGVcIiApLiRlbDtcblxuXHRcdCRzcGxpdEVsLnNob3coKTtcblx0XHQkc2luZ2xlRWwuaGlkZSgpO1xuXHR9LFxuXHRzaG93Um9vbSA6IGZ1bmN0aW9uKCBrZXkgKXtcblxuXHRcdHZhciAkc3BsaXRFbCA9IHRoaXMuZ2V0UmVnaW9uKCBcInNwbGFzaFBhZ2VcIiApLiRlbDtcblx0XHRcblx0XHR2YXIgbW9kZWwgPSB0aGlzLmNhbGVuZGFyU3RvcmVbIGtleSBdO1xuXG5cdFx0aWYoICFtb2RlbCApe1xuXHRcdFx0dGhpcy5xdWV1ZWRLZXkgPSBrZXk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdFxuXHRcdFx0dmFyIHZpZXcgPSBuZXcgQ2FsZW5kYXJTaW5nbGUoeyBtb2RlbCA6IG1vZGVsIH0pXG5cdFx0XHR2YXIgcmVnaW9uID0gdGhpcy5nZXRSZWdpb24oIFwicm9vbVNpbmdsZVwiICkuc2hvdyggdmlldyApO1xuXHRcdFx0JHNpbmdsZUVsID0gcmVnaW9uLiRlbDtcblxuXHRcdFx0JHNpbmdsZUVsLnNob3coKTtcblx0XHRcdCRzcGxpdEVsLmhpZGUoKTtcblx0XHR9XG5cdH0sXG5cdGNoZWNrUXVldWUgOiBmdW5jdGlvbigpe1xuXG5cdFx0aWYoIHRoaXMucXVldWVkS2V5ICl7XG5cdFx0XHR0aGlzLnNob3dSb29tKCB0aGlzLnF1ZXVlZEtleSApO1xuXHRcdH1cblx0fSxcblx0dGVzdENvbG9yIDogZnVuY3Rpb24oIF9jb2xvciApe1xuXG5cdFx0dmFyIGNvbG9yID0gb25lLmNvbG9yKCBfY29sb3IgKTtcblx0XHR2YXIgaHNsID0ge1xuXHRcdFx0aCA6IE1hdGguZmxvb3IoIGNvbG9yLmgoKSAqIDM2MCksIFxuXHRcdFx0cyA6IE1hdGguZmxvb3IoIGNvbG9yLnMoKSAqIDEwMCksXG5cdFx0XHRsIDogTWF0aC5mbG9vciggY29sb3IubCgpICogMTAwKSBcblx0XHR9O1xuXHRcdGh1ZUNvbm5lY3QudXBkYXRlKFtcblx0XHRcdHtcblx0XHRcdFx0J2lkJyA6IDEsXG5cdFx0XHRcdCdkYXRhJyA6IHtcblx0XHRcdFx0XHQnaHNsJyA6IGhzbCxcblx0XHRcdFx0XHQnZHVyYXRpb24nIDogMVxuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHQnaWQnIDogMixcblx0XHRcdFx0J2RhdGEnIDoge1xuXHRcdFx0XHRcdCdoc2wnIDogaHNsLFxuXHRcdFx0XHRcdCdkdXJhdGlvbicgOiAxXG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHR7XG5cdFx0XHRcdCdpZCcgOiAzLFxuXHRcdFx0XHQnZGF0YScgOiB7XG5cdFx0XHRcdFx0J2hzbCcgOiBoc2wsXG5cdFx0XHRcdFx0J2R1cmF0aW9uJyA6IDFcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0J2lkJyA6IDQsXG5cdFx0XHRcdCdkYXRhJyA6IHtcblx0XHRcdFx0XHQnaHNsJyA6IGhzbCxcblx0XHRcdFx0XHQnZHVyYXRpb24nIDogMVxuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHQnaWQnIDogNSxcblx0XHRcdFx0J2RhdGEnIDoge1xuXHRcdFx0XHRcdCdoc2wnIDogaHNsLFxuXHRcdFx0XHRcdCdkdXJhdGlvbicgOiAxXG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRdKTtcdFx0XG5cdH0sXG5cdGV2ZW50c0xvYWRlZCA6IGZ1bmN0aW9uKCBkYXRhICl7XG5cdFx0XG5cdFx0dmFyIGtleSA9IGRhdGEua2V5O1xuXHRcdHZhciBteUNhbGVuZGFyTW9kZWwgPSB0aGlzLmNhbGVuZGFyU3RvcmVbIGtleSBdO1xuXHRcdFxuXHRcdGlmKCAgIW15Q2FsZW5kYXJNb2RlbCApe1xuXG5cdFx0XHRteUNhbGVuZGFyTW9kZWwgPSBuZXcgQ2FsZW5kYXJNb2RlbCh7XG5cdFx0XHRcdGtleSA6IGtleSxcblx0XHRcdFx0ZXZlbnRDb2xsZWN0aW9uIDogbmV3IENhbGVuZGFyQ29sbGVjdGlvbigpXG5cdFx0XHR9KTtcblx0XHRcdHRoaXMuX3NwbGFzaFZpZXcuYWRkUm9vbSggbXlDYWxlbmRhck1vZGVsICk7XG5cdFx0XHR0aGlzLmNhbGVuZGFyU3RvcmVbIGtleSBdID0gbXlDYWxlbmRhck1vZGVsO1xuXHRcdFx0bmV3IExpZ2h0UGF0dGVybkNvbnRyb2xsZXIoIG15Q2FsZW5kYXJNb2RlbCApO1xuXHRcdH0gXG5cblx0XHR2YXIgcm9vbURhdGEgPSBkYXRhLmRhdGE7XG5cdFx0dmFyIHVwZGF0ZWQgPSByb29tRGF0YS51cGRhdGVkO1xuXG5cdFx0Y29uc29sZS5sb2codXBkYXRlZCk7XG5cblx0XHRteUNhbGVuZGFyTW9kZWwuc2V0KFwicm9vbURhdGFcIiwgcm9vbURhdGEpO1xuXHRcdG15Q2FsZW5kYXJNb2RlbC5zZXQoXCJ1cGRhdGVkXCIsIHVwZGF0ZWQpO1xuXG5cdFx0dGhpcy5jaGVja1F1ZXVlKCk7XG5cdH0gXG59KTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IENhbGVuZGFyVmlldzsgICAgICAgICAgICAgICAgICAgIFxuICAgIFxuICIsInZhciBTcGxhc2hWaWV3ID0gTWFyaW9uZXR0ZS5MYXlvdXRWaWV3LmV4dGVuZCh7XG5cdGlkIDogXCJyb29tLXNwbGl0XCIsXG5cdHRlbXBsYXRlIDogXy50ZW1wbGF0ZSggcmVxdWlyZShcInRlbXBsYXRlcy9zcGxhc2hXcmFwcGVyLmh0bWxcIikgKSxcblx0aW5pdGlhbGl6ZSA6IGZ1bmN0aW9uKCl7XG5cdFx0XG5cdH0sXG5cdGFkZFJvb20gOiBmdW5jdGlvbiggbW9kZWwgKXtcblx0XHR2YXIgcm9vbXMgPSB0aGlzLm1vZGVsLmdldChcInJvb21zXCIpO1xuXHRcdHJvb21zWyBtb2RlbC5nZXQoXCJrZXlcIikgXSA9IG1vZGVsO1xuXG5cdFx0dGhpcy5saXN0ZW5UbyggbW9kZWwsIFwiY2hhbmdlOmN1cnJlbnRFdmVudFwiLCB0aGlzLnJlbmRlciApO1xuXHRcdHRoaXMucmVuZGVyKCk7XG5cdH0sXG5cdG9uQmVmb3JlUmVuZGVyIDogZnVuY3Rpb24oKXtcblxuXHRcdGNvbnNvbGUubG9nKFwiUkVSRU5ERVIgU1BMQVNIXCIpO1xuXHRcdHZhciByb29tcyA9ICB0aGlzLm1vZGVsLmdldChcInJvb21zXCIpO1xuXHRcdHZhciByb29tc0RhdGEgPSAgdGhpcy5tb2RlbC5nZXQoXCJyb29tc0RhdGFcIik7XG5cblx0XHRfLmVhY2goIHJvb21zLCBmdW5jdGlvbiggcm9vbSwga2V5ICkge1xuXHRcdFx0cm9vbXNEYXRhWyBrZXkgXSA9IHJvb20udG9KU09OKCk7XG5cdFx0fSk7XG5cdH1cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFNwbGFzaFZpZXc7Il19
