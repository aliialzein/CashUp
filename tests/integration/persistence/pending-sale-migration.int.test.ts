import { jest } from '@jest/globals';
import { Client } from 'pg';
import { randomUUID } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { assertTestDatabase } from './database-safety.cjs';

jest.setTimeout(30000);
it('upgrades a populated previous schema, preserves delivered history and archives pending placeholders before clearing them', async () => {
  const connectionString = process.env.TEST_DATABASE_URL!;
  assertTestDatabase(connectionString);
  const client = new Client({ connectionString });
  const schema = 'pending_sale_upgrade_' + randomUUID().replaceAll('-', '');
  const migration = '20261111000000_pending_sale_payment';
  const ids = Array.from({ length: 7 }, () => randomUUID());
  const [userId, businessId, memberId, cashUpId, pendingId, deliveredId, deletedId] = ids;
  await client.connect();
  try {
    await client.query(`CREATE SCHEMA "${schema}"`);
    await client.query(`SET search_path TO "${schema}"`);
    const root = join(process.cwd(), 'prisma', 'migrations');
    for (const name of readdirSync(root).filter(name => name < migration && /^\d/.test(name)).sort())
      await client.query(readFileSync(join(root, name, 'migration.sql'), 'utf8'));
    await client.query(`INSERT INTO users (id,email,"fullName",provider,"updatedAt") VALUES ($1,'migration@example.test','Migration fixture','LOCAL',now())`, [userId]);
    await client.query(`INSERT INTO businesses (id,name,"isSolo","updatedAt") VALUES ($1,'Migration fixture',true,now())`, [businessId]);
    await client.query(`INSERT INTO memberships (id,"businessId","userId",role) VALUES ($1,$2,$3,'OWNER')`, [memberId,businessId,userId]);
    await client.query(`INSERT INTO cash_ups (id,"businessId","membershipId",number,"updatedAt") VALUES ($1,$2,$3,1,now())`, [cashUpId,businessId,memberId]);
    for (const [index, id, status] of [[1,pendingId,'TO_DELIVER'],[2,deliveredId,'DELIVERED'],[3,deletedId,'DELETED']] as const) {
      await client.query(`INSERT INTO sales (id,"businessId","cashUpId","saleNumber",status,"businessAmountUsd","deliveryFeeUsd","tipUsd","discountUsd","totalCollectedUsd","totalCollectedLbp","changeGivenUsd",method,"deliveredAt","updatedAt")
        VALUES ($1,$2,$3,$4,$5::"SaleStatus",10,3,2,1,20,1000,5,'OMT',CASE WHEN $5::"SaleStatus"='DELIVERED' THEN '2026-11-01T10:00:00Z'::timestamptz ELSE NULL END,now())`, [id,businessId,cashUpId,index,status]);
    }
    const before = (await client.query('SELECT * FROM sales ORDER BY "saleNumber"')).rows;
    await client.query(readFileSync(join(root,migration,'migration.sql'),'utf8'));
    const after = (await client.query('SELECT * FROM sales ORDER BY "saleNumber"')).rows;
    const { legacyPendingPayment: archived, ...pending } = after[0];
    expect(archived).toMatchObject({ method: 'OMT', totalCollectedUsd: '20.00', totalCollectedLbp: '1000.00', changeGivenUsd: '5.00', tipUsd: '2.00' });
    expect(pending).toMatchObject({ status: 'TO_DELIVER', method: null, totalCollectedUsd: null, totalCollectedLbp: null, changeGivenUsd: null, changeGivenLbp: null, tipUsd: null, tipLbp: null, deliveredAt: null });
    expect(pending.businessAmountUsd).toBe(before[0].businessAmountUsd);
    expect(pending.deliveryFeeUsd).toBe(before[0].deliveryFeeUsd);
    expect(pending.discountUsd).toBe(before[0].discountUsd);
    for (const index of [1,2]) {
      const { legacyPendingPayment, ...unchanged } = after[index];
      expect(legacyPendingPayment).toBeNull();
      expect(unchanged).toEqual(before[index]);
    }
    await expect(client.query('UPDATE sales SET method=\'CASH\' WHERE id=$1',[pendingId])).rejects.toMatchObject({ code: '23514' });
    await expect(client.query('UPDATE sales SET "tipUsd"=NULL WHERE id=$1',[deliveredId])).rejects.toMatchObject({ code: '23514' });
    await expect(client.query('UPDATE sales SET "businessAmountUsd"=-1 WHERE id=$1',[pendingId])).rejects.toMatchObject({ code: '23514' });
  } finally {
    await client.query('ROLLBACK');
    await client.query('SET search_path TO public');
    await client.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await client.end();
  }
});
