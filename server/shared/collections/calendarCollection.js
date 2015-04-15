var _ = require('underscore');
var Backbone = require('backbone'); 

var CalendarCollection = Backbone.Collection.extend({

	initialize : function(){

		this.listenTo( this, "reset", this.onReset );
	},

	comparator : function( a, b ){
		var aTime = a.get("start").raw;
		var bTime = b.get("start").raw;
		return aTime - bTime;
	},
	getCurrent : function(){

		return this.find(function( model ){

			return model.isActive();
		});
	},
	onReset : function(){

		console.log("RE")

		// var prevStart = 
		
		this.each(function( model ){

			var start = model.get("start").raw;
			var end = model.get("end").raw; 

			if(start.valueOf()){
				
			}
			
		})
	}
});

module.exports = CalendarCollection;