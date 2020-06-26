const {pipe, shuffle} = require(`${__dirname}/common.js`);
const Database = require(`${__dirname}/database.js`);
const Message = require(`${__dirname}/message.js`);

const GAME_TTL = 60 * 60 * 24; // Game expires from database 1 day after creation

const create = (game = {}) => ({state: { players: [] }, ...game });

const getRandomGameCode = () => shuffle('A B C D E F G H J K L M N P Q R S T V W X Y Z'.split(' ')).splice(0, 4).join('');

const getUniqueCode = async (game, attempts = 0) => {
  const maxAttempts = 1000;
  if (attempts >= maxAttempts) return;
  const tryCode = getRandomGameCode();
  const confirmCode = await Database.setGameIfCodeIsUnique(tryCode, game.hostId) ? tryCode : await getUniqueCode(game, attempts++);
  return confirmCode;
}

const get = async (code) => {
  const hostId = await Database.getGameHostId(code);
  if (!hostId) return {};
  const state = await Database.getLatestGameState(code);
  return create({code, hostId, state});
}

const setUniqueCode = async (game) => ({...game, code: await getUniqueCode(game)});

const setExpiration = async (game) => {
  await Database.setGameExpire(game.code, GAME_TTL);
  return game;
}

const addPlayer = async (game, playerId, playerName) => {
  const message = Message.create({
    recipientId: game.hostId,
    senderId: playerId,
    gameCode: game.code,
    eventName: 'addPlayer',
    payload: { playerId, playerName }
  });
  Database.setClientGameCode(playerId, game.code);
  Message.send(message);
};

const updateStateAndSendToPlayers = (game, state) => updateState(game, state).then(sendStateToPlayers);

const updateState = async (game, state = create().state) => {
  await Database.addGameState(game.code, state, state.version || 0);
  return { ...game, state };
} 

const sendStateToPlayers = async (game) => {
  const createGameStateMessage = (player) => Message.create({
    recipientId: player.id,
    senderId: game.hostId,
    gameCode: game.code,
    eventName: 'updatePlayerState',
    payload: { playerState: player }
  });
  game.state.players.map(createGameStateMessage).map(Message.send);
}

module.exports = {
  create,
  get,
  setUniqueCode,
  setExpiration,
  addPlayer,
  updateStateAndSendToPlayers,
  updateState
}