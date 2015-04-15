var _ = require('underscore');
var Backbone = require('backbone'); 

var CalendarCollection = Backbone.Collection.extend({

	comparator : function( a, b ){
		var aTime = a.get("start").raw;
		var bTime = b.get("start").raw;
		return aTime - bTime;
	},
	getCurrent : function(){

		return this.find(function( model ){

			return model.isActive();
		});
	}
});

module.exports = CalendarCollection;