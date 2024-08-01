import Image from "next/image";
import GameBoard from "../components/GameBoard"

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center p-24">
      <GameBoard wordsToWin={5} numOpponents={2} letterFrequency={8} maxLetters={10} numPlayers={1} />
    </main>
  );
}
