var io = require('socket.io')();

var calendar = require('./calendar.js');
var Connection = require("./connection.js");

//SOCKET CONNECTION
io.on('connection', function(socket){

    var myConnection = new Connection( socket );
    console.log("!");
});

calendar.init();

io.listen(3000);
