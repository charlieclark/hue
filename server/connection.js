var calendar = require('./calendar.js');
var _ = require('underscore');
var hue = require("./hue/index.js");

var Connection = function( socket ){

    this.socket = socket;
    this.init();
}

Connection.prototype = {
    init : function(){

        var socket = this.socket;

        //initial call makes a request for data and sets ID
        socket.on('requestData', function( data, callback ){

            callback( calendar.request() );
        });

        socket.on('authenticate', function(data){ 

            calendar.setRoomData( data.roomData );  

            calendar.authenticate(function( url ){

              socket.emit('authentication_url', url);
          });
        });

        socket.on('got_code', function(data, callback){

            calendar.useCode( data );
            callback();
        });

        calendar.eventEmitter.on('updateData', function( data ){

            socket.emit("updateData", { key : data.key, data : data.data });  
        });
    }
}

module.exports = Connection;