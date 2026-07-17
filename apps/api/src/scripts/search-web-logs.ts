import fs from 'fs';

const logPath =
  '/Users/dannydo/.gemini/antigravity/brain/de9cc128-0555-4685-b03c-3bbe4304d90c/.system_generated/tasks/task-1203.log';

if (fs.existsSync(logPath)) {
  const content = fs.readFileSync(logPath, 'utf8');
  const lines = content.split('\n');

  console.log('Searching for web/browser logs:');
  for (const line of lines) {
    if (line.includes('@mos-lab/web:dev') || line.includes('[browser]')) {
      console.log(line);
    }
  }
} else {
  console.log('Log file does not exist');
}
