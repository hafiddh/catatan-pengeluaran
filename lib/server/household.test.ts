import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  HOUSEHOLD_MEMBERS,
  householdScope,
  isHouseholdMember,
  memberName,
  resolveScope,
} from '../household';

const KIKI = '100699903845034880332';
const HAFID = '117938034772634681526';

test('anggota household melihat data keduanya', () => {
  assert.deepEqual(householdScope(KIKI).sort(), [KIKI, HAFID].sort());
  assert.deepEqual(householdScope(HAFID).sort(), [KIKI, HAFID].sort());
});

test('user di luar household hanya melihat datanya sendiri', () => {
  assert.deepEqual(householdScope('999'), ['999']);
});

test('scope yang dikembalikan tidak bisa memutasi daftar aslinya', () => {
  householdScope(KIKI).push('penyusup');
  assert.deepEqual(householdScope(KIKI).sort(), [KIKI, HAFID].sort());
});

test('memberName memetakan id ke nama tampilan', () => {
  assert.equal(memberName(KIKI), 'Kiki');
  assert.equal(memberName(HAFID), 'Hafid');
  assert.equal(memberName('999'), '');
});

test('isHouseholdMember membedakan anggota dari orang luar', () => {
  assert.equal(isHouseholdMember(KIKI), true);
  assert.equal(isHouseholdMember('999'), false);
});

test('resolveScope mempersempit ke data sendiri saat mode own', () => {
  assert.deepEqual(resolveScope(KIKI, 'own'), [KIKI]);
  assert.deepEqual(resolveScope(KIKI, 'household').sort(), [KIKI, HAFID].sort());
});

test('setiap anggota punya avatar', () => {
  for (const member of HOUSEHOLD_MEMBERS) {
    assert.match(member.avatar, /^\/images\/.+\.webp$/);
  }
});
