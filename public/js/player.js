var socket;

const UI_JOIN = 'ui_join';
const UI_SUBMIT_JOIN = 'ui_submit_join';
const UI_IDLE = 'ui_idle';
const UI_PLAY_TURN = 'ui_play_turn';
const UI_SUBMIT_TURN = 'ui_submit_turn';
const UI_GAME_OVER = 'ui_game_over';

const getJoinGameForm = () => $('#join-game');
const getPlayTurnForm = () => $('#player-action');
const getIdleMessageBox = () => $('#player-info');
const getErrorMessageBox = () => $('#error');
const getPlayerNameInput = () => $("#player-name");
const getGameIdInput = () =>$("#game-id");

const DEFAULT_PLAYER_STATE = { name: '', ask: {playerAction: '', complete: true}, id: '', gameStarted: false, gameId: '', version: -1, turnCount: -1 };

var credentials = JSON.parse(localStorage.getItem('credentials')) || {};
var lastTurnCount = -1;
var globalUIState;

const resetPlayerState = () => globalPlayerState = Object.assign({}, DEFAULT_PLAYER_STATE);
const savePlayerStateToLocalStorage = (state = globalPlayerState) => localStorage.setItem('playerState', JSON.stringify(state));
const getPlayerStateFromLocalStorage = () => JSON.parse(localStorage.getItem('playerState'));
const loadPlayerStateFromLocalStorage = () => globalPlayerState = {...DEFAULT_PLAYER_STATE, ...getPlayerStateFromLocalStorage()};
const removePlayerStateFromLocalStorage = () => localStorage.removeItem('playerState');

const isGameOver = (state = globalPlayerState) => state.gameOver || false;
const isPlayerTurn = (state = globalPlayerState) => !state.ask.complete && state.ask.playerAction;
const isNewTurn = (state = globalPlayerState) => {
  if (isPlayerTurn(state) && state.turnCount > lastTurnCount) {
    lastTurnCount = state.turnCount;
    return true;
  } else {
    return false;
  }
}
const disableForms = (disabled = true) => $('input,button').each((i, e) => $(e).prop('disabled', disabled));
const enableForms = () => disableForms(false);

