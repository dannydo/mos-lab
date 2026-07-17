import fs from 'fs';
import path from 'path';

const schemaPath = path.resolve('/Users/dannydo/projects/mos-lab/apps/api/prisma/legacy.prisma');
const content = fs.readFileSync(schemaPath, 'utf8');

const targetModels = new Set([
  'user',
  'user_profile',
  'user_contact',
  'user_service_balance',
  'order',
  'order_service',
  'service',
  'service_language',
  'client_store_language',
]);

const scalarTypes = new Set([
  'Int',
  'BigInt',
  'Float',
  'Decimal',
  'Boolean',
  'String',
  'DateTime',
  'Json',
  'Bytes',
  'Unsupported',
]);

// Split file by models
const lines = content.split('\n');
const output = [];

// Keep the generator and datasource blocks
let inBlock = false;
let blockType = ''; // 'datasource', 'generator', 'model'
let blockName = '';
let currentBlockLines = [];

for (const line of lines) {
  const trimmed = line.trim();

  if (trimmed.startsWith('datasource') || trimmed.startsWith('generator')) {
    inBlock = true;
    blockType = trimmed.startsWith('datasource') ? 'datasource' : 'generator';
    currentBlockLines.push(line);
    continue;
  }

  if (trimmed.startsWith('model ')) {
    inBlock = true;
    blockType = 'model';
    // Format: model user {
    const match = trimmed.match(/^model\s+(\w+)\s*\{/);
    blockName = match ? match[1] : '';
    currentBlockLines.push(line);
    continue;
  }

  if (inBlock) {
    currentBlockLines.push(line);
    if (trimmed === '}') {
      inBlock = false;
      // Process finished block
      if (blockType === 'datasource' || blockType === 'generator') {
        output.push(currentBlockLines.join('\n'));
      } else if (blockType === 'model' && targetModels.has(blockName)) {
        // Clean model lines
        const cleanedLines = [];
        cleanedLines.push(currentBlockLines[0]); // model Name {

        for (let i = 1; i < currentBlockLines.length - 1; i++) {
          const mLine = currentBlockLines[i];
          const mTrimmed = mLine.trim();

          if (!mTrimmed) {
            cleanedLines.push(mLine);
            continue;
          }

          // Skip any @@index lines to avoid index validation errors
          if (mTrimmed.startsWith('@@index')) {
            continue;
          }

          // Handle scalar fields and relation fields
          // A field line typically looks like: name Type @attributes or name Type
          // Let's parse the type (second word)
          const parts = mTrimmed.split(/\s+/);
          if (parts.length >= 2) {
            const fieldName = parts[0];
            let fieldType = parts[1];

            // Strip ? and [] to get base type
            const baseType = fieldType.replace('?', '').replace('[]', '');

            // Check if it is a scalar or unsupported
            if (scalarTypes.has(baseType) || baseType.startsWith('Unsupported')) {
              cleanedLines.push(mLine);
            } else {
              // It's a relation type!
              // Only keep if the target model is in our target list
              if (targetModels.has(baseType)) {
                // If there are duplicate relation field names (like Prisma complains about),
                // we can safely remove them if we don't need them, but let's keep them and see.
                // Wait! If a model has a relation that causes duplicate fields, we can rename the relation fields
                // or just remove all relation fields completely to be 100% safe,
                // because we can always query using raw scalar IDs!
                // Let's just remove ALL relation fields to avoid any relational/index duplicate field errors.
                // This is the most bulletproof way.
                continue;
              }
            }
          } else {
            cleanedLines.push(mLine);
          }
        }

        cleanedLines.push('}');
        output.push(cleanedLines.join('\n'));
      }
      currentBlockLines = [];
    }
  }
}

fs.writeFileSync(schemaPath, output.join('\n\n') + '\n');
console.log('Cleaned schema written to legacy.prisma!');
