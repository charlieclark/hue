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

		var halfHourHeight = 140;
		var minuteHeight = halfHourHeight / 30;
		var height = minuteHeight * minutes;

		var types = [];
		var background;
		var now = new Date();

		if( this.model.isAvailable() ) {
				
			types.push( "available" );
		} 

		if( this.model.isActive() ) {
			
			types.push( "occupied" );
			var colors = patterns['occupied'].colors;
			background = 'linear-gradient(to bottom,' + colors.join(',') + ')';
		}

		if( this.model.isPast() ) {

			types.push( "past" );
			
		} else if( this.model.isNow() ) {

			types.push( "now" );

		} else if( this.model.isFuture() ) {

			types.push( "future" );
		}

		this.$el
			.height( height + 'px' )
			.addClass(types.join(" "))
			.data("id", this.model.get('id'))
			.css('background', background);
	}
});

module.exports = CalendarItem;