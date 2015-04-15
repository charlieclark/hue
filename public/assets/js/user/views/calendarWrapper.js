var state 		= require( "state" );

var calendarLoad = require("controllers/calendarLoad");
var CalendarSingle 	= require("views/calendarSingle");

var CalendarModel 	= require("models/calendarModel");
var CalendarItemModel 	= require("models/calendarItemModel");
var CalendarCollection 	= require("collections/calendarCollection");

var SplashView 	= require("views/splashView");
 
var hueConnect = require("controllers/hueConnect");
var LightPattern = require("controllers/lightPattern");
var LightPatternController = require("controllers/lightPatternController");

var firstAnim = true;

var CalendarView = Marionette.LayoutView.extend({
	template : _.template( require("templates/calendarWrapper.html") ),
	regions : {
		roomSingle : "#room-single",
		splashPage : "#splash-page",
		keyPage : "#key-page",
	},
	ui : {
		pages : ".page",
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

		this.ui.pages.hide();

		this.listenTo( state, "change:page", _.bind(function( model, key ){
			
			console.log("PAGE", key)

			switch( key ){
				case "home":
					this.showSplit();
					break;
				case "room":
					this.showRoom( state.get("section") );
					break;
			}
			console.log("!@!#!@#!",key);
			// this.showRoom( key );
		}, this));
		// this.listenTo( state, "route:defaultRoute", this.showSplit );
	},
	showSplit : function(){

		var $splitEl = this.getRegion( "splashPage" ).$el;
		this.animatePage( $splitEl, "fromLeft" );

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
			this.animatePage( $singleEl, "fromBottom" );
		}
	},

	animatePage : function( $showPage, direction, instant ){

		console.log("ANIMATE PAGE", $showPage, direction, instant);

		direction = direction || "fromRight";
		var animTime = (instant || firstAnim) ? 0 : 0.75;
		firstAnim = false;
		$hidePage = this.$currentPage;
		this.$currentPage = $showPage;

		var tweenBase = { force3D : true, ease : Quad.easeOut, x : 0, y : 0 };

		var fromPos = {};
		var toPos = {};

		switch ( direction ){
			case "fromRight" : 
				fromPos.x = Common.ww;
				toPos.x = -Common.ww;
				break; 
			case "fromLeft" : 
				fromPos.x = -Common.ww;
				toPos.x = Common.ww;
				break; 
			case "fromBottom" : 
				fromPos.y = Common.wh;
				toPos.y = -Common.wh;
				break; 
		}

		if( $hidePage ){
			TweenMax.to( $hidePage, animTime, _.extend( {}, tweenBase, toPos   ) );
		}

		$showPage.show();
		TweenMax.set( $showPage, _.extend( {}, tweenBase, fromPos  ) );
		TweenMax.to( $showPage, animTime, tweenBase );
	},

	checkQueue : function(){

		if( this.queuedKey && state.get("page") == "room" ){
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
    
 