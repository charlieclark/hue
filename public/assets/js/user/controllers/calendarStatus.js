var checkCalendarRate = 1000;

function CalendarStatus( collection, model ){

	this._collection = collection;
	this._model = model;
	this.init();
}

CalendarStatus.prototype = {
	init : function(){

		// this._collection.on("change:roomData", function( collection, data ){
			
		// 	this._roomData = data;
		// 	this.checkCalendar();
		// }, this );

		var _this = this;
		setInterval( function(){

			_this.checkCalendar();
		}, checkCalendarRate );
	},
	checkCalendar : function(){

		var current = this._collection.getCurrent();
		this._model.set("currentEvent", current);
		console.log(current);
		// console.log( this._collection.get("roomData") );
	}
}

module.exports = CalendarStatus;