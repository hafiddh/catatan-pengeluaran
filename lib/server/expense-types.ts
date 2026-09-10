import { randomUUID } from 'node:crypto';
import { getPool } from './db';

export type ExpenseType = {
  id: string;
  user_id: string;
  label: string;
  icon: string;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
};

export class NotFoundError extends Error {}

export async function listExpenseTypes(userId: string): Promise<ExpenseType[]> {
  const { rows } = await getPool().query<ExpenseType>(
    `SELECT id, user_id, label, icon, created_at, updated_at, deleted_at
     FROM jenis_pengeluaran
     WHERE user_id = $1 AND deleted_at IS NULL
     ORDER BY label ASC`,
    [userId],
  );
  return rows;
}

export async function getExpenseTypeById(id: string): Promise<ExpenseType> {
  const { rows } = await getPool().query<ExpenseType>(
    `SELECT id, user_id, label, icon, created_at, updated_at, deleted_at
     FROM jenis_pengeluaran
     WHERE id = $1
     LIMIT 1`,
    [id],
  );
  if (rows.length === 0) {
    throw new NotFoundError('expense type not found');
  }
  return rows[0];
}

export async function createExpenseType(
  userId: string,
  label: string,
  icon: string,
): Promise<ExpenseType> {
  const id = randomUUID();
  const { rows } = await getPool().query<ExpenseType>(
    `INSERT INTO jenis_pengeluaran (id, user_id, label, icon, created_at, updated_at)
     VALUES ($1, $2, $3, $4, now(), now())
     RETURNING id, user_id, label, icon, created_at, updated_at, deleted_at`,
    [id, userId, label, icon],
  );
  return rows[0];
}

export async function updateExpenseType(
  userId: string,
  id: string,
  label: string,
  icon: string,
): Promise<ExpenseType> {
  const { rows } = await getPool().query<ExpenseType>(
    `UPDATE jenis_pengeluaran
     SET label = $1, icon = $2, updated_at = now()
     WHERE id = $3 AND user_id = $4 AND deleted_at IS NULL
     RETURNING id, user_id, label, icon, created_at, updated_at, deleted_at`,
    [label, icon, id, userId],
  );
  if (rows.length === 0) {
    throw new NotFoundError('expense type not found');
  }
  return rows[0];
}

export async function softDeleteExpenseType(userId: string, id: string): Promise<void> {
  const result = await getPool().query(
    `UPDATE jenis_pengeluaran
     SET deleted_at = now(), updated_at = now()
     WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`,
    [id, userId],
  );
  if (result.rowCount === 0) {
    throw new NotFoundError('expense type not found');
  }
}
