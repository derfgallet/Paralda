/*
 * Copyright (C) 2017 Jeremy Joly, All Rights Reserved.
 */

module.exports = {
    run: run,
    stop: stop  
};

var express=require('express');
var fs = require('fs');


var config = {};

function run(){

    var app = express();
    var server = require('http').Server(app);
    var compression = require('compression');
    var io = require('./websocket').start(server);


    config = JSON.parse(fs.readFileSync('config.json', 'utf8'));

    app.use(compression());
    app.use(express.static('html'));
    server.listen(config.server.port);
    console.log('\tWeb Server started... Listenning on port %d',config.server.port);
    console.log('\tWaiting for incoming WebSocket ...');
};

function stop(){


};

