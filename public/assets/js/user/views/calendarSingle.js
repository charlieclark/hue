var CalendarItem 	= require("views/calendarItem");
var CalendarModel 	= require("models/calendarModel");
var AppRouter 		= require( "controllers/appRouter" );

var CalendarSingle = Marionette.LayoutView.extend({
	template : _.template( require("templates/calendarSingle.html") ),
	regions : {
		eventList : "#event-list"
	},
	ui : {
		closeButton : "#close"
	},
	events : {
		'click @ui.closeButton' : "onClose"
	},
	initialize : function(){

		this.collectionView = new Marionette.CollectionView({
			childView : CalendarItem,
			collection : new Backbone.Collection()
		});

		this.listenTo( this.model, "change:roomData", this.updateEvents );
	},
	onShow : function(){

		this.getRegion( "eventList" ).show( this.collectionView );
		this.updateEvents();
	},
	onClose : function(){

		AppRouter.navigate("/", {trigger: true});
	},
	updateEvents : function(){

		var roomData = this.model.get("roomData")
		_.each( roomData.items, function( item ){

			var m = new CalendarModel( item );
			this.collectionView.collection.add( m );
		}, this);
	}
});

module.exports = CalendarSingle;