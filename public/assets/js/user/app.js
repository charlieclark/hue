window.Common = {
	path : {
		assets : "assets/",
		img : "assets/img/",
		audio : "assets/audio/"
	},
	sizes :{
		frame : 10
	}
};

//base
var AppRouter 		= require( "controllers/appRouter" );
var AppLayout 		= require( "views/appLayout" );

//custom
var CalendarView	= require("views/calendar");

//THE APPLICATION
var MyApp = Marionette.Application.extend({
	initialize : function(){
		
	},
	onStart : function(){
		Backbone.history.start({
			pushState : false
		});
		AppLayout.render(); 
		console.log("!!!!!!!!asdasdsadas!!!!")

		var myCalendar = new CalendarView();
		AppLayout.getRegion("main").show( myCalendar );
	} 
});



$(function(){
	window.app = new MyApp();
	window.app.start(); 
});







         