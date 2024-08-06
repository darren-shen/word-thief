"use client"
import { useState, useEffect, useRef } from 'react'
import { useWordChecker } from 'react-word-checker'
import io from 'socket.io-client';
import ReactModal from 'react-modal';

const socket = io('http://localhost:5001/', {
  transports: ["websocket"],
  cors: {
    origin: "http://localhost:3000/",
  },
  }
)

const GameBoard = ({ username, gameId }) => {
    const [gameState, setGameState] = useState({
        "letters": "",
        "players": {},
        "ended": false,
        "winner": null
    })
    const [isGameOver, setIsGameOver] = useState(false);
    const { wordExists } = useWordChecker("en")
    const [currWord, setWord] = useState('')
    const currWordCounts = useRef({})

    useEffect(() => {
      socket.emit('join_game', ({'game_id': gameId, 'username': username}))

      socket.on('game_state', (gameState) => {
        setGameState(gameState)
        if (gameState["ended"]) {
          setIsGameOver(true)
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


    /* TODO: add formatting! :D */

    return (
      <div id="gameBoard" tabIndex="0">
        <div className="flex flex-row justify-center">
          <button onClick={lettersClick}>
            <p className="mt-4 p-2">LETTERS</p>
            {gameState["letters"]?.split("").map((char, i) => (
              <span key={i} className="border border-black pl-1.5 pr-1.5 pt-0.5 pb-0.5 m-1 rounded-md inline-block">
                {char}
              </span>
            ))}
          </button>
        </div>
        <div className="flex flex-row justify-center space-x-10">
          {Object.keys(gameState.players || {}).map((playerId) => (
            <div key={playerId}>
              <button onClick={() => wordListClick(playerId, gameState.players[playerId].words)}>
                <p className="mt-4 p-2 justify-center flex flex-row">
                  {playerId === username ? 'YOUR WORDS' : playerId}
                </p>
                {gameState.players[playerId].words.map((word, i) => (
                  <div key={i} className="flex flex-row justify-center">
                    {word.split('').map((char, j) => (
                      <div key={j} className="border border-black pl-1.5 pr-1.5 pt-0.5 pb-0.5 m-1 rounded-md">
                        {char}
                      </div>
                    ))}
                  </div>
                ))}
              </button>
            </div>
          ))}
        </div>

        <input
          type="text"
          value={currWord}
          onKeyDown={handleKeyPress}
          onChange={()=>{}}
          className="absolute bottom-0 left-0 right-0 border border-black p-2 m-3 rounded-md"
          placeholder="Type your word"
        />

        <ReactModal
          isOpen={isGameOver}
          onRequestClose={() => setIsGameOver(false)}
          contentLabel="Game Over"
        >
          <h2>Game Over</h2>
          <p>{gameState["winner"]} has won the game!</p>
          <button onClick={() => setIsGameOver(false)}>Close</button>
        </ReactModal>
      </div>
    );
  };

export default GameBoard;