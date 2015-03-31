var gulp            = require('gulp');
var paths           = require("./paths");
var plugins         = require("./plugins");

/* WATCH */
gulp.task('watch', ['browserify_watch'], function() {

	var vendorPaths = [ paths.js.lib + '**/*', paths.js.vendor_config ];

	plugins.livereload.listen();

	gulp.watch( paths.build.bowerJSON, ['bower_update'] );
	gulp.watch( vendorPaths, ['vendor_scripts'] );
	gulp.watch( paths.styles.sass + '**/*', ['sass'] );
	gulp.watch( paths.assets + "icons/**/*", ['iconfont'] );
	gulp.watch( paths.public.templates + "**.html", ['template'] );
	gulp.watch( paths.js.templates + "**.html", ['browserify_nowatch'] );
});