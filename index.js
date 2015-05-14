var express = require('express');
var app = express();

var Room = require('./model/room.js');
var User = require('./model/user.js');

var _ = require('underscore')._;
var server = require('http').createServer(app);
var io = require("socket.io").listen(server);

var port = process.env.OPENSHIFT_NODEJS_PORT || 3000;
var ip = process.env.OPENSHIFT_NODEJS_IP || "127.0.0.1";

server.listen(port, ip, function(){
	console.log('Server listening on ip ' + ip + ' port ' + port);
	console.log();
});

app.get('/', function(req, res){
	res.sendFile(__dirname + '/index.html');
});

var rooms = {};
var users = {};
var sockets = [];

io.on('connection', function(socket) {
	console.log('User connected sid ' + socket.id);

	socket.on('joinroom', function(data) {
		var uid = data['uid'], rid = data['rid'];

		var user = users[socket.id];
		if (user === undefined) {
			console.log('Creating new user ' + uid + ' sid ' + socket.id);
			users[socket.id] = new User(uid); // Add to users list
			sockets.push(socket); // Add to sockets list
			user = users[socket.id];
		} else {
			if (user.id != uid)
				console.log('WARNING: uid does not match on sid' + socket.id);
			if (user.inroom !== undefined) { // Leave existing room
				console.log('User ' + uid + ' left room ' + user.inroom);
				leaveRoom(uid, user.inroom, socket);
			}
		}

		var room = rooms[rid];
		if (room === undefined) {
			console.log('Creating new room ' + rid);
			room = new Room(rid);
			rooms[rid] = room;
			socket.room = room.id;
		}

		if (_.contains((room.members), uid)) {
			console.log('User ' + uid + ' already in room ' + rid);
		} else {
			room.members.push(uid); // Add user to cdj room
			socket.join(socket.room); // Add user to sio room
			user.inroom = rid;
			console.log('User ' + uid + ' joined room ' + rid);
		}

		console.log(room);

		socket.emit('joinroom', 'ok');
	});

	// Detailed updates for when user is looking at room data
	socket.on('update0', function(data) {
		var rid = data['rid']
		console.log('Broadcasting action:' + data['action'] + ' to room ' + rid);
		io.in(rid).emit('update0', data);
	});

	// Updates that always occur
	socket.on('update1', function(data) {
		var rid = data['rid']
		console.log('Broadcasting action:' + data['action'] + ' to room ' + rid);
		io.in(rid).emit('update1', data);
	});

	socket.on('leaveroom', function(data) {
		var uid = data['uid'], rid = data['rid'];
		leaveRoom(uid, rid, socket);

		console.log('User ' + uid + ' left room ' + rid);
		console.log(room);

		socket.emit('leaveroom', 'ok');
	});

	socket.on('disconnect', function() {
		delete users[socket.id];
	});
	
	socket.on('logall', function() {
		console.log('---- BEGIN LOGALL ----');

		console.log('Users:');
		console.log(users);
		console.log();

		console.log('Rooms:');
		console.log(rooms);
		console.log();

		console.log('Socket.io Rooms:');
		console.log(io.sockets.adapter.rooms);

		console.log('---- END LOGALL ----');
	});
});


// ---- Helpers ----
function leaveRoom(uid, rid, socket) {
	var room = rooms[rid];
	var uindex = room.members.indexOf(uid);

	room.members.splice(uindex, 1);
	socket.leave(rid);
}
