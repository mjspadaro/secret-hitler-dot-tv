const {createStatefulSetter} = require(`${__dirname}/common.js`);
const Game = require(`${__dirname}/game.js`);
const Event = require(`${__dirname}/event.js`);
const Database = require(`${__dirname}/database.js`);
const Message = require(`${__dirname}/message.js`);

const create = (client = {}) => {
  const newClient = {...client};
  newClient.setClientId = createStatefulSetter(newClient, 'clientId');
  newClient.setSocket = createStatefulSetter(newClient, 'socket');
  newClient.getClientId = () => undefined;
  return newClient;
};

const addEventHandler = (client, event) => addSocketListener(client, event.name, Event.createHandler(event, client));  

const addSocketListener = (client, eventName, eventHandler) => {
  client.getSocket().on(eventName, eventHandler);
  return client;
}

const setExpiration = async (client) => {
  await Database.setClientExpire(client.getClientId(), CLIENT_TTL);
  return client;
}

const handleConnect = (socket) =>  {
  let client = create().setSocket(socket);
  addEventHandler(client, Event.create({name: 'PING', responder: () => 'PONG'}));
  addEventHandler(client, Event.create({name: 'authenticate', responder: Event.handleAuthenticate }));
  addEventHandler(client, Event.create({name: 'createGame', responder: Event.handleCreateGame }));
  addEventHandler(client, Event.create({name: 'joinGame', responder: Event.handleJoinGame }));
  addEventHandler(client, Event.create({name: 'updateGameState', responder: Event.handleUpdateGameState }));
  addEventHandler(client, Event.create({name: 'playTurn', responder: Event.handlePlayTurn }));
}

module.exports = {
  create,
  handleConnect,
  setExpiration,
}