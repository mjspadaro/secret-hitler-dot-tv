const ASSET_BASE_URL = "images";

const assets = [
	'breadcrumb-tracker',
	'background-bright',
	'background-lightbox',
	'background',
	'ballot-back',
	'ballot-ja',
	'ballot-nein',
	'board-5-6-player',
	'board-7-8-player',
	'board-9-10-player',
	'board-fascist',
	'board-liberal',
	'breadcrumb4',
	'chancellor',
	'election-tracker',
	'fascist-score-filled',
	'fascist-score',
	'liberal-score-filled',
	'liberal-score',
	'logo',
	'party-back',
	'party-fascist',
	'party-liberal',
	'pile-discard',
	'pile-draw',
	'player-folder',
	'player-folder-highlight',
	'policy-back',
	'policy-fascist',
	'policy-liberal',
	'president',
	'role-back',
	'role-fascist',
	'role-hitler',
	'role-liberal',
	'status-background',
	'status-foreground',
	'agenda-box',
	'table-headline-background',
	'strikethrough',
];

const loremIpsum = "Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna.";

const FASCIST_VALUE = 0;
const LIBERAL_VALUE = 1;

const GAME_SPEED = 1; // 1 = normal speed, 2 = double speed
const TEXT_SPEED = 0.5;
const PAUSE_DURATION = 2500;

const palette = {
	orange: "#e66443",
	beige: "#efe1bf",
	dkgrey: "#373633",
};

const bcTextStyle = {
		fontFamily: "Futura-Medium",
		fontSize: 15,
		fill: palette.beige,
	};

const nativeResolution = {
	width: 1600,
	height: 900
}

const DEFAULT_ROUTE = {
	matches: () => false,
	view: '',
	method: '',
	synchronous: true,
	priority: 1
};

