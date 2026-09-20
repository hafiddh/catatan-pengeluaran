/**
 * Hardcoded household: Kiki dan Hafid berbagi satu buku catatan.
 *
 * Transaksi keduanya dibaca bersama (list, detail, laporan), tapi tulis
 * tetap milik sendiri — update/delete di lib/server/notes.ts sengaja
 * memakai `user_id = $n`, bukan scope ini.
 */

export type HouseholdMember = {
  id: string;
  name: string;
  avatar: string;
};

export const HOUSEHOLD_MEMBERS: readonly HouseholdMember[] = [
  { id: '100699903845034880332', name: 'Kiki', avatar: '/images/kiki-ico.webp' },
  { id: '117938034772634681526', name: 'Hafid', avatar: '/images/hafid-ico.webp' },
];

/** Cakupan data untuk laporan/analisa: gabungan serumah atau punya sendiri. */
export type ScopeMode = 'household' | 'own';

const MEMBER_IDS = HOUSEHOLD_MEMBERS.map((member) => member.id);

export function isHouseholdMember(userId: string): boolean {
  return MEMBER_IDS.includes(userId);
}

/**
 * Daftar user_id yang boleh dibaca oleh `userId`. Anggota household melihat
 * data satu sama lain; user lain tetap terkurung pada datanya sendiri.
 */
export function householdScope(userId: string): string[] {
  return isHouseholdMember(userId) ? [...MEMBER_IDS] : [userId];
}

/**
 * Seperti householdScope(), tapi bisa dipersempit ke data sendiri — dipakai
 * analisa AI yang memberi pilihan "gabungan" atau "punya saya".
 */
export function resolveScope(userId: string, mode: ScopeMode): string[] {
  return mode === 'own' ? [userId] : householdScope(userId);
}

export function findMember(userId: string): HouseholdMember | undefined {
  return HOUSEHOLD_MEMBERS.find((member) => member.id === userId);
}

/** Nama tampilan pemilik data, atau string kosong kalau bukan anggota. */
export function memberName(userId: string): string {
  return findMember(userId)?.name ?? '';
}
