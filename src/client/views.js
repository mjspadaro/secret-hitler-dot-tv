"use strict";

// this is a bit of a hack, because the current structure doesn't let us get textures to the helper classes
// in the future, this should probably be handled by a "component" class or something like that
// that can be instanced by the view and reused across views

var resources;


// a wrapper container for all game views- handle resizing, tiled background, and show/hide events

class GameView extends PIXI.Container {
	
	constructor (zIndex = 1) {
		
		super();
		
		this.sortableChildren = true;
		
		this.background = new PIXI.Container();
		this.background.zIndex = zIndex - 0.01;
		this.resources = {};
		
		this.zIndex = zIndex;
		
		this.transitions = [];
		
		this.background.visible = false;
		this.visible = false;
		this.loaded = false;
				
	}
	
	resize (width, height) {
		
		let xScale = width / nativeResolution.width;
		let yScale = height / nativeResolution.height;

		let scale = Math.min(xScale, yScale);

		// adjust background image tiling
		for (let c of this.background.children) {
			c.height = height;
			c.width = width;
		}
			
		this.scale.x = scale;
		this.scale.y = scale;
		this.x = (width - nativeResolution.width * scale) / 2;
		this.y = (height - nativeResolution.height * scale) / 2;

		return this;		
	}
	
	startTransitions(callback = () => true) {
		if (this.transitions.length == 0) {
			this.onTransitionComplete(callback);
		}
		for (let t of this.transitions) {
			t.setCallback(function () { this.onTransitionComplete(callback); }.bind(this));
			t.start();
		}
	}
	
	onTransitionComplete(callback) {
		let waitingOn = this.transitions.filter(t => !t.isComplete());
		if (waitingOn.length == 0) {
			this.transitions = [];
			if (!this.loaded) {
				this.unload();
			}
			console.log(`${this.constructor.name}: Transitions complete.`);
			callback();
		}
	}
	
	addTransition(t) {
		let i = this.transitions.push(t) - 1;
		return this.transitions[i];
	}
	
	hide () {
		this.background.visible = false;
		this.visible = false;
	}
	
	show () {
		this.background.visible = true;
		this.visible = true;
	}
	
	update (e) {

	}
	
	load (e) {
		this.loaded = true;
		this.show();
	}
	
	unload () {
		this.loaded = false;
		// view won't be hidden until after transitions are cleared
		// unload is also called with onTransitionComplete if this.loaded = false
		if (this.transitions.length == 0) {
			this.hide();
			for (let i = this.children.length - 1 ; i >= 0 ; i--) {
				this.children[i].destroy();
			}
			for (let i = this.background.children.length - 1 ; i >= 0 ; i--) {
				this.background.children[i].destroy();
			}
		}
	}
	
}

// lightbox view hides table elements but keeps logo and status info
class LightboxView extends GameView {

	constructor (headlineText = "") {
	
		super(2);
					
	}

	load () {
		
		super.load();
		this.background.addChild(new PIXI.TilingSprite(this.resources.backgroundLightbox.texture, window.innerWidth, window.innerHeight));
		
		
		this.cards = new DistributedGridContainer([], { width: 1225, height: 525, transition: 'none' });
		this.cards.x = 300;
		this.cards.y = 300;
	
		this.headline = new PIXI.Text('', {
			fontFamily: "Futura-Medium",
			fontSize: 42,
			fill: palette.beige,
			wordWrap: true,
			wordWrapWidth: 1225, // 1350,
			align: "left",
		});
	
		this.headline.x = 300; // 150;
		this.headline.y = 200;
		this.headline.anchor.x = 0;
		this.headline.anchor.y = 0.5;
	
		this.addChild(this.cards);
		this.addChild(this.headline);
	
		this.cardTransition = new PixiTransition();
			
	}

	addCard(textureFront, textureBack, labelText = "") {
		let c = new LightboxCard(textureFront, textureBack, labelText);
		//c.anchor.x = 0.5;
		this.cards.addChild(c);
		this.cards.arrange();
		
		c.scale.x = 0;
		
		let transition = new TransitionScale(c);
			
		// append the card to any existing card transitions to reveal the cards sequentially
		if (typeof this.cardTransition === 'undefined') {
			this.cardTransition = this.addTransition(transition);
		}
		else if (this.cardTransition.isComplete()) {
			this.cardTransition = this.addTransition(transition);
		} else {
			this.cardTransition.then(transition);
		}
	
		return(c);
	}

	setHeadline(text = '') {
		this.headline.text = "";
		let transition = new TransitionType(this.headline, { text: text });
		this.addTransition(transition);
		return transition;
	}

	removeCard(c) {
		c.destroy();
		//this.updateSpacing();
	}

	clear() {
		this.headline.text = "";
		let numCards = this.cards.children.length;
		for (let i = this.cards.children.length - 1 ; i >= 0 ; i--) {
			this.cards.removeChild(this.cards.children[i]);
		}
		//this.updateSpacing();
	}

}


// START VIEW CLASSES