const ROUTE_TABLE = [
	
	{ event: (e) => ['requestNewGame', 'replacePlayer', 'hostNewGame', 'joinGame', 'startGame'].indexOf(e.eventName) == -1 , view: 'TableView', method: 'update', synchronous: false, priority: 10  },
	{ event: (e) => ['requestNewGame', 'replacePlayer', 'hostNewGame', 'joinGame', 'startGame'].indexOf(e.eventName) == -1 , view: 'StatusView', method: 'updateScore', synchronous: false, priority: 10  },
	{ event: (e) => ['requestNewGame', 'replacePlayer', 'hostNewGame', 'joinGame', 'startGame'].indexOf(e.eventName) == -1 , view: 'StatusView', method: 'updateBreadcrumbs', synchronous: false, priority: 0  },
	{ event: (e) => ['requestNewGame', 'replacePlayer', 'hostNewGame', 'joinGame', 'startGame'].indexOf(e.eventName) == -1 , view: 'PlayerListView', method: 'update', synchronous: false, priority: 10  },

	{ event: 'test', view: (v) => ['TableView', 'StatusView', 'PlayerListView'].indexOf(v.constructor.name) == -1 && v.loaded, method: 'unload', priority: 0 },
	
	{ event: 'requestNewGame', view: 'LobbyView', method: 'load'  },
		
	{ event: 'hostNewGame', view: 'LobbyView', method: 'onHostNewGame' },
	
	{ event: 'joinGame', view: 'LobbyView', method: 'onJoinGame', synchronous: false  },
	
	{ event: 'startGame', view: 'LobbyView', method: 'unload', priority: 0 },
	{ event: 'startGame', view: 'TableView', method: 'load', priority: 1, synchronous: false  },
	{ event: 'startGame', view: 'StatusView', method: 'load', priority: 1, synchronous: false  },
	{ event: 'startGame', view: 'PlayerListView', method: 'load', priority: 1, synchronous: false  },
	{ event: 'startGame', view: 'StartGameView', method: 'load', priority: 2 },
	
	{ event: 'beforeNomination', view: 'PlayerListView', method: 'update', priority: 0  },
	{ event: 'beforeNomination', view: 'StartGameView', method: 'unload'  },
	{ event: 'beforeNomination', view: 'TableView', method: 'onBeforeNomination'  },

	{ event: 'startNomination', view: 'TableView', method: 'onStartNomination'  },		
	{ event: 'startNomination', view: 'NominationView', method: 'load'  },
	
	{ event: 'nominateChancellor', view: 'PlayerListView', method: 'onNominateChancellor', priority: 1  },
	{ event: 'nominateChancellor', view: 'NominationView', method: 'onNominateChancellor', priority: 2  },
		
	{ event: 'startElection', view: 'NominationView', method: 'unload', priority: 0  },
	{ event: 'startElection', view: 'ElectionView', method: 'load', priority: 1  },

	{ event: 'vote', view: 'ElectionView', method: 'onVote', synchronous: false  },
	
	{ event: 'tallyElection', view: 'ElectionView', method: 'onTallyElection', priority: 1  },	
	{ event: 'tallyElection', view: 'ElectionView', method: 'unload', priority: 2  },	
	
	{ event: 'startChaos', view: 'ChaosView', method: 'load', priority: 3  },	

	{ event: 'drawChaosCard', view: 'ChaosView', method: 'onDrawChaosCard', priority: 1 },
	{ event: 'drawChaosCard', view: 'ChaosView', method: 'unload', priority: 2 },

	{ event: 'startPresidentLegislativeSession', view: 'ElectionView', method: 'unload'},
	{ event: 'startPresidentLegislativeSession', view: 'TableView', method: 'onStartPresidentLegislativeSession'},
	
	{ event: 'drawPolicies', view: 'TableView', method: 'onDrawPolicies'},
	{ event: 'drawPolicies', view: 'PlayerListView', method: 'onDrawPolicies'},

	{ event: 'discard', view: 'PlayerListView', method: 'onDiscard'},
	{ event: 'discard', view: 'TableView', method: 'onDiscard'},

	{ event: 'startChancellorLegislativeSession', view: 'TableView', method: 'onStartChancellorLegislativeSession'},
	{ event: 'startChancellorLegislativeSession', view: 'PlayerListView', method: 'onStartChancellorLegislativeSession'},
	
	// if veto not proposed
	{ event: (e) => (e.eventName == 'enactPolicy' && parseInt(e.data) != -1), view: 'PlayerListView', method: 'onEnactPolicy', priority: 1},
	{ event: (e) => (e.eventName == 'enactPolicy' && parseInt(e.data) != -1), view: 'TableView', method: 'onEnactPolicy', priority: 1},
	
	// veto proposed
	{ event: (e) => (e.eventName == 'enactPolicy' && parseInt(e.data) == -1), view: 'PlayerListView', method: 'onProposeVeto', priority: 1},
	{ event: (e) => (e.eventName == 'enactPolicy' && parseInt(e.data) == -1), view: 'TableView', method: 'onProposeVeto', priority: 1},
	
	{ event: 'giveVetoConsent', view: 'TableView', method: 'onGiveVetoConsent', priority: 1},
	{ event: 'giveVetoConsent', view: 'PlayerListView', method: 'onGiveVetoConsent', priority: 2},

	{ event: 'beforeExecution', view: 'TableView', method: 'onBeforeExecution'},

	{ event: 'startExecution', view: 'ExecutionView', method: 'load'},
	{ event: 'executePlayer', view: 'ExecutionView', method: 'onExecutePlayer', priority: 1},
	{ event: 'executePlayer', view: 'ExecutionView', method: 'unload', priority: 2},

	{ event: 'beforePolicyPeek', view: 'TableView', method: 'onBeforePolicyPeek'},

	{ event: 'startPolicyPeek', view: 'PolicyPeekView', method: 'load'},
	{ event: 'confirmPolicyPeek', view: 'PolicyPeekView', method: 'onConfirmPolicyPeek', priority: 1},
	{ event: 'confirmPolicyPeek', view: 'PolicyPeekView', method: 'unload', priority: 2},

	{ event: 'beforeSpecialElection', view: 'TableView', method: 'onBeforeSpecialElection'},

	{ event: 'startSpecialElection', view: 'SpecialElectionView', method: 'load'},
	{ event: 'callSpecialElection', view: 'SpecialElectionView', method: 'onCallSpecialElection', priority: 1},
	{ event: 'callSpecialElection', view: 'SpecialElectionView', method: 'unload', priority: 2},

	{ event: 'beforeInvestigation', view: 'TableView', method: 'onBeforeInvestigation'},

	{ event: 'startInvestigation', view: 'InvestigationView', method: 'load'},
	{ event: 'investigate', view: 'InvestigationView', method: 'onInvestigate', priority: 1},
	{ event: 'confirmInvestigate', view: 'InvestigationView', method: 'unload', priority: 2},
	
	{ event: 'endGame', view: 'EndGameView', method: 'load'},

];

