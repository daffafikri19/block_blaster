import React, { useMemo, useState } from "react";
import { Game } from "./engine/game";
import { BoardView } from "./ui/boardView";

export default function App() {
  // 1) Buat game instance sekali saja.
  // useMemo dipakai supaya tidak dibuat ulang tiap render.
  const game = useMemo(() => new Game(), []);

  // 2) Snapshot awal
  const [snap, setSnap] = useState(() => game.getSnapshot());

  /**
   * Helper: commit snapshot terbaru setelah ada perubahan game.
   * Nanti akan sering dipakai setelah drop piece.
   */
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
      </div>
    </div>
  );
}
