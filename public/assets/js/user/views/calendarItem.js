var patterns = require('patternData');

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
	},
	initialize: function() {

		var start = this.model.get('start').raw;
		var end = this.model.get('end').raw;
		var minutes = (end - start) / 1000 / 60;

		var halfHourHeight = 10;
		var minuteHeight = halfHourHeight / 30;
		var height = minuteHeight * minutes;

		var type;
		var background;
		var now = new Date();

		if( now > start && now < end) {
			
			type = "occupied";

			var colors = patterns['occupied'].colors;
			background = 'linear-gradient(to bottom,' + colors.join(',') + ')';
			

		}else {
			type = "scheduled";

		}
/*
		else {

			background = patterns['available'].colors[0];
		}
*/

		$(this.el).height( height + 'vh' ).addClass(type).css('background', background);
	}
});

module.exports = CalendarItem;