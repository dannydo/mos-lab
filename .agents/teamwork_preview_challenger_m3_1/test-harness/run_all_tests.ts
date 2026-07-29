import { runTagSubstitutionTests } from './test_tag_substitution.js';
import { runSegmentCalculationTests } from './test_segment_calculation.js';
import { runApiValidationTests } from './test_api_validation.js';

async function main() {
  console.log('Starting Empirical Test Harness for SMS Action Feature (Milestone 3)...\n');

  const tagResults = runTagSubstitutionTests();
  const segmentResults = runSegmentCalculationTests();
  const apiResults = await runApiValidationTests();

  console.log('=====================================================');
  console.log('SUMMARY OF EMPIRICAL TEST EXECUTION');
  console.log('=====================================================');
  console.log(`Tag Substitution Tests Executed : ${tagResults.length}`);
  console.log(`Segment Calculation Tests Executed: ${segmentResults.length}`);
  console.log(`API Validation Tests Executed  : ${apiResults.length}`);
  console.log('=====================================================\n');
}

main().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
