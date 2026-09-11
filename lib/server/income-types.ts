import { randomUUID } from 'node:crypto';
import { getPool } from './db';

export type IncomeType = {
  id: string;
  user_id: string;
  label: string;
  icon: string;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
};

export class NotFoundError extends Error {}

export async function listIncomeTypes(userId: string): Promise<IncomeType[]> {
  const { rows } = await getPool().query<IncomeType>(
    `SELECT id, user_id, label, icon, created_at, updated_at, deleted_at
     FROM jenis_pemasukan
     WHERE user_id = $1 AND deleted_at IS NULL
     ORDER BY label ASC`,
    [userId],
  );
  return rows;
}

export async function getIncomeTypeById(id: string): Promise<IncomeType> {
  const { rows } = await getPool().query<IncomeType>(
    `SELECT id, user_id, label, icon, created_at, updated_at, deleted_at
     FROM jenis_pemasukan
     WHERE id = $1
     LIMIT 1`,
    [id],
  );
  if (rows.length === 0) {
    throw new NotFoundError('income type not found');
  }
  return rows[0];
}

export async function createIncomeType(
  userId: string,
  label: string,
  icon: string,
): Promise<IncomeType> {
  const id = randomUUID();
  const { rows } = await getPool().query<IncomeType>(
    `INSERT INTO jenis_pemasukan (id, user_id, label, icon, created_at, updated_at)
     VALUES ($1, $2, $3, $4, now(), now())
     RETURNING id, user_id, label, icon, created_at, updated_at, deleted_at`,
    [id, userId, label, icon],
  );
  return rows[0];
}

export async function updateIncomeType(
  userId: string,
  id: string,
  label: string,
  icon: string,
): Promise<IncomeType> {
  const { rows } = await getPool().query<IncomeType>(
    `UPDATE jenis_pemasukan
     SET label = $1, icon = $2, updated_at = now()
     WHERE id = $3 AND user_id = $4 AND deleted_at IS NULL
     RETURNING id, user_id, label, icon, created_at, updated_at, deleted_at`,
    [label, icon, id, userId],
  );
  if (rows.length === 0) {
    throw new NotFoundError('income type not found');
  }
  return rows[0];
}

export async function softDeleteIncomeType(userId: string, id: string): Promise<void> {
  const result = await getPool().query(
    `UPDATE jenis_pemasukan
     SET deleted_at = now(), updated_at = now()
     WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`,
    [id, userId],
  );
  if (result.rowCount === 0) {
    throw new NotFoundError('income type not found');
  }
}
