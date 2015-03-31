var gulp            = require('gulp');
var paths           = require("./paths");
var plugins         = require("./plugins");

/* SASS */
gulp.task('sass', function() {

   return plugins.sass( paths.styles.sass ) 
   		.on('error', function(err){

			gulp.src( paths.noop )
				.pipe( plugins.notify("your CSS broke idiot!" + err));
	    })
	    .pipe(gulp.dest( paths.styles.css ))
	    .pipe(plugins.livereload());
});

