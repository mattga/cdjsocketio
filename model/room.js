function Room(id) {
	this.id = id;
	this.members = [];
	this.trackTime = 0;
	this.playing = false;
	this.songsToDelete = {};
};

module.exports = Room;
