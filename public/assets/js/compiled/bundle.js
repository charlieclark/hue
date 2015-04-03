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







         
},{"roomData":12,"views/appLayout":17,"views/calendarWrapper":20}],2:[function(require,module,exports){
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
		repeat : -1,
		fade: 0,
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
module.exports = "<% _.each( roomsData, function( data, key ){ %>\n\t<div class=\"room-container\">\n\t\t<section id=\"room-<%= key %>\" class=\"room\" data-id=\"<%= key %>\">\n\t\t\t<div class=\"number\"><%= key %></div>\n\t\t\t<div class=\"graph s s-room-<%= key %>\"></div>\n\t\t\t<!-- <div class=\"person\"><%= data.currentEventData ? data.currentEventData.summary : 'nothing' %></div> -->\n\t\t\t<div class=\"person\">Available</div>\n\t\t</section>\n\t</div>\n<% }); %>";

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
			var lightPatternController = new LightPatternController( myCalendarModel );
			myCalendarModel.set("lightPatternController", lightPatternController);
		} 

		var roomData = data.data;
		var updated = roomData.updated;

		myCalendarModel.set("roomData", roomData);
		myCalendarModel.set("updated", updated);

		this.checkQueue();
	} 
});


module.exports = CalendarView;                    
    
 
},{"collections/calendarCollection":2,"controllers/appRouter":3,"controllers/calendarLoad":4,"controllers/hueConnect":5,"controllers/lightPattern":6,"controllers/lightPatternController":7,"models/calendarItemModel":8,"models/calendarModel":9,"templates/calendarWrapper.html":15,"views/calendarSingle":19,"views/splashView":21}],21:[function(require,module,exports){
var State = require('models/state');

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
		}
	},
	initialize : function(){
		_.bindAll(this, 'resize');
		$(window).resize( this.resize ).resize();

		TweenMax.ticker.addEventListener('tick', this.update, this);
	},
	onRender : function(){

	},
	addRoom : function( model ){
		var rooms = this.model.get("rooms");
		rooms[ model.get("key") ] = model;

		this.listenTo( model, "change:currentEvent", this.render );
		this.listenTo( model, "change:timeLeft", this.updateTimeLeft );
		this.render();
	},
	resize : function(){
		var aspectRatio = $(window).width() / $(window).height();
		State.set('portrait', aspectRatio <= 1);
	},
	update: function(){

		var rooms =  this.model.get("rooms");

		_.each( rooms, function( room, key ) {
			
			var lightPattern = room.getLightPattern();

			$('#room-'+key).css({
				'background-color': lightPattern.getColor()
			});
		});
	},
	updateTimeLeft : function(model, data){

		var key = model.get("key");
		$('#room-'+key).find(".person").html( [ data.hours , data.minutes , data.seconds ].join(":") );
	},
	onBeforeRender : function(){

		var rooms =  this.model.get("rooms");
		var roomsData =  this.model.get("roomsData");

		_.each( rooms, function( room, key ) {
			roomsData[ key ] = room.toJSON();
		});
	}
});

