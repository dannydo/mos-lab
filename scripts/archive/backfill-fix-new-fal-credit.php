<?php
/**
 * Targeted remediation for linked Fix services with a positive duration up to
 * 25 minutes. Their final ledger must contain exactly CV 15 Credit and the
 * current CC IN/OUT combined 5 Credit, with no credit for any other CC.
 *
 * Default: dry-run (read-only). Pass --apply only for an approved batch.
 * Usage: php backfill-fix-new-fal-credit.php [--from=YYYY-MM-DD] [--to=YYYY-MM-DD] [--apply]
 */

define('DISABLE_PUSH_NOTIFICATIONS', true);
include __DIR__ . '/../../Server/src/api/1/tool/cli-bootstrap.php';

foreach ([
    __DIR__ . '/../../Server/src/api/1/tool/generate-report-order.php',
    __DIR__ . '/../../Server/src/api/1/tool/generate-report-staff-client-consultant.php',
] as $file) {
    if (!file_exists($file)) continue;
    $content = file_get_contents($file);
    $content = preg_replace('/^include.*cli-bootstrap\\.php.*$/m', '', $content);
    $content = preg_replace('/if \\(basename\\(__FILE__\\).*?\\n\\}/s', '', $content);
    eval('?>' . $content);
}
include __DIR__ . '/OrderRegenerationService.php';

$from = '2026-07-01';
$to = date('Y-m-d');
$apply = in_array('--apply', $argv, true);
foreach ($argv as $arg) {
    if (strpos($arg, '--from=') === 0) $from = substr($arg, 7);
    if (strpos($arg, '--to=') === 0) $to = substr($arg, 5);
}
if (!preg_match('/^\\d{4}-\\d{2}-\\d{2}$/', $from) || !preg_match('/^\\d{4}-\\d{2}-\\d{2}$/', $to)) {
    die("Dates must use YYYY-MM-DD.\n");
}

$db = $di->get('db');
$sql = "
    SELECT
      parent_os.id AS origin_order_service_id,
      child_os.id AS fix_order_service_id,
      parent_o.id AS origin_order_id,
      child_o.id AS fix_order_id,
      parent_ro.actual_booking_date_start AS origin_checkin,
      child_ro.actual_booking_date_start AS fix_checkin,
      COALESCE(cv.full_name, CONCAT('CV #', child_os.assigned_staff_id)) AS cv_name,
      COALESCE(cc_in.full_name, CONCAT('CC #', child_os.check_in_staff_id)) AS cc_in_name,
      COALESCE(cc_out.full_name, CONCAT('CC #', child_os.check_out_staff_id)) AS cc_out_name,
      child_ros.servicing_minute + child_ros.cleaning_minute AS duration_minutes,
      COALESCE(SUM(CASE WHEN sb.bonus_type = 'Credit' AND sb.user_id = child_os.assigned_staff_id THEN sb.bonus_amount ELSE 0 END), 0) AS cv_credit,
      COALESCE(SUM(CASE WHEN sb.bonus_type = 'Credit' AND sb.user_id = child_os.check_in_staff_id THEN sb.bonus_amount ELSE 0 END), 0) AS cc_in_credit,
      COALESCE(SUM(CASE WHEN sb.bonus_type = 'Credit' AND child_os.check_out_staff_id <> child_os.check_in_staff_id AND sb.user_id = child_os.check_out_staff_id THEN sb.bonus_amount ELSE 0 END), 0) AS cc_out_credit,
      COALESCE(SUM(CASE WHEN sb.bonus_type = 'Credit' THEN sb.bonus_amount ELSE 0 END), 0) AS total_credit
    FROM order_service parent_os
    JOIN order_service child_os ON child_os.id = parent_os.next_fix_order_service_id
    JOIN `order` parent_o ON parent_o.id = parent_os.order_id
    JOIN `order` child_o ON child_o.id = child_os.order_id AND child_o.order_state = 'Completed'
    JOIN report_order parent_ro ON parent_ro.order_id = parent_o.id
    JOIN report_order child_ro ON child_ro.order_id = child_o.id
    JOIN report_order_service child_ros ON child_ros.order_service_id = child_os.id
    LEFT JOIN user_profile cv ON cv.user_id = child_os.assigned_staff_id
    LEFT JOIN user_profile cc_in ON cc_in.user_id = child_os.check_in_staff_id
    LEFT JOIN user_profile cc_out ON cc_out.user_id = child_os.check_out_staff_id
    LEFT JOIN staff_bonus sb ON sb.order_service_id = child_os.id
    WHERE child_ro.actual_booking_date_start >= :from_date
      AND child_ro.actual_booking_date_start < DATE_ADD(:to_date, INTERVAL 1 DAY)
      AND child_ros.servicing_minute + child_ros.cleaning_minute BETWEEN 1 AND 25
    GROUP BY parent_os.id, child_os.id, parent_o.id, child_o.id, parent_ro.actual_booking_date_start,
      child_ro.actual_booking_date_start, cv.full_name, cc_in.full_name, cc_out.full_name,
      child_os.assigned_staff_id, child_os.check_in_staff_id, child_os.check_out_staff_id,
      child_ros.servicing_minute, child_ros.cleaning_minute
    HAVING ROUND(cv_credit, 2) <> 15
      OR ROUND(cc_in_credit, 2) <> IF(child_os.check_in_staff_id = child_os.check_out_staff_id, 5, 2.5)
      OR ROUND(cc_out_credit, 2) <> IF(child_os.check_in_staff_id = child_os.check_out_staff_id, 0, 2.5)
      OR ROUND(total_credit, 2) <> 20
    ORDER BY child_ro.actual_booking_date_start ASC
