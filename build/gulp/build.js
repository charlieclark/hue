var gulp            = require('gulp');
var paths           = require("./paths");
var plugins         = require("./plugins");

/* BUILD */
gulp.task('build', function(){

	var sequence;

	if( global._release ){
		sequence = [
			'copy-release',
			'bower_update',
			[ 'vendor_scripts', 'user_scripts_min', 'sass' ],
			'template'
		];
	} else {
		sequence = [
			'bower_update',
			[ 'vendor_scripts', 'user_scripts_min', 'sass' ],
			'template'
		];
	}

	plugins.runSequence.apply( null, sequence );
});  

gulp.task('copy-release', function(){
	gulp.src( paths.publicPath + "**/*" )
		.pipe( gulp.dest( paths.releasePath ) )
});

gulp.task('release', function(){

	global.isRelease = true;

	plugins.runSequence(
		'build',
		'copy-release'
	);
});  


