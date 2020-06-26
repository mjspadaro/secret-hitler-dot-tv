
const SOCKET_HOST = 'http://localhost:3000';

var test = require('tape');

const createPromiseWithTimeout = (promise = (resolve, reject) => resolve(), timeout = 5000, error = "Operation timed out") => Promise.race([new Promise(promise), new Promise ((resolve, reject) => setTimeout(() => reject(error), timeout))]);

const connectSocketAsync = (host) => createPromiseWithTimeout((resolve, reject) => {
  const socket = require('socket.io-client')(host);
  socket.on('connect', () => resolve(socket));
});

const emitAsync = (socket, eventName, ...args) => createPromiseWithTimeout((resolve, reject) => socket.emit(eventName, ...args, (response) => resolve(response)));

const getRandomString = () => Math.ceil(Math.random() * 100000).toString();

const connectEmitAsync = async (host, eventName, ...args) => {
  const socket = await connectSocketAsync(host);
  const response = await emitAsync(socket, eventName, ...args);
  socket.close();
  return response;
}

test('ping', async t => {
  response = await connectEmitAsync(SOCKET_HOST, 'PING', {});
  t.equal(response, "PONG", "Response with 'PONG'");
  t.end();
});

test('authenticate', async t => {
  credentials = await connectEmitAsync(SOCKET_HOST, 'authenticate', {});
  t.equal(credentials.clientId.length > 0, true, "Client ID is present");
  t.equal(credentials.secret.length > 0, true, "Client secret is present");
  verifyCredentials = await connectEmitAsync(SOCKET_HOST, 'authenticate', credentials);
  t.deepEqual(verifyCredentials, credentials, "Second connection credentials matched the first");
  t.end();
});

test('createGame', async t => {
  socket = await connectSocketAsync(SOCKET_HOST);
  credentials = await emitAsync(socket, 'authenticate', {});
  response = await emitAsync(socket, 'createGame', {});
  socket.close();
  t.equal(response.code.length, 4, "Responds with game code length = 4");
  t.end();
});

test('joinGame (client) -> addPlayer (host)', async t => {
  t.plan(3);
  const hostSocket = await connectSocketAsync(SOCKET_HOST);
  const hostCredentials = await emitAsync(hostSocket, 'authenticate', {});
  const playerSocket = await connectSocketAsync(SOCKET_HOST);
  const { clientId: playerId } = await emitAsync(playerSocket, 'authenticate', {}); 
  const { code: gameCode } = await emitAsync(hostSocket, 'createGame', {});
  const playerName = getRandomString();
  const payload = await new Promise(async (resolve, reject) => {
    hostSocket.on('addPlayer', (payload, callback) => {
      resolve(payload);
      callback();
    });
    const joinGameResponse = await emitAsync(playerSocket, 'joinGame', { playerName, gameCode });
    t.equal(joinGameResponse.error, undefined, "joinGame does not return an error");
    playerSocket.close();
  });
  hostSocket.close();
  t.equal(payload.playerName, playerName, "Player name matches joinGame request");
  t.equal(payload.playerId, playerId, "Player ID matches player's clientId");
});

test('joinGame (player) -> (host offline) -> addPlayer (host reconnects)', async t => {
  t.plan(2);
  const hostSocket = await connectSocketAsync(SOCKET_HOST);
  const hostCredentials = await emitAsync(hostSocket, 'authenticate', {});
  const playerSocket = await connectSocketAsync(SOCKET_HOST);
  const { clientId: playerId } = await emitAsync(playerSocket, 'authenticate', {}); 
  const { code: gameCode } = await emitAsync(hostSocket, 'createGame', {});
  const playerName = getRandomString();
  hostSocket.close();
  const hostSocketReconnect = await connectSocketAsync(SOCKET_HOST);
  const payload = await new Promise(async (resolve, reject) => {
    const joinGameResponse = await emitAsync(playerSocket, 'joinGame', { playerName, gameCode });
    playerSocket.close();
    hostSocketReconnect.on('addPlayer', (payload, callback) => {
      resolve(payload);
      callback();
    });
    await emitAsync(hostSocketReconnect, 'authenticate', hostCredentials);
  });
  hostSocketReconnect.close();
  t.equal(payload.playerName, playerName, "Player name matches joinGame request");
  t.equal(payload.playerId, playerId, "Player ID matches player's clientId");
});

test('updateGameState (host) -> updatePlayerState (player)', async t => {
  t.plan(2);
  const hostSocket = await connectSocketAsync(SOCKET_HOST);
  const hostCredentials = await emitAsync(hostSocket, 'authenticate', {});
  const playerSocket = await connectSocketAsync(SOCKET_HOST);
  const { clientId: playerId } = await emitAsync(playerSocket, 'authenticate', {}); 
  const { code: gameCode } = await emitAsync(hostSocket, 'createGame', {});
  const playerName = getRandomString();
  const testPlayerState = { id: playerId }; 
  const testGameState = { version: 1, players: [testPlayerState] };
  const joinGameResponse = await emitAsync(playerSocket, 'joinGame', { playerName, gameCode });
  const payload = await new Promise(async (resolve, reject) => {
    playerSocket.on('updatePlayerState', (payload, callback) => {
      resolve(payload);
      callback();
    });
    const updateGameStateResponse = await emitAsync(hostSocket, 'updateGameState', { gameState: testGameState });
    t.equal(updateGameStateResponse.error, undefined, "updateGameState does not return an error");
    hostSocket.close();
  });
  playerSocket.close();
  t.deepEqual(payload.playerState, testPlayerState, "Player state matches test state");
});

test('playTurn (client) -> playTurn (host)', async t => {
  t.plan(2);
  const hostSocket = await connectSocketAsync(SOCKET_HOST);
  const hostCredentials = await emitAsync(hostSocket, 'authenticate', {});
  const playerSocket = await connectSocketAsync(SOCKET_HOST);
  const { clientId: playerId } = await emitAsync(playerSocket, 'authenticate', {}); 
  const { code: gameCode } = await emitAsync(hostSocket, 'createGame', {});
  const playerName = getRandomString();
  const gameState = { version: 1, players: [{ id: playerId }] };
  const playTurnPayload = { action: getRandomString(), value: getRandomString() };
  await emitAsync(playerSocket, 'joinGame', { playerName, gameCode });
  await emitAsync(hostSocket, 'updateGameState', { gameState });
  const payload = await new Promise(async (resolve, reject) => {
    hostSocket.on('playTurn', (payload, callback) => {
      resolve(payload);
      callback();
    });
    const playTurnResponse = await emitAsync(playerSocket, 'playTurn', playTurnPayload);
    t.equal(playTurnResponse.error, undefined, "playTurn (client) does not return an error");
    playerSocket.close();
  });
  hostSocket.close();
  t.deepEqual(payload, {playerId, ...playTurnPayload}, "playTurn (host) matches playTurn (client) payload + playerId");
});