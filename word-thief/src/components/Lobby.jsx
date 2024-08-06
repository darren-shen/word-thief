import { useState, useEffect } from 'react';
import io from 'socket.io-client';

const socket = io('http://localhost:5001/', {
  transports: ['websocket'],
  cors: {
    origin: 'http://localhost:3000/',
  },
});

const Lobby = ({ gameId, username, onGameStart }) => {
  const [players, setPlayers] = useState([]);
  const [host, setHost] = useState(null);
  const [gameParams, setGameParams] = useState({
    words_to_win: 10,
    num_agents: 2,
    letter_frequency: 3,
    max_letters: 10,
    gametype: 'flash'
  });

  useEffect(() => {
    socket.emit('join', { username: username, game_id: gameId });

    socket.on('lobby_update', (lobbyInfo) => {
      setPlayers(lobbyInfo.players);
      setHost(lobbyInfo.host);
    });

    socket.on('game_started', () => {
      onGameStart();
    });

    const handleBeforeUnload = () => {
      socket.emit('leave', ({'game_id': gameId, 'username': username}))
    }
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      socket.off('lobby_update');
      socket.off('game_started');
    };
  }, [gameId, username]);

  const handleStartGame = () => {
    socket.emit('start', {
      game_id: gameId,
      ...gameParams,
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setGameParams((prevParams) => ({
      ...prevParams,
      [name]: name === 'num_agents' ? parseInt(value) : parseFloat(value),
    }));
  };

  const handleGameTypeChange = (e) => {
    const { value } = e.target;
    setGameParams((prevParams) => ({
      ...prevParams,
      gametype: value,
    }));
  };

  return (
    <div className="flex justify-center items-center h-screen">
      <div className="bg-white p-6 rounded shadow-md">
        <h2 className="text-2xl mb-4">Lobby {gameId}</h2>
        <h3 className="text-xl mb-2">Players:</h3>
        <ul className="list-disc list-inside mb-4">
          {players.map((player, index) => (
            <li key={index}>{player}</li>
          ))}
        </ul>
        {username === host && (
          <div>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Game Type:
              </label>
              <select
                name="gametype"
                value={gameParams.gametype}
                onChange={handleGameTypeChange}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              >
                <option value="extended">Extended</option>
                <option value="flash">Flash</option>
              </select>
            </div>

            {gameParams.gametype === 'extended' && (
              <>
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2">
                    Words to Win:
                  </label>
                  <input
                    type="number"
                    name="words_to_win"
                    value={gameParams.words_to_win}
                    onChange={handleChange}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2">
                    Letter Frequency:
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    name="letter_frequency"
                    value={gameParams.letter_frequency}
                    onChange={handleChange}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2">
                    Max Letters:
                  </label>
                  <input
                    type="number"
                    name="max_letters"
                    value={gameParams.max_letters}
                    onChange={handleChange}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  />
                </div>
              </>
            )}

            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Number of Agents:
              </label>
              <input
                type="number"
                name="num_agents"
                value={gameParams.num_agents}
                onChange={handleChange}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              />
            </div>

            <button
              onClick={handleStartGame}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            >
              Start Game
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Lobby;
