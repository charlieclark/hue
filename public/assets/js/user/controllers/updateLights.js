var windowParent = null;

function init(){

	windowParent = window.parent;
}

function update( data ){

	var stringData = JSON.stringify( data );

	if( windowParent ){

		windowParent.postMessage( stringData, "*" );		
	}
}

var throttledUpdate = _.throttle( update, 1000, {leading: false} );

init();

module.exports = {
	init : init,
	update : throttledUpdate
}