const VIEW_CLASSES = [
	
	class TableView extends GameView {
	
		constructor () {
			super(1);
				
		}
	
		load () {
		
			super.load();
			
			this.background.addChild(new PIXI.TilingSprite(this.resources.background.texture, window.innerWidth, window.innerHeight));
			
			this.boardFascist = new Board(FASCIST_VALUE);
			this.boardFascist.x = 450;
			this.boardFascist.y = 150;
		
			this.boardLiberal = new Board(LIBERAL_VALUE);
			this.boardLiberal.x = 450;
			this.boardLiberal.y = 550;
		
			let statusBg = new PIXI.Sprite(this.resources.statusBackground.texture);
			statusBg.x = 375;
			statusBg.y = 25;
		
			this.addChild(statusBg);
			this.addChild(this.boardFascist);		
			this.addChild(this.boardLiberal);
		
			let pileDiscardHolder = new PIXI.Sprite(this.resources.pileDiscard.texture);	
			pileDiscardHolder.x = 1377;
			pileDiscardHolder.y = 175;
			this.pileDiscard = new CardPile(this.resources.policyBack.texture, 0, 2, 2);
			this.pileDiscard.x = 22;
			this.pileDiscard.y = 22;
			pileDiscardHolder.addChild(this.pileDiscard);
			this.addChild(pileDiscardHolder);

			let pileDrawHolder = new PIXI.Sprite(this.resources.pileDraw.texture);	
			pileDrawHolder.x = 1377;
			pileDrawHolder.y = 625;
			this.pileDraw = new CardPile(this.resources.policyBack.texture, 0, 2, 2);
			this.pileDraw.x = 22;
			this.pileDraw.y = 22;
			pileDrawHolder.addChild(this.pileDraw);
			this.addChild(pileDrawHolder);
		
			this.headlineBox = new PIXI.Sprite(this.resources.tableHeadlineBackground.texture);
			this.headlineBox.x = 300;
			this.headlineBox.y = 425;
			this.headlineBox.visible = false;
			this.headlineText = new PIXI.Text('', {
				fontFamily: "Futura-Medium",
				fontSize: 42,
				fill: palette.beige,
				wordWrap: true,
				wordWrapWidth: 1200,
				align: "left",
			});
			this.headlineText.anchor.y = 0.5;
			this.headlineText.x = 25;
			this.headlineText.y = 75;
			this.headlineText.visible = true;
			this.headlineBox.addChild(this.headlineText);
			this.addChild(this.headlineBox);
						
		}
	
		setHeadline(text = '') {
			this.headlineText.text = "";
			let transition = new TransitionType(this.headlineText, { text: text });
			this.addTransition(transition);
			return transition;
		}
	
		onBeforeNomination (e) {
			let president = e.state.players.find(p => p.isPresident);
			this.setHeadline(`${president.name} is now President.`);
			this.headlineBox.visible = true;
		}
		
		onStartNomination (e) {
			this.headlineBox.visible = false;
		}
		
		onStartPresidentLegislativeSession (e) {
			let president = e.state.players.find(p => p.isPresident);
			this.setHeadline(`${president.name}: Draw 3 policy cards.`);
			this.headlineBox.visible = true;
		}
		
		onDrawPolicies (e) {
			this.headlineBox.visible = false;
		}
		
		onStartChancellorLegislativeSession (e) {
			this.headlineBox.visible = false; // in case we are returning here after veto denied
		}
		
		onDiscard (e) {

		}
		
		onProposeVeto (e) {
			let chancellor = e.state.players.find(p => p.isChancellor);
			let president = e.state.players.find(p => p.isPresident);
			this.setHeadline(`${chancellor.name} has proposed to veto this agenda. ${president.name} may approve or deny the veto motion.`);
			this.headlineBox.visible = true;
		}
		
		onGiveVetoConsent(e) {
			let president = e.state.players.find(p => p.isPresident);				
			let decision = e.data == 1 ? 'approved' : 'denied';
			this.setHeadline(`${president.name} has ${decision} the motion to veto this agenda.`)
				.then(new TransitionPause())
				.then(new TransitionHide(this.headlineBox));
		}
		
		onEnactPolicy (e) {
			let policyType = e.state.agenda[0].toUpperCase();

			if (e.state.agenda[0] == 'fascist') {
				var board = this.boardFascist;
				var i = e.state.fascistScore - 1;
			} else if (e.state.agenda[0] == 'liberal'){
				var board = this.boardLiberal;
				var i = e.state.liberalScore - 1;
			}
			
			let policyBoardCard = board.policies.getChildAt(i);
			policyBoardCard.scale.x = 0;
			policyBoardCard.visible = true;
			let policyBoardTransition = new TransitionScale(policyBoardCard);
			
			this.headlineBox.visible = true;
			this.setHeadline(`A ${policyType} policy was passed.`).and(policyBoardTransition).then(new TransitionPause());
		}
		
		onBeforePolicyPeek (e) {
			let president = e.state.players.find(p => p.isPresident);
			this.setHeadline(`${president.name} now has the power to peek at the next three policies.`);
			
		}
		
		onBeforeSpecialElection (e) {
			let president = e.state.players.find(p => p.isPresident);
			this.setHeadline(`${president.name} now has the power to call a special election.`);			
		}
		
		onBeforeInvestigation (e) {
			let president = e.state.players.find(p => p.isPresident);
			this.setHeadline(`${president.name} now has the power to investigate another player's party loyalty.`);			
		}
		
		onBeforeExecution (e) {
			let president = e.state.players.find(p => p.isPresident);
			this.setHeadline(`${president.name} now has the power to execute another player.`);			
		}
	
		update (e) {

			this.boardFascist.update(e);
			this.boardLiberal.update(e);
			this.pileDiscard.cardCount = 17 - e.state.fascistScore - e.state.liberalScore - e.state.policyDeck.length - e.state.agenda.length;
			this.pileDraw.cardCount = e.state.policyDeck.length;
		
			return this;
		}
	
	},

	class ControlPanelView extends GameView {
		constructor () {
			super(4);
		}
		load (e) {
			super.load();
			let versionLabel = new PIXI.Text('secrethitler.tv - version ' + document.getElementById('app-version').value, {
				fontFamily: "Futura-Medium",
				fontSize: 15,
				fill: palette.beige,
			});
			versionLabel.anchor.x = 1;
			versionLabel.anchor.y = 1;
			versionLabel.x = 1575;
			versionLabel.y = 875;
			this.addChild(versionLabel);
		}
	},

	class PlayerListView extends GameView {

		constructor () {
	
			super(3);
			this.avatars = [];

		}
		
		load (e) {
			super.load(e);
			this.update(e);
			
		}

		addPlayer (player) {
			let avatar = new Avatar(player);
			this.addChild(avatar);
			this.avatars.push(avatar);
			return avatar;
		}
		
		onNominateChancellor (e) {
			let nominee = e.state.players.find(p => p.isNominee);
			this.avatars[nominee.order].update(nominee);
		}

		onDrawPolicies (e) {

			this.agendaBox = new PIXI.Sprite(this.resources.agendaBox.texture);
			this.agendaBox.x = 263;
			this.agendas = new PIXI.Container();
			this.agendas.scale.x = 0.55;
			this.agendas.scale.y = 0.55;
			this.agendas.y = 18;
			this.agendas.x = 36;
			this.agendaBox.addChild(this.agendas);
			this.addChild(this.agendaBox);

			let president = e.state.players.find(p => p.isPresident);

			this.agendaBox.y = this.avatars[president.order].y;

			let xOffset = 0;
			
			let transition = new PixiTransition();
			
			for (let a of e.state.agenda) {
				let policyTexture = this.resources['policy' + a.charAt(0).toUpperCase() + a.slice(1)].texture;
				let card = new LightboxCard(this.resources.policyBack.texture, policyTexture);
				card.x = xOffset;
				xOffset += 38;
				card.scale.x = 0;
				this.agendas.addChild(card);
				transition.then(new TransitionScale(card));
			}
			this.addTransition(transition);
		}
		
		onDiscard(e) {
			let discardIndex = parseInt(e.data);
			let discarded = this.agendas.children[discardIndex];
			let transition = new TransitionScale(discarded, {endScaleX: 0})
				.then(new TransitionDestroy(discarded));
			this.addTransition(transition);
		}
		
		onStartChancellorLegislativeSession(e) {
			let chancellor = e.state.players.find(p => p.isChancellor);
			this.agendaBox.y = this.avatars[chancellor.order].y;
		}
	
		onEnactPolicy(e) {	
			let chancellor = e.state.players.find(p => p.isChancellor);
			// discard the one that wasn't passed
			let discardIndex = parseInt(e.data) == 0 ? 1 : 0;
			let passIndex = parseInt(e.data) == 0 ? 0 : 1;
			let policyType = e.state.agenda[0].toUpperCase();
			let discarded = this.agendas.children[discardIndex];
			let transition = new TransitionScale(discarded, {endScaleX: 0})
				.then(new TransitionDestroy(discarded))
				.then(new TransitionPause())
				.then(this.agendas.children[passIndex].flip())
				.then(new TransitionPause())
				.then(new TransitionDestroy(this.agendaBox));
			this.addTransition(transition);
		}
		
		onProposeVeto(e) {	
			this.agendaBox.visible = false;
		}
		
		onGiveVetoConsent(e) {
			let president = e.state.players.find(p => p.isPresident);				
			if (e.data == 1) {
				// approved
				this.agendaBox.destroy();
			} else {
				// denied
				this.agendaBox.visible = true;				
			}
		}

		updateHighlight (e) {
			
		}

		update (e) {
			
			let offsetY = 175;
			let state = e.state;
			let ySpacing = 575 / state.players.length;
			for ( let i = 0 ; i < state.players.length ; i++ ) {
				let player = state.players[i];
				if (i >= this.avatars.length) {
					var avatar = this.addPlayer(player);
				} else {
					var avatar = this.avatars[i];
					avatar.update(player);
				}
				avatar.y = i * ySpacing + offsetY;
				if (player.isChancellor || player.isPresident || player.isNominee) {
					offsetY = offsetY + Math.max(0, 100 - ySpacing);
				}
				if (!player.ask.complete) {
					avatar.x = 50;
				} else {
					avatar.x = 25;
				}
			}
		}

	},

	class StatusView extends GameView {
	
		constructor () {
		
			super(3);

		}
	
		load (e) {
		
			super.load();
		
			let logo = new PIXI.Sprite(this.resources.logo.texture);
			logo.scale.x = 0.25;
			logo.scale.y = 0.25;
			logo.x = 50;
			logo.y = 50;
			this.addChild(logo);

			let statusFg = new PIXI.Sprite(this.resources.statusForeground.texture);
			statusFg.x = 425;
			statusFg.y = 50;
			this.addChild(statusFg);
		
			// the 4th (optional) breadcrumb for executive actions
			this.breadcrumb4 = new PIXI.Text('EXECUTIVE ACTION', bcTextStyle);
			this.breadcrumb4.x = 1100;
			this.breadcrumb4.y = 85;
			let bc4img = new PIXI.Sprite(this.resources.breadcrumb4.texture);
			bc4img.y = -35;
			bc4img.x = -200;
			this.breadcrumb4.addChild(bc4img);
			this.breadcrumb4.visible = false;
			this.addChild(this.breadcrumb4);

			let breadcrumbs = ['NOMINATION', 'ELECTION', 'LEGISLATION'];
		
			for (let i = 0 ; i < breadcrumbs.length ; i++) {
				let label = new PIXI.Text(breadcrumbs[i], bcTextStyle);
				label.x = 425 + 225 * i;
				label.y = 85;
				this.addChild(label);
			}
			
			this.breadcrumbTracker = new PIXI.Sprite(this.resources.breadcrumbTracker.texture);
			this.breadcrumbPositions = [424, 649, 874, 1099]
			this.breadcrumbTracker.y = 49;
			this.breadcrumbTracker.x = this.breadcrumbPositions[0];
			this.addChild(this.breadcrumbTracker);

			this.fascistScoreMarkers = [];
			this.liberalScoreMarkers = [];

			for (let i = 0 ; i < 6 ; i++) {
				let marker = new PIXI.Sprite(this.resources.fascistScore.texture);
				marker.x = i * this.resources.fascistScore.texture.width + 1300;
				marker.y = 80;
				this.addChild(marker);
				this.fascistScoreMarkers.push(marker);
			}
			for (let i = 0 ; i < 5 ; i++) {
				let marker = new PIXI.Sprite(this.resources.liberalScore.texture);
				marker.x = i * this.resources.liberalScore.texture.width + 1425;
				marker.y = 80;
				this.addChild(marker);
				this.liberalScoreMarkers.push(marker);			
			}
			
		
		
		}
		
		updateBreadcrumbs (e) {
			
			// update the breadcrumb tracker
			switch (e.eventName) {
			case 'beforeNomination':
				this.breadcrumbTracker.x = this.breadcrumbPositions[0];
				if (e.state.nextExecutiveAction) {
					this.breadcrumb4.text = e.state.nextExecutiveAction;
					this.breadcrumb4.visible = true;
				} else {
					this.breadcrumb4.visible = false;
				}
				break;
			case 'beforeElection':
				this.breadcrumbTracker.x = this.breadcrumbPositions[1];
				break;
			case 'startPresidentLegislativeSession':
				this.breadcrumbTracker.x = this.breadcrumbPositions[2];
				break;
			case 'beforePolicyPeek':
				this.breadcrumbTracker.x = this.breadcrumbPositions[3];
				break;
			case 'beforeSpecialElection':
				this.breadcrumbTracker.x = this.breadcrumbPositions[3];
				break;
			case 'beforeInvestigation':
				this.breadcrumbTracker.x = this.breadcrumbPositions[3];
				break;
			case 'beforeExecution':
				this.breadcrumbTracker.x = this.breadcrumbPositions[3];
				break;								
			}
			
		}
	
		updateScore (e) {

			
			// update the score markers
			for (let i = 0 ; i < 6 ; i++) {
				this.fascistScoreMarkers[i].texture = i < e.state.fascistScore ? this.resources.fascistScoreFilled.texture : this.resources.fascistScore.texture;
			}
			for (let i = 0 ; i < 5 ; i++) {
				this.liberalScoreMarkers[i].texture  = i < e.state.liberalScore ? this.resources.liberalScoreFilled.texture : this.resources.liberalScore.texture;
			}		
		}
	},

	class LobbyView extends LightboxView {
	
		constructor () {
			super("Connecting to server...");

		}
		
		load (e) {
			super.load(e);
			this.cards.x = (1600 - this.cards.options.width) / 2;
			this.headline.x = 800;
			this.headline.wordWrapWidth = 1600;
			this.headline.anchor.x = 0.5;
		}
	
		onHostNewGame (e) {
			
			let host = document.location.host == "app.secrethitler.tv" ? "secrethitler.tv" : document.location.host;
			
			this.setHeadline(`To join, go to ${host} and enter game code: ${e.state.id}`);
			for (let p in e.state.players) {
				this.addCard(this.resources.playerFolder.texture, this.resources.playerFolder.texture, p.name);			
			}
		}
	
		onJoinGame (e) {
			this.addCard(this.resources.playerFolder.texture, this.resources.playerFolder.texture, e.playerName);
		}
	
	},

	class StartGameView extends LightboxView {
	
		constructor () {
			super();
		}
	
		load (e) {
			super.load(e);
			this.setHeadline("Do not show this to anyone!");
			let transition;
			for (let p of e.state.players) {			
				let c = this.addCard(this.resources.roleBack.texture, this.resources.roleBack.texture, p.name);
			}
		}
	
	},

	class NominationView extends LightboxView {
	
		constructor () {
			super();
		
		}
	
		load (e) {	
			super.load(e);
			let president = e.state.players.find(p => p.isPresident);			
			this.setHeadline(`${president.name} will now nominate a candidate for chancellor.`);
			for (let o of president.ask.options) {
				this.addCard(this.resources.playerFolder.texture, this.resources.playerFolder.texture, o.text);
			}
		}
	
		onNominateChancellor(e) {
			let president = e.state.players.find(p => p.isPresident);			
			let nominee = e.state.players.find(p => p.isNominee);			
			this.clear();
			let headline = `${nominee.name} has been nominated for Chancellor. ${president.name} will start the election when everyone is ready.`;
			
			this.setHeadline(headline);
			this.addCard(this.resources.playerFolder.texture, this.resources.playerFolder.texture, nominee.name);
		}
	
	},

	class ElectionView extends LightboxView {
	
		constructor () {
			super();
		
		}
	
		load (e) {
			super.load(e);		
			let president = e.state.players.find(p => p.isPresident);
			let nominee = e.state.players.find(p => p.isNominee);
			this.setHeadline(`Cast your vote for ${president.name} as president and ${nominee.name} as chancellor.`);
		}
	
	
		onVote (e) {
			let textureBack = e.data == 1 ? this.resources.ballotJa.texture : this.resources.ballotNein.texture;
			this.addCard(this.resources.ballotBack.texture, textureBack, e.playerName);
		}	
	
		onTallyElection(e) {
			this.headline.text = "";
			let transition = new PixiTransition();
			for (let c of this.cards.children) {
				transition.then(c.flip());
			}
			let resultText = e.data == 1 ? "The election passes!" : "The election fails!";
		
			transition.then(new TransitionPause())
				.then(new TransitionType(this.headline, { text: resultText }))
				.then(new TransitionPause());
			
			this.addTransition(transition);
		}

	
	
	},

	class ChaosView extends LightboxView  {
	
		constructor () {
			super();
		
		}
	
		load (e) {
			super.load(e);
			let president = e.state.players.find(p => p.isPresident);
			this.setHeadline(`Chaos ensues! ${president.name} must now draw the top policy and enact it immediately.`);
		}

		onDrawChaosCard(e) {
			
			/// !!!! NEED TO FIX BELOW- ALWAYS FASCIST
			
			let policyTexture = this.resources.policyFascist.texture;	
			let c = this.addCard(this.resources.policyBack.texture, policyTexture);
			this.cardTransition.then(new TransitionPause())
				.then(c.flip())
				.then(new TransitionPause());
		}
	
	},

	class ExecutionView extends LightboxView  {
	
		constructor () {
			super();
		
		}
	
		load (e) {	
			super.load(e);
			let president = e.state.players.find(p => p.isPresident);
			this.setHeadline(`${president.name} must now execute a player.`);
			for (let o of president.ask.options) {
				this.addCard(this.resources.playerFolder.texture, this.resources.playerFolder.texture, o.text);
			}	
		}

		onExecutePlayer(e) {
			let executedPlayer = e.state.players[e.data];	
			this.setHeadline(`${executedPlayer.name} has been executed.`).then(new TransitionPause());
		}
	
	},

	class PolicyPeekView extends LightboxView  {
	
		constructor () {
			super();
		
		}
	
		load (e) {	
			super.load(e);
			let president = e.state.players.find(p => p.isPresident);
			this.setHeadline(`${president.name} will now peek at the top 3 policies from the draw pile.`);
			for (let i = 0 ; i < 3 ; i ++) {
				this.addCard(this.resources.policyBack.texture, this.resources.policyBack.texture);
			}
		}

		onConfirmPolicyPeek(e) {	
				// don't really need to do anything here
		}
	
	},
	
	class SpecialElectionView extends LightboxView  {
	
		constructor () {
			super();
		
		}
	
		load (e) {	
			super.load(e);
			let president = e.state.players.find(p => p.isPresident);
			this.setHeadline(`${president.name} will appoint the next president and call a special election.`);
			for (let o of president.ask.options) {
				this.addCard(this.resources.playerFolder.texture, this.resources.playerFolder.texture, o.text);
			}	
		}

		onCallSpecialElection(e) {
			let specialPresident = e.state.players[e.data];	
			this.setHeadline(`${specialPresident.name} has been appointed as president.`);
			this.addTransition(new TransitionPause());
		}
	
	},

	class InvestigationView extends LightboxView  {
	
		constructor () {
			super();
		
		}
	
		load (e) {	
			super.load(e);
			let president = e.state.players.find(p => p.isPresident);
			this.setHeadline(`${president.name} will now investigate the party loyalty of another player.`);
			for (let o of president.ask.options) {
				this.addCard(this.resources.partyBack.texture, this.resources.partyBack.texture, o.text);
			}	
		}

		onInvestigate(e) {
			let president = e.state.players.find(p => p.isPresident);			
			let investigatedPlayer = e.state.players[e.data];	
			this.clear();
			this.setHeadline(`${president.name} has opened an investigation into ${investigatedPlayer.name}'s party loyalty.`);
			this.addTransition(new TransitionPause());
		}
	
		onConfirmInvestigate(e) {	
			this.clear();
			this.setHeadline(`The investigation is complete!`);
			this.addTransition(new TransitionPause());
		}
	
	},
		
	class EndGameView extends LightboxView  {
	
		constructor () {
			super();
		
		}
	
		load (e) {	
			super.load(e);
			this.setHeadline(`The game is over! The ${e.state.winner.toUpperCase()}S win!`);
			for (let p of e.state.players) {
				let roleTexture = this.resources['role' + p.role.charAt(0).toUpperCase() + p.role.slice(1)].texture;
				let c = this.addCard(roleTexture, roleTexture, p.name);
			}	
		}
	
	},
/**STUB****************
	
	class StubView extends LightboxView  {
	
		constructor () {
			super();
		
		}
	
		load (e) {	
			super.load(e);
			this.setHeadline(``);

		}

		onEventName2(e) {	

		}
	
		onEventName3(e) {	

		}
	
	},

*******************/
];

