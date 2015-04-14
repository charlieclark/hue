var gulp            = require('gulp');
var paths           = require("./paths");
var plugins         = require("./plugins");

var serverPath = paths.rootPath + "server/**/*";
var nodeModules = paths.rootPath + "server/node_modules/**";
var deploySrc = [ serverPath, '!' + nodeModules ];
 
gulp.task('deploy_pi', function () {
	
    return gulp.src( deploySrc )
        .pipe(plugins.sftp({
            host: 'charliepi.local',
            user: 'pi',
            pass: 'raspberry',
            remotePath : '/home/pi/charlie/hue'
        }));
});

gulp.task('deploy_pi_watch', function() {

	gulp.watch( deploySrc, ['deploy_pi'] );
});
