const { promisify } = require("util");
const redis = require("redis");
const { promises } = require("fs");

const redisClient = redis.createClient();
const publisher = redis.createClient();
const subscriber = redis.createClient();

const dbHandleError = (err) => console.error(`Database error: ${err}`);
redisClient.onError = dbHandleError;

const getCommandAsync = (client, command) => promisify(client[command]).bind(client);
const runCommandAsync = (client, command, ...args) => getCommandAsync(client, command)(...args).catch(dbHandleError);
const get = (key, ...args) => runCommandAsync(redisClient, 'get', key, ...args);
const set = (key, element, ...args) => runCommandAsync(redisClient, 'set', key, element, ...args);
const rpush = (key, value, ...args) => runCommandAsync(redisClient, 'rpush', key, value, ...args);
const hget = (key, field, ...args) => runCommandAsync(redisClient, 'hget', key, field, ...args);
const hset = (key, field, ...args) => runCommandAsync(redisClient, 'hset', key, field, ...args);
const sadd = (key, member, ...args) => runCommandAsync(redisClient, 'sadd', key, member, ...args);
const srem = (key, ...members) => runCommandAsync(redisClient, 'srem', key, ...members);
const smembers = (key) => runCommandAsync(redisClient, 'smembers', key);
const incr = (key) => runCommandAsync(redisClient, 'incr', key);
const zadd = (key, ...args) => runCommandAsync(redisClient, 'zadd', key, ...args);
const zrange = (key, start, stop, ...args) => runCommandAsync(redisClient, 'zrange', key, start, stop, ...args);
const expire = (key, seconds) => runCommandAsync(redisClient, 'expire', key, seconds);
const ttl = (key) => runCommandAsync(redisClient, 'ttl', key);

const watch = (client, key) => runCommandAsync(client, 'watch', key);
const exec = (client) => runCommandAsync(client, 'exec');
const exists = (client, key) => runCommandAsync(client, 'exists', key);

const quit = (client = redisClient) => client.quit();
const quitAll = () => [redisClient, publisher, subscriber].forEach(quit);

const createRedisClientAsync = () => {
  return new Promise((resolve, reject) => {
    const client = redis.createClient();
    client.on('ready', () => resolve(client));
  });
}
const getClientKey = (id) => `client:${id}`;
const getClientMessagesKey = (id)  => `client:${id}:messages`;
const getClientSecret = (clientId) => hget(getClientKey(clientId), 'secret');
const setClientSecret = (clientId, secret) => hset(getClientKey(clientId), 'secret', secret);
const setClientSocketId = (clientId, socketId) => hset(getClientKey(clientId), 'socket.id', socketId);
const getClientSocketId = (clientId) => hget(getClientKey(clientId), 'socket.id');
const setClientGameCode = (clientId, gameCode) => hset(getClientKey(clientId), 'game.code', gameCode);
const getClientGameCode = (clientId) => hget(getClientKey(clientId), 'game.code');
const setClientExpire = (clientId, seconds) => expire(getClientKey(clientId), seconds);

const getGameKey = (code) => `game:${code}`;
const getGameStateKey = (code) => `game:${code}:state`;
const getGameHostId = (code) => hget(getGameKey(code), 'host.id');
const addGameState = (code, state, version = -1) => zadd(getGameStateKey(code), version, JSON.stringify(state));
const getLatestGameState = async (code) => {
  const result = await zrange(getGameStateKey(code), -1, -1);
  if (result.length > 0) return JSON.parse(result.pop());  
}
const setGameIfCodeIsUnique = async (tryCode, hostId) => {
  const gameKey = getGameKey(tryCode);
  const transactionClient = await createRedisClientAsync();
  await watch(transactionClient, gameKey);
  const runSetGameTransaction = () => {
    const transaction = transactionClient.multi([['hset', gameKey, 'host.id', hostId]]);
    return exec(transaction);
  }
  const result = await exists(transactionClient, gameKey) ? false : await runSetGameTransaction();
  transactionClient.quit();
  return result;
};
const setGameExpire = (code, seconds) => {
  expire(getGameKey(code), seconds);
  expire(getGameStateKey(code), seconds);
};

const addMessageToQueue = (clientId, message) => sadd(getClientMessagesKey(clientId), JSON.stringify(message));
const setMessageQueueExpiration = (clientId, seconds) => expire(getClientMessagesKey(clientId), seconds);
const getAllQueuedMessages = async (clientId) => {
  const messagesJSON = await smembers(getClientMessagesKey(clientId));
  return messagesJSON.map(JSON.parse);
}
const removeMessageFromQueue = (clientId, message) => srem(getClientMessagesKey(clientId), JSON.stringify(message));

module.exports = { 
    quit,
    get,
    set,
    hget,
    ttl,
    getClientKey,
    getClientMessagesKey,
    getClientSecret,
    setClientSecret,
    setClientSocketId,
    getClientSocketId,
    setClientGameCode,
    getClientGameCode,
    setClientExpire,
    addMessageToQueue,
    getAllQueuedMessages,
    removeMessageFromQueue,
    setMessageQueueExpiration,
    getGameKey,
    getGameStateKey,
    setGameIfCodeIsUnique,
    getGameHostId,
    addGameState,
    getLatestGameState,
    setGameExpire,
    createRedisClientAsync,
    runCommandAsync,
    publisher,
    subscriber,
    quitAll
  };