import React, { useEffect, useMemo, useRef, useState } from "react";
import { Game } from "./engine/game";
import { BoardView } from "./ui/boardView";
import { PieceTray } from "./ui/pieceTray";
import { PIECES, type PieceId } from "./engine/pieces";

type DragState = {
  trayIndex: number;
  pieceId: PieceId;
  pointerId: number;
  clientX: number;
  clientY: number;
  offsetX: number;
  offsetY: number;
};

type HoverState = {
  row: number;
  col: number;
  valid: boolean;
  previewCells: Set<number>;
};

export default function App() {
  const game = useMemo(() => new Game(), []);
  const [snap, setSnap] = useState(() => game.getSnapshot());
  const commit = () => setSnap(game.getSnapshot());

  const boardRef = useRef<HTMLDivElement | null>(null);

  const [drag, setDrag] = useState<DragState | null>(null);
  const [hover, setHover] = useState<HoverState | null>(null);

  /**
   * ✅ cellPx: ukuran cell board yang REAL.
   * Kita pakai ini untuk:
   * - ukuran piece tray
   * - ukuran ghost piece
   */
  const [cellPx, setCellPx] = useState(18);

  // Update cellPx setiap resize board (biar selalu sinkron)
  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;

    const update = () => {
      const rect = el.getBoundingClientRect();
      const px = rect.width / snap.size;
      // kecilkan sedikit biar tray tidak terlalu besar di layar kecil (opsional)
      setCellPx(Math.max(14, Math.min(28, Math.floor(px))));
    };

    update();

    const ro = new ResizeObserver(() => update());
    ro.observe(el);

    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [snap.size]);

  /**
   * Hit-test pointer ke board → row/col
   */
  const hitTestBoard = (clientX: number, clientY: number) => {
    const el = boardRef.current;
    if (!el) return null;

    const rect = el.getBoundingClientRect();
    const inside =
      clientX >= rect.left &&
      clientX <= rect.right &&
      clientY >= rect.top &&
      clientY <= rect.bottom;

    if (!inside) return null;

    const localX = clientX - rect.left;
    const localY = clientY - rect.top;

    const px = rect.width / snap.size;
    const col = Math.floor(localX / px);
    const row = Math.floor(localY / px);

    return {
      row: Math.max(0, Math.min(snap.size - 1, row)),
      col: Math.max(0, Math.min(snap.size - 1, col)),
    };
  };

  /**
   * Generate preview cells + valid/invalid
   */
  const computePreview = (pieceId: PieceId, row: number, col: number): HoverState => {
    const { shape } = PIECES[pieceId];
    const size = snap.size;

    const previewCells = new Set<number>();
    let valid = true;

    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[0].length; c++) {
        if (shape[r]![c] !== 1) continue;

        const rr = row + r;
        const cc = col + c;

        // out of bounds
        if (rr < 0 || rr >= size || cc < 0 || cc >= size) {
          valid = false;
          continue;
        }

        const idx = rr * size + cc;

        // collision
        if (snap.cells[idx] === 1) valid = false;

        previewCells.add(idx);
      }
    }

    return { row, col, valid, previewCells };
  };

  /**
   * ✅ Start drag
   * NOTE: kita TIDAK bergantung pada onPointerMove di container,
   * karena pointer capture bisa mengalihkan event.
   * Jadi event move/up kita tangkap dari window (useEffect).
   */
  const handlePiecePointerDown = (trayIndex: number, e: React.PointerEvent<HTMLDivElement>) => {
    if (snap.isGameOver) return;

    const pieceId = snap.tray[trayIndex];
    if (!pieceId) return;

    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();

    // capture tetap boleh untuk feel, tapi tidak wajib
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);

    setDrag({
      trayIndex,
      pieceId,
      pointerId: e.pointerId,
      clientX: e.clientX,
      clientY: e.clientY,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
    });

    setHover(null);
  };

  /**
   * ✅ Window listeners: pointermove + pointerup
   * Ini yang memperbaiki bug event "nggak kebaca".
   */
  useEffect(() => {
    if (!drag) return;

    const onMove = (ev: PointerEvent) => {
      setDrag((prev) => (prev ? { ...prev, clientX: ev.clientX, clientY: ev.clientY } : prev));

      const hit = hitTestBoard(ev.clientX, ev.clientY);
      if (!hit) {
        setHover(null);
        return;
      }

      const nextHover = computePreview(drag.pieceId, hit.row, hit.col);
      setHover((prev) => {
        if (!prev) return nextHover;
        if (prev.row === nextHover.row && prev.col === nextHover.col && prev.valid === nextHover.valid) {
          return prev;
        }
        return nextHover;
      });
    };

    const onUp = () => {
      /**
       * ✅ Step 10: drop to place
       * Kalau hover valid → place ke engine
       */
      if (hover?.valid) {
        const ok = game.tryPlaceFromTray(drag.trayIndex, hover.row, hover.col);
        if (ok) commit();
      }

      setDrag(null);
      setHover(null);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag, hover, game]); // hover dipakai untuk drop

  /**
   * ✅ Ghost piece: cell size sama dengan board
   */
  const renderGhost = () => {
    if (!drag) return null;
    if (hover) return null;


    // ✅ kalau sudah di atas board (hover ada), ghost DISAMARKAN kuat
    // atau bisa return null kalau mau benar-benar hilang
    const ghostOpacity = hover ? 0.12 : 0.65;

    const { shape } = PIECES[drag.pieceId];
    const h = shape.length;
    const w = shape[0].length;

    const gap = Math.max(3, Math.floor(cellPx * 0.22));

    // ❌ hilangkan "card" gelap + border biar gak ganggu
    // ✅ cukup blocks saja, transparan
    const left = drag.clientX - drag.offsetX;
    const top = drag.clientY - drag.offsetY;

    return (
      <div
        style={{
          position: "fixed",
          left,
          top,
          pointerEvents: "none",
          zIndex: 9999,
          opacity: ghostOpacity,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${w}, ${cellPx}px)`,
            gridTemplateRows: `repeat(${h}, ${cellPx}px)`,
            gap,
            // sedikit blur biar lembut (opsional)
            filter: hover ? "blur(0.2px)" : "none",
          }}
        >
          {Array.from({ length: h * w }, (_, i) => {
            const r = Math.floor(i / w);
            const c = i % w;
            const filled = shape[r]![c] === 1;

            return (
              <div
                key={i}
                style={{
                  borderRadius: Math.max(6, Math.floor(cellPx * 0.35)),
                  background: filled ? "#5ad1ff" : "transparent",
                  // ✅ border dibuat super tipis / hilang
                  border: filled ? "1px solid rgba(255,255,255,0.08)" : "1px solid transparent",
                  // ✅ shadow tipis banget (atau hilangkan total)
                  boxShadow: filled ? "0 2px 8px rgba(90, 209, 255, 0.12)" : "none",
                }}
              />
            );
          })}
        </div>
      </div>
    );
  };


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

        <BoardView
          ref={boardRef}
          size={snap.size}
          cells={snap.cells}
          previewCells={hover?.previewCells}
          previewValid={hover?.valid}
        />

        {/* ✅ tray cell size disamakan dengan board */}
        <PieceTray
          tray={snap.tray}
          disabled={snap.isGameOver}
          activeIndex={drag?.trayIndex}
          onPiecePointerDown={handlePiecePointerDown}
          cellPx={cellPx}
        />

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

        {snap.isGameOver && <div style={{ opacity: 0.8, marginTop: 6 }}>Game Over</div>}
      </div>

      {renderGhost()}
    </div>
  );
}
