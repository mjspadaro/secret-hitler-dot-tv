const express = require('express');
const app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);


const LISTEN_PORT = process.env.PORT ? process.env.PORT : 3000;

const {Datastore} = require('@google-cloud/datastore');
const datastore = new Datastore();

// set writeDelayMS to zero for production! this is just to simulate database latency for debugging
const writeDelay = 0;

app.engine('html', require('ejs').renderFile);

app.get('/', function(req, res) {
	res.render(__dirname + '/public/player.html', {version: process.env.npm_package_version});
});

app.get('/host', function(req, res) {
	res.render(__dirname + '/public/host.html', {version: process.env.npm_package_version});
});

app.use('/images', express.static(__dirname + '/public/images'));
app.use('/js', express.static(__dirname + '/public/js'));
app.use('/css', express.static(__dirname + '/public/css'));
app.use('/fonts', express.static(__dirname + '/public/fonts'));


console.log('SECRETHITLER.TV SERVER -- RUNNING VERSION ' + process.env.npm_package_version);

http.listen(LISTEN_PORT, function() {
	console.log('listening on *:' + LISTEN_PORT);
});

class Game {

	constructor(code = '') {

		this.properties = ['code', 'state', 'created', 'updated', 'hostId'];		
		this.code = code;
		this.state = {version: 0, players: []};
		this.created = false;
		this.updated = false;
		this.hostId = false;
		
	}
		
	get entity() {
		let entity = { key: this.key, data: {}};
		for (let p of this.properties) {
			entity.data[p] = this[p];
		}
		return entity;
	}

	set entity(e) {
		this.key = e[datastore.KEY];
		for (let p of this.properties) {
			if (typeof e[p] != 'undefined') {
				this[p] = e[p];
			} else {
				this[p] = undefined;
			}
		}
	}

	async create (hostId = '') {
		this.created = new Date();
		this.hostId = hostId;
		let checkUnique = new Game();
		// create a new code and insert into the database
		do {
			// generate a 4 letter random game id
			checkUnique.code = shuffle('A B C D E F G H J K L M N P Q R S T V W X Y Z'.split(' ')).splice(0, 4).join('');
			console.log(`Checking code ${checkUnique.code} for uniqueness.`);
		} while (await checkUnique.read())
		this.code = checkUnique.code;
		this.key = datastore.key(['Game', this.code]);
		return this.update();
	}

	async read() {
		
		const query = datastore.createQuery('Game').filter('code', '=', this.code).limit(1);
		var [result] = await datastore.runQuery(query).catch((err) => console.log(`ERROR: Game.read ${this.code} ${err}`));
		
		if (result.length == 1) {
			this.entity = result[0];
			return result;
		} else {
			return false;
		}		
	}
	
	async update() {
		this.updated = new Date();
		const transaction = datastore.transaction();
		return transaction.run((err) => {
			// uncomment the line below to delay database writes randomly to simulate production - only for TESTING!!
			setTimeout( function () {
				transaction.save(this.entity);
				transaction.commit().catch((err) => `ERROR on Game.update: ${err}`);
			}.bind(this), Math.floor(Math.random() * writeDelay));	
		});		
	}
	
	async destroy() {
		await datastore.delete(this.key).catch((err) => console.log(`ERROR: Game.destroy ${this.code} ${err}`));
	}
	

}

class Client {

	constructor(id) {
		this.properties = ['id', 'socketId', 'gameCode', 'name', 'created', 'updated', 'lastConnected'];
	  this.socketId = id;
		this.id = id;
		this.created = false;
		this.updated = false;
		this.name = id;
		this.gameCode = '';
		this.game = new Game();
		this.lastConnected = new Date();
	}
	
	onConnect() {
		// lets the client know they've been identified and we are ready to talk to them
		console.log(`hello ${this.id}`);
		this.socket.emit('hello', this.id, this.onHelloCallback.bind(this)); 
	}
	
