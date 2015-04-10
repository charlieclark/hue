var gulp            = require('gulp');
var paths           = require("./paths");
var plugins         = require("./plugins");
 
gulp.task('deploy_pi', function () {
    return gulp.src( paths.rootPath + "server/**/*" )
        .pipe(plugins.sftp({
            host: 'charliepi.local',
            user: 'pi',
            pass: 'raspberry',
            remotePath : '/home/pi/charlie/hue'
        }));
});