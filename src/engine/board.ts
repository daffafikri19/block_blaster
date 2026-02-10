import type { Shape } from "./pieces";

/**
 * Struktur hasil dari proses clear line.
 * Kita return informasi lengkap supaya Game class bisa:
 * - Hitung skor
 * - Trigger animasi
 * - Deteksi combo
 */
export type LineClearResult = Readonly<{
    clearedRows: number[];  // indeks row yang penuh
    clearedCols: number[];  // indeks col yang penuh
    clearedCount: number;   // total cell unik yang dihapus
}>;

/**
 * Board adalah representasi papan 8x8.
 * 
 * Tanggung jawab Board:
 * - Menyimpan state cell (kosong / terisi)
 * - Validasi apakah piece bisa diletakkan
 * - Meletakkan piece
 * - Mendeteksi dan menghapus row/col penuh
 * 
 * Board TIDAK mengurus:
 * - Skor
 * - Tray piece
 * - Game over logic
 * Itu semua tanggung jawab Game class.
 */
export class Board {
    readonly size: number;

    /**
     * Kita pakai Uint8Array supaya:
     * - Lebih hemat memory
     * - Lebih cepat dari array 2D biasa
     * - Representasi 0/1 sederhana
     */
    private cells: Uint8Array;

    constructor(size = 8) {
        this.size = size;
        this.cells = new Uint8Array(size * size);
    }

    /**
     * Reset board jadi kosong.
     * Biasanya dipakai saat start game baru.
     */
    reset(): void {
        this.cells.fill(0);
    }

    /**
     * Kita tidak pernah expose array asli ke luar,
     * supaya tidak bisa dimodifikasi langsung dari UI.
     * 
     * Ini penting untuk arsitektur clean OOP.
     */
    snapshotCells(): Uint8Array {
        return new Uint8Array(this.cells);
    }

    /**
     * Convert koordinat (row, col) jadi index 1D.
     * 
     * Contoh:
     * row 2 col 3 pada board 8x8
     * index = 2 * 8 + 3 = 19
     */
    private idx(row: number, col: number): number {
        return row * this.size + col;
    }

    /**
     * Validasi apakah koordinat masih di dalam board.
     */
    inBounds(row: number, col: number): boolean {
        return row >= 0 && row < this.size && col >= 0 && col < this.size;
    }

    /**
     * Ambil nilai cell (0 atau 1).
     */
    get(row: number, col: number): 0 | 1 {
        if (!this.inBounds(row, col)) return 0;
        return this.cells[this.idx(row, col)] as 0 | 1;
    }

    /**
     * Set nilai cell (0 atau 1).
     */
    set(row: number, col: number, value: 0 | 1): void {
        if (!this.inBounds(row, col)) return;
        this.cells[this.idx(row, col)] = value;
    }

    /**
     * Cek apakah shape bisa ditempatkan di posisi (row, col).
     * 
     * Validasi:
     * - Tidak keluar batas board
     * - Tidak menabrak cell yang sudah terisi
     */
    canPlace(shape: Shape, row: number, col: number): boolean {
        const height = shape.length;
        const width = shape[0]?.length ?? 0;

        for (let r = 0; r < height; r++) {
            for (let c = 0; c < width; c++) {
                // Skip kalau cell shape kosong
                if (shape[r]![c] !== 1) continue;

                const rr = row + r;
                const cc = col + c;

                // Keluar board
                if (!this.inBounds(rr, cc)) return false;

                // Nabrak block lain
                if (this.get(rr, cc) === 1) return false;
            }
        }

        return true;
    }

    /**
     * Meletakkan shape ke board.
     * 
     * Asumsi: sudah dipastikan valid lewat canPlace.
     * 
     * Return jumlah block yang berhasil ditempatkan
     * supaya Game bisa pakai untuk hitung skor dasar.
     */
    place(shape: Shape, row: number, col: number): number {
        let placed = 0;

        for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[0].length; c++) {
                if (shape[r]![c] !== 1) continue;

                const rr = row + r;
                const cc = col + c;

                this.set(rr, cc, 1);
                placed++;
            }
        }

        return placed;
    }

    /**
     * Cari semua row & col yang penuh.
     */
    findFullLines(): { fullRows: number[]; fullCols: number[] } {
        const fullRows: number[] = [];
        const fullCols: number[] = [];

        // Cek setiap row
        for (let r = 0; r < this.size; r++) {
            let full = true;
            for (let c = 0; c < this.size; c++) {
                if (this.get(r, c) === 0) {
                    full = false;
                    break;
                }
            }
            if (full) fullRows.push(r);
        }

        // Cek setiap column
        for (let c = 0; c < this.size; c++) {
            let full = true;
            for (let r = 0; r < this.size; r++) {
                if (this.get(r, c) === 0) {
                    full = false;
                    break;
                }
            }
            if (full) fullCols.push(c);
        }

        return { fullRows, fullCols };
    }

    /**
     * Hapus semua row & col yang penuh.
     * 
     * Penting:
     * Jika row dan col berpotongan,
     * kita tidak boleh double count.
     */
    clearFullLines(): LineClearResult {
        const { fullRows, fullCols } = this.findFullLines();

        const toClear = new Set<number>();

        // Tandai semua cell row penuh
        for (const r of fullRows) {
            for (let c = 0; c < this.size; c++) {
                toClear.add(this.idx(r, c));
            }
        }

        // Tandai semua cell col penuh
        for (const c of fullCols) {
            for (let r = 0; r < this.size; r++) {
                toClear.add(this.idx(r, c));
            }
        }

        // Clear cell
        for (const index of toClear) {
            this.cells[index] = 0;
        }

        return {
            clearedRows: fullRows,
            clearedCols: fullCols,
            clearedCount: toClear.size,
        };
    }

    /**
     * Digunakan untuk cek game over.
     * 
     * Kita scan seluruh board dan lihat
     * apakah ada minimal satu posisi valid.
     */
    hasAnyPlacement(shape: Shape): boolean {
        for (let r = 0; r < this.size; r++) {
            for (let c = 0; c < this.size; c++) {
                if (this.canPlace(shape, r, c)) return true;
            }
        }
        return false;
    }

    /**
     * Debug helper untuk console.
     */
    toString(): string {
        let out = "";
        for (let r = 0; r < this.size; r++) {
            for (let c = 0; c < this.size; c++) {
                out += this.get(r, c) ? "█" : "·";
            }
            out += "\n";
        }
        return out;
    }
}
