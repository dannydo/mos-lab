import fs from 'fs';

const logPath =
  '/Users/dannydo/.gemini/antigravity/brain/de9cc128-0555-4685-b03c-3bbe4304d90c/.system_generated/tasks/task-1203.log';

if (fs.existsSync(logPath)) {
  const content = fs.readFileSync(logPath, 'utf8');
  const lines = content.split('\n');
  const reqMap: { [id: string]: any } = {};

  const startLine = Math.max(0, lines.length - 100);
  console.log(`Printing log lines from ${startLine} to ${lines.length}`);

  for (let i = startLine; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    try {
      const cleanLine = line.substring(line.indexOf('{'));
      const obj = JSON.parse(cleanLine);
      if (obj.req) {
        reqMap[obj.reqId] = obj.req;
      }
      if (obj.res) {
        const req = reqMap[obj.reqId];
        console.log(`REQ: ${req?.method} ${req?.url} -> RES: ${obj.res.statusCode} (Msg: ${obj.msg})`);
      }
      if (obj.level === 50) {
        console.log('ERROR LOG:', obj.msg, obj.err);
      }
    } catch (err) {
      // Ignored
    }
  }
} else {
  console.log('Log file does not exist');
}
