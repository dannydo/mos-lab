const fs = require('fs');
const path = require('path');

function getFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getFiles(filePath, fileList);
    } else if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const dashboardDir = '/Users/dannydo/projects/mos-lab/apps/web/app/dashboard';
const componentsDir = '/Users/dannydo/projects/mos-lab/apps/web/components';

const allFiles = [...getFiles(dashboardDir), ...getFiles(componentsDir)];

console.log(`Total files to scan: ${allFiles.length}`);

let selectWithoutVietnameseFilter = [];
let rawToLowerCaseIncludes = [];
let optionFilterPropUsages = [];

for (const filePath of allFiles) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  // Check 1: Select showSearch without filterOption={vietnameseSearchFilter}
  // Regex to find <Select ... showSearch ... > block
  const selectMatches = content.match(/<Select[\s\S]*?>/g) || [];
  for (const sel of selectMatches) {
    if (sel.includes('showSearch')) {
      if (!sel.includes('vietnameseSearchFilter') && !sel.includes('filterOption={false}')) {
        selectWithoutVietnameseFilter.push({ file: filePath, snippet: sel.replace(/\s+/g, ' ') });
      }
    }
    if (sel.includes('optionFilterProp')) {
      optionFilterPropUsages.push({ file: filePath, snippet: sel.replace(/\s+/g, ' ') });
    }
  }

  // Check 2: Raw .toLowerCase().includes on text/names
  lines.forEach((line, idx) => {
    if (line.includes('.toLowerCase().includes') || line.includes('.includes(')) {
      // Ignore if line has removeVietnameseTones
      if (
        !line.includes('removeVietnameseTones') &&
        !line.includes('.includes(key)') &&
        !line.includes('.includes(state)') &&
        !line.includes('.includes(saved)') &&
        !line.includes('[')
      ) {
        if (
          line.includes('toLowerCase') ||
          line.includes('Name') ||
          line.includes('Phone') ||
          line.includes('query') ||
          line.includes('search') ||
          line.includes('term')
        ) {
          rawToLowerCaseIncludes.push({ file: filePath, line: idx + 1, content: line.trim() });
        }
      }
    }
  });
}

console.log('\n--- SELECT SHOWSEARCH WITHOUT VIETNAMESE FILTER ---');
console.log(JSON.stringify(selectWithoutVietnameseFilter, null, 2));

console.log('\n--- OPTION FILTER PROP USAGES ---');
console.log(JSON.stringify(optionFilterPropUsages, null, 2));

console.log('\n--- RAW TO-LOWER-CASE / UNNORMALIZED INCLUDES ---');
console.log(JSON.stringify(rawToLowerCaseIncludes, null, 2));
