// Imports the Google Cloud client library
const {Datastore} = require('@google-cloud/datastore');
const cTable = require('console.table');

// Creates a client
const datastore = new Datastore();

async function listKind(kind, fields = []) {
  // The kind for the new entity
	const query = datastore.createQuery(kind).select(fields).order('created', {descending: true}).limit(10);
  
	const [results] = await datastore.runQuery(query);
	console.log(`${kind}\n----------------------------------`);
	console.table(results);
	//results.forEach(r => console.table(r));
	
}



listKind('Game', ['code', 'hostId']);
listKind('Client', ['name', 'gameCode','id', 'socketId']);