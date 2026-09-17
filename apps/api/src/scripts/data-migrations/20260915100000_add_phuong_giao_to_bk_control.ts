import type { RowDataPacket } from 'mysql2/promise';
import type { DataMigration } from './types.js';

const configKey = 'ACTIVE_BK_CONTROL_STAFF_CONFIG';

const migration: DataMigration = {
  id: '20260915100000_add_phuong_giao_to_bk_control',
  description: 'Add Phuong Giao (52454) to BK_CONTROL team and update ACTIVE_BK_CONTROL_STAFF_CONFIG.',
  async preflight(connection) {
    const [teams] = await connection.execute<RowDataPacket[]>(
      'SELECT id FROM crm_teams WHERE `code` = "BK_CONTROL" LIMIT 1'
    );
    if (!teams || teams.length === 0) {
      throw new Error('BK_CONTROL team does not exist in crm_teams');
    }
  },
  async up(connection) {
    const [teams] = await connection.execute<RowDataPacket[]>(
      'SELECT id FROM crm_teams WHERE `code` = "BK_CONTROL" LIMIT 1'
    );
    const teamId = teams[0].id;

    // Find CrmStaff for Phuong Giao (legacyStaffId 52454)
    const [staffRows] = await connection.execute<RowDataPacket[]>(
      'SELECT id, display_name FROM crm_staff WHERE legacy_staff_id = 52454 LIMIT 1'
    );
    const crmStaffId = staffRows[0]?.id || 47;
    const displayName = staffRows[0]?.display_name || 'Phương Giao';

    // Insert or update crm_team_members
    await connection.execute(
      `INSERT INTO crm_team_members (team_id, legacy_staff_id, crm_staff_id, display_name, role, is_active, joined_at, created_at, updated_at)
       VALUES (?, 52454, ?, ?, 'member', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON DUPLICATE KEY UPDATE is_active = 1, crm_staff_id = VALUES(crm_staff_id), display_name = VALUES(display_name), updated_at = CURRENT_TIMESTAMP`,
      [teamId, crmStaffId, displayName]
    );

    // Update crm_config
    const [configRows] = await connection.execute<RowDataPacket[]>(
      'SELECT value FROM crm_config WHERE `key` = ? LIMIT 1',
      [configKey]
    );
    let list: number[] = [52086, 43554];
    if (configRows[0]?.value) {
      try {
        list = JSON.parse(configRows[0].value);
      } catch {
        // use default list on JSON parse error
      }
    }
    if (!list.includes(52454)) {
      list.push(52454);
    }
    await connection.execute(
      `INSERT INTO crm_config (\`key\`, \`value\`, \`updated_at\`)
       VALUES (?, ?, CURRENT_TIMESTAMP)
       ON DUPLICATE KEY UPDATE \`value\` = VALUES(\`value\`), \`updated_at\` = CURRENT_TIMESTAMP`,
      [configKey, JSON.stringify(list)]
    );
  },
};

export default migration;
