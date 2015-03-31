var AppController = require("controllers/appController");

var MyAppRouter = Marionette.AppRouter.extend({
	controller : AppController,
	appRoutes : {
		":page" : "loadPage"
	}
});

module.exports = new MyAppRouter();
