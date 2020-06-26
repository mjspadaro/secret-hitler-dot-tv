const Database = require(`${__dirname}/database.js`);
const {pipe} = require(`${__dirname}/common.js`);

const MESSAGE_QUEUE_TTL = 60 * 60 * 24; // message queues expire in database 1 day after last message

const create = (message) => ({timestamp: Date.now(), ...message});

const getClientChannelName = (clientId) => `client:${clientId}:messages`;

const send = (message) => pipe(addToQueue, publish)(message);

const addToQueue = async (message) => {
  await Database.addMessageToQueue(message.recipientId, message);
  await Database.setMessageQueueExpiration(message.recipientId, MESSAGE_QUEUE_TTL);
  return message;
}

const publish = (message) => {
  Database.publisher.publish(getClientChannelName(message.recipientId), JSON.stringify(message));
  return message;
}

const createHandler = (io) => async (channel, messageJSON) => {
  const message = create(JSON.parse(messageJSON));
  const recipientSocket = io.sockets.connected[await Database.getClientSocketId(message.recipientId)];
  if (recipientSocket) deliverMessageToSocket(message, recipientSocket);
};

const deliverAllClientMessages = async (clientId, socket) => (await Database.getAllQueuedMessages(clientId)).map((message) => deliverMessageToSocket(message, socket));

const deliverMessageToSocket = async (message, socket) => {
  const recipientGameCode = await Database.getClientGameCode(message.recipientId);
  if (recipientGameCode != message.gameCode) {
    removeFromQueue(message);
    return;
  }
  socket.emit(message.eventName, message.payload, () => removeFromQueue(message));
}

const subscribeToClientMessages = (clientId) => Database.subscriber.subscribe(getClientChannelName(clientId));

const unsubscribeFromClientMessages = (clientId) => Database.subscriber.unsubscribe(getClientChannelName(clientId));

const removeFromQueue = (message) => Database.removeMessageFromQueue(message.recipientId, message);

module.exports = {
  create,
  subscribeToClientMessages,
  unsubscribeFromClientMessages,
  getClientChannelName,
  publish,
  deliverMessageToSocket,
  deliverAllClientMessages,
  createHandler,
  send
};