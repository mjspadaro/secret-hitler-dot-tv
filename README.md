# Secret Hitler (dot) TV
This is an online game based on the popular hidden identity party game Secret Hitler. For more information about the game and rules for how to play, check out the original game's official website:  [secrethitler.com](https://www.secrethitler.com/)

In this online implementation, players use their smartphone browser to play as the main events unfold on a host screen, which can be cast to a TV or screen shared in a video call if you're playing virtually.

You can play the current (alpha) release at the project's official website: [secrethitler.tv](secrethitler.tv). This project is released under the [Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International](https://creativecommons.org/licenses/by-nc-sa/4.0/legalcode) license.

## How to Contribute
Contributions are welcome! The project is still in very early alpha release, and much more work is needed.

On the back-end, the game is limited to running on a single server. If Redis is implemented to support [socket.io clustering](https://socket.io/docs/using-multiple-nodes/), this limitation could be removed. Ideally, Redis could also replace the need for Google Cloud Datastore.

On the front-end, additional animations and visual effects are needed to play up the suspense of events. The game view layout is still also sort of awkward, with everything playing out in a lightbox (even though there's already a fully functional game board coded behind the scenes!).

Any assistance is welcome. Although the code is not yet fully documented, I've tried to give the basic framework below for now.

## Under the Hood
The game server runs on Node.js using  [Express](expressjs.com) as the web server and [socket.io](socket.io) providing real-time communication of events and game state information.

The current production environment is Google App Engine (Flexible Environment).

A small amount of game and player data is stored in a NoSQL database ([Google Cloud Datastore](https://cloud.google.com/datastore)). The database is there for persistence and to support multiple threads or server instances in the future.

There are two clients: one for the host screen and another for the players. The host client uses [PixiJS](https://www.pixijs.com/) as the renderer (HTML5/WebGL). The host client also handles manipulation of the game state. The player client is lightweight and mobile friendly, requiring only HTML/CSS and [jQuery](jquery.com).

## How to Build
### Install Node.JS
The server-side code runs on [Node.js](nodejs.org) 12.x. See their website for installation instructions if you don't already have it installed.
### Install Node Package Dependencies
Dependencies are listed in the package.json file, so they can be installed by running

    npm install
### Install the Database Emulator
The server code relies on a database for persistence as well as to support multiple threads or instances in the future. The database can be emulated by installing the [Google Cloud Datastore Emulator](https://cloud.google.com/datastore/docs/tools/datastore-emulator). See site for instructions.
### Starting the Server
Before starting the server, be sure and start the Google Cloud Datastore Emulator with the following command:

    gcloud beta emulators datastore start
Then, the game server can be started with:

    node server.js
To start a new game as host, point your web browser to http://localhost:3000/host. Players should use their phones to browse to http://localhost:3000 to join the game. It is recommended that the host screen be set up so that all players can see it- either on a television, monitor, or through screen sharing in a video call.

## Code Design
The server is mainly a go-between for the players and host. 

The bulk of the game logic and presentation is handled with client-side javascript on the host computer using a MODEL-VIEW-CONTROLLER design approach.

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