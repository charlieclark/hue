// var connect = require('connect');
// var serveStatic = require('serve-static');
// var hue = require("./hue/index.js");
var io = require('socket.io')();
var calendar = require('./calendar.js');
var hue = require("./hue/index.js");
var _ = require('underscore');
// var open = require('open');

var masterConnections = [];
var baseID = 0;

//SOCKET CONNECTION
io.on('connection', function(socket){

    var connectionID = baseID++;

    socket.on('disconnect', function(){

        masterConnections = _.without( masterConnections, connectionID);
        console.log("close", masterConnections);
    });

    socket.on('authenticate', function(data){  	

    	calendar.authenticate(function( url ){

          socket.emit('authentication_url', url);
      });
    });

    socket.on('got_code', function(data){

    	calendar.useCode( data );
    });

    calendar.setUpdateCallback(function(key, data){

        socket.emit("updateData", { key : key, data : data });
    });

    socket.on('requestData', function(){

        calendar.request();
    });

    socket.on('master_connect', function( data, callback ){

        

        if(masterConnections > 0){
            console.log("someone is already connected")
        } else {
            calendar.setRoomData( data.roomData );
        }

        masterConnections.push( connectionID );

        callback( connectionID );
    });

    socket.on('update_data', function( _data ){

        var data = _data.data;
        var id = _data.id;

        if( masterConnections.length && masterConnections[0] == id ){
          hue.updateLights( data );
        }
    });

});

io.listen(3000);
