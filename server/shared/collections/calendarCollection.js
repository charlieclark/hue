var _ = require('underscore');
var Backbone = require('backbone'); 
var CalendarModel = require("./../models/calendarItemModel.js");

var CalendarCollection = Backbone.Collection.extend({

	model : CalendarModel,

	initialize : function( options ){

		this._key = options.key;
		this.listenTo( this, "reset", this.onReset );
	},

	comparator : function( a, b ){

		var aTime = a.get("start").raw;
		var bTime = b.get("start").raw;
		return aTime - bTime;
	},
	getCurrent : function(){

		return this.find(function( model ){

			return model.isNow(); 
		});
	},
	setStartEnd : function( start, end ){

		this.start = new Date( start );
		this.end = new Date( end );
	},
	onReset : function(){

		console.log("RE", this.start , this.end)

		var prevStart = this.start;
		var prevEnd = this.start;

		var dummyGen = [];
		
		_.each( this.models, function( model ){

			var start = model.get("start").raw;
			var end = model.get("end").raw; 

			if(!start.valueOf()) return;

			if( start != prevEnd ){
				dummyGen.push( this.dummy( prevEnd, start ) );
			}

			prevEnd = end

			// console.log(model.toJSON())

					
		}, this);

		if( prevEnd != this.end ){
			dummyGen.push( this.dummy( prevEnd, this.end ) );
		}

		this.dummyGen( dummyGen );
	},
	dummy : function( start, end ){ 

		console.log("gen");

		return {
			start : start,
			end : end,
			available : true,
			id : this._key+"_"+start.toString()
		}

		

		// this.add({
		// 	start : start,
		// 	end : end,
		// 	dummy : true
		// });
	},
	dummyGen : function( models ){
		console.log( models );
		this.add( models );
	}
});

module.exports = CalendarCollection;