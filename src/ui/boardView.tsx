import React, { forwardRef, useMemo } from "react";

/**
 * Props minimal:
 * - size: ukuran board (8)
 * - cells: snapshot Uint8Array panjang size*size, isinya 0/1
 *
 * Props optional untuk preview (nanti dipakai di step drag):
 * - previewCells: set of index yang akan di-highlight
 * - previewValid: apakah preview placement valid / invalid
 */
export type BoardViewProps = {
    size: number;
    cells: Uint8Array;

    previewCells?: ReadonlySet<number>;
    previewValid?: boolean;
};

/**
 * BoardView tugasnya cuma render:
 * - 8x8 cell berdasarkan snapshot
 * - overlay preview (optional)
 *
 * Catatan untuk konten:
 * - BoardView tidak tahu rules game.
 * - BoardView cuma menampilkan data.
 */
export const BoardView = forwardRef<HTMLDivElement, BoardViewProps>(
    ({ size, cells, previewCells, previewValid }, ref) => {
        const indices = useMemo(() => Array.from({ length: size * size }, (_, i) => i), [size]);

        return (
            <div
                ref={ref}
                style={{
                    width: "min(92vw, 420px)",
                    aspectRatio: "1 / 1",
                    display: "grid",
                    gridTemplateColumns: `repeat(${size}, 1fr)`,
                    gap: 6,
                    padding: 10,
                    borderRadius: 16,
                    background: "#111",
                    border: "1px solid #222",
                    userSelect: "none",
                    touchAction: "none", // penting untuk pointer events di mobile
                    position: "relative",
                }}
            >
                {indices.map((i) => {
                    const filled = cells[i] === 1;

                    // preview overlay: hanya tampil di cell yang masih kosong
                    const inPreview = previewCells?.has(i) ?? false;

                    let bg = filled ? "#5ad1ff" : "#1c1c1c";

                    // kalau preview aktif dan cell kosong -> warnai sesuai valid/invalid
                    if (!filled && inPreview) {
                        bg = previewValid ? "#4cff7a" : "#ff4c4c";
                    }

                    return (
                        <div
                            key={i}
                            style={{
                                borderRadius: 10,
                                background: bg,
                                border: "1px solid #2a2a2a",
                                boxShadow: filled ? "0 4px 14px rgba(90, 209, 255, 0.25)" : "none",
                            }}
                        />
                    );
                })}
            </div>
        );
    }
);

BoardView.displayName = "BoardView";
