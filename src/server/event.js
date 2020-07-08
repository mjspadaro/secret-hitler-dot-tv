
const {pipe} = require(`${__dirname}/common.js`);
const Database = require(`${__dirname}/database.js`);
const Game = require(`${__dirname}/game.js`);
const Message = require(`${__dirname}/message.js`);
const QUIET_MODE = process.argv.includes('--quiet');

const LOG_SEVERITY = {
  // LOG LEVELS FROM GOOGLE CLOUD
  DEFAULT: 0, // DEFAULT	(0) The log entry has no assigned severity level.
  DEBUG: 100,  // DEBUG	(100) Debug or trace information.
  INFO: 200,  // INFO	(200) Routine information, such as ongoing status or performance.
  NOTICE: 300,  // NOTICE	(300) Normal but significant events, such as start up, shut down, or a configuration change.
  WARNING: 400,  // WARNING	(400) Warning events might cause problems.
  ERROR: 500,  // ERROR	(500) Error events are likely to cause problems.
  CRITICAL: 600,  // CRITICAL	(600) Critical events cause more severe problems or outages.
  ALERT: 700,  // ALERT	(700) A person must take an action immediately.
  EMERGENCY: 800  // EMERGENCY	(800) One or more systems are unusable.
}

const CLIENT_TTL = 60 * 60 * 24; // set client to expire from database 24 hours after last active

const create = (event = {}) => ({ name: '', responder: () => true, ...event });

const createEventLogText = (event) => {
  try {
    return JSON.stringify({
      severity: LOG_SEVERITY.INFO,
      clientId: event.client.getClientId(),
      eventName: event.name,
      eventPayload: event.payload,
      response: event.response
    });
  } catch (e) {
    return JSON.stringify({
      severity: LOG_SEVERITY.WARNING,
      testPayload: `Error creating log text: ${e}`
    })
  }
}

const createHandler = (event, client) => {
  return (payload = {}, callback = () => true) => {
    const addResponse = async (event) => ({response: await event.responder(event), ...event});
    const sendResponse = (event) => { event.callback(event.response); return event; };
    const logEvent = (event) => { if (!QUIET_MODE) console.log(createEventLogText(event)); return event; }
    const handleError = (error) => { 
      const response = {error: 'An unexpected server error has occurred.'};
      callback(response);
      logEvent({error, response, ...event});
    }
    pipe(addResponse, sendResponse, logEvent)({...event, client, payload, callback}).catch(handleError);
  }
}

const createErrorResponse = (errorMessage) => ({ error: errorMessage });

const handleAuthenticate = async (event) => {
  const credentials = event.payload;
  const isCredentialsValid = async (credentials) => credentials.clientId && credentials.secret && await Database.getClientSecret(credentials.clientId) === credentials.secret;
  const setClientCredentials = async (credentials) => {
    await Database.setClientSecret(credentials.clientId, credentials.secret);
  }
  const resetCredentials = async (credentials) => {
    const randomSecret = Math.random().toString(36).substr(2);
    const newCredentials = {secret: randomSecret, ...credentials};
    await setClientCredentials(newCredentials);
    return newCredentials;
  }
  const clientSocketId = event.client.getSocket().id;
  const verifiedCredentials = await isCredentialsValid(credentials) ? credentials : await resetCredentials({clientId: clientSocketId});
  event.client.setClientId(verifiedCredentials.clientId);
  await Database.setClientSocketId(verifiedCredentials.clientId, clientSocketId);
  await Database.setClientExpire(verifiedCredentials.clientId, CLIENT_TTL);
  await Message.subscribeToClientMessages(verifiedCredentials.clientId);
  if (typeof event.client.getSocket().on != 'undefined')
    event.client.getSocket().on('disconnect', () => Message.unsubscribeFromClientMessages(verifiedCredentials.clientId));
  await Message.deliverAllClientMessages(verifiedCredentials.clientId, event.client.getSocket());
  return verifiedCredentials;
}

const handleJoinGame = async (event) => {
  const { playerName, gameCode } = event.payload;
  const clientId = event.client.getClientId();
  if (!clientId) return createErrorResponse('Client is not authenticated');
  if (!gameCode) return createErrorResponse('Game code is missing');
  if (!playerName) return createErrorResponse('Player name is missing');
  const game = await Game.get(gameCode);
  if (!game) return createErrorResponse('Game not found');
  if (Database.getClientGameCode(clientId) == gameCode) return {};
  Game.addPlayer(game, clientId, playerName);
  await Database.setClientExpire(clientId, CLIENT_TTL);
  return {};
}

const handleCreateGame = async (event) => {
  const clientId = event.client.getClientId();
  if (!clientId) return createErrorResponse('Client is not authenticated');
  const newGame = await pipe(Game.create, Game.setUniqueCode, Game.updateState, Game.setExpiration)({ hostId: clientId });
  await Database.setClientGameCode(clientId, newGame.code);
  return { code: newGame.code };
}

const handleUpdateGameState = async (event) => {
  const clientId = event.client.getClientId();
  if (!clientId) return createErrorResponse('Client is not authenticated');
  const gameCode = await Database.getClientGameCode(clientId);
  if (!gameCode) return createErrorResponse('Game not found');
  const game = await Game.get(gameCode);
  if (game.hostId != clientId) return createErrorResponse('Client is not the host of this game');
  if (!event.payload.gameState) return createErrorResponse('Game state is missing from the request');
  Game.updateStateAndSendToPlayers(game, event.payload.gameState);
  return {};
}

const handlePlayTurn = async (event) => {
  if (typeof event.payload.action == 'undefined') return createErrorResponse('Action parameter is missing');
  if (typeof event.payload.value == 'undefined') return createErrorResponse('Value parameter is missing');
  const clientId = event.client.getClientId();
  if (!clientId) return createErrorResponse('Client is not authenticated');
  const gameCode = await Database.getClientGameCode(clientId);
  if (!gameCode) return createErrorResponse('Game not found');
  const game = await Game.get(gameCode);
  if (!game.state.players.find((player) => player.id == clientId)) return createErrorResponse('Client is not a player in this game');
  pipe(Message.create, Message.send)({
    recipientId: game.hostId,
    senderId: clientId,
    gameCode: game.code,
    eventName: 'playTurn',
    payload: { playerId: clientId, action: event.payload.action, value: event.payload.value }
  });
  return {};
}

module.exports = {
  create,
  createHandler,
  getErrorResponse: createErrorResponse,
  handleAuthenticate,
  handleCreateGame,
  handleJoinGame,
  handleUpdateGameState,
  handlePlayTurn
}