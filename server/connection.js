var calendar = require('./calendar.js');
var _ = require('underscore');
var hue = require("./hue/index.js");

var connections = {};
var masterConnections = [];
var baseID = 0;

var Connection = function( socket ){

    this.socket = socket;
    this.init();
}

Connection.prototype = {
    init : function(){

        var socket = this.socket;
        var connectionID = null;
        var isMaster = false;

        //initial call makes a request for data and sets ID
        socket.on('requestData', function( data, callback ){

            // connectionID = data.id;
            // connections[ data.id ] = {
            //     isMaster : false
            // }
            
            callback( calendar.request() );
        });

        socket.on('disconnect', function(){

            if( connections[ connectionID ] && connections[ connectionID ].isMaster ){
                connections[ connectionID ].isMaster = false;
                masterConnections = _.without( masterConnections, connectionID);
                console.log("close", masterConnections);
            }
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

        // socket.on('master_connect', function( data ){

        //     if( masterConnections.length > 0 ){
        //         console.log("someone is already connected");
        //     } else {    
        //         console.log("you are the master", connectionID);    
        //         calendar.setRoomData( data.roomData );
        //     }

        //     connections[ connectionID ].isMaster = true;
        //     masterConnections.push( connectionID );
        // });

        // socket.on('update_data', function( _data ){

        //     var data = _data.data;
        //     var id = _data.id;

        //     if( masterConnections.length && masterConnections[0] == id ){
        //         hue.updateLights( data );
        //     }
        // });
    }
}

module.exports = Connection;