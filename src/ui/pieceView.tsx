import React, { useMemo } from "react";
import type { Shape, PieceId } from "../engine/pieces";
import { PIECES } from "../engine/pieces";

export type PieceViewProps = {
    pieceId: PieceId;

    /**
     * Ukuran visual per cell (px).
     * Ini untuk tray preview; board nanti punya ukuran sendiri.
     */
    cellPx?: number;

    /**
     * Dipakai untuk interaksi (step drag / click)
     */
    onPointerDown?: (e: React.PointerEvent<HTMLDivElement>) => void;

    /**
     * Styling state (opsional)
     */
    active?: boolean;
    disabled?: boolean;
};

/**
 * PieceView hanya render bentuk piece (matrix 0/1) menjadi kotak-kotak.
 * - Tidak tahu apa-apa soal rules placement.
 * - Tidak mengubah engine state.
 */
export function PieceView({
    pieceId,
    cellPx = 18,
    onPointerDown,
    active,
    disabled,
}: PieceViewProps) {
    const piece = PIECES[pieceId];
    const shape: Shape = piece.shape;

    const h = shape.length;
    const w = shape[0]?.length ?? 0;

    // Precompute list cell yang aktif (1) supaya render lebih rapi
    const filledCells = useMemo(() => {
        const out: { r: number; c: number }[] = [];
        for (let r = 0; r < h; r++) {
            for (let c = 0; c < w; c++) {
                if (shape[r]![c] === 1) out.push({ r, c });
            }
        }
        return out;
    }, [h, w, shape]);

    return (
        <div
            onPointerDown={disabled ? undefined : onPointerDown}
            style={{
                padding: 10,
                borderRadius: 14,
                background: disabled ? "#151515" : "#121212",
                border: active ? "1px solid #5ad1ff" : "1px solid #2a2a2a",
                opacity: disabled ? 0.5 : 1,
                cursor: disabled ? "not-allowed" : "grab",
                touchAction: "none",
                userSelect: "none",
            }}
            title={pieceId}
        >
            {/* wrapper grid untuk shape */}
            <div
                style={{
                    width: w * cellPx + (w - 1) * 4,
                    height: h * cellPx + (h - 1) * 4,
                    display: "grid",
                    gridTemplateColumns: `repeat(${w}, ${cellPx}px)`,
                    gridTemplateRows: `repeat(${h}, ${cellPx}px)`,
                    gap: 4,
                }}
            >
                {/* Render background cell kosong supaya shape terlihat konsisten */}
                {Array.from({ length: h * w }, (_, i) => {
                    const r = Math.floor(i / w);
                    const c = i % w;
                    const filled = shape[r]![c] === 1;

                    return (
                        <div
                            key={i}
                            style={{
                                borderRadius: 8,
                                background: filled ? "#5ad1ff" : "#1f1f1f",
                                border: "1px solid #2a2a2a",
                                boxShadow: filled ? "0 4px 14px rgba(90, 209, 255, 0.20)" : "none",
                            }}
                        />
                    );
                })}
            </div>
        </div>
    );
}
