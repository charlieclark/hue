var state 		= require( "state" );
var pipe 		= require( "pipe" );

var calendarLoad = require("controllers/calendarLoad");
var CalendarSingle 	= require("views/calendarSingle");

var CalendarModel 	= require("models/calendarModel");
var CalendarItemModel 	= require("models/calendarItemModel");
var CalendarCollection 	= require("collections/calendarCollection");

var SplashView 	= require("views/splashView");
var KeyView 	= require("views/keyView");

var hueConnect = require("controllers/hueConnect");
var LightPattern = require("controllers/lightPattern");
var LightPatternController = require("controllers/lightPatternController");

var firstAnim = true;

var pageConfig = {
	room : {
		animIn : "fromBottom",
		animOut : "fromTop"
	},
	key : {
		animIn : "fromRight",
		animOut : "fromLeft"
	},
	sequencer : {
		animIn : "fromLeft",
		animOut : "fromRight"
	}
}

var CalendarView = Marionette.LayoutView.extend({
	template : _.template( require("templates/calendarWrapper.html") ),
	regions : {
		room : "#room-single",
		home : "#splash-page",
		key : "#key-page",
		sequencer : "#sequencer-page"
	},
	ui : {
		commandButtons : "[data-cmd]",
		pages : ".page",
		colorPicker : ".color",
		test : "#test",
		hexButton : "#hex",
		hexInput : "#hex-input"
	},
	stateEvents : {
		"change:page" : function( model, key ){ 
			
			switch( key ){
				case "home":
					this.animatePage( "home" );
					break;
				case "key":
					var view = new KeyView({ model : new Backbone.Model({ }) });
					var region = this.getRegion( "key" ).show( view );
					this.animatePage( "key" );
					break;
				case "sequencer":
					this.animatePage( "sequencer" );
					break;
				case "room":
					this.showRoom( state.get("section") );
					break;
			}
		}
	},
	commands : {
		"select:page" : function( page ){
			state.navigate( page );
		}
	},
	events : {
		"click @ui.commandButtons" : "commandButtonClick"
	},
	initialize : function(){
		
		this.calendarStore = {};

		Marionette.bindEntityEvents(this, pipe, this.commands);
        Marionette.bindEntityEvents(this, state, this.stateEvents);
		
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
		this.getRegion("home").show( this._splashView );

		this.ui.pages.hide();
	},
	showRoom : function( key ){
		
		var model = this.calendarStore[ key ];

		if( !model ){
			this.queuedKey = key;
		} else {
			
			var view = new CalendarSingle({ model : model });
			var region = this.getRegion( "room" ).show( view );

			this.animatePage( "room" );
		}
	},

	animatePage : function( page, instant ){

		$showPage = this.getRegion( page ).$el;
		$hidePage = this.lastPage ? this.getRegion( this.lastPage ).$el : null;

		var animTime = (instant || firstAnim) ? 0 : 0.4;
		firstAnim = false;
		
		var tweenBase = { force3D : true, ease : Cubic.easeInOut, x : 0, y : 0 };
		var fromPos = {};
		var toPos = {};

		var isBack = page == "home";
		var animUse = isBack ? this.lastPage : page;
		this.lastPage = page;
		var direction = pageConfig[ animUse ] ? pageConfig[ animUse ][ isBack ? 'animOut' : 'animIn' ] : 'fromLeft';

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
			case "fromTop" : 
				fromPos.y = -Common.wh;
				toPos.y = Common.wh;
				break; 
		}

		if( $hidePage ){
			TweenMax.to( $hidePage, animTime, _.extend( {
				onComplete : function(){
					$hidePage.hide();
				}
			}, tweenBase, toPos ) );

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
				eventCollection : new CalendarCollection( { key : key } )
			});
			
			this.calendarStore[ key ] = myCalendarModel;
			var lightPatternController = new LightPatternController( myCalendarModel );
			myCalendarModel.set("lightPatternController", lightPatternController);
			this._splashView.addRoom( myCalendarModel );
		} 

		var roomData = data.data;
		var updated = roomData.updated;

		console.log( myCalendarModel );
		myCalendarModel.get("eventCollection").setStartEnd( roomData.dayStart, roomData.dayEnd );

		myCalendarModel.set("roomData", roomData);
		myCalendarModel.set("updated", updated);

		this.checkQueue();
	},
	commandButtonClick : function( e ){

		var $el = $(e.currentTarget);

		var cmd = $el.data("cmd");
		var arg = $el.data("arg");

		pipe.trigger( cmd, arg );
	}
});

module.exports = CalendarView;                    