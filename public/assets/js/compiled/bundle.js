(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
window.Common = {
	path : {
		assets : "assets/",
		img : "assets/img/",
		audio : "assets/audio/"
	}
};

//base
var AppLayout = require( "views/appLayout" );

//custom
var CalendarWrapper	= require("views/calendarWrapper");
var roomData = require("roomData");

//THE APPLICATION
var MyApp = Marionette.Application.extend({
	initialize : function(){
		
	},
	onStart : function(){

		var myCalendar = new CalendarWrapper( { model : new Backbone.Model({ rooms : roomData }) });
		AppLayout.getRegion("main").show( myCalendar );

		Backbone.history.start({
			pushState : false
		});
	} 
});

//kickoff
$(function(){
	window.app = new MyApp();
	window.app.start(); 
});







         
},{"roomData":13,"views/appLayout":20,"views/calendarWrapper":23}],2:[function(require,module,exports){
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
		'defaultRoute' : function(){}
	},
	appRoutes : {
		"room/:key" : "roomRoute",
		"*actions" : "defaultRoute"
	}
});

module.exports = new MyAppRouter();

},{"pipe":12}],4:[function(require,module,exports){
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
	// gapi.client.setApiKey(apiKey);
	// checkAuth();
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

},{"pipe":12,"roomData":13}],5:[function(require,module,exports){
var mySocket = null;
var connected = false;
var masterID = false;

var pipe = require("pipe");
var helpers = require("helpers");
var roomData = require("roomData");

function init(){

	connect(function(){

		var code = null ;

		mySocket.on('updateData', function(data){
			events.trigger( "eventsLoaded", data );
		});

		if( helpers.getParameterByName('authenticate') ){

			mySocket.on('authentication_url', function( data ){
				window.location = data;
			});
			mySocket.emit('authenticate');

		} else if( helpers.getParameterByName('master') ){

			mySocket.emit('master_connect', {
				roomData : roomData
			}, function( id ){
				console.log("MY ID:", id)
				masterID = id;
			});

		} else if( code = helpers.getParameterByName('code') ){

			mySocket.emit('got_code', code);
			window.location = "?master=true";
		}

		mySocket.emit('requestData');
	});
}
function connect( callback ){

	// var socket = 'http://charliepi.local:3000';
	var socket = 'http://localhost:3000';
	
	mySocket = mySocket || io.connect( socket );

	if( connected ){
		callback();
	} else {
		mySocket.on('connect', function(){
			if(callback) callback();
			connected = true;
		});	
	}
}

function update( data ){

	console.log( data, connected, masterID );

	if(connected && masterID){
		
		mySocket.emit( 'update_data', { data : data, id : masterID } );	
	}
}

var events = _.extend({}, Backbone.Events);

init();

module.exports = {
	init : init,
	connected : connected,
	events : events,
	update : update
}
},{"helpers":8,"pipe":12,"roomData":13}],6:[function(require,module,exports){
var hueConnect = require("controllers/hueConnect");

function LightPattern( lightId, patternId, opt_data ){

	this._pattern = patterns[ patternId ];

	// make sequence by patternId
	this.createSequence( patternId, opt_data );

	this._lightId = lightId;

	this._step = 0;
	this._iteration = 0;

	this._sequence = this.startSequence( patternId );

	this._timeout = null;
}

LightPattern.prototype = {
	createSequence : function( patternId, opt_data ){
		
		var pattern = patterns[ patternId ];

		switch(patternId) {
			case 'occupied':
			var numStops = 30;

			pattern.start = opt_data.start;
			pattern.end = opt_data.end;
			pattern.wait = (pattern.end - pattern.start) / numStops / 1000;
			pattern.fade = pattern.wait;

			var rainbow = new Rainbow();
			rainbow.setSpectrum.apply( rainbow, pattern.colors );

			pattern.sequence = [];
			for(var i = 0; i < numStops; i++) {
				var color = rainbow.colourAt( i/(numStops-1) * 100 );
				pattern.sequence.push( color );
			}
			break;

			default:
			pattern.sequence = pattern.colors.concat();
			break;
		}
	},
	getColor : function(){

		return this._sequence[this._step];
	},
	startSequence : function( patternId ){

		var pattern = patterns[ patternId ];
		this._sequence = pattern.sequence;

		this.stopSequence();

		var step;

		switch(patternId) {
			case 'occupied':
			step = Math.floor( (new Date() - pattern.start) / (pattern.end - pattern.start) * 30 );
			break;

			default:
			step = 0;
			break;
		}

		this.playSequenceStep( step, pattern.instant );

		return this._sequence;
	},
	stopSequence : function(){

		this._step = 0;
		this._iteration = 0;

		window.clearTimeout( this._timeout );
	},
	playSequenceStep: function( step, instant ){

		// console.log("play sequence step")

		this._step = step;

		var color = one.color( this.getColor() );
		var fade = instant ? 0 : this._pattern.fade;
		var wait = this._pattern.wait;

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
		var repeat = this._pattern.repeat;

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
		instant : false,
		repeat :  -1,
		fade: 1,
		wait: 1,
		colors: ["#FB1911", "#00ff00", "#4156FF", "#FF001D", "#FFFF07"],
		sequence : []
	},
	'available' : {
		instant : true,
		repeat : 0,
		fade: 1,
		wait: 0,
		colors: ["#3523f6"],
		sequence : []
	},
	'occupied' : {
		instant : true,
		repeat : 0,
		fade: 0,
		wait: 0,
		start : 0,
		end : 0,
		colors: ["#2dcc3d", "#f3e533", "#fc312c"],
		sequence : []
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

		this.isAvailable();
		this._model.on( "change:currentEvent", this.currentChanged, this  );
	},
	currentChanged : function( parent, model ){

		this.stopExisting();

		var data = {};
		var type = 'available';

		if( model ){

			type = model.getPatternType();
			data = {
				start : model.get("start").raw,
				end : model.get("end").raw
			}

		}
		
		this.newPattern( type, data );

	},
	isAvailable : function(){

		this.newPattern( "available" );
	},
	getCurrent : function(){

		return this._currentPattern;
	},
	newPattern : function( type, data ){

		var key = this._model.get("key");

		data = data || {};

		this.stopExisting();

		this._currentPattern = new LightPattern( key, type, data);

	},
	stopExisting : function(){

		if( this._currentPattern ){
			this._currentPattern.stopSequence();	
		}
	}
}

module.exports = LightPatternController;
},{"controllers/lightPattern":6}],8:[function(require,module,exports){
module.exports = {
	 getParameterByName : function(name) {
	    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
	    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
	        results = regex.exec(location.search);
	    return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
	}
}



},{}],9:[function(require,module,exports){
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
			twelveHour : this.getTwelveHour(date),
			formatted : date.toString()
		});
	},
	getTwelveHour : function (date) {
	  var hours = date.getHours();
	  var minutes = date.getMinutes();
	  var ampm = hours >= 12 ? 'pm' : 'am';
	  hours = hours % 12;
	  hours = hours ? hours : 12; // the hour '0' should be '12'
	  minutes = minutes < 10 ? '0'+minutes : minutes;
	  var strTime = hours + ':' + minutes + ' ' + ampm;
	  return strTime;
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
},{}],10:[function(require,module,exports){
var CalendarItemModel 	= require("models/calendarItemModel");

var CalendarModel = Backbone.Model.extend({
	defaults : {
		organizer : "Wes"
	},
	initialize : function(){

		_.bindAll( this, "getCurrent", "checkTime" );

		this.listenTo( this, "change:updated", this.updateEvents );
		this.listenTo( this, "change:updated", this.getCurrent );
		this.listenTo( this, "change:currentEvent", this.changeCurrent );

		setInterval( this.getCurrent, 1000 );
	},
	getCurrent : function(){

		var eventCollection = this.get("eventCollection");

		//getting current event
		var current = eventCollection.getCurrent();
		
		this.set("currentEventData", current ? current.toJSON() : null);
		this.set("currentEvent", current );	
	},
	changeCurrent : function(view, model){

		if(model){
			this.startCheckingTime();
		} else {
			this.stopCheckingTime();
		}
	},
	startCheckingTime : function(){

		this.stopCheckingTime();
		this._timeChecker = setInterval( this.checkTime, 1000 );
	},
	stopCheckingTime : function(){

		window.clearInterval( this._timeChecker );
	},
	checkTime : function(){
		
		var model = this.get("currentEvent");
		var end = model.get("end").raw;
		var now = new Date();
		var time = end - now;

		var seconds, minutes, hours, x;

		x = time / 1000
		seconds = Math.floor( x % 60 );
		x /= 60
		minutes = Math.floor( x % 60 );
		x /= 60
		hours = Math.floor( x % 24 );

		this.set("timeLeft", {
			hours : hours,
			minutes : minutes,
			seconds : seconds
		});
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
	},
	getLightPattern : function(){

		var lightPatternController = this.get("lightPatternController");
		return lightPatternController.getCurrent();
	}
});

module.exports = CalendarModel;
},{"models/calendarItemModel":9}],11:[function(require,module,exports){
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

},{}],12:[function(require,module,exports){
var pipe = _.extend({

	
	
}, Backbone.Events);

module.exports = pipe;
},{}],13:[function(require,module,exports){
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
},{}],14:[function(require,module,exports){
module.exports = "<h2><%= summary %></h2>\n\n<h3>description : <%= description %></h3>\n\n<h3>start : <%= start.twelveHour %></h3>\n\n<h3>end : <%= end.twelveHour %></h3>";

},{}],15:[function(require,module,exports){
module.exports = "<div id=\"event-list-container\"></div>";

},{}],16:[function(require,module,exports){
module.exports = "<div id=\"splash-page\"></div>\n\n<div id=\"room-single\"></div>\n\n<!-- TEST -->\n<div class=\"test\" style=\"position:absolute;top:0;\">\n\t<div>\n\t\t<input id=\"hex-input\" type=\"text\"></input>\n\t\t<button id=\"hex\">hex</button>\n\t</div>\n\t<button id=\"test\">test</button>\n\t<input class=\"color\" type=\"color\" name=\"favcolor\">\n</div>";

},{}],17:[function(require,module,exports){
module.exports = "<div class=\"number\"><%= key %></div>\n<div class=\"circle\">\n\t<div class=\"graph room-<%= key %>\"></div>\n</div>\n<div class=\"availability\">\n\t<p><%= currentEventData ? currentEventData.summary : 'nothing' %></p>\n\t<p class=\"time\"></p>\n</div>";

},{}],18:[function(require,module,exports){
module.exports = "<% _.each( roomData, function( data, key ){ %>\n\t<div class=\"room-container\" id=\"room-<%= key %>\" data-id=\"<%= key %>\">\n\t</div>\n<% }); %>";

},{}],19:[function(require,module,exports){
module.exports = "<span class=\"hours\"><%= hours %></span><span class=\"colon\" <% if (showColon) { %>style=\"visibility:hidden;\"<% } %> >:</span><span class=\"minutes\"><%= minutes %></span>";

},{}],20:[function(require,module,exports){
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
},{"models/state":11}],21:[function(require,module,exports){
var CalendarItem = Marionette.ItemView.extend({
	className : 'item',
	tagName : 'li',
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
},{"templates/calendarItem.html":14}],22:[function(require,module,exports){
var CalendarItem 	= require("views/calendarItem");
var AppRouter 		= require( "controllers/appRouter" );

var CalendarSingle = Marionette.LayoutView.extend({
	template : _.template( require("templates/calendarSingle.html") ),
	regions : {
		eventListContainer : "#event-list-container"
	},
	ui : {
	},
	events : {
	},
	initialize : function(){

		this.collectionView = new Marionette.CollectionView({
			tagName : 'ul',
			id : 'event-list',
			childView : CalendarItem,
			collection : this.model.get("eventCollection")
		});
	},
	onShow : function(){

		this.getRegion( "eventListContainer" ).show( this.collectionView );
	},
	onClose : function(){

		AppRouter.navigate("/", {trigger: true});
	}
});

module.exports = CalendarSingle;
},{"controllers/appRouter":3,"templates/calendarSingle.html":15,"views/calendarItem":21}],23:[function(require,module,exports){
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
		
		this.calendarStore = {};
		this.listenTo( hueConnect.events, "eventsLoaded", this.eventsLoaded );
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
			
			var view = new CalendarSingle({ model : model });
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

		console.log(data);
		
		var key = data.key;
		var myCalendarModel = this.calendarStore[ key ];
		
		if(  !myCalendarModel ){

			myCalendarModel = new CalendarModel({
				key : key,
				eventCollection : new CalendarCollection()
			});
			
			this.calendarStore[ key ] = myCalendarModel;
			var lightPatternController = new LightPatternController( myCalendarModel );
			myCalendarModel.set("lightPatternController", lightPatternController);
			this._splashView.addRoom( myCalendarModel );
		} 

		var roomData = data.data;
		var updated = roomData.updated;

		myCalendarModel.set("roomData", roomData);
		myCalendarModel.set("updated", updated);

		this.checkQueue();
	} 
});


module.exports = CalendarView;                    
    
 
},{"collections/calendarCollection":2,"controllers/appRouter":3,"controllers/calendarLoad":4,"controllers/hueConnect":5,"controllers/lightPattern":6,"controllers/lightPatternController":7,"models/calendarItemModel":9,"models/calendarModel":10,"templates/calendarWrapper.html":16,"views/calendarSingle":22,"views/splashView":25}],24:[function(require,module,exports){
var TimeDisplayTemplate = _.template( require("templates/timeDisplay.html") );

var SplashItemView = Marionette.ItemView.extend({
	template : _.template( require("templates/splashItem.html") ),
	tagName : "section",
	className : "room",
	ui: {
		timeDisplay: '.time'
	},
	initialize : function(){

		this.listenTo( this.model, "change:currentEvent", this.render );
		this.listenTo( this.model, "change:timeLeft", this.updateTimeLeft );

		TweenMax.ticker.addEventListener('tick', this.update, this);

		// this.render();
	},
	update: function(){

		var lightPattern = this.model.getLightPattern();

		this.$el.css({
			'background-color': lightPattern.getColor()
		});
	},
	updateTimeLeft : function(model, data){

		var key = model.get("key");
		this.ui.timeDisplay.html( TimeDisplayTemplate({
			hours : data.hours,
			minutes : data.minutes,
			showColon : (data.seconds % 2 === 0)
		}) );
	},
	onBeforeRender : function(){
		var currentEvent = this.model.get("currentEvent");
		this.model.set( "currentEventData", currentEvent ? currentEvent.toJSON() : null );
	}
});

module.exports = SplashItemView;
},{"templates/splashItem.html":17,"templates/timeDisplay.html":19}],25:[function(require,module,exports){
var AppRouter 		= require( "controllers/appRouter" );

var State = require('models/state');
var roomData = require("roomData");
var SplashItemView = require("views/splashItemView");

var SplashView = Marionette.LayoutView.extend({
	id : "room-split",
	template : _.template( require("templates/splashWrapper.html") ),
	ui : {
		roomContainers : ".room-container"
	},
	events : {
		"mouseenter @ui.roomContainers" : function(e){
				$('.room-container').each(function(index, el) {
					var isHovered = (el === e.currentTarget);
					$(el).toggleClass('hovered', isHovered);
					$(el).toggleClass('not-hovered', !isHovered);
				});
		},
		"mouseleave @ui.roomContainers" : function(e){
				$('.room-container').each(function(index, el) {
					$(el).removeClass('hovered');
					$(el).removeClass('not-hovered');
				});
		},
		"click @ui.roomContainers" : function( e ){
			var key = $( e.currentTarget ).data("id");
			AppRouter.navigate("room/"+key, {trigger: true});

				$('.room-container').each(function(index, el) {
					var shouldExpand = (el === e.currentTarget);
					$(el).toggleClass('expanded', shouldExpand);
					$(el).toggleClass('collapsed', !shouldExpand);
				});
		}
	},
	reset : function(){
		$('.room-container').each(function(index, el) {
			$(el).toggleClass('expanded', false);
			$(el).toggleClass('collapsed', false);
			$(el).toggleClass('hovered', false);
			$(el).toggleClass('not-hovered', false);
		});
	},
	initialize : function(){
		_.bindAll(this, 'resize');
		$(window).resize( this.resize ).resize();

		this.model.set("roomData", roomData);

		_.each( roomData, function( value, key ){
			this.addRegion( key, "#room-"+key );
		}, this);

	},
	addRoom : function( model ){
		var key = model.get("key");
		var region = this.getRegion( key );
		region.show( new SplashItemView({ model : model } ) );
	},
	resize : function(){
		var aspectRatio = $(window).width() / $(window).height();
		State.set('portrait', aspectRatio <= 1);
	}
});

module.exports = SplashView;
},{"controllers/appRouter":3,"models/state":11,"roomData":13,"templates/splashWrapper.html":18,"views/splashItemView":24}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIuLi9wdWJsaWMvYXNzZXRzL2pzL3VzZXIvYXBwLmpzIiwiLi4vcHVibGljL2Fzc2V0cy9qcy91c2VyL2NvbGxlY3Rpb25zL2NhbGVuZGFyQ29sbGVjdGlvbi5qcyIsIi4uL3B1YmxpYy9hc3NldHMvanMvdXNlci9jb250cm9sbGVycy9hcHBSb3V0ZXIuanMiLCIuLi9wdWJsaWMvYXNzZXRzL2pzL3VzZXIvY29udHJvbGxlcnMvY2FsZW5kYXJMb2FkLmpzIiwiLi4vcHVibGljL2Fzc2V0cy9qcy91c2VyL2NvbnRyb2xsZXJzL2h1ZUNvbm5lY3QuanMiLCIuLi9wdWJsaWMvYXNzZXRzL2pzL3VzZXIvY29udHJvbGxlcnMvbGlnaHRQYXR0ZXJuLmpzIiwiLi4vcHVibGljL2Fzc2V0cy9qcy91c2VyL2NvbnRyb2xsZXJzL2xpZ2h0UGF0dGVybkNvbnRyb2xsZXIuanMiLCIuLi9wdWJsaWMvYXNzZXRzL2pzL3VzZXIvaGVscGVycy5qcyIsIi4uL3B1YmxpYy9hc3NldHMvanMvdXNlci9tb2RlbHMvY2FsZW5kYXJJdGVtTW9kZWwuanMiLCIuLi9wdWJsaWMvYXNzZXRzL2pzL3VzZXIvbW9kZWxzL2NhbGVuZGFyTW9kZWwuanMiLCIuLi9wdWJsaWMvYXNzZXRzL2pzL3VzZXIvbW9kZWxzL3N0YXRlLmpzIiwiLi4vcHVibGljL2Fzc2V0cy9qcy91c2VyL3BpcGUuanMiLCIuLi9wdWJsaWMvYXNzZXRzL2pzL3VzZXIvcm9vbURhdGEuanMiLCIuLi9wdWJsaWMvYXNzZXRzL2pzL3VzZXIvdGVtcGxhdGVzL2NhbGVuZGFySXRlbS5odG1sIiwiLi4vcHVibGljL2Fzc2V0cy9qcy91c2VyL3RlbXBsYXRlcy9jYWxlbmRhclNpbmdsZS5odG1sIiwiLi4vcHVibGljL2Fzc2V0cy9qcy91c2VyL3RlbXBsYXRlcy9jYWxlbmRhcldyYXBwZXIuaHRtbCIsIi4uL3B1YmxpYy9hc3NldHMvanMvdXNlci90ZW1wbGF0ZXMvc3BsYXNoSXRlbS5odG1sIiwiLi4vcHVibGljL2Fzc2V0cy9qcy91c2VyL3RlbXBsYXRlcy9zcGxhc2hXcmFwcGVyLmh0bWwiLCIuLi9wdWJsaWMvYXNzZXRzL2pzL3VzZXIvdGVtcGxhdGVzL3RpbWVEaXNwbGF5Lmh0bWwiLCIuLi9wdWJsaWMvYXNzZXRzL2pzL3VzZXIvdmlld3MvYXBwTGF5b3V0LmpzIiwiLi4vcHVibGljL2Fzc2V0cy9qcy91c2VyL3ZpZXdzL2NhbGVuZGFySXRlbS5qcyIsIi4uL3B1YmxpYy9hc3NldHMvanMvdXNlci92aWV3cy9jYWxlbmRhclNpbmdsZS5qcyIsIi4uL3B1YmxpYy9hc3NldHMvanMvdXNlci92aWV3cy9jYWxlbmRhcldyYXBwZXIuanMiLCIuLi9wdWJsaWMvYXNzZXRzL2pzL3VzZXIvdmlld3Mvc3BsYXNoSXRlbVZpZXcuanMiLCIuLi9wdWJsaWMvYXNzZXRzL2pzL3VzZXIvdmlld3Mvc3BsYXNoVmlldy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5SkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNiQTtBQUNBOztBQ0RBO0FBQ0E7O0FDREE7QUFDQTs7QUNEQTtBQUNBOztBQ0RBO0FBQ0E7O0FDREE7QUFDQTs7QUNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0tBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ3aW5kb3cuQ29tbW9uID0ge1xuXHRwYXRoIDoge1xuXHRcdGFzc2V0cyA6IFwiYXNzZXRzL1wiLFxuXHRcdGltZyA6IFwiYXNzZXRzL2ltZy9cIixcblx0XHRhdWRpbyA6IFwiYXNzZXRzL2F1ZGlvL1wiXG5cdH1cbn07XG5cbi8vYmFzZVxudmFyIEFwcExheW91dCA9IHJlcXVpcmUoIFwidmlld3MvYXBwTGF5b3V0XCIgKTtcblxuLy9jdXN0b21cbnZhciBDYWxlbmRhcldyYXBwZXJcdD0gcmVxdWlyZShcInZpZXdzL2NhbGVuZGFyV3JhcHBlclwiKTtcbnZhciByb29tRGF0YSA9IHJlcXVpcmUoXCJyb29tRGF0YVwiKTtcblxuLy9USEUgQVBQTElDQVRJT05cbnZhciBNeUFwcCA9IE1hcmlvbmV0dGUuQXBwbGljYXRpb24uZXh0ZW5kKHtcblx0aW5pdGlhbGl6ZSA6IGZ1bmN0aW9uKCl7XG5cdFx0XG5cdH0sXG5cdG9uU3RhcnQgOiBmdW5jdGlvbigpe1xuXG5cdFx0dmFyIG15Q2FsZW5kYXIgPSBuZXcgQ2FsZW5kYXJXcmFwcGVyKCB7IG1vZGVsIDogbmV3IEJhY2tib25lLk1vZGVsKHsgcm9vbXMgOiByb29tRGF0YSB9KSB9KTtcblx0XHRBcHBMYXlvdXQuZ2V0UmVnaW9uKFwibWFpblwiKS5zaG93KCBteUNhbGVuZGFyICk7XG5cblx0XHRCYWNrYm9uZS5oaXN0b3J5LnN0YXJ0KHtcblx0XHRcdHB1c2hTdGF0ZSA6IGZhbHNlXG5cdFx0fSk7XG5cdH0gXG59KTtcblxuLy9raWNrb2ZmXG4kKGZ1bmN0aW9uKCl7XG5cdHdpbmRvdy5hcHAgPSBuZXcgTXlBcHAoKTtcblx0d2luZG93LmFwcC5zdGFydCgpOyBcbn0pO1xuXG5cblxuXG5cblxuXG4gICAgICAgICAiLCJ2YXIgQ2FsZW5kYXJDb2xsZWN0aW9uID0gQmFja2JvbmUuQ29sbGVjdGlvbi5leHRlbmQoe1xuXHRpbml0aWFsaXplIDogZnVuY3Rpb24oKXtcblxuXHR9LFxuXHRjb21wYXJhdG9yIDogZnVuY3Rpb24oIGEsIGIgKXtcblx0XHR2YXIgYVRpbWUgPSBhLmdldChcInN0YXJ0XCIpLnJhdztcblx0XHR2YXIgYlRpbWUgPSBiLmdldChcInN0YXJ0XCIpLnJhdztcblx0XHRyZXR1cm4gYVRpbWUgLSBiVGltZTtcblx0fSxcblx0Z2V0Q3VycmVudCA6IGZ1bmN0aW9uKCl7XG5cblx0XHRyZXR1cm4gdGhpcy5maW5kKGZ1bmN0aW9uKCBtb2RlbCApe1xuXG5cdFx0XHRyZXR1cm4gbW9kZWwuaXNBY3RpdmUoKTtcblx0XHR9KTtcblx0fVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gQ2FsZW5kYXJDb2xsZWN0aW9uOyIsInZhciBwaXBlID0gcmVxdWlyZShcInBpcGVcIik7XG5cbnZhciBNeUFwcFJvdXRlciA9IE1hcmlvbmV0dGUuQXBwUm91dGVyLmV4dGVuZCh7XG5cdGNvbnRyb2xsZXIgOiB7XG5cdFx0J3Jvb21Sb3V0ZScgOiBmdW5jdGlvbigpe30sXG5cdFx0J2RlZmF1bHRSb3V0ZScgOiBmdW5jdGlvbigpe31cblx0fSxcblx0YXBwUm91dGVzIDoge1xuXHRcdFwicm9vbS86a2V5XCIgOiBcInJvb21Sb3V0ZVwiLFxuXHRcdFwiKmFjdGlvbnNcIiA6IFwiZGVmYXVsdFJvdXRlXCJcblx0fVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gbmV3IE15QXBwUm91dGVyKCk7XG4iLCJ2YXIgcGlwZSA9IHJlcXVpcmUoXCJwaXBlXCIpO1xuXG4vL2xpc3RlbmluZyBmb3IgbG9hZFxud2luZG93LmhhbmRsZUNsaWVudExvYWQgPSBmdW5jdGlvbigpe1xuXG4gIGNvbnNvbGUubG9nKFwiZ29vZ2xlIGFwaSBsb2FkZWRcIik7XG4gIF8uZGVmZXIoIGZ1bmN0aW9uKCl7IGluaXQoKSB9KTtcbn1cblxudmFyIGNsaWVudElkID0gJzQzMzgzOTcyMzM2NS11N2dybGR0dmY4cGFiamtqNGZyY2lvM2N2NWhpdDhmbS5hcHBzLmdvb2dsZXVzZXJjb250ZW50LmNvbSc7XG52YXIgYXBpS2V5ID0gJ0FJemFTeUJzS2RUcGxSWHVFd2d2UFNIX2dHRjhPR3N3MzV0MTV2MCc7XG52YXIgc2NvcGVzID0gJ2h0dHBzOi8vd3d3Lmdvb2dsZWFwaXMuY29tL2F1dGgvY2FsZW5kYXInO1xudmFyIHJvb21EYXRhID0gcmVxdWlyZShcInJvb21EYXRhXCIpO1xudmFyIHB1bGxJbnRlcnZhbCA9IDEwMDAgKiAxMDtcblxuLy9UT0RPIDogaW50ZWdyYXRlIGFsbCA0IGNhbGVuZGFyc1xuXG5mdW5jdGlvbiBpbml0KCl7XG5cdC8vIGdhcGkuY2xpZW50LnNldEFwaUtleShhcGlLZXkpO1xuXHQvLyBjaGVja0F1dGgoKTtcbn1cblxuZnVuY3Rpb24gY2hlY2tBdXRoKCl7XG5cdGdhcGkuYXV0aC5hdXRob3JpemUoIHtcblx0XHRjbGllbnRfaWQ6IGNsaWVudElkLCBcblx0XHRzY29wZTogc2NvcGVzLCBcblx0XHRpbW1lZGlhdGU6IGZhbHNlXG5cdH0sIGhhbmRsZUF1dGhSZXN1bHQgKTtcbn1cblxuZnVuY3Rpb24gaGFuZGxlQXV0aFJlc3VsdCggYXV0aFJlc3VsdCApe1xuXG5cdGlmKGF1dGhSZXN1bHQpe1xuXHRcdG1ha2VBcGlDYWxsKCk7XG5cdH1cbn1cblxuZnVuY3Rpb24gbWFrZUFwaUNhbGwoKSB7XG4gIGdhcGkuY2xpZW50LmxvYWQoJ2NhbGVuZGFyJywgJ3YzJywgZnVuY3Rpb24oKSB7XG4gICAgICBcbiAgICAgIHB1bGxSb29tcygpO1xuICAgICAgc2V0SW50ZXJ2YWwoIHB1bGxSb29tcywgcHVsbEludGVydmFsICk7ICAgICAgICAgIFxuICB9KTtcbn1cblxuZnVuY3Rpb24gcHVsbFJvb21zKCl7XG5cbiAgdmFyIGZyb20gPSBuZXcgRGF0ZSgpO1xuICB2YXIgdG8gPSBuZXcgRGF0ZSgpO1xuICAgICAgdG8uc2V0RGF0ZSggdG8uZ2V0RGF0ZSgpICsgMSApO1xuXG4gIF8uZWFjaCggcm9vbURhdGEsIGZ1bmN0aW9uKCBkYXRhLCBrZXkgKXtcblxuICAgIHZhciByZXF1ZXN0ID0gZ2FwaS5jbGllbnQuY2FsZW5kYXIuZXZlbnRzLmxpc3Qoe1xuICAgICAgICAnY2FsZW5kYXJJZCc6IGRhdGEuY2FsZW5kYXJJZCxcbiAgICAgICAgdGltZU1pbiA6IGZyb20udG9JU09TdHJpbmcoKSxcbiAgICAgICAgdGltZU1heCA6IHRvLnRvSVNPU3RyaW5nKCksXG4gICAgICAgIHNpbmdsZUV2ZW50cyA6IHRydWVcbiAgICAgIH0pO1xuXG4gICAgIHJlcXVlc3QudGhlbihmdW5jdGlvbihyZXNwb25zZSkge1xuXG4gICAgICAgICAgcm9vbUxvYWRlZCgga2V5LCByZXNwb25zZS5yZXN1bHQgKTtcbiAgICAgIH0sIGZ1bmN0aW9uKHJlYXNvbikge1xuXG4gICAgICAgICAgY29uc29sZS5sb2coJ0Vycm9yOiAnICsgcmVhc29uLnJlc3VsdC5lcnJvci5tZXNzYWdlKTtcbiAgICAgIH0pO1xuICB9KTtcbn1cblxuZnVuY3Rpb24gcm9vbUxvYWRlZCgga2V5LCBkYXRhICl7XG5cbiAgZXZlbnRzLnRyaWdnZXIoIFwiZXZlbnRzTG9hZGVkXCIsIHsga2V5IDoga2V5LCBkYXRhIDogZGF0YSB9ICk7XG59XG5cbnZhciBldmVudHMgPSBfLmV4dGVuZCh7fSwgQmFja2JvbmUuRXZlbnRzKTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cbiAgZXZlbnRzIDogZXZlbnRzXG59O1xuIiwidmFyIG15U29ja2V0ID0gbnVsbDtcbnZhciBjb25uZWN0ZWQgPSBmYWxzZTtcbnZhciBtYXN0ZXJJRCA9IGZhbHNlO1xuXG52YXIgcGlwZSA9IHJlcXVpcmUoXCJwaXBlXCIpO1xudmFyIGhlbHBlcnMgPSByZXF1aXJlKFwiaGVscGVyc1wiKTtcbnZhciByb29tRGF0YSA9IHJlcXVpcmUoXCJyb29tRGF0YVwiKTtcblxuZnVuY3Rpb24gaW5pdCgpe1xuXG5cdGNvbm5lY3QoZnVuY3Rpb24oKXtcblxuXHRcdHZhciBjb2RlID0gbnVsbCA7XG5cblx0XHRteVNvY2tldC5vbigndXBkYXRlRGF0YScsIGZ1bmN0aW9uKGRhdGEpe1xuXHRcdFx0ZXZlbnRzLnRyaWdnZXIoIFwiZXZlbnRzTG9hZGVkXCIsIGRhdGEgKTtcblx0XHR9KTtcblxuXHRcdGlmKCBoZWxwZXJzLmdldFBhcmFtZXRlckJ5TmFtZSgnYXV0aGVudGljYXRlJykgKXtcblxuXHRcdFx0bXlTb2NrZXQub24oJ2F1dGhlbnRpY2F0aW9uX3VybCcsIGZ1bmN0aW9uKCBkYXRhICl7XG5cdFx0XHRcdHdpbmRvdy5sb2NhdGlvbiA9IGRhdGE7XG5cdFx0XHR9KTtcblx0XHRcdG15U29ja2V0LmVtaXQoJ2F1dGhlbnRpY2F0ZScpO1xuXG5cdFx0fSBlbHNlIGlmKCBoZWxwZXJzLmdldFBhcmFtZXRlckJ5TmFtZSgnbWFzdGVyJykgKXtcblxuXHRcdFx0bXlTb2NrZXQuZW1pdCgnbWFzdGVyX2Nvbm5lY3QnLCB7XG5cdFx0XHRcdHJvb21EYXRhIDogcm9vbURhdGFcblx0XHRcdH0sIGZ1bmN0aW9uKCBpZCApe1xuXHRcdFx0XHRjb25zb2xlLmxvZyhcIk1ZIElEOlwiLCBpZClcblx0XHRcdFx0bWFzdGVySUQgPSBpZDtcblx0XHRcdH0pO1xuXG5cdFx0fSBlbHNlIGlmKCBjb2RlID0gaGVscGVycy5nZXRQYXJhbWV0ZXJCeU5hbWUoJ2NvZGUnKSApe1xuXG5cdFx0XHRteVNvY2tldC5lbWl0KCdnb3RfY29kZScsIGNvZGUpO1xuXHRcdFx0d2luZG93LmxvY2F0aW9uID0gXCI/bWFzdGVyPXRydWVcIjtcblx0XHR9XG5cblx0XHRteVNvY2tldC5lbWl0KCdyZXF1ZXN0RGF0YScpO1xuXHR9KTtcbn1cbmZ1bmN0aW9uIGNvbm5lY3QoIGNhbGxiYWNrICl7XG5cblx0Ly8gdmFyIHNvY2tldCA9ICdodHRwOi8vY2hhcmxpZXBpLmxvY2FsOjMwMDAnO1xuXHR2YXIgc29ja2V0ID0gJ2h0dHA6Ly9sb2NhbGhvc3Q6MzAwMCc7XG5cdFxuXHRteVNvY2tldCA9IG15U29ja2V0IHx8IGlvLmNvbm5lY3QoIHNvY2tldCApO1xuXG5cdGlmKCBjb25uZWN0ZWQgKXtcblx0XHRjYWxsYmFjaygpO1xuXHR9IGVsc2Uge1xuXHRcdG15U29ja2V0Lm9uKCdjb25uZWN0JywgZnVuY3Rpb24oKXtcblx0XHRcdGlmKGNhbGxiYWNrKSBjYWxsYmFjaygpO1xuXHRcdFx0Y29ubmVjdGVkID0gdHJ1ZTtcblx0XHR9KTtcdFxuXHR9XG59XG5cbmZ1bmN0aW9uIHVwZGF0ZSggZGF0YSApe1xuXG5cdGNvbnNvbGUubG9nKCBkYXRhLCBjb25uZWN0ZWQsIG1hc3RlcklEICk7XG5cblx0aWYoY29ubmVjdGVkICYmIG1hc3RlcklEKXtcblx0XHRcblx0XHRteVNvY2tldC5lbWl0KCAndXBkYXRlX2RhdGEnLCB7IGRhdGEgOiBkYXRhLCBpZCA6IG1hc3RlcklEIH0gKTtcdFxuXHR9XG59XG5cbnZhciBldmVudHMgPSBfLmV4dGVuZCh7fSwgQmFja2JvbmUuRXZlbnRzKTtcblxuaW5pdCgpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblx0aW5pdCA6IGluaXQsXG5cdGNvbm5lY3RlZCA6IGNvbm5lY3RlZCxcblx0ZXZlbnRzIDogZXZlbnRzLFxuXHR1cGRhdGUgOiB1cGRhdGVcbn0iLCJ2YXIgaHVlQ29ubmVjdCA9IHJlcXVpcmUoXCJjb250cm9sbGVycy9odWVDb25uZWN0XCIpO1xuXG5mdW5jdGlvbiBMaWdodFBhdHRlcm4oIGxpZ2h0SWQsIHBhdHRlcm5JZCwgb3B0X2RhdGEgKXtcblxuXHR0aGlzLl9wYXR0ZXJuID0gcGF0dGVybnNbIHBhdHRlcm5JZCBdO1xuXG5cdC8vIG1ha2Ugc2VxdWVuY2UgYnkgcGF0dGVybklkXG5cdHRoaXMuY3JlYXRlU2VxdWVuY2UoIHBhdHRlcm5JZCwgb3B0X2RhdGEgKTtcblxuXHR0aGlzLl9saWdodElkID0gbGlnaHRJZDtcblxuXHR0aGlzLl9zdGVwID0gMDtcblx0dGhpcy5faXRlcmF0aW9uID0gMDtcblxuXHR0aGlzLl9zZXF1ZW5jZSA9IHRoaXMuc3RhcnRTZXF1ZW5jZSggcGF0dGVybklkICk7XG5cblx0dGhpcy5fdGltZW91dCA9IG51bGw7XG59XG5cbkxpZ2h0UGF0dGVybi5wcm90b3R5cGUgPSB7XG5cdGNyZWF0ZVNlcXVlbmNlIDogZnVuY3Rpb24oIHBhdHRlcm5JZCwgb3B0X2RhdGEgKXtcblx0XHRcblx0XHR2YXIgcGF0dGVybiA9IHBhdHRlcm5zWyBwYXR0ZXJuSWQgXTtcblxuXHRcdHN3aXRjaChwYXR0ZXJuSWQpIHtcblx0XHRcdGNhc2UgJ29jY3VwaWVkJzpcblx0XHRcdHZhciBudW1TdG9wcyA9IDMwO1xuXG5cdFx0XHRwYXR0ZXJuLnN0YXJ0ID0gb3B0X2RhdGEuc3RhcnQ7XG5cdFx0XHRwYXR0ZXJuLmVuZCA9IG9wdF9kYXRhLmVuZDtcblx0XHRcdHBhdHRlcm4ud2FpdCA9IChwYXR0ZXJuLmVuZCAtIHBhdHRlcm4uc3RhcnQpIC8gbnVtU3RvcHMgLyAxMDAwO1xuXHRcdFx0cGF0dGVybi5mYWRlID0gcGF0dGVybi53YWl0O1xuXG5cdFx0XHR2YXIgcmFpbmJvdyA9IG5ldyBSYWluYm93KCk7XG5cdFx0XHRyYWluYm93LnNldFNwZWN0cnVtLmFwcGx5KCByYWluYm93LCBwYXR0ZXJuLmNvbG9ycyApO1xuXG5cdFx0XHRwYXR0ZXJuLnNlcXVlbmNlID0gW107XG5cdFx0XHRmb3IodmFyIGkgPSAwOyBpIDwgbnVtU3RvcHM7IGkrKykge1xuXHRcdFx0XHR2YXIgY29sb3IgPSByYWluYm93LmNvbG91ckF0KCBpLyhudW1TdG9wcy0xKSAqIDEwMCApO1xuXHRcdFx0XHRwYXR0ZXJuLnNlcXVlbmNlLnB1c2goIGNvbG9yICk7XG5cdFx0XHR9XG5cdFx0XHRicmVhaztcblxuXHRcdFx0ZGVmYXVsdDpcblx0XHRcdHBhdHRlcm4uc2VxdWVuY2UgPSBwYXR0ZXJuLmNvbG9ycy5jb25jYXQoKTtcblx0XHRcdGJyZWFrO1xuXHRcdH1cblx0fSxcblx0Z2V0Q29sb3IgOiBmdW5jdGlvbigpe1xuXG5cdFx0cmV0dXJuIHRoaXMuX3NlcXVlbmNlW3RoaXMuX3N0ZXBdO1xuXHR9LFxuXHRzdGFydFNlcXVlbmNlIDogZnVuY3Rpb24oIHBhdHRlcm5JZCApe1xuXG5cdFx0dmFyIHBhdHRlcm4gPSBwYXR0ZXJuc1sgcGF0dGVybklkIF07XG5cdFx0dGhpcy5fc2VxdWVuY2UgPSBwYXR0ZXJuLnNlcXVlbmNlO1xuXG5cdFx0dGhpcy5zdG9wU2VxdWVuY2UoKTtcblxuXHRcdHZhciBzdGVwO1xuXG5cdFx0c3dpdGNoKHBhdHRlcm5JZCkge1xuXHRcdFx0Y2FzZSAnb2NjdXBpZWQnOlxuXHRcdFx0c3RlcCA9IE1hdGguZmxvb3IoIChuZXcgRGF0ZSgpIC0gcGF0dGVybi5zdGFydCkgLyAocGF0dGVybi5lbmQgLSBwYXR0ZXJuLnN0YXJ0KSAqIDMwICk7XG5cdFx0XHRicmVhaztcblxuXHRcdFx0ZGVmYXVsdDpcblx0XHRcdHN0ZXAgPSAwO1xuXHRcdFx0YnJlYWs7XG5cdFx0fVxuXG5cdFx0dGhpcy5wbGF5U2VxdWVuY2VTdGVwKCBzdGVwLCBwYXR0ZXJuLmluc3RhbnQgKTtcblxuXHRcdHJldHVybiB0aGlzLl9zZXF1ZW5jZTtcblx0fSxcblx0c3RvcFNlcXVlbmNlIDogZnVuY3Rpb24oKXtcblxuXHRcdHRoaXMuX3N0ZXAgPSAwO1xuXHRcdHRoaXMuX2l0ZXJhdGlvbiA9IDA7XG5cblx0XHR3aW5kb3cuY2xlYXJUaW1lb3V0KCB0aGlzLl90aW1lb3V0ICk7XG5cdH0sXG5cdHBsYXlTZXF1ZW5jZVN0ZXA6IGZ1bmN0aW9uKCBzdGVwLCBpbnN0YW50ICl7XG5cblx0XHQvLyBjb25zb2xlLmxvZyhcInBsYXkgc2VxdWVuY2Ugc3RlcFwiKVxuXG5cdFx0dGhpcy5fc3RlcCA9IHN0ZXA7XG5cblx0XHR2YXIgY29sb3IgPSBvbmUuY29sb3IoIHRoaXMuZ2V0Q29sb3IoKSApO1xuXHRcdHZhciBmYWRlID0gaW5zdGFudCA/IDAgOiB0aGlzLl9wYXR0ZXJuLmZhZGU7XG5cdFx0dmFyIHdhaXQgPSB0aGlzLl9wYXR0ZXJuLndhaXQ7XG5cblx0XHR2YXIgaHNsID0ge1xuXHRcdFx0aCA6IE1hdGguZmxvb3IoIGNvbG9yLmgoKSAqIDM2MCksIFxuXHRcdFx0cyA6IE1hdGguZmxvb3IoIGNvbG9yLnMoKSAqIDEwMCksXG5cdFx0XHRsIDogTWF0aC5mbG9vciggY29sb3IubCgpICogMTAwKSBcblx0XHR9O1xuXG5cdFx0aHVlQ29ubmVjdC51cGRhdGUoW3tcblx0XHRcdGlkIDogdGhpcy5fbGlnaHRJZCxcblx0XHRcdGRhdGEgOiB7XG5cdFx0XHRcdGhzbCA6IGhzbCxcblx0XHRcdFx0ZHVyYXRpb24gOiBmYWRlXG5cdFx0XHR9XG5cdFx0fV0pO1xuXG5cdFx0d2luZG93LmNsZWFyVGltZW91dCggdGhpcy5fdGltZW91dCApO1xuXHRcdHRoaXMuX3RpbWVvdXQgPSB3aW5kb3cuc2V0VGltZW91dCgkLnByb3h5KHRoaXMubmV4dFNlcXVlbmNlU3RlcCwgdGhpcyksIHdhaXQqMTAwMCk7XG5cdH0sXG5cdG5leHRTZXF1ZW5jZVN0ZXA6IGZ1bmN0aW9uKCl7XG5cblx0XHR2YXIgdG90YWxTdGVwcyA9IHRoaXMuX3NlcXVlbmNlLmxlbmd0aDtcblx0XHR2YXIgcmVwZWF0ID0gdGhpcy5fcGF0dGVybi5yZXBlYXQ7XG5cblx0XHR0aGlzLl9zdGVwICsrO1xuXHRcdGlmKHRoaXMuX3N0ZXAgPiB0b3RhbFN0ZXBzIC0gMSkge1xuXHRcdFx0dGhpcy5fc3RlcCA9IDA7XG5cdFx0XHR0aGlzLl9pdGVyYXRpb24gKys7XG5cdFx0fVxuXG5cdFx0aWYocmVwZWF0ID4gLTEgJiYgdGhpcy5faXRlcmF0aW9uID4gcmVwZWF0KSB7XG5cdFx0XHR0aGlzLnN0b3BTZXF1ZW5jZSgpO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdHRoaXMucGxheVNlcXVlbmNlU3RlcCggdGhpcy5fc3RlcCApO1xuXHR9XG59XG5cbnZhciBwYXR0ZXJucyA9IHtcblx0J3Rlc3QnIDoge1xuXHRcdGluc3RhbnQgOiBmYWxzZSxcblx0XHRyZXBlYXQgOiAgLTEsXG5cdFx0ZmFkZTogMSxcblx0XHR3YWl0OiAxLFxuXHRcdGNvbG9yczogW1wiI0ZCMTkxMVwiLCBcIiMwMGZmMDBcIiwgXCIjNDE1NkZGXCIsIFwiI0ZGMDAxRFwiLCBcIiNGRkZGMDdcIl0sXG5cdFx0c2VxdWVuY2UgOiBbXVxuXHR9LFxuXHQnYXZhaWxhYmxlJyA6IHtcblx0XHRpbnN0YW50IDogdHJ1ZSxcblx0XHRyZXBlYXQgOiAwLFxuXHRcdGZhZGU6IDEsXG5cdFx0d2FpdDogMCxcblx0XHRjb2xvcnM6IFtcIiMzNTIzZjZcIl0sXG5cdFx0c2VxdWVuY2UgOiBbXVxuXHR9LFxuXHQnb2NjdXBpZWQnIDoge1xuXHRcdGluc3RhbnQgOiB0cnVlLFxuXHRcdHJlcGVhdCA6IDAsXG5cdFx0ZmFkZTogMCxcblx0XHR3YWl0OiAwLFxuXHRcdHN0YXJ0IDogMCxcblx0XHRlbmQgOiAwLFxuXHRcdGNvbG9yczogW1wiIzJkY2MzZFwiLCBcIiNmM2U1MzNcIiwgXCIjZmMzMTJjXCJdLFxuXHRcdHNlcXVlbmNlIDogW11cblx0fVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IExpZ2h0UGF0dGVybjsiLCJ2YXIgTGlnaHRQYXR0ZXJuID0gcmVxdWlyZShcImNvbnRyb2xsZXJzL2xpZ2h0UGF0dGVyblwiKTtcblxuZnVuY3Rpb24gTGlnaHRQYXR0ZXJuQ29udHJvbGxlciggbW9kZWwgKXtcblx0XG5cdHRoaXMuX21vZGVsID0gbW9kZWw7XG5cdHRoaXMuaW5pdCggKTtcbn1cblxuTGlnaHRQYXR0ZXJuQ29udHJvbGxlci5wcm90b3R5cGUgPSB7XG5cdGluaXQgOiBmdW5jdGlvbigpe1xuXG5cdFx0dGhpcy5pc0F2YWlsYWJsZSgpO1xuXHRcdHRoaXMuX21vZGVsLm9uKCBcImNoYW5nZTpjdXJyZW50RXZlbnRcIiwgdGhpcy5jdXJyZW50Q2hhbmdlZCwgdGhpcyAgKTtcblx0fSxcblx0Y3VycmVudENoYW5nZWQgOiBmdW5jdGlvbiggcGFyZW50LCBtb2RlbCApe1xuXG5cdFx0dGhpcy5zdG9wRXhpc3RpbmcoKTtcblxuXHRcdHZhciBkYXRhID0ge307XG5cdFx0dmFyIHR5cGUgPSAnYXZhaWxhYmxlJztcblxuXHRcdGlmKCBtb2RlbCApe1xuXG5cdFx0XHR0eXBlID0gbW9kZWwuZ2V0UGF0dGVyblR5cGUoKTtcblx0XHRcdGRhdGEgPSB7XG5cdFx0XHRcdHN0YXJ0IDogbW9kZWwuZ2V0KFwic3RhcnRcIikucmF3LFxuXHRcdFx0XHRlbmQgOiBtb2RlbC5nZXQoXCJlbmRcIikucmF3XG5cdFx0XHR9XG5cblx0XHR9XG5cdFx0XG5cdFx0dGhpcy5uZXdQYXR0ZXJuKCB0eXBlLCBkYXRhICk7XG5cblx0fSxcblx0aXNBdmFpbGFibGUgOiBmdW5jdGlvbigpe1xuXG5cdFx0dGhpcy5uZXdQYXR0ZXJuKCBcImF2YWlsYWJsZVwiICk7XG5cdH0sXG5cdGdldEN1cnJlbnQgOiBmdW5jdGlvbigpe1xuXG5cdFx0cmV0dXJuIHRoaXMuX2N1cnJlbnRQYXR0ZXJuO1xuXHR9LFxuXHRuZXdQYXR0ZXJuIDogZnVuY3Rpb24oIHR5cGUsIGRhdGEgKXtcblxuXHRcdHZhciBrZXkgPSB0aGlzLl9tb2RlbC5nZXQoXCJrZXlcIik7XG5cblx0XHRkYXRhID0gZGF0YSB8fCB7fTtcblxuXHRcdHRoaXMuc3RvcEV4aXN0aW5nKCk7XG5cblx0XHR0aGlzLl9jdXJyZW50UGF0dGVybiA9IG5ldyBMaWdodFBhdHRlcm4oIGtleSwgdHlwZSwgZGF0YSk7XG5cblx0fSxcblx0c3RvcEV4aXN0aW5nIDogZnVuY3Rpb24oKXtcblxuXHRcdGlmKCB0aGlzLl9jdXJyZW50UGF0dGVybiApe1xuXHRcdFx0dGhpcy5fY3VycmVudFBhdHRlcm4uc3RvcFNlcXVlbmNlKCk7XHRcblx0XHR9XG5cdH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBMaWdodFBhdHRlcm5Db250cm9sbGVyOyIsIm1vZHVsZS5leHBvcnRzID0ge1xuXHQgZ2V0UGFyYW1ldGVyQnlOYW1lIDogZnVuY3Rpb24obmFtZSkge1xuXHQgICAgbmFtZSA9IG5hbWUucmVwbGFjZSgvW1xcW10vLCBcIlxcXFxbXCIpLnJlcGxhY2UoL1tcXF1dLywgXCJcXFxcXVwiKTtcblx0ICAgIHZhciByZWdleCA9IG5ldyBSZWdFeHAoXCJbXFxcXD8mXVwiICsgbmFtZSArIFwiPShbXiYjXSopXCIpLFxuXHQgICAgICAgIHJlc3VsdHMgPSByZWdleC5leGVjKGxvY2F0aW9uLnNlYXJjaCk7XG5cdCAgICByZXR1cm4gcmVzdWx0cyA9PT0gbnVsbCA/IFwiXCIgOiBkZWNvZGVVUklDb21wb25lbnQocmVzdWx0c1sxXS5yZXBsYWNlKC9cXCsvZywgXCIgXCIpKTtcblx0fVxufVxuXG5cbiIsInZhciBDYWxlbmRhckl0ZW1Nb2RlbCA9IEJhY2tib25lLk1vZGVsLmV4dGVuZCh7XG5cdGRlZmF1bHRzIDoge1xuXHRcdHN1bW1hcnkgOiBcIm4vYVwiLFxuXHRcdGRlc2NyaXB0aW9uIDogXCJuL2FcIixcblx0XHRzdGFydCA6IFwibi9hXCIsXG5cdFx0ZW5kIDogXCJuL2FcIixcblx0fSxcblx0aW5pdGlhbGl6ZSA6IGZ1bmN0aW9uKCl7XG5cblx0XHR0aGlzLmNvbnZlcnREYXRlKFwic3RhcnRcIik7XG5cdFx0dGhpcy5jb252ZXJ0RGF0ZShcImVuZFwiKTtcblx0fSxcblx0Y29udmVydERhdGUgOiBmdW5jdGlvbigga2V5ICl7XG5cdFx0Ly9jb252ZXJ0IGRhdGFzXG5cdFx0dmFyIGRhdGVTdHJpbmcgPSB0aGlzLmdldCgga2V5IClcblx0XHRpZighZGF0ZVN0cmluZykgcmV0dXJuO1xuXHRcdFxuXHRcdGRhdGVTdHJpbmcgPSBkYXRlU3RyaW5nLmRhdGVUaW1lO1xuXHRcdHZhciBub3cgPSBuZXcgRGF0ZSgpO1xuXHRcdHZhciBkYXRlID0gbmV3IERhdGUoIGRhdGVTdHJpbmcgKTtcblxuXHRcdHRoaXMuc2V0KCBrZXksIHtcblx0XHRcdHJhdyA6IGRhdGUsXG5cdFx0XHR0d2VsdmVIb3VyIDogdGhpcy5nZXRUd2VsdmVIb3VyKGRhdGUpLFxuXHRcdFx0Zm9ybWF0dGVkIDogZGF0ZS50b1N0cmluZygpXG5cdFx0fSk7XG5cdH0sXG5cdGdldFR3ZWx2ZUhvdXIgOiBmdW5jdGlvbiAoZGF0ZSkge1xuXHQgIHZhciBob3VycyA9IGRhdGUuZ2V0SG91cnMoKTtcblx0ICB2YXIgbWludXRlcyA9IGRhdGUuZ2V0TWludXRlcygpO1xuXHQgIHZhciBhbXBtID0gaG91cnMgPj0gMTIgPyAncG0nIDogJ2FtJztcblx0ICBob3VycyA9IGhvdXJzICUgMTI7XG5cdCAgaG91cnMgPSBob3VycyA/IGhvdXJzIDogMTI7IC8vIHRoZSBob3VyICcwJyBzaG91bGQgYmUgJzEyJ1xuXHQgIG1pbnV0ZXMgPSBtaW51dGVzIDwgMTAgPyAnMCcrbWludXRlcyA6IG1pbnV0ZXM7XG5cdCAgdmFyIHN0clRpbWUgPSBob3VycyArICc6JyArIG1pbnV0ZXMgKyAnICcgKyBhbXBtO1xuXHQgIHJldHVybiBzdHJUaW1lO1xuXHR9LFxuXHRpc0FjdGl2ZSA6IGZ1bmN0aW9uKCl7XG5cdFx0XG5cdFx0IHZhciBzdGFydCA9IHRoaXMuZ2V0KFwic3RhcnRcIikucmF3O1xuXHRcdCB2YXIgZW5kID0gdGhpcy5nZXQoXCJlbmRcIikucmF3O1xuXHRcdCB2YXIgbm93ID0gbmV3IERhdGUoKTtcblxuXHRcdCBpZiggbm93ID4gc3RhcnQgJiYgbm93IDwgZW5kICl7XG5cdFx0IFx0cmV0dXJuIHRydWU7XG5cdFx0IH1cblxuXHRcdCByZXR1cm4gZmFsc2U7XG5cdH0sXG5cdGdldFBhdHRlcm5UeXBlIDogZnVuY3Rpb24oKXtcblxuXHRcdHZhciB0eXBlID0gXCJvY2N1cGllZFwiO1xuXHRcdHJldHVybiB0eXBlO1xuXHR9XG59KVxuXG5tb2R1bGUuZXhwb3J0cyA9IENhbGVuZGFySXRlbU1vZGVsOyIsInZhciBDYWxlbmRhckl0ZW1Nb2RlbCBcdD0gcmVxdWlyZShcIm1vZGVscy9jYWxlbmRhckl0ZW1Nb2RlbFwiKTtcblxudmFyIENhbGVuZGFyTW9kZWwgPSBCYWNrYm9uZS5Nb2RlbC5leHRlbmQoe1xuXHRkZWZhdWx0cyA6IHtcblx0XHRvcmdhbml6ZXIgOiBcIldlc1wiXG5cdH0sXG5cdGluaXRpYWxpemUgOiBmdW5jdGlvbigpe1xuXG5cdFx0Xy5iaW5kQWxsKCB0aGlzLCBcImdldEN1cnJlbnRcIiwgXCJjaGVja1RpbWVcIiApO1xuXG5cdFx0dGhpcy5saXN0ZW5UbyggdGhpcywgXCJjaGFuZ2U6dXBkYXRlZFwiLCB0aGlzLnVwZGF0ZUV2ZW50cyApO1xuXHRcdHRoaXMubGlzdGVuVG8oIHRoaXMsIFwiY2hhbmdlOnVwZGF0ZWRcIiwgdGhpcy5nZXRDdXJyZW50ICk7XG5cdFx0dGhpcy5saXN0ZW5UbyggdGhpcywgXCJjaGFuZ2U6Y3VycmVudEV2ZW50XCIsIHRoaXMuY2hhbmdlQ3VycmVudCApO1xuXG5cdFx0c2V0SW50ZXJ2YWwoIHRoaXMuZ2V0Q3VycmVudCwgMTAwMCApO1xuXHR9LFxuXHRnZXRDdXJyZW50IDogZnVuY3Rpb24oKXtcblxuXHRcdHZhciBldmVudENvbGxlY3Rpb24gPSB0aGlzLmdldChcImV2ZW50Q29sbGVjdGlvblwiKTtcblxuXHRcdC8vZ2V0dGluZyBjdXJyZW50IGV2ZW50XG5cdFx0dmFyIGN1cnJlbnQgPSBldmVudENvbGxlY3Rpb24uZ2V0Q3VycmVudCgpO1xuXHRcdFxuXHRcdHRoaXMuc2V0KFwiY3VycmVudEV2ZW50RGF0YVwiLCBjdXJyZW50ID8gY3VycmVudC50b0pTT04oKSA6IG51bGwpO1xuXHRcdHRoaXMuc2V0KFwiY3VycmVudEV2ZW50XCIsIGN1cnJlbnQgKTtcdFxuXHR9LFxuXHRjaGFuZ2VDdXJyZW50IDogZnVuY3Rpb24odmlldywgbW9kZWwpe1xuXG5cdFx0aWYobW9kZWwpe1xuXHRcdFx0dGhpcy5zdGFydENoZWNraW5nVGltZSgpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR0aGlzLnN0b3BDaGVja2luZ1RpbWUoKTtcblx0XHR9XG5cdH0sXG5cdHN0YXJ0Q2hlY2tpbmdUaW1lIDogZnVuY3Rpb24oKXtcblxuXHRcdHRoaXMuc3RvcENoZWNraW5nVGltZSgpO1xuXHRcdHRoaXMuX3RpbWVDaGVja2VyID0gc2V0SW50ZXJ2YWwoIHRoaXMuY2hlY2tUaW1lLCAxMDAwICk7XG5cdH0sXG5cdHN0b3BDaGVja2luZ1RpbWUgOiBmdW5jdGlvbigpe1xuXG5cdFx0d2luZG93LmNsZWFySW50ZXJ2YWwoIHRoaXMuX3RpbWVDaGVja2VyICk7XG5cdH0sXG5cdGNoZWNrVGltZSA6IGZ1bmN0aW9uKCl7XG5cdFx0XG5cdFx0dmFyIG1vZGVsID0gdGhpcy5nZXQoXCJjdXJyZW50RXZlbnRcIik7XG5cdFx0dmFyIGVuZCA9IG1vZGVsLmdldChcImVuZFwiKS5yYXc7XG5cdFx0dmFyIG5vdyA9IG5ldyBEYXRlKCk7XG5cdFx0dmFyIHRpbWUgPSBlbmQgLSBub3c7XG5cblx0XHR2YXIgc2Vjb25kcywgbWludXRlcywgaG91cnMsIHg7XG5cblx0XHR4ID0gdGltZSAvIDEwMDBcblx0XHRzZWNvbmRzID0gTWF0aC5mbG9vciggeCAlIDYwICk7XG5cdFx0eCAvPSA2MFxuXHRcdG1pbnV0ZXMgPSBNYXRoLmZsb29yKCB4ICUgNjAgKTtcblx0XHR4IC89IDYwXG5cdFx0aG91cnMgPSBNYXRoLmZsb29yKCB4ICUgMjQgKTtcblxuXHRcdHRoaXMuc2V0KFwidGltZUxlZnRcIiwge1xuXHRcdFx0aG91cnMgOiBob3Vycyxcblx0XHRcdG1pbnV0ZXMgOiBtaW51dGVzLFxuXHRcdFx0c2Vjb25kcyA6IHNlY29uZHNcblx0XHR9KTtcblx0fSxcblx0dXBkYXRlRXZlbnRzIDogZnVuY3Rpb24oKXtcblxuXHRcdHZhciBldmVudENvbGxlY3Rpb24gPSB0aGlzLmdldChcImV2ZW50Q29sbGVjdGlvblwiKTtcblxuXHRcdHZhciByb29tRGF0YSA9IHRoaXMuZ2V0KFwicm9vbURhdGFcIik7XG5cdFx0dmFyIG5ld01vZGVscyA9IFtdO1xuXG5cdFx0aWYoICFyb29tRGF0YSApIHJldHVybjtcblxuXHRcdF8uZWFjaCggcm9vbURhdGEuaXRlbXMsIGZ1bmN0aW9uKCBpdGVtICl7XG5cblx0XHRcdHZhciBtID0gbmV3IENhbGVuZGFySXRlbU1vZGVsKCBpdGVtICk7XG5cdFx0XHRtLnNldChcImtleVwiLCB0aGlzLmdldChcImtleVwiKSk7XG5cdFx0XHRuZXdNb2RlbHMucHVzaCggbSApO1xuXHRcdH0sIHRoaXMpO1xuXG5cdFx0ZXZlbnRDb2xsZWN0aW9uLnJlc2V0KCBuZXdNb2RlbHMgKTtcblx0fSxcblx0Z2V0TGlnaHRQYXR0ZXJuIDogZnVuY3Rpb24oKXtcblxuXHRcdHZhciBsaWdodFBhdHRlcm5Db250cm9sbGVyID0gdGhpcy5nZXQoXCJsaWdodFBhdHRlcm5Db250cm9sbGVyXCIpO1xuXHRcdHJldHVybiBsaWdodFBhdHRlcm5Db250cm9sbGVyLmdldEN1cnJlbnQoKTtcblx0fVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gQ2FsZW5kYXJNb2RlbDsiLCJ2YXIgc3RhdGUgPSBuZXcgKEJhY2tib25lLk1vZGVsLmV4dGVuZCh7XG5cdGRlZmF1bHRzIDoge1xuXHRcdC8vIFwibmF2X29wZW5cIiBcdFx0OiBmYWxzZSxcblx0XHQvLyAnc2Nyb2xsX2F0X3RvcCcgOiB0cnVlLFxuXHRcdC8vICdtaW5pbWFsX25hdicgXHQ6IGZhbHNlLFxuXHRcdC8vICdmdWxsX25hdl9vcGVuJ1x0OiBmYWxzZSxcblx0XHQvLyAndWlfZGlzcGxheSdcdDogZmFsc2Vcblx0fVxufSkpKCk7XG5cbm1vZHVsZS5leHBvcnRzID0gc3RhdGU7XG4iLCJ2YXIgcGlwZSA9IF8uZXh0ZW5kKHtcblxuXHRcblx0XG59LCBCYWNrYm9uZS5FdmVudHMpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHBpcGU7IiwibW9kdWxlLmV4cG9ydHMgPSB7XG5cdCcxJzoge1xuXHRcdCdjYWxlbmRhcklkJyA6IFwiYi1yZWVsLmNvbV8yZDMyMzgzNzM5MzYzNjMyMzIzNzM4MzFAcmVzb3VyY2UuY2FsZW5kYXIuZ29vZ2xlLmNvbVwiXG5cdH0sXG5cdCcyJzoge1xuXHRcdCdjYWxlbmRhcklkJyA6IFwiYi1yZWVsLmNvbV8yZDMxMzIzNzM3MzgzODMzMzQyZDMyMzQzMkByZXNvdXJjZS5jYWxlbmRhci5nb29nbGUuY29tXCJcblx0fSxcblx0JzMnOiB7XG5cdFx0J2NhbGVuZGFySWQnIDogXCJiLXJlZWwuY29tXzMxMzYzNTMzMzkzNjMxMzkzOTMzMzhAcmVzb3VyY2UuY2FsZW5kYXIuZ29vZ2xlLmNvbVwiXG5cdH0sXG5cdCc1Jzoge1xuXHRcdCdjYWxlbmRhcklkJyA6IFwiYi1yZWVsLmNvbV8yZDM0MzQzMjM4MzkzNjM3MzAyZDM2MzQzM0ByZXNvdXJjZS5jYWxlbmRhci5nb29nbGUuY29tXCJcblx0fVxufTsiLCJtb2R1bGUuZXhwb3J0cyA9IFwiPGgyPjwlPSBzdW1tYXJ5ICU+PC9oMj5cXG5cXG48aDM+ZGVzY3JpcHRpb24gOiA8JT0gZGVzY3JpcHRpb24gJT48L2gzPlxcblxcbjxoMz5zdGFydCA6IDwlPSBzdGFydC50d2VsdmVIb3VyICU+PC9oMz5cXG5cXG48aDM+ZW5kIDogPCU9IGVuZC50d2VsdmVIb3VyICU+PC9oMz5cIjtcbiIsIm1vZHVsZS5leHBvcnRzID0gXCI8ZGl2IGlkPVxcXCJldmVudC1saXN0LWNvbnRhaW5lclxcXCI+PC9kaXY+XCI7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IFwiPGRpdiBpZD1cXFwic3BsYXNoLXBhZ2VcXFwiPjwvZGl2PlxcblxcbjxkaXYgaWQ9XFxcInJvb20tc2luZ2xlXFxcIj48L2Rpdj5cXG5cXG48IS0tIFRFU1QgLS0+XFxuPGRpdiBjbGFzcz1cXFwidGVzdFxcXCIgc3R5bGU9XFxcInBvc2l0aW9uOmFic29sdXRlO3RvcDowO1xcXCI+XFxuXFx0PGRpdj5cXG5cXHRcXHQ8aW5wdXQgaWQ9XFxcImhleC1pbnB1dFxcXCIgdHlwZT1cXFwidGV4dFxcXCI+PC9pbnB1dD5cXG5cXHRcXHQ8YnV0dG9uIGlkPVxcXCJoZXhcXFwiPmhleDwvYnV0dG9uPlxcblxcdDwvZGl2PlxcblxcdDxidXR0b24gaWQ9XFxcInRlc3RcXFwiPnRlc3Q8L2J1dHRvbj5cXG5cXHQ8aW5wdXQgY2xhc3M9XFxcImNvbG9yXFxcIiB0eXBlPVxcXCJjb2xvclxcXCIgbmFtZT1cXFwiZmF2Y29sb3JcXFwiPlxcbjwvZGl2PlwiO1xuIiwibW9kdWxlLmV4cG9ydHMgPSBcIjxkaXYgY2xhc3M9XFxcIm51bWJlclxcXCI+PCU9IGtleSAlPjwvZGl2PlxcbjxkaXYgY2xhc3M9XFxcImNpcmNsZVxcXCI+XFxuXFx0PGRpdiBjbGFzcz1cXFwiZ3JhcGggcm9vbS08JT0ga2V5ICU+XFxcIj48L2Rpdj5cXG48L2Rpdj5cXG48ZGl2IGNsYXNzPVxcXCJhdmFpbGFiaWxpdHlcXFwiPlxcblxcdDxwPjwlPSBjdXJyZW50RXZlbnREYXRhID8gY3VycmVudEV2ZW50RGF0YS5zdW1tYXJ5IDogJ25vdGhpbmcnICU+PC9wPlxcblxcdDxwIGNsYXNzPVxcXCJ0aW1lXFxcIj48L3A+XFxuPC9kaXY+XCI7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IFwiPCUgXy5lYWNoKCByb29tRGF0YSwgZnVuY3Rpb24oIGRhdGEsIGtleSApeyAlPlxcblxcdDxkaXYgY2xhc3M9XFxcInJvb20tY29udGFpbmVyXFxcIiBpZD1cXFwicm9vbS08JT0ga2V5ICU+XFxcIiBkYXRhLWlkPVxcXCI8JT0ga2V5ICU+XFxcIj5cXG5cXHQ8L2Rpdj5cXG48JSB9KTsgJT5cIjtcbiIsIm1vZHVsZS5leHBvcnRzID0gXCI8c3BhbiBjbGFzcz1cXFwiaG91cnNcXFwiPjwlPSBob3VycyAlPjwvc3Bhbj48c3BhbiBjbGFzcz1cXFwiY29sb25cXFwiIDwlIGlmIChzaG93Q29sb24pIHsgJT5zdHlsZT1cXFwidmlzaWJpbGl0eTpoaWRkZW47XFxcIjwlIH0gJT4gPjo8L3NwYW4+PHNwYW4gY2xhc3M9XFxcIm1pbnV0ZXNcXFwiPjwlPSBtaW51dGVzICU+PC9zcGFuPlwiO1xuIiwidmFyIFN0YXRlIFx0XHQ9IHJlcXVpcmUoXCJtb2RlbHMvc3RhdGVcIik7XG5cbnZhciBNeUFwcExheW91dCA9IE1hcmlvbmV0dGUuTGF5b3V0Vmlldy5leHRlbmQoe1xuXHRlbCA6IFwiI2NvbnRlbnRcIixcblx0dGVtcGxhdGUgOiBmYWxzZSxcblx0cmVnaW9ucyA6IHtcblx0XHRtYWluIDogXCIjbWFpblwiXG5cdH0sIFxuXHRpbml0aWFsaXplIDogZnVuY3Rpb24oKXtcblx0XHR2YXIgX3RoaXMgPSB0aGlzO1xuXG5cdFx0Ly93cmFwcGluZyBodG1sXG5cdFx0dGhpcy4kaHRtbCA9ICQoXCJodG1sXCIpO1xuXHRcdHRoaXMuJGh0bWwucmVtb3ZlQ2xhc3MoXCJoaWRkZW5cIik7XG5cblx0XHQvL3Jlc2l6ZSBldmVudHNcblx0XHQkKHdpbmRvdykucmVzaXplKGZ1bmN0aW9uKCl7XG5cdFx0XHRfdGhpcy5vblJlc2l6ZVdpbmRvdygpO1xuXHRcdH0pLnJlc2l6ZSgpO1xuXG5cdFx0dGhpcy5saXN0ZW5Gb3JTdGF0ZSgpO1xuXHR9LFxuXHRsaXN0ZW5Gb3JTdGF0ZSA6IGZ1bmN0aW9uKCl7XG5cdFx0Ly9zdGF0ZSBjaGFuZ2Vcblx0XHR0aGlzLmxpc3RlblRvKCBTdGF0ZSwgXCJjaGFuZ2VcIiwgZnVuY3Rpb24oIGUgKXtcblxuXHRcdFx0dGhpcy5vblN0YXRlQ2hhbmdlKCBlLmNoYW5nZWQsIGUuX3ByZXZpb3VzQXR0cmlidXRlcyApO1xuXHRcdH0sIHRoaXMpO1xuXHRcdHRoaXMub25TdGF0ZUNoYW5nZSggU3RhdGUudG9KU09OKCkgKTtcblx0fSxcblx0b25TdGF0ZUNoYW5nZSA6IGZ1bmN0aW9uKCBjaGFuZ2VkLCBwcmV2aW91cyApe1xuXG5cdFx0Xy5lYWNoKCBjaGFuZ2VkLCBmdW5jdGlvbih2YWx1ZSwga2V5KXtcblx0XHRcdFxuXHRcdFx0aWYoIF8uaXNCb29sZWFuKCB2YWx1ZSApICl7XG5cdFx0XHRcdHRoaXMuJGh0bWwudG9nZ2xlQ2xhc3MoXCJzdGF0ZS1cIitrZXksIHZhbHVlKTtcblx0XHRcdFx0dGhpcy4kaHRtbC50b2dnbGVDbGFzcyhcInN0YXRlLW5vdC1cIitrZXksICF2YWx1ZSk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR2YXIgcHJldlZhbHVlID0gcHJldmlvdXNbIGtleSBdO1xuXHRcdFx0XHRpZihwcmV2VmFsdWUpe1xuXHRcdFx0XHRcdHRoaXMuJGh0bWwudG9nZ2xlQ2xhc3MoXCJzdGF0ZS1cIitrZXkrXCItXCIrcHJldlZhbHVlLCBmYWxzZSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0dGhpcy4kaHRtbC50b2dnbGVDbGFzcyhcInN0YXRlLVwiK2tleStcIi1cIit2YWx1ZSwgdHJ1ZSk7XG5cdFx0XHR9XG5cblx0XHR9LCB0aGlzICk7XG5cdH0sXG5cdG9uUmVzaXplV2luZG93IDogZnVuY3Rpb24oKXtcblx0XHRcblx0XHRDb21tb24ud3cgPSAkKHdpbmRvdykud2lkdGgoKTtcblx0XHRDb21tb24ud2ggPSAkKHdpbmRvdykuaGVpZ2h0KCk7XG5cdH1cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IG5ldyBNeUFwcExheW91dCgpOyIsInZhciBDYWxlbmRhckl0ZW0gPSBNYXJpb25ldHRlLkl0ZW1WaWV3LmV4dGVuZCh7XG5cdGNsYXNzTmFtZSA6ICdpdGVtJyxcblx0dGFnTmFtZSA6ICdsaScsXG5cdHRlbXBsYXRlIDogXy50ZW1wbGF0ZSggcmVxdWlyZShcInRlbXBsYXRlcy9jYWxlbmRhckl0ZW0uaHRtbFwiKSApLFxuXHR1aSA6IHtcblx0XHQndGl0bGUnIDogXCJoMlwiXG5cdH0sXG5cdGV2ZW50cyA6IHtcblx0XHQnY2xpY2sgQHVpLnRpdGxlJyA6IGZ1bmN0aW9uKCl7XG5cblxuXHRcdH1cblx0fVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gQ2FsZW5kYXJJdGVtOyIsInZhciBDYWxlbmRhckl0ZW0gXHQ9IHJlcXVpcmUoXCJ2aWV3cy9jYWxlbmRhckl0ZW1cIik7XG52YXIgQXBwUm91dGVyIFx0XHQ9IHJlcXVpcmUoIFwiY29udHJvbGxlcnMvYXBwUm91dGVyXCIgKTtcblxudmFyIENhbGVuZGFyU2luZ2xlID0gTWFyaW9uZXR0ZS5MYXlvdXRWaWV3LmV4dGVuZCh7XG5cdHRlbXBsYXRlIDogXy50ZW1wbGF0ZSggcmVxdWlyZShcInRlbXBsYXRlcy9jYWxlbmRhclNpbmdsZS5odG1sXCIpICksXG5cdHJlZ2lvbnMgOiB7XG5cdFx0ZXZlbnRMaXN0Q29udGFpbmVyIDogXCIjZXZlbnQtbGlzdC1jb250YWluZXJcIlxuXHR9LFxuXHR1aSA6IHtcblx0fSxcblx0ZXZlbnRzIDoge1xuXHR9LFxuXHRpbml0aWFsaXplIDogZnVuY3Rpb24oKXtcblxuXHRcdHRoaXMuY29sbGVjdGlvblZpZXcgPSBuZXcgTWFyaW9uZXR0ZS5Db2xsZWN0aW9uVmlldyh7XG5cdFx0XHR0YWdOYW1lIDogJ3VsJyxcblx0XHRcdGlkIDogJ2V2ZW50LWxpc3QnLFxuXHRcdFx0Y2hpbGRWaWV3IDogQ2FsZW5kYXJJdGVtLFxuXHRcdFx0Y29sbGVjdGlvbiA6IHRoaXMubW9kZWwuZ2V0KFwiZXZlbnRDb2xsZWN0aW9uXCIpXG5cdFx0fSk7XG5cdH0sXG5cdG9uU2hvdyA6IGZ1bmN0aW9uKCl7XG5cblx0XHR0aGlzLmdldFJlZ2lvbiggXCJldmVudExpc3RDb250YWluZXJcIiApLnNob3coIHRoaXMuY29sbGVjdGlvblZpZXcgKTtcblx0fSxcblx0b25DbG9zZSA6IGZ1bmN0aW9uKCl7XG5cblx0XHRBcHBSb3V0ZXIubmF2aWdhdGUoXCIvXCIsIHt0cmlnZ2VyOiB0cnVlfSk7XG5cdH1cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IENhbGVuZGFyU2luZ2xlOyIsInZhciBBcHBSb3V0ZXIgXHRcdD0gcmVxdWlyZSggXCJjb250cm9sbGVycy9hcHBSb3V0ZXJcIiApO1xuXG52YXIgY2FsZW5kYXJMb2FkID0gcmVxdWlyZShcImNvbnRyb2xsZXJzL2NhbGVuZGFyTG9hZFwiKTtcbnZhciBDYWxlbmRhclNpbmdsZSBcdD0gcmVxdWlyZShcInZpZXdzL2NhbGVuZGFyU2luZ2xlXCIpO1xudmFyIENhbGVuZGFyTW9kZWwgXHQ9IHJlcXVpcmUoXCJtb2RlbHMvY2FsZW5kYXJNb2RlbFwiKTtcbnZhciBDYWxlbmRhckl0ZW1Nb2RlbCBcdD0gcmVxdWlyZShcIm1vZGVscy9jYWxlbmRhckl0ZW1Nb2RlbFwiKTtcbnZhciBDYWxlbmRhckNvbGxlY3Rpb24gXHQ9IHJlcXVpcmUoXCJjb2xsZWN0aW9ucy9jYWxlbmRhckNvbGxlY3Rpb25cIik7XG52YXIgU3BsYXNoVmlldyBcdD0gcmVxdWlyZShcInZpZXdzL3NwbGFzaFZpZXdcIik7XG5cbnZhciBodWVDb25uZWN0ID0gcmVxdWlyZShcImNvbnRyb2xsZXJzL2h1ZUNvbm5lY3RcIik7XG52YXIgTGlnaHRQYXR0ZXJuID0gcmVxdWlyZShcImNvbnRyb2xsZXJzL2xpZ2h0UGF0dGVyblwiKTtcbnZhciBMaWdodFBhdHRlcm5Db250cm9sbGVyID0gcmVxdWlyZShcImNvbnRyb2xsZXJzL2xpZ2h0UGF0dGVybkNvbnRyb2xsZXJcIik7XG5cbnZhciBDYWxlbmRhclZpZXcgPSBNYXJpb25ldHRlLkxheW91dFZpZXcuZXh0ZW5kKHtcblx0dGVtcGxhdGUgOiBfLnRlbXBsYXRlKCByZXF1aXJlKFwidGVtcGxhdGVzL2NhbGVuZGFyV3JhcHBlci5odG1sXCIpICksXG5cdHJlZ2lvbnMgOiB7XG5cdFx0cm9vbVNpbmdsZSA6IFwiI3Jvb20tc2luZ2xlXCIsXG5cdFx0c3BsYXNoUGFnZSA6IFwiI3NwbGFzaC1wYWdlXCJcblx0fSxcblx0dWkgOiB7XG5cdFx0Y29sb3JQaWNrZXIgOiBcIi5jb2xvclwiLFxuXHRcdHRlc3QgOiBcIiN0ZXN0XCIsXG5cdFx0aGV4QnV0dG9uIDogXCIjaGV4XCIsXG5cdFx0aGV4SW5wdXQgOiBcIiNoZXgtaW5wdXRcIlxuXHR9LFxuXHRldmVudHMgOiB7XG5cdFx0XCJjbGljayBAdWkudGVzdFwiIDogZnVuY3Rpb24oKXtcblx0XHRcdGZvciggdmFyIGkgPSAwIDsgaSA8IDUgOyBpKysgKXtcblx0XHRcdFx0bmV3IExpZ2h0UGF0dGVybihpKzEsIFwidGVzdFwiKTtcblx0XHRcdH1cblx0XHR9LFxuXHRcdFwiY2xpY2sgQHVpLmhleEJ1dHRvblwiIDogZnVuY3Rpb24oKXtcblx0XHRcdHZhciBjb2xvciA9IHRoaXMudWkuaGV4SW5wdXQudmFsKCk7XG5cdFx0XHR0aGlzLnRlc3RDb2xvciggY29sb3IgKTtcblx0XHR9XG5cdH0sXG5cdGluaXRpYWxpemUgOiBmdW5jdGlvbigpe1xuXHRcdFxuXHRcdHRoaXMuY2FsZW5kYXJTdG9yZSA9IHt9O1xuXHRcdHRoaXMubGlzdGVuVG8oIGh1ZUNvbm5lY3QuZXZlbnRzLCBcImV2ZW50c0xvYWRlZFwiLCB0aGlzLmV2ZW50c0xvYWRlZCApO1xuXHR9LFxuXHRvblNob3cgOiBmdW5jdGlvbigpe1xuXG5cdFx0dmFyIGNvbG9yUGlja2VyID0gdGhpcy51aS5jb2xvclBpY2tlcjtcblx0XHR2YXIgX3RoaXMgPSB0aGlzO1xuXHRcdCQoY29sb3JQaWNrZXIpLmNoYW5nZShmdW5jdGlvbigpe1xuXHRcdFx0dmFyIHZhbCA9ICQodGhpcykudmFsKCk7XG5cdFx0XHRfdGhpcy50ZXN0Q29sb3IoIHZhbCApO1xuXHRcdH0pO1xuXG5cdFx0dGhpcy5fc3BsYXNoVmlldyA9IG5ldyBTcGxhc2hWaWV3KHsgbW9kZWwgOiBuZXcgQmFja2JvbmUuTW9kZWwoeyByb29tcyA6IHt9LCByb29tc0RhdGEgOiB7fSB9KSB9KSA7XG5cblx0XHR0aGlzLmdldFJlZ2lvbihcInNwbGFzaFBhZ2VcIikuc2hvdyggdGhpcy5fc3BsYXNoVmlldyApO1xuXG5cdFx0dGhpcy5saXN0ZW5UbyggQXBwUm91dGVyLCBcInJvdXRlOnJvb21Sb3V0ZVwiLCBmdW5jdGlvbigga2V5ICl7XG5cdFx0XHRcblx0XHRcdHRoaXMuc2hvd1Jvb20oIGtleSApO1xuXHRcdH0pO1xuXHRcdHRoaXMubGlzdGVuVG8oIEFwcFJvdXRlciwgXCJyb3V0ZTpkZWZhdWx0Um91dGVcIiwgdGhpcy5zaG93U3BsaXQgKTtcblx0fSxcblx0c2hvd1NwbGl0IDogZnVuY3Rpb24oKXtcblxuXHRcdHZhciAkc3BsaXRFbCA9IHRoaXMuZ2V0UmVnaW9uKCBcInNwbGFzaFBhZ2VcIiApLiRlbDtcblx0XHR2YXIgJHNpbmdsZUVsID0gdGhpcy5nZXRSZWdpb24oIFwicm9vbVNpbmdsZVwiICkuJGVsO1xuXG5cdFx0JHNwbGl0RWwuc2hvdygpO1xuXHRcdCRzaW5nbGVFbC5oaWRlKCk7XG5cdH0sXG5cdHNob3dSb29tIDogZnVuY3Rpb24oIGtleSApe1xuXG5cdFx0dmFyICRzcGxpdEVsID0gdGhpcy5nZXRSZWdpb24oIFwic3BsYXNoUGFnZVwiICkuJGVsO1xuXHRcdFxuXHRcdHZhciBtb2RlbCA9IHRoaXMuY2FsZW5kYXJTdG9yZVsga2V5IF07XG5cblx0XHRpZiggIW1vZGVsICl7XG5cdFx0XHR0aGlzLnF1ZXVlZEtleSA9IGtleTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0XG5cdFx0XHR2YXIgdmlldyA9IG5ldyBDYWxlbmRhclNpbmdsZSh7IG1vZGVsIDogbW9kZWwgfSk7XG5cdFx0XHR2YXIgcmVnaW9uID0gdGhpcy5nZXRSZWdpb24oIFwicm9vbVNpbmdsZVwiICkuc2hvdyggdmlldyApO1xuXHRcdFx0JHNpbmdsZUVsID0gcmVnaW9uLiRlbDtcblxuXHRcdFx0JHNpbmdsZUVsLnNob3coKTtcblx0XHRcdCRzcGxpdEVsLmhpZGUoKTtcblx0XHR9XG5cdH0sXG5cdGNoZWNrUXVldWUgOiBmdW5jdGlvbigpe1xuXG5cdFx0aWYoIHRoaXMucXVldWVkS2V5ICl7XG5cdFx0XHR0aGlzLnNob3dSb29tKCB0aGlzLnF1ZXVlZEtleSApO1xuXHRcdH1cblx0fSxcblx0dGVzdENvbG9yIDogZnVuY3Rpb24oIF9jb2xvciApe1xuXG5cdFx0dmFyIGNvbG9yID0gb25lLmNvbG9yKCBfY29sb3IgKTtcblx0XHR2YXIgaHNsID0ge1xuXHRcdFx0aCA6IE1hdGguZmxvb3IoIGNvbG9yLmgoKSAqIDM2MCksIFxuXHRcdFx0cyA6IE1hdGguZmxvb3IoIGNvbG9yLnMoKSAqIDEwMCksXG5cdFx0XHRsIDogTWF0aC5mbG9vciggY29sb3IubCgpICogMTAwKSBcblx0XHR9O1xuXHRcdGh1ZUNvbm5lY3QudXBkYXRlKFtcblx0XHRcdHtcblx0XHRcdFx0J2lkJyA6IDEsXG5cdFx0XHRcdCdkYXRhJyA6IHtcblx0XHRcdFx0XHQnaHNsJyA6IGhzbCxcblx0XHRcdFx0XHQnZHVyYXRpb24nIDogMVxuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHQnaWQnIDogMixcblx0XHRcdFx0J2RhdGEnIDoge1xuXHRcdFx0XHRcdCdoc2wnIDogaHNsLFxuXHRcdFx0XHRcdCdkdXJhdGlvbicgOiAxXG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHR7XG5cdFx0XHRcdCdpZCcgOiAzLFxuXHRcdFx0XHQnZGF0YScgOiB7XG5cdFx0XHRcdFx0J2hzbCcgOiBoc2wsXG5cdFx0XHRcdFx0J2R1cmF0aW9uJyA6IDFcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0J2lkJyA6IDQsXG5cdFx0XHRcdCdkYXRhJyA6IHtcblx0XHRcdFx0XHQnaHNsJyA6IGhzbCxcblx0XHRcdFx0XHQnZHVyYXRpb24nIDogMVxuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHQnaWQnIDogNSxcblx0XHRcdFx0J2RhdGEnIDoge1xuXHRcdFx0XHRcdCdoc2wnIDogaHNsLFxuXHRcdFx0XHRcdCdkdXJhdGlvbicgOiAxXG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRdKTtcdFx0XG5cdH0sXG5cdGV2ZW50c0xvYWRlZCA6IGZ1bmN0aW9uKCBkYXRhICl7XG5cblx0XHRjb25zb2xlLmxvZyhkYXRhKTtcblx0XHRcblx0XHR2YXIga2V5ID0gZGF0YS5rZXk7XG5cdFx0dmFyIG15Q2FsZW5kYXJNb2RlbCA9IHRoaXMuY2FsZW5kYXJTdG9yZVsga2V5IF07XG5cdFx0XG5cdFx0aWYoICAhbXlDYWxlbmRhck1vZGVsICl7XG5cblx0XHRcdG15Q2FsZW5kYXJNb2RlbCA9IG5ldyBDYWxlbmRhck1vZGVsKHtcblx0XHRcdFx0a2V5IDoga2V5LFxuXHRcdFx0XHRldmVudENvbGxlY3Rpb24gOiBuZXcgQ2FsZW5kYXJDb2xsZWN0aW9uKClcblx0XHRcdH0pO1xuXHRcdFx0XG5cdFx0XHR0aGlzLmNhbGVuZGFyU3RvcmVbIGtleSBdID0gbXlDYWxlbmRhck1vZGVsO1xuXHRcdFx0dmFyIGxpZ2h0UGF0dGVybkNvbnRyb2xsZXIgPSBuZXcgTGlnaHRQYXR0ZXJuQ29udHJvbGxlciggbXlDYWxlbmRhck1vZGVsICk7XG5cdFx0XHRteUNhbGVuZGFyTW9kZWwuc2V0KFwibGlnaHRQYXR0ZXJuQ29udHJvbGxlclwiLCBsaWdodFBhdHRlcm5Db250cm9sbGVyKTtcblx0XHRcdHRoaXMuX3NwbGFzaFZpZXcuYWRkUm9vbSggbXlDYWxlbmRhck1vZGVsICk7XG5cdFx0fSBcblxuXHRcdHZhciByb29tRGF0YSA9IGRhdGEuZGF0YTtcblx0XHR2YXIgdXBkYXRlZCA9IHJvb21EYXRhLnVwZGF0ZWQ7XG5cblx0XHRteUNhbGVuZGFyTW9kZWwuc2V0KFwicm9vbURhdGFcIiwgcm9vbURhdGEpO1xuXHRcdG15Q2FsZW5kYXJNb2RlbC5zZXQoXCJ1cGRhdGVkXCIsIHVwZGF0ZWQpO1xuXG5cdFx0dGhpcy5jaGVja1F1ZXVlKCk7XG5cdH0gXG59KTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IENhbGVuZGFyVmlldzsgICAgICAgICAgICAgICAgICAgIFxuICAgIFxuICIsInZhciBUaW1lRGlzcGxheVRlbXBsYXRlID0gXy50ZW1wbGF0ZSggcmVxdWlyZShcInRlbXBsYXRlcy90aW1lRGlzcGxheS5odG1sXCIpICk7XG5cbnZhciBTcGxhc2hJdGVtVmlldyA9IE1hcmlvbmV0dGUuSXRlbVZpZXcuZXh0ZW5kKHtcblx0dGVtcGxhdGUgOiBfLnRlbXBsYXRlKCByZXF1aXJlKFwidGVtcGxhdGVzL3NwbGFzaEl0ZW0uaHRtbFwiKSApLFxuXHR0YWdOYW1lIDogXCJzZWN0aW9uXCIsXG5cdGNsYXNzTmFtZSA6IFwicm9vbVwiLFxuXHR1aToge1xuXHRcdHRpbWVEaXNwbGF5OiAnLnRpbWUnXG5cdH0sXG5cdGluaXRpYWxpemUgOiBmdW5jdGlvbigpe1xuXG5cdFx0dGhpcy5saXN0ZW5UbyggdGhpcy5tb2RlbCwgXCJjaGFuZ2U6Y3VycmVudEV2ZW50XCIsIHRoaXMucmVuZGVyICk7XG5cdFx0dGhpcy5saXN0ZW5UbyggdGhpcy5tb2RlbCwgXCJjaGFuZ2U6dGltZUxlZnRcIiwgdGhpcy51cGRhdGVUaW1lTGVmdCApO1xuXG5cdFx0VHdlZW5NYXgudGlja2VyLmFkZEV2ZW50TGlzdGVuZXIoJ3RpY2snLCB0aGlzLnVwZGF0ZSwgdGhpcyk7XG5cblx0XHQvLyB0aGlzLnJlbmRlcigpO1xuXHR9LFxuXHR1cGRhdGU6IGZ1bmN0aW9uKCl7XG5cblx0XHR2YXIgbGlnaHRQYXR0ZXJuID0gdGhpcy5tb2RlbC5nZXRMaWdodFBhdHRlcm4oKTtcblxuXHRcdHRoaXMuJGVsLmNzcyh7XG5cdFx0XHQnYmFja2dyb3VuZC1jb2xvcic6IGxpZ2h0UGF0dGVybi5nZXRDb2xvcigpXG5cdFx0fSk7XG5cdH0sXG5cdHVwZGF0ZVRpbWVMZWZ0IDogZnVuY3Rpb24obW9kZWwsIGRhdGEpe1xuXG5cdFx0dmFyIGtleSA9IG1vZGVsLmdldChcImtleVwiKTtcblx0XHR0aGlzLnVpLnRpbWVEaXNwbGF5Lmh0bWwoIFRpbWVEaXNwbGF5VGVtcGxhdGUoe1xuXHRcdFx0aG91cnMgOiBkYXRhLmhvdXJzLFxuXHRcdFx0bWludXRlcyA6IGRhdGEubWludXRlcyxcblx0XHRcdHNob3dDb2xvbiA6IChkYXRhLnNlY29uZHMgJSAyID09PSAwKVxuXHRcdH0pICk7XG5cdH0sXG5cdG9uQmVmb3JlUmVuZGVyIDogZnVuY3Rpb24oKXtcblx0XHR2YXIgY3VycmVudEV2ZW50ID0gdGhpcy5tb2RlbC5nZXQoXCJjdXJyZW50RXZlbnRcIik7XG5cdFx0dGhpcy5tb2RlbC5zZXQoIFwiY3VycmVudEV2ZW50RGF0YVwiLCBjdXJyZW50RXZlbnQgPyBjdXJyZW50RXZlbnQudG9KU09OKCkgOiBudWxsICk7XG5cdH1cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFNwbGFzaEl0ZW1WaWV3OyIsInZhciBBcHBSb3V0ZXIgXHRcdD0gcmVxdWlyZSggXCJjb250cm9sbGVycy9hcHBSb3V0ZXJcIiApO1xuXG52YXIgU3RhdGUgPSByZXF1aXJlKCdtb2RlbHMvc3RhdGUnKTtcbnZhciByb29tRGF0YSA9IHJlcXVpcmUoXCJyb29tRGF0YVwiKTtcbnZhciBTcGxhc2hJdGVtVmlldyA9IHJlcXVpcmUoXCJ2aWV3cy9zcGxhc2hJdGVtVmlld1wiKTtcblxudmFyIFNwbGFzaFZpZXcgPSBNYXJpb25ldHRlLkxheW91dFZpZXcuZXh0ZW5kKHtcblx0aWQgOiBcInJvb20tc3BsaXRcIixcblx0dGVtcGxhdGUgOiBfLnRlbXBsYXRlKCByZXF1aXJlKFwidGVtcGxhdGVzL3NwbGFzaFdyYXBwZXIuaHRtbFwiKSApLFxuXHR1aSA6IHtcblx0XHRyb29tQ29udGFpbmVycyA6IFwiLnJvb20tY29udGFpbmVyXCJcblx0fSxcblx0ZXZlbnRzIDoge1xuXHRcdFwibW91c2VlbnRlciBAdWkucm9vbUNvbnRhaW5lcnNcIiA6IGZ1bmN0aW9uKGUpe1xuXHRcdFx0XHQkKCcucm9vbS1jb250YWluZXInKS5lYWNoKGZ1bmN0aW9uKGluZGV4LCBlbCkge1xuXHRcdFx0XHRcdHZhciBpc0hvdmVyZWQgPSAoZWwgPT09IGUuY3VycmVudFRhcmdldCk7XG5cdFx0XHRcdFx0JChlbCkudG9nZ2xlQ2xhc3MoJ2hvdmVyZWQnLCBpc0hvdmVyZWQpO1xuXHRcdFx0XHRcdCQoZWwpLnRvZ2dsZUNsYXNzKCdub3QtaG92ZXJlZCcsICFpc0hvdmVyZWQpO1xuXHRcdFx0XHR9KTtcblx0XHR9LFxuXHRcdFwibW91c2VsZWF2ZSBAdWkucm9vbUNvbnRhaW5lcnNcIiA6IGZ1bmN0aW9uKGUpe1xuXHRcdFx0XHQkKCcucm9vbS1jb250YWluZXInKS5lYWNoKGZ1bmN0aW9uKGluZGV4LCBlbCkge1xuXHRcdFx0XHRcdCQoZWwpLnJlbW92ZUNsYXNzKCdob3ZlcmVkJyk7XG5cdFx0XHRcdFx0JChlbCkucmVtb3ZlQ2xhc3MoJ25vdC1ob3ZlcmVkJyk7XG5cdFx0XHRcdH0pO1xuXHRcdH0sXG5cdFx0XCJjbGljayBAdWkucm9vbUNvbnRhaW5lcnNcIiA6IGZ1bmN0aW9uKCBlICl7XG5cdFx0XHR2YXIga2V5ID0gJCggZS5jdXJyZW50VGFyZ2V0ICkuZGF0YShcImlkXCIpO1xuXHRcdFx0QXBwUm91dGVyLm5hdmlnYXRlKFwicm9vbS9cIitrZXksIHt0cmlnZ2VyOiB0cnVlfSk7XG5cblx0XHRcdFx0JCgnLnJvb20tY29udGFpbmVyJykuZWFjaChmdW5jdGlvbihpbmRleCwgZWwpIHtcblx0XHRcdFx0XHR2YXIgc2hvdWxkRXhwYW5kID0gKGVsID09PSBlLmN1cnJlbnRUYXJnZXQpO1xuXHRcdFx0XHRcdCQoZWwpLnRvZ2dsZUNsYXNzKCdleHBhbmRlZCcsIHNob3VsZEV4cGFuZCk7XG5cdFx0XHRcdFx0JChlbCkudG9nZ2xlQ2xhc3MoJ2NvbGxhcHNlZCcsICFzaG91bGRFeHBhbmQpO1xuXHRcdFx0XHR9KTtcblx0XHR9XG5cdH0sXG5cdHJlc2V0IDogZnVuY3Rpb24oKXtcblx0XHQkKCcucm9vbS1jb250YWluZXInKS5lYWNoKGZ1bmN0aW9uKGluZGV4LCBlbCkge1xuXHRcdFx0JChlbCkudG9nZ2xlQ2xhc3MoJ2V4cGFuZGVkJywgZmFsc2UpO1xuXHRcdFx0JChlbCkudG9nZ2xlQ2xhc3MoJ2NvbGxhcHNlZCcsIGZhbHNlKTtcblx0XHRcdCQoZWwpLnRvZ2dsZUNsYXNzKCdob3ZlcmVkJywgZmFsc2UpO1xuXHRcdFx0JChlbCkudG9nZ2xlQ2xhc3MoJ25vdC1ob3ZlcmVkJywgZmFsc2UpO1xuXHRcdH0pO1xuXHR9LFxuXHRpbml0aWFsaXplIDogZnVuY3Rpb24oKXtcblx0XHRfLmJpbmRBbGwodGhpcywgJ3Jlc2l6ZScpO1xuXHRcdCQod2luZG93KS5yZXNpemUoIHRoaXMucmVzaXplICkucmVzaXplKCk7XG5cblx0XHR0aGlzLm1vZGVsLnNldChcInJvb21EYXRhXCIsIHJvb21EYXRhKTtcblxuXHRcdF8uZWFjaCggcm9vbURhdGEsIGZ1bmN0aW9uKCB2YWx1ZSwga2V5ICl7XG5cdFx0XHR0aGlzLmFkZFJlZ2lvbigga2V5LCBcIiNyb29tLVwiK2tleSApO1xuXHRcdH0sIHRoaXMpO1xuXG5cdH0sXG5cdGFkZFJvb20gOiBmdW5jdGlvbiggbW9kZWwgKXtcblx0XHR2YXIga2V5ID0gbW9kZWwuZ2V0KFwia2V5XCIpO1xuXHRcdHZhciByZWdpb24gPSB0aGlzLmdldFJlZ2lvbigga2V5ICk7XG5cdFx0cmVnaW9uLnNob3coIG5ldyBTcGxhc2hJdGVtVmlldyh7IG1vZGVsIDogbW9kZWwgfSApICk7XG5cdH0sXG5cdHJlc2l6ZSA6IGZ1bmN0aW9uKCl7XG5cdFx0dmFyIGFzcGVjdFJhdGlvID0gJCh3aW5kb3cpLndpZHRoKCkgLyAkKHdpbmRvdykuaGVpZ2h0KCk7XG5cdFx0U3RhdGUuc2V0KCdwb3J0cmFpdCcsIGFzcGVjdFJhdGlvIDw9IDEpO1xuXHR9XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBTcGxhc2hWaWV3OyJdfQ==