// END VIEW CLASSES

class GameRenderer {
	
	constructor () {
		
		this.app = new PIXI.Application();
		this.app.stage.sortableChildren = true;
		
		this.views = [];
		
		// a bit of a hack - see global variable definition
		resources = this.app.loader.resources;
		
		this.loadProgress = new PIXI.Text('', {
			fontFamily: "Futura-Medium",
			fontSize: 18,
			fill: palette.beige,
			wordWrap: true,
			wordWrapWidth: 1225, // 1350,
			align: "left",
		});
		
		this.loadProgress.visible = false;
		this.loadProgress.x = 100;
		this.loadProgress.y = 100;
		
		this.app.stage.addChild(this.loadProgress);
	}
	
	preload (assets = []) {
		this.app.loader.baseUrl = ASSET_BASE_URL;

		for (let a of assets) {
			this.app.loader.add(this.hyphenToCamelCase(a), `${a}.png`);
		}

		this.app.loader.onStart.add(this.onPreloadStart.bind(this));
		this.app.loader.onProgress.add(this.onPreloadProgress.bind(this));
		this.app.loader.onComplete.add(this.onPreloadComplete.bind(this));
		this.app.loader.onError.add(this.onPreloadError.bind(this));

		this.app.loader.load();
	}
	
	onPreloadStart (e) {
		console.log(`Preload started`);
		this.loadProgress.visible = true;
		this.loadProgress.text = `Loading... 0%`;
	}
	
