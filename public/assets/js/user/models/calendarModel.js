var CalendarModel = Backbone.Model.extend({
	defaults : {
		summary : "n/a",
		description : "n/a",
		start : "n/a",
		end : "n/a",
	},
	initialize : function(){

		this.convertDate("start");
		this.convertDate("end");
	},
	convertDate : function( key ){

		//convert datas
		var dateString = this.get( key )
		if(!dateString) return;
		
		dateString = dateString.dateTime;
		var date = new Date( dateString );

		this.set( key, {
			raw : date,
			formatted : date.toString()
		});
	},
	parse : function( data ){
		console.log("ASDADASDASDASDASDSAasdsa")
		console.log(data);
		return data;
	}
})

module.exports = CalendarModel;