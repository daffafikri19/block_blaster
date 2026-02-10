import React, { useMemo, useState } from "react";
import { Game } from "./engine/game";
import { BoardView } from "./ui/boardView";
import { PieceTray } from "./ui/pieceTray";

export default function App() {
  const game = useMemo(() => new Game(), []);
  const [snap, setSnap] = useState(() => game.getSnapshot());

  const commit = () => setSnap(game.getSnapshot());

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "#0b0b0b",
        color: "white",
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
        padding: 16,
      }}
    >
      <div style={{ display: "grid", gap: 12, justifyItems: "center" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "baseline" }}>
          <div style={{ fontSize: 18, opacity: 0.9 }}>Score: {snap.score}</div>
          <div style={{ fontSize: 14, opacity: 0.6 }}>Best: {snap.bestScore}</div>
        </div>

        <BoardView size={snap.size} cells={snap.cells} />

        {/* ✅ Tray 3 piece */}
        <PieceTray tray={snap.tray} disabled={snap.isGameOver} />

        <button
          onClick={() => {
            game.reset();
            commit();
          }}
          style={{
            marginTop: 6,
            padding: "10px 14px",
            borderRadius: 12,
            background: "#222",
            border: "1px solid #333",
            color: "white",
            cursor: "pointer",
          }}
        >
          Restart
        </button>

        {snap.isGameOver && (
          <div style={{ opacity: 0.8, marginTop: 6 }}>Game Over</div>
        )}
      </div>
    </div>
  );
}
