var CalendarItem = Marionette.ItemView.extend({
	className : 'item',
	tagName : 'li',
	template : _.template( require("templates/calendarItem.html") ),
	ui : {
		'title' : "h2"
	},
	events : {
		'click @ui.title' : function(){


		}
	}
});

module.exports = CalendarItem;