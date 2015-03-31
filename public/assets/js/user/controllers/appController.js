var MyAppController = Marionette.Controller.extend({
	loadPage : function( pageName ){
		console.log("PAGE NAasdasdasdasdME::", pageName );         
		this.trigger("pageLoaded", pageName);
	}
});

MyAppController.events = "test";

module.exports =  new MyAppController();
