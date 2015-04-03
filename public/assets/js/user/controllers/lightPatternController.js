var LightPattern = require("controllers/lightPattern");

function LightPatternController( model ){
	
	this._model = model;
	this.init( );
}

LightPatternController.prototype = {
	init : function(){

		this.isAvailable();
		this._model.on( "change:currentEvent", this.currentChanged, this  );
	},
	currentChanged : function( parent, model ){

		this.stopExisting();

		if( !model ) return;

		var type = model.getPatternType();

		var data = {
			start : model.get("start").raw,
			end : model.get("end").raw
		}

		this.newPattern( type, data );

	},
	isAvailable : function(){

		this.newPattern( "available" );
	},
	getCurrent : function(){

		return this._currentPattern;
	},
	newPattern : function( type, data ){

		var key = this._model.get("key");

		data = data || {};

		this.stopExisting();

		this._currentPattern = new LightPattern( key, type, data);

	},
	stopExisting : function(){

		if( this._currentPattern ){
			this._currentPattern.stopSequence();	
			this.isAvailable();
		}
	}
}

module.exports = LightPatternController;