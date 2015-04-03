var State = require('models/state');

var SplashView = Marionette.LayoutView.extend({
	id : "room-split",
	template : _.template( require("templates/splashWrapper.html") ),
	initialize : function() {
		_.bindAll(this, 'resize');
		$(window).resize( this.resize ).resize();
	},
	addRoom : function( model ){
		var rooms = this.model.get("rooms");
		rooms[ model.get("key") ] = model.toJSON();
		this.render();
	},
	resize : function(){
		var aspectRatio = $(window).width() / $(window).height();
		State.set('portrait', aspectRatio <= 1);
	}
});

module.exports = SplashView;