	onPreloadProgress(e) {
		console.log(`Preloading ${Math.round(e.progress)}%`);
		this.loadProgress.text = `Loading... ${Math.round(e.progress)}%`;

	}

	onPreloadComplete(e) {
		this.loadProgress.visible = false;
	}

	onPreloadError(e) {
		console.log(`Preload error`);
		this.loadProgress.text = `Loading... ERROR during preload.`;
	}

	initViews () {
		this.loadProgress.visible = false;
		for (let VClass of VIEW_CLASSES) {
			let view = new VClass();
			view.resources = this.app.loader.resources;
			this.app.stage.addChild(view.background);
			this.app.stage.addChild(view);
			this.views.push(view);
		}
	}

	hyphenToCamelCase (hyphenString) {

		var arrHyphenString = hyphenString.split('-');
		var camelString = "";

		for (let i = 0; i < arrHyphenString.length; i++) {
			if (i > 0) {
				camelString += arrHyphenString[i].charAt(0).toUpperCase() + arrHyphenString[i].slice(1);
			} else {
				camelString += arrHyphenString[i];
			}
		}

		return camelString;

	}
	
	render (view, method, data, callback, synchronous = true) {
		
		if (typeof view[method] == 'function') {
			
			console.log(`${view.constructor.name}.${method}: Render ${data.eventName} (sync=${synchronous})`)
			
		  if (method != 'load' && method != 'unload' && !view.loaded) {
				console.warn(`Warning: ${view.constructor.name} was not loaded before ${view.constructor.name}.${method}`);
	 		}
			
		  if (method == 'load' && view.loaded) {
				console.warn(`Warning: ${view.constructor.name} was already loaded before ${view.constructor.name}.${method}`);
	 		}
			
			view[method](data);
			
			
			// the code below was added to improve AI timing but suspect it may be causing an error in some instances
			// commenting out until this can be tested more thoroughly- possible bug reported running on Chrome/Mac
			/*if (view.transitions.length > 0) {
				// add a pause to the transition queue of this was a play made by an AI - keeps the game from moving forward too quickly
				let player = data.state.players.find(p => p.id === data.playerId);
				if (player) {
					if (player.isAI) {
						console.log('Renderer: Adding pause to transition for AI player.');
						view.addTransition(new TransitionPause());
					}
				}
			} */
			
			if (method == 'load') {
				view.resize(this.app.renderer.width, this.app.renderer.height);
			}
			// start transitions, if applicable
			if (synchronous) {
				view.startTransitions(callback);
			} else {
				view.startTransitions();
				callback(data);
			}
			
		} else {
			console.error(`Error: Unable to render- ${view.constructor.name}.${method} is not a function.`)
			callback(data);
		}
		
	}
	
