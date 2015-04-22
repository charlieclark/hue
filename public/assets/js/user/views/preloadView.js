var patterns = require( 'patternData' );
var Rainbow = require( "libs/rainbow" );

var PreloadView = Marionette.ItemView.extend( {
	template: _.template( require( "templates/preloader.html" ) ),
	ui: {
		'hue': '.hue',
		'bulb': '.bulb',
		'fixture': '.fixture'
	},
	initialize: function() {
		var assetManifest = [ {
			id: 'gradient',
			src: 'images/gradient.png'
		}, {
			id: 'icon-lightbulb',
			src: 'images/icon-lightbulb.png',
		}, {
			id: 'icon-room-1-black',
			src: 'images/icon-room-1-black.png',
		}, {
			id: 'icon-room-2-black',
			src: 'images/icon-room-2-black.png',
		}, {
			id: 'icon-room-3-black',
			src: 'images/icon-room-3-black.png',
		}, {
			id: 'icon-room-5-black',
			src: 'images/icon-room-5-black.png',
		}, {
			id: 'icon-room-1',
			src: 'images/icon-room-1.png',
		}, {
			id: 'icon-room-2',
			src: 'images/icon-room-2.png',
		}, {
			id: 'icon-room-3',
			src: 'images/icon-room-3.png',
		}, {
			id: 'icon-room-5',
			src: 'images/icon-room-5.png',
		}, {
			id: 'needle-fill',
			src: 'images/needle-fill.png',
		}, {
			id: 'needle-head',
			src: 'images/needle-head.png',
		}, {
			id: 'room-1',
			src: 'images/room-1.png',
		}, {
			id: 'room-2',
			src: 'images/room-2.png',
		}, {
			id: 'room-3',
			src: 'images/room-3.png',
		}, {
			id: 'room-5',
			src: 'images/room-5.png'
		} ];

		this._assets = {};

		var rainbow = new Rainbow();
		rainbow.setSpectrum.apply( rainbow, patterns[ 'occupied' ].colors );

		this._progressProp = {
			progress: 0,
			duration: 3,
			occupiedColor: rainbow,
			availableColor: patterns[ 'available' ].colors[ 0 ]
		};

		this._progressTweener = new TweenMax( this._progressProp, this._progressProp.duration, {
			progress: 0,
			paused: true,
			ease: Linear.easeNone,
			onUpdate: this.onAnimateProgress,
			onUpdateScope: this
		} );

		var assetsPath = '/assets/';
		this._loader = new createjs.LoadQueue( true, assetsPath );
		createjs.LoadQueue.loadTimeout = 100000;

		this._loader.addEventListener( "fileload", $.proxy( this.onFileLoad, this ) );
		this._loader.addEventListener( "error", $.proxy( this.onFileLoadError, this ) );
		this._loader.setMaxConnections( 5 );
		this._loader.loadManifest( assetManifest );
	},
	getAsset: function( id ) {
		return this._assets[ id ];
	},
	animateIn: function() {

		TweenMax.fromTo( this.ui.fixture.get( 0 ), 1, {
			y: 200,
			scale: 1.5
		}, {
			y: 0,
			scale: 1,
			ease: Quad.easeOut
		} );

		TweenMax.fromTo( this.ui.bulb.get( 0 ), 1, {
			scale: 2.5
		}, {
			scale: 1,
			ease: Quad.easeOut
		} );

		TweenMax.fromTo( this.ui.hue.get( 0 ), 2, {
			opacity: 0,
			y: 50
		}, {
			delay: .5,
			opacity: 1,
			y: 0,
			ease: Expo.easeOut
		} );
	},
	animateOut: function() {

		TweenMax.to( this.ui.hue.get( 0 ), .45, {
			delay: .75,
			opacity: 0,
			y: -50,
			ease: Cubic.easeInOut
		} );

		TweenMax.to( $( '#preloader' ).get( 0 ), .45, {
			delay: .75,
			opacity: 0,
			display: 'none',
			ease: Cubic.easeOut,
			onComplete: function() {
				this.trigger( 'complete' );
			},
			onCompleteScope: this
		} );
	},
	onShow: function() {
		this.animateIn();
	},
	onAnimateProgress: function() {
		var progress = this._progressProp.progress;

		if ( progress < 1 ) {

			var occupiedColor = this._progressProp.occupiedColor;

			TweenMax.set( this.ui.bulb.get( 0 ), {
				'color': occupiedColor.colourAt( progress * 100 )
			} );

		} else {

			var availableColor = this._progressProp.availableColor;

			TweenMax.to( this.ui.bulb.get( 0 ), .05, {
				yoyo: true,
				repeat: 1,
				scale: 1.1,
				transformOrigin: 'bottom center'
			} );

			TweenMax.to( this.ui.bulb.get( 0 ), .2, {
				ease: Expo.easeInOut,
				color: availableColor,
				onComplete: this.animateOut,
				onCompleteScope: this
			} );
		}
	},
	onFileLoad: function( e ) {
		this._assets[ e.item.id ] = e.result;

		this._progressTweener.updateTo( {
			progress: e.target.progress
		}, true ).play();
	},
	onFileLoadError: function( e ) {}
} );

module.exports = new PreloadView( {
	model: new Backbone.Model()
} );