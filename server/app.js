var io = require('socket.io')();
var calendar = require('./calendar.js');
var hue = require("./hue/index.js");
var _ = require('underscore');

var connections = {};
var masterConnections = [];
var baseID = 0;

//SOCKET CONNECTION
io.on('connection', function(socket){

    var connectionID = null;
    var isMaster = false;

    //initial call makes a request for data and sets ID
    socket.on('requestData', function( data ){

        connectionID = data.id;
        connections[ data.id ] = {
            isMaster : false
        }
        calendar.request();
    });

    socket.on('disconnect', function(){

        if( connections[ connectionID ] && connections[ connectionID ].isMaster ){
            connections[ connectionID ].isMaster = false;
            masterConnections = _.without( masterConnections, connectionID);
            console.log("close", masterConnections);
        }
    });

    socket.on('authenticate', function(data){  	

    	calendar.authenticate(function( url ){

          socket.emit('authentication_url', url);
      });
    });

    socket.on('got_code', function(data, callback){

    	calendar.useCode( data );
        callback();
    });

    calendar.setUpdateCallback(function(key, data){

        socket.emit("updateData", { key : key, data : data });
    });

    socket.on('master_connect', function( data ){

        if( masterConnections.length > 0 ){
            console.log("someone is already connected");
        } else {    
            console.log("you are the master", connectionID);    
            calendar.setRoomData( data.roomData );
        }

        connections[ connectionID ].isMaster = true;
        masterConnections.push( connectionID );
    });

    socket.on('update_data', function( _data ){

        var data = _data.data;
        var id = _data.id;

        if( masterConnections.length && masterConnections[0] == id ){
            console.log( connectionID );
            hue.updateLights( data );
        }
    });

});

io.listen(3000);
