var mySocket = null;
var connected = false;

var pipe = require("pipe");

function init(){

	pipe.on("param:socket", connect)
}

function connect(){
	
	mySocket = io.connect('//localhost:3000');
	mySocket.on('connect', function(){
		connected = true;
	});	
}

function update( data ){

	if(connected){console.log(data)
		mySocket.emit( 'update_data', data );	
	}
}

init();

module.exports = {
	init : init,
	update : update,
	connected : connected
}