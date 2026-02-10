// src/engine/Game.ts
import { Board, type LineClearResult } from "./board";
import { PIECES, PIECE_LIST, randomPieceId, type PieceId, type PieceDef } from "./pieces";

/**
 * Snapshot adalah “data read-only” yang dikirim ke UI (React).
 * UI hanya render dari snapshot, dan tidak boleh edit state engine langsung.
 */
export type GameSnapshot = Readonly<{
    size: number;                 // board size (8)
    cells: Uint8Array;            // snapshot cell 0/1 panjang 64
    tray: ReadonlyArray<PieceId>; // 3 piece yang tersedia
    score: number;
    bestScore: number;
    isGameOver: boolean;

    // Optional info untuk UI/animasi:
    lastMove?: Readonly<{
        placedPieceId: PieceId;
        placedAt: { row: number; col: number };
        placedBlocks: number;
        cleared: LineClearResult;
        scoreDelta: number;
    }>;
}>;

/**
 * Aturan scoring kita pisahkan supaya gampang diubah tanpa mengacak Game.
 * Kamu bisa tweak angka-angka ini biar “feel”-nya mirip yang kamu mau.
 */
export type ScoringRules = Readonly<{
    pointsPerBlock: number;   // skor dasar per blok yang ditempatkan
    pointsPerLine: number;    // bonus per row/col yang ter-clear
    pointsPerCellCleared: number; // bonus per cell yang hilang (opsional)
    multiLineBonus: number;   // bonus ekstra kalau clear >= 2 line sekaligus
}>;

const DEFAULT_SCORING: ScoringRules = Object.freeze({
    pointsPerBlock: 10,
    pointsPerLine: 50,
    pointsPerCellCleared: 0,
    multiLineBonus: 40,
});

/**
 * Randomizer sederhana: default Math.random.
 * Nanti bisa kamu upgrade jadi "bag system" biar distribusi piece lebih fair.
 */
export type RNG = () => number;

/**
 * Game class adalah "otak" permainan.
 *
 * Tanggung jawab Game:
 * - Pegang instance Board
 * - Mengelola tray 3 pieces
 * - Menghitung skor & best score
 * - Cek game over
 * - Menyediakan snapshot untuk UI
 *
 * Game TIDAK mengurus:
 * - Drag & drop UI
 * - Rendering React
 */
export class Game {
    readonly board: Board;

    private tray: PieceId[] = [];
    private score = 0;
    private bestScore = 0;
    private isGameOver = false;

    private lastMove?: GameSnapshot["lastMove"];

    private readonly scoring: ScoringRules;
    private readonly rng: RNG;

    constructor(opts?: {
        size?: number;
        scoring?: Partial<ScoringRules>;
        rng?: RNG;
        bestScore?: number; // bisa inject dari localStorage
    }) {
        this.board = new Board(opts?.size ?? 8);
        this.scoring = Object.freeze({ ...DEFAULT_SCORING, ...(opts?.scoring ?? {}) });
        this.rng = opts?.rng ?? Math.random;
        this.bestScore = opts?.bestScore ?? 0;

        // start game pertama
        this.reset();
    }

    /**
     * Reset game seperti new game:
     * - Board kosong
     * - Score 0
     * - Tray di-generate ulang
     * - Game over false
     */
    reset(): void {
        this.board.reset();
        this.score = 0;
        this.isGameOver = false;
        this.lastMove = undefined;

        this.tray = this.generateTray(3);

        // Kalau awal-awal saja sudah tidak ada placement (jarang banget),
        // kita tandai game over.
        this.isGameOver = this.computeGameOver();
    }

    /**
     * UI akan memanggil ini setiap habis aksi,
     * supaya React bisa render ulang dari state terbaru.
     */
    getSnapshot(): GameSnapshot {
        return Object.freeze({
            size: this.board.size,
            cells: this.board.snapshotCells(),
            tray: Object.freeze([...this.tray]),
            score: this.score,
            bestScore: this.bestScore,
            isGameOver: this.isGameOver,
            lastMove: this.lastMove,
        });
    }

    /**
     * Getter tray (kalau UI butuh akses langsung)
     * Lebih aman pakai snapshot, tapi ini kadang berguna.
     */
    getTray(): ReadonlyArray<PieceId> {
        return this.tray;
    }

