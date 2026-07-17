import fs from 'fs';

const content = fs.readFileSync(
  '/Users/dannydo/.gemini/antigravity/brain/4893a0c8-03db-4ada-9004-b01b5bb90d78/.system_generated/steps/654/content.md',
  'utf8'
);

const lines = content.split('\n');
let liveCount = 0;
let notLiveCount = 0;

for (let i = 8; i < lines.length; i++) {
  const line = lines[i];
  if (!line || !line.trim()) continue;

  // Split CSV, handling quotes
  const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
  if (cols.length < 20) continue;

  const comboState = cols[19].replace(/"/g, '');
  if (comboState === 'Live') {
    liveCount++;
  } else {
    notLiveCount++;
  }
}

console.log('CSV Live Count:', liveCount);
console.log('CSV Not Live Count:', notLiveCount);
console.log('Total rows:', liveCount + notLiveCount);
