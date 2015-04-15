var CalendarItem 	= require("views/calendarItem");
var state = require("state");

var CalendarSingle = Marionette.LayoutView.extend({
	template : _.template( require("templates/calendarSingle.html") ),
	regions : {
		eventListContainer : "#event-list-container"
	},
	ui : {
	},
	events : {
	},
	initialize : function(){

		this.collectionView = new Marionette.CollectionView({
			tagName : 'ul',
			id : 'event-list',
			childView : CalendarItem,
			collection : this.model.get("eventCollection")
		});
	},
	onShow : function(){

		this.getRegion( "eventListContainer" ).show( this.collectionView );
	},
	onClose : function(){

		state.navigate("");
	}
});

module.exports = CalendarSingle;