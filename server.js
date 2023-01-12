const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');


const app = express();
// cookie parser middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
// statically serve files in /public
app.use(express.static('public'));

const server = http.createServer(app);
const io = socketIO(server);

const connections = new Set();
let queue = [];


app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html'); // just send back the index
});

app.post('/add', (req, res) => {
  const name = req.body.name; // this route is called by pressing a button on index, and provides a name to this POST request
  if (!name) {
    return res.status(400).send('Name is required');
  }

  queue.push(name); // add name to queue

  // send HTML file to client
  res.sendFile(path.join(__dirname, 'public', 'welcome.html')); // send them the waiting page

  // send updated queue and position to all connected clients
  // wait 1s to allow client to receive welcome.html
  setTimeout(() => {
    io.emit('update', { queue });
  }, 1000);
});



app.get('/dashboard', (req, res) => {
  if (req.cookies.loggedIn) { // check if person has previously been logged in, if so just send them the website
    res.sendFile(__dirname + '/public/dashboard.html');
    setTimeout(() => {  // wait 1s to allow client to receive dashboard.html
      io.emit('update', { queue });
    }, 1000);
  } else {
    res.sendFile(__dirname + '/public/login.html'); // if not logged in, send them the login page
  }
});

app.post('/login', (req, res) => {
  const password = req.body.password; // this route is called by pressing a button on login, and provides a password to this POST request
  if (password === 'password') {
    res.cookie('loggedIn', true); // set cookie to true if password is correct
    res.redirect('/dashboard');   // redirect to dashboard
  } else {
    res.send('Incorrect password');
  }
});

app.post('/remove', (req, res) => {
  const name = req.body.name; // this route is called by pressing a button on dashboard, and provides a name to this POST request to remove
  if (!name) {
    return res.status(400).send('Name is required');
  }

  const index = queue.indexOf(name);  // find index of name in queue
  if (index === -1) {
    return res.status(404).send('Name not found in queue'); // check if not in queue
  }

  queue.splice(index, 1); // remove name from queue
  res.send(`Removed ${name} from queue. <a href="/dashboard">go back to dashboard</a>`);

  // send updated queue to all connected clients
  io.emit('update', { queue });
});

app.get('/logout', (req, res) => {
  res.clearCookie('loggedIn');  // clear auto login cookie
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