	// handles reconnections
	// client will respond to "hello" with their ID
	onHello (id = this.socketId, callback) {
		let client = this;
		let currentSocketId = client.socketId;
		console.log(`${client.name} connected.`);		
		client.id = id;
		client.read()
		.then( function (readResult) {			
			if (readResult) {
				// client already in the database
				if (client.socketId != currentSocketId) {
					// socket ID has changed- update the database and socket object
					client.socketId = currentSocketId;
					return client.update();
				}
				return Promise.resolve();
			} else {
				// new client
				client.id = currentSocketId;
				return client.create();
			}
		}).then( function() {
			client.game = new Game(client.gameCode);
			return client.game.read();
		}).then( function () {
			client.socket.on('gameState', client.onGameState.bind(client));
			client.socket.on('requestNewGame', client.onRequestNewGame.bind(client));
			client.socket.on('joinGame', client.onJoinGame.bind(client));
			client.socket.on('play', client.onPlay.bind(client));
			client.socket.on('disconnect', client.onDisconnect.bind(client));
		})
		.then( function () {
			callback(client.id, client.state);
		}).catch(function (err) { console.log(`Error initializaing client: ${err}`) });		
	}
	
	get socket() {
		return io.sockets.connected[this.socketId];
	}
	
	get isHost() {
		return this.game.hostId == this.id;
	}
	
	get entity() {
		let entity = { key: this.key, data: {}};
		for (let p of this.properties) {
			entity.data[p] = this[p];
		}
		return entity;
	}

	set entity(e) {
		this.key = e[datastore.KEY];
		for (let p of this.properties) {
			if (typeof e[p] != 'undefined') {
				this[p] = e[p];
			} else {
				this[p] = undefined;
			}
		}
	}
	
	get connected() {
		if (this.socketId) {
			return typeof io.sockets.connected[this.socketId] != 'undefined';
		} else {
			return false;
		}
	}
	
	sendState () {
		if (!this.connected) {
			console.log(`Unable to send state to ${this.gameCode}:${this.name}. Player is offline.`)
		} else if (!this.state) {
			console.log(`Unable to send state to ${this.gameCode}:${this.name}. State not found.`)
		}
		else {
			console.log(`sendState ${this.name} version=${this.state.version}`)
			this.socket.emit('playerState', this.state);
		} 
	}

	onRequestNewGame (callback) {
		console.log(`${this.name}: requestNewGame`);
		this.game.create(this.id)
		.then( function () {
			this.gameCode = this.game.code;
			return this.update();
		}.bind(this))
		.then( function() {
			callback(this.gameCode);
		}.bind(this));
	}
	
	onGameState (gameState, callback) {
		let game = this.game;		
		if (this.game.hostId != this.id) {
			console.log(`${this.name}: gameState Error: client is not a host.`);
			callback(false, "You are not recognized as the host of any current games");
		} else {
			console.log(`${this.name}: gameState version=${gameState.version}`);
			game.state = gameState;
			// update each of the players
			for (let p of gameState.players.filter((p) => !p.isAI)) {
				let player = new Client(p.id);
				player.read()
				.then( function (readResult) {
					if (readResult) {
						// make sure this player hasn't left the game
						if (player.gameCode == game.code) {
							player.state = Object.assign({}, p);
							player.sendState();										
						} else {
							return Promise.reject(`Player is not in this game.`)
						}
					} else {
						// player not found
						return Promise.reject(`No client found with id ${p.id}`);
					}
				})
				.catch((err) => console.log(`Error sending game state to player ${player.game.code}:${player.name}: ${err}`));
			}
			// update the game state in the database
			game.update()
			.then( function () {
				console.log(`${game.code}: gameState saved to database: version=${gameState.version}`);
				callback(true);
			}).catch((err) => console.log(`Error updating game state: ${err}`));
		}
	}
	
