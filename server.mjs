import express from 'express';
import bodyParser from 'body-parser';
import path from 'path';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

const dbFile = path.join(__dirname, 'db.json');
const adapter = new JSONFile(dbFile);
const db = new Low(adapter, { games: [] });  

let currentGame = {
  players: { p1: "", p2: "" },
  rounds: [],
  score: { p1: 0, p2: 0 },
  winner: ""
};

function getWinner(p1, p2) {
  if (p1 === p2) return 'Tie';
  if ((p1 === 'stone' && p2 === 'scissors') ||
      (p1 === 'paper' && p2 === 'stone') ||
      (p1 === 'scissors' && p2 === 'paper')) return 'Player 1';
  return 'Player 2';
}

const init = async () => {
  await db.read();
  db.data ||= { games: [] }; 
  await db.write();

  app.post('/start', (req, res) => {
    const { p1, p2 } = req.body;
    currentGame = {
      players: { p1, p2 },
      rounds: [],
      score: { p1: 0, p2: 0 },
      winner: ""
    };
    res.json({ status: 'started' });
  });

  app.post('/play', async (req, res) => {
    const { move1, move2, round } = req.body;
    const winner = getWinner(move1, move2);

    if (winner === 'Player 1') currentGame.score.p1++;
    else if (winner === 'Player 2') currentGame.score.p2++;

    currentGame.rounds.push({ round, move1, move2, winner });

    let finalResult = "";
    if (round === 6) {
      if (currentGame.score.p1 > currentGame.score.p2) {
        currentGame.winner = currentGame.players.p1;
      } else if (currentGame.score.p2 > currentGame.score.p1) {
        currentGame.winner = currentGame.players.p2;
      } else {
        currentGame.winner = "Tie";
      }

      db.data.games.push(currentGame);
      await db.write();

      finalResult = currentGame.winner;
    }

    res.json({
      winner,
      round,
      message: `Round ${round}: ${winner}`,
      finalResult
    });
  });

  app.get('/games', async (req, res) => {
    await db.read();
    res.json(db.data.games || []);
  });

  app.listen(port, () => {
    console.log(`✅ Server running at http://localhost:${port}`);
  });
};

init();
