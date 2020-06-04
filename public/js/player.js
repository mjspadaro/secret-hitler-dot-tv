
var socket = io();

socket.on('connect', onConnect);
socket.on('disconnect', function (socket) { setError('Error: unable to connect to server.'); disableForms(); });	

const DEFAULT_PLAYER_STATE = {name: '', ask: {playerAction: '', complete: true}, id: '', gameStarted: false, version: -1};

var player = Object.assign({}, DEFAULT_PLAYER_STATE);
player.name = localStorage.getItem('playerName');
player.id = localStorage.getItem('playerId');

var gameId = localStorage.getItem('gameId');

const events = {

	confirmRole: function (p) {
		
		let headline = p.role == 'hitler' ? `You are <em>Hitler</em>.` : `You are a <em>${escapeHtml(p.role)}</em>`;
		let body = '';
		if (p.hitlerName) {
			body += `<em>Hitler</em><ul><li>${escapeHtml(p.hitlerName)}</li></ul>`;
		}
		if (p.fascistNames.length > 0) {
			body += `<em>Other fascists</em><ul><li>${p.fascistNames.join('</li><li>')}</li></ul>`;
		}
		return { headline: headline, body: body, button: 'I understand' };	
	},
	
	startGame: {
		headline: 'You are the host.',
		info: 'Starting the game...',
		body:  '<em>Wait</em> for all players to join before starting the game.<br /><br />If you start the game with fewer than the minimum 5 players, the remaining spots will be filled with computer players.',
		button: 'Start Game',
	},
	
	startNomination: {
		info: 'Checking eligible chancellor nominees...',
	},
	
	nominateChancellor: {
		info: 'Your nomination has been submitted.',
		button: 'Submit Nomination'
	},
	
	startElection: {
		headline: 'Start the election when everyone is ready.',
		button: 'Start election',
		info: 'Opening the polls...',
	},
	
	vote: {
		info: "You voted!",
	},
	
	drawChaosCard: {
		headline: 'The country has been thrown into <em>chaos</em>. You must now draw the top policy and enact it immediately.',
		button: 'Draw policy',
		info: 'Drawing the top policy... chaos here we come!',
	},
	
	drawPolicies: {
		info: 'Drawing the next 3 policies...',
	},
	
	discard: {
		headline: "Choose a policy to <em>discard</em>.",
		button: 'Discard Policy',
		info: 'Done. The remaining policies have been passed to the Chancellor.'
	},
	
	enactPolicy: (p) => ({
		headline: "Choose a policy to <em>enact</em>.",
		body: p.ask.options.length < 3 ? "" : "Alternatively, you could propose to <em>veto</em> this agenda." +
		"If the president approves your motion, the agenda will be tossed out and no policy will be passed during this legislative session.",
		button: p.ask.options.length == 3 ? 'Submit' : 'Enact Policy',
		info: p.ask.options.length == 3 ? 'All done! Waiting for other players...' : 'The policy has been enacted.'
	}),

	startExecution: {
		info: 'Preparing for the execution...',
	},
	
	executePlayer: {
		info: 'The execution has been ordered.'
	},
	
	startSpecialElection: {
		headline: 'You have the power to choose the <em>presidential candidate</em> for the next round.',
		body: 'The regular presidential order will resume as normal the following round.',
		button: 'Start special election',
		info: 'Preparing for the special election...'
	},

	callSpecialElection: {
		headline: 'Appoint the next presidential candidate.',
		button: 'Appoint',
		info: 'Ok! Your choice for presidential candidate has been submitted.'
	},

	startInvestigation: {
		headline: 'You have the power to investigate another player\'s party loyalty.',
		button: 'Start investigation',
		info: 'Preparing for the investigation...',
	},

	investigate: {
		headline: 'Choose the player you would like to investigate',
		button: 'Investigate',
		info: 'Investigating party loyalty...',
	},
	
	confirmInvestigate: (p) => ({
		headline: 'Investigation results:',
		body: `${p.investigationTarget} is a member of the <em>${p.investigationResult}</em> party.`,
		button: 'Got it!',
		info: 'The investigation is complete.',
	}),
	
	startPolicyPeek: {
		headline: 'You get to peek at the next three cards in the policy deck.',
		button: 'Take a peek',
		info: 'Getting the next three policies...',
	},
	
	confirmPolicyPeek: (p) => ({
		headline: "Here is a peek at the next three cards in the policy deck:",
		body: "<ol><li><em>" + p.policyPeek.join('</em></li><li><em>') + "</em></li></ol>",
		button: "Got it!"
	}),
	
}

