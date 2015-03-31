//listening for load
window.handleClientLoad = function(){

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
		immediate: false
	}, handleAuthResult );
}

function handleAuthResult( authResult ){

	if(authResult){
		makeApiCall();
	}
}

function makeApiCall() {
  gapi.client.load('calendar', 'v3', function() {

    var request = gapi.client.calendar.events.list({
      'calendarId': calId
    });

   request.then(function(response) {
      	console.log(response.result);
    }, function(reason) {
      	console.log('Error: ' + reason.result.error.message);
    });

  });
}

module.exports = {};