	resize () {
		for (let v of this.views) {
			v.resize(this.app.renderer.width, this.app.renderer.height);
		}
		return this;
	}
	
}





// HELPER CLASSES BELOW

class CardPile extends PIXI.Container {

	constructor (cardTexture, cardCount, offsetX, offsetY) {
	
		super();
		this.offsetX = offsetX;
		this.offsetY = offsetY;
		this.cardTexture = cardTexture;
		this.cardCount = cardCount;
	
	}

	set cardCount(count) {
	
		let oldCount = this.children.length;
	
		for ( let i = 0 ; i < Math.max(oldCount, count) ; i++ )
		{
			if ( i >= oldCount )
			{
				let card = new PIXI.Sprite(this.cardTexture);
				card.x = i * this.offsetX;
				card.y = i * this.offsetY;
				card.zIndex = i;
				this.addChild(card);
			} else if ( i >= count ) {
				this.children[this.children.length - 1].destroy();
			}
		}
	}
}

class LightboxCard extends PIXI.Sprite {

	constructor(textureFront, textureBack, labelText = "") {
	
		super(textureFront);
		this.textureFront = textureFront;
		this.textureBack = textureBack;
		this.front = true;
	
		this.label = new PIXI.Text(labelText, {
		  fontFamily: "AHAMONO-Monospaced",
			fontSize: 25,
			fill: palette.beige,
		});
	
		this.label.y = this.height + 10;
		this.label.x = this.width / 2;
		this.label.anchor.x = 0.5;
	
		this.addChild(this.label);				
	}

