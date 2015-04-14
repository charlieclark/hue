var mySocket = null;
var isConnected = false;
var isMaster = false;
var myID = null;

var pipe = require("pipe");
var helpers = require("helpers");
var roomData = require("roomData");

function init(){

	connect(function(){

		var code = null ;
		myID = getUniqueId();

		//DATA UPDATE LISTENER
		mySocket.on('updateData', function(data){

			events.trigger( "eventsLoaded", data );
		});

		//REQUEST DATA & PASS UNIQUE ID
		mySocket.emit('requestData',{
			id : myID
		});

		//CONDITIONAL STUFF
		if( helpers.getParameterByName('authenticate') ){

			mySocket.on('authentication_url', function( data ){
				mySocket.disconnect();
				window.location = data;
			});
			mySocket.emit('authenticate');

		} else if( helpers.getParameterByName('master') ){

			isMaster = true;
			mySocket.emit('master_connect', {
				roomData : roomData
			});

		} else if( code = helpers.getParameterByName('code') ){

			mySocket.emit('got_code', code, function(){
				mySocket.disconnect();
				window.location = "?master=true";
			});

		}		
	});
}

function getUniqueId(){

	var id = helpers.generateUUID();
	return id;
}	 

function connect( callback ){

	// var socket = 'http://charliepi.local:3000';  
	var socket = 'http://localhost:3000';  

	mySocket = io.connect( socket );   

	mySocket.on('connect', function(){

		isConnected = true;
		if(callback) callback();
	});	
}

function update( data ){

	console.log( data, isConnected );

	if(isConnected && isMaster){
		
		mySocket.emit( 'update_data', { data : data, id : myID } );	
	}
}

var events = _.extend({}, Backbone.Events);

init();

module.exports = {
	init : init,
	connected : isConnected,
	events : events,
	update : update
}