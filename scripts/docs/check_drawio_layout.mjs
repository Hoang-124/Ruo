// Kiểm tra bố cục drawio: hình chồng nhau, UC nằm ngoài khung, actor đè lên khung.
import { readFileSync } from 'node:fs';

const xml = readFileSync(process.argv[2] || 'Actor_UseCase.drawio', 'utf8');
let total = 0;
for (const d of xml.split('<diagram ').slice(1)) {
  const name = d.match(/name="([^"]+)"/)[1];
  const cells = [...d.matchAll(/<mxCell id="([^"]+)" value="([^"]*)" style="([^"]*)" vertex="1"[^>]*><mxGeometry x="([\d.-]+)" y="([\d.-]+)" width="([\d.]+)" height="([\d.]+)"/g)]
    .map((m) => ({ id: m[1], label: m[2], style: m[3], x: +m[4], y: +m[5], w: +m[6], h: +m[7] }));
  const sys = cells.find((c) => c.id.endsWith('_sys'));
  const shapes = cells.filter((c) => c !== sys && !c.style.startsWith('text;') && !c.style.includes('ruoFrame=1'));
  // Actor tính cả nhãn bên dưới (rộng ~120px, cao thêm ~18px)
  const box = (c) => (c.style.includes('umlActor') ? { x: c.x - 45, y: c.y, w: c.w + 90, h: c.h + 18 } : c);
  const hit = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  const issues = [];
  for (let i = 0; i < shapes.length; i++)
    for (let j = i + 1; j < shapes.length; j++)
      if (hit(box(shapes[i]), box(shapes[j]))) issues.push(`overlap: ${shapes[i].label} <> ${shapes[j].label}`);
  for (const c of shapes) {
    const isUc = c.style.startsWith('ellipse') || c.style.includes('folder');
    const inside = c.x >= sys.x && c.x + c.w <= sys.x + sys.w && c.y >= sys.y && c.y + c.h <= sys.y + sys.h;
    if (isUc && !inside) issues.push(`UC outside boundary: ${c.label}`);
    if (c.style.includes('umlActor') && hit(box(c), sys)) issues.push(`actor touches boundary: ${c.label}`);
  }
  const pw = +d.match(/pageWidth="(\d+)"/)[1];
  const ph = +d.match(/pageHeight="(\d+)"/)[1];
  for (const c of cells) {
    const b = box(c);
    if (b.x < 0 || b.y < 0 || b.x + b.w > pw || b.y + b.h > ph) issues.push(`outside page ${pw}x${ph}: ${c.label || c.id}`);
  }
  total += issues.length;
  console.log(`${name.padEnd(38)} shapes=${String(shapes.length).padEnd(3)} ${issues.length ? issues.join(' | ') : 'OK'}`);
}
process.exit(total ? 1 : 0);
