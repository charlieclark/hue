var CalendarItem 	= require("views/calendarItem");
var state = require("state");

var CalendarSingle = Marionette.LayoutView.extend({
	template : _.template( require("templates/calendarSingle.html") ),
	className : "viewport",
	regions : {
		eventListContainer : "#event-list-container"
	},
	events : {
	},
	modelEvents : {
		"change:updated" : "setCurrent"
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

		this.setCurrent();
	},
	setCurrent : function(){
		var currentEvent = this.collectionView.collection.getCurrent();

		if(currentEvent) {
			var eventId = currentEvent.get('id');
			var $items = this.$el.find('.item');
			var $curEl = $items.filter(function() {
				console.log($(this).data('id'), eventId);
				return $(this).data('id') == eventId
			});
			var top = $curEl.position().top;
			var height= $curEl.height();
			var bottom = top + height;
			var start = currentEvent.get('start').raw;
			var end = currentEvent.get('end').raw;
			var now = new Date();
			var timeProgress = (now - start) / (end - start);
			var y = top + height * timeProgress;
			
			var $needle = this.$el.find('.needle');
			$needle.css('top', y+'px');
		}
	},
	onClose : function(){

		state.navigate("");
	}
});

module.exports = CalendarSingle;