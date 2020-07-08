var test = require('tape');
const redis = require("redis");
const Database = require(`../src/server/database.js`);
const Client = require(`../src/server/client.js`);
const Event = require(`../src/server/event.js`);
const Message = require(`../src/server/message.js`);

test.onFinish(() => Database.quitAll());
const getRandomString = () => Math.ceil(Math.random() * 100000).toString();
const setThenGet = async (key, value) => {
  await Database.set(key, value);
  return Database.get(key);
};
const setThenGetClientSecret = async (clientId, secret) => {
  await Database.setClientSecret(clientId, secret);
  return Database.getClientSecret(clientId);
};
test('Database.setClientSecret', async t => {
  t.plan(1);
  const clientId = getRandomString();
  const secret = getRandomString();
  const result = await setThenGetClientSecret(clientId, secret);
  t.equal(result, secret, "Client secret retrieved matches client secret set");
});
test('Database.addMessageToQueue', async t => {
  const clientId = getRandomString();
  const firstMessage = { id: 1, eventName: 'testMessage', payload: getRandomString() };
  const secondMessage = { id: 2, eventName: 'testMessage', payload: getRandomString() };
  t.equal(await Database.addMessageToQueue(clientId, firstMessage), 1, "First message added to queue");
  t.equal(await Database.addMessageToQueue(clientId, secondMessage), 1, "Second message added to queue");
  t.deepEqual((await Database.getAllQueuedMessages(clientId)).sort((a, b) => a.id - b.id), [firstMessage, secondMessage], "Get all queued messages");
  t.equal(await Database.removeMessageFromQueue(clientId, secondMessage), 1, "Removed second message from queue");
  const queue = await Database.getAllQueuedMessages(clientId);
  t.equal(queue.length, 1, "Single message is left in queue");
  t.deepEqual(queue[0], firstMessage, "Remaining message matches first message");
  t.end();
});
test('Event.createHandler', t => {
  t.plan(3);
  const testClientId = getRandomString();
  const testClient = Client.create();
  const testResponse = getRandomString();
  const testPayload = getRandomString();
  const testResponder = (event) => {
    t.equal(event.client.getClientId(), testClientId, "Client ID matches test event");
    t.equal(event.payload, testPayload, "Payload matches test event");
    return testResponse;
  }
  const testCallback = (response) => t.equal(response, testResponse, "Callback response matches event response");
  const testEvent = Event.create({ name: "test", responder: testResponder });
  const testHandler = Event.createHandler(testEvent, testClient);
  testClient.setClientId(testClientId);
  testHandler(testPayload, testCallback);
});
test('Event.handleAuthenticate', async t => {
  const testSocketId = getRandomString();
  const client = Client.create().setSocket({id: testSocketId});
  const eventNoCredentials = Event.create({ client, payload: {} });
  const credentials = await Event.handleAuthenticate(eventNoCredentials);
  t.equal(credentials.clientId, testSocketId, "Client ID is set to socket ID");
  t.equal(credentials.secret.length > 0, true, "Secret is returned with credentials");
  const socketId = await Database.getClientSocketId(credentials.clientId);
  t.equal(socketId, testSocketId, "Socket ID in database matches our socket ID");
  const eventWithCredentials = Event.create({ client, payload: credentials });
  const response = await Event.handleAuthenticate(eventWithCredentials);
  t.deepEqual(response, credentials, "Matching credentials are returned on subsequent authentication");
  t.equal(client.getClientId(), testSocketId, "getClientId() returns new client id");
  const clientTTL = await Database.ttl(Database.getClientKey(credentials.clientId));
  t.equal(clientTTL > 0, true, "Client key is set to expire in the future");
  t.end();
});
test('Database.setGameIfCodeIsUnique', async t => {
  const testCode = getRandomString();
  const testHostId = getRandomString();
  const setResult = await Database.setGameIfCodeIsUnique(testCode, testHostId);
  const getResult = await Database.getGameHostId(testCode);
  t.equal(getResult, testHostId, "Host ID in database matches the one we just set");
  const setRepeatResult = await Database.setGameIfCodeIsUnique(testCode, getRandomString());
  t.equal(setRepeatResult, false, "Attempt to set a duplicate ID returns false");
});
test('Event.handleCreateGame', async t => {
  const clientId = getRandomString();
  const client = Client.create();
  const createGameWithoutAuthEvent = Event.create({ client, payload: {} });
  const createGameWithoutAuthResponse = await Event.handleCreateGame(createGameWithoutAuthEvent);
  t.equal(createGameWithoutAuthResponse.error.length > 0, true, "Attempting to create a game without client ID set generates an error");
  client.setClientId(clientId);
  const createGameEvent = Event.create({ client, payload: {} });
  const createGameResponse = await Event.handleCreateGame(createGameEvent);
  t.equal(createGameResponse.code.length, 4, "Returns game code 4 characters in length");
  const hostId = await Database.getGameHostId(createGameResponse.code);
  t.equal(hostId, clientId, "Host ID in database matches client ID");
  const gameTTL = await Database.ttl(Database.getGameKey(createGameResponse.code));
  const gameStateTTL = await Database.ttl(Database.getGameStateKey(createGameResponse.code));
  t.equal(gameTTL > 0, true, "Game key is set to expire in the future");
  t.equal(gameStateTTL > 0, true, "Game state key is set to expire in the future");
  t.end();
});
test('Message.publish', async t => {
  const recipientId = getRandomString();
  const payload = getRandomString();
  const testMessage = Message.create({recipientId, payload});
  const subscribeResult = await Database.runCommandAsync(Database.subscriber, 'subscribe', Message.getClientChannelName(recipientId));
  const message = await new Promise((resolve, reject) => {
    Database.subscriber.on('message', (channel, message) => {
      resolve(JSON.parse(message));      
    });
    Message.publish(testMessage);
  });
  t.deepEqual(message, testMessage, "Message received from subscription matches message sent");
  t.end();
});
test('Database.getGameState', async t => {
  const testStates = [{ version: 1 }, { version: 3 }, { version: 2 }];
  const latestState = testStates.reduce((latest, state) => state.version > latest.version ? state : latest);
  const gameCode = getRandomString();
  await Promise.all(testStates.map((state) => Database.addGameState(gameCode, state, state.version)));
  const gameStateResponse = await Database.getLatestGameState(gameCode);
  t.deepEqual(gameStateResponse, latestState, "Response matches latest game state version");
});