	flip() {
	
		this.newTexture = this.front ? this.textureBack : this.textureFront;
		this.front = false;
	
		let transition = new TransitionFlip(this, this.newTexture);
	
		return transition;
	}

}

class Avatar extends PIXI.Sprite {

	constructor(player) {
		super(resources.playerFolder.texture);
		this.name = player.id;
			
		const style = new PIXI.TextStyle({
		    fontFamily: "AHAMONO-Monospaced",
		    fontSize: 20
		});
	
		this.label = new PIXI.Text(player.name, style);
		this.label.anchor.x = 0.5;
		this.label.y = 25;
		this.label.x = this.width / 2;
		this.addChild(this.label);
		
		this.strikethrough = new PIXI.Sprite(resources.strikethrough.texture);
		this.strikethrough.anchor.x = 0.5;
		this.strikethrough.y = 30;
		this.strikethrough.x = this.width / 2;
		this.strikethrough.visible = false;
		this.addChild(this.strikethrough);
	
		this.highlight = new PIXI.Sprite(resources.playerFolderHighlight.texture);
		this.highlight.anchor.x = 0.5;
		this.highlight.anchor.y = 0.5;
		this.highlight.x = this.width / 2;
		this.highlight.y = this.height / 2;
		this.addChild(this.highlight);
		
		this.presidentMarker = new PIXI.Sprite(resources.president.texture);
		this.presidentMarker.anchor.x = 0.5;
		this.presidentMarker.y = 50;
		this.presidentMarker.x = this.width / 2;
		this.presidentMarker.visible = player.isPresident;
		this.addChild(this.presidentMarker);
	
		this.chancellorMarker = new PIXI.Sprite(resources.chancellor.texture);
		this.chancellorMarker.anchor.x = 0.5;
		this.chancellorMarker.y = 50;
		this.chancellorMarker.x = this.width / 2;
		this.chancellorMarker.visible = player.isChancellor;
		this.addChild(this.chancellorMarker);	
	
	}

