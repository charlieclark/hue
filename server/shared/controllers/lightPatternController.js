var _ = require( 'underscore' );
var LightPattern = require( "./lightPattern" );

function LightPatternController( model ) {

	this._model = model;
	this.init();
}

LightPatternController.prototype = {
	init: function() {

		this.isAvailable();
		this._model.on( "change:currentEvent", this.currentChanged, this );

		setInterval( _.bind( this.checkPatternType, this ), 1000 );
	},
	checkPatternType: function() {
		if ( this._roomModel ) {
			var changed = this._roomModel.getPatternType();
			if ( changed ) {
				this.typeChanged( this._roomModel );
			}
		}
	},
	currentChanged: function( parent, model ) {

		this._roomModel = model;
	},
	typeChanged: function( model ) {

		var type = model.get( "type" );

		console.log( "type changed", type )

		this.stopExisting();

		var data = {};

		data = {
			start: model.get( "start" ).raw,
			end: model.get( "end" ).raw
		}


		this.newPattern( type, data );
	},
	isAvailable: function() {

		this.newPattern( "available" );
	},
	getCurrent: function() {

		return this._currentPattern;
	},
	newPattern: function( type, data ) {

		var key = this._model.get( "key" );

		data = data || {};

		this.stopExisting();

		this._currentPattern = new LightPattern( key, type, data, this._model );
	},
	stopExisting: function() {

		if ( this._currentPattern ) {
			this._currentPattern.stopSequence();
		}
	}
}

module.exports = LightPatternController;