    /**
     * Ambil definisi piece dari ID
     */
    private getPieceDef(id: PieceId): PieceDef {
        return PIECES[id];
    }

    /**
     * Generate n piece untuk tray.
     * Sekarang random sederhana.
     * Nanti bisa upgrade ke:
     * - Weighted random (supaya difficulty naik perlahan)
     * - Bag system (supaya distribusi fair)
     */
    private generateTray(n: number): PieceId[] {
        const out: PieceId[] = [];
        for (let i = 0; i < n; i++) {
            out.push(randomPieceId(this.rng));
        }
        return out;
    }

    /**
     * Metode yang dipanggil UI ketika user drop piece.
     *
     * Input:
     * - trayIndex: index 0..2 (piece mana yang dipakai)
     * - row, col: target placement (snap ke grid)
     *
     * Return:
     * - true jika berhasil place
     * - false kalau placement invalid atau game over
     */
    tryPlaceFromTray(trayIndex: number, row: number, col: number): boolean {
        if (this.isGameOver) return false;

        const pieceId = this.tray[trayIndex];
        if (!pieceId) return false;

        const piece = this.getPieceDef(pieceId);

        // 1) Validasi dulu
        if (!this.board.canPlace(piece.shape, row, col)) {
            return false;
        }

        // 2) Place ke board
        const placedBlocks = this.board.place(piece.shape, row, col);

        // 3) Clear row/col penuh
        const cleared = this.board.clearFullLines();

        // 4) Hitung score delta dari aksi ini
        const scoreDelta = this.computeScoreDelta(placedBlocks, cleared);
        this.score += scoreDelta;

        // update best score
        if (this.score > this.bestScore) this.bestScore = this.score;

        // 5) Hapus piece dari tray
        this.tray.splice(trayIndex, 1);

        // 6) Kalau tray habis (sudah 3 dipakai), generate ulang 3
        if (this.tray.length === 0) {
            this.tray = this.generateTray(3);
        }

        // 7) Update lastMove untuk UI (misal animasi / toast score)
        this.lastMove = Object.freeze({
            placedPieceId: pieceId,
            placedAt: { row, col },
            placedBlocks,
            cleared,
            scoreDelta,
        });

        // 8) Cek game over setelah board berubah & tray berubah
        this.isGameOver = this.computeGameOver();

        return true;
    }

    /**
     * Ini fungsi scoring utama.
     * Kamu bisa jelasin di video bahwa scoring itu "aturan", jadi dipisah.
     */
    private computeScoreDelta(placedBlocks: number, cleared: LineClearResult): number {
        const { pointsPerBlock, pointsPerLine, pointsPerCellCleared, multiLineBonus } = this.scoring;

        const linesCleared = cleared.clearedRows.length + cleared.clearedCols.length;

        let total = 0;

        // skor dasar: jumlah blok yang ditaruh
        total += placedBlocks * pointsPerBlock;

        // bonus clear line
        total += linesCleared * pointsPerLine;

        // bonus berdasarkan jumlah cell yang benar-benar hilang (optional)
        total += cleared.clearedCount * pointsPerCellCleared;

        // bonus extra kalau clear 2 line atau lebih dalam 1 move
        if (linesCleared >= 2) total += multiLineBonus;

        return total;
    }

    /**
     * Logic game over:
     * Jika TIDAK ADA satupun piece di tray yang bisa ditempatkan di board,
     * maka game over.
     */
    private computeGameOver(): boolean {
        for (const id of this.tray) {
            const piece = this.getPieceDef(id);
            if (this.board.hasAnyPlacement(piece.shape)) {
                return false; // masih bisa main
            }
        }
        return true; // semua piece buntu
    }

    /**
     * Best score biasanya disimpan di localStorage oleh UI layer.
     * Tapi engine tetap sediakan setter supaya clean.
     */
    setBestScore(value: number): void {
        if (Number.isFinite(value) && value >= 0) {
            this.bestScore = Math.floor(value);
            if (this.score > this.bestScore) this.bestScore = this.score;
        }
    }

    /**
     * Kadang UI butuh akses score langsung (optional).
     * Disarankan tetap via snapshot.
     */
    getScore(): number {
        return this.score;
    }

    getBestScore(): number {
        return this.bestScore;
    }

    getIsGameOver(): boolean {
        return this.isGameOver;
    }
}
