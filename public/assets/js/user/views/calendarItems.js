var CalendarItem 	= require("views/calendarItem");

var CalendarItems = Marionette.CollectionView.extend({

	childView : CalendarItem,
	collection : new Backbone.Collection()
});

module.exports = CalendarItems;