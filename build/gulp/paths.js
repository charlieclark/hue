var buildPath 	= global._root + "/";
var rootPath	= buildPath.replace("build/", "");
var publicPath 	= rootPath + "public/";
var releasePath = rootPath + "release/";
var destPath 	= global._release ? releasePath : publicPath;
var assetPath 	= destPath + "assets/";
var gulpPath 	= buildPath + "gulp/";


var paths = {

	buildPath 			: buildPath,
	rootPath			: rootPath,
	publicPath			: publicPath,
	releasePath			: releasePath,
	destPath			: destPath,
	assetPath 			: assetPath,
	gulpPath 			: gulpPath,

	build : {
		bower 			: buildPath + 'bower_components/',
		bowerJSON 		: buildPath + 'bower.json',
		templates	 	: buildPath + "templates/",
		nodeModules		: buildPath + "node_modules/"
	},

	public : {	
		templates 		: destPath + 'templates/',
		index 			: destPath + 'index.html'
	},

	js : {
		base 			: assetPath + "js/",
		user 			: assetPath + "js/user/",
		vendor_config 	: assetPath + "js/vendor_config.js",
		lib 			: assetPath + "js/lib/",
		bower 			: assetPath + "js/lib/bower/",
		compiled 		: assetPath + "js/compiled/",
		min 			: assetPath + "js/min/",
		templates		: assetPath + "js/templates/"
	},

	styles : {
		icons 			: assetPath + "icons/*.svg",
		sass 			: assetPath + "styles/sass/",
		fonts 			: assetPath + "styles/fonts/",
		css 			: assetPath + "styles/css/"		
	},

	//misc
	noop : gulpPath + "other/noop.js"
};


module.exports = paths;