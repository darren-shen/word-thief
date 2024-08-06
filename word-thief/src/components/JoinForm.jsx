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
        <div className="flex justify-center items-center h-screen">
          <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow-md">
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="username">
                Username
              </label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="gameId">
                Game ID
              </label>
              <input
                type="text"
                id="gameId"
                value={gameId}
                onChange={(e) => setGameId(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              />
            </div>
            <button
              type="submit"
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            >
              Join Game
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