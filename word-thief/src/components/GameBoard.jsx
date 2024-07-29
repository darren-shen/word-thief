"use client"
import { useState, useEffect, useRef } from 'react';
const MAX_LETTERS = 10

const GameBoard = ({ wordsToWin, numOpponents }) => {
    const [letters, setLetters] = useState('')
    const letterCounts = useRef({});
    const [currWord, setWord] = useState('')
    const currWordCounts = useRef({});
    const [words, setWords] = useState([])

    /* INITIALIZE ENEMIES */

    const makeAgents = (numOpponents) => {
      const agents = []
      for (let i = 1; i <= numOpponents; i++) {
        agents.push({ id: i, words: ['TEST'] })
      }
      return agents
    };

    const [agents, setAgents] = useState(() => makeAgents(numOpponents))


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


    /* MOUSE CLICKS TO FINISH WORDS */

    const lettersClick = () => {
      for (const letter in currWordCounts.current) {
        if (currWordCounts.current[letter] > (letterCounts.current[letter] || 0)) {
          return false
        }
      }
      setWords([...words, currWord])
      setWord('')
      let newLetters = ''

      for (const letter of letters) {
        if (currWordCounts.current[letter] > 0) {
          letterCounts.current[letter] -= 1
          currWordCounts.current[letter] -= 1
        } else {
          newLetters += letter
        }
        setLetters(newLetters)
      }
      currWordCounts.current = {}
    }

    const check = (counts) => {
      for (const letter in currWordCounts.current) {
        if (currWordCounts.current[letter] > (counts[letter] || 0)) {
          return false
        }
      }
      return true
    }

    const wordListClick = (wordList) => {
      console.log(currWordCounts.current)
      for (const word of wordList) {
        console.log(letterCounts.current)
        const combinedCounts = { ...letterCounts.current }
        for (const letter of word) {
          combinedCounts[letter] = (combinedCounts[letter] || 0) + 1
        }
        console.log(combinedCounts)
        console.log(currWordCounts.current)
        if (check(combinedCounts)) {
          const wordIndex = wordList.indexOf(word);
          if (wordIndex !== -1) {
            wordList.splice(wordIndex, 1);
          }
          const usedLetterCounts = { ...currWordCounts.current }
          for (const letter of word) {
            usedLetterCounts[letter] -= 1
          }

          let newLetters = ""
          for (const letter of letters) {
            if (usedLetterCounts[letter] > 0) {
              letterCounts.current[letter] -= 1
              usedLetterCounts[letter] -= 1
            } else {
              newLetters += letter
            }
            setLetters(newLetters)
          }

          setWords([...words, currWord])
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
        /* this shouldnt be random, letters should have a particular distribution */
        if (letters.length < MAX_LETTERS) {
          const newLetter = ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
          setLetters(letters => letters + newLetter)
          letterCounts.current[newLetter] = (letterCounts.current[newLetter] || 0) + 1
        } else {
          clearInterval(intervalId)
        }
      }

      const intervalId = setInterval(addRandomLetter, 1000);

      return () => clearInterval(intervalId)
    }, [letters]);


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
            <button onClick={() => wordListClick(words)}>
              <p className="mt-4 p-2 justify-center flex flex-row">YOUR WORDS</p>
              {words.map((word, i) => (
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