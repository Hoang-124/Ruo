// Sinh DATABASE_SCHEMA.md từ dbdiagram.dbml để 2 file luôn khớp nhau.
// Chạy: node scripts/docs/gen_schema_md.mjs <dbdiagram.dbml> <DATABASE_SCHEMA.md>
import { readFileSync, writeFileSync } from 'node:fs';

const [src = 'dbdiagram.dbml', out = 'DATABASE_SCHEMA.md'] = process.argv.slice(2);
const text = readFileSync(src, 'utf8');

// Parse section blocks from comments
const sections = [];
const sectionRegex = /\/\/\s*={2,}\r?\n\/\/\s*(\d+\.\s*[A-Z\s/&_-]+)\r?\n\/\/\s*={2,}/g;
let lastIndex = 0;
let match;
const sectionMatches = [];

while ((match = sectionRegex.exec(text)) !== null) {
  sectionMatches.push({ title: match[1].trim(), index: match.index });
}

// Parse TableGroup mappings if any
const tableGroupMap = {};
for (const m of text.matchAll(/TableGroup\s+(\w+)\s*\{([^}]*)\}/g)) {
  const gName = m[1];
  const gTables = m[2].split(/\s+/).filter(Boolean);
  gTables.forEach((t) => {
    tableGroupMap[t] = gName;
  });
}

// Parse all tables
const tables = {};
for (const m of text.matchAll(/Table\s+(\w+)\s*\{\r?\n([\s\S]*?)\r?\n\}/g)) {
  const tableName = m[1];
  const tableStartIndex = m.index;
  const rawBody = m[2];

  // Determine section
  let assignedSection = 'GENERAL';
  for (let i = sectionMatches.length - 1; i >= 0; i--) {
    if (tableStartIndex >= sectionMatches[i].index) {
      assignedSection = sectionMatches[i].title;
      break;
    }
  }

  // Filter out indexes { ... } block
  const cleanBody = rawBody.replace(/indexes\s*\{[\s\S]*?\}/g, '');

  const fields = cleanBody
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('//'))
    .map((line) => {
      const fm = line.match(/^(\w+)\s+([\w\d_]+)(?:\s*\[(.*)\])?$/);
      if (!fm) return null;
      const [, name, type, attrs = ''] = fm;
      const note = (attrs.match(/note:\s*'([^']*)'/) || [])[1] || '';
      const ref = (attrs.match(/ref:\s*>\s*([\w.]+)/) || [])[1];
      const fkNote = (note.match(/FK → (\w+)/) || [])[1];
      const key = [
        /\bpk\b/.test(attrs) && 'PK',
        /\bunique\b/.test(attrs) && 'Unique',
        ref && `FK → \`${ref.split('.')[0]}\``,
        !ref && fkNote && `FK → \`${fkNote}\``
      ]
        .filter(Boolean)
        .join(', ');
      const cleanNote = note.replace(/^FK → \w+\s*/, '').replace(/^\((.*)\)$/, '$1');
      const enumLike = /^[\w]+( \| [\w]+)+$/.test(cleanNote);
      return {
        name,
        type,
        key: key || '-',
        note: enumLike ? cleanNote.split(' | ').map((v) => `\`${v}\``).join(' · ') : cleanNote
      };
    })
    .filter(Boolean);

  tables[tableName] = {
    section: assignedSection,
    fields
  };
}

const tableNames = Object.keys(tables);
const total = tableNames.length;

// Group tables by section
const sectionGroups = {};
tableNames.forEach((t) => {
  const sec = tables[t].section;
  if (!sectionGroups[sec]) sectionGroups[sec] = [];
  sectionGroups[sec].push(t);
});

const lines = [
  '# DATABASE SCHEMA — RUO',
  '',
  `> Normalized Database Architecture · **${total} Tables / Entities** · **95 Use Cases**`,
  '> Main Actors: **Guest** · **Lecturer** · **Facility Manager** · **Technician** · **Admin**',
  '>',
  '> ⚙️ File này được **sinh tự động** từ [dbdiagram.dbml](file:///c:/Users/Dang/Documents/wdp/Ruo/dbdiagram.dbml). Khi điều chỉnh schema, cập nhật DBML rồi chạy `node scripts/docs/gen_schema_md.mjs`.',
  '',
  '## Mục lục',
  ''
];

Object.entries(sectionGroups).forEach(([sec, tList]) => {
  lines.push(`- **${sec}**: ${tList.map((t) => `[\`${t}\`](#${t})`).join(' · ')}`);
});
lines.push('');

Object.entries(sectionGroups).forEach(([sec, tList]) => {
  lines.push('---', '', `## ${sec}`, '');
  for (const t of tList) {
    lines.push(`### ${t}`, '', '| Field | Type | Khoá | Ghi chú |', '|:---|:---|:---|:---|');
    for (const f of tables[t].fields) {
      lines.push(`| ${f.name} | ${f.type} | ${f.key} | ${f.note.replace(/\|/g, '\\|')} |`);
    }
    lines.push('');
  }
});

writeFileSync(out, lines.join('\n'), 'utf8');
console.log(`Generated ${out}: tables=${total} sections=${Object.keys(sectionGroups).length}`);
