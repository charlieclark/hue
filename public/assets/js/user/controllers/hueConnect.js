var mySocket = null;
var connected = false;
var masterID = false;

var pipe = require("pipe");
var helpers = require("helpers");
var roomData = require("roomData");

function init(){

	connect(function(){

		var code = null ;

		mySocket.on('updateData', function(data){
			events.trigger( "eventsLoaded", data );
		});

		if( helpers.getParameterByName('authenticate') ){

			mySocket.on('authentication_url', function( data ){
				window.location = data;
			});
			mySocket.emit('authenticate');

		} else if( helpers.getParameterByName('master') ){

			mySocket.emit('master_connect', {
				roomData : roomData
			}, function( id ){
				console.log("MY ID:", id)
				masterID = id;
			});

		} else if( code = helpers.getParameterByName('code') ){

			mySocket.emit('got_code', code);
			window.location = "?master=true";
		}

		mySocket.emit('requestData');
	});
}
function connect( callback ){

	// var socket = 'http://charliepi.local:3000';
	var socket = 'http://localhost:3000';
	
	mySocket = mySocket || io.connect( socket );

	if( connected ){
		callback();
	} else {
		mySocket.on('connect', function(){
			if(callback) callback();
			connected = true;
		});	
	}
}

function update( data ){

	console.log( data, connected, masterID );

	if(connected && masterID){
		
		mySocket.emit( 'update_data', { data : data, id : masterID } );	
	}
}

var events = _.extend({}, Backbone.Events);

init();

module.exports = {
	init : init,
	connected : connected,
	events : events,
	update : update
}