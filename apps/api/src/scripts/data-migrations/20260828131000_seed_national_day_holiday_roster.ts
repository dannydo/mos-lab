import type { RowDataPacket } from 'mysql2/promise';
import type { DataMigration } from './types.js';

type SeedPerson = { name: string; teamCode: 'CV' | 'CC'; sourceStatus: 'SCHEDULED' | 'HOLIDAY_OFF' };

const people: SeedPerson[] = [
  { name: 'Anh Tuyết', teamCode: 'CV', sourceStatus: 'SCHEDULED' },
  { name: 'Tuyết Nhi', teamCode: 'CV', sourceStatus: 'SCHEDULED' },
  { name: 'Thảo Ly', teamCode: 'CV', sourceStatus: 'SCHEDULED' },
  { name: 'Phương Nhi', teamCode: 'CV', sourceStatus: 'SCHEDULED' },
  { name: 'Khánh Cao', teamCode: 'CV', sourceStatus: 'SCHEDULED' },
  { name: 'HânEmBé', teamCode: 'CV', sourceStatus: 'SCHEDULED' },
  { name: 'Huyền Nguyễn', teamCode: 'CV', sourceStatus: 'SCHEDULED' },
  { name: 'Kim Ngân', teamCode: 'CV', sourceStatus: 'SCHEDULED' },
  { name: 'Thiên Thiên', teamCode: 'CV', sourceStatus: 'HOLIDAY_OFF' },
  { name: 'Lý Trần', teamCode: 'CV', sourceStatus: 'HOLIDAY_OFF' },
  { name: 'Trancy', teamCode: 'CV', sourceStatus: 'HOLIDAY_OFF' },
  { name: 'Nhung', teamCode: 'CV', sourceStatus: 'HOLIDAY_OFF' },
  { name: 'Kimmy', teamCode: 'CV', sourceStatus: 'HOLIDAY_OFF' },
  { name: 'Trâm Nguyễn', teamCode: 'CV', sourceStatus: 'HOLIDAY_OFF' },
  { name: 'Cẩm Tiên', teamCode: 'CV', sourceStatus: 'HOLIDAY_OFF' },
  { name: 'Tuyết Ngọc', teamCode: 'CV', sourceStatus: 'HOLIDAY_OFF' },
  { name: 'Tuyết Mai', teamCode: 'CV', sourceStatus: 'HOLIDAY_OFF' },
  { name: 'Thục Nghi', teamCode: 'CC', sourceStatus: 'SCHEDULED' },
  { name: 'Yến Vy', teamCode: 'CC', sourceStatus: 'SCHEDULED' },
];

const workDates = ['2026-09-01', '2026-09-02'];

