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
	this.init();
}

CalendarItem.prototype = {

	init : function(){

		//creating model
		var myCalendarModel = new CalendarModel({
			key : this._key,
			eventCollection : new CalendarCollection()
		});

		myCalendarModel.on( "change:updated", _.bind( function( model ){ 
			
			this._eventEmitter.emit("updateData", { key : this._key , data : model.get("roomData") });
		}, this) );
		
		var lightPatternController = new LightPatternController( myCalendarModel );

		myCalendarModel.set("lightPatternController", lightPatternController);

		this._model = myCalendarModel;

		setInterval( _.bind( this.updateLights, this ), 5000 );
	},

	updateLights : function(){

		hue.updateLights({
			id : this._key,
			data : {
				hsl : this._model.get("hsl"),
				duration : this._model.get("fade")
			}
		});
	},

	pull : function(){

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

            
            this.setData( response );
        }, this) );
	},

	get : function( key ){

		return this._model.get("roomData");
	},

	//this logic is copied from front-end
	setData : function( roomData ){

		if( !roomData ) return;

		var updated = roomData.updated;

		this._model.set("roomData", roomData);
		this._model.set("updated", updated);
	}
}

module.exports = CalendarItem;

