var _ = require('underscore');
var one = require("onecolor");
var Rainbow = require("./../libs/rainbow");
var patterns = require('./../patternData.js');

var isNode = typeof window === 'undefined';

function LightPattern( lightId, patternId, opt_data, model ){

	this._pattern = patterns[ patternId ];
	this._model = model;

	// make sequence by patternId
	this.createSequence( patternId, opt_data );

	this._lightId = lightId;

	this._step = 0;
	this._iteration = 0;

	this._sequence = this.startSequence( patternId );

	this._timeout = null;
}

LightPattern.prototype = {
	createSequence : function( patternId, opt_data ){
		
		var pattern = patterns[ patternId ];

		switch(patternId) {
			case 'occupied':
			var numStops = 30;

			pattern.start = opt_data.start;
			pattern.end = opt_data.end;
			pattern.wait = (pattern.end - pattern.start) / numStops / 1000;
			pattern.fade = pattern.wait;

			var rainbow = new Rainbow();
			rainbow.setSpectrum.apply( rainbow, pattern.colors );

			pattern.sequence = [];
			for(var i = 0; i < numStops; i++) {
				var color = rainbow.colourAt( i/(numStops-1) * 100 );
				pattern.sequence.push( color );
			}
			break;

			default:
			pattern.sequence = pattern.colors.concat();
			break;
		}
	},
	getColor : function(){

		return this._sequence[this._step];
	},
	startSequence : function( patternId ){

		var pattern = patterns[ patternId ];
		this._sequence = pattern.sequence;

		this.stopSequence();

		var step;

		switch(patternId) {
			case 'occupied':
			step = Math.floor( (new Date() - pattern.start) / (pattern.end - pattern.start) * 30 );
			break;

			default:
			step = 0;
			break;
		}

		this.playSequenceStep( step, pattern.instant );

		return this._sequence;
	},
	stopSequence : function(){

		this._step = 0;
		this._iteration = 0;

		clearTimeout( this._timeout );
	},
	playSequenceStep: function( step, instant ){

		// console.log("play sequence step")

		this._step = step;

		var color = one( this.getColor() );

		var fade = instant ? 0 : this._pattern.fade;
		var wait = this._pattern.wait;

		var hsl = {
			h : Math.floor( color.h() * 360), 
			s : Math.floor( color.s() * 100),
			l : Math.floor( color.l() * 100) 
		};

		this._model.set('fade', fade);
		this._model.set('hsl', hsl);

		clearTimeout( this._timeout );
		this._timeout = setTimeout(_.bind(this.nextSequenceStep, this), wait*1000);
	},
	nextSequenceStep: function(){

		var totalSteps = this._sequence.length;
		var repeat = this._pattern.repeat;

		this._step ++;
		if(this._step > totalSteps - 1) {
			this._step = 0;
			this._iteration ++;
		}

		if(repeat > -1 && this._iteration > repeat) {
			this.stopSequence();
			return;
		}

		this.playSequenceStep( this._step );
	}
}

module.exports = LightPattern;