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

function LightPattern( lightId, patternId, opt_data ){

	console.log("light pattern");

	this._pattern = patterns[ patternId ];

	// make sequence by patternId
	this.createSequence( patternId, opt_data );

	//
	this._hsl = {
		h : 0,
		s : 0,
		l : 0
	}

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

		if( !model ) return;

		var type = model.getPatternType();

		var data = {
			start : model.get("start").raw,
			end : model.get("end").raw
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
			this.isAvailable();
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
		
		this.set("currentEventData", current ? current.toJSON() : null);
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
module.exports = "<% _.each( roomsData, function( data, key ){ %>\n\t<div class=\"room-container\">\n\t\t<section id=\"room-<%= key %>\" class=\"room\" data-id=\"<%= key %>\">\n\t\t\t<div class=\"number\"><%= key %></div>\n\t\t\t<div class=\"graph s s-room-<%= key %>\"></div>\n\t\t\t<div class=\"person\"><%= data.currentEventData ? data.currentEventData.summary : 'nothing' %></div>\n\t\t</section>\n\t</div>\n<% }); %>";

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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIuLi9wdWJsaWMvYXNzZXRzL2pzL3VzZXIvYXBwLmpzIiwiLi4vcHVibGljL2Fzc2V0cy9qcy91c2VyL2NvbGxlY3Rpb25zL2NhbGVuZGFyQ29sbGVjdGlvbi5qcyIsIi4uL3B1YmxpYy9hc3NldHMvanMvdXNlci9jb250cm9sbGVycy9hcHBSb3V0ZXIuanMiLCIuLi9wdWJsaWMvYXNzZXRzL2pzL3VzZXIvY29udHJvbGxlcnMvY2FsZW5kYXJMb2FkLmpzIiwiLi4vcHVibGljL2Fzc2V0cy9qcy91c2VyL2NvbnRyb2xsZXJzL2h1ZUNvbm5lY3QuanMiLCIuLi9wdWJsaWMvYXNzZXRzL2pzL3VzZXIvY29udHJvbGxlcnMvbGlnaHRQYXR0ZXJuLmpzIiwiLi4vcHVibGljL2Fzc2V0cy9qcy91c2VyL2NvbnRyb2xsZXJzL2xpZ2h0UGF0dGVybkNvbnRyb2xsZXIuanMiLCIuLi9wdWJsaWMvYXNzZXRzL2pzL3VzZXIvbW9kZWxzL2NhbGVuZGFySXRlbU1vZGVsLmpzIiwiLi4vcHVibGljL2Fzc2V0cy9qcy91c2VyL21vZGVscy9jYWxlbmRhck1vZGVsLmpzIiwiLi4vcHVibGljL2Fzc2V0cy9qcy91c2VyL21vZGVscy9zdGF0ZS5qcyIsIi4uL3B1YmxpYy9hc3NldHMvanMvdXNlci9waXBlLmpzIiwiLi4vcHVibGljL2Fzc2V0cy9qcy91c2VyL3Jvb21EYXRhLmpzIiwiLi4vcHVibGljL2Fzc2V0cy9qcy91c2VyL3RlbXBsYXRlcy9jYWxlbmRhckl0ZW0uaHRtbCIsIi4uL3B1YmxpYy9hc3NldHMvanMvdXNlci90ZW1wbGF0ZXMvY2FsZW5kYXJTaW5nbGUuaHRtbCIsIi4uL3B1YmxpYy9hc3NldHMvanMvdXNlci90ZW1wbGF0ZXMvY2FsZW5kYXJXcmFwcGVyLmh0bWwiLCIuLi9wdWJsaWMvYXNzZXRzL2pzL3VzZXIvdGVtcGxhdGVzL3NwbGFzaFdyYXBwZXIuaHRtbCIsIi4uL3B1YmxpYy9hc3NldHMvanMvdXNlci92aWV3cy9hcHBMYXlvdXQuanMiLCIuLi9wdWJsaWMvYXNzZXRzL2pzL3VzZXIvdmlld3MvY2FsZW5kYXJJdGVtLmpzIiwiLi4vcHVibGljL2Fzc2V0cy9qcy91c2VyL3ZpZXdzL2NhbGVuZGFyU2luZ2xlLmpzIiwiLi4vcHVibGljL2Fzc2V0cy9qcy91c2VyL3ZpZXdzL2NhbGVuZGFyV3JhcHBlci5qcyIsIi4uL3B1YmxpYy9hc3NldHMvanMvdXNlci92aWV3cy9zcGxhc2hWaWV3LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNiQTtBQUNBOztBQ0RBO0FBQ0E7O0FDREE7QUFDQTs7QUNEQTtBQUNBOztBQ0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3S0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ3aW5kb3cuQ29tbW9uID0ge1xuXHRwYXRoIDoge1xuXHRcdGFzc2V0cyA6IFwiYXNzZXRzL1wiLFxuXHRcdGltZyA6IFwiYXNzZXRzL2ltZy9cIixcblx0XHRhdWRpbyA6IFwiYXNzZXRzL2F1ZGlvL1wiXG5cdH0sXG5cdHNpemVzIDp7XG5cdFx0ZnJhbWUgOiAxMFxuXHR9XG59O1xuXG4vL2Jhc2VcbnZhciBBcHBSb3V0ZXIgXHRcdD0gcmVxdWlyZSggXCJjb250cm9sbGVycy9hcHBSb3V0ZXJcIiApO1xudmFyIEFwcExheW91dCBcdFx0PSByZXF1aXJlKCBcInZpZXdzL2FwcExheW91dFwiICk7XG5cbi8vY3VzdG9tXG52YXIgQ2FsZW5kYXJXcmFwcGVyXHQ9IHJlcXVpcmUoXCJ2aWV3cy9jYWxlbmRhcldyYXBwZXJcIik7XG52YXIgcm9vbURhdGEgPSByZXF1aXJlKFwicm9vbURhdGFcIik7XG5cbi8vVEhFIEFQUExJQ0FUSU9OXG52YXIgTXlBcHAgPSBNYXJpb25ldHRlLkFwcGxpY2F0aW9uLmV4dGVuZCh7XG5cdGluaXRpYWxpemUgOiBmdW5jdGlvbigpe1xuXHRcdFxuXHR9LFxuXHRvblN0YXJ0IDogZnVuY3Rpb24oKXtcblxuXHRcdEFwcExheW91dC5yZW5kZXIoKTsgXG5cblx0XHR2YXIgbXlDYWxlbmRhciA9IG5ldyBDYWxlbmRhcldyYXBwZXIoIHsgbW9kZWwgOiBuZXcgQmFja2JvbmUuTW9kZWwoeyByb29tcyA6IHJvb21EYXRhIH0pIH0pO1xuXHRcdEFwcExheW91dC5nZXRSZWdpb24oXCJtYWluXCIpLnNob3coIG15Q2FsZW5kYXIgKTtcblxuXHRcdEJhY2tib25lLmhpc3Rvcnkuc3RhcnQoe1xuXHRcdFx0cHVzaFN0YXRlIDogZmFsc2Vcblx0XHR9KTtcblx0fSBcbn0pO1xuXG5cblxuJChmdW5jdGlvbigpe1xuXHR3aW5kb3cuYXBwID0gbmV3IE15QXBwKCk7XG5cdHdpbmRvdy5hcHAuc3RhcnQoKTsgXG59KTtcblxuXG5cblxuXG5cblxuICAgICAgICAgIiwidmFyIENhbGVuZGFyQ29sbGVjdGlvbiA9IEJhY2tib25lLkNvbGxlY3Rpb24uZXh0ZW5kKHtcblx0aW5pdGlhbGl6ZSA6IGZ1bmN0aW9uKCl7XG5cblx0fSxcblx0Y29tcGFyYXRvciA6IGZ1bmN0aW9uKCBhLCBiICl7XG5cdFx0dmFyIGFUaW1lID0gYS5nZXQoXCJzdGFydFwiKS5yYXc7XG5cdFx0dmFyIGJUaW1lID0gYi5nZXQoXCJzdGFydFwiKS5yYXc7XG5cdFx0cmV0dXJuIGFUaW1lIC0gYlRpbWU7XG5cdH0sXG5cdGdldEN1cnJlbnQgOiBmdW5jdGlvbigpe1xuXG5cdFx0cmV0dXJuIHRoaXMuZmluZChmdW5jdGlvbiggbW9kZWwgKXtcblxuXHRcdFx0cmV0dXJuIG1vZGVsLmlzQWN0aXZlKCk7XG5cdFx0fSk7XG5cdH1cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IENhbGVuZGFyQ29sbGVjdGlvbjsiLCJ2YXIgcGlwZSA9IHJlcXVpcmUoXCJwaXBlXCIpO1xuXG52YXIgTXlBcHBSb3V0ZXIgPSBNYXJpb25ldHRlLkFwcFJvdXRlci5leHRlbmQoe1xuXHRjb250cm9sbGVyIDoge1xuXHRcdCdyb29tUm91dGUnIDogZnVuY3Rpb24oKXt9LFxuXHRcdCdkZWZhdWx0Um91dGUnIDogZnVuY3Rpb24odmFsdWUsIHF1ZXJ5U3RyaW5nKXtcblx0XHRcdHZhciBwYXJhbXMgPSBwYXJzZVF1ZXJ5U3RyaW5nKHF1ZXJ5U3RyaW5nKTtcblx0XHRcdF8uZWFjaCggcGFyYW1zLCBmdW5jdGlvbiggdmFsdWUsIGtleSApe1xuXHRcdFx0XHRwaXBlLnRyaWdnZXIoXCJwYXJhbTpcIitrZXksIHZhbHVlIClcblx0XHRcdH0pO1xuXHRcdH1cblx0fSxcblx0YXBwUm91dGVzIDoge1xuXHRcdFwicm9vbS86a2V5XCIgOiBcInJvb21Sb3V0ZVwiLFxuXHRcdFwiKmFjdGlvbnNcIiA6IFwiZGVmYXVsdFJvdXRlXCJcblx0fVxufSk7XG5cbmZ1bmN0aW9uIHBhcnNlUXVlcnlTdHJpbmcocXVlcnlTdHJpbmcpe1xuICAgIHZhciBwYXJhbXMgPSB7fTtcbiAgICBpZihxdWVyeVN0cmluZyl7XG4gICAgICAgIF8uZWFjaChcbiAgICAgICAgICAgIF8ubWFwKGRlY29kZVVSSShxdWVyeVN0cmluZykuc3BsaXQoLyYvZyksZnVuY3Rpb24oZWwsaSl7XG4gICAgICAgICAgICAgICAgdmFyIGF1eCA9IGVsLnNwbGl0KCc9JyksIG8gPSB7fTtcbiAgICAgICAgICAgICAgICBpZihhdXgubGVuZ3RoID49IDEpe1xuICAgICAgICAgICAgICAgICAgICB2YXIgdmFsID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgICAgICBpZihhdXgubGVuZ3RoID09IDIpXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWwgPSBhdXhbMV07XG4gICAgICAgICAgICAgICAgICAgIG9bYXV4WzBdXSA9IHZhbDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIG87XG4gICAgICAgICAgICB9KSxcbiAgICAgICAgICAgIGZ1bmN0aW9uKG8pe1xuICAgICAgICAgICAgICAgIF8uZXh0ZW5kKHBhcmFtcyxvKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgKTtcbiAgICB9XG4gICAgcmV0dXJuIHBhcmFtcztcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBuZXcgTXlBcHBSb3V0ZXIoKTtcbiIsInZhciBwaXBlID0gcmVxdWlyZShcInBpcGVcIik7XG5cbi8vbGlzdGVuaW5nIGZvciBsb2FkXG53aW5kb3cuaGFuZGxlQ2xpZW50TG9hZCA9IGZ1bmN0aW9uKCl7XG5cbiAgY29uc29sZS5sb2coXCJnb29nbGUgYXBpIGxvYWRlZFwiKTtcbiAgXy5kZWZlciggZnVuY3Rpb24oKXsgaW5pdCgpIH0pO1xufVxuXG52YXIgY2xpZW50SWQgPSAnNDMzODM5NzIzMzY1LXU3Z3JsZHR2ZjhwYWJqa2o0ZnJjaW8zY3Y1aGl0OGZtLmFwcHMuZ29vZ2xldXNlcmNvbnRlbnQuY29tJztcbnZhciBhcGlLZXkgPSAnQUl6YVN5QnNLZFRwbFJYdUV3Z3ZQU0hfZ0dGOE9Hc3czNXQxNXYwJztcbnZhciBzY29wZXMgPSAnaHR0cHM6Ly93d3cuZ29vZ2xlYXBpcy5jb20vYXV0aC9jYWxlbmRhcic7XG52YXIgcm9vbURhdGEgPSByZXF1aXJlKFwicm9vbURhdGFcIik7XG52YXIgcHVsbEludGVydmFsID0gMTAwMCAqIDEwO1xuXG4vL1RPRE8gOiBpbnRlZ3JhdGUgYWxsIDQgY2FsZW5kYXJzXG5cbmZ1bmN0aW9uIGluaXQoKXtcblx0Z2FwaS5jbGllbnQuc2V0QXBpS2V5KGFwaUtleSk7XG5cdGNoZWNrQXV0aCgpO1xufVxuXG5mdW5jdGlvbiBjaGVja0F1dGgoKXtcblx0Z2FwaS5hdXRoLmF1dGhvcml6ZSgge1xuXHRcdGNsaWVudF9pZDogY2xpZW50SWQsIFxuXHRcdHNjb3BlOiBzY29wZXMsIFxuXHRcdGltbWVkaWF0ZTogZmFsc2Vcblx0fSwgaGFuZGxlQXV0aFJlc3VsdCApO1xufVxuXG5mdW5jdGlvbiBoYW5kbGVBdXRoUmVzdWx0KCBhdXRoUmVzdWx0ICl7XG5cblx0aWYoYXV0aFJlc3VsdCl7XG5cdFx0bWFrZUFwaUNhbGwoKTtcblx0fVxufVxuXG5mdW5jdGlvbiBtYWtlQXBpQ2FsbCgpIHtcbiAgZ2FwaS5jbGllbnQubG9hZCgnY2FsZW5kYXInLCAndjMnLCBmdW5jdGlvbigpIHtcbiAgICAgIFxuICAgICAgcHVsbFJvb21zKCk7XG4gICAgICBzZXRJbnRlcnZhbCggcHVsbFJvb21zLCBwdWxsSW50ZXJ2YWwgKTsgICAgICAgICAgXG4gIH0pO1xufVxuXG5mdW5jdGlvbiBwdWxsUm9vbXMoKXtcblxuICB2YXIgZnJvbSA9IG5ldyBEYXRlKCk7XG4gIHZhciB0byA9IG5ldyBEYXRlKCk7XG4gICAgICB0by5zZXREYXRlKCB0by5nZXREYXRlKCkgKyAxICk7XG5cbiAgXy5lYWNoKCByb29tRGF0YSwgZnVuY3Rpb24oIGRhdGEsIGtleSApe1xuXG4gICAgdmFyIHJlcXVlc3QgPSBnYXBpLmNsaWVudC5jYWxlbmRhci5ldmVudHMubGlzdCh7XG4gICAgICAgICdjYWxlbmRhcklkJzogZGF0YS5jYWxlbmRhcklkLFxuICAgICAgICB0aW1lTWluIDogZnJvbS50b0lTT1N0cmluZygpLFxuICAgICAgICB0aW1lTWF4IDogdG8udG9JU09TdHJpbmcoKSxcbiAgICAgICAgc2luZ2xlRXZlbnRzIDogdHJ1ZVxuICAgICAgfSk7XG5cbiAgICAgcmVxdWVzdC50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG5cbiAgICAgICAgICByb29tTG9hZGVkKCBrZXksIHJlc3BvbnNlLnJlc3VsdCApO1xuICAgICAgfSwgZnVuY3Rpb24ocmVhc29uKSB7XG5cbiAgICAgICAgICBjb25zb2xlLmxvZygnRXJyb3I6ICcgKyByZWFzb24ucmVzdWx0LmVycm9yLm1lc3NhZ2UpO1xuICAgICAgfSk7XG4gIH0pO1xufVxuXG5mdW5jdGlvbiByb29tTG9hZGVkKCBrZXksIGRhdGEgKXtcblxuICBldmVudHMudHJpZ2dlciggXCJldmVudHNMb2FkZWRcIiwgeyBrZXkgOiBrZXksIGRhdGEgOiBkYXRhIH0gKTtcbn1cblxudmFyIGV2ZW50cyA9IF8uZXh0ZW5kKHt9LCBCYWNrYm9uZS5FdmVudHMpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblxuICBldmVudHMgOiBldmVudHNcbn07XG4iLCJ2YXIgbXlTb2NrZXQgPSBudWxsO1xudmFyIGNvbm5lY3RlZCA9IGZhbHNlO1xuXG52YXIgcGlwZSA9IHJlcXVpcmUoXCJwaXBlXCIpO1xuXG5mdW5jdGlvbiBpbml0KCl7XG5cblx0cGlwZS5vbihcInBhcmFtOnNvY2tldFwiLCBjb25uZWN0KVxufVxuXG5mdW5jdGlvbiBjb25uZWN0KCl7XG5cdFxuXHRteVNvY2tldCA9IGlvLmNvbm5lY3QoJy8vbG9jYWxob3N0OjMwMDAnKTtcblx0bXlTb2NrZXQub24oJ2Nvbm5lY3QnLCBmdW5jdGlvbigpe1xuXHRcdGNvbm5lY3RlZCA9IHRydWU7XG5cdH0pO1x0XG59XG5cbmZ1bmN0aW9uIHVwZGF0ZSggZGF0YSApe1xuXG5cdGlmKGNvbm5lY3RlZCl7XG5cdFx0bXlTb2NrZXQuZW1pdCggJ3VwZGF0ZV9kYXRhJywgZGF0YSApO1x0XG5cdH1cbn1cblxuaW5pdCgpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblx0aW5pdCA6IGluaXQsXG5cdHVwZGF0ZSA6IHVwZGF0ZSxcblx0Y29ubmVjdGVkIDogY29ubmVjdGVkXG59IiwidmFyIGh1ZUNvbm5lY3QgPSByZXF1aXJlKFwiY29udHJvbGxlcnMvaHVlQ29ubmVjdFwiKTtcblxuZnVuY3Rpb24gTGlnaHRQYXR0ZXJuKCBsaWdodElkLCBwYXR0ZXJuSWQsIG9wdF9kYXRhICl7XG5cblx0Y29uc29sZS5sb2coXCJsaWdodCBwYXR0ZXJuXCIpO1xuXG5cdHRoaXMuX3BhdHRlcm4gPSBwYXR0ZXJuc1sgcGF0dGVybklkIF07XG5cblx0Ly8gbWFrZSBzZXF1ZW5jZSBieSBwYXR0ZXJuSWRcblx0dGhpcy5jcmVhdGVTZXF1ZW5jZSggcGF0dGVybklkLCBvcHRfZGF0YSApO1xuXG5cdC8vXG5cdHRoaXMuX2hzbCA9IHtcblx0XHRoIDogMCxcblx0XHRzIDogMCxcblx0XHRsIDogMFxuXHR9XG5cblx0dGhpcy5fbGlnaHRJZCA9IGxpZ2h0SWQ7XG5cblx0dGhpcy5fc3RlcCA9IDA7XG5cdHRoaXMuX2l0ZXJhdGlvbiA9IDA7XG5cblx0dGhpcy5fc2VxdWVuY2UgPSB0aGlzLnN0YXJ0U2VxdWVuY2UoIHBhdHRlcm5JZCApO1xuXG5cdHRoaXMuX3RpbWVvdXQgPSBudWxsO1xufVxuXG5MaWdodFBhdHRlcm4ucHJvdG90eXBlID0ge1xuXHRjcmVhdGVTZXF1ZW5jZSA6IGZ1bmN0aW9uKCBwYXR0ZXJuSWQsIG9wdF9kYXRhICl7XG5cdFx0XG5cdFx0dmFyIHBhdHRlcm4gPSBwYXR0ZXJuc1sgcGF0dGVybklkIF07XG5cblx0XHRzd2l0Y2gocGF0dGVybklkKSB7XG5cdFx0XHRjYXNlICdvY2N1cGllZCc6XG5cdFx0XHR2YXIgbnVtU3RvcHMgPSAzMDtcblxuXHRcdFx0cGF0dGVybi5zdGFydCA9IG9wdF9kYXRhLnN0YXJ0O1xuXHRcdFx0cGF0dGVybi5lbmQgPSBvcHRfZGF0YS5lbmQ7XG5cdFx0XHRwYXR0ZXJuLndhaXQgPSAocGF0dGVybi5lbmQgLSBwYXR0ZXJuLnN0YXJ0KSAvIG51bVN0b3BzIC8gMTAwMDtcblx0XHRcdHBhdHRlcm4uZmFkZSA9IHBhdHRlcm4ud2FpdDtcblxuXHRcdFx0dmFyIHJhaW5ib3cgPSBuZXcgUmFpbmJvdygpO1xuXHRcdFx0cmFpbmJvdy5zZXRTcGVjdHJ1bS5hcHBseSggcmFpbmJvdywgcGF0dGVybi5jb2xvcnMgKTtcblxuXHRcdFx0cGF0dGVybi5zZXF1ZW5jZSA9IFtdO1xuXHRcdFx0Zm9yKHZhciBpID0gMDsgaSA8IG51bVN0b3BzOyBpKyspIHtcblx0XHRcdFx0dmFyIGNvbG9yID0gcmFpbmJvdy5jb2xvdXJBdCggaS8obnVtU3RvcHMtMSkgKiAxMDAgKTtcblx0XHRcdFx0cGF0dGVybi5zZXF1ZW5jZS5wdXNoKCBjb2xvciApO1xuXHRcdFx0fVxuXHRcdFx0YnJlYWs7XG5cblx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRwYXR0ZXJuLnNlcXVlbmNlID0gcGF0dGVybi5jb2xvcnMuY29uY2F0KCk7XG5cdFx0XHRicmVhaztcblx0XHR9XG5cdH0sXG5cdGdldENvbG9yIDogZnVuY3Rpb24oKXtcblxuXHRcdHJldHVybiB0aGlzLl9zZXF1ZW5jZVt0aGlzLl9zdGVwXTtcblx0fSxcblx0c3RhcnRTZXF1ZW5jZSA6IGZ1bmN0aW9uKCBwYXR0ZXJuSWQgKXtcblxuXHRcdHZhciBwYXR0ZXJuID0gcGF0dGVybnNbIHBhdHRlcm5JZCBdO1xuXHRcdHRoaXMuX3NlcXVlbmNlID0gcGF0dGVybi5zZXF1ZW5jZTtcblxuXHRcdHRoaXMuc3RvcFNlcXVlbmNlKCk7XG5cblx0XHR2YXIgc3RlcDtcblxuXHRcdHN3aXRjaChwYXR0ZXJuSWQpIHtcblx0XHRcdGNhc2UgJ29jY3VwaWVkJzpcblx0XHRcdHN0ZXAgPSBNYXRoLmZsb29yKCAobmV3IERhdGUoKSAtIHBhdHRlcm4uc3RhcnQpIC8gKHBhdHRlcm4uZW5kIC0gcGF0dGVybi5zdGFydCkgKiAzMCApO1xuXHRcdFx0YnJlYWs7XG5cblx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRzdGVwID0gMDtcblx0XHRcdGJyZWFrO1xuXHRcdH1cblxuXHRcdHRoaXMucGxheVNlcXVlbmNlU3RlcCggc3RlcCwgcGF0dGVybi5pbnN0YW50ICk7XG5cblx0XHRyZXR1cm4gdGhpcy5fc2VxdWVuY2U7XG5cdH0sXG5cdHN0b3BTZXF1ZW5jZSA6IGZ1bmN0aW9uKCl7XG5cblx0XHR0aGlzLl9zdGVwID0gMDtcblx0XHR0aGlzLl9pdGVyYXRpb24gPSAwO1xuXG5cdFx0d2luZG93LmNsZWFyVGltZW91dCggdGhpcy5fdGltZW91dCApO1xuXHR9LFxuXHRwbGF5U2VxdWVuY2VTdGVwOiBmdW5jdGlvbiggc3RlcCwgaW5zdGFudCApe1xuXG5cdFx0Ly8gY29uc29sZS5sb2coXCJwbGF5IHNlcXVlbmNlIHN0ZXBcIilcblxuXHRcdHRoaXMuX3N0ZXAgPSBzdGVwO1xuXG5cdFx0dmFyIGNvbG9yID0gb25lLmNvbG9yKCB0aGlzLmdldENvbG9yKCkgKTtcblx0XHR2YXIgZmFkZSA9IGluc3RhbnQgPyAwIDogdGhpcy5fcGF0dGVybi5mYWRlO1xuXHRcdHZhciB3YWl0ID0gdGhpcy5fcGF0dGVybi53YWl0O1xuXG5cdFx0dmFyIGhzbCA9IHtcblx0XHRcdGggOiBNYXRoLmZsb29yKCBjb2xvci5oKCkgKiAzNjApLCBcblx0XHRcdHMgOiBNYXRoLmZsb29yKCBjb2xvci5zKCkgKiAxMDApLFxuXHRcdFx0bCA6IE1hdGguZmxvb3IoIGNvbG9yLmwoKSAqIDEwMCkgXG5cdFx0fTtcblxuXHRcdGh1ZUNvbm5lY3QudXBkYXRlKFt7XG5cdFx0XHRpZCA6IHRoaXMuX2xpZ2h0SWQsXG5cdFx0XHRkYXRhIDoge1xuXHRcdFx0XHRoc2wgOiBoc2wsXG5cdFx0XHRcdGR1cmF0aW9uIDogZmFkZVxuXHRcdFx0fVxuXHRcdH1dKTtcblxuXHRcdHdpbmRvdy5jbGVhclRpbWVvdXQoIHRoaXMuX3RpbWVvdXQgKTtcblx0XHR0aGlzLl90aW1lb3V0ID0gd2luZG93LnNldFRpbWVvdXQoJC5wcm94eSh0aGlzLm5leHRTZXF1ZW5jZVN0ZXAsIHRoaXMpLCB3YWl0KjEwMDApO1xuXHR9LFxuXHRuZXh0U2VxdWVuY2VTdGVwOiBmdW5jdGlvbigpe1xuXG5cdFx0dmFyIHRvdGFsU3RlcHMgPSB0aGlzLl9zZXF1ZW5jZS5sZW5ndGg7XG5cdFx0dmFyIHJlcGVhdCA9IHRoaXMuX3BhdHRlcm4ucmVwZWF0O1xuXG5cdFx0dGhpcy5fc3RlcCArKztcblx0XHRpZih0aGlzLl9zdGVwID4gdG90YWxTdGVwcyAtIDEpIHtcblx0XHRcdHRoaXMuX3N0ZXAgPSAwO1xuXHRcdFx0dGhpcy5faXRlcmF0aW9uICsrO1xuXHRcdH1cblxuXHRcdGlmKHJlcGVhdCA+IC0xICYmIHRoaXMuX2l0ZXJhdGlvbiA+IHJlcGVhdCkge1xuXHRcdFx0dGhpcy5zdG9wU2VxdWVuY2UoKTtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHR0aGlzLnBsYXlTZXF1ZW5jZVN0ZXAoIHRoaXMuX3N0ZXAgKTtcblx0fVxufVxuXG52YXIgcGF0dGVybnMgPSB7XG5cdCd0ZXN0JyA6IHtcblx0XHRpbnN0YW50IDogZmFsc2UsXG5cdFx0cmVwZWF0IDogIC0xLFxuXHRcdGZhZGU6IDEsXG5cdFx0d2FpdDogMSxcblx0XHRjb2xvcnM6IFtcIiNGQjE5MTFcIiwgXCIjMDBmZjAwXCIsIFwiIzQxNTZGRlwiLCBcIiNGRjAwMURcIiwgXCIjRkZGRjA3XCJdLFxuXHRcdHNlcXVlbmNlIDogW11cblx0fSxcblx0J2F2YWlsYWJsZScgOiB7XG5cdFx0aW5zdGFudCA6IHRydWUsXG5cdFx0cmVwZWF0IDogLTEsXG5cdFx0ZmFkZTogMCxcblx0XHR3YWl0OiAwLFxuXHRcdGNvbG9yczogW1wiIzM1MjNmNlwiXSxcblx0XHRzZXF1ZW5jZSA6IFtdXG5cdH0sXG5cdCdvY2N1cGllZCcgOiB7XG5cdFx0aW5zdGFudCA6IHRydWUsXG5cdFx0cmVwZWF0IDogMCxcblx0XHRmYWRlOiAwLFxuXHRcdHdhaXQ6IDAsXG5cdFx0c3RhcnQgOiAwLFxuXHRcdGVuZCA6IDAsXG5cdFx0Y29sb3JzOiBbXCIjMmRjYzNkXCIsIFwiI2YzZTUzM1wiLCBcIiNmYzMxMmNcIl0sXG5cdFx0c2VxdWVuY2UgOiBbXVxuXHR9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gTGlnaHRQYXR0ZXJuOyIsInZhciBMaWdodFBhdHRlcm4gPSByZXF1aXJlKFwiY29udHJvbGxlcnMvbGlnaHRQYXR0ZXJuXCIpO1xuXG5mdW5jdGlvbiBMaWdodFBhdHRlcm5Db250cm9sbGVyKCBtb2RlbCApe1xuXHRcblx0dGhpcy5fbW9kZWwgPSBtb2RlbDtcblx0dGhpcy5pbml0KCApO1xufVxuXG5MaWdodFBhdHRlcm5Db250cm9sbGVyLnByb3RvdHlwZSA9IHtcblx0aW5pdCA6IGZ1bmN0aW9uKCl7XG5cblx0XHR0aGlzLmlzQXZhaWxhYmxlKCk7XG5cdFx0dGhpcy5fbW9kZWwub24oIFwiY2hhbmdlOmN1cnJlbnRFdmVudFwiLCB0aGlzLmN1cnJlbnRDaGFuZ2VkLCB0aGlzICApO1xuXHR9LFxuXHRjdXJyZW50Q2hhbmdlZCA6IGZ1bmN0aW9uKCBwYXJlbnQsIG1vZGVsICl7XG5cblx0XHR0aGlzLnN0b3BFeGlzdGluZygpO1xuXG5cdFx0aWYoICFtb2RlbCApIHJldHVybjtcblxuXHRcdHZhciB0eXBlID0gbW9kZWwuZ2V0UGF0dGVyblR5cGUoKTtcblxuXHRcdHZhciBkYXRhID0ge1xuXHRcdFx0c3RhcnQgOiBtb2RlbC5nZXQoXCJzdGFydFwiKS5yYXcsXG5cdFx0XHRlbmQgOiBtb2RlbC5nZXQoXCJlbmRcIikucmF3XG5cdFx0fVxuXG5cdFx0dGhpcy5uZXdQYXR0ZXJuKCB0eXBlLCBkYXRhICk7XG5cblx0fSxcblx0aXNBdmFpbGFibGUgOiBmdW5jdGlvbigpe1xuXG5cdFx0dGhpcy5uZXdQYXR0ZXJuKCBcImF2YWlsYWJsZVwiICk7XG5cdH0sXG5cdGdldEN1cnJlbnQgOiBmdW5jdGlvbigpe1xuXG5cdFx0cmV0dXJuIHRoaXMuX2N1cnJlbnRQYXR0ZXJuO1xuXHR9LFxuXHRuZXdQYXR0ZXJuIDogZnVuY3Rpb24oIHR5cGUsIGRhdGEgKXtcblxuXHRcdHZhciBrZXkgPSB0aGlzLl9tb2RlbC5nZXQoXCJrZXlcIik7XG5cblx0XHRkYXRhID0gZGF0YSB8fCB7fTtcblxuXHRcdHRoaXMuc3RvcEV4aXN0aW5nKCk7XG5cblx0XHR0aGlzLl9jdXJyZW50UGF0dGVybiA9IG5ldyBMaWdodFBhdHRlcm4oIGtleSwgdHlwZSwgZGF0YSk7XG5cblx0fSxcblx0c3RvcEV4aXN0aW5nIDogZnVuY3Rpb24oKXtcblxuXHRcdGlmKCB0aGlzLl9jdXJyZW50UGF0dGVybiApe1xuXHRcdFx0dGhpcy5fY3VycmVudFBhdHRlcm4uc3RvcFNlcXVlbmNlKCk7XHRcblx0XHRcdHRoaXMuaXNBdmFpbGFibGUoKTtcblx0XHR9XG5cdH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBMaWdodFBhdHRlcm5Db250cm9sbGVyOyIsInZhciBDYWxlbmRhckl0ZW1Nb2RlbCA9IEJhY2tib25lLk1vZGVsLmV4dGVuZCh7XG5cdGRlZmF1bHRzIDoge1xuXHRcdHN1bW1hcnkgOiBcIm4vYVwiLFxuXHRcdGRlc2NyaXB0aW9uIDogXCJuL2FcIixcblx0XHRzdGFydCA6IFwibi9hXCIsXG5cdFx0ZW5kIDogXCJuL2FcIixcblx0fSxcblx0aW5pdGlhbGl6ZSA6IGZ1bmN0aW9uKCl7XG5cblx0XHR0aGlzLmNvbnZlcnREYXRlKFwic3RhcnRcIik7XG5cdFx0dGhpcy5jb252ZXJ0RGF0ZShcImVuZFwiKTtcblx0fSxcblx0Y29udmVydERhdGUgOiBmdW5jdGlvbigga2V5ICl7XG5cdFx0Ly9jb252ZXJ0IGRhdGFzXG5cdFx0dmFyIGRhdGVTdHJpbmcgPSB0aGlzLmdldCgga2V5IClcblx0XHRpZighZGF0ZVN0cmluZykgcmV0dXJuO1xuXHRcdFxuXHRcdGRhdGVTdHJpbmcgPSBkYXRlU3RyaW5nLmRhdGVUaW1lO1xuXHRcdHZhciBub3cgPSBuZXcgRGF0ZSgpO1xuXHRcdHZhciBkYXRlID0gbmV3IERhdGUoIGRhdGVTdHJpbmcgKTtcblxuXHRcdHRoaXMuc2V0KCBrZXksIHtcblx0XHRcdHJhdyA6IGRhdGUsXG5cdFx0XHRmb3JtYXR0ZWQgOiBkYXRlLnRvU3RyaW5nKClcblx0XHR9KTtcblx0fSxcblx0aXNBY3RpdmUgOiBmdW5jdGlvbigpe1xuXHRcdFxuXHRcdCB2YXIgc3RhcnQgPSB0aGlzLmdldChcInN0YXJ0XCIpLnJhdztcblx0XHQgdmFyIGVuZCA9IHRoaXMuZ2V0KFwiZW5kXCIpLnJhdztcblx0XHQgdmFyIG5vdyA9IG5ldyBEYXRlKCk7XG5cblx0XHQgaWYoIG5vdyA+IHN0YXJ0ICYmIG5vdyA8IGVuZCApe1xuXHRcdCBcdHJldHVybiB0cnVlO1xuXHRcdCB9XG5cblx0XHQgcmV0dXJuIGZhbHNlO1xuXHR9LFxuXHRnZXRQYXR0ZXJuVHlwZSA6IGZ1bmN0aW9uKCl7XG5cblx0XHR2YXIgdHlwZSA9IFwib2NjdXBpZWRcIjtcblx0XHRyZXR1cm4gdHlwZTtcblx0fVxufSlcblxubW9kdWxlLmV4cG9ydHMgPSBDYWxlbmRhckl0ZW1Nb2RlbDsiLCJ2YXIgQ2FsZW5kYXJJdGVtTW9kZWwgXHQ9IHJlcXVpcmUoXCJtb2RlbHMvY2FsZW5kYXJJdGVtTW9kZWxcIik7XG5cbnZhciBDYWxlbmRhck1vZGVsID0gQmFja2JvbmUuTW9kZWwuZXh0ZW5kKHtcblx0ZGVmYXVsdHMgOiB7XG5cdFx0b3JnYW5pemVyIDogXCJXZXNcIlxuXHR9LFxuXHRpbml0aWFsaXplIDogZnVuY3Rpb24oKXtcblxuXHRcdF8uYmluZEFsbCggdGhpcywgXCJnZXRDdXJyZW50XCIgKTtcblxuXHRcdHRoaXMubGlzdGVuVG8oIHRoaXMsIFwiY2hhbmdlOnVwZGF0ZWRcIiwgdGhpcy51cGRhdGVFdmVudHMgKTtcblx0XHR0aGlzLmxpc3RlblRvKCB0aGlzLCBcImNoYW5nZTp1cGRhdGVkXCIsIHRoaXMuZ2V0Q3VycmVudCApO1xuXG5cdFx0c2V0SW50ZXJ2YWwoIHRoaXMuZ2V0Q3VycmVudCwgMTAwMCApO1xuXHR9LFxuXHRnZXRDdXJyZW50IDogZnVuY3Rpb24oKXtcblxuXHRcdHZhciBldmVudENvbGxlY3Rpb24gPSB0aGlzLmdldChcImV2ZW50Q29sbGVjdGlvblwiKTtcblxuXHRcdC8vZ2V0dGluZyBjdXJyZW50IGV2ZW50XG5cdFx0dmFyIGN1cnJlbnQgPSBldmVudENvbGxlY3Rpb24uZ2V0Q3VycmVudCgpO1xuXHRcdFxuXHRcdHRoaXMuc2V0KFwiY3VycmVudEV2ZW50RGF0YVwiLCBjdXJyZW50ID8gY3VycmVudC50b0pTT04oKSA6IG51bGwpO1xuXHRcdHRoaXMuc2V0KFwiY3VycmVudEV2ZW50XCIsIGN1cnJlbnQgKTtcdFxuXHR9LFxuXHR1cGRhdGVFdmVudHMgOiBmdW5jdGlvbigpe1xuXG5cdFx0dmFyIGV2ZW50Q29sbGVjdGlvbiA9IHRoaXMuZ2V0KFwiZXZlbnRDb2xsZWN0aW9uXCIpO1xuXG5cdFx0dmFyIHJvb21EYXRhID0gdGhpcy5nZXQoXCJyb29tRGF0YVwiKTtcblx0XHR2YXIgbmV3TW9kZWxzID0gW107XG5cblx0XHRpZiggIXJvb21EYXRhICkgcmV0dXJuO1xuXG5cdFx0Xy5lYWNoKCByb29tRGF0YS5pdGVtcywgZnVuY3Rpb24oIGl0ZW0gKXtcblxuXHRcdFx0dmFyIG0gPSBuZXcgQ2FsZW5kYXJJdGVtTW9kZWwoIGl0ZW0gKTtcblx0XHRcdG0uc2V0KFwia2V5XCIsIHRoaXMuZ2V0KFwia2V5XCIpKTtcblx0XHRcdG5ld01vZGVscy5wdXNoKCBtICk7XG5cdFx0fSwgdGhpcyk7XG5cblx0XHRldmVudENvbGxlY3Rpb24ucmVzZXQoIG5ld01vZGVscyApO1xuXHR9LFxuXHRnZXRMaWdodFBhdHRlcm4gOiBmdW5jdGlvbigpe1xuXG5cdFx0dmFyIGxpZ2h0UGF0dGVybkNvbnRyb2xsZXIgPSB0aGlzLmdldChcImxpZ2h0UGF0dGVybkNvbnRyb2xsZXJcIik7XG5cdFx0cmV0dXJuIGxpZ2h0UGF0dGVybkNvbnRyb2xsZXIuZ2V0Q3VycmVudCgpO1xuXHR9XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBDYWxlbmRhck1vZGVsOyIsInZhciBzdGF0ZSA9IG5ldyAoQmFja2JvbmUuTW9kZWwuZXh0ZW5kKHtcblx0ZGVmYXVsdHMgOiB7XG5cdFx0Ly8gXCJuYXZfb3BlblwiIFx0XHQ6IGZhbHNlLFxuXHRcdC8vICdzY3JvbGxfYXRfdG9wJyA6IHRydWUsXG5cdFx0Ly8gJ21pbmltYWxfbmF2JyBcdDogZmFsc2UsXG5cdFx0Ly8gJ2Z1bGxfbmF2X29wZW4nXHQ6IGZhbHNlLFxuXHRcdC8vICd1aV9kaXNwbGF5J1x0OiBmYWxzZVxuXHR9XG59KSkoKTtcblxubW9kdWxlLmV4cG9ydHMgPSBzdGF0ZTtcbiIsInZhciBwaXBlID0gXy5leHRlbmQoe1xuXG5cdFxuXHRcbn0sIEJhY2tib25lLkV2ZW50cyk7XG5cbm1vZHVsZS5leHBvcnRzID0gcGlwZTsiLCJtb2R1bGUuZXhwb3J0cyA9IHtcblx0JzEnOiB7XG5cdFx0J2NhbGVuZGFySWQnIDogXCJiLXJlZWwuY29tXzJkMzIzODM3MzkzNjM2MzIzMjM3MzgzMUByZXNvdXJjZS5jYWxlbmRhci5nb29nbGUuY29tXCJcblx0fSxcblx0JzInOiB7XG5cdFx0J2NhbGVuZGFySWQnIDogXCJiLXJlZWwuY29tXzJkMzEzMjM3MzczODM4MzMzNDJkMzIzNDMyQHJlc291cmNlLmNhbGVuZGFyLmdvb2dsZS5jb21cIlxuXHR9LFxuXHQnMyc6IHtcblx0XHQnY2FsZW5kYXJJZCcgOiBcImItcmVlbC5jb21fMzEzNjM1MzMzOTM2MzEzOTM5MzMzOEByZXNvdXJjZS5jYWxlbmRhci5nb29nbGUuY29tXCJcblx0fSxcblx0JzUnOiB7XG5cdFx0J2NhbGVuZGFySWQnIDogXCJiLXJlZWwuY29tXzJkMzQzNDMyMzgzOTM2MzczMDJkMzYzNDMzQHJlc291cmNlLmNhbGVuZGFyLmdvb2dsZS5jb21cIlxuXHR9XG59OyIsIm1vZHVsZS5leHBvcnRzID0gXCI8aDI+c3VtbWFyeSA6IDwlPSBzdW1tYXJ5ICU+PC9oMj5cXG5cXG48aDM+ZGVzY3JpcHRpb24gOiA8JT0gZGVzY3JpcHRpb24gJT48L2gzPlxcblxcbjxoMz5zdGFydCA6IDwlPSBzdGFydC5mb3JtYXR0ZWQgJT48L2gzPlxcblxcbjxoMz5lbmQgOiA8JT0gZW5kLmZvcm1hdHRlZCAlPjwvaDM+XCI7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IFwiPGJ1dHRvbiBpZD1cXFwiY2xvc2VcXFwiPmNsb3NlPC9idXR0b24+XFxuPGRpdiBpZD1cXFwiZXZlbnQtbGlzdFxcXCI+PC9kaXY+IFwiO1xuIiwibW9kdWxlLmV4cG9ydHMgPSBcIjxkaXYgaWQ9XFxcInNwbGFzaC1wYWdlXFxcIj48L2Rpdj5cXG5cXG48ZGl2IGlkPVxcXCJyb29tLXNpbmdsZVxcXCI+PC9kaXY+XFxuXFxuPCEtLSBURVNUIC0tPlxcbjxkaXYgY2xhc3M9XFxcInRlc3RcXFwiIHN0eWxlPVxcXCJwb3NpdGlvbjphYnNvbHV0ZTt0b3A6MDtcXFwiPlxcblxcdDxkaXY+XFxuXFx0XFx0PGlucHV0IGlkPVxcXCJoZXgtaW5wdXRcXFwiIHR5cGU9XFxcInRleHRcXFwiPjwvaW5wdXQ+XFxuXFx0XFx0PGJ1dHRvbiBpZD1cXFwiaGV4XFxcIj5oZXg8L2J1dHRvbj5cXG5cXHQ8L2Rpdj5cXG5cXHQ8YnV0dG9uIGlkPVxcXCJ0ZXN0XFxcIj50ZXN0PC9idXR0b24+XFxuXFx0PGlucHV0IGNsYXNzPVxcXCJjb2xvclxcXCIgdHlwZT1cXFwiY29sb3JcXFwiIG5hbWU9XFxcImZhdmNvbG9yXFxcIj5cXG48L2Rpdj5cIjtcbiIsIm1vZHVsZS5leHBvcnRzID0gXCI8JSBfLmVhY2goIHJvb21zRGF0YSwgZnVuY3Rpb24oIGRhdGEsIGtleSApeyAlPlxcblxcdDxkaXYgY2xhc3M9XFxcInJvb20tY29udGFpbmVyXFxcIj5cXG5cXHRcXHQ8c2VjdGlvbiBpZD1cXFwicm9vbS08JT0ga2V5ICU+XFxcIiBjbGFzcz1cXFwicm9vbVxcXCIgZGF0YS1pZD1cXFwiPCU9IGtleSAlPlxcXCI+XFxuXFx0XFx0XFx0PGRpdiBjbGFzcz1cXFwibnVtYmVyXFxcIj48JT0ga2V5ICU+PC9kaXY+XFxuXFx0XFx0XFx0PGRpdiBjbGFzcz1cXFwiZ3JhcGggcyBzLXJvb20tPCU9IGtleSAlPlxcXCI+PC9kaXY+XFxuXFx0XFx0XFx0PGRpdiBjbGFzcz1cXFwicGVyc29uXFxcIj48JT0gZGF0YS5jdXJyZW50RXZlbnREYXRhID8gZGF0YS5jdXJyZW50RXZlbnREYXRhLnN1bW1hcnkgOiAnbm90aGluZycgJT48L2Rpdj5cXG5cXHRcXHQ8L3NlY3Rpb24+XFxuXFx0PC9kaXY+XFxuPCUgfSk7ICU+XCI7XG4iLCJ2YXIgU3RhdGUgXHRcdD0gcmVxdWlyZShcIm1vZGVscy9zdGF0ZVwiKTtcblxudmFyIE15QXBwTGF5b3V0ID0gTWFyaW9uZXR0ZS5MYXlvdXRWaWV3LmV4dGVuZCh7XG5cdGVsIDogXCIjY29udGVudFwiLFxuXHR0ZW1wbGF0ZSA6IGZhbHNlLFxuXHRyZWdpb25zIDoge1xuXHRcdG1haW4gOiBcIiNtYWluXCJcblx0fSwgXG5cdGluaXRpYWxpemUgOiBmdW5jdGlvbigpe1xuXHRcdHZhciBfdGhpcyA9IHRoaXM7XG5cblx0XHQvL3dyYXBwaW5nIGh0bWxcblx0XHR0aGlzLiRodG1sID0gJChcImh0bWxcIik7XG5cdFx0dGhpcy4kaHRtbC5yZW1vdmVDbGFzcyhcImhpZGRlblwiKTtcblxuXHRcdC8vcmVzaXplIGV2ZW50c1xuXHRcdCQod2luZG93KS5yZXNpemUoZnVuY3Rpb24oKXtcblx0XHRcdF90aGlzLm9uUmVzaXplV2luZG93KCk7XG5cdFx0fSkucmVzaXplKCk7XG5cblx0XHR0aGlzLmxpc3RlbkZvclN0YXRlKCk7XG5cdH0sXG5cdGxpc3RlbkZvclN0YXRlIDogZnVuY3Rpb24oKXtcblx0XHQvL3N0YXRlIGNoYW5nZVxuXHRcdHRoaXMubGlzdGVuVG8oIFN0YXRlLCBcImNoYW5nZVwiLCBmdW5jdGlvbiggZSApe1xuXG5cdFx0XHR0aGlzLm9uU3RhdGVDaGFuZ2UoIGUuY2hhbmdlZCwgZS5fcHJldmlvdXNBdHRyaWJ1dGVzICk7XG5cdFx0fSwgdGhpcyk7XG5cdFx0dGhpcy5vblN0YXRlQ2hhbmdlKCBTdGF0ZS50b0pTT04oKSApO1xuXHR9LFxuXHRvblN0YXRlQ2hhbmdlIDogZnVuY3Rpb24oIGNoYW5nZWQsIHByZXZpb3VzICl7XG5cblx0XHRfLmVhY2goIGNoYW5nZWQsIGZ1bmN0aW9uKHZhbHVlLCBrZXkpe1xuXHRcdFx0XG5cdFx0XHRpZiggXy5pc0Jvb2xlYW4oIHZhbHVlICkgKXtcblx0XHRcdFx0dGhpcy4kaHRtbC50b2dnbGVDbGFzcyhcInN0YXRlLVwiK2tleSwgdmFsdWUpO1xuXHRcdFx0XHR0aGlzLiRodG1sLnRvZ2dsZUNsYXNzKFwic3RhdGUtbm90LVwiK2tleSwgIXZhbHVlKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHZhciBwcmV2VmFsdWUgPSBwcmV2aW91c1sga2V5IF07XG5cdFx0XHRcdGlmKHByZXZWYWx1ZSl7XG5cdFx0XHRcdFx0dGhpcy4kaHRtbC50b2dnbGVDbGFzcyhcInN0YXRlLVwiK2tleStcIi1cIitwcmV2VmFsdWUsIGZhbHNlKTtcblx0XHRcdFx0fVxuXHRcdFx0XHR0aGlzLiRodG1sLnRvZ2dsZUNsYXNzKFwic3RhdGUtXCIra2V5K1wiLVwiK3ZhbHVlLCB0cnVlKTtcblx0XHRcdH1cblxuXHRcdH0sIHRoaXMgKTtcblx0fSxcblx0b25SZXNpemVXaW5kb3cgOiBmdW5jdGlvbigpe1xuXHRcdENvbW1vbi53dyA9ICQod2luZG93KS53aWR0aCgpO1xuXHRcdENvbW1vbi53aCA9ICQod2luZG93KS5oZWlnaHQoKTtcblx0fVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gbmV3IE15QXBwTGF5b3V0KCk7IiwidmFyIENhbGVuZGFySXRlbSA9IE1hcmlvbmV0dGUuSXRlbVZpZXcuZXh0ZW5kKHtcblx0Y2xhc3NOYW1lIDogXCJpdGVtXCIsXG5cdHRlbXBsYXRlIDogXy50ZW1wbGF0ZSggcmVxdWlyZShcInRlbXBsYXRlcy9jYWxlbmRhckl0ZW0uaHRtbFwiKSApLFxuXHR1aSA6IHtcblx0XHQndGl0bGUnIDogXCJoMlwiXG5cdH0sXG5cdGV2ZW50cyA6IHtcblx0XHQnY2xpY2sgQHVpLnRpdGxlJyA6IGZ1bmN0aW9uKCl7XG5cblxuXHRcdH1cblx0fVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gQ2FsZW5kYXJJdGVtOyIsInZhciBDYWxlbmRhckl0ZW0gXHQ9IHJlcXVpcmUoXCJ2aWV3cy9jYWxlbmRhckl0ZW1cIik7XG52YXIgQXBwUm91dGVyIFx0XHQ9IHJlcXVpcmUoIFwiY29udHJvbGxlcnMvYXBwUm91dGVyXCIgKTtcblxudmFyIENhbGVuZGFyU2luZ2xlID0gTWFyaW9uZXR0ZS5MYXlvdXRWaWV3LmV4dGVuZCh7XG5cdHRlbXBsYXRlIDogXy50ZW1wbGF0ZSggcmVxdWlyZShcInRlbXBsYXRlcy9jYWxlbmRhclNpbmdsZS5odG1sXCIpICksXG5cdHJlZ2lvbnMgOiB7XG5cdFx0ZXZlbnRMaXN0IDogXCIjZXZlbnQtbGlzdFwiXG5cdH0sXG5cdHVpIDoge1xuXHRcdGNsb3NlQnV0dG9uIDogXCIjY2xvc2VcIlxuXHR9LFxuXHRldmVudHMgOiB7XG5cdFx0J2NsaWNrIEB1aS5jbG9zZUJ1dHRvbicgOiBcIm9uQ2xvc2VcIlxuXHR9LFxuXHRpbml0aWFsaXplIDogZnVuY3Rpb24oKXtcblxuXHRcdHRoaXMuY29sbGVjdGlvblZpZXcgPSBuZXcgTWFyaW9uZXR0ZS5Db2xsZWN0aW9uVmlldyh7XG5cdFx0XHRjaGlsZFZpZXcgOiBDYWxlbmRhckl0ZW0sXG5cdFx0XHRjb2xsZWN0aW9uIDogdGhpcy5tb2RlbC5nZXQoXCJldmVudENvbGxlY3Rpb25cIilcblx0XHR9KTtcblxuXHRcdFxuXHR9LFxuXHRvblNob3cgOiBmdW5jdGlvbigpe1xuXG5cdFx0dGhpcy5nZXRSZWdpb24oIFwiZXZlbnRMaXN0XCIgKS5zaG93KCB0aGlzLmNvbGxlY3Rpb25WaWV3ICk7XG5cdFx0XG5cdH0sXG5cdG9uQ2xvc2UgOiBmdW5jdGlvbigpe1xuXG5cdFx0QXBwUm91dGVyLm5hdmlnYXRlKFwiL1wiLCB7dHJpZ2dlcjogdHJ1ZX0pO1xuXHR9XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBDYWxlbmRhclNpbmdsZTsiLCJ2YXIgQXBwUm91dGVyIFx0XHQ9IHJlcXVpcmUoIFwiY29udHJvbGxlcnMvYXBwUm91dGVyXCIgKTtcblxudmFyIGNhbGVuZGFyTG9hZCA9IHJlcXVpcmUoXCJjb250cm9sbGVycy9jYWxlbmRhckxvYWRcIik7XG52YXIgQ2FsZW5kYXJTaW5nbGUgXHQ9IHJlcXVpcmUoXCJ2aWV3cy9jYWxlbmRhclNpbmdsZVwiKTtcbnZhciBDYWxlbmRhck1vZGVsIFx0PSByZXF1aXJlKFwibW9kZWxzL2NhbGVuZGFyTW9kZWxcIik7XG52YXIgQ2FsZW5kYXJJdGVtTW9kZWwgXHQ9IHJlcXVpcmUoXCJtb2RlbHMvY2FsZW5kYXJJdGVtTW9kZWxcIik7XG52YXIgQ2FsZW5kYXJDb2xsZWN0aW9uIFx0PSByZXF1aXJlKFwiY29sbGVjdGlvbnMvY2FsZW5kYXJDb2xsZWN0aW9uXCIpO1xudmFyIFNwbGFzaFZpZXcgXHQ9IHJlcXVpcmUoXCJ2aWV3cy9zcGxhc2hWaWV3XCIpO1xuXG52YXIgaHVlQ29ubmVjdCA9IHJlcXVpcmUoXCJjb250cm9sbGVycy9odWVDb25uZWN0XCIpO1xudmFyIExpZ2h0UGF0dGVybiA9IHJlcXVpcmUoXCJjb250cm9sbGVycy9saWdodFBhdHRlcm5cIik7XG52YXIgTGlnaHRQYXR0ZXJuQ29udHJvbGxlciA9IHJlcXVpcmUoXCJjb250cm9sbGVycy9saWdodFBhdHRlcm5Db250cm9sbGVyXCIpO1xuXG52YXIgQ2FsZW5kYXJWaWV3ID0gTWFyaW9uZXR0ZS5MYXlvdXRWaWV3LmV4dGVuZCh7XG5cdHRlbXBsYXRlIDogXy50ZW1wbGF0ZSggcmVxdWlyZShcInRlbXBsYXRlcy9jYWxlbmRhcldyYXBwZXIuaHRtbFwiKSApLFxuXHRyZWdpb25zIDoge1xuXHRcdHJvb21TaW5nbGUgOiBcIiNyb29tLXNpbmdsZVwiLFxuXHRcdHNwbGFzaFBhZ2UgOiBcIiNzcGxhc2gtcGFnZVwiXG5cdH0sXG5cdHVpIDoge1xuXHRcdGNvbG9yUGlja2VyIDogXCIuY29sb3JcIixcblx0XHR0ZXN0IDogXCIjdGVzdFwiLFxuXHRcdGhleEJ1dHRvbiA6IFwiI2hleFwiLFxuXHRcdGhleElucHV0IDogXCIjaGV4LWlucHV0XCIsXG5cdFx0cm9vbSA6IFwiLnJvb21cIlxuXHR9LFxuXHRldmVudHMgOiB7XG5cdFx0XCJjbGljayBAdWkudGVzdFwiIDogZnVuY3Rpb24oKXtcblx0XHRcdGZvciggdmFyIGkgPSAwIDsgaSA8IDUgOyBpKysgKXtcblx0XHRcdFx0bmV3IExpZ2h0UGF0dGVybihpKzEsIFwidGVzdFwiKTtcblx0XHRcdH1cblx0XHR9LFxuXHRcdFwiY2xpY2sgQHVpLmhleEJ1dHRvblwiIDogZnVuY3Rpb24oKXtcblx0XHRcdHZhciBjb2xvciA9IHRoaXMudWkuaGV4SW5wdXQudmFsKCk7XG5cdFx0XHR0aGlzLnRlc3RDb2xvciggY29sb3IgKTtcblx0XHR9LFxuXHRcdFwiY2xpY2sgQHVpLnJvb21cIiA6IGZ1bmN0aW9uKCBlICl7XG5cdFx0XHR2YXIga2V5ID0gJCggZS5jdXJyZW50VGFyZ2V0ICkuZGF0YShcImlkXCIpO1xuXHRcdFx0QXBwUm91dGVyLm5hdmlnYXRlKFwicm9vbS9cIitrZXksIHt0cmlnZ2VyOiB0cnVlfSk7XG5cdFx0fVxuXHR9LFxuXHRpbml0aWFsaXplIDogZnVuY3Rpb24oKXtcblx0XHRcblx0XHR0aGlzLmNhbGVuZGFyU3RvcmUgPSB7fTtcblx0XHR0aGlzLmxpc3RlblRvKCBjYWxlbmRhckxvYWQuZXZlbnRzLCBcImV2ZW50c0xvYWRlZFwiLCB0aGlzLmV2ZW50c0xvYWRlZCApO1xuXHR9LFxuXHRvblNob3cgOiBmdW5jdGlvbigpe1xuXG5cdFx0dmFyIGNvbG9yUGlja2VyID0gdGhpcy51aS5jb2xvclBpY2tlcjtcblx0XHR2YXIgX3RoaXMgPSB0aGlzO1xuXHRcdCQoY29sb3JQaWNrZXIpLmNoYW5nZShmdW5jdGlvbigpe1xuXHRcdFx0dmFyIHZhbCA9ICQodGhpcykudmFsKCk7XG5cdFx0XHRfdGhpcy50ZXN0Q29sb3IoIHZhbCApO1xuXHRcdH0pO1xuXG5cdFx0dGhpcy5fc3BsYXNoVmlldyA9IG5ldyBTcGxhc2hWaWV3KHsgbW9kZWwgOiBuZXcgQmFja2JvbmUuTW9kZWwoeyByb29tcyA6IHt9LCByb29tc0RhdGEgOiB7fSB9KSB9KSA7XG5cblx0XHR0aGlzLmdldFJlZ2lvbihcInNwbGFzaFBhZ2VcIikuc2hvdyggdGhpcy5fc3BsYXNoVmlldyApO1xuXG5cdFx0dGhpcy5saXN0ZW5UbyggQXBwUm91dGVyLCBcInJvdXRlOnJvb21Sb3V0ZVwiLCBmdW5jdGlvbigga2V5ICl7XG5cdFx0XHRcblx0XHRcdHRoaXMuc2hvd1Jvb20oIGtleSApO1xuXHRcdH0pO1xuXHRcdHRoaXMubGlzdGVuVG8oIEFwcFJvdXRlciwgXCJyb3V0ZTpkZWZhdWx0Um91dGVcIiwgdGhpcy5zaG93U3BsaXQgKTtcblx0fSxcblx0c2hvd1NwbGl0IDogZnVuY3Rpb24oKXtcblxuXHRcdHZhciAkc3BsaXRFbCA9IHRoaXMuZ2V0UmVnaW9uKCBcInNwbGFzaFBhZ2VcIiApLiRlbDtcblx0XHR2YXIgJHNpbmdsZUVsID0gdGhpcy5nZXRSZWdpb24oIFwicm9vbVNpbmdsZVwiICkuJGVsO1xuXG5cdFx0JHNwbGl0RWwuc2hvdygpO1xuXHRcdCRzaW5nbGVFbC5oaWRlKCk7XG5cdH0sXG5cdHNob3dSb29tIDogZnVuY3Rpb24oIGtleSApe1xuXG5cdFx0dmFyICRzcGxpdEVsID0gdGhpcy5nZXRSZWdpb24oIFwic3BsYXNoUGFnZVwiICkuJGVsO1xuXHRcdFxuXHRcdHZhciBtb2RlbCA9IHRoaXMuY2FsZW5kYXJTdG9yZVsga2V5IF07XG5cblx0XHRpZiggIW1vZGVsICl7XG5cdFx0XHR0aGlzLnF1ZXVlZEtleSA9IGtleTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0XG5cdFx0XHR2YXIgdmlldyA9IG5ldyBDYWxlbmRhclNpbmdsZSh7IG1vZGVsIDogbW9kZWwgfSlcblx0XHRcdHZhciByZWdpb24gPSB0aGlzLmdldFJlZ2lvbiggXCJyb29tU2luZ2xlXCIgKS5zaG93KCB2aWV3ICk7XG5cdFx0XHQkc2luZ2xlRWwgPSByZWdpb24uJGVsO1xuXG5cdFx0XHQkc2luZ2xlRWwuc2hvdygpO1xuXHRcdFx0JHNwbGl0RWwuaGlkZSgpO1xuXHRcdH1cblx0fSxcblx0Y2hlY2tRdWV1ZSA6IGZ1bmN0aW9uKCl7XG5cblx0XHRpZiggdGhpcy5xdWV1ZWRLZXkgKXtcblx0XHRcdHRoaXMuc2hvd1Jvb20oIHRoaXMucXVldWVkS2V5ICk7XG5cdFx0fVxuXHR9LFxuXHR0ZXN0Q29sb3IgOiBmdW5jdGlvbiggX2NvbG9yICl7XG5cblx0XHR2YXIgY29sb3IgPSBvbmUuY29sb3IoIF9jb2xvciApO1xuXHRcdHZhciBoc2wgPSB7XG5cdFx0XHRoIDogTWF0aC5mbG9vciggY29sb3IuaCgpICogMzYwKSwgXG5cdFx0XHRzIDogTWF0aC5mbG9vciggY29sb3IucygpICogMTAwKSxcblx0XHRcdGwgOiBNYXRoLmZsb29yKCBjb2xvci5sKCkgKiAxMDApIFxuXHRcdH07XG5cdFx0aHVlQ29ubmVjdC51cGRhdGUoW1xuXHRcdFx0e1xuXHRcdFx0XHQnaWQnIDogMSxcblx0XHRcdFx0J2RhdGEnIDoge1xuXHRcdFx0XHRcdCdoc2wnIDogaHNsLFxuXHRcdFx0XHRcdCdkdXJhdGlvbicgOiAxXG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHR7XG5cdFx0XHRcdCdpZCcgOiAyLFxuXHRcdFx0XHQnZGF0YScgOiB7XG5cdFx0XHRcdFx0J2hzbCcgOiBoc2wsXG5cdFx0XHRcdFx0J2R1cmF0aW9uJyA6IDFcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0J2lkJyA6IDMsXG5cdFx0XHRcdCdkYXRhJyA6IHtcblx0XHRcdFx0XHQnaHNsJyA6IGhzbCxcblx0XHRcdFx0XHQnZHVyYXRpb24nIDogMVxuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHQnaWQnIDogNCxcblx0XHRcdFx0J2RhdGEnIDoge1xuXHRcdFx0XHRcdCdoc2wnIDogaHNsLFxuXHRcdFx0XHRcdCdkdXJhdGlvbicgOiAxXG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHR7XG5cdFx0XHRcdCdpZCcgOiA1LFxuXHRcdFx0XHQnZGF0YScgOiB7XG5cdFx0XHRcdFx0J2hzbCcgOiBoc2wsXG5cdFx0XHRcdFx0J2R1cmF0aW9uJyA6IDFcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdF0pO1x0XHRcblx0fSxcblx0ZXZlbnRzTG9hZGVkIDogZnVuY3Rpb24oIGRhdGEgKXtcblx0XHRcblx0XHR2YXIga2V5ID0gZGF0YS5rZXk7XG5cdFx0dmFyIG15Q2FsZW5kYXJNb2RlbCA9IHRoaXMuY2FsZW5kYXJTdG9yZVsga2V5IF07XG5cdFx0XG5cdFx0aWYoICAhbXlDYWxlbmRhck1vZGVsICl7XG5cblx0XHRcdG15Q2FsZW5kYXJNb2RlbCA9IG5ldyBDYWxlbmRhck1vZGVsKHtcblx0XHRcdFx0a2V5IDoga2V5LFxuXHRcdFx0XHRldmVudENvbGxlY3Rpb24gOiBuZXcgQ2FsZW5kYXJDb2xsZWN0aW9uKClcblx0XHRcdH0pO1xuXHRcdFx0dGhpcy5fc3BsYXNoVmlldy5hZGRSb29tKCBteUNhbGVuZGFyTW9kZWwgKTtcblx0XHRcdHRoaXMuY2FsZW5kYXJTdG9yZVsga2V5IF0gPSBteUNhbGVuZGFyTW9kZWw7XG5cdFx0XHR2YXIgbGlnaHRQYXR0ZXJuQ29udHJvbGxlciA9IG5ldyBMaWdodFBhdHRlcm5Db250cm9sbGVyKCBteUNhbGVuZGFyTW9kZWwgKTtcblx0XHRcdG15Q2FsZW5kYXJNb2RlbC5zZXQoXCJsaWdodFBhdHRlcm5Db250cm9sbGVyXCIsIGxpZ2h0UGF0dGVybkNvbnRyb2xsZXIpO1xuXHRcdH0gXG5cblx0XHR2YXIgcm9vbURhdGEgPSBkYXRhLmRhdGE7XG5cdFx0dmFyIHVwZGF0ZWQgPSByb29tRGF0YS51cGRhdGVkO1xuXG5cdFx0bXlDYWxlbmRhck1vZGVsLnNldChcInJvb21EYXRhXCIsIHJvb21EYXRhKTtcblx0XHRteUNhbGVuZGFyTW9kZWwuc2V0KFwidXBkYXRlZFwiLCB1cGRhdGVkKTtcblxuXHRcdHRoaXMuY2hlY2tRdWV1ZSgpO1xuXHR9IFxufSk7XG5cblxubW9kdWxlLmV4cG9ydHMgPSBDYWxlbmRhclZpZXc7ICAgICAgICAgICAgICAgICAgICBcbiAgICBcbiAiLCJ2YXIgU3RhdGUgPSByZXF1aXJlKCdtb2RlbHMvc3RhdGUnKTtcblxudmFyIFNwbGFzaFZpZXcgPSBNYXJpb25ldHRlLkxheW91dFZpZXcuZXh0ZW5kKHtcblx0aWQgOiBcInJvb20tc3BsaXRcIixcblx0dGVtcGxhdGUgOiBfLnRlbXBsYXRlKCByZXF1aXJlKFwidGVtcGxhdGVzL3NwbGFzaFdyYXBwZXIuaHRtbFwiKSApLFxuXHR1aSA6IHtcblx0XHRyb29tQ29udGFpbmVycyA6IFwiLnJvb20tY29udGFpbmVyXCJcblx0fSxcblx0ZXZlbnRzIDoge1xuXHRcdFwibW91c2VlbnRlciBAdWkucm9vbUNvbnRhaW5lcnNcIiA6IGZ1bmN0aW9uKGUpe1xuXHRcdFx0XHQkKCcucm9vbS1jb250YWluZXInKS5lYWNoKGZ1bmN0aW9uKGluZGV4LCBlbCkge1xuXHRcdFx0XHRcdHZhciBpc0hvdmVyZWQgPSAoZWwgPT09IGUuY3VycmVudFRhcmdldCk7XG5cdFx0XHRcdFx0JChlbCkudG9nZ2xlQ2xhc3MoJ2hvdmVyZWQnLCBpc0hvdmVyZWQpO1xuXHRcdFx0XHRcdCQoZWwpLnRvZ2dsZUNsYXNzKCdub3QtaG92ZXJlZCcsICFpc0hvdmVyZWQpO1xuXHRcdFx0XHR9KTtcblx0XHR9LFxuXHRcdFwibW91c2VsZWF2ZSBAdWkucm9vbUNvbnRhaW5lcnNcIiA6IGZ1bmN0aW9uKGUpe1xuXHRcdFx0XHQkKCcucm9vbS1jb250YWluZXInKS5lYWNoKGZ1bmN0aW9uKGluZGV4LCBlbCkge1xuXHRcdFx0XHRcdCQoZWwpLnJlbW92ZUNsYXNzKCdob3ZlcmVkJyk7XG5cdFx0XHRcdFx0JChlbCkucmVtb3ZlQ2xhc3MoJ25vdC1ob3ZlcmVkJyk7XG5cdFx0XHRcdH0pO1xuXHRcdH1cblx0fSxcblx0aW5pdGlhbGl6ZSA6IGZ1bmN0aW9uKCl7XG5cdFx0Xy5iaW5kQWxsKHRoaXMsICdyZXNpemUnKTtcblx0XHQkKHdpbmRvdykucmVzaXplKCB0aGlzLnJlc2l6ZSApLnJlc2l6ZSgpO1xuXG5cdFx0VHdlZW5NYXgudGlja2VyLmFkZEV2ZW50TGlzdGVuZXIoJ3RpY2snLCB0aGlzLnVwZGF0ZSwgdGhpcyk7XG5cdH0sXG5cdG9uUmVuZGVyIDogZnVuY3Rpb24oKXtcblxuXHR9LFxuXHRhZGRSb29tIDogZnVuY3Rpb24oIG1vZGVsICl7XG5cdFx0dmFyIHJvb21zID0gdGhpcy5tb2RlbC5nZXQoXCJyb29tc1wiKTtcblx0XHRyb29tc1sgbW9kZWwuZ2V0KFwia2V5XCIpIF0gPSBtb2RlbDtcblxuXHRcdHRoaXMubGlzdGVuVG8oIG1vZGVsLCBcImNoYW5nZTpjdXJyZW50RXZlbnRcIiwgdGhpcy5yZW5kZXIgKTtcblx0XHR0aGlzLnJlbmRlcigpO1xuXHR9LFxuXHRyZXNpemUgOiBmdW5jdGlvbigpe1xuXHRcdHZhciBhc3BlY3RSYXRpbyA9ICQod2luZG93KS53aWR0aCgpIC8gJCh3aW5kb3cpLmhlaWdodCgpO1xuXHRcdFN0YXRlLnNldCgncG9ydHJhaXQnLCBhc3BlY3RSYXRpbyA8PSAxKTtcblx0fSxcblx0dXBkYXRlOiBmdW5jdGlvbigpe1xuXG5cdFx0dmFyIHJvb21zID0gIHRoaXMubW9kZWwuZ2V0KFwicm9vbXNcIik7XG5cblx0XHRfLmVhY2goIHJvb21zLCBmdW5jdGlvbiggcm9vbSwga2V5ICkge1xuXHRcdFx0XG5cdFx0XHR2YXIgbGlnaHRQYXR0ZXJuID0gcm9vbS5nZXRMaWdodFBhdHRlcm4oKTtcblxuXHRcdFx0JCgnI3Jvb20tJytrZXkpLmNzcyh7XG5cdFx0XHRcdCdiYWNrZ3JvdW5kLWNvbG9yJzogbGlnaHRQYXR0ZXJuLmdldENvbG9yKClcblx0XHRcdH0pO1xuXHRcdH0pO1xuXHR9LFxuXHRvbkJlZm9yZVJlbmRlciA6IGZ1bmN0aW9uKCl7XG5cblx0XHR2YXIgcm9vbXMgPSAgdGhpcy5tb2RlbC5nZXQoXCJyb29tc1wiKTtcblx0XHR2YXIgcm9vbXNEYXRhID0gIHRoaXMubW9kZWwuZ2V0KFwicm9vbXNEYXRhXCIpO1xuXG5cdFx0Xy5lYWNoKCByb29tcywgZnVuY3Rpb24oIHJvb20sIGtleSApIHtcblx0XHRcdHJvb21zRGF0YVsga2V5IF0gPSByb29tLnRvSlNPTigpO1xuXHRcdH0pO1xuXHR9XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBTcGxhc2hWaWV3OyJdfQ==
