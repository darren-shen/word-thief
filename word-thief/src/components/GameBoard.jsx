"use client"
import { useState, useEffect, useRef } from 'react'
import { useWordChecker } from 'react-word-checker'
import io from 'socket.io-client';
import ReactModal from 'react-modal';
import LetterTile from './LetterTile'

const socket = io(process.env.NEXT_PUBLIC_ROOT_API_URL, {
  transports: ["websocket"],
  cors: {
    origin: "https://word-thief.vercel.app/",
  },
  }
)

const GameBoard = ({ username, gameId, onGameEnd }) => {
    const [gameState, setGameState] = useState({
        "letters": "",
        "players": {},
        "ended": false,
        "winner": null
    })
    const [isGameOver, setIsGameOver] = useState(false);
    const [scoreboard, setScoreboard] = useState(false);
    const { wordExists } = useWordChecker("en")
    const [currWord, setWord] = useState('')
    const currWordCounts = useRef({})

    useEffect(() => {
      socket.emit('join_game', ({'game_id': gameId, 'username': username}))

      socket.on('game_state', (gameState) => {
        setGameState(gameState)
        if (gameState["ended"]) {
          setIsGameOver(true)
          setScoreboard(true)
        }
      }, [username, gameId])

      const handleBeforeUnload = () => {
        socket.emit('leave_game', ({'game_id': gameId, 'username': username}))
      }
      window.addEventListener('beforeunload', handleBeforeUnload)

      return () => {
        socket.emit('leave_game', ({'game_id': gameId, 'username': username}))
        socket.off('game_state')
      }
    }, [gameId, username])


    /* KEY PRESSES FOR INPUT FIELD */

    const handleKeyPress = (e) => {
      /* check if word is in dictionary and can be made w available letters and other words */
      /* eventually should be more than just hitting enter, rather it should be */
      /* you click on either letters or the words of the person you want to steal from and it auto selects longest word */
      if (e.key === 'Backspace') {
        const lastChar = currWord.slice(-1)
        setWord(currWord.slice(0, -1))
        if (lastChar) {
          currWordCounts.current[lastChar] -= 1
        }
      } else if (/^[A-Za-z]$/.test(e.key)) {
        const nextChar = e.key.toUpperCase()
        setWord(currWord + nextChar)
        currWordCounts.current[nextChar] = (currWordCounts.current[nextChar] || 0) + 1
      }
    };


    /* CHECK IF WORD IS VALID */

    const check = (largerCount, smallerCount) => {
      for (const letter in smallerCount) {
        if (smallerCount[letter] > (largerCount[letter] || 0)) {
          return false
        }
      }
      return true
    }

    const same = (largerCount, smallerCount) => {
      for (const letter in smallerCount) {
        if (smallerCount[letter] != (largerCount[letter] || 0)) {
          return false
        }
      }
      for (const letter in largerCount) {
        if (largerCount[letter] != (smallerCount[letter] || 0)) {
          return false
        }
      }
      return true
    }


    /* MOUSE CLICKS TO FINISH WORDS */

    const lettersClick = () => {
      if (!(wordExists(currWord)) || currWord.length < 3){
        return
      }
      for (const letter in currWordCounts.current) {
        if (currWordCounts.current[letter] > (gameState["letter_counts"][letter] || 0)) {
          return 
        }
      }

      console.log(gameState["letter_counts"])
      socket.emit('process_packet', { "game_id": gameId, "add_word": currWord, "add_id": username, "remove_letters": currWord })
      socket.on('game_state', (gameState) => {
        setGameState(gameState)
      })

      setWord('')
      currWordCounts.current = {}
    }

    const wordListClick = (clickId, wordList) => {
      if (!(wordExists(currWord)) || currWord.length < 3){
        return
      }
      for (const word of wordList) {
        const combinedCounts = { ...gameState["letter_counts"] }
        const chosenCounts = {}
        for (const letter of word) {
          combinedCounts[letter] = (combinedCounts[letter] || 0) + 1
          chosenCounts[letter] = (chosenCounts[letter] || 0) + 1
        }
        if (check(combinedCounts, currWordCounts.current) && check(currWordCounts.current, chosenCounts) && !same(currWordCounts.current, chosenCounts)) {
          const usedLetterCounts = { ...currWordCounts.current }
          for (const letter of word) {
            usedLetterCounts[letter] -= 1
          }
          let remove = ""
          for (const letter in usedLetterCounts) {
            for (let i = 0; i < usedLetterCounts[letter]; i++) {
              remove += letter
            }
          }

          socket.emit('process_packet', { "game_id": gameId, "add_word": currWord, "add_id": username, "remove_word": word, "remove_id": clickId, "remove_letters": remove })
          socket.on('game_state', (gameState) => {
            setGameState(gameState)
          })

          setWord('')
          currWordCounts.current = {}
          return
        } 
      }
    }

    return (
      <div id="gameBoard" tabIndex="0" className="bg-gradient-to-b from-[#151444] to-[#7F5AE0] absolute inset-0 flex flex-col">
        <div className="flex flex-row justify-center h-[140px]">
          <button onClick={lettersClick}>
            <p className="p-2 text-white font-bold text-2xl">LETTERS</p>
            <div className="bg-gradient-to-b from-[#E4EAFE] to-[#C7D1F6] rounded-md p-4">
              {gameState["letters"]?.split("").map((char, i) => (
                <LetterTile key={i} letter={char} />
              ))}
            </div>
          </button>
        </div>
        <div className="flex flex-row justify-center space-x-10">
          {Object.keys(gameState.players || {}).map((playerId) => (
            <div key={playerId}>
              <button onClick={() => wordListClick(playerId, gameState.players[playerId].words)}>
                <p className="text-white font-bold text-2xl mt-4 p-2 justify-center flex flex-row">
                  {playerId === username ? 'YOUR WORDS' : playerId}
                </p>
                <div className="w-[350px] p-6 bg-gradient-to-b from-[#E4EAFE] to-[#C7D1F6] rounded-md overflow-auto" style={{ maxHeight: `calc(100vh - 300px)` }}>
                  {gameState.players[playerId].words.map((word, i) => (
                    <div key={i} className="flex flex-row justify-center py-0.5">
                      {word.split('').map((char, j) => (
                        <LetterTile key={i} letter={char} />
                      ))}
                    </div>
                  ))}
                </div>
              </button>
            </div>
          ))}
        </div>

        {isGameOver ? (
        <button className="text-center fixed bottom-0 left-0 right-0 bg-gradient-to-b from-[#E4EAFE] to-[#C7D1F6] rounded-lg p-2 m-6 text-main-blue h-[50px] text-xl font-bold" onClick={() => setScoreboard(true)}>
          OPEN SCOREBOARD
        </button>) : (
        <input
          type="text"
          value={currWord}
          onKeyDown={handleKeyPress}
          onChange={()=>{}}
          className="text-center fixed bottom-0 left-0 right-0 bg-gradient-to-b from-[#E4EAFE] to-[#C7D1F6] rounded-lg p-2 m-6 text-main-blue h-[50px] text-xl font-bold"
          placeholder="TYPE YOUR WORD"
        />)}

        <ReactModal
          isOpen={scoreboard}
          onRequestClose={() => setScoreboard(false)}
          contentLabel="Game Over"
          style={{
            overlay: {
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
            },
            content: {
              top: '50%',
              left: '50%',
              right: 'auto',
              bottom: 'auto',
              marginRight: '-50%',
              transform: 'translate(-50%, -50%)',
              width: '300px',
              height: '400px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              textAlign: 'center',
            }
          }}
        >
          <h2 className="font-bold text-xl text-main-blue">GAME OVER</h2>
          <p className="text-lg text-main-blue">{gameState["winner"]} has won the game!</p>
          <button className="absolute bottom-4 bg-gradient-to-b from-[#E4EAFE] to-[#C7D1F6] rounded-lg py-1 px-3 m-2 text-main-blue h-[50px] text-xl font-bold" onClick={() => onGameEnd()}>HOME</button>
        </ReactModal>
      </div>
    );
  };

export default GameBoard;