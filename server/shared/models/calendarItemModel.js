var _ = require('underscore');
var Backbone = require('backbone');

var CalendarItemModel = Backbone.Model.extend({
	defaults: {
		summary: "n/a",
		description: "n/a",
		start: "n/a",
		end: "n/a",
		organizer: "n/a",
		available : false
	},
	initialize: function() {

		this.convertDate("start");
		this.convertDate("end");
	},
	convertDate: function(key) {
		//convert datas
		var date = this.get(key);
		if (!date) return;

		if (!_.isDate(date)) {
			var dateString = date.dateTime;
			date = new Date(dateString);
		}

		this.set(key, {
			raw: date,
			twelveHour: this.getTwelveHour(date),
			twelveHourShortened: this.getTwelveHour(date, true),
			formatted: date.toString()
		});
	},
	getTwelveHour: function(date, shortened) {
		var hours = date.getHours();
		var minutes = date.getMinutes();
		var ampm = hours >= 12 ? 'pm' : 'am';
		hours = hours % 12;
		hours = hours ? hours : 12; // the hour '0' should be '12'
		minutes = minutes < 10 ? '0' + minutes : minutes;

		var strTime = hours + ':' + minutes + ' ' + ampm;

		if(shortened && !date.getMinutes()) {
			 strTime = hours + ' ' + ampm;
		}

		return strTime;
	},
	isActive: function() {

		return( !this.isAvailable() && this.isNow() );
	},
	isNow: function() {

		var start = this.get("start").raw;
		var end = this.get("end").raw;
		var now = new Date();

		return (now > start && now < end);
	},
	isPast: function() {

		var end = this.get("end").raw;
		var now = new Date();

		return (now > end );
	},
	isFuture: function() {

		var start = this.get("start").raw;
		var now = new Date();

		return (now < start);
	},
	isAvailable : function(){

		return this.get("available");
	},
	getPatternType: function() {

		var type = this.isActive() ? "occupied" : "available";
		return type;
	}
})

module.exports = CalendarItemModel;