var connect = require('connect');
var serveStatic = require('serve-static');
var hue = require("./hue/index.js");
var io = require('socket.io')();
var open = require('open');

var root = __dirname.replace("server", "");

var port = 9679;

//SOCKET CONNECTION
io.on('connection', function(socket){

  socket.on('update_data', function(data){

  	hue.updateLights( data );
  });
});

io.listen(3000);

connect().use(serveStatic( root )).listen( port );

open( 'http://localhost:' + port + "/#/?socket" );

