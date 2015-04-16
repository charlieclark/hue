var helpers = require('helpers');

var TimeDisplayTemplate = _.template( require("templates/timeDisplay.html") );

var SplashItemView = Marionette.ItemView.extend({
	template : _.template( require("templates/splashItem.html") ),
	tagName : "section",
	className : "room",
	ui: {
		timeDisplay: '.time'
	},
	initialize : function(){

		this.listenTo( this.model, "change:currentEvent", this.render );
		this.listenTo( this.model, "change:timeLeft", this.updateTimeLeft );

		TweenMax.ticker.addEventListener('tick', this.update, this);

		// this.render();
	},
	update: function(){

		var lightPattern = this.model.getLightPattern();

		this.$el.css({
			'background-color': lightPattern.getColor()
		});
	},
	updateTimeLeft : function(model, data){

		var key = model.get("key");
		this.ui.timeDisplay.html( TimeDisplayTemplate({
			hours : helpers.addLeadingZero(data.hours, 2),
			minutes : helpers.addLeadingZero(data.minutes, 2),
			seconds : helpers.addLeadingZero(data.seconds, 2),
			showColon : (data.seconds % 2 === 0)
		}) );
	},
	onBeforeRender : function(){
		var currentEvent = this.model.get("currentEvent");
		this.model.set( "currentEventData", currentEvent ? currentEvent.toJSON() : null );
	}
});

module.exports = SplashItemView;