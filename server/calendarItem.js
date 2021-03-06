var _ = require( 'underscore' );
var CalendarModel = require( './shared/models/calendarModel' );
var CalendarCollection = require( './shared/collections/calendarCollection' );
var LightPatternController = require( './shared/controllers/lightPatternController' );

var hue = require( "./hue/index.js" );
var pipe = require( "./shared/pipe.js" );

//replicating calendar model here
var CalendarItem = function( key, data, calendar, oauth2Client, eventEmitter ) {

	this._key = key;
	this._data = data;
	this._calendar = calendar;
	this._oauth2Client = oauth2Client;
	this._eventEmitter = eventEmitter;
	this.calendarStore = {};
	this.init();
}

CalendarItem.prototype = {

	init: function() {

		//creating model
		var myCalendarModel = new CalendarModel( {
			key: this._key,
			eventCollection: new CalendarCollection( {
				key: this._key
			} )
		} );

		myCalendarModel.on( "change:updated", _.bind( function( model ) {

			this._eventEmitter.emit( "updateData", {
				key: this._key,
				data: model.get( "roomData" )
			} );
		}, this ) );

		var lightPatternController = new LightPatternController( myCalendarModel );

		myCalendarModel.set( "lightPatternController", lightPatternController );

		this._model = myCalendarModel;

		pipe.on( "rgb_change:" + this._key, _.bind( function( data ) {

			this.updateLights( {
				rgb: data.rgb,
				duration: data.fade
			} );
		}, this ) );


		// setInterval( _.bind( function() {

		// 	var data = {
		// 		rgb: this._model.get( "rgb" ),
		// 		duration: this._model.get( "fade" )
		// 	}

		// 	this.updateLights( data );
		// }, this ), 5000 );
	},

	updateLights: function( data ) {

		// if ( data.rgb == this.currentrgb ) return;

		// this.currentrgb = data.rgb;

		hue.updateLights( {
			id: this._key,
			data: data
		} );
	},

	pull: function() {

		var dayStart = new Date();
		dayStart.setHours( 8 );
		dayStart.setMinutes( 0 );
		dayStart.setSeconds( 0 );

		var dayEnd = new Date();
		dayEnd.setHours( dayStart.getHours() + 12 );

		this._calendar.events.list( {
			userId: 'me',
			auth: this._oauth2Client,
			calendarId: this._data.calendarId,
			timeMin: dayStart.toISOString(),
			timeMax: dayEnd.toISOString(),
			singleEvents: true
		}, _.bind( function( err, response ) {

			if ( !response ) return;

			response.dayStart = dayStart;
			response.dayEnd = dayEnd;
			this.setData( response );
		}, this ) );
	},

	get: function( key ) {

		return this._model.get( "roomData" );
	},

	//this logic is copied from front-end
	setData: function( roomData ) {

		if ( !roomData ) return;

		var updated = roomData.updated;

		this._model.set( "roomData", roomData );
		this._model.set( "updated", updated );
	}
}

module.exports = CalendarItem;