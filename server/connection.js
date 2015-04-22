var calendar = require( './calendar.js' );
var _ = require( 'underscore' );
var hue = require( "./hue/index.js" );
var pipe = require( "./shared/pipe.js" );

var Connection = function( socket ) {

    this.socket = socket;
    this.init();
}

Connection.prototype = {
    init: function() {

        var socket = this.socket;

        //initial call makes a request for data and sets ID
        socket.on( 'requestData', function( data, callback ) {

            callback( calendar.request() );
        } );

        socket.on( 'authenticate', function() {

            calendar.authenticate( function( url ) {

                socket.emit( 'authentication_url', url );
            } );
        } );

        socket.on( 'got_code', function( data, callback ) {

            calendar.useCode( data );
            callback();
        } );

        socket.on( 'custom_pattern', function( data, callback ) {


            var roomKeys = data.roomKeys;
            var pattern = data.pattern;
            _.each( roomKeys, function( key ) {
                console.log( "CUSTOM", "custom_pattern:" + key );
                pipe.trigger( "custom_pattern:" + key, {
                    pattern: pattern
                } );
            } );
        } );

        calendar.eventEmitter.on( 'updateData', function( data ) {

            socket.emit( "updateData", {
                key: data.key,
                data: data.data
            } );
        } );
    }
}

module.exports = Connection;