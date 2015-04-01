var calendarLoad = require("controllers/calendarLoad");
var CalendarItems 	= require("views/calendarItems");
var CalendarModel 	= require("models/calendarModel");
var helpers = require("helpers"); 
var hueConnect = require("controllers/hueConnect");
var LightPattern = require("controllers/lightPattern");



var CalendarView = Marionette.LayoutView.extend({
	template : _.template( require("templates/calendar.html") ),
	regions : {
		mainList : ".main-list"
	},
	ui : {
		colorPicker : ".color",
		test : "#test"
	},
	events : {
		"click @ui.test" : function(){
			for( var i = 0 ; i < 5 ; i++ ){
				new LightPattern(i+1, "test");
			}
		}
	},
	initialize : function(){
		
		this.listenTo( calendarLoad.events, "eventsLoaded", this.eventsLoaded );
	},
	onShow : function(){

		var colorPicker = this.ui.colorPicker;
		$(colorPicker).change(function(){
			var val = $(this).val();
			var color = one.color(val);

			var hsl = {
				h : Math.floor( color.h() * 360), 
				s : Math.floor( color.s() * 100),
				l : Math.floor( color.l() * 100) 
			};

			console.log(hsl)

			hueConnect.update([
				{
					'id' : 1,
					'data' : {
						'hsl' : hsl
					}
				},
				{
					'id' : 2,
					'data' : {
						'hsl' : hsl
					}
				},
				{
					'id' : 3,
					'data' : {
						'hsl' : hsl
					}
				},
				{
					'id' : 4,
					'data' : {
						'hsl' : hsl
					}
				},
				{
					'id' : 5,
					'data' : {
						'hsl' : hsl
					}
				}
			]);
		});

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
    
 