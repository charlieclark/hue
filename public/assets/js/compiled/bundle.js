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
var isConnected = false;
var isMaster = false;
var myID = null;

var pipe = require("pipe");
var helpers = require("helpers");
var roomData = require("roomData");

function init(){

	connect(function(){

		var code = null ;
		myID = getUniqueId();

		//DATA UPDATE LISTENER
		mySocket.on('updateData', function(data){

			events.trigger( "eventsLoaded", data );
		});

		//REQUEST DATA & PASS UNIQUE ID
		mySocket.emit('requestData',{
			id : myID
		});

		//CONDITIONAL STUFF
		if( helpers.getParameterByName('authenticate') ){

			mySocket.on('authentication_url', function( data ){
				mySocket.disconnect();
				window.location = data;
			});
			mySocket.emit('authenticate');

		} else if( helpers.getParameterByName('master') ){

			isMaster = true;
			mySocket.emit('master_connect', {
				roomData : roomData
			});

		} else if( code = helpers.getParameterByName('code') ){

			mySocket.emit('got_code', code, function(){
				mySocket.disconnect();
				window.location = "?master=true";
			});

		}		
	});
}

function getUniqueId(){

	var id = helpers.generateUUID();
	return id;
}	 

function connect( callback ){

	// var socket = 'http://charliepi.local:3000';  
	var socket = 'http://localhost:3000';  

	mySocket = io.connect( socket );   

	mySocket.on('connect', function(){

		isConnected = true;
		if(callback) callback();
	});	
}

function update( data ){

	console.log( data, isConnected );

	if(isConnected && isMaster){
		
		mySocket.emit( 'update_data', { data : data, id : myID } );	
	}
}

var events = _.extend({}, Backbone.Events);

init();

