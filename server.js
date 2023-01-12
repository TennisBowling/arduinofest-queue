const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');


const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static('public'));

const server = http.createServer(app);
const io = socketIO(server);

const connections = new Set();
let queue = [];

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

app.post('/add', (req, res) => {
  const name = req.body.name;
  if (!name) {
    return res.status(400).send('Name is required');
  }

  queue.push(name);

  // send HTML file to client
  res.sendFile(path.join(__dirname, 'public', 'welcome.html'));

  // send updated queue and position to all connected clients
  // wait 1s to allow client to receive welcome.html
  setTimeout(() => {
    io.emit('update', { queue });
  }, 1000);
});



app.get('/dashboard', (req, res) => {
  if (req.cookies.loggedIn) {
    res.sendFile(__dirname + '/public/dashboard.html');
    setTimeout(() => {
      io.emit('update', { queue });
    }, 1000);
  } else {
    res.sendFile(__dirname + '/public/login.html');
  }
});

app.post('/login', (req, res) => {
  const password = req.body.password;
  if (password === 'password') {
    res.cookie('loggedIn', true);
    res.redirect('/dashboard');
  } else {
    res.send('Incorrect password');
  }
});

app.post('/remove', (req, res) => {
  const name = req.body.name;
  if (!name) {
    return res.status(400).send('Name is required');
  }

  const index = queue.indexOf(name);
  if (index === -1) {
    return res.status(404).send('Name not found in queue');
  }

  queue.splice(index, 1);
  res.send(`Removed ${name} from queue. <a href="/dashboard">go back to dashboard</a>`);

  // send updated queue to all connected clients
  io.emit('update', { queue });
});

app.get('/logout', (req, res) => {
  res.clearCookie('loggedIn');
  res.redirect('/dashboard');
});

io.on('connection', socket => {
  connections.add(socket);

  // send current queue to newly connected client
  socket.emit('update', queue);

  socket.on('disconnect', () => {
    connections.delete(socket);
  });
});

server.listen(3000, () => console.log('Server listening on port 3000'));
