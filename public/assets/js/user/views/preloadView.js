var PreloadView = Marionette.ItemView.extend( {
	template: false,
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

		var assetsPath = '/assets/';
		this._loader = new createjs.LoadQueue( true, assetsPath );
		createjs.LoadQueue.loadTimeout = 100000;

		this._loader.addEventListener( "fileload", $.proxy( this.onFileLoad, this ) );
		this._loader.addEventListener( "complete", $.proxy( this.onFileLoadComplete, this ) );
		this._loader.addEventListener( "error", $.proxy( this.onFileLoadError, this ) );
		this._loader.setMaxConnections( 5 );
		this._loader.loadManifest( assetManifest );
	},
	getAsset: function( id ) {
		return this._assets[ id ];
	},
	onFileLoad: function( e ) {
		this._assets[ e.item.id ] = e.result;
	},
	onFileLoadComplete: function( e ) {
		this.trigger( 'complete' );
	},
	onFileLoadError: function( e ) {}
} );

module.exports = new PreloadView( {
	model: new Backbone.Model()
} );