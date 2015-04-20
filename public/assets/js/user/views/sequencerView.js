var state = require( "state" );
var helpers = require( 'helpers' );

var patterns = require( 'patternData' );

var State = require( 'models/state' );
var roomData = require( "roomData" );

var keyView = Marionette.LayoutView.extend( {
	template: _.template( require( "templates/sequencer.html" ) ),
	ui: {
		'back': '.back',
		'send': '.send'
	},
	events: {
		'click @ui.back': function( e ) {
			state.navigate( 'home', null, null, true );
		},
		'click @ui.send': function( e ) {

			var $button = $( e.currentTarget );

			if ( $button.hasClass( 'clicked' ) ) return;

			$button
				.doTimeout( 'clicked', 1000, 'removeClass', 'clicked' )
				.addClass( 'clicked' );
		}
	},
	initialize: function() {


	},
} );

module.exports = keyView;