const events = {

	confirmRole: function (p) {
		
		let headline = p.role == 'hitler' ? `You are <em>Hitler</em>.` : `You are a <em>${escapeHtml(p.role)}</em>`;
		let body = '';
		if (p.hitlerName) {
			body += `<p>${escapeHtml(p.hitlerName)} is <em>Hitler</em></p>`;
		}
		if (p.fascistNames.length > 0) {
			body += `<em>Other fascists</em><ul><li>${p.fascistNames.join('</li><li>')}</li></ul>`;
		} else if (p.role == 'fascist') {
			body += `<p>There are no other fascists.</p>`;
		}
		return { headline: headline, body: body, button: 'I understand', buttonDelay: 10 };	
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
		info: 'The remaining policies have been passed to the Chancellor.'
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
  getJoinGameForm().submit(getJoinGameForm(), handleJoinGameSubmit); 
	getPlayTurnForm().submit(getPlayTurnForm(), handlePlayTurnSubmit);
	loadPlayerStateFromLocalStorage();
  getGameIdInput().val(globalPlayerState.gameId);
  getPlayerNameInput().val(globalPlayerState.name);
	renderUIState(UI_JOIN);
	initializeSocket();
}

function initializeSocket() {
	socket = io();
	socket.on('updatePlayerState', handleUpdatePlayerState );
	socket.on('connect', handleSocketConnect);
}

function handleSocketConnect() {
	socket.emit('authenticate', credentials, (response) => {
		if (response.error) {
      setError(response.error);
		} else {
			setError();
			credentials = response;
			console.log(`Authenticated as ${JSON.stringify(credentials)}`);
			localStorage.setItem('credentials', JSON.stringify(credentials));
		}
	});
}

function handleFormSubmit(submitEvent) {
	disableForms();
	submitEvent.preventDefault();
	const formError = socket.connected ? '' : 'Unable to connect to server';
	setError(formError);
	if (formError)
		enableForms();
	return formError;
}

function handleJoinGameSubmit(submitEvent) {
	const formError = handleFormSubmit(submitEvent);
	if (formError) return;
	let playerName = getPlayerNameInput().val();
	let gameId = getGameIdInput().val();
	if (playerName.length < 1) {
		setError("Don't forget to enter your name!");
    updateUIState(UI_JOIN);
    return;
  }
  if (gameId.length != 4) {
		setError("Please enter a valid game code.");
    updateUIState(UI_JOIN);
    return;
  }
  setError();
	renderUIState(UI_SUBMIT_JOIN);
	if (gameId != globalPlayerState.gameId)
		resetPlayerState();
  globalPlayerState.name = playerName;
  globalPlayerState.gameId = gameId;
	console.log(`Joining game ${globalPlayerState.gameId} as ${globalPlayerState.name}`);
	socket.emit('joinGame', { playerName: globalPlayerState.name, gameCode: globalPlayerState.gameId },
		(response) => {
			if (response.error) {
				setError(response.error);
				renderUIState(UI_JOIN);
			} else {
				renderUIState();
			}
		});
}

const getPlayTurnFormValue = () => $('.player-action-option>input:checked').val();
const getPlayTurnFormAction = () => $('#player-action-name').val();

function handlePlayTurnSubmit (submitEvent) {
	const formError = handleFormSubmit(submitEvent);
	if (formError) return;
	let playTurnFormValue = getPlayTurnFormValue();
	let playTurnFormAction = getPlayTurnFormAction();

	if (playTurnFormValue === undefined) {
		setError("Please select an option to proceed.");
		renderUIState(UI_PLAY_TURN);
		return;
	}

	renderUIState(UI_SUBMIT_TURN);

	socket.emit('playTurn', { action: playTurnFormAction, value: playTurnFormValue }, (response) => {
		if (response.error) {
			setError(response.error);
			renderUIState(UI_PLAY_TURN);
		} else {
			renderUIState(UI_IDLE);
		}
	});
}

const getUIStateFromPlayerState = (playerState = globalPlayerState) => isNewTurn() ? UI_PLAY_TURN : isGameOver() ? UI_GAME_OVER : UI_IDLE;

function handleUpdatePlayerState (payload, callback) {
	callback();
	console.log(payload.playerState);
  if (!payload.playerState)
    return console.warn('Player state not provided in request payload');
  if (payload.playerState.version < globalPlayerState.version)
    return console.warn(`Ignoring out of state playerState version (${payload.playerState.version})`);
  if (payload.playerState.gameId != globalPlayerState.gameId)
    return console.warn(`Ignoring playerState for unrecognized game (${payload.playerState.gameId})`);
  globalPlayerState = payload.playerState;
	savePlayerStateToLocalStorage(globalPlayerState);
	if (isGameOver())
		handleGameOver();
  renderUIState();
}

function renderUIState (UIState = getUIStateFromPlayerState()) {
	if (UIState == globalUIState)
		return;
	if (globalUIState == UI_PLAY_TURN && UIState != UI_SUBMIT_TURN)
		return;
	if (globalUIState == UI_JOIN && UIState != UI_SUBMIT_JOIN)
		return;

	[UI_SUBMIT_JOIN, UI_SUBMIT_TURN].includes(globalUIState) ? disableForms() : enableForms();

	if (UIState == UI_PLAY_TURN)
		renderPlayTurnForm();

	globalUIState = UIState;
	
	[UI_JOIN, UI_SUBMIT_JOIN, UI_GAME_OVER].includes(globalUIState) ? getJoinGameForm().show() : getJoinGameForm().hide();
	[UI_IDLE, UI_GAME_OVER].includes(globalUIState) ? getIdleMessageBox().show() : getIdleMessageBox().hide();
  [UI_PLAY_TURN, UI_SUBMIT_TURN].includes(globalUIState) ? getPlayTurnForm().show() : getPlayTurnForm().hide();
}

function handleGameOver() {
  removePlayerStateFromLocalStorage();
  getIdleMessageBox().html('The game is over!');
  getGameIdInput().val('');
	resetPlayerState();
}

function renderPlayTurnForm(playerState = globalPlayerState) {
	$('.player-action-option').remove();

  let e = getEvent(playerState.ask.playerAction, playerState);

	getIdleMessageBox().html(e.info);

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

	activateButtonAfterDelay($('.player-action-submit button'), e.buttonDelay, e.button);

}

function setError(err = '') {
  if (err) {
    getErrorMessageBox().html(err);
    getErrorMessageBox().show();
  } else {
    getErrorMessageBox().hide();
  }
}

function getEvent(eventName, playerState = player) {
	let defaultEvent = {
		headline: playerState.ask.question,
		info: 'Done for now! Waiting on other players...',
		body: '',
		button: playerState.ask.options.length == 1 ? playerState.ask.options[0].text : 'Submit',
		buttonDelay: 0,
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

function activateButtonAfterDelay(buttonElem, delaySeconds, doneText) {
	buttonElem.prop('disabled', delaySeconds >= 1);
	if (delaySeconds >= 1) {
		buttonElem.html(`Wait (${delaySeconds})...`);
		setTimeout(activateButtonAfterDelay, 1000, buttonElem, delaySeconds - 1, doneText);
	} else {
		buttonElem.html(doneText);
	}
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