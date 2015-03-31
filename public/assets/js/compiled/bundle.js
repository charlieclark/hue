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
var CalendarView	= require("views/calendar");

//THE APPLICATION
var MyApp = Marionette.Application.extend({
	initialize : function(){
		
	},
	onStart : function(){
		Backbone.history.start({
			pushState : false
		});
		AppLayout.render(); 
		console.log("!!!!!!!!asdasdsadas!!!!")

		var myCalendar = new CalendarView();
		AppLayout.getRegion("main").show( myCalendar );
	} 
});



$(function(){
	window.app = new MyApp();
	window.app.start(); 
});







         
},{"controllers/appRouter":3,"views/appLayout":10,"views/calendar":11}],2:[function(require,module,exports){
var MyAppController = Marionette.Controller.extend({
	loadPage : function( pageName ){
		console.log("PAGE NAasdasdasdasdME::", pageName );         
		this.trigger("pageLoaded", pageName);
	}
});

MyAppController.events = "test";

module.exports =  new MyAppController();

},{}],3:[function(require,module,exports){
var AppController = require("controllers/appController");

var MyAppRouter = Marionette.AppRouter.extend({
	controller : AppController,
	appRoutes : {
		":page" : "loadPage"
	}
});

module.exports = new MyAppRouter();

},{"controllers/appController":2}],4:[function(require,module,exports){
var pipe = require("pipe");

//listening for load
window.handleClientLoad = function(){

	console.log("ASDASDSA")
	init();
}

var clientId = '433839723365-u7grldtvf8pabjkj4frcio3cv5hit8fm.apps.googleusercontent.com';
var apiKey = 'AIzaSyBsKdTplRXuEwgvPSH_gGF8OGsw35t15v0';
var scopes = 'https://www.googleapis.com/auth/calendar';
var calId = "b-reel.com_2d34343238393637302d363433@resource.calendar.google.com";



function init(){
	gapi.client.setApiKey(apiKey);
	checkAuth();
}

function checkAuth(){
	gapi.auth.authorize( {
		client_id: clientId, 
		scope: scopes, 
		immediate: true
	}, handleAuthResult );
}

function handleAuthResult( authResult ){

	if(authResult){
		makeApiCall();
	}
}

function makeApiCall() {
  gapi.client.load('calendar', 'v3', function() {

    var from = new Date().toISOString();

    console.log(from)

    var request = gapi.client.calendar.events.list({
      'calendarId': calId,
      timeMin : from
     });

   request.then(function(response) {
      // appendResults(response.result.longUrl);
      console.log(response.result);
      events.trigger( "eventsLoaded", response.result );
    }, function(reason) {
      console.log('Error: ' + reason.result.error.message);
    });
          
    // request.execute(function(resp) {
    //   for (var i = 0; i < resp.items.length; i++) {
    //     var li = document.createElement('li');
    //     li.appendChild(document.createTextNode(resp.items[i].summary));
    //     document.getElementById('events').appendChild(li);
    //   }
    // });
  });
}

var events = _.extend({

}, Backbone.Events);

module.exports = {

  events : events
};

},{"pipe":7}],5:[function(require,module,exports){
var CalendarModel = Backbone.Model.extend({
	defaults : {
		summary : "n/a",
		description : "n/a",
		start : "n/a",
		end : "n/a",
	}
})

module.exports = CalendarModel;
},{}],6:[function(require,module,exports){
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

},{}],7:[function(require,module,exports){
var pipe = _.extend({

	
	
}, Backbone.Events);

module.exports = pipe;
},{}],8:[function(require,module,exports){
module.exports = "<div class=\"main-list\"></div>";

},{}],9:[function(require,module,exports){
module.exports = "<% if( summary ){ %>\n\t<h2>summary : <%= summary %></h2>\n<% } %>\n\n<% if( description ){ %>\n\t<h3>description : <%= description %></h3>\n<% } %>\n\n<% if( start ){ %>\n\t<h3>start : <%= start.dateTime %></h3>\n<% } %>\n\n<% if( end ){ %>\n\t<h3>end : <%= end.dateTime %></h3>\n<% } %>";

},{}],10:[function(require,module,exports){
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
},{"models/state":6}],11:[function(require,module,exports){
var calendarLoad = require("controllers/calendarLoad");
var CalendarItems 	= require("views/calendarItems");
var CalendarModel 	= require("models/calendarModel");

var CalendarView = Marionette.LayoutView.extend({
	template : _.template( require("templates/calendar.html") ),
	regions : {
		mainList : ".main-list"
	},
	initialize : function(){

		this.listenTo( calendarLoad.events, "eventsLoaded", this.eventsLoaded );
	},
	eventsLoaded : function( data ){
		
		var myCalendarItems = new CalendarItems();

		_.each( data.items, function( item ){

			var m = new CalendarModel( item );
			myCalendarItems.collection.add( m );
		});

		this.getRegion("mainList").show( myCalendarItems );
	}          
});


module.exports = CalendarView;                    
    
 
},{"controllers/calendarLoad":4,"models/calendarModel":5,"templates/calendar.html":8,"views/calendarItems":13}],12:[function(require,module,exports){
var CalendarItem = Marionette.ItemView.extend({
	className : "item",
	template : _.template( require("templates/calendarItem.html") ),
	ui : {
		'title' : "h2"
	},
	events : {
		'click @ui.title' : function(){
			console.log("!")
		}
	}
});

module.exports = CalendarItem;
},{"templates/calendarItem.html":9}],13:[function(require,module,exports){
var CalendarItem 	= require("views/calendarItem");

var CalendarItems = Marionette.CollectionView.extend({

	childView : CalendarItem,
	collection : new Backbone.Collection()
});

module.exports = CalendarItems;
},{"views/calendarItem":12}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIuLi9wdWJsaWMvYXNzZXRzL2pzL3VzZXIvYXBwLmpzIiwiLi4vcHVibGljL2Fzc2V0cy9qcy91c2VyL2NvbnRyb2xsZXJzL2FwcENvbnRyb2xsZXIuanMiLCIuLi9wdWJsaWMvYXNzZXRzL2pzL3VzZXIvY29udHJvbGxlcnMvYXBwUm91dGVyLmpzIiwiLi4vcHVibGljL2Fzc2V0cy9qcy91c2VyL2NvbnRyb2xsZXJzL2NhbGVuZGFyTG9hZC5qcyIsIi4uL3B1YmxpYy9hc3NldHMvanMvdXNlci9tb2RlbHMvY2FsZW5kYXJNb2RlbC5qcyIsIi4uL3B1YmxpYy9hc3NldHMvanMvdXNlci9tb2RlbHMvc3RhdGUuanMiLCIuLi9wdWJsaWMvYXNzZXRzL2pzL3VzZXIvcGlwZS5qcyIsIi4uL3B1YmxpYy9hc3NldHMvanMvdXNlci90ZW1wbGF0ZXMvY2FsZW5kYXIuaHRtbCIsIi4uL3B1YmxpYy9hc3NldHMvanMvdXNlci90ZW1wbGF0ZXMvY2FsZW5kYXJJdGVtLmh0bWwiLCIuLi9wdWJsaWMvYXNzZXRzL2pzL3VzZXIvdmlld3MvYXBwTGF5b3V0LmpzIiwiLi4vcHVibGljL2Fzc2V0cy9qcy91c2VyL3ZpZXdzL2NhbGVuZGFyLmpzIiwiLi4vcHVibGljL2Fzc2V0cy9qcy91c2VyL3ZpZXdzL2NhbGVuZGFySXRlbS5qcyIsIi4uL3B1YmxpYy9hc3NldHMvanMvdXNlci92aWV3cy9jYWxlbmRhckl0ZW1zLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNOQTtBQUNBOztBQ0RBO0FBQ0E7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNiQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwid2luZG93LkNvbW1vbiA9IHtcblx0cGF0aCA6IHtcblx0XHRhc3NldHMgOiBcImFzc2V0cy9cIixcblx0XHRpbWcgOiBcImFzc2V0cy9pbWcvXCIsXG5cdFx0YXVkaW8gOiBcImFzc2V0cy9hdWRpby9cIlxuXHR9LFxuXHRzaXplcyA6e1xuXHRcdGZyYW1lIDogMTBcblx0fVxufTtcblxuLy9iYXNlXG52YXIgQXBwUm91dGVyIFx0XHQ9IHJlcXVpcmUoIFwiY29udHJvbGxlcnMvYXBwUm91dGVyXCIgKTtcbnZhciBBcHBMYXlvdXQgXHRcdD0gcmVxdWlyZSggXCJ2aWV3cy9hcHBMYXlvdXRcIiApO1xuXG4vL2N1c3RvbVxudmFyIENhbGVuZGFyVmlld1x0PSByZXF1aXJlKFwidmlld3MvY2FsZW5kYXJcIik7XG5cbi8vVEhFIEFQUExJQ0FUSU9OXG52YXIgTXlBcHAgPSBNYXJpb25ldHRlLkFwcGxpY2F0aW9uLmV4dGVuZCh7XG5cdGluaXRpYWxpemUgOiBmdW5jdGlvbigpe1xuXHRcdFxuXHR9LFxuXHRvblN0YXJ0IDogZnVuY3Rpb24oKXtcblx0XHRCYWNrYm9uZS5oaXN0b3J5LnN0YXJ0KHtcblx0XHRcdHB1c2hTdGF0ZSA6IGZhbHNlXG5cdFx0fSk7XG5cdFx0QXBwTGF5b3V0LnJlbmRlcigpOyBcblx0XHRjb25zb2xlLmxvZyhcIiEhISEhISEhYXNkYXNkc2FkYXMhISEhXCIpXG5cblx0XHR2YXIgbXlDYWxlbmRhciA9IG5ldyBDYWxlbmRhclZpZXcoKTtcblx0XHRBcHBMYXlvdXQuZ2V0UmVnaW9uKFwibWFpblwiKS5zaG93KCBteUNhbGVuZGFyICk7XG5cdH0gXG59KTtcblxuXG5cbiQoZnVuY3Rpb24oKXtcblx0d2luZG93LmFwcCA9IG5ldyBNeUFwcCgpO1xuXHR3aW5kb3cuYXBwLnN0YXJ0KCk7IFxufSk7XG5cblxuXG5cblxuXG5cbiAgICAgICAgICIsInZhciBNeUFwcENvbnRyb2xsZXIgPSBNYXJpb25ldHRlLkNvbnRyb2xsZXIuZXh0ZW5kKHtcblx0bG9hZFBhZ2UgOiBmdW5jdGlvbiggcGFnZU5hbWUgKXtcblx0XHRjb25zb2xlLmxvZyhcIlBBR0UgTkFhc2Rhc2Rhc2Rhc2RNRTo6XCIsIHBhZ2VOYW1lICk7ICAgICAgICAgXG5cdFx0dGhpcy50cmlnZ2VyKFwicGFnZUxvYWRlZFwiLCBwYWdlTmFtZSk7XG5cdH1cbn0pO1xuXG5NeUFwcENvbnRyb2xsZXIuZXZlbnRzID0gXCJ0ZXN0XCI7XG5cbm1vZHVsZS5leHBvcnRzID0gIG5ldyBNeUFwcENvbnRyb2xsZXIoKTtcbiIsInZhciBBcHBDb250cm9sbGVyID0gcmVxdWlyZShcImNvbnRyb2xsZXJzL2FwcENvbnRyb2xsZXJcIik7XG5cbnZhciBNeUFwcFJvdXRlciA9IE1hcmlvbmV0dGUuQXBwUm91dGVyLmV4dGVuZCh7XG5cdGNvbnRyb2xsZXIgOiBBcHBDb250cm9sbGVyLFxuXHRhcHBSb3V0ZXMgOiB7XG5cdFx0XCI6cGFnZVwiIDogXCJsb2FkUGFnZVwiXG5cdH1cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IG5ldyBNeUFwcFJvdXRlcigpO1xuIiwidmFyIHBpcGUgPSByZXF1aXJlKFwicGlwZVwiKTtcblxuLy9saXN0ZW5pbmcgZm9yIGxvYWRcbndpbmRvdy5oYW5kbGVDbGllbnRMb2FkID0gZnVuY3Rpb24oKXtcblxuXHRjb25zb2xlLmxvZyhcIkFTREFTRFNBXCIpXG5cdGluaXQoKTtcbn1cblxudmFyIGNsaWVudElkID0gJzQzMzgzOTcyMzM2NS11N2dybGR0dmY4cGFiamtqNGZyY2lvM2N2NWhpdDhmbS5hcHBzLmdvb2dsZXVzZXJjb250ZW50LmNvbSc7XG52YXIgYXBpS2V5ID0gJ0FJemFTeUJzS2RUcGxSWHVFd2d2UFNIX2dHRjhPR3N3MzV0MTV2MCc7XG52YXIgc2NvcGVzID0gJ2h0dHBzOi8vd3d3Lmdvb2dsZWFwaXMuY29tL2F1dGgvY2FsZW5kYXInO1xudmFyIGNhbElkID0gXCJiLXJlZWwuY29tXzJkMzQzNDMyMzgzOTM2MzczMDJkMzYzNDMzQHJlc291cmNlLmNhbGVuZGFyLmdvb2dsZS5jb21cIjtcblxuXG5cbmZ1bmN0aW9uIGluaXQoKXtcblx0Z2FwaS5jbGllbnQuc2V0QXBpS2V5KGFwaUtleSk7XG5cdGNoZWNrQXV0aCgpO1xufVxuXG5mdW5jdGlvbiBjaGVja0F1dGgoKXtcblx0Z2FwaS5hdXRoLmF1dGhvcml6ZSgge1xuXHRcdGNsaWVudF9pZDogY2xpZW50SWQsIFxuXHRcdHNjb3BlOiBzY29wZXMsIFxuXHRcdGltbWVkaWF0ZTogdHJ1ZVxuXHR9LCBoYW5kbGVBdXRoUmVzdWx0ICk7XG59XG5cbmZ1bmN0aW9uIGhhbmRsZUF1dGhSZXN1bHQoIGF1dGhSZXN1bHQgKXtcblxuXHRpZihhdXRoUmVzdWx0KXtcblx0XHRtYWtlQXBpQ2FsbCgpO1xuXHR9XG59XG5cbmZ1bmN0aW9uIG1ha2VBcGlDYWxsKCkge1xuICBnYXBpLmNsaWVudC5sb2FkKCdjYWxlbmRhcicsICd2MycsIGZ1bmN0aW9uKCkge1xuXG4gICAgdmFyIGZyb20gPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7XG5cbiAgICBjb25zb2xlLmxvZyhmcm9tKVxuXG4gICAgdmFyIHJlcXVlc3QgPSBnYXBpLmNsaWVudC5jYWxlbmRhci5ldmVudHMubGlzdCh7XG4gICAgICAnY2FsZW5kYXJJZCc6IGNhbElkLFxuICAgICAgdGltZU1pbiA6IGZyb21cbiAgICAgfSk7XG5cbiAgIHJlcXVlc3QudGhlbihmdW5jdGlvbihyZXNwb25zZSkge1xuICAgICAgLy8gYXBwZW5kUmVzdWx0cyhyZXNwb25zZS5yZXN1bHQubG9uZ1VybCk7XG4gICAgICBjb25zb2xlLmxvZyhyZXNwb25zZS5yZXN1bHQpO1xuICAgICAgZXZlbnRzLnRyaWdnZXIoIFwiZXZlbnRzTG9hZGVkXCIsIHJlc3BvbnNlLnJlc3VsdCApO1xuICAgIH0sIGZ1bmN0aW9uKHJlYXNvbikge1xuICAgICAgY29uc29sZS5sb2coJ0Vycm9yOiAnICsgcmVhc29uLnJlc3VsdC5lcnJvci5tZXNzYWdlKTtcbiAgICB9KTtcbiAgICAgICAgICBcbiAgICAvLyByZXF1ZXN0LmV4ZWN1dGUoZnVuY3Rpb24ocmVzcCkge1xuICAgIC8vICAgZm9yICh2YXIgaSA9IDA7IGkgPCByZXNwLml0ZW1zLmxlbmd0aDsgaSsrKSB7XG4gICAgLy8gICAgIHZhciBsaSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2xpJyk7XG4gICAgLy8gICAgIGxpLmFwcGVuZENoaWxkKGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKHJlc3AuaXRlbXNbaV0uc3VtbWFyeSkpO1xuICAgIC8vICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZXZlbnRzJykuYXBwZW5kQ2hpbGQobGkpO1xuICAgIC8vICAgfVxuICAgIC8vIH0pO1xuICB9KTtcbn1cblxudmFyIGV2ZW50cyA9IF8uZXh0ZW5kKHtcblxufSwgQmFja2JvbmUuRXZlbnRzKTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cbiAgZXZlbnRzIDogZXZlbnRzXG59O1xuIiwidmFyIENhbGVuZGFyTW9kZWwgPSBCYWNrYm9uZS5Nb2RlbC5leHRlbmQoe1xuXHRkZWZhdWx0cyA6IHtcblx0XHRzdW1tYXJ5IDogXCJuL2FcIixcblx0XHRkZXNjcmlwdGlvbiA6IFwibi9hXCIsXG5cdFx0c3RhcnQgOiBcIm4vYVwiLFxuXHRcdGVuZCA6IFwibi9hXCIsXG5cdH1cbn0pXG5cbm1vZHVsZS5leHBvcnRzID0gQ2FsZW5kYXJNb2RlbDsiLCJ2YXIgc3RhdGUgPSBuZXcgKEJhY2tib25lLk1vZGVsLmV4dGVuZCh7XG5cdGRlZmF1bHRzIDoge1xuXHRcdC8vIFwibmF2X29wZW5cIiBcdFx0OiBmYWxzZSxcblx0XHQvLyAnc2Nyb2xsX2F0X3RvcCcgOiB0cnVlLFxuXHRcdC8vICdtaW5pbWFsX25hdicgXHQ6IGZhbHNlLFxuXHRcdC8vICdmdWxsX25hdl9vcGVuJ1x0OiBmYWxzZSxcblx0XHQvLyAndWlfZGlzcGxheSdcdDogZmFsc2Vcblx0fVxufSkpKCk7XG5cbm1vZHVsZS5leHBvcnRzID0gc3RhdGU7XG4iLCJ2YXIgcGlwZSA9IF8uZXh0ZW5kKHtcblxuXHRcblx0XG59LCBCYWNrYm9uZS5FdmVudHMpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHBpcGU7IiwibW9kdWxlLmV4cG9ydHMgPSBcIjxkaXYgY2xhc3M9XFxcIm1haW4tbGlzdFxcXCI+PC9kaXY+XCI7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IFwiPCUgaWYoIHN1bW1hcnkgKXsgJT5cXG5cXHQ8aDI+c3VtbWFyeSA6IDwlPSBzdW1tYXJ5ICU+PC9oMj5cXG48JSB9ICU+XFxuXFxuPCUgaWYoIGRlc2NyaXB0aW9uICl7ICU+XFxuXFx0PGgzPmRlc2NyaXB0aW9uIDogPCU9IGRlc2NyaXB0aW9uICU+PC9oMz5cXG48JSB9ICU+XFxuXFxuPCUgaWYoIHN0YXJ0ICl7ICU+XFxuXFx0PGgzPnN0YXJ0IDogPCU9IHN0YXJ0LmRhdGVUaW1lICU+PC9oMz5cXG48JSB9ICU+XFxuXFxuPCUgaWYoIGVuZCApeyAlPlxcblxcdDxoMz5lbmQgOiA8JT0gZW5kLmRhdGVUaW1lICU+PC9oMz5cXG48JSB9ICU+XCI7XG4iLCJ2YXIgU3RhdGUgXHRcdD0gcmVxdWlyZShcIm1vZGVscy9zdGF0ZVwiKTtcblxudmFyIE15QXBwTGF5b3V0ID0gTWFyaW9uZXR0ZS5MYXlvdXRWaWV3LmV4dGVuZCh7XG5cdGVsIDogXCIjY29udGVudFwiLFxuXHR0ZW1wbGF0ZSA6IGZhbHNlLFxuXHRyZWdpb25zIDoge1xuXHRcdG1haW4gOiBcIiNtYWluXCJcblx0fSwgXG5cdGluaXRpYWxpemUgOiBmdW5jdGlvbigpe1xuXHRcdHZhciBfdGhpcyA9IHRoaXM7XG5cblx0XHQvL3dyYXBwaW5nIGh0bWxcblx0XHR0aGlzLiRodG1sID0gJChcImh0bWxcIik7XG5cdFx0dGhpcy4kaHRtbC5yZW1vdmVDbGFzcyhcImhpZGRlblwiKTtcblxuXHRcdC8vcmVzaXplIGV2ZW50c1xuXHRcdCQod2luZG93KS5yZXNpemUoZnVuY3Rpb24oKXtcblx0XHRcdF90aGlzLm9uUmVzaXplV2luZG93KCk7XG5cdFx0fSkucmVzaXplKCk7XG5cblx0XHR0aGlzLmxpc3RlbkZvclN0YXRlKCk7XG5cdH0sXG5cdGxpc3RlbkZvclN0YXRlIDogZnVuY3Rpb24oKXtcblx0XHQvL3N0YXRlIGNoYW5nZVxuXHRcdHRoaXMubGlzdGVuVG8oIFN0YXRlLCBcImNoYW5nZVwiLCBmdW5jdGlvbiggZSApe1xuXG5cdFx0XHR0aGlzLm9uU3RhdGVDaGFuZ2UoIGUuY2hhbmdlZCwgZS5fcHJldmlvdXNBdHRyaWJ1dGVzICk7XG5cdFx0fSwgdGhpcyk7XG5cdFx0dGhpcy5vblN0YXRlQ2hhbmdlKCBTdGF0ZS50b0pTT04oKSApO1xuXHR9LFxuXHRvblN0YXRlQ2hhbmdlIDogZnVuY3Rpb24oIGNoYW5nZWQsIHByZXZpb3VzICl7XG5cblx0XHRfLmVhY2goIGNoYW5nZWQsIGZ1bmN0aW9uKHZhbHVlLCBrZXkpe1xuXHRcdFx0XG5cdFx0XHRpZiggXy5pc0Jvb2xlYW4oIHZhbHVlICkgKXtcblx0XHRcdFx0dGhpcy4kaHRtbC50b2dnbGVDbGFzcyhcInN0YXRlLVwiK2tleSwgdmFsdWUpO1xuXHRcdFx0XHR0aGlzLiRodG1sLnRvZ2dsZUNsYXNzKFwic3RhdGUtbm90LVwiK2tleSwgIXZhbHVlKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHZhciBwcmV2VmFsdWUgPSBwcmV2aW91c1sga2V5IF07XG5cdFx0XHRcdGlmKHByZXZWYWx1ZSl7XG5cdFx0XHRcdFx0dGhpcy4kaHRtbC50b2dnbGVDbGFzcyhcInN0YXRlLVwiK2tleStcIi1cIitwcmV2VmFsdWUsIGZhbHNlKTtcblx0XHRcdFx0fVxuXHRcdFx0XHR0aGlzLiRodG1sLnRvZ2dsZUNsYXNzKFwic3RhdGUtXCIra2V5K1wiLVwiK3ZhbHVlLCB0cnVlKTtcblx0XHRcdH1cblxuXHRcdH0sIHRoaXMgKTtcblx0fSxcblx0b25SZXNpemVXaW5kb3cgOiBmdW5jdGlvbigpe1xuXHRcdENvbW1vbi53dyA9ICQod2luZG93KS53aWR0aCgpO1xuXHRcdENvbW1vbi53aCA9ICQod2luZG93KS5oZWlnaHQoKTtcblx0fVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gbmV3IE15QXBwTGF5b3V0KCk7IiwidmFyIGNhbGVuZGFyTG9hZCA9IHJlcXVpcmUoXCJjb250cm9sbGVycy9jYWxlbmRhckxvYWRcIik7XG52YXIgQ2FsZW5kYXJJdGVtcyBcdD0gcmVxdWlyZShcInZpZXdzL2NhbGVuZGFySXRlbXNcIik7XG52YXIgQ2FsZW5kYXJNb2RlbCBcdD0gcmVxdWlyZShcIm1vZGVscy9jYWxlbmRhck1vZGVsXCIpO1xuXG52YXIgQ2FsZW5kYXJWaWV3ID0gTWFyaW9uZXR0ZS5MYXlvdXRWaWV3LmV4dGVuZCh7XG5cdHRlbXBsYXRlIDogXy50ZW1wbGF0ZSggcmVxdWlyZShcInRlbXBsYXRlcy9jYWxlbmRhci5odG1sXCIpICksXG5cdHJlZ2lvbnMgOiB7XG5cdFx0bWFpbkxpc3QgOiBcIi5tYWluLWxpc3RcIlxuXHR9LFxuXHRpbml0aWFsaXplIDogZnVuY3Rpb24oKXtcblxuXHRcdHRoaXMubGlzdGVuVG8oIGNhbGVuZGFyTG9hZC5ldmVudHMsIFwiZXZlbnRzTG9hZGVkXCIsIHRoaXMuZXZlbnRzTG9hZGVkICk7XG5cdH0sXG5cdGV2ZW50c0xvYWRlZCA6IGZ1bmN0aW9uKCBkYXRhICl7XG5cdFx0XG5cdFx0dmFyIG15Q2FsZW5kYXJJdGVtcyA9IG5ldyBDYWxlbmRhckl0ZW1zKCk7XG5cblx0XHRfLmVhY2goIGRhdGEuaXRlbXMsIGZ1bmN0aW9uKCBpdGVtICl7XG5cblx0XHRcdHZhciBtID0gbmV3IENhbGVuZGFyTW9kZWwoIGl0ZW0gKTtcblx0XHRcdG15Q2FsZW5kYXJJdGVtcy5jb2xsZWN0aW9uLmFkZCggbSApO1xuXHRcdH0pO1xuXG5cdFx0dGhpcy5nZXRSZWdpb24oXCJtYWluTGlzdFwiKS5zaG93KCBteUNhbGVuZGFySXRlbXMgKTtcblx0fSAgICAgICAgICBcbn0pO1xuXG5cbm1vZHVsZS5leHBvcnRzID0gQ2FsZW5kYXJWaWV3OyAgICAgICAgICAgICAgICAgICAgXG4gICAgXG4gIiwidmFyIENhbGVuZGFySXRlbSA9IE1hcmlvbmV0dGUuSXRlbVZpZXcuZXh0ZW5kKHtcblx0Y2xhc3NOYW1lIDogXCJpdGVtXCIsXG5cdHRlbXBsYXRlIDogXy50ZW1wbGF0ZSggcmVxdWlyZShcInRlbXBsYXRlcy9jYWxlbmRhckl0ZW0uaHRtbFwiKSApLFxuXHR1aSA6IHtcblx0XHQndGl0bGUnIDogXCJoMlwiXG5cdH0sXG5cdGV2ZW50cyA6IHtcblx0XHQnY2xpY2sgQHVpLnRpdGxlJyA6IGZ1bmN0aW9uKCl7XG5cdFx0XHRjb25zb2xlLmxvZyhcIiFcIilcblx0XHR9XG5cdH1cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IENhbGVuZGFySXRlbTsiLCJ2YXIgQ2FsZW5kYXJJdGVtIFx0PSByZXF1aXJlKFwidmlld3MvY2FsZW5kYXJJdGVtXCIpO1xuXG52YXIgQ2FsZW5kYXJJdGVtcyA9IE1hcmlvbmV0dGUuQ29sbGVjdGlvblZpZXcuZXh0ZW5kKHtcblxuXHRjaGlsZFZpZXcgOiBDYWxlbmRhckl0ZW0sXG5cdGNvbGxlY3Rpb24gOiBuZXcgQmFja2JvbmUuQ29sbGVjdGlvbigpXG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBDYWxlbmRhckl0ZW1zOyJdfQ==
