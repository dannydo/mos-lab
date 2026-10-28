import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import type { DataMigration } from './types.js';

const migration: DataMigration = {
  id: '20261028153000_remove_mock_telesale_card_fund',
  description:
    'Xóa vĩnh viễn Quỹ Nạp Card Telesale giả lập và dữ liệu liên quan khỏi cơ sở dữ liệu crm_funds',
  async preflight(_connection: PoolConnection) {
    // Read-only preflight check
  },
  async up(connection: PoolConnection) {
    // Check if crm_funds table exists
    const [tables] = await connection.execute<RowDataPacket[]>(
      "SHOW TABLES LIKE 'crm_funds'"
    );
    if (!Array.isArray(tables) || tables.length === 0) {
      return;
    }

    // Delete mock transactions
    await connection.execute(`
      DELETE FROM crm_fund_transactions 
      WHERE fund_id = 'fund-telesale-card'
    `);

    // Delete mock proposals
    await connection.execute(`
      DELETE FROM crm_fund_proposals 
      WHERE fund_id = 'fund-telesale-card'
    `);

    // Delete mock periods
    await connection.execute(`
      DELETE FROM crm_fund_periods 
      WHERE fund_id = 'fund-telesale-card'
    `);

    // Delete mock role assignments
    await connection.execute(`
      DELETE FROM crm_fund_role_assignments 
      WHERE fund_id = 'fund-telesale-card'
    `);

    // Delete mock roles
    await connection.execute(`
      DELETE FROM crm_fund_roles 
      WHERE fund_id = 'fund-telesale-card'
    `);

    // Delete mock fund
    await connection.execute(`
      DELETE FROM crm_funds 
      WHERE id = 'fund-telesale-card' OR code = 'TELESALE_CARD'
    `);
  },
};

export default migration;
