var windowParent = null;
var mySocket = null;

function init(){

	// windowParent = window.parent;
	console.log(io);
	mySocket = io.connect('//localhost:3000');
	// socket.on('connect', goog.bind(this.onConnected, this));
	
}

function update( data ){

	var stringData = JSON.stringify( data );

	console.log(data);

	mySocket.emit( 'update_data', data );

	// if( windowParent ){

	// 	windowParent.postMessage( stringData, "*" );		
	// }
}

var throttledUpdate = _.throttle( update, 500, {leading: false} );

init();

module.exports = {
	init : init,
	update : throttledUpdate
}