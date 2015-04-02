var AppRouter 		= require( "controllers/appRouter" );

var calendarLoad = require("controllers/calendarLoad");
var CalendarSingle 	= require("views/calendarSingle");
var CalendarModel 	= require("models/calendarModel");
var CalendarCollection 	= require("collections/calendarCollection");

var hueConnect = require("controllers/hueConnect");
var LightPattern = require("controllers/lightPattern");
var roomData = require("roomData");

var CalendarView = Marionette.LayoutView.extend({
	template : _.template( require("templates/calendarWrapper.html") ),
	regions : {
		roomSingle : "#room-single",
	},
	ui : {
		colorPicker : ".color",
		test : "#test",
		hexButton : "#hex",
		hexInput : "#hex-input",
		roomSplit : "#room-split",
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

		this.listenTo( AppRouter, "route:roomRoute", function( key ){
			
			this.showRoom( key );
		});
		this.listenTo( AppRouter, "route:defaultRoute", this.showSplit );
	},
	showSplit : function(){

		var $splitEl = this.ui.roomSplit;
		var $singleEl = this.getRegion( "roomSingle" ).$el;

		$splitEl.show();
		$singleEl.hide();
	},
	showRoom : function( key ){

		var $splitEl = this.ui.roomSplit;
		
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
		
		if(  !this.calendarStore[ key ] ){

			this.calendarStore[ key ] = new CalendarModel({
				eventCollection : new CalendarCollection()
			});
		} 

		this.calendarStore[ key ].set("roomData", data.data);

		this.checkQueue();
	} 
});


module.exports = CalendarView;                    
    
 