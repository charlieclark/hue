var CalendarItem 	= require("views/calendarItem");
var state = require("state");

var CalendarSingle = Marionette.LayoutView.extend({
	template : _.template( require("templates/calendarSingle.html") ),
	regions : {
		eventListContainer : "#event-list-container"
	},
	ui : {
		'back' : '.back'
	},
	events : {
		'click @ui.back' : function(e){
			state.navigate('home', null, null, true);
		}
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

		this._onMouseWheel = $.proxy(this.onMouseWheel, this);

		this._dragStartY = 0;console.log(this.model);
	},
	onShow : function(){

		this.getRegion( "eventListContainer" ).show( this.collectionView );
		setTimeout($.proxy(this.resetScrollPosition,this), 0);

		this.$viewport = this.$viewport || this.$el.find('.viewport');
		this.viewport = this.viewport || this.$viewport.get(0);

		this._draggable = this._draggable || new Draggable(this.viewport, {
	    'type': 'scrollTop',
	    'bounds': '#event-list-container',
	    'edgeResistance': 0.85,
	    'throwProps': true,
	    'dragClickables': true,
	    'zIndexBoost': false,
	    'onDragStart': this.onDragStart,
	    'onDragStartScope': this,
	    'onDragEnd': this.onDragEnd,
	    'onDragEndScope': this
	  });

		this._scrollTo = this._scrollTo || TweenMax.to(this.viewport, 1, {
			'scrollTo': {y: 0},
			'ease': Power4.easeOut
		});

	  this.$viewport.on('mousewheel', this._onMouseWheel);
	},
	resetScrollPosition : function(){
		var y = this.setCurrent() - ($(window).height()/2 - this.$el.find('header').height());

		if(y > this.viewport.scrollHeight - this.$viewport.height()) {
			y = 'max';
		}

		this._scrollTo.updateTo({
			'scrollTo': {y: y}
		}, true);
	},
	setCurrent : function(){
		var currentEvent = this.collectionView.collection.getCurrent();
		var y = 0;

		if(currentEvent) {
			var eventId = currentEvent.get('id');
			var $items = this.$viewport.find('.item');

			if( !$items.length ) return;

			var $curEl = $items.filter(function() {
				return $(this).data('id') == eventId
			});
			var top = $curEl.position().top;
			var height= $curEl.height();
			var bottom = top + height;
			var start = currentEvent.get('start').raw;
			var end = currentEvent.get('end').raw;
			var now = new Date();
			var timeProgress = (now - start) / (end - start);
			
			y = top + height * timeProgress;
			
			var $needle = this.$viewport.find('.needle');
			$needle.css('top', y+'px');
		}

		return y;
	},
	onClose : function(){

		state.navigate("");
	},
	onDragStart : function(){
		this.$viewport.toggleClass('grabbing', true);
		this._dragStartY = this.viewport.scrollTop;
	},
	onDragEnd : function(){
		this.$viewport.toggleClass('grabbing', false);
		if(this._dragStartY === 0 && this._draggable.getDirection() === 'down') {
			state.navigate('home', null, null, true);
		}
	},
	onMouseWheel : function(e) {

		var y = this.viewport.scrollTop - e.deltaY * e.deltaFactor * 2;

		this._scrollTo.updateTo({
			'scrollTo': {y: y}
		}, true);
	}
});

module.exports = CalendarSingle;