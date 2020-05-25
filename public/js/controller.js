class GameController {
	
	constructor (game, renderer) {
		
		this.game = game;
		this.renderer = renderer;
		this.socket = io();
		this.clientId = '';
		this.routes = [];
		this.views = this.renderer.views;
		
		this.socket.on('hello', this.onHello.bind(this));
		this.socket.on('joinGame', this.addPlayer.bind(this));
		this.socket.on('play', this.play.bind(this));
		this.socket.on('hostNewGame', this.hostNewGame.bind(this));		
		this.socket.on('sendState', this.sendState.bind(this));		
				
	}
	
	// called each time a game event is completed
	loop (e) {
		if (e) {
			this.route(e);
			// query the game for more events and pass them to another cycle of the loop
			// only loop if the game has started
			if (this.game.started) {
				this.loop(this.game.continue());
			}
		}		
	}
			
	// sends new game requests to server
	requestNewGame () {
		this.socket.emit('requestNewGame', this.hostNewGame.bind(this));
		// this stores our prior socket ID in case we need to reconnect
		this.oldSocketId = this.socket.id;
		this.loop({ eventName: 'requestNewGame', playerId: '', playerName: 'Host', data: '', state: this.game.getState() });		
	}
	
	onHello (id, callback) {
		console.log(`Server: hello ${id}`);
		if (!this.clientId) {
			this.clientId = id;
			console.log(`Controller: setting clientId = ${id}`);
		}
		callback(this.clientId, this.game.getState());
	}
	
	// updates game state on the server, which in turn updates players
	sendState (state = this.game.getState()) {
		console.log(`Host: gameState version=${state.version}`);
		this.socket.emit('gameState', state, function (success, msg = '') {
			if (!success) {
				this.onError("Error: Unable to update game state on server. " + msg);
			} });
	}
	
	// handles hostNewGame requests from the server
	hostNewGame (gameId, msg) {
		if (gameId) {
			this.game.id = gameId;
			this.loop({ eventName: 'hostNewGame', playerId: '', playerName: 'Server', data: gameId, state: this.game.getState() }); 
		} else {
			this.onError("Server did not provide a game ID. " + msg)
		}
	} 
	
	// passes the add player request to the game model
	addPlayer (playerId, playerName, callback) {
		let player = this.game.addPlayer(playerName, playerId);
		if (player) {
			callback(this.game.getState());
			this.loop({ eventName: 'joinGame', playerId: player.id, playerName: player.name, state: this.game.getState() });
		} else {
			callback(false, 'Unable to add player- game has already started or game is full.');
		}
		return player;
	}
	
	// sets up a Route object based on the event (e) and the route table 
	// pushes the Route object onto the Routes array and starts it if no others are waiting
	route (e) {
		// get routes that match this event
		console.log(`${e.playerName}: ${e.eventName} ${e.data}`);
		console.log(e);
		let eventRoutes = [];
		let table = ROUTE_TABLE.filter( r => typeof r.event == 'function' ? r.event(e) : e.eventName == r.event )
		.sort(
			 function (r1, r2) {
				 return (typeof r1.priority == 'undefined' ? DEFAULT_ROUTE.priority : r1.priority) - (typeof r2.priority == 'undefined' ? DEFAULT_ROUTE.priority : r2.priority);
		});
						
		for (let t of table) {

			let views = this.views.filter( v => typeof t.view == 'function' ? t.view(v) : v.constructor.name == t.view );
			let synchronous = t.synchronous == 'undefined' ? DEFAULT_ROUTE.synchronous : t.synchronous;
			
			for (let v of views) {
				console.log(`Routing: ${e.eventName} -> ${v.constructor.name}.${t.method} data: ${e.data}`);
				let r = { view: v, method: t.method, data: e, synchronous: synchronous };			
				eventRoutes.push(r);
			}	
		}
		
		// if there are no routes, do not add anything to the queue, but go ahead and send a state update
		// if this Route currently has top priority, start it immediately
		
		if (eventRoutes.length == 0) {
			this.sendState(e.state);
		} else if (this.routes.push(eventRoutes) == 1) {
			this.startNextRoute();
		}
		
	}

	// call on completion of a route- note that asynchronous routes are marked as completed immediately
	// removes the top route (the one that last completed) and starts the next highest route
	// a buffer holds information about the route the previous route that completed
	
	startNextRoute (buffer = false) {
		if (this.routes.length > 0) {
			let eventRoutes = this.routes[0];
			if (eventRoutes.length > 0) {
				let r = eventRoutes[0];
				let callback = function () { this.startNextRoute(r); }.bind(this);
				eventRoutes.shift();
				try {
					this.renderer.render(r.view, r.method, r.data, callback, r.synchronous);
				} catch (err) {
					console.error(err);
					r.view.unload();
					callback();
				}
			} else {
				// all routes associated with this event are complete, send state update and remove
				// the event from the routes array and start the next route
				if (buffer) { this.sendState(buffer.data.state); }
				this.routes.shift();
				this.startNextRoute();
			}
		}
	}
	
	
	// passes requests to the game model
	// returns event and state on success, false on error
	play (playerId, playerAction, value, callback) {

		let success = false;
		let msg = '';
		let e = this.game.play(playerId, playerAction, value);

		success = e.eventName != 'error';
		callback(success, e.data);
		
		if (e) {
			 // route event to the proper views
			this.loop(e);
		}

		return true;
	}
	
	onError(msg = "ERROR: unspecified") {
		console.error(`Error: ${msg}`);
	}
	
	test (testName = '') {
		if (testName) {
			if (typeof TESTS[testName] == 'function') {
				console.log(`Testing: Starting test ${testName}`);
				let result = TESTS[testName](this);
				let e = { eventName: 'test', playerId: '', playerName: 'Host', data: result, state: this.game.getState() };
				if (result !== false) { this.loop(e); }
			}
			else {
				console.log(`Testing: ${testName} is not a valid`);
			}	
		}
	}
	
}
