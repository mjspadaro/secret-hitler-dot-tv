/**********************  GAME   ************************/

function SecretHitlerGame(gameId = '') {
	
	this.players = [];
	this.maxPlayers = 10;
	this.minPlayers = 5;
	this.isSpecialElection = false;
	this.presidentTracker = -1; // index of the last president (excluding special elections) - set to -1 to start with first player
	this.fascistScore = 0;
	this.liberalScore = 0;
	this.electionTracker = 0;
	this.agenda = []; // an array of policy cards drawn by the chancellor
	this.vetoAllowed = false;
	
	// rules- reset each time a new player joins (default to 5 player)
	this.fascistCount = 1;
	this.liberalCount = 3;
	this.hitlerKnowsFascists = true;
	
	// the name of the winning team
	this.winner = '';
	
	// set to true while the game is started and false when the game is over
	this.started = false;
	
	this.next = 'beforeNomination';
	
	this.policyDeck = new Deck();
	this.turnOrderDeck = new Deck();
	this.roleDeck = new Deck();
	this.botNames = new Deck([
		'Mr. Green',
		'Col. Mustard',
		'Mrs. Peacock',
		'Miss Scarlet',
		'Ms. White',
		'Mr. Boddy',
		'Prof. Plum',
		'Yvette',
		'Dr. Orchid',
		'Wadsworth',
	]);
	
	this.botNames.shuffle();
	
	
	// create a random 4-digit game id
	this.id = gameId ? gameId : Math.floor(Math.random() * 10000);
	
	// an array which points to executive action functions
	// changed by initRules to suit the current # of players
	this.executiveActions = [
		'beforeNomination', // fascist score = 0
		'beforeNomination',  // 1
		'beforeNomination',  // 2
		'beforeNomination',  // 3
		'beforeNomination',  // 4
		'beforeNomination',	 // 5
		'beforeNomination']; // 6
		
	// store a history of game events and state
	this.history = [];
	
	// sets which game and player properties will be returned in the game state
	this.gameStateProperties = [
		'maxPlayers',
		'minPlayers',
		'isSpecialElection',
		'presidentTracker',
		'fascistScore',
		'liberalScore',
		'electionTracker',
		'vetoAllowed',
		'fascistCount',
		'liberalCount',
		'hitlerKnowsFascists',
		'winner',
		'started',
		'next',
		'id',
	];

	this.playerStateProperties = [
		'name',
		'id',
		'isAI',
		'role',
		'party',
		'order',
		'isAlive',
		'isChancellor',
		'isTermLimited',
		'investigated',
		'isPresident',
		'isNominee',
		'ballot',
		'investigationTarget',
		'investigationResult',
		'policyPeek',
	];

	// define string literals
	this.t = {
		role: {
			liberal: 'liberal',
			fascist: 'fascist',
			hitler: 'hitler'
		},
		policy: {
			liberal: 'liberal',
			fascist: 'fascist',
			veto: 'veto' 
		},
		startGame: {
			tellRole: 'This is your secret role! Do not share this with anyone! ',
		},
		startNomination: {
			question: 'Nominate a player for chancellor',
			result: 'A chancellor has been nominated'
		},
		startElection: {
			question: 'Cast your vote',
			ja: 'Ja!', nein: 'Nein!',
		},
		tallyElection: {
			pass: 'The election passed',
			fail: 'The election failed',
			chancellorIsNotHitler: 'The chancellor is NOT Hitler.',
			chancellorIsHitler: 'The new chancellor IS HITLER!',
		},
		startChaos: {
			start: 'Chaos ensues!',
			draw: 'Draw a chaos card',
			liberalPolicy: 'A liberal policy has been enacted.',
			fascistPolicy: 'A fascist policy has been enacted.',
		},
		startPresidentLegislativeSession: {
			draw: 'Draw 3 cards from the policy deck.',
			start: 'Starting legislative session. The president will draw 3 policies and discard one.',
			question: 'Choose a policy to discard from this agenda.',
		},
		startChancellorLegislativeSession: {
			question: 'Choose a policy to enact.',
		},
		proposeVeto: {
			start: 'The chancellor has proposed to veto this agenda',
			question: 'The chancellor has proposed to veto this agenda, what will you do?',
			agree: 'Approve the motion to veto',
			disagree: 'Deny the motion to veto',
			vetoAccepted: 'This agenda has been vetoed by the President and Chancellor',
			vetoRejected: 'The president has rejected the veto'
		},
		enactPolicy: {
			fascist: 'A fascist policy was passed',
			liberal: 'A liberal policy was passed',
		},
		startPolicyPeek: {
			peek: 'Here are the next three cards in the policy deck.',
		},
		startSpecialElection: {
			start: 'Starting special election',
			question: 'You have the power to appoint the next president. Who will you choose?',
		},
		startInvestigation: {
			question: 'You have the power to investigate the party loyalty of one player. Who will you choose?',
		},
		investigate: {
			confirm: 'Results of the investigation: ',
		},
		startExecution: {
			question: 'Which player do you choose to execute?',
		},
		shufflePolicies: 'Shuffling the policy deck...',
		error: {
			invalidValue: 'Invalid value received',
			unexpectedEvent: 'Unexpected playerAction',
			unknownPlayer: 'Player not recognized',
		}
	};
}


