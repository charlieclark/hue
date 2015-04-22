var state = require( "state" );
var helpers = require( 'helpers' );
var patterns = require( 'patternData' );
var hueConnect = require( "controllers/hueConnect" );

var PreloadView = require( "views/preloadView" );

var keyView = Marionette.LayoutView.extend( {
	template: _.template( require( "templates/sequencer.html" ) ),
	ui: {
		'back': '.back',
		'send': '.send',
		'picker': '.picker',
		'toolbar': '.toolbar',
		'canvas': 'canvas',
		'toolbar': '.toolbar',
		'roomButtons': '.rooms button',
		'colorButtons': '.pattern button',
		'buttons': 'button'
	},
	events: {
		'click @ui.back': function( e ) {
			state.navigate( state.previous( 'page' ), null, null, true );
		},
		'click @ui.send': function( e ) {

			var $button = $( e.currentTarget );

			if ( $button.hasClass( 'clicked' ) ) return;

			$button
				.doTimeout( 'clicked', 1000, 'removeClass', 'clicked' )
				.addClass( 'clicked' );

			var filledColorButtons = this.ui.toolbar.find( '.pattern .filled' );
			var colors = $.map( filledColorButtons, function( button ) {
				var rgbString = $( button ).css( 'background-color' );
				return helpers.rgbStringToHex( rgbString );
			} );

			var defaultId = state.get( 'section' );

			var pattern = this.createCustomPattern( {
				id: ( defaultId && defaultId.length > 0 ) ? defaultId : 'custom',
				colors: colors
			} );

			var activeRoomButtons = this.ui.toolbar.find( '.rooms .active' );
			var rooms = $.map( activeRoomButtons, function( button ) {
				return button.getAttribute( 'data-id' );
			} );

			hueConnect.sendPattern( pattern, rooms );
		},
		'click @ui.roomButtons': function( e ) {

			var $button = $( e.currentTarget );

			$button.toggleClass( 'active', !$button.hasClass( 'active' ) );

			this.updateSendStatus();
		},
		'click @ui.colorButtons': function( e ) {

			var $button = $( e.currentTarget );

			$button.toggleClass( 'active', !$button.hasClass( 'active' ) );
		},
		'mouseenter @ui.colorButtons': function( e ) {

			if ( this._hasDragged ) {
				this.ui.picker.toggleClass( 'hovered', true );
			}
		},
		'mouseleave @ui.colorButtons': function( e ) {

			this.ui.picker.toggleClass( 'hovered', false );
		}
	},
	initialize: function() {

		this._onMouseMove = $.proxy( this.onMouseMove, this );
		this._onMouseDown = $.proxy( this.onMouseDown, this );
		this._onMouseUp = $.proxy( this.onMouseUp, this );
		this._onClick = $.proxy( this.onClick, this );
		this._showPicker = $.proxy( this.showPicker, this );
		this._hidePicker = $.proxy( this.hidePicker, this );

		this._hasDragged = false;
		this._draggedColor = null;
	},
	showPicker: function() {
		this.ui.picker.removeClass( 'hide' );
	},
	hidePicker: function() {
		this.ui.picker.addClass( 'hide' );
	},
	updateSendStatus: function() {

		var noFilledColor = ( this.ui.toolbar.find( '.pattern .filled' ).length === 0 );
		var noActiveRoom = ( this.ui.toolbar.find( '.rooms .active' ).length === 0 );

		this.ui.send.attr( 'disabled', ( noActiveRoom || noFilledColor ) );
	},
	createCustomPattern: function( obj ) {

		var presetId = state.get( 'section' );

		if ( presetId && presetId.length > 0 ) {

			var presetColors = helpers.extendColors( patterns[ presetId ].colors, obj.colors.length );

			if ( _.isEqual( obj.colors, presetColors ) ) {
				return patterns[ presetId ];
			}
		}

		return _.extend( {
			id: 'custom',
			title: 'Custom',
			type: null,
			instant: true,
			repeat: 1,
			fade: 1,
			wait: 2,
			colors: [],
			sequence: []
		}, obj )
	},
	getColorFromPosition: function( clientX, clientY ) {
		var canvasWidth = this.ui.canvas.width();
		var canvasHeight = this.ui.canvas.height();
		var canvasOffset = this.ui.canvas.offset();
		var mouseX = Math.min( canvasOffset.left + canvasWidth, Math.max( clientX, canvasOffset.left ) );
		var mouseY = Math.min( canvasOffset.top + canvasHeight, Math.max( clientY, canvasOffset.top ) );
		var pixelX = Math.round( ( this.ui.canvas.attr( 'width' ) - 1 ) * ( ( mouseX - canvasOffset.left ) / canvasWidth ) );
		var pixelY = Math.round( ( this.ui.canvas.attr( 'height' ) - 1 ) * ( ( mouseY - canvasOffset.top ) / canvasHeight ) );

		var context = this.ui.canvas.get( 0 ).getContext( '2d' );
		var rgba = context.getImageData( pixelX, pixelY, 1, 1 ).data;
		var hex = helpers.rgbArrayToHex( rgba );

		return hex;
	},
	setColorToButton: function( button, color ) {
		button.addClass( 'filled' ).css( {
			'background': color
		} );
	},
	unsetColorFromButton: function( button ) {
		button.removeClass( 'filled' ).css( {
			'background': ''
		} );
	},
	unsetColorFromAllButtons: function() {
		_.each( this.ui.colorButtons, function( button ) {
			this.unsetColorFromButton( $( button ) );
		}, this );
	},
	activate: function() {

		$( document.body ).on( 'mousemove', this._onMouseMove );
		$( document.body ).on( 'mousedown', this._onMouseDown );
		$( document.body ).on( 'mouseup', this._onMouseUp );
		$( document.body ).on( 'mouseleave', this._onMouseUp );
		$( document.body ).on( 'click', this._onClick );
		this.ui.toolbar.on( 'mouseenter', this._hidePicker );
		this.ui.buttons.on( 'mouseenter', this._hidePicker );
		this.ui.canvas.on( 'mouseenter', this._showPicker );

		this.ui.roomButtons.toggleClass( 'active', false );
		$( this.ui.roomButtons[ 0 ] ).toggleClass( 'active', true );

		this.ui.colorButtons.toggleClass( 'active', false );
		this.ui.send.attr( 'disabled', true );

		// populate color preset by url section
		var key = state.get( 'section' );
		var pattern = patterns[ key ];
		if ( pattern ) {
			var numColors = this.ui.colorButtons.length;
			var extendedColors = helpers.extendColors( pattern.colors, numColors );
			_.each( extendedColors, function( color, i ) {
				this.setColorToButton( $( this.ui.colorButtons[ i ] ), color );
			}, this );
		} else {
			this.unsetColorFromAllButtons();
		}

		this.updateSendStatus();
	},
	deactivate: function() {

		$( document.body ).off( 'mousemove', this._onMouseMove );
		$( document.body ).off( 'mousedown', this._onMouseDown );
		$( document.body ).off( 'mouseup', this._onMouseUp );
		$( document.body ).off( 'mouseleave', this._onMouseUp );
		$( document.body ).off( 'click', this._onClick );
		this.ui.toolbar.off( 'mouseenter', this._hidePicker );
		this.ui.buttons.off( 'mouseenter', this._hidePicker );
		this.ui.canvas.off( 'mouseenter', this._showPicker );

		this.ui.picker.css( {
			'top': '-9999px'
		} );

		this.unsetColorFromAllButtons();
	},
	onMouseDown: function( e ) {
		if ( e.target.tagName === 'BUTTON' ) {
			return false;
		}

		this.ui.picker.addClass( 'press' );
	},
	onMouseUp: function( e ) {
		this.ui.picker.removeClass( 'press' ).removeClass( 'dragging' ).removeClass( 'hovered' );

		if ( this._hasDragged ) {

			var $target = $( e.target );
			if ( $target.hasClass( 'color' ) ) {
				this.setColorToButton( $target, this._draggedColor );
			}

			this._hasDragged = false;
		}

		this.updateSendStatus();
	},
	onMouseMove: function( e ) {
		this.ui.picker.css( {
			'top': e.clientY + 'px',
			'left': e.clientX + 'px'
		} );

		if ( !this._hasDragged && this.ui.picker.hasClass( 'press' ) ) {
			this._draggedColor = this.getColorFromPosition( e.clientX, e.clientY );
			this.ui.picker.toggleClass( 'dragging', true ).css( {
				'background': this._draggedColor,
				'color': this._draggedColor
			} );
			this._hasDragged = true;
		}
	},
	onClick: function( e ) {

		if ( e.target.tagName !== 'BUTTON' && !$.contains( this.ui.toolbar.get( 0 ), e.target ) && !this._hasDragged ) {
			var hex = this.getColorFromPosition( e.clientX, e.clientY );
			var $colorButton = this.ui.toolbar.find( '.pattern .active' );
			if ( $colorButton.length > 0 ) {
				this.setColorToButton( $colorButton, hex );
			} else {

				var $notFilledButton = this.ui.toolbar.find( '.pattern .color:not(.filled)' );
				if ( $notFilledButton.length > 0 ) {
					this.setColorToButton( $( $notFilledButton[ 0 ] ).toggleClass( 'active', true ), hex );
				} else {
					this.setColorToButton( $( this.ui.colorButtons[ 0 ] ).toggleClass( 'active', true ), hex );
				}
			}
		}

		this.updateSendStatus();

		this._hasDragged = false;
	},
	onShow: function() {

		var gradientImg = PreloadView.getAsset( 'gradient' );
		var canvas = this.$el.find( 'canvas' ).get( 0 );

		canvas.width = gradientImg.width;
		canvas.height = gradientImg.height;
		canvas.getContext( '2d' ).drawImage( gradientImg, 0, 0 );
	}
} );

module.exports = keyView;