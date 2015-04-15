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
		splashPage : "#splash-page",
		keyPage : "#key-page",
	},
	ui : {
		colorPicker : ".color",
		test : "#test",
		hexButton : "#hex",
		hexInput : "#hex-input"
	},
	events : {},
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
		this.animatePage( $splitEl );

		// var $singleEl = this.getRegion( "roomSingle" ).$el;

		// $splitEl.show();
		// $singleEl.hide();
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
			this.animatePage( $singleEl );
		}
	},

	animatePage : function( $showPage, direction, instant ){

		direction = direction || "fromRight";
		var animTime = instant ? 0 : 1;
		$hidePage = this.$currentPage;
		this.$currentPage = $showPage;

		var fromPos = {};
		var toPos = {};

		switch ( direction ){
			case "fromRight" : 
				fromPos.x = Common.ww;
				toPos.x = -Common.ww;
				break; 
		}

		if( $hidePage ){
			TweenMax.to( $hidePage, animTime, _.extend( {}, toPos ) );
		}

		$showPage.show();
		TweenMax.set( $showPage, fromPos );
		TweenMax.to( $showPage, animTime, { x : 0, y : 0 } );
	},

	checkQueue : function(){

		if( this.queuedKey ){
			this.showRoom( this.queuedKey );
		}
	},
	eventsLoaded : function( data ){
		
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
    
 