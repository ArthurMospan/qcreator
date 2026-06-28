const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('route.ts')) {
      if (file.includes('[id]')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk(path.join(__dirname, 'src', 'app', 'api'));
for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/export async function (\w+)\(req: Request, \{ params \}: \{ params: \{ id: string \} \}\) \{/g, 'export async function $1(req: Request, { params }: { params: Promise<{ id: string }> }) {\n  const { id } = await params;');
  content = content.replace(/params\.id/g, 'id');
  fs.writeFileSync(file, content);
}
console.log('Fixed routes!');
