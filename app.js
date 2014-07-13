/*jslint node: true, indent: 4 */

var express = require('express');
var path = require('path');
var favicon = require('static-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var routes = require('./routes/index');
var users = require('./routes/users');

var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.set('port', process.env.PORT || 4000);

app.use(favicon());
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);
app.use('/users', users);

/// catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

/// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function (err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});

var clients_dict = {};

// Let's start managing connections...
io.sockets.on('connection', function (socket) {
    function clients(channel) {
        return clients_dict[channel] || [];
    }
    io.sockets.clients = clients;

    // Handle 'create or join' messages
    socket.on('create or join', function (channel) {
        var numClients = io.sockets.clients(channel).length;
        console.log('numclients = ' + numClients);

        // First client joining...
        if (numClients === 0) {
            socket.join(channel);
            clients_dict[channel] = [1];
            socket.emit('created', channel);

        // Second client joining...
        } else if (numClients === 1) {
            clients_dict[channel] = [1, 2];
            // Inform initiator...
            io.sockets.in(channel).emit('remotePeerJoining', channel);

            // Let the new peer join channel
            socket.join(channel);
            socket.broadcast.to(channel).emit('broadcast: joined', 'S --> broadcast(): client ' + socket.id + ' joined channel ' + channel);

        // Max two clients
        } else {
            console.log("Channel full!");
            socket.emit('full', channel);
        }
    });

    // Handle 'Bye' messages
    socket.on('Bye', function (channel) {
        clients_dict[channel] = undefined;

        // Notify other peer
        socket.broadcast.to(channel).emit('Bye');

        // Close socket from server's side
        socket.disconnect();
    });

    // Handle 'Ack' messages
    socket.on('Ack', function () {
        console.log('Got an Ack!');

        // Close socket from server's side
        socket.disconnect();
    });

    // Utility function used for remote logging
    function log() {
        var array = [">>> "];
        for (var i = 0; i < arguments.length; i++) {
            array.push(arguments[i]);
        }
        socket.emit('log', array);
    }

    // Handle 'message' messages
    socket.on('message', function (message) {
        log('S --> Got message: ', message);
        socket.broadcast.to(message.channel).emit('message', message.message);
    });

    // Handle 'response' messages
    socket.on('response', function (response) {
        log('S --> Got response: ', response);

        // Just forward message to the other peer
        socket.broadcast.to(response.channel).emit('response', response.message);
    });
});

module.exports = {app: app, server: server};