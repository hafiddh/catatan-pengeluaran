import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLongPressController } from './long-press';

const DELAY = 500;

function setup(
  options: { delayMs?: number; moveTolerancePx?: number; clickGuardMs?: number } = {},
) {
  let fired = 0;
  let clock = 1_000;
  const controller = createLongPressController({
    delayMs: options.delayMs ?? DELAY,
    moveTolerancePx: options.moveTolerancePx,
    clickGuardMs: options.clickGuardMs,
    now: () => clock,
    onFire: () => {
      fired += 1;
    },
  });
  return {
    controller,
    fired: () => fired,
    advance: (ms: number) => {
      clock += ms;
    },
  };
}

test('tahan sampai delay selesai memicu aksi', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { controller, fired } = setup();

  controller.start({ x: 0, y: 0 });
  t.mock.timers.tick(DELAY);

  assert.equal(fired(), 1);
});

test('belum sampai delay belum memicu aksi', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { controller, fired } = setup();

  controller.start({ x: 0, y: 0 });
  t.mock.timers.tick(DELAY - 1);

  assert.equal(fired(), 0);
});

test('lepas sebelum delay membatalkan aksi', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { controller, fired } = setup();

  controller.start({ x: 0, y: 0 });
  t.mock.timers.tick(200);
  controller.up();
  t.mock.timers.tick(DELAY);

  assert.equal(fired(), 0);
});

test('geser melebihi toleransi membatalkan aksi (scroll)', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { controller, fired } = setup({ moveTolerancePx: 10 });

  controller.start({ x: 0, y: 0 });
  controller.move({ x: 0, y: 40 });
  t.mock.timers.tick(DELAY);

  assert.equal(fired(), 0);
});

test('geser dalam toleransi tetap memicu aksi', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { controller, fired } = setup({ moveTolerancePx: 10 });

  controller.start({ x: 0, y: 0 });
  controller.move({ x: 3, y: 4 });
  t.mock.timers.tick(DELAY);

  assert.equal(fired(), 1);
});

test('geser membatalkan hanya selama belum dipicu', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { controller, fired } = setup();

  controller.start({ x: 0, y: 0 });
  t.mock.timers.tick(DELAY);
  controller.move({ x: 0, y: 100 });

  assert.equal(fired(), 1);
});

test('klik tepat setelah aksi muncul diabaikan', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { controller } = setup({ clickGuardMs: 350 });

  controller.start({ x: 0, y: 0 });
  assert.equal(controller.shouldSuppressClick(), false);

  t.mock.timers.tick(DELAY);

  // Jendela guard belum lewat: jari yang sama belum tentu selesai terangkat.
  assert.equal(controller.shouldSuppressClick(), true);
  assert.equal(controller.shouldSuppressClick(), true);
});

test('setelah jendela guard lewat, satu klik sisa di-suppress sekali saja', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { controller, advance } = setup({ clickGuardMs: 350 });

  controller.start({ x: 0, y: 0 });
  t.mock.timers.tick(DELAY);
  advance(400);

  assert.equal(controller.shouldSuppressClick(), true);
  assert.equal(controller.shouldSuppressClick(), false);
});

test('penanda klik sisa bisa dibuang supaya tap berikutnya tidak ikut tertelan', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { controller, advance } = setup({ clickGuardMs: 350 });

  controller.start({ x: 0, y: 0 });
  t.mock.timers.tick(DELAY);
  controller.clearPendingClick();
  advance(400);

  assert.equal(controller.shouldSuppressClick(), false);
});

test('jendela guard tetap menahan klik meski penanda sisa sudah dibuang', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { controller, advance } = setup({ clickGuardMs: 350 });

  controller.start({ x: 0, y: 0 });
  t.mock.timers.tick(DELAY);
  controller.clearPendingClick();

  assert.equal(controller.shouldSuppressClick(), true);
  advance(400);
  assert.equal(controller.shouldSuppressClick(), false);
});

test('two tap berurutan setelah jendela guard lewat keduanya lolos', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { controller, advance } = setup({ clickGuardMs: 350 });

  controller.start({ x: 0, y: 0 });
  t.mock.timers.tick(DELAY);
  advance(400);

  assert.equal(controller.shouldSuppressClick(), true);
  assert.equal(controller.shouldSuppressClick(), false);
  assert.equal(controller.shouldSuppressClick(), false);
});

test('klik setelah hold biasa tidak pernah di-suppress', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { controller } = setup();

  controller.start({ x: 0, y: 0 });
  t.mock.timers.tick(200);
  controller.up();

  assert.equal(controller.shouldSuppressClick(), false);
});

test('hold baru setelah yang pertama tetap berfungsi', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { controller, fired } = setup();

  controller.start({ x: 0, y: 0 });
  t.mock.timers.tick(DELAY);
  controller.up();

  controller.start({ x: 0, y: 0 });
  t.mock.timers.tick(DELAY - 1);

  assert.equal(fired(), 1);
  t.mock.timers.tick(1);
  assert.equal(fired(), 2);
  assert.equal(controller.shouldSuppressClick(), true);
});
