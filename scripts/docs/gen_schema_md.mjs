// Sinh DATABASE_SCHEMA.md từ dbdiagram.dbml để 2 file luôn khớp nhau.
// Chạy: node gen_schema_md.mjs <dbdiagram.dbml> <DATABASE_SCHEMA.md>
import { readFileSync, writeFileSync } from 'node:fs';

const [src = 'dbdiagram.dbml', out = 'DATABASE_SCHEMA.md'] = process.argv.slice(2);
const text = readFileSync(src, 'utf8');

const groups = [...text.matchAll(/TableGroup\s+(\w+)\s*\{([^}]*)\}/g)].map((m) => ({
  name: m[1],
  tables: m[2].split(/\s+/).filter(Boolean)
}));
const sectionTitles = [...text.matchAll(/^\/\/ ─── (.+?) ─+$/gm)].map((m) => m[1].trim());

const tables = {};
for (const m of text.matchAll(/Table\s+(\w+)\s*\{\r?\n([\s\S]*?)\r?\n\}/g)) {
  tables[m[1]] = m[2].split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('//')).map((line) => {
    const fm = line.match(/^(\w+)\s+(\w+)(?:\s*\[(.*)\])?$/);
    if (!fm) throw new Error(`Không parse được dòng: ${line}`);
    const [, name, type, attrs = ''] = fm;
    const note = (attrs.match(/note:\s*'([^']*)'/) || [])[1] || '';
    const ref = (attrs.match(/ref:\s*>\s*([\w.]+)/) || [])[1];
    const fkNote = (note.match(/FK → (\w+)/) || [])[1];
    const key = [/\bpk\b/.test(attrs) && 'PK', /\bunique\b/.test(attrs) && 'Unique', ref && `FK → \`${ref.split('.')[0]}\``, !ref && fkNote && `FK → \`${fkNote}\``]
      .filter(Boolean).join(', ');
    const cleanNote = note.replace(/^FK → \w+\s*/, '').replace(/^\((.*)\)$/, '$1');
    const enumLike = /^[\w]+( \| [\w]+)+$/.test(cleanNote);
    return { name, type, key, note: enumLike ? cleanNote.split(' | ').map((v) => `\`${v}\``).join(' · ') : cleanNote };
  });
}

const total = Object.keys(tables).length;
const lines = [
  '# DATABASE SCHEMA — RUO',
  '',
  `> MongoDB · Mongoose ODM · **${total} collections** · **68 Use Cases**`,
  '> Actors: **Guest** · **Lecturer** · **Facility Manager** · **Technician** · **Admin**',
  '>',
  '> ⚙️ File này được **sinh tự động** từ [dbdiagram.dbml](file:///d:/Ruo/dbdiagram.dbml). Muốn sửa schema thì sửa DBML rồi chạy `node scripts/docs/gen_schema_md.mjs`.',
  '> Giải thích nghiệp vụ, vòng đời thiết bị và kịch bản mẫu: [DB_MODULES_EXPLAINED.md](file:///d:/Ruo/DB_MODULES_EXPLAINED.md).',
  '',
  '## Mục lục',
  ''
];
groups.forEach((g, i) => {
  lines.push(`- **${sectionTitles[i] || g.name}**: ${g.tables.map((t) => `[\`${t}\`](#${t})`).join(' · ')}`);
});
lines.push('');

let n = 0;
groups.forEach((g, i) => {
  lines.push('---', '', `## ${sectionTitles[i] || g.name}`, '');
  for (const t of g.tables) {
    if (!tables[t]) throw new Error(`TableGroup ${g.name} tham chiếu bảng không tồn tại: ${t}`);
    n++;
    lines.push(`### ${t}`, '', '| Field | Type | Khoá | Ghi chú |', '|:---|:---|:---|:---|');
    for (const f of tables[t]) lines.push(`| ${f.name} | ${f.type} | ${f.key} | ${f.note.replace(/\|/g, '\\|')} |`);
    lines.push('');
  }
});
if (n !== total) throw new Error(`Có ${total - n} bảng không thuộc TableGroup nào`);

writeFileSync(out, lines.join('\n'), 'utf8');
console.log(`collections=${total} groups=${groups.length}`);
