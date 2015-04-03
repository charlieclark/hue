var SplashView = Marionette.LayoutView.extend({
	id : "room-split",
	template : _.template( require("templates/splashWrapper.html") ),
	initialize : function(){
		
	},
	addRoom : function( model ){
		var rooms = this.model.get("rooms");
		rooms[ model.get("key") ] = model;

		this.listenTo( model, "change:currentEvent", this.render );
		this.render();
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