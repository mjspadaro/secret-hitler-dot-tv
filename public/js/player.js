
var socket = io();

socket.on('hello', onHello);
socket.on('disconnect', function (socket) { setError('Error: unable to connect to server.'); disableForms(); });	

var player = {name: localStorage.getItem('playerName'), id: localStorage.getItem('playerId'), gameStarted: false};
var gameId = localStorage.getItem('gameId');

const events = {

	confirmRole: function (p) {
		
		let headline = p.role == 'hitler' ? `You are <em>Hitler</em>.` : `You are a <em>${escapeHtml(p.role)}</em>.`;
		let body = '';
		if (p.hitlerName) {
			body += ` <em>${escapeHtml(p.hitlerName)}</em> is Hitler.`;
		}
		switch (p.fascistNames.length) {
		case 0:
			if (p.role == 'hitler') {
				body += ` Everyone else's identity is a <em>secret</em>'. Good luck!`;
			} else if (p.role == 'fascist') {
				body += ` There are no other fascists. Good luck!`;
			} else {
				body += ` Everyone else's identity is a <em>secret</em>. Good luck!`;
			}
			break;
		case 1:
			body += ` <em>${escapeHtml(p.fascistNames[0])}</em> is also a fascist. Everyone else is a liberal.`;
			break;
		case 2:
			body += ` <em>${escapeHtml(p.fascistNames[0])}</em> and <em>${escapeHtml(p.fascistNames[1])}</em> are also fascists. Everyone else is a liberal.`;
			break;
		case 3:
			body += ` <em>${escapeHtml(p.fascistNames[0])}</em>, <em>${escapeHtml(p.fascistNames[1])}</em>, and <em>${escapeHtml(p.fascistNames[2])}</em> are also fascists. Everyone else is a liberal.`;
			break;
		}
		
		return { headline: headline, body: body, button: 'Got it!' };	
	},
	
	startGame: {
		headline: 'You are the host.',
		body:  '<em>Wait</em> for all players to join before starting the game.',
		button: 'Start Game',
	},
	
	confirmInvestigate: (p) => ({
		headline: 'Investigation results:',
		body: `${p.investigationTarget} is a member of the <em>${p.investigationResult}</em> party.`,
		button: 'Got it!',
	}),
	
	discard: {
		headline: "Choose a policy to <em>discard</em>.",
		button: 'Discard Policy',
	},
	
	enactPolicy: (p) => ({
		headline: "Choose a policy to <em>enact</em>.",
		body: p.ask.options.length < 3 ? "" : "Alternatively, you could propose to <em>veto</em> this agenda." +
		"If the president approves your motion, the agenda will be tossed out and no policy will be passed during this legislative session.",
		button: p.ask.options.length == 3 ? 'Submit' : 'Enact Policy',
	}),
	
	confirmPolicyPeek: (p) => ({
		headline: "You have the power of <em>policy peek</em>. Here is a peek at the next three cards in the policy deck:",
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
	
	$('#player-action-submitted').val("true");
	

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
	this.setInfo('The game is over!', true);
	gameId = '';
	$('#game-id').val('');
	enableForms();
	$('#join-game').show();
}

function getEvent(eventName, playerState = player) {
	let defaultEvent = {
		headline: playerState.ask.question,
		info: 'Done for now! Waiting on other players.',
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

function updatePlayerState(playerState) {

		console.log(playerState);
		player = playerState;

		$('#join-game').hide();		
		
		if (!player.gameOver) {
			localStorage.setItem('playerId', playerState.id);
			localStorage.setItem('gameId', gameId);
			localStorage.setItem('playerName', playerState.name);		
		} else {
			onGameOver(playerState);
		}	
		
		document.title = `Secret Hitler dot TV - ${escapeHtml(playerState.name)} - ${gameId}`;
		
		if (playerState.ask.complete) {
			$('#player-action').hide();
			$('#player-action-submitted').val("true");
		} // only render the question box if the last form has been submitted
		else if ($('#player-action-submitted').val() == "true") {
			
			enableForms();
			
			// reset the form- set submitted to false and remove option list
			$('#player-action-submitted').val("false");
			$('.player-action-option').remove();
			
			$('#player-info').hide();
			
			let e = getEvent(playerState.ask.playerAction, playerState);
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
		}
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

function onHello(id = player.id, callback) {
	setError();
	console.log(`Server: hello ${id}`);
	if (!player.id) {
		player.id = id;
		localStorage.setItem('playerId', id);
		console.log(`Controller: setting clientId = ${id}`);
	}
	callback(player.id);
	enableForms();
}

function afterJoinGame(playerState, err = 'Error: unable to join.') {
	enableForms();
	if (playerState) {
		// only show this if the game hasn't started
		if (!player.gameStarted) {
			setInfo("You're in! Waiting for more players to join...");
			$('#player-info').show();
		}
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
		$('#player-action-submitted').val("true");
		socket.emit('play', playerAction, data, afterPlay);	
	} else {
		setError("Please select an option to proceed.");
		enableForms();
	}
}

function afterPlay(success = true, msg = 'Error: there was a problem, please try again.') {

	if (success) {
		
		console.log('Play successful.');
		
		if ($('#player-action-submitted').val() == "true") {
			$('#player-info').html('Done for now! Waiting for other players.');
			$('#player-info').show();
			$('#player-action').hide();
		}

	} else {
		setError(msg);
		updatePlayerState(player);
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
