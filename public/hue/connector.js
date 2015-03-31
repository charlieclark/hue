var hue = require("node-hue-api"),
	HueApi = hue.HueApi,
	lightState = hue.lightState,
	timeout = 20000;

var displayResults = function(result) {
    console.log(JSON.stringify(result, null, 2));
};

var displayError = function(err) {
    console.error(err);
};

function Connector( hostname, username ){
	this._hostname = hostname;
	this._username = username;
	this._api = new HueApi(hostname, username, timeout);
}

Connector.prototype = {
	listLights : function(){

		this._api.lights()
		    .then(displayResults)
		    .done();
	},

	findNewLights : function(){

		this._api.searchForNewLights()
		    .then(displayResults)
		    .done();
	},

	listNewLights : function(){

		this._api.newLights()
		    .then(displayResults)
		    .done();
	},

	newUser : function( newUserName, userDescription ){

		this._api.registerUser(this._hostname, newUserName, userDescription)
		    .then(displayResults)
		    .fail(displayError)
		    .done();
	},

	setLight : function( id, data ){

		var h = data.hsl.h;
		var s = data.hsl.s;
		var l = data.hsl.l;

		state = lightState.create().on().hsl(h, s, l);

		this._api.setLightState(id, state) // provide a value of false to turn off
		    .then(displayResults)
		    .fail(displayError)
		    .done();
	}
}

module.exports = Connector;