SecretHitlerGame.prototype.hello = function() {
	return "Hallo, welt!";
}

// check to see if all players are ready to proceed
SecretHitlerGame.prototype.ready = function () {
	
	// return true if no players have an incomplete turns
	if (this.players.findIndex(p => !p.ask.complete) < 0) {
		return true;
	}
	else {
		return false;
	}

}

// set the rules, shuffle decks, assign roles and turn order
SecretHitlerGame.prototype.start = function () {
		
	  // fill in with AI players if there are less than 5
		let numPlayers = this.players.length;
		
		for (let i = ++numPlayers ; i <= this.minPlayers ; i++) {
			let botName = this.botNames.draw(1);
			this.addPlayer(botName, botName, true);
		}
		
	
		// set the rules based on the number of players
		this.initRules();

		// prepare the policies deck
		this.initPolicies();

		// must shuffle roles after rules are set
		this.initRoles();

		// create a virtual deck to draw from to set the turn order
		this.initTurnOrder();

		// assign roles and turn order
		for (let p of this.players) {
			let role = this.roleDeck.draw(1);
			p.role = role;
			p.party = ( role == this.t.role.hitler ) ? this.t.role.fascist : role;
			p.order = this.turnOrderDeck.draw(1);
			p.input(this.t.startGame.tellRole + role, [{ text: "Got it!", value: 1 }], 'confirmRole');
		}

		// sort the players by turn order
		this.players.sort((p1, p2) => p1.order - p2.order );
		
		this.started = true;

}

// proceeds to the next function if ready
// returns the next event

SecretHitlerGame.prototype.continue = function () {
	
	if (this.ready()) {
		event = this.update(this.next);
	}
	else {
		event = this.playAI();
	}
	
	return event;
}

// routes incoming player playerActions to the correct functions
SecretHitlerGame.prototype.play = function(playerId, playerAction, value) {
	
	var player = this.getPlayer(playerId);
	var event = false;
	
	if (player === undefined) {
		event = { eventName: 'error', playerName: '', playerId: playerId, data: this.t.error.unknownPlayer + ` "${playerId}"`, state: this.getState() };
		
	} else if (player.ask.playerAction != playerAction) {
		// received an playerAction we were not expecting from the player
		event = { eventName: 'error', playerName: player.name, playerId: player.id, data: this.t.error.unexpectedEvent + ` "${playerAction}"`, state: this.getState() };
	}
	else if (Array.isArray(player.ask.options) && (player.ask.options.find(o => o.value == value) === undefined)) {
		// received an invalid value
		event = { eventName: 'error', playerName: player.name, playerId: player.id, data: this.t.error.invalidValue + ` "${value}"`, state: this.getState() };
	}
	else {		
		player.ask.complete = true;
		event = this.update(playerAction, player, value);
	}
	
	return event;
}

// sets AI logic and makes plays for AI players
SecretHitlerGame.prototype.playAI = function () {
	
	// get all AI players with plays to make
	var ai = this.players.find(p => p.ask.complete === false && p.isAI);
	var event = false;
	
	// just pick a random option
	if (ai !== undefined) {

		// default option- return a random value
		var value = ai.ask.options[Math.floor(Math.random() * ai.ask.options.length)].value;

		switch (ai.ask.playerAction) {
					
		case 'vote':
			// always vote ja for yourself
			if (ai.isNominee || ai.isChancellor) { value = 1; }
			// high chance to vote Ja
			else { value = (Math.random() >= 0.35) ? 1 : 0; }
			break;
		}
		event = this.play(ai.id, ai.ask.playerAction, value);
	}
	
	return event;
	
}

