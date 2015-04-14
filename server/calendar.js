var google = require('googleapis');
var _ = require('underscore');

var events = require('events');
var eventEmitter = new events.EventEmitter();
var CalendarItem = require('./calendarItem.js');

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

var myCalendars = {};

function init(){
  setInterval( pullRooms, pullInterval );
}

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

    console.log("pulling rooms");

    _.each( roomData, function( data, key ){

        var myCalendarItem = myCalendars[ key ] || new CalendarItem( key, data, calendar, oauth2Client, eventEmitter );
        myCalendars[ key ] = myCalendarItem;
        myCalendarItem.pull( function( key, roomData ){
          eventEmitter.emit("updateData", { key : key , data : roomData })
        });
    });
}

function request(){

    if(!autenticated || !roomData) return;

    var returnData = {};

    _.each( roomData, function( data, key ){

        var myCalendarItem = myCalendars[ key ];
        if( myCalendarItem ){
          returnData[ key ] = myCalendarItem.get( key );  
        }
    });

    return returnData;
}



function setRoomData(data ){

  roomData = data;
}

module.exports = {

  init :  init,
  authenticate : authenticate,
  useCode : useCode,
  setRoomData : setRoomData,
  request : request,
  eventEmitter : eventEmitter
}