const TESTS = {

	beforePolicyPeek: function (control) {
		
		for (let p of control.game.players) {
			p.isPresident = false;
			p.ask.complete = true;
		}
		
		// set the first human player found as president
		control.game.players.find(p => !p.isAI).isPresident = true;
		control.game.next = 'beforePolicyPeek';

		return true;
	},

	startInvestigation: function (control) {
		
		for (let p of control.game.players) {
			p.isPresident = false;
			p.ask.complete = true;
			p.investigated = false;
		}
		
		// set the first human player found as president
		control.game.players.find(p => !p.isAI).isPresident = true;
		control.game.next = 'startInvestigation';

		return true;
	},
	
	proposeVeto: function(control) {
		
		for (let p of control.game.players) {
			p.isPresident = false;
			p.isNominee = false;
			p.isChancellor = false;
			p.ask.complete = true;
		}
		
		// set human to president and chancellor
		let human = control.game.players.find(p => !p.isAI);
		human.isChancellor = true;
		human.isPresident = true;
		
		control.game.fascistScore = 5;
		control.game.next = 'startPresidentLegislativeSession';
		
		return true;
	},
	
	startSpecialElection: function (control) {
				
		for (let p of control.game.players) {
			p.isPresident = false;
			p.isNominee = false;
			p.ask.complete = true;
		}
		
		let human = control.game.players.find(p => !p.isAI);
		human.isPresident = true;
		control.game.presidentTracker = human.order;
		
		// set another chancellor if the human is chancellor
		if (human.isChancellor) {
			control.game.players.find(p => !p.isChancellor).isChancellor = true;
		}
		
		control.game.fascistScore = 3;
		control.game.next = 'startSpecialElection';
		
		return true;
	},
	
	startExecution: function (control) {
				
		for (let p of control.game.players) {
			p.isPresident = false;
			p.isNominee = false;
			p.ask.complete = true;
		}
		
		let human = control.game.players.find(p => !p.isAI);
		human.isPresident = true;
		control.game.presidentTracker = human.order;
		
		// set another chancellor if the human is chancellor
		if (human.isChancellor) {
			control.game.players.find(p => !p.isChancellor).isChancellor = true;
		}
		
		control.game.fascistScore = 3;
		control.game.next = 'startExecution';
		
		return true;
	},
	
	gridContainer: function (control) {
		
		let app = control.renderer.app;
		
		for (let v of control.views) {
			v.hide();
		}
		
		var grid = new DistributedGridContainer([], {
			width: app.renderer.width,
			height: app.renderer.height,

		});

		for (let i = 1 ; i <= 25 ; i++) {
			grid.addChild(new PIXI.Sprite(app.loader.resources.policyLiberal.texture));
		}
		
		grid.zIndex = 100;
		app.stage.addChild(grid);
		grid.arrange().start();

		return false;
	}
	
}

const game = new SecretHitlerGame();
const renderer = new GameRenderer();
const controller = new GameController(game, renderer);

function init() {
	
	document.getElementById("game-wrapper").appendChild(renderer.app.view);
	
	
	renderer.app.width = 1600;
	renderer.app.height = 900;
	renderer.app.resizeTo = window;

	renderer.onPreloadComplete = afterPreload;
	
	renderer.preload(assets);

}

function afterPreload() {
	
	window.onresize = renderer.resize.bind(renderer);
	renderer.initViews();
	controller.requestNewGame();
	
}