/************** GAME INITIALIZATION  ******************/

// set the ruleset based on the number of players
SecretHitlerGame.prototype.initRules = function () {

	switch (this.players.length) {
		case 5:
		case 6:
			this.fascistCount = 1;
			this.hitlerKnowsFascists = true;
			this.executiveActions = [
				'beforeNomination', // fascist score = 0
				'beforeNomination',  // 1
				'beforeNomination',  // 2
				'beforePolicyPeek',  // 3
				'beforeExecution',  // 4
				'beforeExecution',	 // 5
				'beforeNomination']; // 6
			break;
		case 7:
		case 8:
			this.fascistCount = 2;
			this.hitlerKnowsFascists = false;
			this.executiveActions = [
				'beforeNomination', // fascist score = 0
				'beforeNomination',  // 1
				'beforeInvestigation',  // 2
				'beforeSpecialElection',  // 3
				'beforeExecution',  // 4
				'beforeExecution',	 // 5
				'beforeNomination']; // 6			
			break;			
		case 9:
		case 10:
			this.fascistCount = 3;
			this.hitlerKnowsFascists = false;
			this.executiveActions = [
				'beforeNomination', // fascist score = 0
				'beforeInvestigation',  // 1
				'beforeInvestigation',  // 2
				'beforeSpecialElection',  // 3
				'beforeExecution',  // 4
				'beforeExecution',	 // 5
				'beforeNomination']; // 6			
			break;
	}
	
	this.liberalCount = this.players.length - this.fascistCount - 1;
}

// populate and shuffle the policy deck (or reshuffle mid-game)
SecretHitlerGame.prototype.initPolicies = function() {
	
	var numLiberal = 6 - this.liberalScore;
	var numFascist = 11 - this.fascistScore;
	var cards = [];
	
	for (let i = 0 ; i < numLiberal ; i++) {
		cards.push(this.t.policy.liberal);
	}
	for (let i = 0 ; i < numFascist ; i++) {
		cards.push(this.t.policy.fascist);
	}
	this.policyDeck = new Deck(cards);
	this.policyDeck.shuffle();
	
	return true;
}

// randomize and set the player roles based on the ruleset
SecretHitlerGame.prototype.initRoles = function() {
	
	var cards = [this.t.role.hitler];
	
	for (let i = 0 ; i < this.liberalCount ; i++) {
		cards.push(this.t.role.liberal);
	}
	for (let i = 0 ; i < this.fascistCount ; i++) {
		cards.push(this.t.role.fascist);
	}
	
	this.roleDeck = new Deck(cards);
	this.roleDeck.shuffle();
	
	return true;
}

// randomize and set the player turn order - reorders the players array
SecretHitlerGame.prototype.initTurnOrder = function() {
	
	var cards = [];
	
	for (let i = 0 ; i < this.players.length ; i++) {
		cards.push(i);
	}

	this.turnOrderDeck = new Deck(cards);
	this.turnOrderDeck.shuffle();
	
	return true;
}

/************  HELPER METHODS *********************/

// get the player object given the player id
SecretHitlerGame.prototype.getPlayer = function (id) {
	return this.players.find(p => p.id == id);
}

// add players to the game, returns the player object
SecretHitlerGame.prototype.addPlayer = function(playerName = '', id, isAI = false) {
	if (this.players.length >= 10 || this.started) return false;
	var player = new SecretHitlerPlayer(playerName, id);
	player.isAI = isAI;
	var playerNumber = this.players.push(player);
	if (playerName.length < 1) { player.name = `Player${playerNumber}`; }
	player.order = playerNumber;
	if (playerNumber == 1) {
		player.input("Are you ready to start the game?", [{text: "Ready", value: 1}], 'startGame');
	}
	let joinGameEvent = { eventName: 'joinGame', playerId: id, playerName: playerName, data: player, state: this.getState() }
	this.history.push(joinGameEvent);
	return joinGameEvent;
}

// returns the player object of the current president
SecretHitlerGame.prototype.getPresident = function () {
	return this.players.find(p => p.isPresident);
}

// returns the player object of hitler
SecretHitlerGame.prototype.getHitler = function () {
	return this.players.find(p => p.role == this.t.role.hitler);
}