	update(player) {
		this.label.text = player.name;
		this.chancellorMarker.visible = player.isChancellor || player.isNominee;
		this.presidentMarker.visible = player.isPresident;
		this.highlight.visible = !player.ask.complete;
		this.strikethrough.visible = !player.isAlive;
	}

}

class Board extends PIXI.Sprite {

	constructor (team = FASCIST_VALUE) {
		super();
	
		this.team = team;
	
		this.overlay = new PIXI.Sprite();
		this.overlay.x = 95;
		this.overlay.y = 93
	
		this.policies = new PIXI.Container();
		this.policies.zIndex = 1;

		this.electionTracker = new PIXI.Sprite(resources.electionTracker.texture);
		this.electionTracker.x = 310;
		this.electionTracker.y = 261;
				
		if (team == FASCIST_VALUE) {
			// fascist board
			this.texture = resources.boardFascist.texture;
			this.policyTexture = resources.policyFascist.texture;			
			this.policies.x = 87;
			this.policies.y = 86;
			this.electionTracker.visible = false;
			this.maxPolicies = 6;
		} else {
			// liberal board
			this.texture = resources.boardLiberal.texture;
			this.policyTexture = resources.policyLiberal.texture;
			this.policies.x = 149;
			this.policies.y = 82;			
			this.overlay.visible = false;
			this.maxPolicies = 5;
		}

		for ( let i = 0 ; i < this.maxPolicies ; i++ ) {
			let policy = new PIXI.Sprite(this.policyTexture);
			policy.x = 124 * i;
			policy.visible = false;
			this.policies.addChild(policy);
		}

		this.sortableChildren = true;
		this.addChild(this.overlay);
		this.addChild(this.electionTracker);
		this.addChild(this.policies);
	
		return this;
	}

