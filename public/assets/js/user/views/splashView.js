var SplashView = Marionette.LayoutView.extend({
	template : _.template( require("templates/splashWrapper.html") ),
	addRoom : function( model ){
		var rooms = this.model.get("rooms");
		rooms[ model.get("key") ] = model.toJSON();
		this.render();
	}
});

module.exports = SplashView;