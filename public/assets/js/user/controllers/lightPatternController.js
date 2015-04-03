var LightPattern = require("controllers/lightPattern");

function LightPatternController( model ){
	
	this._model = model;
	this.init( );
}

LightPatternController.prototype = {
	init : function(){

		this._model.on( "change:currentEvent", this.currentChanged, this  );
	},
	currentChanged : function( parent, model ){

		this.stopExisting();

		if( !model ) return;

		var type = model.getPatternType();
		var start = model.get("start").raw;
		var end = model.get("end").raw;
		var key = model.get("key");

		this._currentPattern = new LightPattern( key, type, {
			start : start,
			end : end
		});
	},
	stopExisting : function(){

		if( this._currentPattern ){
			this._currentPattern.stopSequence();	
		}
	}
}

module.exports = LightPatternController;