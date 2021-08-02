
const http = require('http');
const server = http.createServer();

const sockets = require('socket.io')

const io = sockets(server,  {
  cors: {
    origin: "http://127.0.0.1:8000",
    methods: ["GET", "POST"]
  }
});

const Statuses = {
  WAITING: 'waiting', 
  PLAYING: 'playing', 
  DRAW: 'draw', 
  WIN: 'win'
}

let gameState = {
  board: new Array(9).fill(null), 
  currentPlayer: null,
  players : [], 
  result : {
    status : Statuses.WAITING
  }
}

io.on('connection', function (connection) {
  console.log(connection); 
  connection.on('addPlayer', addPlayer(connection.id)); 
  connection.on('action', action(connection.id)); 
  connection.on('disconnect', disconnect(connection.id)); 
	connection.on('message', message); 
});

function disconnect(socketId){
  return (reason) => {
    gameState.players = gameState.players.filter(p => p.id != socketId);
    // Restart game etc.
  }
}

function addPlayer(socketId){
  return (data)=>{

    const numberOfPlayers  = gameState.players.length; 
    if (numberOfPlayers >=2){
      io.to(socketId).emit('gameFull', {message: 'There are already 2 players in this game. Please try again later'}); 
      return; 
    } else {
      
      const newPlayer = {
        playerName: data.playerName, 
        id: socketId, 
        symbol: numberOfPlayers === 0 ? 'X' : 'O'
      }; 

      gameState.players.push(newPlayer); 
      if (gameState.players.length == 2){
        gameState.result.status = Statuses.PLAYING;
        gameState.currentPlayer = newPlayer; 
      }

      io.emit('newPlayer', gameState); 
    }
  }
}

function action(socketId){
  return (data)=>{
    if (gameState.players.length === 2 && gameState.currentPlayer.id === socketId){
      const player = gameState.players.find(p => p.id === socketId); 
      gameState.board[data.gridIndex] = player; 
      gameState.currentPlayer = gameState.players.find(p => p.id !== socketId); 
      checkForEndOfGame();
    }
    io.emit('gameState', gameState); 
  }
}

const winSequences = [
  [0, 1, 2],
  [3, 4, 5], 
  [6, 7, 8], 
  [0, 3, 6], 
  [1, 4, 7], 
  [2, 5, 8],
  [0, 4, 8], 
  [2, 4, 6] 
]

function checkForEndOfGame(){

  // Check for a win
  gameState.players.forEach(player => {
    winSequences.forEach(seq => {
      if (gameState.board[seq[0]] == player
          && gameState.board[seq[1]] == player
          && gameState.board[seq[2]] == player){
            gameState.result.status = Statuses.WIN; 
            gameState.result.winner = player;
         }
    });
  });

  // Check for a draw
  if (gameState.result.status != Statuses.WIN){
    const emptyBlock = gameState.board.indexOf(null); 
    if (emptyBlock == -1){
      gameState.result.status = Statuses.DRAW; 
    }
  }
}

function message(data){
  console.log('new message: ' + data); 
  io.emit("broadcast", data);
}

server.listen(3042, function() {
  console.log('listening on 3042');
});
