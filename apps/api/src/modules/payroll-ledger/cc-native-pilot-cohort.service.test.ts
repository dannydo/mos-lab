import assert from 'node:assert/strict';
import test from 'node:test';
import { __test__ } from './cc-native-pilot-cohort.service.js';

const valid = JSON.stringify({
  version: 'cc-native-pilot.v1',
  enabled: true,
  subjects: [{ subjectKey: 'staff:legacy:37790', legacyStaffId: 37790, displayName: 'Diễm Hương' }],
});

test('native CC pilot configuration only accepts canonical, unique subject identities', () => {
  const parsed = __test__.parsePilotConfig(valid);
  assert.equal(parsed.subjects[0]?.subjectKey, 'staff:legacy:37790');
  assert.throws(
    () =>
      __test__.parsePilotConfig(
        JSON.stringify({
          version: 'cc-native-pilot.v1',
          enabled: true,
          subjects: [{ subjectKey: 'staff:diem-huong', legacyStaffId: 37790, displayName: 'Diễm Hương' }],
        })
      ),
    /configuration is invalid/
  );
  assert.throws(() => __test__.parsePilotConfig(null), /pilot is not configured/);
});