window.onload = function () { onLoad() };

function onLoad() {
  $('#join-game').submit($('#join-game'), joinGame); 
	$('#player-action').submit($('#player-action'), play);
	
	if (gameId) {
		$('#game-id').val(gameId);
	}
	
	if (player.name) {
		$('#player-name').val(player.name);
	}
}

function disableForms(disabled = true) {

	$('input,button').each((i, e) => $(e).prop('disabled', disabled));
}

function enableForms() {
	disableForms(false);
}

function joinGame(e) {

	disableForms();
	e.preventDefault(); // prevents page reloading
	
	if ($("#player-name").val().length < 1) {
		setError("Don't forget to enter your name!");
		enableForms();
	} else if ($("#game-id").val().length != 4) {
		setError("Please enter a valid game code.");
		enableForms();
	} else {
		$('#error').hide();
		player.name = $("#player-name").val();
		gameId = $("#game-id").val();
		console.log(`Joining game ${gameId} as ${player.name}`);
		socket.emit('joinGame', player.name, gameId, afterJoinGame);
	}
	
	socket.on('playerState', updatePlayerState);
	
}

function onGameOver() {
	localStorage.removeItem('gameId');
	setInfo('The game is over!', true);
	gameId = '';
	player = Object.assign({}, DEFAULT_PLAYER_STATE);
	$('#game-id').val('');
	enableForms();
	$('#join-game').show();
}

function getEvent(eventName, playerState = player) {
	let defaultEvent = {
		headline: playerState.ask.question,
		info: 'Done for now! Waiting on other players...',
		body: '',
		button: playerState.ask.options.length == 1 ? playerState.ask.options[0].text : 'Submit',
	};
	
		
	if (typeof events[eventName] == 'function') {
		var e = events[eventName](playerState);
		e = Object.assign(defaultEvent, e);
	} else if (typeof events[eventName] != 'undefined') {
		var e = events[eventName];
		e = Object.assign(defaultEvent, e);
	} else {
		var e = defaultEvent;
	}
		
	return e;
}

function renderPlayerActionForm(playerState = player) {

	// render the prompt	
	// reset the form
	$('.player-action-option').remove();

	$('#player-info').hide();

	let e = getEvent(playerState.ask.playerAction, playerState);

	$('#player-info').html(e.info);

	let headline = $(document.createElement('h3'));
	headline.addClass('player-action-headline');
	headline.html(e.headline);


	let body = $(document.createElement('div'));
	body.addClass('player-action-body');
	body.html(e.body);

	if (e.body.length < 1) {
		body.hide();
	}
			
	let radios = [];

	for (let i = 0 ; i < playerState.ask.options.length ; i++) {
		let o = playerState.ask.options[i];
		let r = $(document.createElement('div'));
		r.addClass("player-action-option");
		r.html(
			`<input type="radio" id="player-action-option-${i}" name="player-action-option" value="${o.value}" />
				<label for="player-action-option-${i}">${escapeHtml(o.text)}</label>`);
		radios.push(r);
	}

	// if there's only a single option, we don't need to show it
	if (radios.length == 1) {
		radios[0].children('input').prop("checked", "true");
		radios[0].hide();
	}

	let action = $(document.createElement('input'))
		.attr("type", "hidden")
		.attr("id", "player-action-name")
		.val(playerState.ask.playerAction);

	let button = $(document.createElement('div'));
	button.append($(document.createElement('button')).html(e.button));
	button.addClass('player-action-submit');

	// build the form html
	$('#player-action>h3').replaceWith(headline);
	$('.player-action-body').replaceWith(body);
	for (r of radios) {
		$('.player-action-submit').before(r);
	}
	$('#player-action-name').replaceWith(action);			
	$('.player-action-submit').replaceWith(button);

	$('#player-action').show();

	enableForms();
}

