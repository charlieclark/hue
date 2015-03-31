var pipe = require("pipe");

//listening for load
window.handleClientLoad = function(){

	console.log("ASDASDSA")
	init();
}

var clientId = '433839723365-u7grldtvf8pabjkj4frcio3cv5hit8fm.apps.googleusercontent.com';
var apiKey = 'AIzaSyBsKdTplRXuEwgvPSH_gGF8OGsw35t15v0';
var scopes = 'https://www.googleapis.com/auth/calendar';
var calId = "b-reel.com_2d34343238393637302d363433@resource.calendar.google.com";



function init(){
	gapi.client.setApiKey(apiKey);
	checkAuth();
}

function checkAuth(){
	gapi.auth.authorize( {
		client_id: clientId, 
		scope: scopes, 
		immediate: true
	}, handleAuthResult );
}

function handleAuthResult( authResult ){

	if(authResult){
		makeApiCall();
	}
}

function makeApiCall() {
  gapi.client.load('calendar', 'v3', function() {

    var from = new Date().toISOString();

    console.log(from)

    var request = gapi.client.calendar.events.list({
      'calendarId': calId,
      timeMin : from
     });

   request.then(function(response) {
      // appendResults(response.result.longUrl);
      console.log(response.result);
      events.trigger( "eventsLoaded", response.result );
    }, function(reason) {
      console.log('Error: ' + reason.result.error.message);
    });
          
    // request.execute(function(resp) {
    //   for (var i = 0; i < resp.items.length; i++) {
    //     var li = document.createElement('li');
    //     li.appendChild(document.createTextNode(resp.items[i].summary));
    //     document.getElementById('events').appendChild(li);
    //   }
    // });
  });
}

var events = _.extend({

}, Backbone.Events);

module.exports = {

  events : events
};
