import React from "react";
import type { PieceId } from "../engine/pieces";
import { PieceView } from "./pieceView";

export type PieceTrayProps = {
    tray: ReadonlyArray<PieceId>;

    /**
     * Callback interaksi (dipakai step drag).
     * index = 0..2
     */
    onPiecePointerDown?: (index: number, e: React.PointerEvent<HTMLDivElement>) => void;

    /**
     * Optional: menandai piece mana yang sedang aktif/di-drag
     */
    activeIndex?: number;

    /**
     * Disable tray jika game over (opsional)
     */
    disabled?: boolean;

    /**
     * cell size agar sama dengan board
     */
    cellPx?: number;
};

/**
 * PieceTray hanya bertugas menampilkan 3 piece.
 * Interaksi diserahkan ke parent (App) via callback.
 */
export function PieceTray({
    tray,
    onPiecePointerDown,
    activeIndex,
    disabled,
    cellPx = 18
}: PieceTrayProps) {
    return (
        <div style={{ display: "flex", gap: "10px" }}>
            {tray.map((pieceId, idx) => (
                <PieceView
                    key={`${pieceId}-${idx}`}
                    pieceId={pieceId}
                    cellPx={cellPx}
                    active={activeIndex === idx}
                    disabled={disabled}
                    onPointerDown={
                        onPiecePointerDown
                            ? (e) => onPiecePointerDown(idx, e)
                            : undefined
                    }
                />
            ))}
        </div>
    );
}
