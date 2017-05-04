/*
 * Copyright (C) 2017 Jeremy Joly, All Rights Reserved.
 */

module.exports = {
    start: start,
    stop: stop
};


var express = require('express');
var https = require('https');
var http = require('http').Server(express);

var auth = require('basic-auth');
var compression = require('compression');
var fs = require('fs');

var app = require('./app');

var _server = null;


function start(callback){

    process.stdout.write('\tInitializing... ');
    
    _server = express();

    var config = app.getConfig().server;
    
    
    // HTTP authentification if enabled
    if(config.auth.username !== ''){
        
        _server.use(function(req, res, next) {
            
            var user = auth(req);

            if (user === undefined || user['name'] !== config.auth.username || 
                    user['pass'] !== config.auth.password) {
                res.statusCode = 401;
                res.setHeader('WWW-Authenticate', 'Basic realm="Nemesis"');
                res.end('Unauthorized');
            } else {
                next();
            }
            
        });
        
    }

    // Enable compression
    _server.use(compression());
    
    _server.use(express.static('html'));


    // ################## Routing ##################
    
    // UI
    _server.post('/monaction', _monaction);
    
    console.log('OK');
    
    
    process.stdout.write('\tListening... ');
    // Activate Websocket server
    var io = require('./websocket').start(http);

    if(config.https.enabled){
        https.createServer({
            key: fs.readFileSync(config.https.key),
            cert: fs.readFileSync(config.https.cert)
        }).listen(config.port, function (err) {
            console.log('OK');
            callback(err);
        });
    }else{
        _server.listen(config.port, function (err) {
            console.log('OK');
            callback(err);
        });
    }


};



function stop(callback){
    _server.close();
    callback();
};







function _monaction(req, res){
    
    // Get parameter
    //req.body.monparametre
    
    // Envoyer la r�ponse
    // res.json({status: err ? 'error' : 'success'});
    
};