const normalizeName = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const migration: DataMigration = {
  id: '20260828131000_seed_national_day_holiday_roster',
  description:
    'Create the draft 2026 National Day holiday period, coverage, pay-basis inference, and reviewable roster imported from HR notices.',
  async preflight(connection) {
    await connection.query('SELECT id FROM crm_holiday_periods LIMIT 1');
    await connection.query('SELECT id FROM crm_holiday_roster LIMIT 1');
    const [staffRows] = await connection.query<RowDataPacket[]>('SELECT id FROM crm_staff LIMIT 1');
    if (!staffRows[0]) throw new Error('At least one crm_staff record is required to own the holiday seed.');
  },
  async up(connection) {
    const [actorRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id
       FROM crm_staff
       WHERE is_active = 1
       ORDER BY CASE WHEN role IN ('super_admin', 'admin') THEN 0 ELSE 1 END, id ASC
       LIMIT 1`
    );
    const actorId = Number(actorRows[0]?.id);
    if (!actorId) throw new Error('Could not resolve the holiday seed owner.');

    await connection.execute(
      `UPDATE crm_staff
       SET pay_basis = CASE
         WHEN base_salary IS NOT NULL AND base_salary > 0 THEN 'MONTHLY'
         WHEN hourly_wage IS NOT NULL AND hourly_wage > 0 THEN 'HOURLY'
         ELSE pay_basis
       END
       WHERE pay_basis IS NULL`
    );

    await connection.execute(
      `INSERT INTO crm_holiday_periods (
        code, name, start_date, end_date, timezone, status,
        standard_shift_hours, work_premium_multiplier, paid_leave_multiplier,
        monthly_standard_days, monthly_standard_hours, selection_window_days,
        selection_weights_json, notes, created_by_staff_id, created_at, updated_at
      ) VALUES (
        'QUOC_KHANH_2026', 'Quốc khánh 2026', '2026-09-01', '2026-09-02',
        'Asia/Ho_Chi_Minh', 'DRAFT', 9, 3, 1, 26, 234, 90,
        '{"feedback":30,"fix":25,"tip":15,"speed":15,"attendance":15}',
        'Prefill từ thông báo HR; HR phải rà soát tên, chi nhánh, roster và pay basis trước khi publish.',
        ?, CURRENT_TIMESTAMP(0), CURRENT_TIMESTAMP(0)
      ) ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        standard_shift_hours = VALUES(standard_shift_hours),
        work_premium_multiplier = VALUES(work_premium_multiplier),
        paid_leave_multiplier = VALUES(paid_leave_multiplier),
        monthly_standard_days = VALUES(monthly_standard_days),
        monthly_standard_hours = VALUES(monthly_standard_hours),
        selection_window_days = VALUES(selection_window_days),
        selection_weights_json = VALUES(selection_weights_json),
        notes = VALUES(notes),
        updated_at = CURRENT_TIMESTAMP(0)`,
      [actorId]
    );

    const [periodRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id FROM crm_holiday_periods WHERE code = 'QUOC_KHANH_2026' LIMIT 1`
    );
    const holidayId = Number(periodRows[0]?.id);
    if (!holidayId) throw new Error('Could not resolve QUOC_KHANH_2026 after seed.');

    for (const workDate of workDates) {
      for (const coverage of [
        { teamCode: 'CV', requiredCount: 8 },
        { teamCode: 'CC', requiredCount: 2 },
      ]) {
        await connection.execute(
          `INSERT INTO crm_holiday_coverage (
            holiday_id, work_date, store_id, store_key, team_code,
            shift_start, shift_end, required_count, notes, created_at, updated_at
          ) VALUES (?, ?, NULL, 'UNASSIGNED', ?, '09:00', '18:00', ?,
            'Cần HR phân bổ về chi nhánh trước khi publish.', CURRENT_TIMESTAMP(0), CURRENT_TIMESTAMP(0))
          ON DUPLICATE KEY UPDATE
            required_count = VALUES(required_count), notes = VALUES(notes), updated_at = CURRENT_TIMESTAMP(0)`,
          [holidayId, workDate, coverage.teamCode, coverage.requiredCount]
        );
      }
    }

    const [staffRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, legacy_staff_id, display_name
       FROM crm_staff
       WHERE is_active = 1 AND legacy_staff_id IS NOT NULL`
    );
    const staffByNormalizedName = new Map<string, RowDataPacket[]>();
    staffRows.forEach((staff) => {
      const key = normalizeName(String(staff.display_name || ''));
      const matches = staffByNormalizedName.get(key) || [];
      matches.push(staff);
      staffByNormalizedName.set(key, matches);
    });

    for (const workDate of workDates) {
      for (const person of people) {
        const matches = staffByNormalizedName.get(normalizeName(person.name)) || [];
        const matched = matches.length === 1 ? matches[0] : undefined;
        const legacyStaffId = matched ? Number(matched.legacy_staff_id) : null;
        const crmStaffId = matched ? Number(matched.id) : null;
        const status = matched ? person.sourceStatus : 'PAYROLL_EXCEPTION';
        const displayName = matched ? String(matched.display_name) : person.name;
        const rosterIdentity = legacyStaffId ? `staff:${legacyStaffId}` : `name:${normalizeName(person.name)}`;
        const reason = matched
          ? 'Prefill từ danh sách HR; cần xác nhận chi nhánh và roster trước publish.'
          : matches.length > 1
            ? 'Tên trong ảnh trùng nhiều hồ sơ; HR phải chọn đúng nhân sự.'
            : 'Tên trong ảnh chưa khớp hồ sơ active; HR phải xác nhận.';

        await connection.execute(
          `INSERT INTO crm_holiday_roster (
            holiday_id, roster_key, work_date, crm_staff_id, legacy_staff_id,
            imported_name, display_name, team_code, store_id, store_key,
            shift_start, shift_end, status, decision_reason, scheduled_by_staff_id,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, 'UNASSIGNED', '09:00', '18:00', ?, ?, ?,
            CURRENT_TIMESTAMP(0), CURRENT_TIMESTAMP(0))
          ON DUPLICATE KEY UPDATE
            crm_staff_id = VALUES(crm_staff_id),
            legacy_staff_id = VALUES(legacy_staff_id),
            imported_name = VALUES(imported_name),
            display_name = VALUES(display_name),
            team_code = VALUES(team_code),
            status = VALUES(status),
            decision_reason = VALUES(decision_reason),
            updated_at = CURRENT_TIMESTAMP(0)`,
          [
            holidayId,
            `${workDate}:${rosterIdentity}`,
            workDate,
            crmStaffId,
            legacyStaffId,
            person.name,
            displayName,
            person.teamCode,
            status,
            reason,
            actorId,
          ]
        );
      }
    }

    await connection.execute(
      `INSERT INTO crm_holiday_audit_logs (
        holiday_id, action, entity_type, actor_staff_id, reason, after_json, created_at
      ) VALUES (?, 'SEED_HR_ROSTER', 'HOLIDAY_PERIOD', ?,
        'Imported 01-02/09/2026 HR notice into reviewable draft roster.',
        JSON_OBJECT('sourcePeople', ?, 'workDates', 2), CURRENT_TIMESTAMP(0))`,
      [holidayId, actorId, people.length]
    );
  },
};

export default migration;
