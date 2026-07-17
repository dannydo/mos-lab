import fs from 'fs';

const content = fs.readFileSync(
  '/Users/dannydo/.gemini/antigravity/brain/4893a0c8-03db-4ada-9004-b01b5bb90d78/.system_generated/steps/654/content.md',
  'utf8'
);
const lines = content.split('\n');

for (let i = 8; i < lines.length; i++) {
  const line = lines[i];
  if (!line || !line.trim()) continue;
  if (line.startsWith('STORE,')) continue;

  const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
  if (cols.length < 30) continue;

  const clientName = cols[17].replace(/"/g, '');
  const comboState = cols[19].replace(/"/g, '');
  const singleOrCombo = cols[29].replace(/"/g, '');
  const service = cols[20].replace(/"/g, '');

  if (singleOrCombo === 'Combo' && comboState !== 'Live') {
    console.log(
      `Line ${i} | Client: ${clientName} | ComboState: ${comboState} | Single/Combo: ${singleOrCombo} | Service: ${service}`
    );
  }
}