module.exports = {
	init : init,
	connected : isConnected,
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
	},
	generateUUID : function(){
	    var d = new Date().getTime();
	    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
	        var r = (d + Math.random()*16)%16 | 0;
	        d = Math.floor(d/16);
	        return (c=='x' ? r : (r&0x3|0x8)).toString(16);
	    });
	    return uuid;
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

			this.ui.roomContainers.each(function(index, el) {
				var isHovered = (el === e.currentTarget);
				$(el).toggleClass('hovered', isHovered);
				$(el).toggleClass('not-hovered', !isHovered);
			});
		},
		"mouseleave @ui.roomContainers" : function(e){
				
			this.ui.roomContainers.removeClass('hovered not-hovered');
		},
		"click @ui.roomContainers" : function( e ){

			var key = $( e.currentTarget ).data("id");
			AppRouter.navigate("room/"+key, {trigger: true});

			this.ui.roomContainers.each(function(index, el) {
				var shouldExpand = (el === e.currentTarget);
				$(el).toggleClass('expanded', shouldExpand);
				$(el).toggleClass('collapsed', !shouldExpand);
			});
		}
	},
	reset : function(){

		this.ui.roomContainers.removeClass('expanded collapsed hovered not-hovered');
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIuLi9wdWJsaWMvYXNzZXRzL2pzL3VzZXIvYXBwLmpzIiwiLi4vcHVibGljL2Fzc2V0cy9qcy91c2VyL2NvbGxlY3Rpb25zL2NhbGVuZGFyQ29sbGVjdGlvbi5qcyIsIi4uL3B1YmxpYy9hc3NldHMvanMvdXNlci9jb250cm9sbGVycy9hcHBSb3V0ZXIuanMiLCIuLi9wdWJsaWMvYXNzZXRzL2pzL3VzZXIvY29udHJvbGxlcnMvY2FsZW5kYXJMb2FkLmpzIiwiLi4vcHVibGljL2Fzc2V0cy9qcy91c2VyL2NvbnRyb2xsZXJzL2h1ZUNvbm5lY3QuanMiLCIuLi9wdWJsaWMvYXNzZXRzL2pzL3VzZXIvY29udHJvbGxlcnMvbGlnaHRQYXR0ZXJuLmpzIiwiLi4vcHVibGljL2Fzc2V0cy9qcy91c2VyL2NvbnRyb2xsZXJzL2xpZ2h0UGF0dGVybkNvbnRyb2xsZXIuanMiLCIuLi9wdWJsaWMvYXNzZXRzL2pzL3VzZXIvaGVscGVycy5qcyIsIi4uL3B1YmxpYy9hc3NldHMvanMvdXNlci9tb2RlbHMvY2FsZW5kYXJJdGVtTW9kZWwuanMiLCIuLi9wdWJsaWMvYXNzZXRzL2pzL3VzZXIvbW9kZWxzL2NhbGVuZGFyTW9kZWwuanMiLCIuLi9wdWJsaWMvYXNzZXRzL2pzL3VzZXIvbW9kZWxzL3N0YXRlLmpzIiwiLi4vcHVibGljL2Fzc2V0cy9qcy91c2VyL3BpcGUuanMiLCIuLi9wdWJsaWMvYXNzZXRzL2pzL3VzZXIvcm9vbURhdGEuanMiLCIuLi9wdWJsaWMvYXNzZXRzL2pzL3VzZXIvdGVtcGxhdGVzL2NhbGVuZGFySXRlbS5odG1sIiwiLi4vcHVibGljL2Fzc2V0cy9qcy91c2VyL3RlbXBsYXRlcy9jYWxlbmRhclNpbmdsZS5odG1sIiwiLi4vcHVibGljL2Fzc2V0cy9qcy91c2VyL3RlbXBsYXRlcy9jYWxlbmRhcldyYXBwZXIuaHRtbCIsIi4uL3B1YmxpYy9hc3NldHMvanMvdXNlci90ZW1wbGF0ZXMvc3BsYXNoSXRlbS5odG1sIiwiLi4vcHVibGljL2Fzc2V0cy9qcy91c2VyL3RlbXBsYXRlcy9zcGxhc2hXcmFwcGVyLmh0bWwiLCIuLi9wdWJsaWMvYXNzZXRzL2pzL3VzZXIvdGVtcGxhdGVzL3RpbWVEaXNwbGF5Lmh0bWwiLCIuLi9wdWJsaWMvYXNzZXRzL2pzL3VzZXIvdmlld3MvYXBwTGF5b3V0LmpzIiwiLi4vcHVibGljL2Fzc2V0cy9qcy91c2VyL3ZpZXdzL2NhbGVuZGFySXRlbS5qcyIsIi4uL3B1YmxpYy9hc3NldHMvanMvdXNlci92aWV3cy9jYWxlbmRhclNpbmdsZS5qcyIsIi4uL3B1YmxpYy9hc3NldHMvanMvdXNlci92aWV3cy9jYWxlbmRhcldyYXBwZXIuanMiLCIuLi9wdWJsaWMvYXNzZXRzL2pzL3VzZXIvdmlld3Mvc3BsYXNoSXRlbVZpZXcuanMiLCIuLi9wdWJsaWMvYXNzZXRzL2pzL3VzZXIvdmlld3Mvc3BsYXNoVmlldy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2JBO0FBQ0E7O0FDREE7QUFDQTs7QUNEQTtBQUNBOztBQ0RBO0FBQ0E7O0FDREE7QUFDQTs7QUNEQTtBQUNBOztBQ0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3REQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNmQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ3aW5kb3cuQ29tbW9uID0ge1xuXHRwYXRoIDoge1xuXHRcdGFzc2V0cyA6IFwiYXNzZXRzL1wiLFxuXHRcdGltZyA6IFwiYXNzZXRzL2ltZy9cIixcblx0XHRhdWRpbyA6IFwiYXNzZXRzL2F1ZGlvL1wiXG5cdH1cbn07XG5cbi8vYmFzZVxudmFyIEFwcExheW91dCA9IHJlcXVpcmUoIFwidmlld3MvYXBwTGF5b3V0XCIgKTtcblxuLy9jdXN0b21cbnZhciBDYWxlbmRhcldyYXBwZXJcdD0gcmVxdWlyZShcInZpZXdzL2NhbGVuZGFyV3JhcHBlclwiKTtcbnZhciByb29tRGF0YSA9IHJlcXVpcmUoXCJyb29tRGF0YVwiKTtcblxuLy9USEUgQVBQTElDQVRJT05cbnZhciBNeUFwcCA9IE1hcmlvbmV0dGUuQXBwbGljYXRpb24uZXh0ZW5kKHtcblx0aW5pdGlhbGl6ZSA6IGZ1bmN0aW9uKCl7XG5cdFx0XG5cdH0sXG5cdG9uU3RhcnQgOiBmdW5jdGlvbigpe1xuXG5cdFx0dmFyIG15Q2FsZW5kYXIgPSBuZXcgQ2FsZW5kYXJXcmFwcGVyKCB7IG1vZGVsIDogbmV3IEJhY2tib25lLk1vZGVsKHsgcm9vbXMgOiByb29tRGF0YSB9KSB9KTtcblx0XHRBcHBMYXlvdXQuZ2V0UmVnaW9uKFwibWFpblwiKS5zaG93KCBteUNhbGVuZGFyICk7XG5cblx0XHRCYWNrYm9uZS5oaXN0b3J5LnN0YXJ0KHtcblx0XHRcdHB1c2hTdGF0ZSA6IGZhbHNlXG5cdFx0fSk7XG5cdH0gXG59KTtcblxuLy9raWNrb2ZmXG4kKGZ1bmN0aW9uKCl7XG5cdHdpbmRvdy5hcHAgPSBuZXcgTXlBcHAoKTtcblx0d2luZG93LmFwcC5zdGFydCgpOyBcbn0pO1xuXG5cblxuXG5cblxuXG4gICAgICAgICAiLCJ2YXIgQ2FsZW5kYXJDb2xsZWN0aW9uID0gQmFja2JvbmUuQ29sbGVjdGlvbi5leHRlbmQoe1xuXHRpbml0aWFsaXplIDogZnVuY3Rpb24oKXtcblxuXHR9LFxuXHRjb21wYXJhdG9yIDogZnVuY3Rpb24oIGEsIGIgKXtcblx0XHR2YXIgYVRpbWUgPSBhLmdldChcInN0YXJ0XCIpLnJhdztcblx0XHR2YXIgYlRpbWUgPSBiLmdldChcInN0YXJ0XCIpLnJhdztcblx0XHRyZXR1cm4gYVRpbWUgLSBiVGltZTtcblx0fSxcblx0Z2V0Q3VycmVudCA6IGZ1bmN0aW9uKCl7XG5cblx0XHRyZXR1cm4gdGhpcy5maW5kKGZ1bmN0aW9uKCBtb2RlbCApe1xuXG5cdFx0XHRyZXR1cm4gbW9kZWwuaXNBY3RpdmUoKTtcblx0XHR9KTtcblx0fVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gQ2FsZW5kYXJDb2xsZWN0aW9uOyIsInZhciBwaXBlID0gcmVxdWlyZShcInBpcGVcIik7XG5cbnZhciBNeUFwcFJvdXRlciA9IE1hcmlvbmV0dGUuQXBwUm91dGVyLmV4dGVuZCh7XG5cdGNvbnRyb2xsZXIgOiB7XG5cdFx0J3Jvb21Sb3V0ZScgOiBmdW5jdGlvbigpe30sXG5cdFx0J2RlZmF1bHRSb3V0ZScgOiBmdW5jdGlvbigpe31cblx0fSxcblx0YXBwUm91dGVzIDoge1xuXHRcdFwicm9vbS86a2V5XCIgOiBcInJvb21Sb3V0ZVwiLFxuXHRcdFwiKmFjdGlvbnNcIiA6IFwiZGVmYXVsdFJvdXRlXCJcblx0fVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gbmV3IE15QXBwUm91dGVyKCk7XG4iLCJ2YXIgcGlwZSA9IHJlcXVpcmUoXCJwaXBlXCIpO1xuXG4vL2xpc3RlbmluZyBmb3IgbG9hZFxud2luZG93LmhhbmRsZUNsaWVudExvYWQgPSBmdW5jdGlvbigpe1xuXG4gIGNvbnNvbGUubG9nKFwiZ29vZ2xlIGFwaSBsb2FkZWRcIik7XG4gIF8uZGVmZXIoIGZ1bmN0aW9uKCl7IGluaXQoKSB9KTtcbn1cblxudmFyIGNsaWVudElkID0gJzQzMzgzOTcyMzM2NS11N2dybGR0dmY4cGFiamtqNGZyY2lvM2N2NWhpdDhmbS5hcHBzLmdvb2dsZXVzZXJjb250ZW50LmNvbSc7XG52YXIgYXBpS2V5ID0gJ0FJemFTeUJzS2RUcGxSWHVFd2d2UFNIX2dHRjhPR3N3MzV0MTV2MCc7XG52YXIgc2NvcGVzID0gJ2h0dHBzOi8vd3d3Lmdvb2dsZWFwaXMuY29tL2F1dGgvY2FsZW5kYXInO1xudmFyIHJvb21EYXRhID0gcmVxdWlyZShcInJvb21EYXRhXCIpO1xudmFyIHB1bGxJbnRlcnZhbCA9IDEwMDAgKiAxMDtcblxuLy9UT0RPIDogaW50ZWdyYXRlIGFsbCA0IGNhbGVuZGFyc1xuXG5mdW5jdGlvbiBpbml0KCl7XG5cdC8vIGdhcGkuY2xpZW50LnNldEFwaUtleShhcGlLZXkpO1xuXHQvLyBjaGVja0F1dGgoKTtcbn1cblxuZnVuY3Rpb24gY2hlY2tBdXRoKCl7XG5cdGdhcGkuYXV0aC5hdXRob3JpemUoIHtcblx0XHRjbGllbnRfaWQ6IGNsaWVudElkLCBcblx0XHRzY29wZTogc2NvcGVzLCBcblx0XHRpbW1lZGlhdGU6IGZhbHNlXG5cdH0sIGhhbmRsZUF1dGhSZXN1bHQgKTtcbn1cblxuZnVuY3Rpb24gaGFuZGxlQXV0aFJlc3VsdCggYXV0aFJlc3VsdCApe1xuXG5cdGlmKGF1dGhSZXN1bHQpe1xuXHRcdG1ha2VBcGlDYWxsKCk7XG5cdH1cbn1cblxuZnVuY3Rpb24gbWFrZUFwaUNhbGwoKSB7XG4gIGdhcGkuY2xpZW50LmxvYWQoJ2NhbGVuZGFyJywgJ3YzJywgZnVuY3Rpb24oKSB7XG4gICAgICBcbiAgICAgIHB1bGxSb29tcygpO1xuICAgICAgc2V0SW50ZXJ2YWwoIHB1bGxSb29tcywgcHVsbEludGVydmFsICk7ICAgICAgICAgIFxuICB9KTtcbn1cblxuZnVuY3Rpb24gcHVsbFJvb21zKCl7XG5cbiAgdmFyIGZyb20gPSBuZXcgRGF0ZSgpO1xuICB2YXIgdG8gPSBuZXcgRGF0ZSgpO1xuICAgICAgdG8uc2V0RGF0ZSggdG8uZ2V0RGF0ZSgpICsgMSApO1xuXG4gIF8uZWFjaCggcm9vbURhdGEsIGZ1bmN0aW9uKCBkYXRhLCBrZXkgKXtcblxuICAgIHZhciByZXF1ZXN0ID0gZ2FwaS5jbGllbnQuY2FsZW5kYXIuZXZlbnRzLmxpc3Qoe1xuICAgICAgICAnY2FsZW5kYXJJZCc6IGRhdGEuY2FsZW5kYXJJZCxcbiAgICAgICAgdGltZU1pbiA6IGZyb20udG9JU09TdHJpbmcoKSxcbiAgICAgICAgdGltZU1heCA6IHRvLnRvSVNPU3RyaW5nKCksXG4gICAgICAgIHNpbmdsZUV2ZW50cyA6IHRydWVcbiAgICAgIH0pO1xuXG4gICAgIHJlcXVlc3QudGhlbihmdW5jdGlvbihyZXNwb25zZSkge1xuXG4gICAgICAgICAgcm9vbUxvYWRlZCgga2V5LCByZXNwb25zZS5yZXN1bHQgKTtcbiAgICAgIH0sIGZ1bmN0aW9uKHJlYXNvbikge1xuXG4gICAgICAgICAgY29uc29sZS5sb2coJ0Vycm9yOiAnICsgcmVhc29uLnJlc3VsdC5lcnJvci5tZXNzYWdlKTtcbiAgICAgIH0pO1xuICB9KTtcbn1cblxuZnVuY3Rpb24gcm9vbUxvYWRlZCgga2V5LCBkYXRhICl7XG5cbiAgZXZlbnRzLnRyaWdnZXIoIFwiZXZlbnRzTG9hZGVkXCIsIHsga2V5IDoga2V5LCBkYXRhIDogZGF0YSB9ICk7XG59XG5cbnZhciBldmVudHMgPSBfLmV4dGVuZCh7fSwgQmFja2JvbmUuRXZlbnRzKTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cbiAgZXZlbnRzIDogZXZlbnRzXG59O1xuIiwidmFyIG15U29ja2V0ID0gbnVsbDtcbnZhciBpc0Nvbm5lY3RlZCA9IGZhbHNlO1xudmFyIGlzTWFzdGVyID0gZmFsc2U7XG52YXIgbXlJRCA9IG51bGw7XG5cbnZhciBwaXBlID0gcmVxdWlyZShcInBpcGVcIik7XG52YXIgaGVscGVycyA9IHJlcXVpcmUoXCJoZWxwZXJzXCIpO1xudmFyIHJvb21EYXRhID0gcmVxdWlyZShcInJvb21EYXRhXCIpO1xuXG5mdW5jdGlvbiBpbml0KCl7XG5cblx0Y29ubmVjdChmdW5jdGlvbigpe1xuXG5cdFx0dmFyIGNvZGUgPSBudWxsIDtcblx0XHRteUlEID0gZ2V0VW5pcXVlSWQoKTtcblxuXHRcdC8vREFUQSBVUERBVEUgTElTVEVORVJcblx0XHRteVNvY2tldC5vbigndXBkYXRlRGF0YScsIGZ1bmN0aW9uKGRhdGEpe1xuXG5cdFx0XHRldmVudHMudHJpZ2dlciggXCJldmVudHNMb2FkZWRcIiwgZGF0YSApO1xuXHRcdH0pO1xuXG5cdFx0Ly9SRVFVRVNUIERBVEEgJiBQQVNTIFVOSVFVRSBJRFxuXHRcdG15U29ja2V0LmVtaXQoJ3JlcXVlc3REYXRhJyx7XG5cdFx0XHRpZCA6IG15SURcblx0XHR9KTtcblxuXHRcdC8vQ09ORElUSU9OQUwgU1RVRkZcblx0XHRpZiggaGVscGVycy5nZXRQYXJhbWV0ZXJCeU5hbWUoJ2F1dGhlbnRpY2F0ZScpICl7XG5cblx0XHRcdG15U29ja2V0Lm9uKCdhdXRoZW50aWNhdGlvbl91cmwnLCBmdW5jdGlvbiggZGF0YSApe1xuXHRcdFx0XHRteVNvY2tldC5kaXNjb25uZWN0KCk7XG5cdFx0XHRcdHdpbmRvdy5sb2NhdGlvbiA9IGRhdGE7XG5cdFx0XHR9KTtcblx0XHRcdG15U29ja2V0LmVtaXQoJ2F1dGhlbnRpY2F0ZScpO1xuXG5cdFx0fSBlbHNlIGlmKCBoZWxwZXJzLmdldFBhcmFtZXRlckJ5TmFtZSgnbWFzdGVyJykgKXtcblxuXHRcdFx0aXNNYXN0ZXIgPSB0cnVlO1xuXHRcdFx0bXlTb2NrZXQuZW1pdCgnbWFzdGVyX2Nvbm5lY3QnLCB7XG5cdFx0XHRcdHJvb21EYXRhIDogcm9vbURhdGFcblx0XHRcdH0pO1xuXG5cdFx0fSBlbHNlIGlmKCBjb2RlID0gaGVscGVycy5nZXRQYXJhbWV0ZXJCeU5hbWUoJ2NvZGUnKSApe1xuXG5cdFx0XHRteVNvY2tldC5lbWl0KCdnb3RfY29kZScsIGNvZGUsIGZ1bmN0aW9uKCl7XG5cdFx0XHRcdG15U29ja2V0LmRpc2Nvbm5lY3QoKTtcblx0XHRcdFx0d2luZG93LmxvY2F0aW9uID0gXCI/bWFzdGVyPXRydWVcIjtcblx0XHRcdH0pO1xuXG5cdFx0fVx0XHRcblx0fSk7XG59XG5cbmZ1bmN0aW9uIGdldFVuaXF1ZUlkKCl7XG5cblx0dmFyIGlkID0gaGVscGVycy5nZW5lcmF0ZVVVSUQoKTtcblx0cmV0dXJuIGlkO1xufVx0IFxuXG5mdW5jdGlvbiBjb25uZWN0KCBjYWxsYmFjayApe1xuXG5cdC8vIHZhciBzb2NrZXQgPSAnaHR0cDovL2NoYXJsaWVwaS5sb2NhbDozMDAwJzsgIFxuXHR2YXIgc29ja2V0ID0gJ2h0dHA6Ly9sb2NhbGhvc3Q6MzAwMCc7ICBcblxuXHRteVNvY2tldCA9IGlvLmNvbm5lY3QoIHNvY2tldCApOyAgIFxuXG5cdG15U29ja2V0Lm9uKCdjb25uZWN0JywgZnVuY3Rpb24oKXtcblxuXHRcdGlzQ29ubmVjdGVkID0gdHJ1ZTtcblx0XHRpZihjYWxsYmFjaykgY2FsbGJhY2soKTtcblx0fSk7XHRcbn1cblxuZnVuY3Rpb24gdXBkYXRlKCBkYXRhICl7XG5cblx0Y29uc29sZS5sb2coIGRhdGEsIGlzQ29ubmVjdGVkICk7XG5cblx0aWYoaXNDb25uZWN0ZWQgJiYgaXNNYXN0ZXIpe1xuXHRcdFxuXHRcdG15U29ja2V0LmVtaXQoICd1cGRhdGVfZGF0YScsIHsgZGF0YSA6IGRhdGEsIGlkIDogbXlJRCB9ICk7XHRcblx0fVxufVxuXG52YXIgZXZlbnRzID0gXy5leHRlbmQoe30sIEJhY2tib25lLkV2ZW50cyk7XG5cbmluaXQoKTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cdGluaXQgOiBpbml0LFxuXHRjb25uZWN0ZWQgOiBpc0Nvbm5lY3RlZCxcblx0ZXZlbnRzIDogZXZlbnRzLFxuXHR1cGRhdGUgOiB1cGRhdGVcbn0iLCJ2YXIgaHVlQ29ubmVjdCA9IHJlcXVpcmUoXCJjb250cm9sbGVycy9odWVDb25uZWN0XCIpO1xuXG5mdW5jdGlvbiBMaWdodFBhdHRlcm4oIGxpZ2h0SWQsIHBhdHRlcm5JZCwgb3B0X2RhdGEgKXtcblxuXHR0aGlzLl9wYXR0ZXJuID0gcGF0dGVybnNbIHBhdHRlcm5JZCBdO1xuXG5cdC8vIG1ha2Ugc2VxdWVuY2UgYnkgcGF0dGVybklkXG5cdHRoaXMuY3JlYXRlU2VxdWVuY2UoIHBhdHRlcm5JZCwgb3B0X2RhdGEgKTtcblxuXHR0aGlzLl9saWdodElkID0gbGlnaHRJZDtcblxuXHR0aGlzLl9zdGVwID0gMDtcblx0dGhpcy5faXRlcmF0aW9uID0gMDtcblxuXHR0aGlzLl9zZXF1ZW5jZSA9IHRoaXMuc3RhcnRTZXF1ZW5jZSggcGF0dGVybklkICk7XG5cblx0dGhpcy5fdGltZW91dCA9IG51bGw7XG59XG5cbkxpZ2h0UGF0dGVybi5wcm90b3R5cGUgPSB7XG5cdGNyZWF0ZVNlcXVlbmNlIDogZnVuY3Rpb24oIHBhdHRlcm5JZCwgb3B0X2RhdGEgKXtcblx0XHRcblx0XHR2YXIgcGF0dGVybiA9IHBhdHRlcm5zWyBwYXR0ZXJuSWQgXTtcblxuXHRcdHN3aXRjaChwYXR0ZXJuSWQpIHtcblx0XHRcdGNhc2UgJ29jY3VwaWVkJzpcblx0XHRcdHZhciBudW1TdG9wcyA9IDMwO1xuXG5cdFx0XHRwYXR0ZXJuLnN0YXJ0ID0gb3B0X2RhdGEuc3RhcnQ7XG5cdFx0XHRwYXR0ZXJuLmVuZCA9IG9wdF9kYXRhLmVuZDtcblx0XHRcdHBhdHRlcm4ud2FpdCA9IChwYXR0ZXJuLmVuZCAtIHBhdHRlcm4uc3RhcnQpIC8gbnVtU3RvcHMgLyAxMDAwO1xuXHRcdFx0cGF0dGVybi5mYWRlID0gcGF0dGVybi53YWl0O1xuXG5cdFx0XHR2YXIgcmFpbmJvdyA9IG5ldyBSYWluYm93KCk7XG5cdFx0XHRyYWluYm93LnNldFNwZWN0cnVtLmFwcGx5KCByYWluYm93LCBwYXR0ZXJuLmNvbG9ycyApO1xuXG5cdFx0XHRwYXR0ZXJuLnNlcXVlbmNlID0gW107XG5cdFx0XHRmb3IodmFyIGkgPSAwOyBpIDwgbnVtU3RvcHM7IGkrKykge1xuXHRcdFx0XHR2YXIgY29sb3IgPSByYWluYm93LmNvbG91ckF0KCBpLyhudW1TdG9wcy0xKSAqIDEwMCApO1xuXHRcdFx0XHRwYXR0ZXJuLnNlcXVlbmNlLnB1c2goIGNvbG9yICk7XG5cdFx0XHR9XG5cdFx0XHRicmVhaztcblxuXHRcdFx0ZGVmYXVsdDpcblx0XHRcdHBhdHRlcm4uc2VxdWVuY2UgPSBwYXR0ZXJuLmNvbG9ycy5jb25jYXQoKTtcblx0XHRcdGJyZWFrO1xuXHRcdH1cblx0fSxcblx0Z2V0Q29sb3IgOiBmdW5jdGlvbigpe1xuXG5cdFx0cmV0dXJuIHRoaXMuX3NlcXVlbmNlW3RoaXMuX3N0ZXBdO1xuXHR9LFxuXHRzdGFydFNlcXVlbmNlIDogZnVuY3Rpb24oIHBhdHRlcm5JZCApe1xuXG5cdFx0dmFyIHBhdHRlcm4gPSBwYXR0ZXJuc1sgcGF0dGVybklkIF07XG5cdFx0dGhpcy5fc2VxdWVuY2UgPSBwYXR0ZXJuLnNlcXVlbmNlO1xuXG5cdFx0dGhpcy5zdG9wU2VxdWVuY2UoKTtcblxuXHRcdHZhciBzdGVwO1xuXG5cdFx0c3dpdGNoKHBhdHRlcm5JZCkge1xuXHRcdFx0Y2FzZSAnb2NjdXBpZWQnOlxuXHRcdFx0c3RlcCA9IE1hdGguZmxvb3IoIChuZXcgRGF0ZSgpIC0gcGF0dGVybi5zdGFydCkgLyAocGF0dGVybi5lbmQgLSBwYXR0ZXJuLnN0YXJ0KSAqIDMwICk7XG5cdFx0XHRicmVhaztcblxuXHRcdFx0ZGVmYXVsdDpcblx0XHRcdHN0ZXAgPSAwO1xuXHRcdFx0YnJlYWs7XG5cdFx0fVxuXG5cdFx0dGhpcy5wbGF5U2VxdWVuY2VTdGVwKCBzdGVwLCBwYXR0ZXJuLmluc3RhbnQgKTtcblxuXHRcdHJldHVybiB0aGlzLl9zZXF1ZW5jZTtcblx0fSxcblx0c3RvcFNlcXVlbmNlIDogZnVuY3Rpb24oKXtcblxuXHRcdHRoaXMuX3N0ZXAgPSAwO1xuXHRcdHRoaXMuX2l0ZXJhdGlvbiA9IDA7XG5cblx0XHR3aW5kb3cuY2xlYXJUaW1lb3V0KCB0aGlzLl90aW1lb3V0ICk7XG5cdH0sXG5cdHBsYXlTZXF1ZW5jZVN0ZXA6IGZ1bmN0aW9uKCBzdGVwLCBpbnN0YW50ICl7XG5cblx0XHQvLyBjb25zb2xlLmxvZyhcInBsYXkgc2VxdWVuY2Ugc3RlcFwiKVxuXG5cdFx0dGhpcy5fc3RlcCA9IHN0ZXA7XG5cblx0XHR2YXIgY29sb3IgPSBvbmUuY29sb3IoIHRoaXMuZ2V0Q29sb3IoKSApO1xuXHRcdHZhciBmYWRlID0gaW5zdGFudCA/IDAgOiB0aGlzLl9wYXR0ZXJuLmZhZGU7XG5cdFx0dmFyIHdhaXQgPSB0aGlzLl9wYXR0ZXJuLndhaXQ7XG5cblx0XHR2YXIgaHNsID0ge1xuXHRcdFx0aCA6IE1hdGguZmxvb3IoIGNvbG9yLmgoKSAqIDM2MCksIFxuXHRcdFx0cyA6IE1hdGguZmxvb3IoIGNvbG9yLnMoKSAqIDEwMCksXG5cdFx0XHRsIDogTWF0aC5mbG9vciggY29sb3IubCgpICogMTAwKSBcblx0XHR9O1xuXG5cdFx0aHVlQ29ubmVjdC51cGRhdGUoW3tcblx0XHRcdGlkIDogdGhpcy5fbGlnaHRJZCxcblx0XHRcdGRhdGEgOiB7XG5cdFx0XHRcdGhzbCA6IGhzbCxcblx0XHRcdFx0ZHVyYXRpb24gOiBmYWRlXG5cdFx0XHR9XG5cdFx0fV0pO1xuXG5cdFx0d2luZG93LmNsZWFyVGltZW91dCggdGhpcy5fdGltZW91dCApO1xuXHRcdHRoaXMuX3RpbWVvdXQgPSB3aW5kb3cuc2V0VGltZW91dCgkLnByb3h5KHRoaXMubmV4dFNlcXVlbmNlU3RlcCwgdGhpcyksIHdhaXQqMTAwMCk7XG5cdH0sXG5cdG5leHRTZXF1ZW5jZVN0ZXA6IGZ1bmN0aW9uKCl7XG5cblx0XHR2YXIgdG90YWxTdGVwcyA9IHRoaXMuX3NlcXVlbmNlLmxlbmd0aDtcblx0XHR2YXIgcmVwZWF0ID0gdGhpcy5fcGF0dGVybi5yZXBlYXQ7XG5cblx0XHR0aGlzLl9zdGVwICsrO1xuXHRcdGlmKHRoaXMuX3N0ZXAgPiB0b3RhbFN0ZXBzIC0gMSkge1xuXHRcdFx0dGhpcy5fc3RlcCA9IDA7XG5cdFx0XHR0aGlzLl9pdGVyYXRpb24gKys7XG5cdFx0fVxuXG5cdFx0aWYocmVwZWF0ID4gLTEgJiYgdGhpcy5faXRlcmF0aW9uID4gcmVwZWF0KSB7XG5cdFx0XHR0aGlzLnN0b3BTZXF1ZW5jZSgpO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdHRoaXMucGxheVNlcXVlbmNlU3RlcCggdGhpcy5fc3RlcCApO1xuXHR9XG59XG5cbnZhciBwYXR0ZXJucyA9IHtcblx0J3Rlc3QnIDoge1xuXHRcdGluc3RhbnQgOiBmYWxzZSxcblx0XHRyZXBlYXQgOiAgLTEsXG5cdFx0ZmFkZTogMSxcblx0XHR3YWl0OiAxLFxuXHRcdGNvbG9yczogW1wiI0ZCMTkxMVwiLCBcIiMwMGZmMDBcIiwgXCIjNDE1NkZGXCIsIFwiI0ZGMDAxRFwiLCBcIiNGRkZGMDdcIl0sXG5cdFx0c2VxdWVuY2UgOiBbXVxuXHR9LFxuXHQnYXZhaWxhYmxlJyA6IHtcblx0XHRpbnN0YW50IDogdHJ1ZSxcblx0XHRyZXBlYXQgOiAwLFxuXHRcdGZhZGU6IDEsXG5cdFx0d2FpdDogMCxcblx0XHRjb2xvcnM6IFtcIiMzNTIzZjZcIl0sXG5cdFx0c2VxdWVuY2UgOiBbXVxuXHR9LFxuXHQnb2NjdXBpZWQnIDoge1xuXHRcdGluc3RhbnQgOiB0cnVlLFxuXHRcdHJlcGVhdCA6IDAsXG5cdFx0ZmFkZTogMCxcblx0XHR3YWl0OiAwLFxuXHRcdHN0YXJ0IDogMCxcblx0XHRlbmQgOiAwLFxuXHRcdGNvbG9yczogW1wiIzJkY2MzZFwiLCBcIiNmM2U1MzNcIiwgXCIjZmMzMTJjXCJdLFxuXHRcdHNlcXVlbmNlIDogW11cblx0fVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IExpZ2h0UGF0dGVybjsiLCJ2YXIgTGlnaHRQYXR0ZXJuID0gcmVxdWlyZShcImNvbnRyb2xsZXJzL2xpZ2h0UGF0dGVyblwiKTtcblxuZnVuY3Rpb24gTGlnaHRQYXR0ZXJuQ29udHJvbGxlciggbW9kZWwgKXtcblx0XG5cdHRoaXMuX21vZGVsID0gbW9kZWw7XG5cdHRoaXMuaW5pdCggKTtcbn1cblxuTGlnaHRQYXR0ZXJuQ29udHJvbGxlci5wcm90b3R5cGUgPSB7XG5cdGluaXQgOiBmdW5jdGlvbigpe1xuXG5cdFx0dGhpcy5pc0F2YWlsYWJsZSgpO1xuXHRcdHRoaXMuX21vZGVsLm9uKCBcImNoYW5nZTpjdXJyZW50RXZlbnRcIiwgdGhpcy5jdXJyZW50Q2hhbmdlZCwgdGhpcyAgKTtcblx0fSxcblx0Y3VycmVudENoYW5nZWQgOiBmdW5jdGlvbiggcGFyZW50LCBtb2RlbCApe1xuXG5cdFx0dGhpcy5zdG9wRXhpc3RpbmcoKTtcblxuXHRcdHZhciBkYXRhID0ge307XG5cdFx0dmFyIHR5cGUgPSAnYXZhaWxhYmxlJztcblxuXHRcdGlmKCBtb2RlbCApe1xuXG5cdFx0XHR0eXBlID0gbW9kZWwuZ2V0UGF0dGVyblR5cGUoKTtcblx0XHRcdGRhdGEgPSB7XG5cdFx0XHRcdHN0YXJ0IDogbW9kZWwuZ2V0KFwic3RhcnRcIikucmF3LFxuXHRcdFx0XHRlbmQgOiBtb2RlbC5nZXQoXCJlbmRcIikucmF3XG5cdFx0XHR9XG5cblx0XHR9XG5cdFx0XG5cdFx0dGhpcy5uZXdQYXR0ZXJuKCB0eXBlLCBkYXRhICk7XG5cblx0fSxcblx0aXNBdmFpbGFibGUgOiBmdW5jdGlvbigpe1xuXG5cdFx0dGhpcy5uZXdQYXR0ZXJuKCBcImF2YWlsYWJsZVwiICk7XG5cdH0sXG5cdGdldEN1cnJlbnQgOiBmdW5jdGlvbigpe1xuXG5cdFx0cmV0dXJuIHRoaXMuX2N1cnJlbnRQYXR0ZXJuO1xuXHR9LFxuXHRuZXdQYXR0ZXJuIDogZnVuY3Rpb24oIHR5cGUsIGRhdGEgKXtcblxuXHRcdHZhciBrZXkgPSB0aGlzLl9tb2RlbC5nZXQoXCJrZXlcIik7XG5cblx0XHRkYXRhID0gZGF0YSB8fCB7fTtcblxuXHRcdHRoaXMuc3RvcEV4aXN0aW5nKCk7XG5cblx0XHR0aGlzLl9jdXJyZW50UGF0dGVybiA9IG5ldyBMaWdodFBhdHRlcm4oIGtleSwgdHlwZSwgZGF0YSk7XG5cblx0fSxcblx0c3RvcEV4aXN0aW5nIDogZnVuY3Rpb24oKXtcblxuXHRcdGlmKCB0aGlzLl9jdXJyZW50UGF0dGVybiApe1xuXHRcdFx0dGhpcy5fY3VycmVudFBhdHRlcm4uc3RvcFNlcXVlbmNlKCk7XHRcblx0XHR9XG5cdH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBMaWdodFBhdHRlcm5Db250cm9sbGVyOyIsIm1vZHVsZS5leHBvcnRzID0ge1xuXHQgZ2V0UGFyYW1ldGVyQnlOYW1lIDogZnVuY3Rpb24obmFtZSkge1xuXHQgICAgbmFtZSA9IG5hbWUucmVwbGFjZSgvW1xcW10vLCBcIlxcXFxbXCIpLnJlcGxhY2UoL1tcXF1dLywgXCJcXFxcXVwiKTtcblx0ICAgIHZhciByZWdleCA9IG5ldyBSZWdFeHAoXCJbXFxcXD8mXVwiICsgbmFtZSArIFwiPShbXiYjXSopXCIpLFxuXHQgICAgICAgIHJlc3VsdHMgPSByZWdleC5leGVjKGxvY2F0aW9uLnNlYXJjaCk7XG5cdCAgICByZXR1cm4gcmVzdWx0cyA9PT0gbnVsbCA/IFwiXCIgOiBkZWNvZGVVUklDb21wb25lbnQocmVzdWx0c1sxXS5yZXBsYWNlKC9cXCsvZywgXCIgXCIpKTtcblx0fSxcblx0Z2VuZXJhdGVVVUlEIDogZnVuY3Rpb24oKXtcblx0ICAgIHZhciBkID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG5cdCAgICB2YXIgdXVpZCA9ICd4eHh4eHh4eC14eHh4LTR4eHgteXh4eC14eHh4eHh4eHh4eHgnLnJlcGxhY2UoL1t4eV0vZywgZnVuY3Rpb24oYykge1xuXHQgICAgICAgIHZhciByID0gKGQgKyBNYXRoLnJhbmRvbSgpKjE2KSUxNiB8IDA7XG5cdCAgICAgICAgZCA9IE1hdGguZmxvb3IoZC8xNik7XG5cdCAgICAgICAgcmV0dXJuIChjPT0neCcgPyByIDogKHImMHgzfDB4OCkpLnRvU3RyaW5nKDE2KTtcblx0ICAgIH0pO1xuXHQgICAgcmV0dXJuIHV1aWQ7XG5cdH1cbn1cblxuXG4iLCJ2YXIgQ2FsZW5kYXJJdGVtTW9kZWwgPSBCYWNrYm9uZS5Nb2RlbC5leHRlbmQoe1xuXHRkZWZhdWx0cyA6IHtcblx0XHRzdW1tYXJ5IDogXCJuL2FcIixcblx0XHRkZXNjcmlwdGlvbiA6IFwibi9hXCIsXG5cdFx0c3RhcnQgOiBcIm4vYVwiLFxuXHRcdGVuZCA6IFwibi9hXCIsXG5cdH0sXG5cdGluaXRpYWxpemUgOiBmdW5jdGlvbigpe1xuXG5cdFx0dGhpcy5jb252ZXJ0RGF0ZShcInN0YXJ0XCIpO1xuXHRcdHRoaXMuY29udmVydERhdGUoXCJlbmRcIik7XG5cdH0sXG5cdGNvbnZlcnREYXRlIDogZnVuY3Rpb24oIGtleSApe1xuXHRcdC8vY29udmVydCBkYXRhc1xuXHRcdHZhciBkYXRlU3RyaW5nID0gdGhpcy5nZXQoIGtleSApXG5cdFx0aWYoIWRhdGVTdHJpbmcpIHJldHVybjtcblx0XHRcblx0XHRkYXRlU3RyaW5nID0gZGF0ZVN0cmluZy5kYXRlVGltZTtcblx0XHR2YXIgbm93ID0gbmV3IERhdGUoKTtcblx0XHR2YXIgZGF0ZSA9IG5ldyBEYXRlKCBkYXRlU3RyaW5nICk7XG5cblx0XHR0aGlzLnNldCgga2V5LCB7XG5cdFx0XHRyYXcgOiBkYXRlLFxuXHRcdFx0dHdlbHZlSG91ciA6IHRoaXMuZ2V0VHdlbHZlSG91cihkYXRlKSxcblx0XHRcdGZvcm1hdHRlZCA6IGRhdGUudG9TdHJpbmcoKVxuXHRcdH0pO1xuXHR9LFxuXHRnZXRUd2VsdmVIb3VyIDogZnVuY3Rpb24gKGRhdGUpIHtcblx0ICB2YXIgaG91cnMgPSBkYXRlLmdldEhvdXJzKCk7XG5cdCAgdmFyIG1pbnV0ZXMgPSBkYXRlLmdldE1pbnV0ZXMoKTtcblx0ICB2YXIgYW1wbSA9IGhvdXJzID49IDEyID8gJ3BtJyA6ICdhbSc7XG5cdCAgaG91cnMgPSBob3VycyAlIDEyO1xuXHQgIGhvdXJzID0gaG91cnMgPyBob3VycyA6IDEyOyAvLyB0aGUgaG91ciAnMCcgc2hvdWxkIGJlICcxMidcblx0ICBtaW51dGVzID0gbWludXRlcyA8IDEwID8gJzAnK21pbnV0ZXMgOiBtaW51dGVzO1xuXHQgIHZhciBzdHJUaW1lID0gaG91cnMgKyAnOicgKyBtaW51dGVzICsgJyAnICsgYW1wbTtcblx0ICByZXR1cm4gc3RyVGltZTtcblx0fSxcblx0aXNBY3RpdmUgOiBmdW5jdGlvbigpe1xuXHRcdFxuXHRcdCB2YXIgc3RhcnQgPSB0aGlzLmdldChcInN0YXJ0XCIpLnJhdztcblx0XHQgdmFyIGVuZCA9IHRoaXMuZ2V0KFwiZW5kXCIpLnJhdztcblx0XHQgdmFyIG5vdyA9IG5ldyBEYXRlKCk7XG5cblx0XHQgaWYoIG5vdyA+IHN0YXJ0ICYmIG5vdyA8IGVuZCApe1xuXHRcdCBcdHJldHVybiB0cnVlO1xuXHRcdCB9XG5cblx0XHQgcmV0dXJuIGZhbHNlO1xuXHR9LFxuXHRnZXRQYXR0ZXJuVHlwZSA6IGZ1bmN0aW9uKCl7XG5cblx0XHR2YXIgdHlwZSA9IFwib2NjdXBpZWRcIjtcblx0XHRyZXR1cm4gdHlwZTtcblx0fVxufSlcblxubW9kdWxlLmV4cG9ydHMgPSBDYWxlbmRhckl0ZW1Nb2RlbDsiLCJ2YXIgQ2FsZW5kYXJJdGVtTW9kZWwgXHQ9IHJlcXVpcmUoXCJtb2RlbHMvY2FsZW5kYXJJdGVtTW9kZWxcIik7XG5cbnZhciBDYWxlbmRhck1vZGVsID0gQmFja2JvbmUuTW9kZWwuZXh0ZW5kKHtcblx0ZGVmYXVsdHMgOiB7XG5cdFx0b3JnYW5pemVyIDogXCJXZXNcIlxuXHR9LFxuXHRpbml0aWFsaXplIDogZnVuY3Rpb24oKXtcblxuXHRcdF8uYmluZEFsbCggdGhpcywgXCJnZXRDdXJyZW50XCIsIFwiY2hlY2tUaW1lXCIgKTtcblxuXHRcdHRoaXMubGlzdGVuVG8oIHRoaXMsIFwiY2hhbmdlOnVwZGF0ZWRcIiwgdGhpcy51cGRhdGVFdmVudHMgKTtcblx0XHR0aGlzLmxpc3RlblRvKCB0aGlzLCBcImNoYW5nZTp1cGRhdGVkXCIsIHRoaXMuZ2V0Q3VycmVudCApO1xuXHRcdHRoaXMubGlzdGVuVG8oIHRoaXMsIFwiY2hhbmdlOmN1cnJlbnRFdmVudFwiLCB0aGlzLmNoYW5nZUN1cnJlbnQgKTtcblxuXHRcdHNldEludGVydmFsKCB0aGlzLmdldEN1cnJlbnQsIDEwMDAgKTtcblx0fSxcblx0Z2V0Q3VycmVudCA6IGZ1bmN0aW9uKCl7XG5cblx0XHR2YXIgZXZlbnRDb2xsZWN0aW9uID0gdGhpcy5nZXQoXCJldmVudENvbGxlY3Rpb25cIik7XG5cblx0XHQvL2dldHRpbmcgY3VycmVudCBldmVudFxuXHRcdHZhciBjdXJyZW50ID0gZXZlbnRDb2xsZWN0aW9uLmdldEN1cnJlbnQoKTtcblx0XHRcblx0XHR0aGlzLnNldChcImN1cnJlbnRFdmVudERhdGFcIiwgY3VycmVudCA/IGN1cnJlbnQudG9KU09OKCkgOiBudWxsKTtcblx0XHR0aGlzLnNldChcImN1cnJlbnRFdmVudFwiLCBjdXJyZW50ICk7XHRcblx0fSxcblx0Y2hhbmdlQ3VycmVudCA6IGZ1bmN0aW9uKHZpZXcsIG1vZGVsKXtcblxuXHRcdGlmKG1vZGVsKXtcblx0XHRcdHRoaXMuc3RhcnRDaGVja2luZ1RpbWUoKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dGhpcy5zdG9wQ2hlY2tpbmdUaW1lKCk7XG5cdFx0fVxuXHR9LFxuXHRzdGFydENoZWNraW5nVGltZSA6IGZ1bmN0aW9uKCl7XG5cblx0XHR0aGlzLnN0b3BDaGVja2luZ1RpbWUoKTtcblx0XHR0aGlzLl90aW1lQ2hlY2tlciA9IHNldEludGVydmFsKCB0aGlzLmNoZWNrVGltZSwgMTAwMCApO1xuXHR9LFxuXHRzdG9wQ2hlY2tpbmdUaW1lIDogZnVuY3Rpb24oKXtcblxuXHRcdHdpbmRvdy5jbGVhckludGVydmFsKCB0aGlzLl90aW1lQ2hlY2tlciApO1xuXHR9LFxuXHRjaGVja1RpbWUgOiBmdW5jdGlvbigpe1xuXHRcdFxuXHRcdHZhciBtb2RlbCA9IHRoaXMuZ2V0KFwiY3VycmVudEV2ZW50XCIpO1xuXHRcdHZhciBlbmQgPSBtb2RlbC5nZXQoXCJlbmRcIikucmF3O1xuXHRcdHZhciBub3cgPSBuZXcgRGF0ZSgpO1xuXHRcdHZhciB0aW1lID0gZW5kIC0gbm93O1xuXG5cdFx0dmFyIHNlY29uZHMsIG1pbnV0ZXMsIGhvdXJzLCB4O1xuXG5cdFx0eCA9IHRpbWUgLyAxMDAwXG5cdFx0c2Vjb25kcyA9IE1hdGguZmxvb3IoIHggJSA2MCApO1xuXHRcdHggLz0gNjBcblx0XHRtaW51dGVzID0gTWF0aC5mbG9vciggeCAlIDYwICk7XG5cdFx0eCAvPSA2MFxuXHRcdGhvdXJzID0gTWF0aC5mbG9vciggeCAlIDI0ICk7XG5cblx0XHR0aGlzLnNldChcInRpbWVMZWZ0XCIsIHtcblx0XHRcdGhvdXJzIDogaG91cnMsXG5cdFx0XHRtaW51dGVzIDogbWludXRlcyxcblx0XHRcdHNlY29uZHMgOiBzZWNvbmRzXG5cdFx0fSk7XG5cdH0sXG5cdHVwZGF0ZUV2ZW50cyA6IGZ1bmN0aW9uKCl7XG5cblx0XHR2YXIgZXZlbnRDb2xsZWN0aW9uID0gdGhpcy5nZXQoXCJldmVudENvbGxlY3Rpb25cIik7XG5cblx0XHR2YXIgcm9vbURhdGEgPSB0aGlzLmdldChcInJvb21EYXRhXCIpO1xuXHRcdHZhciBuZXdNb2RlbHMgPSBbXTtcblxuXHRcdGlmKCAhcm9vbURhdGEgKSByZXR1cm47XG5cblx0XHRfLmVhY2goIHJvb21EYXRhLml0ZW1zLCBmdW5jdGlvbiggaXRlbSApe1xuXG5cdFx0XHR2YXIgbSA9IG5ldyBDYWxlbmRhckl0ZW1Nb2RlbCggaXRlbSApO1xuXHRcdFx0bS5zZXQoXCJrZXlcIiwgdGhpcy5nZXQoXCJrZXlcIikpO1xuXHRcdFx0bmV3TW9kZWxzLnB1c2goIG0gKTtcblx0XHR9LCB0aGlzKTtcblxuXHRcdGV2ZW50Q29sbGVjdGlvbi5yZXNldCggbmV3TW9kZWxzICk7XG5cdH0sXG5cdGdldExpZ2h0UGF0dGVybiA6IGZ1bmN0aW9uKCl7XG5cblx0XHR2YXIgbGlnaHRQYXR0ZXJuQ29udHJvbGxlciA9IHRoaXMuZ2V0KFwibGlnaHRQYXR0ZXJuQ29udHJvbGxlclwiKTtcblx0XHRyZXR1cm4gbGlnaHRQYXR0ZXJuQ29udHJvbGxlci5nZXRDdXJyZW50KCk7XG5cdH1cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IENhbGVuZGFyTW9kZWw7IiwidmFyIHN0YXRlID0gbmV3IChCYWNrYm9uZS5Nb2RlbC5leHRlbmQoe1xuXHRkZWZhdWx0cyA6IHtcblx0XHQvLyBcIm5hdl9vcGVuXCIgXHRcdDogZmFsc2UsXG5cdFx0Ly8gJ3Njcm9sbF9hdF90b3AnIDogdHJ1ZSxcblx0XHQvLyAnbWluaW1hbF9uYXYnIFx0OiBmYWxzZSxcblx0XHQvLyAnZnVsbF9uYXZfb3BlbidcdDogZmFsc2UsXG5cdFx0Ly8gJ3VpX2Rpc3BsYXknXHQ6IGZhbHNlXG5cdH1cbn0pKSgpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHN0YXRlO1xuIiwidmFyIHBpcGUgPSBfLmV4dGVuZCh7XG5cblx0XG5cdFxufSwgQmFja2JvbmUuRXZlbnRzKTtcblxubW9kdWxlLmV4cG9ydHMgPSBwaXBlOyIsIm1vZHVsZS5leHBvcnRzID0ge1xuXHQnMSc6IHtcblx0XHQnY2FsZW5kYXJJZCcgOiBcImItcmVlbC5jb21fMmQzMjM4MzczOTM2MzYzMjMyMzczODMxQHJlc291cmNlLmNhbGVuZGFyLmdvb2dsZS5jb21cIlxuXHR9LFxuXHQnMic6IHtcblx0XHQnY2FsZW5kYXJJZCcgOiBcImItcmVlbC5jb21fMmQzMTMyMzczNzM4MzgzMzM0MmQzMjM0MzJAcmVzb3VyY2UuY2FsZW5kYXIuZ29vZ2xlLmNvbVwiXG5cdH0sXG5cdCczJzoge1xuXHRcdCdjYWxlbmRhcklkJyA6IFwiYi1yZWVsLmNvbV8zMTM2MzUzMzM5MzYzMTM5MzkzMzM4QHJlc291cmNlLmNhbGVuZGFyLmdvb2dsZS5jb21cIlxuXHR9LFxuXHQnNSc6IHtcblx0XHQnY2FsZW5kYXJJZCcgOiBcImItcmVlbC5jb21fMmQzNDM0MzIzODM5MzYzNzMwMmQzNjM0MzNAcmVzb3VyY2UuY2FsZW5kYXIuZ29vZ2xlLmNvbVwiXG5cdH1cbn07IiwibW9kdWxlLmV4cG9ydHMgPSBcIjxoMj48JT0gc3VtbWFyeSAlPjwvaDI+XFxuXFxuPGgzPmRlc2NyaXB0aW9uIDogPCU9IGRlc2NyaXB0aW9uICU+PC9oMz5cXG5cXG48aDM+c3RhcnQgOiA8JT0gc3RhcnQudHdlbHZlSG91ciAlPjwvaDM+XFxuXFxuPGgzPmVuZCA6IDwlPSBlbmQudHdlbHZlSG91ciAlPjwvaDM+XCI7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IFwiPGRpdiBpZD1cXFwiZXZlbnQtbGlzdC1jb250YWluZXJcXFwiPjwvZGl2PlwiO1xuIiwibW9kdWxlLmV4cG9ydHMgPSBcIjxkaXYgaWQ9XFxcInNwbGFzaC1wYWdlXFxcIj48L2Rpdj5cXG5cXG48ZGl2IGlkPVxcXCJyb29tLXNpbmdsZVxcXCI+PC9kaXY+XFxuXFxuPCEtLSBURVNUIC0tPlxcbjxkaXYgY2xhc3M9XFxcInRlc3RcXFwiIHN0eWxlPVxcXCJwb3NpdGlvbjphYnNvbHV0ZTt0b3A6MDtcXFwiPlxcblxcdDxkaXY+XFxuXFx0XFx0PGlucHV0IGlkPVxcXCJoZXgtaW5wdXRcXFwiIHR5cGU9XFxcInRleHRcXFwiPjwvaW5wdXQ+XFxuXFx0XFx0PGJ1dHRvbiBpZD1cXFwiaGV4XFxcIj5oZXg8L2J1dHRvbj5cXG5cXHQ8L2Rpdj5cXG5cXHQ8YnV0dG9uIGlkPVxcXCJ0ZXN0XFxcIj50ZXN0PC9idXR0b24+XFxuXFx0PGlucHV0IGNsYXNzPVxcXCJjb2xvclxcXCIgdHlwZT1cXFwiY29sb3JcXFwiIG5hbWU9XFxcImZhdmNvbG9yXFxcIj5cXG48L2Rpdj5cIjtcbiIsIm1vZHVsZS5leHBvcnRzID0gXCI8ZGl2IGNsYXNzPVxcXCJudW1iZXJcXFwiPjwlPSBrZXkgJT48L2Rpdj5cXG48ZGl2IGNsYXNzPVxcXCJjaXJjbGVcXFwiPlxcblxcdDxkaXYgY2xhc3M9XFxcImdyYXBoIHJvb20tPCU9IGtleSAlPlxcXCI+PC9kaXY+XFxuPC9kaXY+XFxuPGRpdiBjbGFzcz1cXFwiYXZhaWxhYmlsaXR5XFxcIj5cXG5cXHQ8cD48JT0gY3VycmVudEV2ZW50RGF0YSA/IGN1cnJlbnRFdmVudERhdGEuc3VtbWFyeSA6ICdub3RoaW5nJyAlPjwvcD5cXG5cXHQ8cCBjbGFzcz1cXFwidGltZVxcXCI+PC9wPlxcbjwvZGl2PlwiO1xuIiwibW9kdWxlLmV4cG9ydHMgPSBcIjwlIF8uZWFjaCggcm9vbURhdGEsIGZ1bmN0aW9uKCBkYXRhLCBrZXkgKXsgJT5cXG5cXHQ8ZGl2IGNsYXNzPVxcXCJyb29tLWNvbnRhaW5lclxcXCIgaWQ9XFxcInJvb20tPCU9IGtleSAlPlxcXCIgZGF0YS1pZD1cXFwiPCU9IGtleSAlPlxcXCI+XFxuXFx0PC9kaXY+XFxuPCUgfSk7ICU+XCI7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IFwiPHNwYW4gY2xhc3M9XFxcImhvdXJzXFxcIj48JT0gaG91cnMgJT48L3NwYW4+PHNwYW4gY2xhc3M9XFxcImNvbG9uXFxcIiA8JSBpZiAoc2hvd0NvbG9uKSB7ICU+c3R5bGU9XFxcInZpc2liaWxpdHk6aGlkZGVuO1xcXCI8JSB9ICU+ID46PC9zcGFuPjxzcGFuIGNsYXNzPVxcXCJtaW51dGVzXFxcIj48JT0gbWludXRlcyAlPjwvc3Bhbj5cIjtcbiIsInZhciBTdGF0ZSBcdFx0PSByZXF1aXJlKFwibW9kZWxzL3N0YXRlXCIpO1xuXG52YXIgTXlBcHBMYXlvdXQgPSBNYXJpb25ldHRlLkxheW91dFZpZXcuZXh0ZW5kKHtcblx0ZWwgOiBcIiNjb250ZW50XCIsXG5cdHRlbXBsYXRlIDogZmFsc2UsXG5cdHJlZ2lvbnMgOiB7XG5cdFx0bWFpbiA6IFwiI21haW5cIlxuXHR9LCBcblx0aW5pdGlhbGl6ZSA6IGZ1bmN0aW9uKCl7XG5cdFx0dmFyIF90aGlzID0gdGhpcztcblxuXHRcdC8vd3JhcHBpbmcgaHRtbFxuXHRcdHRoaXMuJGh0bWwgPSAkKFwiaHRtbFwiKTtcblx0XHR0aGlzLiRodG1sLnJlbW92ZUNsYXNzKFwiaGlkZGVuXCIpO1xuXG5cdFx0Ly9yZXNpemUgZXZlbnRzXG5cdFx0JCh3aW5kb3cpLnJlc2l6ZShmdW5jdGlvbigpe1xuXHRcdFx0X3RoaXMub25SZXNpemVXaW5kb3coKTtcblx0XHR9KS5yZXNpemUoKTtcblxuXHRcdHRoaXMubGlzdGVuRm9yU3RhdGUoKTtcblx0fSxcblx0bGlzdGVuRm9yU3RhdGUgOiBmdW5jdGlvbigpe1xuXHRcdC8vc3RhdGUgY2hhbmdlXG5cdFx0dGhpcy5saXN0ZW5UbyggU3RhdGUsIFwiY2hhbmdlXCIsIGZ1bmN0aW9uKCBlICl7XG5cblx0XHRcdHRoaXMub25TdGF0ZUNoYW5nZSggZS5jaGFuZ2VkLCBlLl9wcmV2aW91c0F0dHJpYnV0ZXMgKTtcblx0XHR9LCB0aGlzKTtcblx0XHR0aGlzLm9uU3RhdGVDaGFuZ2UoIFN0YXRlLnRvSlNPTigpICk7XG5cdH0sXG5cdG9uU3RhdGVDaGFuZ2UgOiBmdW5jdGlvbiggY2hhbmdlZCwgcHJldmlvdXMgKXtcblxuXHRcdF8uZWFjaCggY2hhbmdlZCwgZnVuY3Rpb24odmFsdWUsIGtleSl7XG5cdFx0XHRcblx0XHRcdGlmKCBfLmlzQm9vbGVhbiggdmFsdWUgKSApe1xuXHRcdFx0XHR0aGlzLiRodG1sLnRvZ2dsZUNsYXNzKFwic3RhdGUtXCIra2V5LCB2YWx1ZSk7XG5cdFx0XHRcdHRoaXMuJGh0bWwudG9nZ2xlQ2xhc3MoXCJzdGF0ZS1ub3QtXCIra2V5LCAhdmFsdWUpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0dmFyIHByZXZWYWx1ZSA9IHByZXZpb3VzWyBrZXkgXTtcblx0XHRcdFx0aWYocHJldlZhbHVlKXtcblx0XHRcdFx0XHR0aGlzLiRodG1sLnRvZ2dsZUNsYXNzKFwic3RhdGUtXCIra2V5K1wiLVwiK3ByZXZWYWx1ZSwgZmFsc2UpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHRoaXMuJGh0bWwudG9nZ2xlQ2xhc3MoXCJzdGF0ZS1cIitrZXkrXCItXCIrdmFsdWUsIHRydWUpO1xuXHRcdFx0fVxuXG5cdFx0fSwgdGhpcyApO1xuXHR9LFxuXHRvblJlc2l6ZVdpbmRvdyA6IGZ1bmN0aW9uKCl7XG5cdFx0XG5cdFx0Q29tbW9uLnd3ID0gJCh3aW5kb3cpLndpZHRoKCk7XG5cdFx0Q29tbW9uLndoID0gJCh3aW5kb3cpLmhlaWdodCgpO1xuXHR9XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBuZXcgTXlBcHBMYXlvdXQoKTsiLCJ2YXIgQ2FsZW5kYXJJdGVtID0gTWFyaW9uZXR0ZS5JdGVtVmlldy5leHRlbmQoe1xuXHRjbGFzc05hbWUgOiAnaXRlbScsXG5cdHRhZ05hbWUgOiAnbGknLFxuXHR0ZW1wbGF0ZSA6IF8udGVtcGxhdGUoIHJlcXVpcmUoXCJ0ZW1wbGF0ZXMvY2FsZW5kYXJJdGVtLmh0bWxcIikgKSxcblx0dWkgOiB7XG5cdFx0J3RpdGxlJyA6IFwiaDJcIlxuXHR9LFxuXHRldmVudHMgOiB7XG5cdFx0J2NsaWNrIEB1aS50aXRsZScgOiBmdW5jdGlvbigpe1xuXG5cblx0XHR9XG5cdH1cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IENhbGVuZGFySXRlbTsiLCJ2YXIgQ2FsZW5kYXJJdGVtIFx0PSByZXF1aXJlKFwidmlld3MvY2FsZW5kYXJJdGVtXCIpO1xudmFyIEFwcFJvdXRlciBcdFx0PSByZXF1aXJlKCBcImNvbnRyb2xsZXJzL2FwcFJvdXRlclwiICk7XG5cbnZhciBDYWxlbmRhclNpbmdsZSA9IE1hcmlvbmV0dGUuTGF5b3V0Vmlldy5leHRlbmQoe1xuXHR0ZW1wbGF0ZSA6IF8udGVtcGxhdGUoIHJlcXVpcmUoXCJ0ZW1wbGF0ZXMvY2FsZW5kYXJTaW5nbGUuaHRtbFwiKSApLFxuXHRyZWdpb25zIDoge1xuXHRcdGV2ZW50TGlzdENvbnRhaW5lciA6IFwiI2V2ZW50LWxpc3QtY29udGFpbmVyXCJcblx0fSxcblx0dWkgOiB7XG5cdH0sXG5cdGV2ZW50cyA6IHtcblx0fSxcblx0aW5pdGlhbGl6ZSA6IGZ1bmN0aW9uKCl7XG5cblx0XHR0aGlzLmNvbGxlY3Rpb25WaWV3ID0gbmV3IE1hcmlvbmV0dGUuQ29sbGVjdGlvblZpZXcoe1xuXHRcdFx0dGFnTmFtZSA6ICd1bCcsXG5cdFx0XHRpZCA6ICdldmVudC1saXN0Jyxcblx0XHRcdGNoaWxkVmlldyA6IENhbGVuZGFySXRlbSxcblx0XHRcdGNvbGxlY3Rpb24gOiB0aGlzLm1vZGVsLmdldChcImV2ZW50Q29sbGVjdGlvblwiKVxuXHRcdH0pO1xuXHR9LFxuXHRvblNob3cgOiBmdW5jdGlvbigpe1xuXG5cdFx0dGhpcy5nZXRSZWdpb24oIFwiZXZlbnRMaXN0Q29udGFpbmVyXCIgKS5zaG93KCB0aGlzLmNvbGxlY3Rpb25WaWV3ICk7XG5cdH0sXG5cdG9uQ2xvc2UgOiBmdW5jdGlvbigpe1xuXG5cdFx0QXBwUm91dGVyLm5hdmlnYXRlKFwiL1wiLCB7dHJpZ2dlcjogdHJ1ZX0pO1xuXHR9XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBDYWxlbmRhclNpbmdsZTsiLCJ2YXIgQXBwUm91dGVyIFx0XHQ9IHJlcXVpcmUoIFwiY29udHJvbGxlcnMvYXBwUm91dGVyXCIgKTtcblxudmFyIGNhbGVuZGFyTG9hZCA9IHJlcXVpcmUoXCJjb250cm9sbGVycy9jYWxlbmRhckxvYWRcIik7XG52YXIgQ2FsZW5kYXJTaW5nbGUgXHQ9IHJlcXVpcmUoXCJ2aWV3cy9jYWxlbmRhclNpbmdsZVwiKTtcbnZhciBDYWxlbmRhck1vZGVsIFx0PSByZXF1aXJlKFwibW9kZWxzL2NhbGVuZGFyTW9kZWxcIik7XG52YXIgQ2FsZW5kYXJJdGVtTW9kZWwgXHQ9IHJlcXVpcmUoXCJtb2RlbHMvY2FsZW5kYXJJdGVtTW9kZWxcIik7XG52YXIgQ2FsZW5kYXJDb2xsZWN0aW9uIFx0PSByZXF1aXJlKFwiY29sbGVjdGlvbnMvY2FsZW5kYXJDb2xsZWN0aW9uXCIpO1xudmFyIFNwbGFzaFZpZXcgXHQ9IHJlcXVpcmUoXCJ2aWV3cy9zcGxhc2hWaWV3XCIpO1xuXG52YXIgaHVlQ29ubmVjdCA9IHJlcXVpcmUoXCJjb250cm9sbGVycy9odWVDb25uZWN0XCIpO1xudmFyIExpZ2h0UGF0dGVybiA9IHJlcXVpcmUoXCJjb250cm9sbGVycy9saWdodFBhdHRlcm5cIik7XG52YXIgTGlnaHRQYXR0ZXJuQ29udHJvbGxlciA9IHJlcXVpcmUoXCJjb250cm9sbGVycy9saWdodFBhdHRlcm5Db250cm9sbGVyXCIpO1xuXG52YXIgQ2FsZW5kYXJWaWV3ID0gTWFyaW9uZXR0ZS5MYXlvdXRWaWV3LmV4dGVuZCh7XG5cdHRlbXBsYXRlIDogXy50ZW1wbGF0ZSggcmVxdWlyZShcInRlbXBsYXRlcy9jYWxlbmRhcldyYXBwZXIuaHRtbFwiKSApLFxuXHRyZWdpb25zIDoge1xuXHRcdHJvb21TaW5nbGUgOiBcIiNyb29tLXNpbmdsZVwiLFxuXHRcdHNwbGFzaFBhZ2UgOiBcIiNzcGxhc2gtcGFnZVwiXG5cdH0sXG5cdHVpIDoge1xuXHRcdGNvbG9yUGlja2VyIDogXCIuY29sb3JcIixcblx0XHR0ZXN0IDogXCIjdGVzdFwiLFxuXHRcdGhleEJ1dHRvbiA6IFwiI2hleFwiLFxuXHRcdGhleElucHV0IDogXCIjaGV4LWlucHV0XCJcblx0fSxcblx0ZXZlbnRzIDoge1xuXHRcdFwiY2xpY2sgQHVpLnRlc3RcIiA6IGZ1bmN0aW9uKCl7XG5cdFx0XHRmb3IoIHZhciBpID0gMCA7IGkgPCA1IDsgaSsrICl7XG5cdFx0XHRcdG5ldyBMaWdodFBhdHRlcm4oaSsxLCBcInRlc3RcIik7XG5cdFx0XHR9XG5cdFx0fSxcblx0XHRcImNsaWNrIEB1aS5oZXhCdXR0b25cIiA6IGZ1bmN0aW9uKCl7XG5cdFx0XHR2YXIgY29sb3IgPSB0aGlzLnVpLmhleElucHV0LnZhbCgpO1xuXHRcdFx0dGhpcy50ZXN0Q29sb3IoIGNvbG9yICk7XG5cdFx0fVxuXHR9LFxuXHRpbml0aWFsaXplIDogZnVuY3Rpb24oKXtcblx0XHRcblx0XHR0aGlzLmNhbGVuZGFyU3RvcmUgPSB7fTtcblx0XHR0aGlzLmxpc3RlblRvKCBodWVDb25uZWN0LmV2ZW50cywgXCJldmVudHNMb2FkZWRcIiwgdGhpcy5ldmVudHNMb2FkZWQgKTtcblx0fSxcblx0b25TaG93IDogZnVuY3Rpb24oKXtcblxuXHRcdHZhciBjb2xvclBpY2tlciA9IHRoaXMudWkuY29sb3JQaWNrZXI7XG5cdFx0dmFyIF90aGlzID0gdGhpcztcblx0XHQkKGNvbG9yUGlja2VyKS5jaGFuZ2UoZnVuY3Rpb24oKXtcblx0XHRcdHZhciB2YWwgPSAkKHRoaXMpLnZhbCgpO1xuXHRcdFx0X3RoaXMudGVzdENvbG9yKCB2YWwgKTtcblx0XHR9KTtcblxuXHRcdHRoaXMuX3NwbGFzaFZpZXcgPSBuZXcgU3BsYXNoVmlldyh7IG1vZGVsIDogbmV3IEJhY2tib25lLk1vZGVsKHsgcm9vbXMgOiB7fSwgcm9vbXNEYXRhIDoge30gfSkgfSkgO1xuXG5cdFx0dGhpcy5nZXRSZWdpb24oXCJzcGxhc2hQYWdlXCIpLnNob3coIHRoaXMuX3NwbGFzaFZpZXcgKTtcblxuXHRcdHRoaXMubGlzdGVuVG8oIEFwcFJvdXRlciwgXCJyb3V0ZTpyb29tUm91dGVcIiwgZnVuY3Rpb24oIGtleSApe1xuXHRcdFx0XG5cdFx0XHR0aGlzLnNob3dSb29tKCBrZXkgKTtcblx0XHR9KTtcblx0XHR0aGlzLmxpc3RlblRvKCBBcHBSb3V0ZXIsIFwicm91dGU6ZGVmYXVsdFJvdXRlXCIsIHRoaXMuc2hvd1NwbGl0ICk7XG5cdH0sXG5cdHNob3dTcGxpdCA6IGZ1bmN0aW9uKCl7XG5cblx0XHR2YXIgJHNwbGl0RWwgPSB0aGlzLmdldFJlZ2lvbiggXCJzcGxhc2hQYWdlXCIgKS4kZWw7XG5cdFx0dmFyICRzaW5nbGVFbCA9IHRoaXMuZ2V0UmVnaW9uKCBcInJvb21TaW5nbGVcIiApLiRlbDtcblxuXHRcdCRzcGxpdEVsLnNob3coKTtcblx0XHQkc2luZ2xlRWwuaGlkZSgpO1xuXHR9LFxuXHRzaG93Um9vbSA6IGZ1bmN0aW9uKCBrZXkgKXtcblxuXHRcdHZhciAkc3BsaXRFbCA9IHRoaXMuZ2V0UmVnaW9uKCBcInNwbGFzaFBhZ2VcIiApLiRlbDtcblx0XHRcblx0XHR2YXIgbW9kZWwgPSB0aGlzLmNhbGVuZGFyU3RvcmVbIGtleSBdO1xuXG5cdFx0aWYoICFtb2RlbCApe1xuXHRcdFx0dGhpcy5xdWV1ZWRLZXkgPSBrZXk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdFxuXHRcdFx0dmFyIHZpZXcgPSBuZXcgQ2FsZW5kYXJTaW5nbGUoeyBtb2RlbCA6IG1vZGVsIH0pO1xuXHRcdFx0dmFyIHJlZ2lvbiA9IHRoaXMuZ2V0UmVnaW9uKCBcInJvb21TaW5nbGVcIiApLnNob3coIHZpZXcgKTtcblx0XHRcdCRzaW5nbGVFbCA9IHJlZ2lvbi4kZWw7XG5cblx0XHRcdCRzaW5nbGVFbC5zaG93KCk7XG5cdFx0XHQkc3BsaXRFbC5oaWRlKCk7XG5cdFx0fVxuXHR9LFxuXHRjaGVja1F1ZXVlIDogZnVuY3Rpb24oKXtcblxuXHRcdGlmKCB0aGlzLnF1ZXVlZEtleSApe1xuXHRcdFx0dGhpcy5zaG93Um9vbSggdGhpcy5xdWV1ZWRLZXkgKTtcblx0XHR9XG5cdH0sXG5cdHRlc3RDb2xvciA6IGZ1bmN0aW9uKCBfY29sb3IgKXtcblxuXHRcdHZhciBjb2xvciA9IG9uZS5jb2xvciggX2NvbG9yICk7XG5cdFx0dmFyIGhzbCA9IHtcblx0XHRcdGggOiBNYXRoLmZsb29yKCBjb2xvci5oKCkgKiAzNjApLCBcblx0XHRcdHMgOiBNYXRoLmZsb29yKCBjb2xvci5zKCkgKiAxMDApLFxuXHRcdFx0bCA6IE1hdGguZmxvb3IoIGNvbG9yLmwoKSAqIDEwMCkgXG5cdFx0fTtcblx0XHRodWVDb25uZWN0LnVwZGF0ZShbXG5cdFx0XHR7XG5cdFx0XHRcdCdpZCcgOiAxLFxuXHRcdFx0XHQnZGF0YScgOiB7XG5cdFx0XHRcdFx0J2hzbCcgOiBoc2wsXG5cdFx0XHRcdFx0J2R1cmF0aW9uJyA6IDFcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0J2lkJyA6IDIsXG5cdFx0XHRcdCdkYXRhJyA6IHtcblx0XHRcdFx0XHQnaHNsJyA6IGhzbCxcblx0XHRcdFx0XHQnZHVyYXRpb24nIDogMVxuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHQnaWQnIDogMyxcblx0XHRcdFx0J2RhdGEnIDoge1xuXHRcdFx0XHRcdCdoc2wnIDogaHNsLFxuXHRcdFx0XHRcdCdkdXJhdGlvbicgOiAxXG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHR7XG5cdFx0XHRcdCdpZCcgOiA0LFxuXHRcdFx0XHQnZGF0YScgOiB7XG5cdFx0XHRcdFx0J2hzbCcgOiBoc2wsXG5cdFx0XHRcdFx0J2R1cmF0aW9uJyA6IDFcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0J2lkJyA6IDUsXG5cdFx0XHRcdCdkYXRhJyA6IHtcblx0XHRcdFx0XHQnaHNsJyA6IGhzbCxcblx0XHRcdFx0XHQnZHVyYXRpb24nIDogMVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XSk7XHRcdFxuXHR9LFxuXHRldmVudHNMb2FkZWQgOiBmdW5jdGlvbiggZGF0YSApe1xuXG5cdFx0Y29uc29sZS5sb2coZGF0YSk7XG5cdFx0XG5cdFx0dmFyIGtleSA9IGRhdGEua2V5O1xuXHRcdHZhciBteUNhbGVuZGFyTW9kZWwgPSB0aGlzLmNhbGVuZGFyU3RvcmVbIGtleSBdO1xuXHRcdFxuXHRcdGlmKCAgIW15Q2FsZW5kYXJNb2RlbCApe1xuXG5cdFx0XHRteUNhbGVuZGFyTW9kZWwgPSBuZXcgQ2FsZW5kYXJNb2RlbCh7XG5cdFx0XHRcdGtleSA6IGtleSxcblx0XHRcdFx0ZXZlbnRDb2xsZWN0aW9uIDogbmV3IENhbGVuZGFyQ29sbGVjdGlvbigpXG5cdFx0XHR9KTtcblx0XHRcdFxuXHRcdFx0dGhpcy5jYWxlbmRhclN0b3JlWyBrZXkgXSA9IG15Q2FsZW5kYXJNb2RlbDtcblx0XHRcdHZhciBsaWdodFBhdHRlcm5Db250cm9sbGVyID0gbmV3IExpZ2h0UGF0dGVybkNvbnRyb2xsZXIoIG15Q2FsZW5kYXJNb2RlbCApO1xuXHRcdFx0bXlDYWxlbmRhck1vZGVsLnNldChcImxpZ2h0UGF0dGVybkNvbnRyb2xsZXJcIiwgbGlnaHRQYXR0ZXJuQ29udHJvbGxlcik7XG5cdFx0XHR0aGlzLl9zcGxhc2hWaWV3LmFkZFJvb20oIG15Q2FsZW5kYXJNb2RlbCApO1xuXHRcdH0gXG5cblx0XHR2YXIgcm9vbURhdGEgPSBkYXRhLmRhdGE7XG5cdFx0dmFyIHVwZGF0ZWQgPSByb29tRGF0YS51cGRhdGVkO1xuXG5cdFx0bXlDYWxlbmRhck1vZGVsLnNldChcInJvb21EYXRhXCIsIHJvb21EYXRhKTtcblx0XHRteUNhbGVuZGFyTW9kZWwuc2V0KFwidXBkYXRlZFwiLCB1cGRhdGVkKTtcblxuXHRcdHRoaXMuY2hlY2tRdWV1ZSgpO1xuXHR9IFxufSk7XG5cblxubW9kdWxlLmV4cG9ydHMgPSBDYWxlbmRhclZpZXc7ICAgICAgICAgICAgICAgICAgICBcbiAgICBcbiAiLCJ2YXIgVGltZURpc3BsYXlUZW1wbGF0ZSA9IF8udGVtcGxhdGUoIHJlcXVpcmUoXCJ0ZW1wbGF0ZXMvdGltZURpc3BsYXkuaHRtbFwiKSApO1xuXG52YXIgU3BsYXNoSXRlbVZpZXcgPSBNYXJpb25ldHRlLkl0ZW1WaWV3LmV4dGVuZCh7XG5cdHRlbXBsYXRlIDogXy50ZW1wbGF0ZSggcmVxdWlyZShcInRlbXBsYXRlcy9zcGxhc2hJdGVtLmh0bWxcIikgKSxcblx0dGFnTmFtZSA6IFwic2VjdGlvblwiLFxuXHRjbGFzc05hbWUgOiBcInJvb21cIixcblx0dWk6IHtcblx0XHR0aW1lRGlzcGxheTogJy50aW1lJ1xuXHR9LFxuXHRpbml0aWFsaXplIDogZnVuY3Rpb24oKXtcblxuXHRcdHRoaXMubGlzdGVuVG8oIHRoaXMubW9kZWwsIFwiY2hhbmdlOmN1cnJlbnRFdmVudFwiLCB0aGlzLnJlbmRlciApO1xuXHRcdHRoaXMubGlzdGVuVG8oIHRoaXMubW9kZWwsIFwiY2hhbmdlOnRpbWVMZWZ0XCIsIHRoaXMudXBkYXRlVGltZUxlZnQgKTtcblxuXHRcdFR3ZWVuTWF4LnRpY2tlci5hZGRFdmVudExpc3RlbmVyKCd0aWNrJywgdGhpcy51cGRhdGUsIHRoaXMpO1xuXG5cdFx0Ly8gdGhpcy5yZW5kZXIoKTtcblx0fSxcblx0dXBkYXRlOiBmdW5jdGlvbigpe1xuXG5cdFx0dmFyIGxpZ2h0UGF0dGVybiA9IHRoaXMubW9kZWwuZ2V0TGlnaHRQYXR0ZXJuKCk7XG5cblx0XHR0aGlzLiRlbC5jc3Moe1xuXHRcdFx0J2JhY2tncm91bmQtY29sb3InOiBsaWdodFBhdHRlcm4uZ2V0Q29sb3IoKVxuXHRcdH0pO1xuXHR9LFxuXHR1cGRhdGVUaW1lTGVmdCA6IGZ1bmN0aW9uKG1vZGVsLCBkYXRhKXtcblxuXHRcdHZhciBrZXkgPSBtb2RlbC5nZXQoXCJrZXlcIik7XG5cdFx0dGhpcy51aS50aW1lRGlzcGxheS5odG1sKCBUaW1lRGlzcGxheVRlbXBsYXRlKHtcblx0XHRcdGhvdXJzIDogZGF0YS5ob3Vycyxcblx0XHRcdG1pbnV0ZXMgOiBkYXRhLm1pbnV0ZXMsXG5cdFx0XHRzaG93Q29sb24gOiAoZGF0YS5zZWNvbmRzICUgMiA9PT0gMClcblx0XHR9KSApO1xuXHR9LFxuXHRvbkJlZm9yZVJlbmRlciA6IGZ1bmN0aW9uKCl7XG5cdFx0dmFyIGN1cnJlbnRFdmVudCA9IHRoaXMubW9kZWwuZ2V0KFwiY3VycmVudEV2ZW50XCIpO1xuXHRcdHRoaXMubW9kZWwuc2V0KCBcImN1cnJlbnRFdmVudERhdGFcIiwgY3VycmVudEV2ZW50ID8gY3VycmVudEV2ZW50LnRvSlNPTigpIDogbnVsbCApO1xuXHR9XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBTcGxhc2hJdGVtVmlldzsiLCJ2YXIgQXBwUm91dGVyIFx0XHQ9IHJlcXVpcmUoIFwiY29udHJvbGxlcnMvYXBwUm91dGVyXCIgKTtcblxudmFyIFN0YXRlID0gcmVxdWlyZSgnbW9kZWxzL3N0YXRlJyk7XG52YXIgcm9vbURhdGEgPSByZXF1aXJlKFwicm9vbURhdGFcIik7XG52YXIgU3BsYXNoSXRlbVZpZXcgPSByZXF1aXJlKFwidmlld3Mvc3BsYXNoSXRlbVZpZXdcIik7XG5cbnZhciBTcGxhc2hWaWV3ID0gTWFyaW9uZXR0ZS5MYXlvdXRWaWV3LmV4dGVuZCh7XG5cdGlkIDogXCJyb29tLXNwbGl0XCIsXG5cdHRlbXBsYXRlIDogXy50ZW1wbGF0ZSggcmVxdWlyZShcInRlbXBsYXRlcy9zcGxhc2hXcmFwcGVyLmh0bWxcIikgKSxcblx0dWkgOiB7XG5cdFx0cm9vbUNvbnRhaW5lcnMgOiBcIi5yb29tLWNvbnRhaW5lclwiXG5cdH0sXG5cdGV2ZW50cyA6IHtcblx0XHRcIm1vdXNlZW50ZXIgQHVpLnJvb21Db250YWluZXJzXCIgOiBmdW5jdGlvbihlKXtcblxuXHRcdFx0dGhpcy51aS5yb29tQ29udGFpbmVycy5lYWNoKGZ1bmN0aW9uKGluZGV4LCBlbCkge1xuXHRcdFx0XHR2YXIgaXNIb3ZlcmVkID0gKGVsID09PSBlLmN1cnJlbnRUYXJnZXQpO1xuXHRcdFx0XHQkKGVsKS50b2dnbGVDbGFzcygnaG92ZXJlZCcsIGlzSG92ZXJlZCk7XG5cdFx0XHRcdCQoZWwpLnRvZ2dsZUNsYXNzKCdub3QtaG92ZXJlZCcsICFpc0hvdmVyZWQpO1xuXHRcdFx0fSk7XG5cdFx0fSxcblx0XHRcIm1vdXNlbGVhdmUgQHVpLnJvb21Db250YWluZXJzXCIgOiBmdW5jdGlvbihlKXtcblx0XHRcdFx0XG5cdFx0XHR0aGlzLnVpLnJvb21Db250YWluZXJzLnJlbW92ZUNsYXNzKCdob3ZlcmVkIG5vdC1ob3ZlcmVkJyk7XG5cdFx0fSxcblx0XHRcImNsaWNrIEB1aS5yb29tQ29udGFpbmVyc1wiIDogZnVuY3Rpb24oIGUgKXtcblxuXHRcdFx0dmFyIGtleSA9ICQoIGUuY3VycmVudFRhcmdldCApLmRhdGEoXCJpZFwiKTtcblx0XHRcdEFwcFJvdXRlci5uYXZpZ2F0ZShcInJvb20vXCIra2V5LCB7dHJpZ2dlcjogdHJ1ZX0pO1xuXG5cdFx0XHR0aGlzLnVpLnJvb21Db250YWluZXJzLmVhY2goZnVuY3Rpb24oaW5kZXgsIGVsKSB7XG5cdFx0XHRcdHZhciBzaG91bGRFeHBhbmQgPSAoZWwgPT09IGUuY3VycmVudFRhcmdldCk7XG5cdFx0XHRcdCQoZWwpLnRvZ2dsZUNsYXNzKCdleHBhbmRlZCcsIHNob3VsZEV4cGFuZCk7XG5cdFx0XHRcdCQoZWwpLnRvZ2dsZUNsYXNzKCdjb2xsYXBzZWQnLCAhc2hvdWxkRXhwYW5kKTtcblx0XHRcdH0pO1xuXHRcdH1cblx0fSxcblx0cmVzZXQgOiBmdW5jdGlvbigpe1xuXG5cdFx0dGhpcy51aS5yb29tQ29udGFpbmVycy5yZW1vdmVDbGFzcygnZXhwYW5kZWQgY29sbGFwc2VkIGhvdmVyZWQgbm90LWhvdmVyZWQnKTtcblx0fSxcblx0aW5pdGlhbGl6ZSA6IGZ1bmN0aW9uKCl7XG5cdFx0Xy5iaW5kQWxsKHRoaXMsICdyZXNpemUnKTtcblx0XHQkKHdpbmRvdykucmVzaXplKCB0aGlzLnJlc2l6ZSApLnJlc2l6ZSgpO1xuXG5cdFx0dGhpcy5tb2RlbC5zZXQoXCJyb29tRGF0YVwiLCByb29tRGF0YSk7XG5cblx0XHRfLmVhY2goIHJvb21EYXRhLCBmdW5jdGlvbiggdmFsdWUsIGtleSApe1xuXHRcdFx0dGhpcy5hZGRSZWdpb24oIGtleSwgXCIjcm9vbS1cIitrZXkgKTtcblx0XHR9LCB0aGlzKTtcblxuXHR9LFxuXHRhZGRSb29tIDogZnVuY3Rpb24oIG1vZGVsICl7XG5cdFx0dmFyIGtleSA9IG1vZGVsLmdldChcImtleVwiKTtcblx0XHR2YXIgcmVnaW9uID0gdGhpcy5nZXRSZWdpb24oIGtleSApO1xuXHRcdHJlZ2lvbi5zaG93KCBuZXcgU3BsYXNoSXRlbVZpZXcoeyBtb2RlbCA6IG1vZGVsIH0gKSApO1xuXHR9LFxuXHRyZXNpemUgOiBmdW5jdGlvbigpe1xuXHRcdHZhciBhc3BlY3RSYXRpbyA9ICQod2luZG93KS53aWR0aCgpIC8gJCh3aW5kb3cpLmhlaWdodCgpO1xuXHRcdFN0YXRlLnNldCgncG9ydHJhaXQnLCBhc3BlY3RSYXRpbyA8PSAxKTtcblx0fVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gU3BsYXNoVmlldzsiXX0=
