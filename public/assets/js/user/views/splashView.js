var AppRouter 		= require( "controllers/appRouter" );

var State = require('models/state');
var roomData = require("roomData");
var SplashItemView = require("views/splashItemView");

var SplashView = Marionette.LayoutView.extend({
	id : "room-split",
	template : _.template( require("templates/splashWrapper.html") ),
	ui : {
		roomContainers : ".room-container"
	},
	events : {
		"mouseenter @ui.roomContainers" : function(e){

			this.ui.roomContainers.each(function(index, el) {
				var isHovered = (el === e.currentTarget);
				$(el).toggleClass('hovered', isHovered);
				$(el).toggleClass('not-hovered', !isHovered);
			});
		},
		"mouseleave @ui.roomContainers" : function(e){
				
			this.ui.roomContainers.removeClass('hovered not-hovered');
		},
		"click @ui.roomContainers" : function( e ){

			var key = $( e.currentTarget ).data("id");
			AppRouter.navigate("room/"+key, {trigger: true});

			// this.ui.roomContainers.each(function(index, el) {
			// 	var shouldExpand = (el === e.currentTarget);
			// 	$(el).toggleClass('expanded', shouldExpand);
			// 	$(el).toggleClass('collapsed', !shouldExpand);
			// });
		}
	},
	reset : function(){

		this.ui.roomContainers.removeClass('expanded collapsed hovered not-hovered');
	},
	initialize : function(){
		_.bindAll(this, 'resize');
		$(window).resize( this.resize ).resize();

		this.model.set("roomData", roomData);

		_.each( roomData, function( value, key ){
			this.addRegion( key, "#room-"+key );
		}, this);

	},
	addRoom : function( model ){
		var key = model.get("key");
		var region = this.getRegion( key );
		region.show( new SplashItemView({ model : model } ) );
	},
	resize : function(){
		var aspectRatio = $(window).width() / $(window).height();
		State.set('portrait', aspectRatio <= 1);
	}
});

module.exports = SplashView;