// changes president to the next player in turn order
SecretHitlerGame.prototype.setNextPresident = function () {
	
	// clear the president flag from all players
	for (let p of this.players) {
		p.isPresident = false;
	}
		
	// find the player with the next highest value for order
	var nextPresidentIndex = this.players.findIndex(p => p.isAlive && p.order > this.presidentTracker);
	
	// if nobody with a higher order, start at the beginning again
	if (nextPresidentIndex < 0) {
		var nextPresidentIndex = this.players.findIndex(p => p.isAlive);
	}

	this.players[nextPresidentIndex].isPresident = true;
	
	// set the president tracker, used to return to order after special elections
	this.presidentTracker = nextPresidentIndex;
	
	return this.players[nextPresidentIndex];
	
}

// get all players that are currently alive
SecretHitlerGame.prototype.getAlivePlayers = function () {
	return this.players.filter(p => p.isAlive);
}

// get players eligible for nomination for chancellor
SecretHitlerGame.prototype.getEligibleNominees = function () {
	return this.players.filter(p => !p.isTermLimited && !p.isPresident && p.isAlive);
}

// get players eligible to vote in the election
SecretHitlerGame.prototype.getEligibleVoters = function () {
	return this.players.filter(p => p.isAlive);	
}

// returns the player object of the current nominee for chancellor
SecretHitlerGame.prototype.getNominee = function () {
	return this.players.find(p => p.isNominee);
}

// returns the player object of the current chancellor
SecretHitlerGame.prototype.getChancellor = function () {
	return this.players.find(p => p.isChancellor);
}

// removes term limits for all players
SecretHitlerGame.prototype.resetTermLimits = function () {
	for (p of this.players) {
		p.isTermLimited = false;
	}
}

// just a friendly function to output some quick state info
SecretHitlerGame.prototype.getQuickState = function () {
	
	var president = this.getPresident();
	var nominee = this.getNominee();
	var chancellor = this.getChancellor();
	
	return {
		players: this.players.map(p => p.name).join(", "),
		fascistScore: this.fascistScore,
		liberalScore: this.liberalScore,
		president: president !== undefined ? president.name : "(none)",
		nominee: nominee !== undefined ? nominee.name : "(none)",
		chancellor: chancellor !== undefined ? chancellor.name : "(none)",
		electionTracker: this.electionTracker,
		liberals: this.players.filter(p => p.role == this.t.role.liberal).map(p => p.name).join(", "),
		fascists: this.players.filter(p => p.role == this.t.role.fascist).map(p => p.name).join(", "),
		hitler: this.players.filter(p => p.role == this.t.role.hitler).map(p => p.name).join(", "),
		dead: this.players.filter(p => !p.isAlive).map(p => p.name).join(", "),
		policyDeck: this.policyDeck.cards.join(", "),
		next: this.next,
		winner: this.winner
	}
}

// return game state information
SecretHitlerGame.prototype.getState = function () {
	var state = {
		players: [],
		policyDeck: { cards: [] },
		turnOrderDeck: { cards: [] },
		roleDeck: { cards: [] },
	};
		
	for (let prop of this.gameStateProperties) {
		state[prop] = this[prop];
	}
	
	if (this.history.length > 0) {
		state.last = this.history[this.history.length - 1].eventName;
	} else {
		state.last = '';
	}
	
	state.agenda = [];
	for (let a of this.agenda) {
		state.agenda.push(a);
	}
	
	state.executiveActions = [];
	for (let e of this.executiveActions) {
		state.executiveActions.push(e);
	}
	
	switch (this.executiveActions[this.fascistScore + 1]) {	
	case 'beforeNomination':
		state.nextExecutiveAction = '';
		break;
	case 'beforeExecution':
		state.nextExecutiveAction = 'EXECUTION';
		break;
	case 'beforeInvestigation':
		state.nextExecutiveAction = 'INVESTIGATION';
		break;
	case 'beforeSpecialElection':
		state.nextExecutiveAction = 'SPECIAL ELECTION';
		break;
	case 'beforePolicyPeek':
		state.nextExecutiveAction = 'POLICY PEEK';
		break;
	default:
		state.nextExecutiveAction = '';
		break;	
	}
	
	state.policyDeck = [];
	
	for (let c of this.policyDeck.cards) {
		state.policyDeck.push(c);
	}
	
	state.roleDeck = [];
	
	for (let c of this.roleDeck.cards) {
		state.roleDeck.push(c);
	}
	
	state.turnOrderDeck = [];
	
	for (let c of this.turnOrderDeck.cards) {
		state.turnOrderDeck.push(c);
	}
	
	// adds a unique ID to each version of the game state
	state.version = this.history.length;
	
	for (let player of this.players) {
		var playerState = {};
		for (let prop of this.playerStateProperties)
		{
			playerState[prop] = player[prop];
		}
		playerState.ask = Object.assign({}, player.ask);
		let fascistNames = this.players.filter((p) => p.role == this.t.role.fascist && p.id != player.id ).map((p) => p.name);
		let hitler = this.getHitler();
		let hitlerName = hitler ? hitler.name : '';
		playerState.fascistNames = ( player.role == this.t.role.fascist || player.role == this.t.role.hitler && this.hitlerKnowsFascists ) ? fascistNames : [];
		playerState.hitlerName = player.role == this.t.role.fascist ? hitlerName : '';
		playerState.gameStarted = this.started;
		playerState.gameOver = this.winner ? true : false;
		// see state.version above
		playerState.version = state.version;
		state.players.push(playerState); 
	}
	
	return state;
	
}