module.exports = SplashView;
},{"models/state":10,"templates/splashWrapper.html":16}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIuLi9wdWJsaWMvYXNzZXRzL2pzL3VzZXIvYXBwLmpzIiwiLi4vcHVibGljL2Fzc2V0cy9qcy91c2VyL2NvbGxlY3Rpb25zL2NhbGVuZGFyQ29sbGVjdGlvbi5qcyIsIi4uL3B1YmxpYy9hc3NldHMvanMvdXNlci9jb250cm9sbGVycy9hcHBSb3V0ZXIuanMiLCIuLi9wdWJsaWMvYXNzZXRzL2pzL3VzZXIvY29udHJvbGxlcnMvY2FsZW5kYXJMb2FkLmpzIiwiLi4vcHVibGljL2Fzc2V0cy9qcy91c2VyL2NvbnRyb2xsZXJzL2h1ZUNvbm5lY3QuanMiLCIuLi9wdWJsaWMvYXNzZXRzL2pzL3VzZXIvY29udHJvbGxlcnMvbGlnaHRQYXR0ZXJuLmpzIiwiLi4vcHVibGljL2Fzc2V0cy9qcy91c2VyL2NvbnRyb2xsZXJzL2xpZ2h0UGF0dGVybkNvbnRyb2xsZXIuanMiLCIuLi9wdWJsaWMvYXNzZXRzL2pzL3VzZXIvbW9kZWxzL2NhbGVuZGFySXRlbU1vZGVsLmpzIiwiLi4vcHVibGljL2Fzc2V0cy9qcy91c2VyL21vZGVscy9jYWxlbmRhck1vZGVsLmpzIiwiLi4vcHVibGljL2Fzc2V0cy9qcy91c2VyL21vZGVscy9zdGF0ZS5qcyIsIi4uL3B1YmxpYy9hc3NldHMvanMvdXNlci9waXBlLmpzIiwiLi4vcHVibGljL2Fzc2V0cy9qcy91c2VyL3Jvb21EYXRhLmpzIiwiLi4vcHVibGljL2Fzc2V0cy9qcy91c2VyL3RlbXBsYXRlcy9jYWxlbmRhckl0ZW0uaHRtbCIsIi4uL3B1YmxpYy9hc3NldHMvanMvdXNlci90ZW1wbGF0ZXMvY2FsZW5kYXJTaW5nbGUuaHRtbCIsIi4uL3B1YmxpYy9hc3NldHMvanMvdXNlci90ZW1wbGF0ZXMvY2FsZW5kYXJXcmFwcGVyLmh0bWwiLCIuLi9wdWJsaWMvYXNzZXRzL2pzL3VzZXIvdGVtcGxhdGVzL3NwbGFzaFdyYXBwZXIuaHRtbCIsIi4uL3B1YmxpYy9hc3NldHMvanMvdXNlci92aWV3cy9hcHBMYXlvdXQuanMiLCIuLi9wdWJsaWMvYXNzZXRzL2pzL3VzZXIvdmlld3MvY2FsZW5kYXJJdGVtLmpzIiwiLi4vcHVibGljL2Fzc2V0cy9qcy91c2VyL3ZpZXdzL2NhbGVuZGFyU2luZ2xlLmpzIiwiLi4vcHVibGljL2Fzc2V0cy9qcy91c2VyL3ZpZXdzL2NhbGVuZGFyV3JhcHBlci5qcyIsIi4uL3B1YmxpYy9hc3NldHMvanMvdXNlci92aWV3cy9zcGxhc2hWaWV3LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5SkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNiQTtBQUNBOztBQ0RBO0FBQ0E7O0FDREE7QUFDQTs7QUNEQTtBQUNBOztBQ0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3REQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0tBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwid2luZG93LkNvbW1vbiA9IHtcblx0cGF0aCA6IHtcblx0XHRhc3NldHMgOiBcImFzc2V0cy9cIixcblx0XHRpbWcgOiBcImFzc2V0cy9pbWcvXCIsXG5cdFx0YXVkaW8gOiBcImFzc2V0cy9hdWRpby9cIlxuXHR9XG59O1xuXG4vL2Jhc2VcbnZhciBBcHBMYXlvdXQgPSByZXF1aXJlKCBcInZpZXdzL2FwcExheW91dFwiICk7XG5cbi8vY3VzdG9tXG52YXIgQ2FsZW5kYXJXcmFwcGVyXHQ9IHJlcXVpcmUoXCJ2aWV3cy9jYWxlbmRhcldyYXBwZXJcIik7XG52YXIgcm9vbURhdGEgPSByZXF1aXJlKFwicm9vbURhdGFcIik7XG5cbi8vVEhFIEFQUExJQ0FUSU9OXG52YXIgTXlBcHAgPSBNYXJpb25ldHRlLkFwcGxpY2F0aW9uLmV4dGVuZCh7XG5cdGluaXRpYWxpemUgOiBmdW5jdGlvbigpe1xuXHRcdFxuXHR9LFxuXHRvblN0YXJ0IDogZnVuY3Rpb24oKXtcblxuXHRcdHZhciBteUNhbGVuZGFyID0gbmV3IENhbGVuZGFyV3JhcHBlciggeyBtb2RlbCA6IG5ldyBCYWNrYm9uZS5Nb2RlbCh7IHJvb21zIDogcm9vbURhdGEgfSkgfSk7XG5cdFx0QXBwTGF5b3V0LmdldFJlZ2lvbihcIm1haW5cIikuc2hvdyggbXlDYWxlbmRhciApO1xuXG5cdFx0QmFja2JvbmUuaGlzdG9yeS5zdGFydCh7XG5cdFx0XHRwdXNoU3RhdGUgOiBmYWxzZVxuXHRcdH0pO1xuXHR9IFxufSk7XG5cbi8va2lja29mZlxuJChmdW5jdGlvbigpe1xuXHR3aW5kb3cuYXBwID0gbmV3IE15QXBwKCk7XG5cdHdpbmRvdy5hcHAuc3RhcnQoKTsgXG59KTtcblxuXG5cblxuXG5cblxuICAgICAgICAgIiwidmFyIENhbGVuZGFyQ29sbGVjdGlvbiA9IEJhY2tib25lLkNvbGxlY3Rpb24uZXh0ZW5kKHtcblx0aW5pdGlhbGl6ZSA6IGZ1bmN0aW9uKCl7XG5cblx0fSxcblx0Y29tcGFyYXRvciA6IGZ1bmN0aW9uKCBhLCBiICl7XG5cdFx0dmFyIGFUaW1lID0gYS5nZXQoXCJzdGFydFwiKS5yYXc7XG5cdFx0dmFyIGJUaW1lID0gYi5nZXQoXCJzdGFydFwiKS5yYXc7XG5cdFx0cmV0dXJuIGFUaW1lIC0gYlRpbWU7XG5cdH0sXG5cdGdldEN1cnJlbnQgOiBmdW5jdGlvbigpe1xuXG5cdFx0cmV0dXJuIHRoaXMuZmluZChmdW5jdGlvbiggbW9kZWwgKXtcblxuXHRcdFx0cmV0dXJuIG1vZGVsLmlzQWN0aXZlKCk7XG5cdFx0fSk7XG5cdH1cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IENhbGVuZGFyQ29sbGVjdGlvbjsiLCJ2YXIgcGlwZSA9IHJlcXVpcmUoXCJwaXBlXCIpO1xuXG52YXIgTXlBcHBSb3V0ZXIgPSBNYXJpb25ldHRlLkFwcFJvdXRlci5leHRlbmQoe1xuXHRjb250cm9sbGVyIDoge1xuXHRcdCdyb29tUm91dGUnIDogZnVuY3Rpb24oKXt9LFxuXHRcdCdkZWZhdWx0Um91dGUnIDogZnVuY3Rpb24odmFsdWUsIHF1ZXJ5U3RyaW5nKXtcblx0XHRcdHZhciBwYXJhbXMgPSBwYXJzZVF1ZXJ5U3RyaW5nKHF1ZXJ5U3RyaW5nKTtcblx0XHRcdF8uZWFjaCggcGFyYW1zLCBmdW5jdGlvbiggdmFsdWUsIGtleSApe1xuXHRcdFx0XHRwaXBlLnRyaWdnZXIoXCJwYXJhbTpcIitrZXksIHZhbHVlIClcblx0XHRcdH0pO1xuXHRcdH1cblx0fSxcblx0YXBwUm91dGVzIDoge1xuXHRcdFwicm9vbS86a2V5XCIgOiBcInJvb21Sb3V0ZVwiLFxuXHRcdFwiKmFjdGlvbnNcIiA6IFwiZGVmYXVsdFJvdXRlXCJcblx0fVxufSk7XG5cbmZ1bmN0aW9uIHBhcnNlUXVlcnlTdHJpbmcocXVlcnlTdHJpbmcpe1xuICAgIHZhciBwYXJhbXMgPSB7fTtcbiAgICBpZihxdWVyeVN0cmluZyl7XG4gICAgICAgIF8uZWFjaChcbiAgICAgICAgICAgIF8ubWFwKGRlY29kZVVSSShxdWVyeVN0cmluZykuc3BsaXQoLyYvZyksZnVuY3Rpb24oZWwsaSl7XG4gICAgICAgICAgICAgICAgdmFyIGF1eCA9IGVsLnNwbGl0KCc9JyksIG8gPSB7fTtcbiAgICAgICAgICAgICAgICBpZihhdXgubGVuZ3RoID49IDEpe1xuICAgICAgICAgICAgICAgICAgICB2YXIgdmFsID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgICAgICBpZihhdXgubGVuZ3RoID09IDIpXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWwgPSBhdXhbMV07XG4gICAgICAgICAgICAgICAgICAgIG9bYXV4WzBdXSA9IHZhbDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIG87XG4gICAgICAgICAgICB9KSxcbiAgICAgICAgICAgIGZ1bmN0aW9uKG8pe1xuICAgICAgICAgICAgICAgIF8uZXh0ZW5kKHBhcmFtcyxvKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgKTtcbiAgICB9XG4gICAgcmV0dXJuIHBhcmFtcztcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBuZXcgTXlBcHBSb3V0ZXIoKTtcbiIsInZhciBwaXBlID0gcmVxdWlyZShcInBpcGVcIik7XG5cbi8vbGlzdGVuaW5nIGZvciBsb2FkXG53aW5kb3cuaGFuZGxlQ2xpZW50TG9hZCA9IGZ1bmN0aW9uKCl7XG5cbiAgY29uc29sZS5sb2coXCJnb29nbGUgYXBpIGxvYWRlZFwiKTtcbiAgXy5kZWZlciggZnVuY3Rpb24oKXsgaW5pdCgpIH0pO1xufVxuXG52YXIgY2xpZW50SWQgPSAnNDMzODM5NzIzMzY1LXU3Z3JsZHR2ZjhwYWJqa2o0ZnJjaW8zY3Y1aGl0OGZtLmFwcHMuZ29vZ2xldXNlcmNvbnRlbnQuY29tJztcbnZhciBhcGlLZXkgPSAnQUl6YVN5QnNLZFRwbFJYdUV3Z3ZQU0hfZ0dGOE9Hc3czNXQxNXYwJztcbnZhciBzY29wZXMgPSAnaHR0cHM6Ly93d3cuZ29vZ2xlYXBpcy5jb20vYXV0aC9jYWxlbmRhcic7XG52YXIgcm9vbURhdGEgPSByZXF1aXJlKFwicm9vbURhdGFcIik7XG52YXIgcHVsbEludGVydmFsID0gMTAwMCAqIDEwO1xuXG4vL1RPRE8gOiBpbnRlZ3JhdGUgYWxsIDQgY2FsZW5kYXJzXG5cbmZ1bmN0aW9uIGluaXQoKXtcblx0Z2FwaS5jbGllbnQuc2V0QXBpS2V5KGFwaUtleSk7XG5cdGNoZWNrQXV0aCgpO1xufVxuXG5mdW5jdGlvbiBjaGVja0F1dGgoKXtcblx0Z2FwaS5hdXRoLmF1dGhvcml6ZSgge1xuXHRcdGNsaWVudF9pZDogY2xpZW50SWQsIFxuXHRcdHNjb3BlOiBzY29wZXMsIFxuXHRcdGltbWVkaWF0ZTogZmFsc2Vcblx0fSwgaGFuZGxlQXV0aFJlc3VsdCApO1xufVxuXG5mdW5jdGlvbiBoYW5kbGVBdXRoUmVzdWx0KCBhdXRoUmVzdWx0ICl7XG5cblx0aWYoYXV0aFJlc3VsdCl7XG5cdFx0bWFrZUFwaUNhbGwoKTtcblx0fVxufVxuXG5mdW5jdGlvbiBtYWtlQXBpQ2FsbCgpIHtcbiAgZ2FwaS5jbGllbnQubG9hZCgnY2FsZW5kYXInLCAndjMnLCBmdW5jdGlvbigpIHtcbiAgICAgIFxuICAgICAgcHVsbFJvb21zKCk7XG4gICAgICBzZXRJbnRlcnZhbCggcHVsbFJvb21zLCBwdWxsSW50ZXJ2YWwgKTsgICAgICAgICAgXG4gIH0pO1xufVxuXG5mdW5jdGlvbiBwdWxsUm9vbXMoKXtcblxuICB2YXIgZnJvbSA9IG5ldyBEYXRlKCk7XG4gIHZhciB0byA9IG5ldyBEYXRlKCk7XG4gICAgICB0by5zZXREYXRlKCB0by5nZXREYXRlKCkgKyAxICk7XG5cbiAgXy5lYWNoKCByb29tRGF0YSwgZnVuY3Rpb24oIGRhdGEsIGtleSApe1xuXG4gICAgdmFyIHJlcXVlc3QgPSBnYXBpLmNsaWVudC5jYWxlbmRhci5ldmVudHMubGlzdCh7XG4gICAgICAgICdjYWxlbmRhcklkJzogZGF0YS5jYWxlbmRhcklkLFxuICAgICAgICB0aW1lTWluIDogZnJvbS50b0lTT1N0cmluZygpLFxuICAgICAgICB0aW1lTWF4IDogdG8udG9JU09TdHJpbmcoKSxcbiAgICAgICAgc2luZ2xlRXZlbnRzIDogdHJ1ZVxuICAgICAgfSk7XG5cbiAgICAgcmVxdWVzdC50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG5cbiAgICAgICAgICByb29tTG9hZGVkKCBrZXksIHJlc3BvbnNlLnJlc3VsdCApO1xuICAgICAgfSwgZnVuY3Rpb24ocmVhc29uKSB7XG5cbiAgICAgICAgICBjb25zb2xlLmxvZygnRXJyb3I6ICcgKyByZWFzb24ucmVzdWx0LmVycm9yLm1lc3NhZ2UpO1xuICAgICAgfSk7XG4gIH0pO1xufVxuXG5mdW5jdGlvbiByb29tTG9hZGVkKCBrZXksIGRhdGEgKXtcblxuICBldmVudHMudHJpZ2dlciggXCJldmVudHNMb2FkZWRcIiwgeyBrZXkgOiBrZXksIGRhdGEgOiBkYXRhIH0gKTtcbn1cblxudmFyIGV2ZW50cyA9IF8uZXh0ZW5kKHt9LCBCYWNrYm9uZS5FdmVudHMpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblxuICBldmVudHMgOiBldmVudHNcbn07XG4iLCJ2YXIgbXlTb2NrZXQgPSBudWxsO1xudmFyIGNvbm5lY3RlZCA9IGZhbHNlO1xuXG52YXIgcGlwZSA9IHJlcXVpcmUoXCJwaXBlXCIpO1xuXG5mdW5jdGlvbiBpbml0KCl7XG5cblx0cGlwZS5vbihcInBhcmFtOnNvY2tldFwiLCBjb25uZWN0KVxufVxuXG5mdW5jdGlvbiBjb25uZWN0KCl7XG5cdFxuXHRteVNvY2tldCA9IGlvLmNvbm5lY3QoJy8vbG9jYWxob3N0OjMwMDAnKTtcblx0bXlTb2NrZXQub24oJ2Nvbm5lY3QnLCBmdW5jdGlvbigpe1xuXHRcdGNvbm5lY3RlZCA9IHRydWU7XG5cdH0pO1x0XG59XG5cbmZ1bmN0aW9uIHVwZGF0ZSggZGF0YSApe1xuXG5cdGlmKGNvbm5lY3RlZCl7XG5cdFx0bXlTb2NrZXQuZW1pdCggJ3VwZGF0ZV9kYXRhJywgZGF0YSApO1x0XG5cdH1cbn1cblxuaW5pdCgpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblx0aW5pdCA6IGluaXQsXG5cdHVwZGF0ZSA6IHVwZGF0ZSxcblx0Y29ubmVjdGVkIDogY29ubmVjdGVkXG59IiwidmFyIGh1ZUNvbm5lY3QgPSByZXF1aXJlKFwiY29udHJvbGxlcnMvaHVlQ29ubmVjdFwiKTtcblxuZnVuY3Rpb24gTGlnaHRQYXR0ZXJuKCBsaWdodElkLCBwYXR0ZXJuSWQsIG9wdF9kYXRhICl7XG5cblx0dGhpcy5fcGF0dGVybiA9IHBhdHRlcm5zWyBwYXR0ZXJuSWQgXTtcblxuXHQvLyBtYWtlIHNlcXVlbmNlIGJ5IHBhdHRlcm5JZFxuXHR0aGlzLmNyZWF0ZVNlcXVlbmNlKCBwYXR0ZXJuSWQsIG9wdF9kYXRhICk7XG5cblx0dGhpcy5fbGlnaHRJZCA9IGxpZ2h0SWQ7XG5cblx0dGhpcy5fc3RlcCA9IDA7XG5cdHRoaXMuX2l0ZXJhdGlvbiA9IDA7XG5cblx0dGhpcy5fc2VxdWVuY2UgPSB0aGlzLnN0YXJ0U2VxdWVuY2UoIHBhdHRlcm5JZCApO1xuXG5cdHRoaXMuX3RpbWVvdXQgPSBudWxsO1xufVxuXG5MaWdodFBhdHRlcm4ucHJvdG90eXBlID0ge1xuXHRjcmVhdGVTZXF1ZW5jZSA6IGZ1bmN0aW9uKCBwYXR0ZXJuSWQsIG9wdF9kYXRhICl7XG5cdFx0XG5cdFx0dmFyIHBhdHRlcm4gPSBwYXR0ZXJuc1sgcGF0dGVybklkIF07XG5cblx0XHRzd2l0Y2gocGF0dGVybklkKSB7XG5cdFx0XHRjYXNlICdvY2N1cGllZCc6XG5cdFx0XHR2YXIgbnVtU3RvcHMgPSAzMDtcblxuXHRcdFx0cGF0dGVybi5zdGFydCA9IG9wdF9kYXRhLnN0YXJ0O1xuXHRcdFx0cGF0dGVybi5lbmQgPSBvcHRfZGF0YS5lbmQ7XG5cdFx0XHRwYXR0ZXJuLndhaXQgPSAocGF0dGVybi5lbmQgLSBwYXR0ZXJuLnN0YXJ0KSAvIG51bVN0b3BzIC8gMTAwMDtcblx0XHRcdHBhdHRlcm4uZmFkZSA9IHBhdHRlcm4ud2FpdDtcblxuXHRcdFx0dmFyIHJhaW5ib3cgPSBuZXcgUmFpbmJvdygpO1xuXHRcdFx0cmFpbmJvdy5zZXRTcGVjdHJ1bS5hcHBseSggcmFpbmJvdywgcGF0dGVybi5jb2xvcnMgKTtcblxuXHRcdFx0cGF0dGVybi5zZXF1ZW5jZSA9IFtdO1xuXHRcdFx0Zm9yKHZhciBpID0gMDsgaSA8IG51bVN0b3BzOyBpKyspIHtcblx0XHRcdFx0dmFyIGNvbG9yID0gcmFpbmJvdy5jb2xvdXJBdCggaS8obnVtU3RvcHMtMSkgKiAxMDAgKTtcblx0XHRcdFx0cGF0dGVybi5zZXF1ZW5jZS5wdXNoKCBjb2xvciApO1xuXHRcdFx0fVxuXHRcdFx0YnJlYWs7XG5cblx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRwYXR0ZXJuLnNlcXVlbmNlID0gcGF0dGVybi5jb2xvcnMuY29uY2F0KCk7XG5cdFx0XHRicmVhaztcblx0XHR9XG5cdH0sXG5cdGdldENvbG9yIDogZnVuY3Rpb24oKXtcblxuXHRcdHJldHVybiB0aGlzLl9zZXF1ZW5jZVt0aGlzLl9zdGVwXTtcblx0fSxcblx0c3RhcnRTZXF1ZW5jZSA6IGZ1bmN0aW9uKCBwYXR0ZXJuSWQgKXtcblxuXHRcdHZhciBwYXR0ZXJuID0gcGF0dGVybnNbIHBhdHRlcm5JZCBdO1xuXHRcdHRoaXMuX3NlcXVlbmNlID0gcGF0dGVybi5zZXF1ZW5jZTtcblxuXHRcdHRoaXMuc3RvcFNlcXVlbmNlKCk7XG5cblx0XHR2YXIgc3RlcDtcblxuXHRcdHN3aXRjaChwYXR0ZXJuSWQpIHtcblx0XHRcdGNhc2UgJ29jY3VwaWVkJzpcblx0XHRcdHN0ZXAgPSBNYXRoLmZsb29yKCAobmV3IERhdGUoKSAtIHBhdHRlcm4uc3RhcnQpIC8gKHBhdHRlcm4uZW5kIC0gcGF0dGVybi5zdGFydCkgKiAzMCApO1xuXHRcdFx0YnJlYWs7XG5cblx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRzdGVwID0gMDtcblx0XHRcdGJyZWFrO1xuXHRcdH1cblxuXHRcdHRoaXMucGxheVNlcXVlbmNlU3RlcCggc3RlcCwgcGF0dGVybi5pbnN0YW50ICk7XG5cblx0XHRyZXR1cm4gdGhpcy5fc2VxdWVuY2U7XG5cdH0sXG5cdHN0b3BTZXF1ZW5jZSA6IGZ1bmN0aW9uKCl7XG5cblx0XHR0aGlzLl9zdGVwID0gMDtcblx0XHR0aGlzLl9pdGVyYXRpb24gPSAwO1xuXG5cdFx0d2luZG93LmNsZWFyVGltZW91dCggdGhpcy5fdGltZW91dCApO1xuXHR9LFxuXHRwbGF5U2VxdWVuY2VTdGVwOiBmdW5jdGlvbiggc3RlcCwgaW5zdGFudCApe1xuXG5cdFx0Ly8gY29uc29sZS5sb2coXCJwbGF5IHNlcXVlbmNlIHN0ZXBcIilcblxuXHRcdHRoaXMuX3N0ZXAgPSBzdGVwO1xuXG5cdFx0dmFyIGNvbG9yID0gb25lLmNvbG9yKCB0aGlzLmdldENvbG9yKCkgKTtcblx0XHR2YXIgZmFkZSA9IGluc3RhbnQgPyAwIDogdGhpcy5fcGF0dGVybi5mYWRlO1xuXHRcdHZhciB3YWl0ID0gdGhpcy5fcGF0dGVybi53YWl0O1xuXG5cdFx0dmFyIGhzbCA9IHtcblx0XHRcdGggOiBNYXRoLmZsb29yKCBjb2xvci5oKCkgKiAzNjApLCBcblx0XHRcdHMgOiBNYXRoLmZsb29yKCBjb2xvci5zKCkgKiAxMDApLFxuXHRcdFx0bCA6IE1hdGguZmxvb3IoIGNvbG9yLmwoKSAqIDEwMCkgXG5cdFx0fTtcblxuXHRcdGh1ZUNvbm5lY3QudXBkYXRlKFt7XG5cdFx0XHRpZCA6IHRoaXMuX2xpZ2h0SWQsXG5cdFx0XHRkYXRhIDoge1xuXHRcdFx0XHRoc2wgOiBoc2wsXG5cdFx0XHRcdGR1cmF0aW9uIDogZmFkZVxuXHRcdFx0fVxuXHRcdH1dKTtcblxuXHRcdHdpbmRvdy5jbGVhclRpbWVvdXQoIHRoaXMuX3RpbWVvdXQgKTtcblx0XHR0aGlzLl90aW1lb3V0ID0gd2luZG93LnNldFRpbWVvdXQoJC5wcm94eSh0aGlzLm5leHRTZXF1ZW5jZVN0ZXAsIHRoaXMpLCB3YWl0KjEwMDApO1xuXHR9LFxuXHRuZXh0U2VxdWVuY2VTdGVwOiBmdW5jdGlvbigpe1xuXG5cdFx0dmFyIHRvdGFsU3RlcHMgPSB0aGlzLl9zZXF1ZW5jZS5sZW5ndGg7XG5cdFx0dmFyIHJlcGVhdCA9IHRoaXMuX3BhdHRlcm4ucmVwZWF0O1xuXG5cdFx0dGhpcy5fc3RlcCArKztcblx0XHRpZih0aGlzLl9zdGVwID4gdG90YWxTdGVwcyAtIDEpIHtcblx0XHRcdHRoaXMuX3N0ZXAgPSAwO1xuXHRcdFx0dGhpcy5faXRlcmF0aW9uICsrO1xuXHRcdH1cblxuXHRcdGlmKHJlcGVhdCA+IC0xICYmIHRoaXMuX2l0ZXJhdGlvbiA+IHJlcGVhdCkge1xuXHRcdFx0dGhpcy5zdG9wU2VxdWVuY2UoKTtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHR0aGlzLnBsYXlTZXF1ZW5jZVN0ZXAoIHRoaXMuX3N0ZXAgKTtcblx0fVxufVxuXG52YXIgcGF0dGVybnMgPSB7XG5cdCd0ZXN0JyA6IHtcblx0XHRpbnN0YW50IDogZmFsc2UsXG5cdFx0cmVwZWF0IDogIC0xLFxuXHRcdGZhZGU6IDEsXG5cdFx0d2FpdDogMSxcblx0XHRjb2xvcnM6IFtcIiNGQjE5MTFcIiwgXCIjMDBmZjAwXCIsIFwiIzQxNTZGRlwiLCBcIiNGRjAwMURcIiwgXCIjRkZGRjA3XCJdLFxuXHRcdHNlcXVlbmNlIDogW11cblx0fSxcblx0J2F2YWlsYWJsZScgOiB7XG5cdFx0aW5zdGFudCA6IHRydWUsXG5cdFx0cmVwZWF0IDogLTEsXG5cdFx0ZmFkZTogMCxcblx0XHR3YWl0OiAwLFxuXHRcdGNvbG9yczogW1wiIzM1MjNmNlwiXSxcblx0XHRzZXF1ZW5jZSA6IFtdXG5cdH0sXG5cdCdvY2N1cGllZCcgOiB7XG5cdFx0aW5zdGFudCA6IHRydWUsXG5cdFx0cmVwZWF0IDogMCxcblx0XHRmYWRlOiAwLFxuXHRcdHdhaXQ6IDAsXG5cdFx0c3RhcnQgOiAwLFxuXHRcdGVuZCA6IDAsXG5cdFx0Y29sb3JzOiBbXCIjMmRjYzNkXCIsIFwiI2YzZTUzM1wiLCBcIiNmYzMxMmNcIl0sXG5cdFx0c2VxdWVuY2UgOiBbXVxuXHR9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gTGlnaHRQYXR0ZXJuOyIsInZhciBMaWdodFBhdHRlcm4gPSByZXF1aXJlKFwiY29udHJvbGxlcnMvbGlnaHRQYXR0ZXJuXCIpO1xuXG5mdW5jdGlvbiBMaWdodFBhdHRlcm5Db250cm9sbGVyKCBtb2RlbCApe1xuXHRcblx0dGhpcy5fbW9kZWwgPSBtb2RlbDtcblx0dGhpcy5pbml0KCApO1xufVxuXG5MaWdodFBhdHRlcm5Db250cm9sbGVyLnByb3RvdHlwZSA9IHtcblx0aW5pdCA6IGZ1bmN0aW9uKCl7XG5cblx0XHR0aGlzLmlzQXZhaWxhYmxlKCk7XG5cdFx0dGhpcy5fbW9kZWwub24oIFwiY2hhbmdlOmN1cnJlbnRFdmVudFwiLCB0aGlzLmN1cnJlbnRDaGFuZ2VkLCB0aGlzICApO1xuXHR9LFxuXHRjdXJyZW50Q2hhbmdlZCA6IGZ1bmN0aW9uKCBwYXJlbnQsIG1vZGVsICl7XG5cblx0XHR0aGlzLnN0b3BFeGlzdGluZygpO1xuXG5cdFx0dmFyIGRhdGEgPSB7fTtcblx0XHR2YXIgdHlwZSA9ICdhdmFpbGFibGUnO1xuXG5cdFx0aWYoIG1vZGVsICl7XG5cblx0XHRcdHR5cGUgPSBtb2RlbC5nZXRQYXR0ZXJuVHlwZSgpO1xuXHRcdFx0ZGF0YSA9IHtcblx0XHRcdFx0c3RhcnQgOiBtb2RlbC5nZXQoXCJzdGFydFwiKS5yYXcsXG5cdFx0XHRcdGVuZCA6IG1vZGVsLmdldChcImVuZFwiKS5yYXdcblx0XHRcdH1cblxuXHRcdH1cblx0XHRcblx0XHR0aGlzLm5ld1BhdHRlcm4oIHR5cGUsIGRhdGEgKTtcblxuXHR9LFxuXHRpc0F2YWlsYWJsZSA6IGZ1bmN0aW9uKCl7XG5cblx0XHR0aGlzLm5ld1BhdHRlcm4oIFwiYXZhaWxhYmxlXCIgKTtcblx0fSxcblx0Z2V0Q3VycmVudCA6IGZ1bmN0aW9uKCl7XG5cblx0XHRyZXR1cm4gdGhpcy5fY3VycmVudFBhdHRlcm47XG5cdH0sXG5cdG5ld1BhdHRlcm4gOiBmdW5jdGlvbiggdHlwZSwgZGF0YSApe1xuXG5cdFx0dmFyIGtleSA9IHRoaXMuX21vZGVsLmdldChcImtleVwiKTtcblxuXHRcdGRhdGEgPSBkYXRhIHx8IHt9O1xuXG5cdFx0dGhpcy5zdG9wRXhpc3RpbmcoKTtcblxuXHRcdHRoaXMuX2N1cnJlbnRQYXR0ZXJuID0gbmV3IExpZ2h0UGF0dGVybigga2V5LCB0eXBlLCBkYXRhKTtcblxuXHR9LFxuXHRzdG9wRXhpc3RpbmcgOiBmdW5jdGlvbigpe1xuXG5cdFx0aWYoIHRoaXMuX2N1cnJlbnRQYXR0ZXJuICl7XG5cdFx0XHR0aGlzLl9jdXJyZW50UGF0dGVybi5zdG9wU2VxdWVuY2UoKTtcdFxuXHRcdH1cblx0fVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IExpZ2h0UGF0dGVybkNvbnRyb2xsZXI7IiwidmFyIENhbGVuZGFySXRlbU1vZGVsID0gQmFja2JvbmUuTW9kZWwuZXh0ZW5kKHtcblx0ZGVmYXVsdHMgOiB7XG5cdFx0c3VtbWFyeSA6IFwibi9hXCIsXG5cdFx0ZGVzY3JpcHRpb24gOiBcIm4vYVwiLFxuXHRcdHN0YXJ0IDogXCJuL2FcIixcblx0XHRlbmQgOiBcIm4vYVwiLFxuXHR9LFxuXHRpbml0aWFsaXplIDogZnVuY3Rpb24oKXtcblxuXHRcdHRoaXMuY29udmVydERhdGUoXCJzdGFydFwiKTtcblx0XHR0aGlzLmNvbnZlcnREYXRlKFwiZW5kXCIpO1xuXHR9LFxuXHRjb252ZXJ0RGF0ZSA6IGZ1bmN0aW9uKCBrZXkgKXtcblx0XHQvL2NvbnZlcnQgZGF0YXNcblx0XHR2YXIgZGF0ZVN0cmluZyA9IHRoaXMuZ2V0KCBrZXkgKVxuXHRcdGlmKCFkYXRlU3RyaW5nKSByZXR1cm47XG5cdFx0XG5cdFx0ZGF0ZVN0cmluZyA9IGRhdGVTdHJpbmcuZGF0ZVRpbWU7XG5cdFx0dmFyIG5vdyA9IG5ldyBEYXRlKCk7XG5cdFx0dmFyIGRhdGUgPSBuZXcgRGF0ZSggZGF0ZVN0cmluZyApO1xuXG5cdFx0dGhpcy5zZXQoIGtleSwge1xuXHRcdFx0cmF3IDogZGF0ZSxcblx0XHRcdGZvcm1hdHRlZCA6IGRhdGUudG9TdHJpbmcoKVxuXHRcdH0pO1xuXHR9LFxuXHRpc0FjdGl2ZSA6IGZ1bmN0aW9uKCl7XG5cdFx0XG5cdFx0IHZhciBzdGFydCA9IHRoaXMuZ2V0KFwic3RhcnRcIikucmF3O1xuXHRcdCB2YXIgZW5kID0gdGhpcy5nZXQoXCJlbmRcIikucmF3O1xuXHRcdCB2YXIgbm93ID0gbmV3IERhdGUoKTtcblxuXHRcdCBpZiggbm93ID4gc3RhcnQgJiYgbm93IDwgZW5kICl7XG5cdFx0IFx0cmV0dXJuIHRydWU7XG5cdFx0IH1cblxuXHRcdCByZXR1cm4gZmFsc2U7XG5cdH0sXG5cdGdldFBhdHRlcm5UeXBlIDogZnVuY3Rpb24oKXtcblxuXHRcdHZhciB0eXBlID0gXCJvY2N1cGllZFwiO1xuXHRcdHJldHVybiB0eXBlO1xuXHR9XG59KVxuXG5tb2R1bGUuZXhwb3J0cyA9IENhbGVuZGFySXRlbU1vZGVsOyIsInZhciBDYWxlbmRhckl0ZW1Nb2RlbCBcdD0gcmVxdWlyZShcIm1vZGVscy9jYWxlbmRhckl0ZW1Nb2RlbFwiKTtcblxudmFyIENhbGVuZGFyTW9kZWwgPSBCYWNrYm9uZS5Nb2RlbC5leHRlbmQoe1xuXHRkZWZhdWx0cyA6IHtcblx0XHRvcmdhbml6ZXIgOiBcIldlc1wiXG5cdH0sXG5cdGluaXRpYWxpemUgOiBmdW5jdGlvbigpe1xuXG5cdFx0Xy5iaW5kQWxsKCB0aGlzLCBcImdldEN1cnJlbnRcIiwgXCJjaGVja1RpbWVcIiApO1xuXG5cdFx0dGhpcy5saXN0ZW5UbyggdGhpcywgXCJjaGFuZ2U6dXBkYXRlZFwiLCB0aGlzLnVwZGF0ZUV2ZW50cyApO1xuXHRcdHRoaXMubGlzdGVuVG8oIHRoaXMsIFwiY2hhbmdlOnVwZGF0ZWRcIiwgdGhpcy5nZXRDdXJyZW50ICk7XG5cdFx0dGhpcy5saXN0ZW5UbyggdGhpcywgXCJjaGFuZ2U6Y3VycmVudEV2ZW50XCIsIHRoaXMuY2hhbmdlQ3VycmVudCApO1xuXG5cdFx0c2V0SW50ZXJ2YWwoIHRoaXMuZ2V0Q3VycmVudCwgMTAwMCApO1xuXHR9LFxuXHRnZXRDdXJyZW50IDogZnVuY3Rpb24oKXtcblxuXHRcdHZhciBldmVudENvbGxlY3Rpb24gPSB0aGlzLmdldChcImV2ZW50Q29sbGVjdGlvblwiKTtcblxuXHRcdC8vZ2V0dGluZyBjdXJyZW50IGV2ZW50XG5cdFx0dmFyIGN1cnJlbnQgPSBldmVudENvbGxlY3Rpb24uZ2V0Q3VycmVudCgpO1xuXHRcdFxuXHRcdHRoaXMuc2V0KFwiY3VycmVudEV2ZW50RGF0YVwiLCBjdXJyZW50ID8gY3VycmVudC50b0pTT04oKSA6IG51bGwpO1xuXHRcdHRoaXMuc2V0KFwiY3VycmVudEV2ZW50XCIsIGN1cnJlbnQgKTtcdFxuXHR9LFxuXHRjaGFuZ2VDdXJyZW50IDogZnVuY3Rpb24odmlldywgbW9kZWwpe1xuXG5cdFx0aWYobW9kZWwpe1xuXHRcdFx0dGhpcy5zdGFydENoZWNraW5nVGltZSgpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR0aGlzLnN0b3BDaGVja2luZ1RpbWUoKTtcblx0XHR9XG5cdH0sXG5cdHN0YXJ0Q2hlY2tpbmdUaW1lIDogZnVuY3Rpb24oKXtcblxuXHRcdHRoaXMuc3RvcENoZWNraW5nVGltZSgpO1xuXHRcdHRoaXMuX3RpbWVDaGVja2VyID0gc2V0SW50ZXJ2YWwoIHRoaXMuY2hlY2tUaW1lLCAxMDAwICk7XG5cdH0sXG5cdHN0b3BDaGVja2luZ1RpbWUgOiBmdW5jdGlvbigpe1xuXG5cdFx0d2luZG93LmNsZWFySW50ZXJ2YWwoIHRoaXMuX3RpbWVDaGVja2VyICk7XG5cdH0sXG5cdGNoZWNrVGltZSA6IGZ1bmN0aW9uKCl7XG5cdFx0XG5cdFx0dmFyIG1vZGVsID0gdGhpcy5nZXQoXCJjdXJyZW50RXZlbnRcIik7XG5cdFx0dmFyIGVuZCA9IG1vZGVsLmdldChcImVuZFwiKS5yYXc7XG5cdFx0dmFyIG5vdyA9IG5ldyBEYXRlKCk7XG5cdFx0dmFyIHRpbWUgPSBlbmQgLSBub3c7XG5cblx0XHR2YXIgc2Vjb25kcywgbWludXRlcywgaG91cnMsIHg7XG5cblx0XHR4ID0gdGltZSAvIDEwMDBcblx0XHRzZWNvbmRzID0gTWF0aC5mbG9vciggeCAlIDYwICk7XG5cdFx0eCAvPSA2MFxuXHRcdG1pbnV0ZXMgPSBNYXRoLmZsb29yKCB4ICUgNjAgKTtcblx0XHR4IC89IDYwXG5cdFx0aG91cnMgPSBNYXRoLmZsb29yKCB4ICUgMjQgKTtcblxuXHRcdHRoaXMuc2V0KFwidGltZUxlZnRcIiwge1xuXHRcdFx0aG91cnMgOiBob3Vycyxcblx0XHRcdG1pbnV0ZXMgOiBtaW51dGVzLFxuXHRcdFx0c2Vjb25kcyA6IHNlY29uZHNcblx0XHR9KTtcblx0fSxcblx0dXBkYXRlRXZlbnRzIDogZnVuY3Rpb24oKXtcblxuXHRcdHZhciBldmVudENvbGxlY3Rpb24gPSB0aGlzLmdldChcImV2ZW50Q29sbGVjdGlvblwiKTtcblxuXHRcdHZhciByb29tRGF0YSA9IHRoaXMuZ2V0KFwicm9vbURhdGFcIik7XG5cdFx0dmFyIG5ld01vZGVscyA9IFtdO1xuXG5cdFx0aWYoICFyb29tRGF0YSApIHJldHVybjtcblxuXHRcdF8uZWFjaCggcm9vbURhdGEuaXRlbXMsIGZ1bmN0aW9uKCBpdGVtICl7XG5cblx0XHRcdHZhciBtID0gbmV3IENhbGVuZGFySXRlbU1vZGVsKCBpdGVtICk7XG5cdFx0XHRtLnNldChcImtleVwiLCB0aGlzLmdldChcImtleVwiKSk7XG5cdFx0XHRuZXdNb2RlbHMucHVzaCggbSApO1xuXHRcdH0sIHRoaXMpO1xuXG5cdFx0ZXZlbnRDb2xsZWN0aW9uLnJlc2V0KCBuZXdNb2RlbHMgKTtcblx0fSxcblx0Z2V0TGlnaHRQYXR0ZXJuIDogZnVuY3Rpb24oKXtcblxuXHRcdHZhciBsaWdodFBhdHRlcm5Db250cm9sbGVyID0gdGhpcy5nZXQoXCJsaWdodFBhdHRlcm5Db250cm9sbGVyXCIpO1xuXHRcdHJldHVybiBsaWdodFBhdHRlcm5Db250cm9sbGVyLmdldEN1cnJlbnQoKTtcblx0fVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gQ2FsZW5kYXJNb2RlbDsiLCJ2YXIgc3RhdGUgPSBuZXcgKEJhY2tib25lLk1vZGVsLmV4dGVuZCh7XG5cdGRlZmF1bHRzIDoge1xuXHRcdC8vIFwibmF2X29wZW5cIiBcdFx0OiBmYWxzZSxcblx0XHQvLyAnc2Nyb2xsX2F0X3RvcCcgOiB0cnVlLFxuXHRcdC8vICdtaW5pbWFsX25hdicgXHQ6IGZhbHNlLFxuXHRcdC8vICdmdWxsX25hdl9vcGVuJ1x0OiBmYWxzZSxcblx0XHQvLyAndWlfZGlzcGxheSdcdDogZmFsc2Vcblx0fVxufSkpKCk7XG5cbm1vZHVsZS5leHBvcnRzID0gc3RhdGU7XG4iLCJ2YXIgcGlwZSA9IF8uZXh0ZW5kKHtcblxuXHRcblx0XG59LCBCYWNrYm9uZS5FdmVudHMpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHBpcGU7IiwibW9kdWxlLmV4cG9ydHMgPSB7XG5cdCcxJzoge1xuXHRcdCdjYWxlbmRhcklkJyA6IFwiYi1yZWVsLmNvbV8yZDMyMzgzNzM5MzYzNjMyMzIzNzM4MzFAcmVzb3VyY2UuY2FsZW5kYXIuZ29vZ2xlLmNvbVwiXG5cdH0sXG5cdCcyJzoge1xuXHRcdCdjYWxlbmRhcklkJyA6IFwiYi1yZWVsLmNvbV8yZDMxMzIzNzM3MzgzODMzMzQyZDMyMzQzMkByZXNvdXJjZS5jYWxlbmRhci5nb29nbGUuY29tXCJcblx0fSxcblx0JzMnOiB7XG5cdFx0J2NhbGVuZGFySWQnIDogXCJiLXJlZWwuY29tXzMxMzYzNTMzMzkzNjMxMzkzOTMzMzhAcmVzb3VyY2UuY2FsZW5kYXIuZ29vZ2xlLmNvbVwiXG5cdH0sXG5cdCc1Jzoge1xuXHRcdCdjYWxlbmRhcklkJyA6IFwiYi1yZWVsLmNvbV8yZDM0MzQzMjM4MzkzNjM3MzAyZDM2MzQzM0ByZXNvdXJjZS5jYWxlbmRhci5nb29nbGUuY29tXCJcblx0fVxufTsiLCJtb2R1bGUuZXhwb3J0cyA9IFwiPGgyPnN1bW1hcnkgOiA8JT0gc3VtbWFyeSAlPjwvaDI+XFxuXFxuPGgzPmRlc2NyaXB0aW9uIDogPCU9IGRlc2NyaXB0aW9uICU+PC9oMz5cXG5cXG48aDM+c3RhcnQgOiA8JT0gc3RhcnQuZm9ybWF0dGVkICU+PC9oMz5cXG5cXG48aDM+ZW5kIDogPCU9IGVuZC5mb3JtYXR0ZWQgJT48L2gzPlwiO1xuIiwibW9kdWxlLmV4cG9ydHMgPSBcIjxidXR0b24gaWQ9XFxcImNsb3NlXFxcIj5jbG9zZTwvYnV0dG9uPlxcbjxkaXYgaWQ9XFxcImV2ZW50LWxpc3RcXFwiPjwvZGl2PiBcIjtcbiIsIm1vZHVsZS5leHBvcnRzID0gXCI8ZGl2IGlkPVxcXCJzcGxhc2gtcGFnZVxcXCI+PC9kaXY+XFxuXFxuPGRpdiBpZD1cXFwicm9vbS1zaW5nbGVcXFwiPjwvZGl2PlxcblxcbjwhLS0gVEVTVCAtLT5cXG48ZGl2IGNsYXNzPVxcXCJ0ZXN0XFxcIiBzdHlsZT1cXFwicG9zaXRpb246YWJzb2x1dGU7dG9wOjA7XFxcIj5cXG5cXHQ8ZGl2PlxcblxcdFxcdDxpbnB1dCBpZD1cXFwiaGV4LWlucHV0XFxcIiB0eXBlPVxcXCJ0ZXh0XFxcIj48L2lucHV0PlxcblxcdFxcdDxidXR0b24gaWQ9XFxcImhleFxcXCI+aGV4PC9idXR0b24+XFxuXFx0PC9kaXY+XFxuXFx0PGJ1dHRvbiBpZD1cXFwidGVzdFxcXCI+dGVzdDwvYnV0dG9uPlxcblxcdDxpbnB1dCBjbGFzcz1cXFwiY29sb3JcXFwiIHR5cGU9XFxcImNvbG9yXFxcIiBuYW1lPVxcXCJmYXZjb2xvclxcXCI+XFxuPC9kaXY+XCI7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IFwiPCUgXy5lYWNoKCByb29tc0RhdGEsIGZ1bmN0aW9uKCBkYXRhLCBrZXkgKXsgJT5cXG5cXHQ8ZGl2IGNsYXNzPVxcXCJyb29tLWNvbnRhaW5lclxcXCI+XFxuXFx0XFx0PHNlY3Rpb24gaWQ9XFxcInJvb20tPCU9IGtleSAlPlxcXCIgY2xhc3M9XFxcInJvb21cXFwiIGRhdGEtaWQ9XFxcIjwlPSBrZXkgJT5cXFwiPlxcblxcdFxcdFxcdDxkaXYgY2xhc3M9XFxcIm51bWJlclxcXCI+PCU9IGtleSAlPjwvZGl2PlxcblxcdFxcdFxcdDxkaXYgY2xhc3M9XFxcImdyYXBoIHMgcy1yb29tLTwlPSBrZXkgJT5cXFwiPjwvZGl2PlxcblxcdFxcdFxcdDwhLS0gPGRpdiBjbGFzcz1cXFwicGVyc29uXFxcIj48JT0gZGF0YS5jdXJyZW50RXZlbnREYXRhID8gZGF0YS5jdXJyZW50RXZlbnREYXRhLnN1bW1hcnkgOiAnbm90aGluZycgJT48L2Rpdj4gLS0+XFxuXFx0XFx0XFx0PGRpdiBjbGFzcz1cXFwicGVyc29uXFxcIj5BdmFpbGFibGU8L2Rpdj5cXG5cXHRcXHQ8L3NlY3Rpb24+XFxuXFx0PC9kaXY+XFxuPCUgfSk7ICU+XCI7XG4iLCJ2YXIgU3RhdGUgXHRcdD0gcmVxdWlyZShcIm1vZGVscy9zdGF0ZVwiKTtcblxudmFyIE15QXBwTGF5b3V0ID0gTWFyaW9uZXR0ZS5MYXlvdXRWaWV3LmV4dGVuZCh7XG5cdGVsIDogXCIjY29udGVudFwiLFxuXHR0ZW1wbGF0ZSA6IGZhbHNlLFxuXHRyZWdpb25zIDoge1xuXHRcdG1haW4gOiBcIiNtYWluXCJcblx0fSwgXG5cdGluaXRpYWxpemUgOiBmdW5jdGlvbigpe1xuXHRcdHZhciBfdGhpcyA9IHRoaXM7XG5cblx0XHQvL3dyYXBwaW5nIGh0bWxcblx0XHR0aGlzLiRodG1sID0gJChcImh0bWxcIik7XG5cdFx0dGhpcy4kaHRtbC5yZW1vdmVDbGFzcyhcImhpZGRlblwiKTtcblxuXHRcdC8vcmVzaXplIGV2ZW50c1xuXHRcdCQod2luZG93KS5yZXNpemUoZnVuY3Rpb24oKXtcblx0XHRcdF90aGlzLm9uUmVzaXplV2luZG93KCk7XG5cdFx0fSkucmVzaXplKCk7XG5cblx0XHR0aGlzLmxpc3RlbkZvclN0YXRlKCk7XG5cdH0sXG5cdGxpc3RlbkZvclN0YXRlIDogZnVuY3Rpb24oKXtcblx0XHQvL3N0YXRlIGNoYW5nZVxuXHRcdHRoaXMubGlzdGVuVG8oIFN0YXRlLCBcImNoYW5nZVwiLCBmdW5jdGlvbiggZSApe1xuXG5cdFx0XHR0aGlzLm9uU3RhdGVDaGFuZ2UoIGUuY2hhbmdlZCwgZS5fcHJldmlvdXNBdHRyaWJ1dGVzICk7XG5cdFx0fSwgdGhpcyk7XG5cdFx0dGhpcy5vblN0YXRlQ2hhbmdlKCBTdGF0ZS50b0pTT04oKSApO1xuXHR9LFxuXHRvblN0YXRlQ2hhbmdlIDogZnVuY3Rpb24oIGNoYW5nZWQsIHByZXZpb3VzICl7XG5cblx0XHRfLmVhY2goIGNoYW5nZWQsIGZ1bmN0aW9uKHZhbHVlLCBrZXkpe1xuXHRcdFx0XG5cdFx0XHRpZiggXy5pc0Jvb2xlYW4oIHZhbHVlICkgKXtcblx0XHRcdFx0dGhpcy4kaHRtbC50b2dnbGVDbGFzcyhcInN0YXRlLVwiK2tleSwgdmFsdWUpO1xuXHRcdFx0XHR0aGlzLiRodG1sLnRvZ2dsZUNsYXNzKFwic3RhdGUtbm90LVwiK2tleSwgIXZhbHVlKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHZhciBwcmV2VmFsdWUgPSBwcmV2aW91c1sga2V5IF07XG5cdFx0XHRcdGlmKHByZXZWYWx1ZSl7XG5cdFx0XHRcdFx0dGhpcy4kaHRtbC50b2dnbGVDbGFzcyhcInN0YXRlLVwiK2tleStcIi1cIitwcmV2VmFsdWUsIGZhbHNlKTtcblx0XHRcdFx0fVxuXHRcdFx0XHR0aGlzLiRodG1sLnRvZ2dsZUNsYXNzKFwic3RhdGUtXCIra2V5K1wiLVwiK3ZhbHVlLCB0cnVlKTtcblx0XHRcdH1cblxuXHRcdH0sIHRoaXMgKTtcblx0fSxcblx0b25SZXNpemVXaW5kb3cgOiBmdW5jdGlvbigpe1xuXHRcdFxuXHRcdENvbW1vbi53dyA9ICQod2luZG93KS53aWR0aCgpO1xuXHRcdENvbW1vbi53aCA9ICQod2luZG93KS5oZWlnaHQoKTtcblx0fVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gbmV3IE15QXBwTGF5b3V0KCk7IiwidmFyIENhbGVuZGFySXRlbSA9IE1hcmlvbmV0dGUuSXRlbVZpZXcuZXh0ZW5kKHtcblx0Y2xhc3NOYW1lIDogXCJpdGVtXCIsXG5cdHRlbXBsYXRlIDogXy50ZW1wbGF0ZSggcmVxdWlyZShcInRlbXBsYXRlcy9jYWxlbmRhckl0ZW0uaHRtbFwiKSApLFxuXHR1aSA6IHtcblx0XHQndGl0bGUnIDogXCJoMlwiXG5cdH0sXG5cdGV2ZW50cyA6IHtcblx0XHQnY2xpY2sgQHVpLnRpdGxlJyA6IGZ1bmN0aW9uKCl7XG5cblxuXHRcdH1cblx0fVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gQ2FsZW5kYXJJdGVtOyIsInZhciBDYWxlbmRhckl0ZW0gXHQ9IHJlcXVpcmUoXCJ2aWV3cy9jYWxlbmRhckl0ZW1cIik7XG52YXIgQXBwUm91dGVyIFx0XHQ9IHJlcXVpcmUoIFwiY29udHJvbGxlcnMvYXBwUm91dGVyXCIgKTtcblxudmFyIENhbGVuZGFyU2luZ2xlID0gTWFyaW9uZXR0ZS5MYXlvdXRWaWV3LmV4dGVuZCh7XG5cdHRlbXBsYXRlIDogXy50ZW1wbGF0ZSggcmVxdWlyZShcInRlbXBsYXRlcy9jYWxlbmRhclNpbmdsZS5odG1sXCIpICksXG5cdHJlZ2lvbnMgOiB7XG5cdFx0ZXZlbnRMaXN0IDogXCIjZXZlbnQtbGlzdFwiXG5cdH0sXG5cdHVpIDoge1xuXHRcdGNsb3NlQnV0dG9uIDogXCIjY2xvc2VcIlxuXHR9LFxuXHRldmVudHMgOiB7XG5cdFx0J2NsaWNrIEB1aS5jbG9zZUJ1dHRvbicgOiBcIm9uQ2xvc2VcIlxuXHR9LFxuXHRpbml0aWFsaXplIDogZnVuY3Rpb24oKXtcblxuXHRcdHRoaXMuY29sbGVjdGlvblZpZXcgPSBuZXcgTWFyaW9uZXR0ZS5Db2xsZWN0aW9uVmlldyh7XG5cdFx0XHRjaGlsZFZpZXcgOiBDYWxlbmRhckl0ZW0sXG5cdFx0XHRjb2xsZWN0aW9uIDogdGhpcy5tb2RlbC5nZXQoXCJldmVudENvbGxlY3Rpb25cIilcblx0XHR9KTtcblx0fSxcblx0b25TaG93IDogZnVuY3Rpb24oKXtcblxuXHRcdHRoaXMuZ2V0UmVnaW9uKCBcImV2ZW50TGlzdFwiICkuc2hvdyggdGhpcy5jb2xsZWN0aW9uVmlldyApO1xuXHRcdFxuXHR9LFxuXHRvbkNsb3NlIDogZnVuY3Rpb24oKXtcblxuXHRcdEFwcFJvdXRlci5uYXZpZ2F0ZShcIi9cIiwge3RyaWdnZXI6IHRydWV9KTtcblx0fVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gQ2FsZW5kYXJTaW5nbGU7IiwidmFyIEFwcFJvdXRlciBcdFx0PSByZXF1aXJlKCBcImNvbnRyb2xsZXJzL2FwcFJvdXRlclwiICk7XG5cbnZhciBjYWxlbmRhckxvYWQgPSByZXF1aXJlKFwiY29udHJvbGxlcnMvY2FsZW5kYXJMb2FkXCIpO1xudmFyIENhbGVuZGFyU2luZ2xlIFx0PSByZXF1aXJlKFwidmlld3MvY2FsZW5kYXJTaW5nbGVcIik7XG52YXIgQ2FsZW5kYXJNb2RlbCBcdD0gcmVxdWlyZShcIm1vZGVscy9jYWxlbmRhck1vZGVsXCIpO1xudmFyIENhbGVuZGFySXRlbU1vZGVsIFx0PSByZXF1aXJlKFwibW9kZWxzL2NhbGVuZGFySXRlbU1vZGVsXCIpO1xudmFyIENhbGVuZGFyQ29sbGVjdGlvbiBcdD0gcmVxdWlyZShcImNvbGxlY3Rpb25zL2NhbGVuZGFyQ29sbGVjdGlvblwiKTtcbnZhciBTcGxhc2hWaWV3IFx0PSByZXF1aXJlKFwidmlld3Mvc3BsYXNoVmlld1wiKTtcblxudmFyIGh1ZUNvbm5lY3QgPSByZXF1aXJlKFwiY29udHJvbGxlcnMvaHVlQ29ubmVjdFwiKTtcbnZhciBMaWdodFBhdHRlcm4gPSByZXF1aXJlKFwiY29udHJvbGxlcnMvbGlnaHRQYXR0ZXJuXCIpO1xudmFyIExpZ2h0UGF0dGVybkNvbnRyb2xsZXIgPSByZXF1aXJlKFwiY29udHJvbGxlcnMvbGlnaHRQYXR0ZXJuQ29udHJvbGxlclwiKTtcblxudmFyIENhbGVuZGFyVmlldyA9IE1hcmlvbmV0dGUuTGF5b3V0Vmlldy5leHRlbmQoe1xuXHR0ZW1wbGF0ZSA6IF8udGVtcGxhdGUoIHJlcXVpcmUoXCJ0ZW1wbGF0ZXMvY2FsZW5kYXJXcmFwcGVyLmh0bWxcIikgKSxcblx0cmVnaW9ucyA6IHtcblx0XHRyb29tU2luZ2xlIDogXCIjcm9vbS1zaW5nbGVcIixcblx0XHRzcGxhc2hQYWdlIDogXCIjc3BsYXNoLXBhZ2VcIlxuXHR9LFxuXHR1aSA6IHtcblx0XHRjb2xvclBpY2tlciA6IFwiLmNvbG9yXCIsXG5cdFx0dGVzdCA6IFwiI3Rlc3RcIixcblx0XHRoZXhCdXR0b24gOiBcIiNoZXhcIixcblx0XHRoZXhJbnB1dCA6IFwiI2hleC1pbnB1dFwiLFxuXHRcdHJvb20gOiBcIi5yb29tXCJcblx0fSxcblx0ZXZlbnRzIDoge1xuXHRcdFwiY2xpY2sgQHVpLnRlc3RcIiA6IGZ1bmN0aW9uKCl7XG5cdFx0XHRmb3IoIHZhciBpID0gMCA7IGkgPCA1IDsgaSsrICl7XG5cdFx0XHRcdG5ldyBMaWdodFBhdHRlcm4oaSsxLCBcInRlc3RcIik7XG5cdFx0XHR9XG5cdFx0fSxcblx0XHRcImNsaWNrIEB1aS5oZXhCdXR0b25cIiA6IGZ1bmN0aW9uKCl7XG5cdFx0XHR2YXIgY29sb3IgPSB0aGlzLnVpLmhleElucHV0LnZhbCgpO1xuXHRcdFx0dGhpcy50ZXN0Q29sb3IoIGNvbG9yICk7XG5cdFx0fSxcblx0XHRcImNsaWNrIEB1aS5yb29tXCIgOiBmdW5jdGlvbiggZSApe1xuXHRcdFx0dmFyIGtleSA9ICQoIGUuY3VycmVudFRhcmdldCApLmRhdGEoXCJpZFwiKTtcblx0XHRcdEFwcFJvdXRlci5uYXZpZ2F0ZShcInJvb20vXCIra2V5LCB7dHJpZ2dlcjogdHJ1ZX0pO1xuXHRcdH1cblx0fSxcblx0aW5pdGlhbGl6ZSA6IGZ1bmN0aW9uKCl7XG5cdFx0XG5cdFx0dGhpcy5jYWxlbmRhclN0b3JlID0ge307XG5cdFx0dGhpcy5saXN0ZW5UbyggY2FsZW5kYXJMb2FkLmV2ZW50cywgXCJldmVudHNMb2FkZWRcIiwgdGhpcy5ldmVudHNMb2FkZWQgKTtcblx0fSxcblx0b25TaG93IDogZnVuY3Rpb24oKXtcblxuXHRcdHZhciBjb2xvclBpY2tlciA9IHRoaXMudWkuY29sb3JQaWNrZXI7XG5cdFx0dmFyIF90aGlzID0gdGhpcztcblx0XHQkKGNvbG9yUGlja2VyKS5jaGFuZ2UoZnVuY3Rpb24oKXtcblx0XHRcdHZhciB2YWwgPSAkKHRoaXMpLnZhbCgpO1xuXHRcdFx0X3RoaXMudGVzdENvbG9yKCB2YWwgKTtcblx0XHR9KTtcblxuXHRcdHRoaXMuX3NwbGFzaFZpZXcgPSBuZXcgU3BsYXNoVmlldyh7IG1vZGVsIDogbmV3IEJhY2tib25lLk1vZGVsKHsgcm9vbXMgOiB7fSwgcm9vbXNEYXRhIDoge30gfSkgfSkgO1xuXG5cdFx0dGhpcy5nZXRSZWdpb24oXCJzcGxhc2hQYWdlXCIpLnNob3coIHRoaXMuX3NwbGFzaFZpZXcgKTtcblxuXHRcdHRoaXMubGlzdGVuVG8oIEFwcFJvdXRlciwgXCJyb3V0ZTpyb29tUm91dGVcIiwgZnVuY3Rpb24oIGtleSApe1xuXHRcdFx0XG5cdFx0XHR0aGlzLnNob3dSb29tKCBrZXkgKTtcblx0XHR9KTtcblx0XHR0aGlzLmxpc3RlblRvKCBBcHBSb3V0ZXIsIFwicm91dGU6ZGVmYXVsdFJvdXRlXCIsIHRoaXMuc2hvd1NwbGl0ICk7XG5cdH0sXG5cdHNob3dTcGxpdCA6IGZ1bmN0aW9uKCl7XG5cblx0XHR2YXIgJHNwbGl0RWwgPSB0aGlzLmdldFJlZ2lvbiggXCJzcGxhc2hQYWdlXCIgKS4kZWw7XG5cdFx0dmFyICRzaW5nbGVFbCA9IHRoaXMuZ2V0UmVnaW9uKCBcInJvb21TaW5nbGVcIiApLiRlbDtcblxuXHRcdCRzcGxpdEVsLnNob3coKTtcblx0XHQkc2luZ2xlRWwuaGlkZSgpO1xuXHR9LFxuXHRzaG93Um9vbSA6IGZ1bmN0aW9uKCBrZXkgKXtcblxuXHRcdHZhciAkc3BsaXRFbCA9IHRoaXMuZ2V0UmVnaW9uKCBcInNwbGFzaFBhZ2VcIiApLiRlbDtcblx0XHRcblx0XHR2YXIgbW9kZWwgPSB0aGlzLmNhbGVuZGFyU3RvcmVbIGtleSBdO1xuXG5cdFx0aWYoICFtb2RlbCApe1xuXHRcdFx0dGhpcy5xdWV1ZWRLZXkgPSBrZXk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdFxuXHRcdFx0dmFyIHZpZXcgPSBuZXcgQ2FsZW5kYXJTaW5nbGUoeyBtb2RlbCA6IG1vZGVsIH0pXG5cdFx0XHR2YXIgcmVnaW9uID0gdGhpcy5nZXRSZWdpb24oIFwicm9vbVNpbmdsZVwiICkuc2hvdyggdmlldyApO1xuXHRcdFx0JHNpbmdsZUVsID0gcmVnaW9uLiRlbDtcblxuXHRcdFx0JHNpbmdsZUVsLnNob3coKTtcblx0XHRcdCRzcGxpdEVsLmhpZGUoKTtcblx0XHR9XG5cdH0sXG5cdGNoZWNrUXVldWUgOiBmdW5jdGlvbigpe1xuXG5cdFx0aWYoIHRoaXMucXVldWVkS2V5ICl7XG5cdFx0XHR0aGlzLnNob3dSb29tKCB0aGlzLnF1ZXVlZEtleSApO1xuXHRcdH1cblx0fSxcblx0dGVzdENvbG9yIDogZnVuY3Rpb24oIF9jb2xvciApe1xuXG5cdFx0dmFyIGNvbG9yID0gb25lLmNvbG9yKCBfY29sb3IgKTtcblx0XHR2YXIgaHNsID0ge1xuXHRcdFx0aCA6IE1hdGguZmxvb3IoIGNvbG9yLmgoKSAqIDM2MCksIFxuXHRcdFx0cyA6IE1hdGguZmxvb3IoIGNvbG9yLnMoKSAqIDEwMCksXG5cdFx0XHRsIDogTWF0aC5mbG9vciggY29sb3IubCgpICogMTAwKSBcblx0XHR9O1xuXHRcdGh1ZUNvbm5lY3QudXBkYXRlKFtcblx0XHRcdHtcblx0XHRcdFx0J2lkJyA6IDEsXG5cdFx0XHRcdCdkYXRhJyA6IHtcblx0XHRcdFx0XHQnaHNsJyA6IGhzbCxcblx0XHRcdFx0XHQnZHVyYXRpb24nIDogMVxuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHQnaWQnIDogMixcblx0XHRcdFx0J2RhdGEnIDoge1xuXHRcdFx0XHRcdCdoc2wnIDogaHNsLFxuXHRcdFx0XHRcdCdkdXJhdGlvbicgOiAxXG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHR7XG5cdFx0XHRcdCdpZCcgOiAzLFxuXHRcdFx0XHQnZGF0YScgOiB7XG5cdFx0XHRcdFx0J2hzbCcgOiBoc2wsXG5cdFx0XHRcdFx0J2R1cmF0aW9uJyA6IDFcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0J2lkJyA6IDQsXG5cdFx0XHRcdCdkYXRhJyA6IHtcblx0XHRcdFx0XHQnaHNsJyA6IGhzbCxcblx0XHRcdFx0XHQnZHVyYXRpb24nIDogMVxuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHQnaWQnIDogNSxcblx0XHRcdFx0J2RhdGEnIDoge1xuXHRcdFx0XHRcdCdoc2wnIDogaHNsLFxuXHRcdFx0XHRcdCdkdXJhdGlvbicgOiAxXG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRdKTtcdFx0XG5cdH0sXG5cdGV2ZW50c0xvYWRlZCA6IGZ1bmN0aW9uKCBkYXRhICl7XG5cdFx0XG5cdFx0dmFyIGtleSA9IGRhdGEua2V5O1xuXHRcdHZhciBteUNhbGVuZGFyTW9kZWwgPSB0aGlzLmNhbGVuZGFyU3RvcmVbIGtleSBdO1xuXHRcdFxuXHRcdGlmKCAgIW15Q2FsZW5kYXJNb2RlbCApe1xuXG5cdFx0XHRteUNhbGVuZGFyTW9kZWwgPSBuZXcgQ2FsZW5kYXJNb2RlbCh7XG5cdFx0XHRcdGtleSA6IGtleSxcblx0XHRcdFx0ZXZlbnRDb2xsZWN0aW9uIDogbmV3IENhbGVuZGFyQ29sbGVjdGlvbigpXG5cdFx0XHR9KTtcblx0XHRcdHRoaXMuX3NwbGFzaFZpZXcuYWRkUm9vbSggbXlDYWxlbmRhck1vZGVsICk7XG5cdFx0XHR0aGlzLmNhbGVuZGFyU3RvcmVbIGtleSBdID0gbXlDYWxlbmRhck1vZGVsO1xuXHRcdFx0dmFyIGxpZ2h0UGF0dGVybkNvbnRyb2xsZXIgPSBuZXcgTGlnaHRQYXR0ZXJuQ29udHJvbGxlciggbXlDYWxlbmRhck1vZGVsICk7XG5cdFx0XHRteUNhbGVuZGFyTW9kZWwuc2V0KFwibGlnaHRQYXR0ZXJuQ29udHJvbGxlclwiLCBsaWdodFBhdHRlcm5Db250cm9sbGVyKTtcblx0XHR9IFxuXG5cdFx0dmFyIHJvb21EYXRhID0gZGF0YS5kYXRhO1xuXHRcdHZhciB1cGRhdGVkID0gcm9vbURhdGEudXBkYXRlZDtcblxuXHRcdG15Q2FsZW5kYXJNb2RlbC5zZXQoXCJyb29tRGF0YVwiLCByb29tRGF0YSk7XG5cdFx0bXlDYWxlbmRhck1vZGVsLnNldChcInVwZGF0ZWRcIiwgdXBkYXRlZCk7XG5cblx0XHR0aGlzLmNoZWNrUXVldWUoKTtcblx0fSBcbn0pO1xuXG5cbm1vZHVsZS5leHBvcnRzID0gQ2FsZW5kYXJWaWV3OyAgICAgICAgICAgICAgICAgICAgXG4gICAgXG4gIiwidmFyIFN0YXRlID0gcmVxdWlyZSgnbW9kZWxzL3N0YXRlJyk7XG5cbnZhciBTcGxhc2hWaWV3ID0gTWFyaW9uZXR0ZS5MYXlvdXRWaWV3LmV4dGVuZCh7XG5cdGlkIDogXCJyb29tLXNwbGl0XCIsXG5cdHRlbXBsYXRlIDogXy50ZW1wbGF0ZSggcmVxdWlyZShcInRlbXBsYXRlcy9zcGxhc2hXcmFwcGVyLmh0bWxcIikgKSxcblx0dWkgOiB7XG5cdFx0cm9vbUNvbnRhaW5lcnMgOiBcIi5yb29tLWNvbnRhaW5lclwiXG5cdH0sXG5cdGV2ZW50cyA6IHtcblx0XHRcIm1vdXNlZW50ZXIgQHVpLnJvb21Db250YWluZXJzXCIgOiBmdW5jdGlvbihlKXtcblx0XHRcdFx0JCgnLnJvb20tY29udGFpbmVyJykuZWFjaChmdW5jdGlvbihpbmRleCwgZWwpIHtcblx0XHRcdFx0XHR2YXIgaXNIb3ZlcmVkID0gKGVsID09PSBlLmN1cnJlbnRUYXJnZXQpO1xuXHRcdFx0XHRcdCQoZWwpLnRvZ2dsZUNsYXNzKCdob3ZlcmVkJywgaXNIb3ZlcmVkKTtcblx0XHRcdFx0XHQkKGVsKS50b2dnbGVDbGFzcygnbm90LWhvdmVyZWQnLCAhaXNIb3ZlcmVkKTtcblx0XHRcdFx0fSk7XG5cdFx0fSxcblx0XHRcIm1vdXNlbGVhdmUgQHVpLnJvb21Db250YWluZXJzXCIgOiBmdW5jdGlvbihlKXtcblx0XHRcdFx0JCgnLnJvb20tY29udGFpbmVyJykuZWFjaChmdW5jdGlvbihpbmRleCwgZWwpIHtcblx0XHRcdFx0XHQkKGVsKS5yZW1vdmVDbGFzcygnaG92ZXJlZCcpO1xuXHRcdFx0XHRcdCQoZWwpLnJlbW92ZUNsYXNzKCdub3QtaG92ZXJlZCcpO1xuXHRcdFx0XHR9KTtcblx0XHR9XG5cdH0sXG5cdGluaXRpYWxpemUgOiBmdW5jdGlvbigpe1xuXHRcdF8uYmluZEFsbCh0aGlzLCAncmVzaXplJyk7XG5cdFx0JCh3aW5kb3cpLnJlc2l6ZSggdGhpcy5yZXNpemUgKS5yZXNpemUoKTtcblxuXHRcdFR3ZWVuTWF4LnRpY2tlci5hZGRFdmVudExpc3RlbmVyKCd0aWNrJywgdGhpcy51cGRhdGUsIHRoaXMpO1xuXHR9LFxuXHRvblJlbmRlciA6IGZ1bmN0aW9uKCl7XG5cblx0fSxcblx0YWRkUm9vbSA6IGZ1bmN0aW9uKCBtb2RlbCApe1xuXHRcdHZhciByb29tcyA9IHRoaXMubW9kZWwuZ2V0KFwicm9vbXNcIik7XG5cdFx0cm9vbXNbIG1vZGVsLmdldChcImtleVwiKSBdID0gbW9kZWw7XG5cblx0XHR0aGlzLmxpc3RlblRvKCBtb2RlbCwgXCJjaGFuZ2U6Y3VycmVudEV2ZW50XCIsIHRoaXMucmVuZGVyICk7XG5cdFx0dGhpcy5saXN0ZW5UbyggbW9kZWwsIFwiY2hhbmdlOnRpbWVMZWZ0XCIsIHRoaXMudXBkYXRlVGltZUxlZnQgKTtcblx0XHR0aGlzLnJlbmRlcigpO1xuXHR9LFxuXHRyZXNpemUgOiBmdW5jdGlvbigpe1xuXHRcdHZhciBhc3BlY3RSYXRpbyA9ICQod2luZG93KS53aWR0aCgpIC8gJCh3aW5kb3cpLmhlaWdodCgpO1xuXHRcdFN0YXRlLnNldCgncG9ydHJhaXQnLCBhc3BlY3RSYXRpbyA8PSAxKTtcblx0fSxcblx0dXBkYXRlOiBmdW5jdGlvbigpe1xuXG5cdFx0dmFyIHJvb21zID0gIHRoaXMubW9kZWwuZ2V0KFwicm9vbXNcIik7XG5cblx0XHRfLmVhY2goIHJvb21zLCBmdW5jdGlvbiggcm9vbSwga2V5ICkge1xuXHRcdFx0XG5cdFx0XHR2YXIgbGlnaHRQYXR0ZXJuID0gcm9vbS5nZXRMaWdodFBhdHRlcm4oKTtcblxuXHRcdFx0JCgnI3Jvb20tJytrZXkpLmNzcyh7XG5cdFx0XHRcdCdiYWNrZ3JvdW5kLWNvbG9yJzogbGlnaHRQYXR0ZXJuLmdldENvbG9yKClcblx0XHRcdH0pO1xuXHRcdH0pO1xuXHR9LFxuXHR1cGRhdGVUaW1lTGVmdCA6IGZ1bmN0aW9uKG1vZGVsLCBkYXRhKXtcblxuXHRcdHZhciBrZXkgPSBtb2RlbC5nZXQoXCJrZXlcIik7XG5cdFx0JCgnI3Jvb20tJytrZXkpLmZpbmQoXCIucGVyc29uXCIpLmh0bWwoIFsgZGF0YS5ob3VycyAsIGRhdGEubWludXRlcyAsIGRhdGEuc2Vjb25kcyBdLmpvaW4oXCI6XCIpICk7XG5cdH0sXG5cdG9uQmVmb3JlUmVuZGVyIDogZnVuY3Rpb24oKXtcblxuXHRcdHZhciByb29tcyA9ICB0aGlzLm1vZGVsLmdldChcInJvb21zXCIpO1xuXHRcdHZhciByb29tc0RhdGEgPSAgdGhpcy5tb2RlbC5nZXQoXCJyb29tc0RhdGFcIik7XG5cblx0XHRfLmVhY2goIHJvb21zLCBmdW5jdGlvbiggcm9vbSwga2V5ICkge1xuXHRcdFx0cm9vbXNEYXRhWyBrZXkgXSA9IHJvb20udG9KU09OKCk7XG5cdFx0fSk7XG5cdH1cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFNwbGFzaFZpZXc7Il19
