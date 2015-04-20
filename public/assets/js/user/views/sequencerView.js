var state = require( "state" );
var helpers = require( 'helpers' );

var PreloadView = require( "views/preloadView" );

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
	onShow: function() {

		var gradientImg = PreloadView.getAsset( 'gradient' );
		console.log( "SHOW SEQUENCER" )
		var canvas = this.$el.find( 'canvas' ).get( 0 );

		canvas.width = gradientImg.width;
		canvas.height = gradientImg.height;
		canvas.getContext( '2d' ).drawImage( gradientImg, 0, 0 );
	},
} );

module.exports = keyView;