const LISTEN_PORT = process.env.PORT ? process.env.PORT : 3000;
const QUIET_MODE = process.argv.includes('--quiet');
const express = require('express');
const app = express();
const httpsRedirect = require('./https-redirect.js');

var http = require('http').createServer(app);
var io = require('socket.io')(http);

const Client = require(`${__dirname}/client.js`);
const {subscriber} = require(`${__dirname}/database.js`);
const Message = require(`${__dirname}/message.js`);

app.engine('html', require('ejs').renderFile);
app.use(httpsRedirect);
app.set('trust proxy', true);
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


if (!QUIET_MODE)
	console.log('SECRETHITLER.TV SERVER -- RUNNING VERSION ' + process.env.npm_package_version + ` (${process.env.NODE_ENV})`);
http.listen(LISTEN_PORT, function() {
	if (!QUIET_MODE)
		console.log('listening on *:' + LISTEN_PORT);
});

io.on('connection', Client.handleConnect);
subscriber.on('message', Message.createHandler(io));