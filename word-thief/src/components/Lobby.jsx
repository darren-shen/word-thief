import { useState, useEffect } from 'react';
import Image from 'next/image';
import io from 'socket.io-client';
import activeFlash from "../../public/assets/ActiveFlash.svg"
import inactiveFlash from "../../public/assets/InactiveFlash.svg"
import activeExtended from "../../public/assets/ActiveExtended.svg"
import inactiveExtended from "../../public/assets/InactiveExtended.svg"

const socket = io('http://localhost:5001/', {
  transports: ['websocket'],
  cors: {
    origin: 'http://localhost:3000/',
  },
});

const Lobby = ({ gameId, username, onGameStart }) => {
  const [players, setPlayers] = useState([]);
  const [host, setHost] = useState(null);
  const [currGametype, setCurrGametype] = useState('flash');
  const [gameParams, setGameParams] = useState({
    words_to_win: 10,
    num_agents: 2,
    letter_frequency: 2,
    max_letters: 10
  });

  const handleToggle = () => {
    setCurrGametype((gametype) => (gametype === 'flash' ? 'extended' : 'flash'));
  };

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
  }, [gameId, username, onGameStart]);

  const handleStartGame = () => {

    socket.emit('start', {
      game_id: gameId,
      gametype: currGametype,
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

  return (
    <div className="relative flex justify-center items-center h-screen bg-gradient-to-b from-[#5ed35c] to-[#A6FFA4]">
      <div className="flex flex-col mx-6 justify-between">
        {username === host && (
          <>
          <div className="relative-group group flex mt-2">
            <div className=" text-main-blue text-sm w-[150px] invisible group-hover:visible mt-4 mr-4 text-right">Flash mode! Letters appear every 2 seconds, and after all 144 letters have appeared the player with the most letters wins.</div>
            <button
              onClick={handleToggle}
              className={`pt-4 w-24 h-[200px] rounded-lg flex items-center justify-center transition-all duration-300 ${
                currGametype === 'flash' ? 'bg-[#00D12E] shadow-inner-dark' : 'bg-[#C3C3C3] shadow-outer-dark'
              }`}
              >
              <Image
                priority
                src={currGametype === 'flash' ? activeFlash : inactiveFlash}
                alt="Flash Mode Icon"
                />
            </button>
          </div>
          <div className="relative-group group flex">
          <div className=" text-main-blue text-sm w-[150px] invisible group-hover:visible mt-4 mr-4 text-right">Extended mode! In this gamemode you can choose how frequently letters appear, and you play until someone makes {gameParams.words_to_win} words.</div>
            <button
              onClick={handleToggle}
              className={`pt-4 w-24 h-[200px] rounded-lg flex items-center justify-center transition-all duration-300 ${
                currGametype === 'flash' ? 'bg-[#C3C3C3] shadow-outer-dark' : 'bg-[#00D12E] shadow-inner-dark'
              }`}
              >
              <Image
                priority
                src={currGametype === 'flash' ? inactiveExtended : activeExtended}
                alt="Extended Mode Icon"
                />
            </button>
          </div>
          </>
          )}
      </div>
      <div className="flex flex-col items-center">
        <div className="bg-white p-4 rounded shadow-md my-3 w-[350px] text-center">
          <h2 className="text-2xl font-bold text-main-blue">LOBBY ID: {gameId}</h2>
        </div>
        <div className="bg-white p-4 rounded shadow-md my-3 w-[350px] h-[400px] overflow-auto text-main-blue">
          <h3 className="text-2xl text-center font-bold text-main-blue">PLAYERS</h3>
          <hr className="h-px my-4 bg-main-blue border-0 dark:bg-main-blue"></hr>
          <ul className="list-disc list-inside mb-4 text-main-blue">
            {players.map((player, index) => (
              <div key={index} className="text-center font-bold text-2xl p-2">{player} {player === host && '(HOST)'}</div>
            ))}
          </ul>
        </div>
        {username == host && (
          <button
            onClick={handleStartGame}
            className="text-2xl my-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-[350px]"
          >
            START GAME
          </button>
        )}
      </div>
      <div className="flex flex-col mx-6 justify-between">
          {username === host && (
            <div className="bg-white p-3 rounded shadow-md w-[220px] text-main-blue mt-2">
                <div className="text-2xl font-bold text-center my-1">SETTINGS</div>
                <hr class="h-px mt-4 mb-3 bg-main-blue border-0 dark:bg-main-blue"></hr>
                {currGametype === 'extended' && (
                  <>
                    <div className="mb-2">
                      <label className="block text-main-blue text-lg font-bold mb-1 text-center">
                        WORDS TO WIN
                      </label>
                      <input
                        type="number"
                        name="words_to_win"
                        value={gameParams.words_to_win}
                        onChange={handleChange}
                        className="text-center shadow appearance-none border rounded w-full py-2 px-3 text-main-blue leading-tight focus:outline-none focus:shadow-outline"
                        />
                    </div>
                    <div className="mb-2">
                      <label className="block text-main-blue text-lg font-bold mb-1 text-center">
                        LETTER FREQUENCY
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        name="letter_frequency"
                        value={gameParams.letter_frequency}
                        onChange={handleChange}
                        className="text-center shadow appearance-none border rounded w-full py-2 px-3 text-main-blue leading-tight focus:outline-none focus:shadow-outline"
                        />
                    </div>
                    <div className="mb-2">
                      <label className="block text-main-blue text-lg font-bold mb-1 text-center">
                        MAX LETTERS
                      </label>
                      <input
                        type="number"
                        name="max_letters"
                        value={gameParams.max_letters}
                        onChange={handleChange}
                        className="text-center shadow appearance-none border rounded w-full py-2 px-3 text-main-blue leading-tight focus:outline-none focus:shadow-outline"
                        />
                    </div>
                  </>
                )}

                <div className="mb-2">
                  <label className="block text-main-blue text-lg font-bold mb-1 text-center">
                    ENEMIES
                  </label>
                  <input
                    type="number"
                    name="num_agents"
                    value={gameParams.num_agents}
                    onChange={handleChange}
                    className="text-center shadow appearance-none border rounded w-full py-2 px-3 text-main-blue leading-tight focus:outline-none focus:shadow-outline"
                    />
                </div>

              </div>
            )}
      </div>
    </div>
  );
};

export default Lobby;
