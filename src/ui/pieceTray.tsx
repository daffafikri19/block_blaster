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
}: PieceTrayProps) {
    return (
        <div
            style={{
                width: "min(92vw, 420px)",
                display: "flex",
                gap: 10,
                justifyContent: "space-between",
                padding: 10,
                borderRadius: 16,
                background: "#101010",
                border: "1px solid #222",
            }}
        >
            {tray.map((pieceId, idx) => (
                <PieceView
                    key={`${pieceId}-${idx}`}
                    pieceId={pieceId}
                    cellPx={18}
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
