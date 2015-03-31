var calendarLoad = require("controllers/calendarLoad");
var CalendarItems 	= require("views/calendarItems");
var CalendarModel 	= require("models/calendarModel");
var helpers = require("helpers"); 
var updateLights = require("controllers/updateLights");

var CalendarView = Marionette.LayoutView.extend({
	template : _.template( require("templates/calendar.html") ),
	regions : {
		mainList : ".main-list"
	},
	ui : {
		colorPicker : ".color"
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

			// updateLights.update([
			// 	{
			// 		'id' : 1,
			// 		'data' : {
			// 			'hsl' : hsl
			// 		}
			// 	},
			// 	{
			// 		'id' : 2,
			// 		'data' : {
			// 			'hsl' : hsl
			// 		}
			// 	},
			// 	{
			// 		'id' : 3,
			// 		'data' : {
			// 			'hsl' : hsl
			// 		}
			// 	}
			// ]);
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
    
 