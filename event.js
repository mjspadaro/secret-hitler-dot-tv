
const {pipe} = require(`${__dirname}/common.js`);
const Database = require(`${__dirname}/database.js`);
const Game = require(`${__dirname}/game.js`);
const Message = require(`${__dirname}/message.js`);

const CLIENT_TTL = 60 * 60 * 24; // set client to expire from database 24 hours after last active

const create = (event = {}) => ({ name: '', responder: () => true, ...event });

const createHandler = (event, client) => {
  return (payload = {}, callback = () => true) => {
    const addResponse = async (event) => ({response: await event.responder(event), ...event});
    const sendResponse = (event) => { event.callback(event.response); return event; };
    const logEvent = (event) => { console.log(event); return event; }
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
  const {client, payload: credentials} = event;
  const isCredentialsValid = async (credentials) => credentials.clientId && credentials.secret && await Database.getClientSecret(credentials.clientId) === credentials.secret;
  const setClientCredentials = async (credentials) => {
    client.setClientId(credentials.clientId);
    await Database.setClientSecret(credentials.clientId, credentials.secret);
  }
  const resetCredentials = async (credentials) => {
    const randomSecret = Math.random().toString(36).substr(2);
    const newCredentials = {secret: randomSecret, ...credentials};
    await setClientCredentials(newCredentials);
    return newCredentials;
  }
  const clientSocketId = client.getSocket().id;
  const verifiedCredentials = await isCredentialsValid(credentials) ? credentials : await resetCredentials({clientId: clientSocketId});
  await Database.setClientSocketId(verifiedCredentials.clientId, clientSocketId);
  await Database.setClientExpire(verifiedCredentials.clientId, CLIENT_TTL);
  await Message.subscribeToClientMessages(verifiedCredentials.clientId);
  if (typeof client.getSocket().on != 'undefined')
    client.getSocket().on('disconnect', () => Message.unsubscribeFromClientMessages(verifiedCredentials.clientId));
  await Message.deliverAllClientMessages(verifiedCredentials.clientId, client.getSocket());
  return verifiedCredentials;
}

const handleJoinGame = async (event) => {
  const { client, payload: { playerName, gameCode } } = event;
  const clientId = client.getClientId();
  if (!clientId) return createErrorResponse('Client is not authenticated');
  if (!gameCode) return createErrorResponse('Game code is missing');
  if (!playerName) return createErrorResponse('Player name is missing');
  const game = await Game.get(gameCode);
  if (!game) return createErrorResponse('Game not found');
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