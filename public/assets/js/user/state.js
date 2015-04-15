var state = new (Backbone.Model.extend({
	
	defaults : {
		page : "",
		section : "",
		path : ""
	},

	routes : {
		":page/:section/*path" : "onRoute",
		":page/:section" : "onRoute",
		":page" : "onRoute",
		"" : "onRoute",
	},

    onRoute: function (page, section, path) {

    	console.log("route to:", arguments);

    	if( !_.has( this.pages, page ) ){
    		this.navigate( "home", null, null, true )
    	} else {
    		this.set({
	            'page': page,
	            'section': section,
	            'path': path
	        });
    	}
    },

	navigate: function (page, section, path, reset) {

        var hash = this.getPath(page, section, path, reset);
        Backbone.history.navigate( hash, {trigger: true} );
    },

    getPath: function (page, section, path, reset) {

        // use current section if section is null or not specified
        page = _.isString( page ) ? page : ( reset ? null : this.get('page') );
        section = _.isString( section  ) ? section : ( reset ? null : this.get('section') );
        path = _.isString( path ) ? path : ( reset ? null : this.get('path') );

        var url = '/';
        if (page) {
            url += page;
            if (section) {
                url += '/' + section;
                if (path) {
                    url += '/' + path;
                }
            }
        }
        return url;
    },

	start : function( pages ){

		this.pages = pages;

		this.router = new (Marionette.AppRouter.extend({
			controller : this,
			appRoutes : this.routes
		}));

		Backbone.history.start({
			root : "/",
			pushState : false
		});
	}

}))();

module.exports = state;