	onJoinGame (playerName, gameCode, callback) {

		gameCode = ('' + gameCode).toUpperCase();
		let client = this;
	
		console.log(`${client.name}: Join game ${gameCode} as ${playerName}`);
	
		// check if client is already in the game
		if (client.gameCode == gameCode) {
				client.read().then( function () {
				console.log(`${client.name} is already joined to game ${gameCode}. Returning state version=${client.state.version}`);
				callback(client.state);
				}).catch((err) => console.log(`onJoinGame: Error sending game state: ${err}`));
		} else {
			let game = new Game(gameCode);
			let host;
			game.read()
			.then( function (readResult) {
				if (!readResult) {
					return Promise.reject(`Game '${gameCode}' not found.`);
				} else {
					host = new Client(game.hostId);
					return host.read();
				}
			})
			.then( function () {
				console.log(`Notifying host ${host.id} that client id ${client.id} is joining.`);
				if (host.connected) {
					host.socket.emit('joinGame', client.id, playerName, function (playerState, err = '') {
						if (playerState) {
							client.game = game;
							client.gameCode = gameCode;
							client.name = playerName;
							client.state = playerState;
							callback(client.state);
							client.update();
						} else {
							callback(false, err);
						}
					});
				} else {
					return Promise.reject(`Unable to join game '${gameCode}': host is offline.`);
				}
			})
			.catch( function (err) {
				console.log(`${client.name}: client.onJoinGame() ERROR: ${err}`);
				callback(false, err);
			});
		}
	}

	onPlay (playerAction, data, callback) {
		let game = this.game;
		let client = this;
		let host = new Client(game.hostId);
		host.read()
		.then( function () {
			if (game && host.connected) {
				console.log(`${client.name}: play ${playerAction} ${data}`);
				host.socket.emit('play', client.id, playerAction, data,
					function(playerState) {
						callback(playerState);
					});
			} else {
				console.log(`${client.name}: play ${playerAction} ${data} Error: game not found or the host is not connected.`);
				callback(false, 'Error: no game found or host is disconnected.');
			}			
		}).catch((err) => console.log(`ERROR: Client.onPlay ${playerAction} ${client.name} ${err}`));
	}

	onDisconnect () {
		let client = this;
		console.log(`${client.name}: disconnect`);
	}
	
	async create () {
		this.created = new Date();
		this.updated = new Date();
		this.key = datastore.key('Client');
		await datastore.insert(this.entity).catch((err) => console.log(`ERROR: Client.create ${this.name} ${err}`));			
	}

	async read() {
		const query = datastore.createQuery('Client').filter('id', '=', this.id).limit(1);
		var [result] = await datastore.runQuery(query).catch((err) => console.log(`ERROR: Client.read ${this.name} ${err}`));
		if (result.length == 1) {
			this.entity = result[0];
			if (this.gameCode) {
				this.game.code = this.gameCode;
				await this.game.read();
				this.state = this.game.state.players.find(p => p.id == this.id);
			}
			return true;
		} else {
			return false;
		}
	}
	
	async update() {
		this.updated = new Date();
		await datastore.update(this.entity).catch((err) => console.log(`ERROR: Client.update ${this.name} ${err}`));
	}
	
	async destroy() {
		if (this.key) {
			await datastore.delete(this.key).catch((err) => console.log(`ERROR: Client.destroy ${this.name} ${err}`));
		} else {
			return false;
		}
	}
		
}

function dbError(err = '') {
	console.log(`Database error ${err}`);
}


io.on('connection', function(socket) {
	console.log(`${socket.id}: connected`);		
	let client = new Client(socket.id);
	socket.on('hello', client.onHello.bind(client));
});


function shuffle(array) {
	var currentIndex = array.length,
		temporaryValue, randomIndex;

	// While there remain elements to shuffle...
	while (0 !== currentIndex) {

		// Pick a remaining element...
		randomIndex = Math.floor(Math.random() * currentIndex);
		currentIndex -= 1;

		// And swap it with the current element.
		temporaryValue = array[currentIndex];
		array[currentIndex] = array[randomIndex];
		array[randomIndex] = temporaryValue;
	}

	return array;
}
