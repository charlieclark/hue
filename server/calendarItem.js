var _ = require('underscore');
var CalendarModel = require('./shared/models/calendarModel');
var CalendarCollection = require('./shared/collections/calendarCollection');
var LightPatternController = require('./shared/controllers/lightPatternController');

var hue = require("./hue/index.js");

//replicating calendar model here
var CalendarItem = function(key, data, calendar, oauth2Client, eventEmitter){

	this._key = key;
	this._data = data;
	this._calendar = calendar;
	this._oauth2Client = oauth2Client;
	this._eventEmitter = eventEmitter;
	this.calendarStore = {};
}

CalendarItem.prototype = {

	pull : function( callback ){

		console.log("PULL");
		
	    var from = new Date();
	    var to = new Date();
	    to.setDate( to.getDate() + 1 );

	    this._calendar.events.list({ 
            userId: 'me', 
            auth: this._oauth2Client,
            calendarId : this._data.calendarId,
            timeMin : from.toISOString(),
            timeMax : to.toISOString(),
            singleEvents : true
        }, _.bind( function(err, response) {

            this.eventsLoaded({
            	key : this._key, 
            	data : response, 
            	callback : callback 
            });

        }, this) );
	},

	get : function( key ){

		return this.calendarStore[ key ].get("roomData");
	},

	//this logic is copied from front-end
	eventsLoaded : function( data ){

		var key = data.key;
		var myCalendarModel = this.calendarStore[ key ];
		var roomData = data.data;
		var updated = roomData.updated;

		if(  !myCalendarModel ){

			var myCalendarModel = new CalendarModel({
				key : key,
				eventCollection : new CalendarCollection()
			});

			myCalendarModel.on("change:hsl", function(model, hsl){
				hue.updateLights([{
					id : model.get("key"),
					data : {
						hsl : hsl,
						duration : model.get("fade")
					}
				}]);
			});

			myCalendarModel.on( "change:updated", function( model ){ 
				
				data.callback( key, model.get("roomData") );
			});
			
			this.calendarStore[ key ] = myCalendarModel;
			var lightPatternController = new LightPatternController( myCalendarModel );

			myCalendarModel.set("lightPatternController", lightPatternController);
		} 



		myCalendarModel.set("roomData", roomData);
		myCalendarModel.set("updated", updated);
	}
}

module.exports = CalendarItem;

