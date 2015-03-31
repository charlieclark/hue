var gulp            = require('gulp');
var paths           = require("./paths");
var plugins         = require("./plugins");
var config         	= require("./config");

gulp.task('template', function() {

	var exists = plugins.fs.existsSync( paths.public.templates );

	var sources = gulp.src( [
		paths.js.compiled + "vendor.js",
		paths.js.compiled + "bundle.js",
		paths.styles.css + "**/*" 
	], { read: false } );

	if( !exists ){
		gulp.src( paths.build.templates + "html/**.html" )
			.pipe( gulp.dest( paths.public.templates ) )
	}
	
	return gulp.src( paths.public.templates + "**.html" )
		.pipe( plugins.consolidate('underscore', config) )
		.pipe( gulp.dest( paths.destPath ) )
		.pipe( plugins.inject(sources, { relative: true }) )
		.pipe( plugins.if( !global._release, plugins.injectReload() ) )
		.pipe( plugins.injectStr.prepend( config.templateMessage ))
	    .pipe( gulp.dest( paths.destPath ) )
	    .pipe( plugins.livereload() );
});