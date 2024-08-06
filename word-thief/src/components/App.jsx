"use client"
import { useState } from 'react'
import JoinForm from "./JoinForm";
import Lobby from "./Lobby";
import GameBoard from "./GameBoard";

const App = () => {
    const [userDetails, setUserDetails] = useState({ "username": "", "game_id": ""})
    const [stage, setStage] = useState("join") // can be join, lobby, game

    const handleJoin = (username, game_id) => {
        // should call join in backend here and check if it is a valid join
        setUserDetails({"username": username, "game_id": game_id})
        setStage("lobby")
    }

    const handleLobby = () => {
        setStage("game")
    }

    console.log(stage)
    console.log(userDetails)
    return (
        <div>
          {stage === "join" && <JoinForm onJoin={handleJoin} />}
          {stage === "lobby" && (
            <Lobby
              username={userDetails["username"]}
              gameId={userDetails["game_id"]}
              onGameStart={handleLobby}
            />
          )}
          {stage === "game" && (
            <GameBoard
              username={userDetails["username"]}
              gameId={userDetails["game_id"]}
            />
          )}
        </div>
    )
}

export default App;