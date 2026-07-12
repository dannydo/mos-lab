import fs from 'fs';

const content = fs.readFileSync('/Users/dannydo/.gemini/antigravity/brain/4893a0c8-03db-4ada-9004-b01b5bb90d78/.system_generated/steps/654/content.md', 'utf8');
const lines = content.split('\n');

let comboStateLive = 0;
let singleOrComboCombo = 0;

for (let i = 8; i < lines.length; i++) {
  const line = lines[i];
  if (!line || !line.trim()) continue;
  if (line.startsWith('STORE,')) continue;
  
  const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
  if (cols.length < 30) continue;
  
  const comboState = cols[19].replace(/"/g, '');
  const singleOrCombo = cols[29].replace(/"/g, '');
  
  if (comboState === 'Live') {
    comboStateLive++;
  }
  if (singleOrCombo === 'Combo') {
    singleOrComboCombo++;
  }
}

console.log("Combo State = Live count:", comboStateLive);
console.log("Single/Combo Column = Combo count:", singleOrComboCombo);