// load a game state object
SecretHitlerGame.prototype.setState = function (state) {
		
	for (let prop of this.gameStateProperties) {
		this[prop] = state[prop];
	}

	this.agenda = [];
	for (let a of state.agenda) {
		this.agenda.push(a);
	}
	
	this.executiveActions = [];
	for (let e of state.executiveActions) {
		this.executiveActions.push(e);
	}
	
	this.policyDeck = new Deck(state.policyDeck);
	this.roleDeck = new Deck(state.roleDeck);
	this.turnOrderDeck = new Deck(state.turnOrderDeck);
	
	for (let playerState of state.players) {
		var player = new SecretHitlerPlayer(playerState.name, playerState.id);
		for (let prop of this.playerStateProperties)
		{
			player[prop] = playerState[prop];
		}
		player.ask = Object.assign({}, playerState.ask);
		
		this.players.push(player); 
	}
	
	return state;
	
}


/********************** GAME.UPDATE ***********************

The main function that updates the game state based on events

eventName = string: name of function to be run
player = the player who initiated the event (if applicable)
data = data to be passed to the function (ie: from player input)

*/

SecretHitlerGame.prototype.update = function (eventName, player = { id: '', name: 'Server' }, data = '') {
		
	var events = {

		// start the game
		startGame: function ()
		{
			this.start();
			this.next = 'beforeNomination';
		},
		
		// end the game
		endGame: function ()
		{
			this.started = false;
		},

		beforeNomination : function () {
		
			// clear the nominee and move the president to the next player
			for (p of this.players) {
				p.isNominee = false;
				p.isChancellor = false;
			}
	
			// set the next president, if this is not a special election
			if (!this.isSpecialElection) {
				this.setNextPresident();
			}
			
			this.getPresident().input("You're now the president. You may start the nomination process when ready.", [{text: "Start Nomination", value: 1}], 'startNomination' );
		},

		// president nominates a new chancellor
		startNomination : function () {
	
			var options = [];
			
			// do not reset the agenda until now, which leaves the last passed policy visible in the game state in beforeNomination event
			this.agenda = [];
	
			var eligibleNominees = this.getEligibleNominees();
	
			for (let i = 0 ; i < eligibleNominees.length ; i++) {
				let p = eligibleNominees[i];
				options.push({text: p.name, value: p.order});
			}

			this.getPresident().input(this.t.startNomination.question, options, 'nominateChancellor' );
		
			this.next = 'beforeElection';

		},
		
		beforeElection: function () {
			
			this.getPresident().input("It's time to vote. Make your best case to the other players before starting the election.", [{text: "Start Election", value: 1}], 'startElection' );
			
		},

		// players vote on president/chancellor
		startElection : function () {
		
			var options = [
				{ text: this.t.startElection.ja, value: 1 },
				{ text: this.t.startElection.nein, value: 0 }
			];

			for (p of this.getEligibleVoters()) {
				p.ballot = 0;
				p.input(this.t.startElection.question, options, 'vote')
			}
	
			this.next = 'tallyElection';	
	
		},

		// election votes are tallied, check for fascist win
		// go to legislative session, new election, or chaos
		tallyElection : function () {
	
			// todo - rules for special elections
	
			var jaCount = 0;
			var voters = this.getEligibleVoters();
			var nominee = this.getNominee();
			var president = this.getPresident();
			
			for (p of voters) {
				jaCount += p.ballot
			}

			if (jaCount / voters.length > 0.5) {
				
				// election passes		
				nominee.isChancellor = true;
				this.electionTracker = 0;
		
				// set term limits
				this.resetTermLimits();
				nominee.isTermLimited = true;
		
				// president is only term limited if there are more than 5 players left alive
				if (this.getAlivePlayers().length > 5) {
					president.isTermLimited = true;
				}
				
				// check to see if the game is over
				if (this.fascistScore >= 3 && nominee.role == this.t.role.hitler) {
					this.winner = this.t.role.fascist;
				 	this.next = 'endGame';
				}
				else {
					this.next = 'startPresidentLegislativeSession';
				}
				
				// pass the value of 1 back with the event if passed
				data = 1;
			}
			else {
				
				// election fails - increment the election tracker and check for CHAOS!
				if (++this.electionTracker >= 3) {
					this.next = 'startChaos';
				}
				else {
					this.next = 'beforeNomination';
				}
			
				data = 0;
			}
			
			this.isSpecialElection = false;	
		},

		// chaos - election fails three times in a row - enact the next policy
		startChaos : function () {

			this.getPresident().input(this.t.startChaos.draw, [{text: "Draw", value: 1}], 'drawChaosCard');
		},
		
		drawChaosCard: function () {
			
			// pass the top policy
			if (this.policyDeck.draw(1) == this.t.policy.liberal) {
				this.liberalScore++;
			}
			else {
				this.fascistScore++;
			}
			
			// shuffle policy deck if less than 3 cards are left
			if (this.policyDeck.cards.length < 3) {
				this.initPolicies();
			}
	
			// check game over
			if (this.fascistScore >= 6) {
				this.winner = this.t.role.fascist;
				this.next = 'endGame';
			}
			else if (this.liberalScore >= 5) {
				this.winner = this.t.role.liberal;
				this.next = 'endGame';
			}
			else {
				// game not over yet
				// reset term limits
				this.resetTermLimits();

				// reset the election tracker
				this.electionTracker = 0;
			}
	
			this.next = 'beforeNomination';

		},

		// legistlative session - president draws 3 policies and discards 1
		startPresidentLegislativeSession : function () {
		
			// after the fifth fascist policy is passed, veto is allowed
			if (this.fascistScore >= 5) {
				this.vetoAllowed = true;
			}
			else {
				this.vetoAllowed = false;
			}
			
			this.getPresident().input(this.t.startPresidentLegislativeSession.draw, [{text: "Draw", value: 1}], 'drawPolicies');
		
		},
		
		drawPolicies: function () {
			
			// president draws 3 policies, picks one
			this.agenda = this.policyDeck.draw(3);
			// shuffle policy deck if less than 3 cards are left
			if (this.policyDeck.cards.length < 3) {
				this.initPolicies();
			}
			var options = this.agenda.map((text, value) => ({text: text, value: value}));
			this.getPresident().input(this.t.startPresidentLegislativeSession.question, options, 'discard');
	
			this.next = 'startChancellorLegislativeSession';	
		},

		// legistlative session - president draws 3 policies and discards 1
		startChancellorLegislativeSession : function () {
	
			var options = this.agenda.map((text, value) => ({text: text, value: value}));
			// give the option to veto if it is allowed
			if (this.vetoAllowed) {
				options.push({ text: this.t.policy.veto, value: -1 });
			}
	
			this.getChancellor().input(this.t.startChancellorLegislativeSession.question, options, 'enactPolicy');
		},

		// chancellor chooses one of the remaining policies to enact or uses veto power
		enactPolicy : function (chancellor, cardIndex) {
			
			cardIndex = parseInt(cardIndex);			
			
			if (cardIndex == -1) {
				// veto proposed
				this.next = 'proposeVeto';
			}
			else {
				// only option left in the agenda should be the passed policy
				this.agenda = [this.agenda[cardIndex]];		

		
				// draw the remaining policy from the agenda
				var enactedPolicy = this.agenda[0];
	
				if (enactedPolicy == this.t.policy.fascist) {
					this.fascistScore++;
				}
				else {
					this.liberalScore++;
				}
	
				// check game over
				if (this.fascistScore >= 6) {
					this.winner = this.t.role.fascist;
					this.next = 'endGame';
				}
				else if (this.liberalScore >= 5) {
					this.winner = this.t.role.liberal;
					this.next = 'endGame';
				}
				else {

					// go to the appropriate exec action if a fascist policy was passed
					if (enactedPolicy == this.t.policy.fascist) {
						this.next = this.executiveActions[this.fascistScore];		
					}
					else {
						this.next = 'beforeNomination';
					}
				}
			}
		},

		// Chancellor proposes vetoing the agenda
		proposeVeto : function () {
	
			this.getPresident().input(this.t.proposeVeto.question,
				[{text: this.t.proposeVeto.agree, value: 1}, {text: this.t.proposeVeto.disagree, value: 0}]
				, 'giveVetoConsent');
	
			// make sure we don't veto twice in a row
			this.vetoAllowed = false;
	
	
		},

		beforeSpecialElection : function () {
			this.getPresident().input("You now have the executive power to call a Special Election.", [{text: "Start Special Election", value: 1}], 'startSpecialElection' );
		},

		// switch the president to the player chosen in callSpecialElection 
		startSpecialElection : function () {
	
			this.isSpecialElection = true;
	
			// president may appoint any other player that is alive
			var eligible = this.players.filter(p => p.isAlive && !p.isPresident);
			
			var options = [];
			
			for (let i = 0 ; i < eligible.length ; i++) {
				let p = eligible[i];
				options.push({text: p.name, value: p.order});
			}

			this.getPresident().input(this.t.startSpecialElection.question, options, 'callSpecialElection');
			this.next = 'beforeNomination';
		},

		beforePolicyPeek : function () {
			this.getPresident().input("You now have the policy peek executive power.", [{text: "Start Policy Peek", value: 1}], 'startPolicyPeek' );
		},

		// president is shown the top 3 cards of the policy deck
		startPolicyPeek : function () {
			
			this.getPresident().policyPeek = Object.assign([], this.policyDeck.cards).splice(0,3);
			this.getPresident().input(this.t.startPolicyPeek.peek + ` ${this.policyDeck.cards[0]}, ${this.policyDeck.cards[1]}, ${this.policyDeck.cards[2]}`, [{text: "Ok", value: 1}], 'confirmPolicyPeek');

			this.next = 'beforeNomination';

		},

		beforeInvestigation : function () {
			this.getPresident().input("You now have the executive power to investigate another player's party loyalty.", [{text: "Start Investigation", value: 1}], 'startInvestigation' );
		},


		// president chooses a player to investigate their party status
		startInvestigation : function () {
	
			// president may investigate any other player who has not been investigated
			var eligible = this.players.filter(p => !p.investigated && !p.isPresident);
		
			var options = [];
			
			for (let i = 0 ; i < eligible.length ; i++) {
				let p = eligible[i];
				options.push({text: p.name, value: p.order});
			}	
			
			this.getPresident().input(this.t.startInvestigation.question, options, 'investigate');
			this.next = 'beforeNomination';
	
		},

		beforeExecution : function () {
			this.getPresident().input("You now have the executive power to execute another player.", [{text: "Start Execution", value: 1}], 'startExecution' );
		},


		// president chooses a player to execute
		startExecution : function () {
		
			// president may execute any player that is alive
			var eligible = this.players.filter(p => p.isAlive && !p.isPresident);

			var options = [];
			
			for (let i = 0 ; i < eligible.length ; i++) {
				let p = eligible[i];
				options.push({text: p.name, value: p.order});
			}
	
			this.getPresident().input(this.t.startExecution.question, options, 'executePlayer');
			this.next = this.executePlayer;
		},

		nominateChancellor: 
		function (nominator, nomineeIndex) { 
			this.players[nomineeIndex].isNominee = true;
			
		},

		vote:
		function (voter, ballot) {
			voter.ballot = parseInt(ballot);
		},

		discard:
		function (president, cardIndex) {
			cardIndex = parseInt(cardIndex);
			// remove the policy card from the specified index of the agenda
			this.agenda.splice(cardIndex, 1);
		},
	
		giveVetoConsent:
		function (president, consent) {
			if (consent == 1) {
				this.agenda = [this.t.policy.veto];
				this.next = 'beforeNomination';
			}
			else {
				var options = this.agenda.map((text, value) => ({text: text, value: value}));
				this.getChancellor().input(this.t.startChancellorLegislativeSession.question, options, 'enactPolicy');
			}
		},
	
		callSpecialElection:
		function (oldPresident, newPresidentIndex) {
			this.getPresident().isPresident = false;
			this.players[newPresidentIndex].isPresident = true;
		},
	
		investigate:
		function (president, targetIndex) {
			var investigatedPlayer = this.players[targetIndex];
			investigatedPlayer.investigated = true;
			this.getPresident().investigationTarget = investigatedPlayer.name;
			this.getPresident().investigationResult = investigatedPlayer.party;
			this.getPresident().input(this.t.investigate.confirm + investigatedPlayer.party, [{text: "Got it!", value: 1}], 'confirmInvestigate');
		},
	
		executePlayer:
		function (president, targetIndex) {
			var target = this.players[targetIndex];
			target.isAlive = false;
		
			// check to see if the executed player is Hitler
			if (target.role == this.t.role.hitler) {
				this.winner = this.t.role.liberal;
				this.next = 'endGame';
			}
			else {
				this.next = 'beforeNomination';				
			}
		
		},
	}
	
	if (events[eventName] !== undefined) {
		events[eventName].call(this, player, data);
	}
	
	let currentEvent = { eventName: eventName, playerId: player.id, playerName: player.name, data: data, state: this.getState() }
	this.history.push(currentEvent);
	
	return currentEvent;

};

