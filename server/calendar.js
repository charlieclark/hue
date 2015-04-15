var google = require('googleapis');
var _ = require('underscore');
var roomData = require("./shared/roomData");
var jf = require('jsonfile');
var util = require('util');

var tokenFile = "./tokens.json";

var events = require('events');
var eventEmitter = new events.EventEmitter();
var CalendarItem = require('./calendarItem.js');

var OAuth2 = google.auth.OAuth2;
var calendar = google.calendar('v3');

var clientId = '433839723365-u7grldtvf8pabjkj4frcio3cv5hit8fm.apps.googleusercontent.com';
var clientSecret = 'k_sIUxKKdazplBVlqtDe4Act';
var apiKey = 'AIzaSyBsKdTplRXuEwgvPSH_gGF8OGsw35t15v0';
var callback = "http://dev.hue.com";
var scopes = ['https://www.googleapis.com/auth/calendar'];

var oauth2Client = new OAuth2(clientId, clientSecret, callback);

var pullInterval = 1000 * 10;

var autenticated = false;

var myCalendars = {};

function init() {
    loadTokens();
    setInterval(pullRooms, pullInterval);
}

function authenticate(callback) {
    // generate consent page url
    var url = oauth2Client.generateAuthUrl({
        access_type: 'offline', // will return a refresh token
        scope: scopes // can be a space-delimited string or an array of scopes
    });

    callback(url);
}

function useCode(code) {

    oauth2Client.getToken(code, function(err, tokens) {

        if (!err) {
            setTokens(tokens);
            saveTokens(tokens);
        }
    });
}

function setTokens(tokens) {

    oauth2Client.setCredentials(tokens);
    autenticated = true;
}

function loadTokens() {

    jf.readFile(tokenFile, function(err, obj) {
            
        if(obj){
            setTokens(obj);    
        }
    });
}

function saveTokens(tokens) {

    if( tokens.refresh_token ){
        jf.writeFile(tokenFile, tokens);
    }
}

function pullRooms() {

    if (!autenticated) return;

    _.each(roomData, function(data, key) {

        var myCalendarItem = myCalendars[key] || new CalendarItem(key, data, calendar, oauth2Client, eventEmitter);
        myCalendars[key] = myCalendarItem;
        myCalendarItem.pull();
    });
}

function request() {

    if (!autenticated) return;

    var returnData = {};

    _.each(roomData, function(data, key) {

        var myCalendarItem = myCalendars[key];
        if (myCalendarItem) {
            returnData[key] = myCalendarItem.get();
        }
    });

    return returnData;
}

module.exports = {
    init: init,
    authenticate: authenticate,
    useCode: useCode,
    request: request,
    eventEmitter: eventEmitter
}