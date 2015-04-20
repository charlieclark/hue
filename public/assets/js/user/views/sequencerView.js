var state = require( "state" );
var helpers = require( 'helpers' );

var PreloadView = require( "views/preloadView" );

var keyView = Marionette.LayoutView.extend( {
	template: _.template( require( "templates/sequencer.html" ) ),
	ui: {
		'back': '.back',
		'send': '.send',
		'picker': '.picker',
		'canvas': 'canvas',
		'toolbar': '.toolbar',
		'buttons': 'button'
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

		this._onMouseMove = $.proxy( this.onMouseMove, this );
		this._onMouseDown = $.proxy( this.onMouseDown, this );
		this._onMouseUp = $.proxy( this.onMouseUp, this );
		this._showPicker = $.proxy( this.showPicker, this );
		this._hidePicker = $.proxy( this.hidePicker, this );
	},
	showPicker: function() {
		this.ui.picker.removeClass( 'hide' );
	},
	hidePicker: function() {
		this.ui.picker.addClass( 'hide' );
	},
	onMouseDown: function( e ) {
		if ( e.target.tagName === 'BUTTON' ) {
			return false;
		}

		this.ui.picker.addClass( 'press' );
	},
	onMouseUp: function( e ) {
		this.ui.picker.removeClass( 'press' );
	},
	onMouseMove: function( e ) {
		this.ui.picker.css( {
			'top': e.clientY + 'px',
			'left': e.clientX + 'px'
		} );
	},
	onShow: function() {

		var gradientImg = PreloadView.getAsset( 'gradient' );
		var canvas = this.$el.find( 'canvas' ).get( 0 );

		canvas.width = gradientImg.width;
		canvas.height = gradientImg.height;
		canvas.getContext( '2d' ).drawImage( gradientImg, 0, 0 );

		$( document.body ).on( 'mousemove', this._onMouseMove );
		$( document.body ).on( 'mousedown', this._onMouseDown );
		$( document.body ).on( 'mouseup', this._onMouseUp );
		$( document.body ).on( 'mouseleave', this._onMouseUp );
		this.ui.toolbar.on( 'mouseenter', this._hidePicker );
		this.ui.buttons.on( 'mouseenter', this._hidePicker );
		this.ui.canvas.on( 'mouseenter', this._showPicker );
	},
	onBeforeDestroy: function() {

		$( document.body ).off( 'mousemove', this._onMouseMove );
		$( document.body ).off( 'mousedown', this._onMouseDown );
		$( document.body ).off( 'mouseup', this._onMouseUp );
		$( document.body ).off( 'mouseleave', this._onMouseUp );
		this.ui.toolbar.off( 'mouseenter', this._hidePicker );
		this.ui.buttons.off( 'mouseenter', this._hidePicker );
		this.ui.canvas.off( 'mouseenter', this._showPicker );
	}
} );

module.exports = keyView;