export type Point = { x: number; y: number };

export type LongPressOptions = {
  /** Dipanggil saat tombol ditahan melewati `delayMs` tanpa dilepas/digeser. */
  onFire: () => void;
  delayMs?: number;
  /** Geser lebih jauh dari ini (mis. saat scroll) membatalkan hold. */
  moveTolerancePx?: number;
  /**
   * Klik yang datang dalam jendela ini setelah aksi muncul diabaikan. Ini
   * menahan klik sisa dari long-press yang mendarat di tombol aksi (di layar
   * sentuh, klik dihitung dari posisi jari saat dilepas).
   */
  clickGuardMs?: number;
  /** Sumber waktu, bisa diganti di test. */
  now?: () => number;
};

export type LongPressController = {
  /** Mulai hitung waktu dari titik awal pointer. Hold sebelumnya dibatalkan. */
  start: (point: Point) => void;
  move: (point: Point) => void;
  /** Pointer dilepas sebelum delay habis — batalkan. */
  up: () => void;
  cancel: () => void;
  /**
   * `true` kalau klik berikutnya harus diabaikan: penanda klik sisa dari
   * long-press (habis sekali baca) atau masih di dalam jendela guard.
   */
  shouldSuppressClick: () => boolean;
  /**
   * Buang penanda klik sisa tanpa menunggu klik datang. Dipakai kalau pill
   * yang di-hold langsung diganti tombol aksi — klik sisa itu tidak akan
   * pernah mendarat di pill, jadi penandanya harus dibuang supaya tidak
   * menelan tap berikutnya.
   */
  clearPendingClick: () => void;
};

const DEFAULT_DELAY_MS = 500;
const DEFAULT_MOVE_TOLERANCE_PX = 10;
const DEFAULT_CLICK_GUARD_MS = 350;

/**
 * Logika hold-to-act, dipisah dari React supaya bisa diuji tanpa DOM.
 * Pemanggil yang mengurus event pointer dan menutup area aksi.
 */
export function createLongPressController({
  onFire,
  delayMs = DEFAULT_DELAY_MS,
  moveTolerancePx = DEFAULT_MOVE_TOLERANCE_PX,
  clickGuardMs = DEFAULT_CLICK_GUARD_MS,
  now = Date.now,
}: LongPressOptions): LongPressController {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let origin: Point | null = null;
  let suppressClick = false;
  let guardUntil: number | null = null;

  const clearPending = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    origin = null;
  };

  return {
    start(point) {
      clearPending();
      origin = point;
      timer = setTimeout(() => {
        timer = null;
        origin = null;
        suppressClick = true;
        guardUntil = now() + clickGuardMs;
        onFire();
      }, delayMs);
    },

    move(point) {
      if (timer === null || origin === null) return;
      const dx = point.x - origin.x;
      const dy = point.y - origin.y;
      if (Math.hypot(dx, dy) > moveTolerancePx) clearPending();
    },

    up() {
      clearPending();
    },

    cancel() {
      clearPending();
    },

    shouldSuppressClick() {
      if (suppressClick) {
        suppressClick = false;
        return true;
      }
      return guardUntil !== null && now() < guardUntil;
    },

    clearPendingClick() {
      suppressClick = false;
    },
  };
}