	update (e) {
	
		let state = e.state;
	
		// set the board overlay
		switch (state.players.length) {
		case 7:
		case 8:
			this.overlay.texture = resources['board78Player'].texture;
			break;
		case 9:
		case 10:
			this.overlay.texture = resources['board910Player'].texture;
			break;
		default:
			this.overlay.texture = resources['board56Player'].texture;
		}	
	
		// set the number of policies passed
		let score = this.team == FASCIST_VALUE ? state.fascistScore : state.liberalScore;
		for ( let i = 0 ; i < this.maxPolicies ; i++ ) {
				this.policies.getChildAt(i).visible = ( score >= i + 1 );
		}

		this.electionTracker.x = 310 + 84 * state.electionTracker;
	
		return this;
	}

}



class DistributedGridContainer extends PIXI.Container {
	
	constructor (kids = [], options) {
		
		super();
		
		let defaultOptions = {
			width: 500,
			height: 500,
			maxSpacingX: 100,
			maxSpacingY: 200,
			minColumns: 3, // the minimum number of objects you could have before starting a second row
			maxColumns: 5, // the maximum number of objects you could have before starting a second row
			transition: 'slide', // a transition class to use for moving - returns the transition instead
		}
		
		this.options = Object.assign(defaultOptions, options);
				
		for (let k of kids) {
			this.addChild(k);
		}
		
		return this;
	}
	
	arrange () {
		
		let o = this.options;
		let numColumns = o.minColumns;
		// find the optimal number of columns that guarantees the space is most optimally used
		// if start a new row, the row should be as full as possible (most orphans)
		for (let i = o.minColumns ; i <= o.maxColumns && i <= this.children.length ; i++) {
			let orphans = this.children.length % i;
			if (orphans == 0 || orphans > this.children.length % numColumns) {
				numColumns = i;
			}
		}
		
		let numRows = Math.ceil(this.children.length / numColumns);
				
		let rowWidths = [];
		let rowHeights = [];
		let colHeights = [];
		
		for (let r = 0 ; r < numRows ; r++) {
			rowWidths.push(0);
			rowHeights.push(0);
		}
		for (let c = 0 ; c < numColumns ; c++) {
			colHeights.push(0);
		}
		
		for (let r = 0 ; r < numRows ; r++) {
			for (let c = 0 ; c < numColumns && r * numColumns + c < this.children.length ; c++) {
				rowWidths[r] += this.children[r * numColumns + c].texture.width;
				rowHeights[r] = Math.max(rowHeights[r], this.children[r * numColumns + c].height);
				colHeights[c] += this.children[r * numColumns + c].height;
			}
		}
		
		let maxWidth = rowWidths.reduce((a, b) => Math.max(a,b));
		let maxHeight = colHeights.reduce((a, b) => Math.max(a,b));
		
		let xSpacing = numColumns > 1 ? (o.width - maxWidth) / (numColumns - 1) : 0;
		let ySpacing = numRows > 1 ? (o.height - maxHeight) / (numRows - 1) : 0;
		
		let coords = [];
		
		let y = 0;
		for (let row = 0 ; row < numRows ; row++) {
			let x = 0;
			let rowHeight = 0;
			for (var col = 0 ; col < numColumns && row * numColumns + col < this.children.length ; col++) {
				let child = this.children[row * numColumns + col];
				coords.push({x: x, y: y});
				x = x + child.texture.width + xSpacing;
				rowHeight = Math.max(rowHeight, child.height);
			}
			// don't need space after the last object in the row
			x -= xSpacing;
			// see if there is remaining space and center the row
			let rowOffset = (this.options.width - x) / 2;
			for (let i = row * numColumns ; i < coords.length ; i++) {
				coords[i].x += rowOffset;
			}
			y = y + rowHeight + ySpacing;
		}
		
		if (this.options.transition == 'slide') {
			var transition = new PixiTransition();
			for (let i = 0 ; i < this.children.length ; i++) {
				transition.and(new TransitionSlide(this.children[i], coords[i]));
			}
			
			return transition;			
		}
		else {
			for (let i = 0 ; i < this.children.length ; i++) {
				this.children[i].x = coords[i].x;
				this.children[i].y = coords[i].y;
			}
			
			return true;
		}
		
	}
	
	
}