var google = require('googleapis');
var _ = require('underscore');
var OAuth2 = google.auth.OAuth2;
var calendar = google.calendar('v3');

var clientId = '433839723365-u7grldtvf8pabjkj4frcio3cv5hit8fm.apps.googleusercontent.com';
var clientSecret = 'k_sIUxKKdazplBVlqtDe4Act';
var apiKey = 'AIzaSyBsKdTplRXuEwgvPSH_gGF8OGsw35t15v0';
var callback = "http://dev.hue.com";
var scopes = [ 'https://www.googleapis.com/auth/calendar' ];

var oauth2Client = new OAuth2(clientId, clientSecret, callback);

var pullInterval = 1000 * 10;

var autenticated = false;
var roomData = null;

setInterval( pullRooms, pullInterval );

function authenticate( callback ) {
  // generate consent page url
  var url = oauth2Client.generateAuthUrl({
    access_type: 'offline', // will return a refresh token
    scope: scopes // can be a space-delimited string or an array of scopes
});

  callback( url );
}

function useCode( code ){
    oauth2Client.getToken(code, function(err, tokens) {

      if(!err) {
        oauth2Client.setCredentials(tokens);
        autenticated = true;
    }
  });
}

function pullRooms(){

    if(!autenticated || !roomData) return;

    var from = new Date();
    var to = new Date();
    to.setDate( to.getDate() + 1 );

    _.each( roomData, function( data, key ){

        calendar.events.list({ 
            userId: 'me', 
            auth: oauth2Client,
            calendarId : data.calendarId,
            timeMin : from.toISOString(),
            timeMax : to.toISOString(),
            singleEvents : true
        }, function(err, response) {

            roomLoaded( key, response );
        });
    });
}

function roomLoaded( key, data ){

    if( updateCallback ){
        updateCallback( key, data );
    }
}

function setRoomData(data ){

  roomData = data;
}

function setUpdateCallback( _callback ){

    updateCallback = _callback;
}

module.exports = {
  authenticate : authenticate,
  useCode : useCode,
  setRoomData : setRoomData,
  setUpdateCallback : setUpdateCallback,
  request : pullRooms
}