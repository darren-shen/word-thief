"use client"
import { useState, useEffect, useRef } from 'react'
import { useWordChecker } from 'react-word-checker'
import { words } from 'popular-english-words'
import io from 'socket.io-client';

const socket = io('http://localhost:5001');
const MAX_LETTERS = 10

const GameBoard = ({ wordsToWin, numOpponents }) => {
    const [letters, setLetters] = useState('')
    const letterCounts = useRef({});
    const [currWord, setWord] = useState('')
    const currWordCounts = useRef({});
    const [yourWords, setYourWords] = useState([])

    const [gameState, setGameState] = useState({})
    const { wordExists } = useWordChecker("en");
    

    /* INITIALIZE ENEMIES */

    const makeAgents = (numOpponents) => {
      const agents = []
      for (let i = 1; i <= numOpponents; i++) {
        const next = { id: i, words: ['TEST'], vocab: words.getMostPopular(500 + 2000 * (i - 1)) }
        next.vocab.sort(() => Math.random() - 0.5)
        next.vocab = next.vocab.map(function(x){ return x.toUpperCase() })
        agents.push(next)
      }
      return agents
    };

    // const [agents, setAgents] = useState(() => makeAgents(numOpponents))


    /* INITIALIZE BACKEND */
    useEffect(() => {
      const initializeGame = async () => {
        const gameState = await axios.post('http://localhost:5000/initialize', numOpponents)
        setLetters(gameState.data.letters)
        setYourWords(gameState.data.players[0].words)
      }
      initializeGame()
    }, [numOpponents])


    /* REMOVE LETTERS FROM CURRENT GIVEN NEW COUNT */
    const removeLetters = (letters, removeCount) => {
      let newLetters = ""
      for (const letter of letters) {
        if (removeCount[letter] > 0) {
          letterCounts.current[letter] -= 1
          removeCount[letter] -= 1
        } else {
          newLetters += letter
        }
        setLetters(newLetters)
      }
    }


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

    const generateRandomPermutation = (n) => {
      let permutation = Array
          .from({ length: n }, (_, i) => i );
      permutation
          .sort(() => Math.random() - 0.5);
      return permutation
    }

    const valid = ( attemptedWord ) => {
      if (attemptedWord.length < 3) {
        return { valid: false }
      }
      const wordCounts = {}
      for (const letter of attemptedWord) {
        wordCounts[letter] = (wordCounts[letter] || 0) + 1
      }

      const checkOrder = generateRandomPermutation(numOpponents + 2)

      for (const id of checkOrder) {
          if (check(letterCounts.current, wordCounts)) {
            console.log(letterCounts.current, wordCounts)
            return { valid: true, lettersUsed: wordCounts }
          }
        // } else if (id == 0) {
        //   for (const agentWord of yourWords) {
        //     const combinedCounts = { ...letterCounts.current }
        //     const chosenCounts = {}
        //     for (const letter of agentWord) {
        //       combinedCounts[letter] = (combinedCounts[letter] || 0) + 1
        //       chosenCounts[letter] = (chosenCounts[letter] || 0) + 1
        //     }
        //     if (check(combinedCounts, wordCounts) && check(wordCounts, chosenCounts) && !same(chosenCounts, wordCounts)) {
        //       const finalCounts = { ...wordCounts }
        //       for (const letter of agentWord) {
        //         finalCounts[letter] -= 1
        //       }
        //       return { valid: true, lettersUsed: finalCounts, agentUsed: id, wordUsed: agentWord }
        //     } 
        //   }
        // } else {
        //   for (const agentWord of agents[id - 1].words) {
        //     const combinedCounts = { ...letterCounts.current }
        //     const chosenCounts = {}
        //     for (const letter of agentWord) {
        //       combinedCounts[letter] = (combinedCounts[letter] || 0) + 1
        //       chosenCounts[letter] = (chosenCounts[letter] || 0) + 1
        //     }
        //     if (check(combinedCounts, wordCounts) && check(wordCounts, chosenCounts) && !same(chosenCounts, wordCounts)) {
        //       const finalCounts = { ...wordCounts }
        //       for (const letter of agentWord) {
        //         finalCounts[letter] -= 1
        //       }
        //       return { valid: true, lettersUsed: finalCounts, agentUsed: id, wordUsed: agentWord }
        //     } 
        //   }
        // } 
      }
      return { valid: false }
    }


    /* MOUSE CLICKS TO FINISH WORDS */

    const lettersClick = () => {
      if (!(wordExists(currWord)) || currWord.length < 3){
        return
      }
      for (const letter in currWordCounts.current) {
        if (currWordCounts.current[letter] > (letterCounts.current[letter] || 0)) {
          return 
        }
      }
      setYourWords([...yourWords, currWord])
      setWord('')
      removeLetters(letters, currWordCounts.current)
      currWordCounts.current = {}
    }

    const wordListClick = (wordList) => {
      if (!(wordExists(currWord)) || currWord.length < 3){
        return
      }
      for (const word of wordList) {
        console.log(letterCounts.current)
        const combinedCounts = { ...letterCounts.current }
        const chosenCounts = {}
        for (const letter of word) {
          combinedCounts[letter] = (combinedCounts[letter] || 0) + 1
          chosenCounts[letter] = (chosenCounts[letter] || 0) + 1
        }
        console.log(combinedCounts)
        console.log(currWordCounts.current)
        if (check(combinedCounts, currWordCounts.current) && check(currWordCounts.current, chosenCounts) && !same(currWordCounts.current, chosenCounts)) {
          const wordIndex = wordList.indexOf(word);
          if (wordIndex !== -1) {
            wordList.splice(wordIndex, 1);
          }
          const usedLetterCounts = { ...currWordCounts.current }
          for (const letter of word) {
            usedLetterCounts[letter] -= 1
          }

          removeLetters(letters, usedLetterCounts)

          setYourWords([...yourWords, currWord])
          setWord('')
          currWordCounts.current = {}
          return
        } 
      }
    }


    /* GENERATE RANDOM LETTERS */

    useEffect(() => {
      const addRandomLetter = () => {
        const ALPHABET = "AAAAAAAAAAAAABBBCCCDDDDDDEEEEEEEEEEEEEEEEEEFFFGGGGHHHIIIIIIIIIIIIJJKKLLLLLMMMNNNNNNNNOOOOOOOOOOOPPPQQRRRRRRRRRSSSSSSTTTTTTTTTUUUUUUVVVWWWXXYYYZZ"
        if (letters.length < MAX_LETTERS) {
          const newLetter = ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
          setLetters(letters + newLetter)
          letterCounts.current[newLetter] = (letterCounts.current[newLetter] || 0) + 1
        } else {
          clearInterval(intervalId)
        }
      }

      const intervalId = setInterval(addRandomLetter, 1200);

      return () => clearInterval(intervalId)
    }, [letters]);


    /* ENEMY MAKES RANDOM MOVES */

    /*
    useEffect(() => {
      const agentMoves = () => {
        for (const vocabWord of agents[0].vocab) {
          const curr = valid(vocabWord)
          if (curr.valid) {
            console.log(curr)
            console.log(vocabWord)
            if (curr.agentUsed) {
              const wordIndex = agents[curr.agentUsed - 1].words.indexOf(curr.wordUsed);
              if (wordIndex !== -1) {
                agents[curr.agentUsed - 1].words.splice(wordIndex, 1);
              }
            }
            
            console.log(letters)
            removeLetters(letters, curr.lettersUsed)

            agents[0].words = [ ...agents[0].words, vocabWord ]
            return
          }
        }
      }

      const intervalId = setInterval(agentMoves, 1000);

      return () => clearInterval(intervalId)
    }, [letters]);

    /*

    useEffect(() => {
      const agentMoves = (agent) => {
        console.log(agent)
        for (const vocabWord of agent.vocab) {
          const curr = valid(vocabWord)
          if (curr.valid) {
            console.log(vocabWord)
            if (curr.agentUsed) {
              const wordIndex = agents[id - 1].words.indexOf(curr.wordUsed);
              if (wordIndex !== -1) {
                agents[id - 1].words.splice(wordIndex, 1);
              }
            }
            
            let newLetters = ""
            for (const letter of letters) {
              if (curr.lettersUsed[letter] > 0) {
                letterCounts.current[letter] -= 1
                curr.lettersUsed[letter] -= 1
              } else {
                newLetters += letter
              }
              setLetters(newLetters)
            }

            agent.words = [ ...agent.words, vocabWord]
          }
        }
      }

      const agentIntervalIds = agents.map((agent) => {
        return setInterval(() => agentMoves(agent), Math.random() * 5000 + 3000) // Random interval between 3 to 8 seconds
      })

      return () => {
        agentIntervalIds.forEach(clearInterval);
      };
    }, [agents]);



    /* NEXT STEPS: 2. enemy ai to take random words, random timing between takes (to simulate different difficulties, 
    make "dictionaries" of words that each difficulty ai can use) 3. win condition 4. formatting! make things look nice */ 


    return (
      <div id="gameBoard" tabIndex="0">
        <div className="flex flex-row justify-center">
          <button onClick={() => lettersClick()}>     
            <p className="mt-4 p-2">LETTERS</p>
            {letters.split('').map((char, i) => (
              <span key={i} className="border border-black pl-1.5 pr-1.5 pt-0.5 pb-0.5 m-1 rounded-md inline-block">
                {char}
              </span>
            ))}
          </button>
        </div>
        <div className="flex flex-row justify-center space-x-10">
          <div key={0}>
            <button onClick={() => wordListClick(yourWords)}>
              <p className="mt-4 p-2 justify-center flex flex-row">YOUR WORDS</p>
              {yourWords.map((word, i) => (
                <div key={i} className="flex flex-row justify-center" >
                  {word.split('').map((char, j) => (
                    <div key={j} className="border border-black pl-1.5 pr-1.5 pt-0.5 pb-0.5 m-1 rounded-md">
                      {char}
                    </div>
                  ))}
                </div>
            ))}
            </button>
          </div>
          {agents.map((agent) => (
            <div key={agent.id}>
              <button onClick={() => wordListClick(agent.words)}>
                <p className="mt-4 p-2 justify-center flex flex-row">ENEMY {agent.id}</p>
                {agent.words.map((word, i) => (
                  <div key={i} className="flex flex-row justify-center" >
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
      </div>
    );
  };

export default GameBoard;