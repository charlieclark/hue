var CalendarItem 	= require("views/calendarItem");
var CalendarItemModel 	= require("models/calendarItemModel");
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
			collection : this.model.get("eventCollection")
		});

		this.listenTo( this.model, "change:roomData", this.updateEvents );
		this.updateEvents();
	},
	onShow : function(){

		this.getRegion( "eventList" ).show( this.collectionView );
		
	},
	onClose : function(){

		AppRouter.navigate("/", {trigger: true});
	},
	updateEvents : function(){

		var roomData = this.model.get("roomData");
		var newModels = [];

		_.each( roomData.items, function( item ){

			var m = new CalendarItemModel( item );
			newModels.push( m );
		}, this);

		this.collectionView.collection.reset( newModels );

		this.model.set("roomData", roomData);
	}
});

module.exports = CalendarSingle;