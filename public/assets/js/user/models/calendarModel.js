var CalendarModel = Backbone.Model.extend({
	checkCalendarRate : 1000,
	defaults : {
		organizer : "Wes"
	},
	initialize : function(){
		_.bindAll( this, "checkCalendar" );
		setInterval( this.checkCalendar, this.checkCalendarRate );
	},
	checkCalendar : function(){

		var eventCollection = this.get("eventCollection");

		//getting current event
		var current = eventCollection.getCurrent();
		this.set("currentEvent", current);
	}
});

module.exports = CalendarModel;