/**********************  PLAYER   ************************/

function SecretHitlerPlayer(playerName, id) {
	this.name = playerName;
	this.id = id;
	this.isAI = false; // enable AI play
	this.role = ''; // "Liberal", "Fascist", or "Hitler"
	this.party = ''; // "Liberal" or "Fascist"
	this.order = ''; // the player's position in the turn order

	this.isAlive = true;

	this.isChancellor = false;
	this.isTermLimited = false;
	
	// flag that determines whether or not a player has been investigated - a player can only be investigated once per game
	this.investigated = false;

	
	// reset after each term
	this.isPresident = false;
	this.isNominee = false;
	this.ballot = 0; // "1=Ja", "0=Nein"
	
	// these hold the results of executive actions that need to be returned in the player state
	this.investigationTarget = '';
	this.investigationResult = '';
	this.policyPeek = [];

	// turn information
	this.ask = { 
		question: '', // a question to send to the user
		options: [], // an array of {text: string, value: string}, where text is to be displayed and value is to be returned
		playerAction: '', // an playerAction to be sent along with the response
		complete: true
	};

}

// get input from the player
SecretHitlerPlayer.prototype.input = function (question, options, playerAction) {	
	
	this.ask.question = question;
	this.ask.options = options;
	this.ask.playerAction = playerAction;
	this.ask.complete = false;
	
	/*console.log(`Server->${this.name}: ${question}`);
	for (let o of options) {
		console.log(`\t${o.text} [${o.value}]`);
	} */
	
}


