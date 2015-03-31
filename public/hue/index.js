var hue = require("node-hue-api");
var Connector = require("./connector.js");

var displayBridges = function(bridge) {
    console.log("Hue Bridges Found: " + JSON.stringify(bridge));
};

//show connected bridges
hue.nupnpSearch().then(displayBridges).done();

//connection wrapper
var c1 = new Connector( "192.168.108.102", "2ab6066a1edd6f77253320d628b7e493" );

c1.listLights();

c1.setLight(1);
c1.setLight(2);
c1.setLight(3);
