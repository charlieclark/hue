var state = require( "state" );
var pipe = require( "pipe" );

var calendarLoad = require( "controllers/calendarLoad" );
var CalendarSingle = require( "views/calendarSingle" );

var CalendarModel = require( "models/calendarModel" );
var CalendarItemModel = require( "models/calendarItemModel" );
var CalendarCollection = require( "collections/calendarCollection" );

var PreloadView = require( "views/preloadView" );
var SplashView = require( "views/splashView" );
var KeyView = require( "views/keyView" );
var SequencerView = require( "views/sequencerView" );

var hueConnect = require( "controllers/hueConnect" );
var LightPattern = require( "controllers/lightPattern" );
var LightPatternController = require( "controllers/lightPatternController" );

var firstAnim = true;

var pageConfig = {
	room: {
		animIn: "fromBottom",
		animOut: "fromTop"
	},
	key: {
		animIn: "fromRight",
		animOut: "fromLeft"
	},
	sequencer: {
		animIn: "fromLeft",
		animOut: "fromRight"
	}
}

var CalendarView = Marionette.LayoutView.extend( {
	template: _.template( require( "templates/calendarWrapper.html" ) ),
	regions: {
		room: "#room-single",
		home: "#splash-page",
		key: "#key-page",
		sequencer: "#sequencer-page",
		preloader: "#preloader"
	},
	ui: {
		commandButtons: "[data-cmd]",
		pages: ".page"
	},
	stateEvents: {
		"change:page": function( model, key ) {
			switch ( key ) {
				case "home":
				case "key":
				case "sequencer":
					if ( this._hasAllComplete ) {
						this.animatePage( key );
					}
					break;
				case "room":
					if ( this._hasAllComplete ) {
						this.showRoom( state.get( "section" ) );
					}
					break;
			}
		}
	},
	commands: {
		"select:page": function( page ) {
			state.navigate( page );
		}
	},
	events: {
		"click @ui.commandButtons": "commandButtonClick"
	},
	initialize: function() {

		this.calendarStore = {};

		this._hasAllComplete = false;

		this._$dfdRoom1Connect = $.Deferred();
		this._$dfdRoom2Connect = $.Deferred();
		this._$dfdRoom3Connect = $.Deferred();
		this._$dfdRoom5Connect = $.Deferred();
		this._$dfdPreloadComplete = $.Deferred();

		$.when(
			this._$dfdRoom1Connect,
			this._$dfdRoom2Connect,
			this._$dfdRoom3Connect,
			this._$dfdRoom5Connect,
			this._$dfdPreloadComplete ).done( $.proxy( this.onAllComplete, this ) );

		Marionette.bindEntityEvents( this, pipe, this.commands );
		Marionette.bindEntityEvents( this, state, this.stateEvents );

		this.listenTo( PreloadView, 'complete', $.proxy( function() {
			this._$dfdPreloadComplete.resolve();
		}, this ) );

		this.listenTo( hueConnect.events, "eventsLoaded", this.eventsLoaded );
	},
	onAllComplete: function( room1Data, room2Data, room3Data, room5Data ) {

		this._hasAllComplete = true;

		this._splashView = new SplashView( {
			model: new Backbone.Model( {
				rooms: {},
				roomsData: {}
			} )
		} );
		this.getRegion( "home" ).show( this._splashView );

		this.eventsLoaded( room1Data );
		this.eventsLoaded( room2Data );
		this.eventsLoaded( room3Data );
		this.eventsLoaded( room5Data );

		this.ui.pages.hide();

		var $showPage;

		if ( state.get( "page" ) === "room" ) {
			$showPage = this.showRoom( state.get( "section" ) );
		} else {
			$showPage = this.animatePage( state.get( "page" ), true );
		}

		TweenMax.fromTo( $showPage.get( 0 ), .8, {
			scale: .45,
			opacity: 0
		}, {
			delay: .25,
			scale: 1,
			opacity: 1,
			ease: Cubic.easeInOut,
			clearProps: 'scale, opacity'
		} );
	},
	onShow: function() {
		this.showChildView( "preloader", PreloadView );
	},
	showRoom: function( key ) {

		var model = this.calendarStore[ key ];

		if ( !model ) {

			this.queuedKey = key;

		} else {

			var view = new CalendarSingle( {
				model: model
			} );

			var region = this.getRegion( "room" ).show( view );

			return this.animatePage( "room" );
		}
	},

	animatePage: function( page, instant ) {

		if ( !this.getRegion( page ).hasView() ) {

			switch ( page ) {
				case 'sequencer':
					var view = new SequencerView( {
						model: new Backbone.Model( {} )
					} );
					break;

				case 'key':
					var view = new KeyView( {
						model: new Backbone.Model( {} )
					} );
					break;
			}

			var region = this.getRegion( page ).show( view );
		};

		$showPage = this.getRegion( page ).$el;
		$hidePage = this.lastPage ? this.getRegion( this.lastPage ).$el : null;
		var showPageView = this.getRegion( page ).currentView;
		var hidePageView = this.lastPage ? this.getRegion( this.lastPage ).currentView : null;

		var animTime = ( instant || firstAnim ) ? 0 : 0.4;
		firstAnim = false;

		var tweenBase = {
			force3D: true,
			ease: Cubic.easeInOut,
			x: 0,
			y: 0
		};
		var fromPos = {};
		var toPos = {};

		var isBack = page == "home";
		var animUse = isBack ? this.lastPage : page;
		this.lastPage = page;
		var direction = pageConfig[ animUse ] ? pageConfig[ animUse ][ isBack ? 'animOut' : 'animIn' ] : 'fromLeft';

		switch ( direction ) {
			case "fromRight":
				fromPos.x = Common.ww;
				toPos.x = -Common.ww;
				break;
			case "fromLeft":
				fromPos.x = -Common.ww;
				toPos.x = Common.ww;
				break;
			case "fromBottom":
				fromPos.y = Common.wh;
				toPos.y = -Common.wh;
				break;
			case "fromTop":
				fromPos.y = -Common.wh;
				toPos.y = Common.wh;
				break;
		}

		if ( $hidePage ) {
			TweenMax.to( $hidePage, animTime, _.extend( {
				onComplete: function() {
					$hidePage.hide();
					if ( hidePageView.deactivate ) {
						hidePageView.deactivate();
					};
				}
			}, tweenBase, toPos ) );

		}

		$showPage.show();
		TweenMax.set( $showPage, _.extend( {}, tweenBase, fromPos ) );
		TweenMax.to( $showPage, animTime, _.extend( {
			onComplete: function() {
				if ( showPageView.activate ) {
					showPageView.activate();
				}
			}
		}, tweenBase ) );

		return $showPage;
	},

	checkQueue: function() {

		if ( this.queuedKey && state.get( "page" ) == "room" ) {
			this.showRoom( this.queuedKey );
		}
	},
	eventsLoaded: function( data ) {

		switch ( data.key ) {
			case "1":
				this._$dfdRoom1Connect.resolve( data );
				break;

			case "2":
				this._$dfdRoom2Connect.resolve( data );
				break;

			case "3":
				this._$dfdRoom3Connect.resolve( data );
				break;

			case "5":
				this._$dfdRoom5Connect.resolve( data );
				break;
		}

		if ( !this._hasAllComplete ) {
			return;
		}

		var key = data.key;
		var myCalendarModel = this.calendarStore[ key ];

		if ( !myCalendarModel ) {

			myCalendarModel = new CalendarModel( {
				key: key,
				eventCollection: new CalendarCollection( {
					key: key
				} )
			} );

			this.calendarStore[ key ] = myCalendarModel;

			var lightPatternController = new LightPatternController( myCalendarModel );
			myCalendarModel.set( "lightPatternController", lightPatternController );

			this._splashView.addRoom( myCalendarModel );
		}

		var roomData = data.data;
		var updated = roomData.updated;

		myCalendarModel.get( "eventCollection" ).setStartEnd( roomData.dayStart, roomData.dayEnd );

		myCalendarModel.set( "roomData", roomData );
		myCalendarModel.set( "updated", updated );

		this.checkQueue();
	},
	commandButtonClick: function( e ) {

		var $el = $( e.currentTarget );

		var cmd = $el.data( "cmd" );
		var arg = $el.data( "arg" );

		pipe.trigger( cmd, arg );
	}
} );

module.exports = CalendarView;