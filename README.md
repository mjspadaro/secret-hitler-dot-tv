# Secret Hitler (dot) TV
This is an online game based on the popular hidden identity party game Secret Hitler. For more information about the game and rules for how to play, check out the original game's official website:  [secrethitler.com](https://www.secrethitler.com/)

In this online implementation, players use their smartphone browser to play as the main events unfold on a host screen, which can be cast to a TV or screen shared in a video call if you're playing virtually.

You can play the current (alpha) release at the project's official website: [secrethitler.tv](secrethitler.tv). This project is released under the [Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International](https://creativecommons.org/licenses/by-nc-sa/4.0/legalcode) license.

## Under the Hood
The game server runs on Node.js using  [Express](expressjs.com) as the web server and [socket.io](socket.io) providing real-time communication of events and game state information. It is designed to be horizontally scalable- that is to say that many instances can work together so long as they share a common Redis instance.

The current production environment is Google App Engine (Flexible Environment).

Redis is used for persistence of player and game data while games are in progress, as well as pub/sub to allow for sending messages between clients across instances of the server.

There are two clients: one for the host screen and another for the players. The host client uses [PixiJS](https://www.pixijs.com/) as the renderer (HTML5/WebGL). The host client also handles manipulation of the game state. The player client is lightweight and mobile friendly, requiring only HTML/CSS and [jQuery](jquery.com).

## How to Build
### Install Node.JS
The server-side code runs on [Node.js](nodejs.org) 12.x. See their website for installation instructions if you don't already have it installed.
### Install Node Package Dependencies
Dependencies are listed in the package.json file, so they can be installed by running

    npm install
### Install Redis Server
The server code relies on redis for persistence as well as pub/sub to allow for players to communicate across instances of the server. See [Redis quickstart](https://redis.io/topics/quickstart) for installation instructions.
### Starting the Server
The server can be started in production mode with:

    npm start
Or in development mode with:

    npm run start-dev
The development mode script performs several useful functions, including compiling the client-side code (using Babel- in watch mode to re-compile if the code is changed with the server is running). A Node.js debugger can also be attached at the default port of 9229 when in development mode.

To start a new game as host, point your web browser to http://localhost:3000/host. Players should use their phones to browse to http://localhost:3000 to join the game. It is recommended that the host screen be set up so that all players can see it- either on a television, monitor, or through screen sharing in a video call.

### Deploying to Google Cloud
Before deploying, increment the version:

    npm version (major | minor | prerelease)
Then use the npm script to deploy to Google Cloud:

    npm run-script deploy
This script does not stop old versions or direct traffic to the new version, that must be done separately in the gcloud command line or in the google cloud console.


## Code Design
The server is mainly a go-between for the players and host. 

The bulk of the game logic and presentation is handled with client-side javascript on the host computer using a MODEL-VIEW-CONTROLLER design approach. Note that the client-side source code is kept in the /src/client directory, and is compiled to ES5 by the start-dev or deployment scripts for backwards compatibility. The compiled code destination is the /public/js folder. Compiled js files will have the .dist.js extension. These files should not be modified directly and in fact are ignored by git.

Here are the core base classes that the host uses to run the game:
### SecretHitlerGame
The SecretHitlerGame class serves as the *model* and all game state logic is maintained here. It takes in game events and returns the updated game and player state to the controller. It adds a .ask property to any player from whom we are waiting for input. There is also some very basic mostly-random AI-player logic which is meant more for testing purposes at this point. If you start a game with less than the minimum 5 players, the game will fill in the remaining seats with AI players.
### GameController
The GameController class receives incoming events passed to it from the game server via a socket.io client. These events are kept in a queue and passed to the approprite view modules to update the host interface. Events can be sent to the view synchronously or asynchronously depending on whether or not certain game animations should be allowed to complete.
### GameView
The GameView class keeps related UI elements together in a PIXI Container with a common z-index, to form *layers* of UI elements whose visibility and scale can be manipulated together. 

The GameView class also maintains a queue of transitions (animations) that can run asynchronous or synchronously and notify the controller via a callback when all transitions are complete so that the game can continue. This is especially important as you don't want the results of game events to become visible on player devices before the host screen has rendered them, which would sort of kill the mood.
### PixiTransition
This class, and it's good friend, the Tween class, support adding some basic animations to the game (cards flipping over, text typing character by character, etc). Transitions can be chained to each other using the .then() method or run asynchronously using the .also() method. When PixiTransition objects are added to the transitions queue of the GameView class, the view will add its own callback onto the end of the chain so that the controller can be notified when animations are complete.
> Written with [StackEdit](https://stackedit.io/).
