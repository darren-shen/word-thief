"use client"
import { useState } from 'react'

const JoinForm = ({ onJoin }) => {
    const [username, setUsername] = useState('')
    const [gameId, setGameId] = useState('')
    const [error, setError] = useState('')


    const handleSubmit = async (e) => {
      e.preventDefault();
      setError('');
  
      try {
        const response = await fetch('http://localhost:5001/validate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ "username": username, "game_id": gameId }),
        });
  
        const result = await response.json();
        if (response.ok && result.valid) {
          onJoin(username, result.game_id);
        } else {
          setError(result.error || 'Validation failed');
        }
      } catch (err) {
        setError('Server error. Please try again later.');
      }
    }

    return (
        <div className="flex justify-center items-center h-screen flex-col bg-gradient-to-b from-[#5ed35c] to-[#A6FFA4]">
            <h1 className="font-bold text-main-blue text-8xl p-8">WORD THIEF</h1>
          <form onSubmit={handleSubmit} className="bg-[#F4F4F4] p-4 rounded-xl shadow-md flex flex-col items-center mb-12 w-[350px]">
            <div className="mb-4 w-full">
              <label className="block text-main-blue font-bold mb-3 text-center text-3xl" htmlFor="username">
                NAME
              </label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="text-center shadow appearance-none border rounded w-full py-2 px-3 text-main-blue leading-tight focus:outline-none focus:shadow-outline"
                required
              />
            </div>
            <div className="mb-4 w-full">
              <label className="block text-main-blue font-bold mb-3 text-center text-3xl" htmlFor="gameId">
                GAME ID
              </label>
              <input
                type="text"
                id="gameId"
                value={gameId}
                onChange={(e) => setGameId(e.target.value)}
                placeholder="Leave blank to start a lobby"
                className="text-center shadow appearance-none border rounded w-full py-2 px-3 text-main-blue leading-tight focus:outline-none focus:shadow-outline"
              />
            </div>
            <button
              type="submit"
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 rounded focus:outline-none focus:shadow-outline w-full"
            >
              JOIN GAME
            </button>
            {error && (
              <div className="mb-4 text-red-500 text-sm">
                {error}
              </div>
            )}
          </form>
        </div>
      )
}

export default JoinForm;