";
$candidates = $db->fetchAll($sql, \Phalcon\Db\Enum::FETCH_ASSOC, ['from_date' => $from, 'to_date' => $to]);

echo "=== Fix <=25m FAL Credit Backfill ===\n";
echo "Mode: " . ($apply ? 'APPLY (approved batch)' : 'DRY-RUN (read-only)') . "\n";
echo "Window: $from to $to\n";
echo "Candidates: " . count($candidates) . "\n\n";
foreach ($candidates as $candidate) {
    echo sprintf(
        "Fix OS #%s (from #%s) | %sm | CV %s: %s/15 | CC %s / %s: %s + %s / 5 | total Credit %s/20\n",
        $candidate['fix_order_service_id'],
        $candidate['origin_order_service_id'],
        $candidate['duration_minutes'],
        $candidate['cv_name'],
        $candidate['cv_credit'],
        $candidate['cc_in_name'],
        $candidate['cc_out_name'],
        $candidate['cc_in_credit'],
        $candidate['cc_out_credit'],
        $candidate['total_credit']
    );
}

if (!$apply) {
    echo "\nNo ledger changes made. Re-run with --apply only for an approved batch.\n";
    exit(0);
}

$service = new OrderRegenerationService($di);
$datesToAggregate = [];
foreach ($candidates as $candidate) {
    echo "\n--- Regenerating origin order #{$candidate['origin_order_id']} then Fix order #{$candidate['fix_order_id']} ---\n";
    if (!$service->regenerate((int) $candidate['origin_order_id'], false, true, $candidate['origin_checkin'], false)) {
        throw new \RuntimeException("Origin regeneration failed for order #{$candidate['origin_order_id']}");
    }
    if (!$service->regenerate((int) $candidate['fix_order_id'], false, true, $candidate['fix_checkin'], false)) {
        throw new \RuntimeException("Fix regeneration failed for order #{$candidate['fix_order_id']}");
    }
    $datesToAggregate[date('Y-m-d', strtotime($candidate['origin_checkin']))] = true;
    $datesToAggregate[date('Y-m-d', strtotime($candidate['fix_checkin']))] = true;
}

foreach (array_keys($datesToAggregate) as $date) {
    echo "\n--- Refreshing CC aggregates for $date ---\n";
    new StaffClientConsultantRunner($di, $date, '');
}
echo "\nBackfill complete. Re-run dry-run to verify that no candidates remain.\n";
