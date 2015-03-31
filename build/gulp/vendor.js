var gulp 			= require('gulp');
var paths 			= require("./paths");
var plugins 		= require("./plugins");

//bower install / update
gulp.task('bower_update', function(cb) {
	
	plugins.runSequence(
		'bower_build',
		'bower_clear',
		'bower_clean',
		cb
	);
});

//run bower
gulp.task('bower_build', function(cb) {

  	return plugins.bower()
});

//clean libs folder
gulp.task('bower_clear', function(cb) {
	
	plugins.del( paths.js.bower + "*.js", {
		force : true
	}, cb);
});  

//filter bower files and move
gulp.task('bower_clean', function(cb) {
	
	return gulp.src(plugins.mainBowerFiles())
		.pipe( plugins.filter('**/*.js') )
        .pipe( gulp.dest( paths.js.bower ) );
});

//load vendor scripts from vendor_config
gulp.task('vendor_scripts', function() {
	
	//deleting cached version of module - kinda hacky 
	delete require.cache[ paths.js.vendor_config ];

	console.log( paths.js.vendor_config )

	
	var vendorScripts 	= require( paths.js.vendor_config );
	var desktopScripts 	= plugins.underscore.map( vendorScripts['desktop'], function( s ){ return paths.js.base + s } );

	console.log(desktopScripts);
	
	return gulp.src( desktopScripts )
		.pipe( plugins.concat( 'vendor.js' ) )
		.pipe( gulp.dest(  paths.js.compiled ) )
		.pipe( plugins.uglify() )
		.pipe( plugins.rename('vendor.min.js') )
		.pipe( gulp.dest( paths.js.min ) )
		.pipe( plugins.livereload() )
});