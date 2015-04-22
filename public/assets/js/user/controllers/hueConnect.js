var mySocket = null;
var isConnected = false;
var isMaster = false;
var myID = null;

var pipe = require( "pipe" );
var helpers = require( "helpers" );
var roomData = require( "roomData" );

function init() {

	connect( function() {

		var code = null;

		//DATA UPDATE LISTENER
		mySocket.on( 'updateData', function( data ) {

			console.log( "DATA ENTRY", data );
			events.trigger( "eventsLoaded", data );
		} );

		//REQUEST DATA & PASS UNIQUE ID
		mySocket.emit( 'requestData', {}, function( rooms, globalData ) {

			_.each( rooms, function( data, key ) {
				events.trigger( "eventsLoaded", {
					data: data,
					key: key
				} );
			} )
		} );

		//CONDITIONAL STUFF
		if ( helpers.getParameterByName( 'authenticate' ) ) {

			mySocket.on( 'authentication_url', function( data ) {
				mySocket.disconnect();
				window.location = data;
			} );
			mySocket.emit( 'authenticate', {
				roomData: roomData
			} );

		} else if ( code = helpers.getParameterByName( 'code' ) ) {

			mySocket.emit( 'got_code', code, function() {
				//clear url
				history.replaceState( {}, '', '/' );
				window.location.reload();
			} );

		}
	} );
}

function connect( callback ) {

	// var socket = 'http://charliepi.local:3000';  
	var socket = 'http://localhost:3000';

	mySocket = io.connect( socket );

	mySocket.on( 'connect', function() {

		isConnected = true;
		if ( callback ) callback();
	} );
}

function sendPattern( pattern, roomKeys ) {

	mySocket.emit( "custom_pattern", {
		pattern, roomKeys
	} );
}

var events = _.extend( {}, Backbone.Events );

init();

window.hueConnect = module.exports = {
	init: init,
	connected: isConnected,
	events: events,
	sendPattern: sendPattern
}