function updatePlayerState(newState, forceRenderPlayerActionForm = false) {
	console.log(`updatePlayerState name=${newState.name} version=${newState.version} playerAction=${newState.ask.playerAction} complete=${newState.ask.complete}`);

	// ignore states that are older than the version we already have
	if (newState.version < player.version) return console.warn(`Ignoring out of sequence player state: version=${newState.version}`);
	// if the game is over, reset the game so the player can join again and return
	if (newState.gameOver) return onGameOver();

	localStorage.setItem('playerId', newState.id);
	localStorage.setItem('gameId', gameId);
	localStorage.setItem('playerName', newState.name);		

	document.title = `Secret Hitler dot TV - ${escapeHtml(newState.name)} - ${gameId}`;

	// render the form if action is not complete and the action or complete status has changed
	// ensures that the same form isn't rerendered twice
	if (!newState.ask.complete && (player.ask.playerAction !== newState.ask.playerAction || player.ask.complete)) {
		renderPlayerActionForm(newState);
	}

	player = newState;

}

function setInfo(msg = '', show = false) {

		$('#player-info').html(msg);
		if (show) {
			$('#player-info').show();
		}

}

function setError(err = '') {
	if (err) {
		$('#error').html(err);
		$('#error').show();
	} else {
		$('#error').hide();
	}
}

function onConnect() {
	console.log(`hello ${player.id}`);
	socket.emit('hello', player.id, afterHello);
}

function afterHello(id = player.id, playerState) {
	player.id = id;
	localStorage.setItem('playerId', id);
	console.log(`Controller: setting clientId = ${id}`);
	if (player.gameStarted) {
		updatePlayerState(playerState);
	}
	setError();
	enableForms();
}

function afterJoinGame(playerState, err = 'Error: unable to join.') {
	enableForms();
	if (playerState) {
		// only show this if the game hasn't started
		if (!playerState.gameStarted) {
			setInfo("You're in! Waiting for more players to join...");
		} else {
			setInfo("Welcome back!");
		}
		$('#player-info').show();
		$('#join-game').hide();
		$('#error').hide();
		updatePlayerState(playerState);
	} else {
		setError(err);
	}
}

function play (e) {
	e.preventDefault();	
	disableForms();
	$('#error').hide();
	
	if ($('.player-action-option>input:checked').val() !== undefined) {
		let playerAction = $('#player-action-name').val();
		let data = $('.player-action-option>input:checked').val();
		socket.emit('play', playerAction, data, afterPlay);	
	} else {
		setError("Please select an option to proceed.");
		enableForms();
	}
}

function afterPlay(newState, msg = 'Error: there was a problem, please try again.') {

	if (newState) {
		$('#player-action').hide();
		$('#player-info').show();
		// uncommenting below will cause the state to be updated immediately after the play
		// consider implementing in the future, but for now, let's make them wait for host renders like everyone else
		// updatePlayerState(newState);
	} else {
		setError(msg);
		enableForms();
	}
}

function setCookie(cname, cvalue, exdays) {
  var d = new Date();
  d.setTime(d.getTime() + (exdays*24*60*60*1000));
  var expires = "expires="+ d.toUTCString();
  document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}

function getCookie(cname) {
  var name = cname + "=";
  var decodedCookie = decodeURIComponent(document.cookie);
  var ca = decodedCookie.split(';');
  for(var i = 0; i <ca.length; i++) {
    var c = ca[i];
    while (c.charAt(0) == ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(name) == 0) {
      return c.substring(name.length, c.length);
    }
  }
  return "";
}


function escapeHtml(unsafe = '') {
	unsafe += '';
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
 }
