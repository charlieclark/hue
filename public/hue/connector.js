var hue = require("node-hue-api"),
	HueApi = hue.HueApi;

var displayResults = function(result) {
    console.log(JSON.stringify(result, null, 2));
};

var displayError = function(err) {
    console.error(err);
};

function Connector( hostname, username ){
	this._hostname = hostname;
	this._username = username;
	this._api = new HueApi(hostname, username);
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

	setLight : function( id ){

		var r = Math.floor( Math.random() * 255 );
		var g = Math.floor( Math.random() * 255 );
		var b = Math.floor( Math.random() * 255 );
		var rgb = [ r, g, b ];

		this._api.setLightState(id, {
			"on": true,
			"rgb" : rgb,
			"brightness" : 255
		}) // provide a value of false to turn off
	    .then(displayResults)
	    .fail(displayError)
	    .done();
	}
}

module.exports = Connector;