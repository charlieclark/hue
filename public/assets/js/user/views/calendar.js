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
    
 