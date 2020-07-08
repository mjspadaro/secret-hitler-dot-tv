const LISTEN_PORT = process.env.PORT ? process.env.PORT : 3000;
const express = require('express');
const app = express();

var http = require('http').createServer(app);
var io = require('socket.io')(http);

const Client = require(`${__dirname}/client.js`);
const {subscriber} = require(`${__dirname}/database.js`);
const Message = require(`${__dirname}/message.js`);

app.engine('html', require('ejs').renderFile);
app.get('/', function(req, res) {
	res.render(__dirname + '/../../public/player.html', {version: process.env.npm_package_version});
});
app.get('/host', function(req, res) {
	res.render(__dirname + '/../../public/host.html', {version: process.env.npm_package_version});
});
app.use('/images', express.static(__dirname + '/../../public/images'));
app.use('/js', express.static(__dirname + '/../../public/js'));
app.use('/css', express.static(__dirname + '/../../public/css'));
app.use('/fonts', express.static(__dirname + '/../../public/fonts'));

console.log('SECRETHITLER.TV SERVER -- RUNNING VERSION ' + process.env.npm_package_version);
http.listen(LISTEN_PORT, function() {
	console.log('listening on *:' + LISTEN_PORT);
});

io.on('connection', Client.handleConnect);
subscriber.on('message', Message.createHandler(io));