var state 	= require( "state" );
var helpers = require('helpers');

var patterns = require('patternData');

var keyView = Marionette.LayoutView.extend({
	template : _.template( require("templates/key.html") ),
	ui : {
		'back' : '.back'
	},
	events : {
		'click @ui.back' : function(e){
			state.navigate('home', null, null, true);
		}
	},
	initialize : function(){

		var _patterns = _.map(patterns, function(pattern, key){
			return {
				key: key,
				title: pattern.title,
				type: pattern.type,
				colors: (key === 'occupied') ? helpers.createGradientStops(pattern.colors, 5) : helpers.extendColors(pattern.colors, 5)
			};
		});

		this.model.set("patterns", _patterns);
	},
});

module.exports = keyView;