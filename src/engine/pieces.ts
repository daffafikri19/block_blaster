// src/engine/pieces.ts
export type Cell = 0 | 1;
export type Shape = ReadonlyArray<ReadonlyArray<Cell>>;

export type PieceId =
    // Single
    | "DOT"
    // Lines
    | "I2_H"
    | "I3_H"
    | "I4_H"
    | "I5_H"
    | "I2_V"
    | "I3_V"
    | "I4_V"
    | "I5_V"
    // Squares & rectangles
    | "O2"
    | "O3"
    | "R2x3"
    | "R3x2"
    // L / J (various)
    | "L3"
    | "L3_MIRROR"
    | "L4"
    | "L4_MIRROR"
    | "L5"
    | "L5_MIRROR"
    // T
    | "T4_UP"
    | "T4_DOWN"
    | "T4_LEFT"
    | "T4_RIGHT"
    // S / Z
    | "S4_H"
    | "S4_V"
    | "Z4_H"
    | "Z4_V"
    // Plus / Cross
    | "PLUS5"
    // Steps (stair)
    | "STEP4_UP"
    | "STEP4_DOWN"
    | "STEP5_UP"
    | "STEP5_DOWN";

export type PieceDef = Readonly<{
    id: PieceId;
    shape: Shape; // matrix 0/1, origin = top-left
    blocks: number; // cached count of 1s
}>;

function freezeShape(shape: Cell[][]): Shape {
    // freeze rows (shallow) to discourage mutation in runtime
    return shape.map((row) => Object.freeze(row.slice()) as ReadonlyArray<Cell>);
}

function countBlocks(shape: Shape): number {
    let n = 0;
    for (const row of shape) for (const cell of row) if (cell === 1) n++;
    return n;
}

function def(id: PieceId, shape: Cell[][]): PieceDef {
    const frozen = freezeShape(shape);
    return Object.freeze({
        id,
        shape: frozen,
        blocks: countBlocks(frozen),
    });
}

/**
 * Catatan:
 * - Semua shape di bawah *tanpa rotasi runtime* (rotasi disediakan sebagai varian id berbeda).
 * - Origin selalu top-left dari matrix.
 * - Kalau kamu ingin “lebih mirip” game asli yang tidak bisa rotate, ini cocok.
 */
export const PIECE_LIST: ReadonlyArray<PieceDef> = Object.freeze([
    // --- Single ---
    def("DOT", [[1]]),

    // --- Lines Horizontal ---
    def("I2_H", [[1, 1]]),
    def("I3_H", [[1, 1, 1]]),
    def("I4_H", [[1, 1, 1, 1]]),
    def("I5_H", [[1, 1, 1, 1, 1]]),

    // --- Lines Vertical ---
    def("I2_V", [[1], [1]]),
    def("I3_V", [[1], [1], [1]]),
    def("I4_V", [[1], [1], [1], [1]]),
    def("I5_V", [[1], [1], [1], [1], [1]]),

    // --- Squares & rectangles ---
    def("O2", [
        [1, 1],
        [1, 1],
    ]),
    def("O3", [
        [1, 1, 1],
        [1, 1, 1],
        [1, 1, 1],
    ]),
    def("R2x3", [
        [1, 1, 1],
        [1, 1, 1],
    ]),
    def("R3x2", [
        [1, 1],
        [1, 1],
        [1, 1],
    ]),

    // --- L / J (3 blocks) ---
    def("L3", [
        [1, 0],
        [1, 1],
    ]),
    def("L3_MIRROR", [
        [0, 1],
        [1, 1],
    ]),

    // --- L / J (4 blocks) ---
    // L shape with 3 tall + foot
    def("L4", [
        [1, 0],
        [1, 0],
        [1, 1],
    ]),
    def("L4_MIRROR", [
        [0, 1],
        [0, 1],
        [1, 1],
    ]),

    // --- L / J (5 blocks) ---
    // L shape with 4 tall + foot
    def("L5", [
        [1, 0],
        [1, 0],
        [1, 0],
        [1, 1],
    ]),
    def("L5_MIRROR", [
        [0, 1],
        [0, 1],
        [0, 1],
        [1, 1],
    ]),

    // --- T (4 blocks) variants ---
    def("T4_UP", [
        [1, 1, 1],
        [0, 1, 0],
    ]),
    def("T4_DOWN", [
        [0, 1, 0],
        [1, 1, 1],
    ]),
    def("T4_LEFT", [
        [1, 0],
        [1, 1],
        [1, 0],
    ]),
    def("T4_RIGHT", [
        [0, 1],
        [1, 1],
        [0, 1],
    ]),

    // --- S / Z (4 blocks) ---
    def("S4_H", [
        [0, 1, 1],
        [1, 1, 0],
    ]),
    def("S4_V", [
        [1, 0],
        [1, 1],
        [0, 1],
    ]),
    def("Z4_H", [
        [1, 1, 0],
        [0, 1, 1],
    ]),
    def("Z4_V", [
        [0, 1],
        [1, 1],
        [1, 0],
    ]),

    // --- Plus / Cross (5 blocks) ---
    def("PLUS5", [
        [0, 1, 0],
        [1, 1, 1],
        [0, 1, 0],
    ]),

    // --- Steps / Stairs ---
    // 2x3 step (4 blocks)
    def("STEP4_UP", [
        [1, 1, 0],
        [0, 1, 1],
    ]),
    def("STEP4_DOWN", [
        [0, 1, 1],
        [1, 1, 0],
    ]),

    // 3-step (5 blocks) - common in block puzzle games
    def("STEP5_UP", [
        [1, 1, 0],
        [0, 1, 0],
        [0, 1, 1],
    ]),
    def("STEP5_DOWN", [
        [0, 1, 1],
        [0, 1, 0],
        [1, 1, 0],
    ]),
]);

export const PIECES: Readonly<Record<PieceId, PieceDef>> = Object.freeze(
    PIECE_LIST.reduce((acc, p) => {
        acc[p.id] = p;
        return acc;
    }, {} as Record<PieceId, PieceDef>)
);

/**
 * Utility: ambil piece random dari daftar (nanti bisa diganti Bag system).
 */
export function randomPieceId(rng: () => number = Math.random): PieceId {
    const idx = Math.floor(rng() * PIECE_LIST.length);
    return PIECE_LIST[idx]!.id;
}