/**********************  DECK   ************************/


function Deck(cards = []) {
	this.cards = cards;
	return this;
}

// draw "howMany" cards - remove them from the deck and returns card (or array if multiple)
Deck.prototype.draw = function(howMany) {
	
	if (howMany > this.cards.length) { throw "ERROR: Not enough cards in deck."; }
	if (howMany < 2)
	{
		var drawn = this.cards.shift();
	}
	else {
		
		var drawn = [];
		
		for (let i = 0 ; i < howMany && i <= this.cards.length ; i++) {
			drawn.push(this.cards.shift());
		}
	}
	return drawn;
}

/**
 * Randomly shuffle an array
 * https://stackoverflow.com/a/2450976/1293256
 * @param  {Array} array The array to shuffle
 * @return {String}      The first item in the shuffled array
 */
Deck.prototype.shuffle = function () {

	var currentIndex = this.cards.length;
	var temporaryValue, randomIndex;

	// While there remain elements to shuffle...
	while (0 !== currentIndex) {
		// Pick a remaining element...
		randomIndex = Math.floor(Math.random() * currentIndex);
		currentIndex -= 1;

		// And swap it with the current element.
		temporaryValue = this.cards[currentIndex];
		this.cards[currentIndex] = this.cards[randomIndex];
		this.cards[randomIndex] = temporaryValue;
	}

	return this;

};