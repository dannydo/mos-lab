import fs from 'fs';

const content = fs.readFileSync(
  '/Users/dannydo/.gemini/antigravity/brain/4893a0c8-03db-4ada-9004-b01b5bb90d78/.system_generated/steps/654/content.md',
  'utf8'
);

const lines = content.split('\n');
let dataIndex = 0;

for (let i = 8; i < lines.length; i++) {
  const line = lines[i];
  if (!line || !line.trim()) continue;
  if (line.startsWith('STORE,') || line.startsWith('"STORE",')) {
    console.log(`Line ${i} is header: ${line.substring(0, 50)}...`);
    continue;
  }

  dataIndex++;
  const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
  const clientName = cols[17] ? cols[17].replace(/"/g, '') : 'N/A';
  const comboState = cols[19] ? cols[19].replace(/"/g, '') : 'N/A';
  const service = cols[20] ? cols[20].replace(/"/g, '') : 'N/A';
  const clientType = cols[28] ? cols[28].replace(/"/g, '') : 'N/A';

  console.log(
    `${dataIndex}. Line ${i} | Client: ${clientName} | ComboState: ${comboState} | Service: ${service} | ClientType: ${clientType}`
  );
}
