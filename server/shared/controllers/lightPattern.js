var _ = require( 'underscore' );
var one = require( "onecolor" );
var Rainbow = require( "./../libs/rainbow" );
var patterns = require( './../patternData.js' );
var pipe = require( "./../pipe.js" );

var isNode = typeof window === 'undefined';

function LightPattern( lightId, pattern, opt_data, model ) {

	this._pattern = _.isObject( pattern ) ? pattern : patterns[ pattern ];
	console.log( "lightpattern", pattern );
	this._model = model;

	// make sequence by pattern id
	this.createSequence( opt_data );

	this._lightId = lightId;

	this._step = 0;
	this._iteration = 0;

	this._sequence = this.startSequence();

	this._timeout = null;
}

LightPattern.prototype = {
	createSequence: function( opt_data ) {

		var pattern = this._pattern;

		switch ( pattern.id ) {
			case 'occupied':
				var numStops = 30;

				pattern.start = opt_data.start;
				pattern.end = opt_data.end;
				pattern.wait = ( pattern.end - pattern.start ) / numStops / 1000;
				pattern.fade = pattern.wait;

				var rainbow = new Rainbow();
				rainbow.setSpectrum.apply( rainbow, pattern.colors );

				pattern.sequence = [];
				for ( var i = 0; i < numStops; i++ ) {
					var color = rainbow.colourAt( i / ( numStops - 1 ) * 100 );
					pattern.sequence.push( color );
				}
				break;

			default:
				pattern.sequence = pattern.colors.concat();
				break;
		}
	},
	getColor: function() {

		return this._sequence[ this._step ];
	},
	startSequence: function() {

		var pattern = this._pattern;
		this._sequence = pattern.sequence;

		this.stopSequence();

		var step;

		switch ( pattern.id ) {
			case 'occupied':
				step = Math.floor( ( new Date() - pattern.start ) / ( pattern.end - pattern.start ) * 30 );
				break;

			default:
				step = 0;
				break;
		}

		this.playSequenceStep( step, pattern.instant );

		return this._sequence;
	},
	stopSequence: function() {

		this._step = 0;
		this._iteration = 0;

		clearTimeout( this._timeout );
	},
	playSequenceStep: function( step, instant ) {

		this._step = step;

		var color = one( this.getColor() );

		if ( !color ) {
			return;
		}

		var fade = instant ? 1 : this._pattern.fade;
		var wait = this._pattern.wait;

		var rgb = {
			r: Math.floor( color.r() * 255 ),
			g: Math.floor( color.g() * 255 ),
			b: Math.floor( color.b() * 255 ),
			brightness: Math.floor( color.lightness() * 100 )
		};

		this._model.set( 'fade', fade );
		this._model.set( 'rgb', rgb );

		if ( isNode ) {
			pipe.trigger( "rgb_change:" + this._model.get( "key" ), {
				fade: fade,
				rgb: rgb
			} );
		}

		clearTimeout( this._timeout );
		this._timeout = setTimeout( _.bind( this.nextSequenceStep, this ), wait * 1000 );
	},
	nextSequenceStep: function() {

		var totalSteps = this._sequence.length;
		var repeat = this._pattern.repeat;

		this._step++;
		if ( this._step > totalSteps - 1 ) {
			this._step = 0;
			this._iteration++;
		}

		if ( repeat > -1 && this._iteration > repeat ) {
			this.stopSequence();

			if ( this._customCallback && !this._calledBack ) {
				this._calledBack = true;
				this._customCallback();
			}
			return;
		}

		this.playSequenceStep( this._step );
	},
	customCallback: function( callback ) {
		this._customCallback = callback;
	}
}

module.exports = LightPattern;