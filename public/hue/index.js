var hue = require("node-hue-api");
var _ = require("underscore");
var Connector = require("./connector.js");


var displayBridges = function(bridge) {
    console.log("Hue Bridges Found: " + JSON.stringify(bridge));
};

//show connected bridges
// hue.nupnpSearch().then(displayBridges).done();

//connection wrapper
var c1 = new Connector( "192.168.108.102", "2ab6066a1edd6f77253320d628b7e493" );

// c1.listLights();

function testLights(){
	var hsl = {
		h : Math.floor( 360 * Math.random() ),
		s : 100,
		l : 100
	};

	updateLights([
		{
			'id' : 1,
			'data' : {
				'hsl' : hsl
			}
		},
		{
			'id' : 2,
			'data' : {
				'hsl' : hsl
			}
		},
		{
			'id' : 3,
			'data' : {
				'hsl' : hsl
			}
		}
	]);
}

testLights();

function updateLights( data ){

	_.each( data, function( value ){

		c1.setLight(value.id, value.data)
	});
}



module.exports = {
	updateLights : updateLights
}