var State = require('models/state');

var SplashView = Marionette.LayoutView.extend({
	id : "room-split",
	template : _.template( require("templates/splashWrapper.html") ),
	ui : {
		roomContainers : ".room-container"
	},
	events : {
		"mouseenter @ui.roomContainers" : function(e){
				$('.room-container').each(function(index, el) {
					var isHovered = (el === e.currentTarget);
					$(el).toggleClass('hovered', isHovered);
					$(el).toggleClass('not-hovered', !isHovered);
				});
		},
		"mouseleave @ui.roomContainers" : function(e){
				$('.room-container').each(function(index, el) {
					$(el).removeClass('hovered');
					$(el).removeClass('not-hovered');
				});
		},
		"click @ui.roomContainers" : function(e){
				$('.room-container').each(function(index, el) {
					var shouldExpand = (el === e.currentTarget);
					$(el).toggleClass('expanded', shouldExpand);
					$(el).toggleClass('collapsed', !shouldExpand);
				});
		}
	},
	reset : function(){
		$('.room-container').each(function(index, el) {
			$(el).toggleClass('expanded', false);
			$(el).toggleClass('collapsed', false);
			$(el).toggleClass('hovered', false);
			$(el).toggleClass('not-hovered', false);
		});
	},
	initialize : function(){
		_.bindAll(this, 'resize');
		$(window).resize( this.resize ).resize();

		TweenMax.ticker.addEventListener('tick', this.update, this);
	},
	onRender : function(){

	},
	addRoom : function( model ){
		var rooms = this.model.get("rooms");
		rooms[ model.get("key") ] = model;

		this.listenTo( model, "change:currentEvent", this.render );
		this.render();
	},
	resize : function(){
		var aspectRatio = $(window).width() / $(window).height();
		State.set('portrait', aspectRatio <= 1);
	},
	update: function(){

		var rooms =  this.model.get("rooms");

		_.each( rooms, function( room, key ) {
			
			var lightPattern = room.getLightPattern();

			$('#room-'+key).css({
				'background-color': lightPattern.getColor()
			});
		});
	},
	onBeforeRender : function(){

		console.log("RERENDER SPLASH");
		var rooms =  this.model.get("rooms");
		var roomsData =  this.model.get("roomsData");

		_.each( rooms, function( room, key ) {
			roomsData[ key ] = room.toJSON();
		});
	}
});

module.exports = SplashView;