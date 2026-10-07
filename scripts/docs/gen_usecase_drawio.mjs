// Sinh Actor_UseCase.drawio: mỗi actor 1 trang, vẽ đơn giản
// (1 actor bên trái, khung hệ thống, các UC xếp 1 cột).
// Chạy: node scripts/docs/gen_usecase_drawio.mjs [output]
// Muốn thêm / bớt UC: sửa mảng ACTORS bên dưới rồi chạy lại.
import { writeFileSync } from 'node:fs';

const out = process.argv[2] || 'Actor_UseCase.drawio';

// UC chung của mọi tài khoản đã có: vẽ lặp lại ở từng trang để mỗi trang tự đủ
const ACCOUNT = ['Log in', 'Log out', 'Update profile', 'Change password', 'View notifications'];

const ACTORS = [
  { name: 'Guest', module: 'GUEST MODULE', ucs: [
    'Register account', 'Verify email OTP', 'Recover password'
  ] },
  { name: 'Lecturer', module: 'LECTURER MODULE', ucs: [
    ...ACCOUNT,
    'View room equipment', 'View equipment details', 'Scan equipment QR',
    'Report malfunction', 'Track repair status', 'View repair history', 'Evaluate repair quality'
  ] },
  { name: 'Technician', module: 'TECHNICIAN MODULE', ucs: [
    ...ACCOUNT,
    'View assigned tasks', 'View repair task details', 'Accept repair task', 'Update repair progress',
    'View spare parts stock', 'Request spare parts', 'Report repair outcome',
    'View movement orders', 'Replace with spare equipment', 'Confirm equipment movement',
    'Scan equipment QR', 'View equipment details'
  ] },
  { name: 'Facility Manager', module: 'FACILITY MANAGER MODULE', ucs: [
    ...ACCOUNT,
    'View repair tickets', 'Assign repair task', 'Select spare equipment', 'Approve parts request', 'Close repair ticket',
    'View warehouse stock', 'View room shortage', 'Assign post-repair location', 'Order equipment transfer',
    'View movement history', 'Update spare parts stock',
    'View equipment list', 'View equipment details', 'Register equipment', 'Update equipment info',
    'Import equipment list', 'Print QR label', 'Check warranty status', 'Update warranty info',
    'Create inventory session', 'View inventory result', 'Reconcile inventory result',
    'Propose disposal', 'View operation dashboard'
  ] },
  { name: 'Admin', module: 'ADMIN MODULE', ucs: [
    ...ACCOUNT,
    'View user list', 'View user details', 'Create user account', 'Assign user role',
    'Lock user account', 'Reset user password', 'View role permissions', 'Configure role permissions',
    'View room list', 'Register room', 'Define equipment category', 'Register supplier', 'Register repair unit',
    'View equipment list', 'View equipment details',
    'View disposal requests', 'Approve disposal request',
    'View operation dashboard', 'View statistical report', 'Export statistical report',
    'View audit log', 'Verify audit chain', 'Export audit log'
  ] }
];

const STYLE = {
  actor: 'shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;html=1;outlineConnect=0;fontSize=11;',
  boundary: 'rounded=0;whiteSpace=wrap;html=1;fillColor=none;verticalAlign=top;align=center;fontSize=11;fontStyle=1;spacingTop=4;',
  uc: 'ellipse;whiteSpace=wrap;html=1;fontSize=11;fillColor=#ffffff;strokeColor=#000000;',
  assoc: 'endArrow=none;html=1;rounded=0;strokeWidth=1;'
};

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const BX = 160, BW = 440, BY = 40;        // khung hệ thống
const UC_X = BX + 170, UC_W = 210, UC_H = 26, STEP = 34;
const PAGE_W = 827, PAGE_H = 1169;        // A4 dọc

function actorPage(a, i) {
  const pid = `p${i + 1}`;
  const height = 50 + a.ucs.length * STEP;
  const cells = [
    `<mxCell id="${pid}_sys" value="${esc(`RUO UNIVERSITY - ${a.module}`)}" style="${STYLE.boundary}" vertex="1" parent="1"><mxGeometry x="${BX}" y="${BY}" width="${BW}" height="${height}" as="geometry"/></mxCell>`,
    `<mxCell id="${pid}_actor" value="${esc(a.name)}" style="${STYLE.actor}" vertex="1" parent="1"><mxGeometry x="${BX - 80}" y="${BY + height / 2 - 30}" width="30" height="60" as="geometry"/></mxCell>`
  ];
  a.ucs.forEach((label, k) => {
    cells.push(`<mxCell id="${pid}_uc${k}" value="${esc(label)}" style="${STYLE.uc}" vertex="1" parent="1"><mxGeometry x="${UC_X}" y="${BY + 40 + k * STEP}" width="${UC_W}" height="${UC_H}" as="geometry"/></mxCell>`);
    cells.push(`<mxCell id="${pid}_e${k}" value="" style="${STYLE.assoc}" edge="1" parent="1" source="${pid}_actor" target="${pid}_uc${k}"><mxGeometry relative="1" as="geometry"/></mxCell>`);
  });
  return `<diagram id="${pid}" name="${esc(`${i + 1}. ${a.name}`)}"><mxGraphModel dx="1200" dy="800" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="${PAGE_W}" pageHeight="${PAGE_H}" math="0" shadow="0"><root>\n<mxCell id="0"/>\n<mxCell id="1" parent="0"/>\n${cells.join('\n')}\n</root></mxGraphModel></diagram>`;
}

const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<mxfile host="app.diagrams.net" agent="Ruo generator" version="24.7.0">\n${ACTORS.map(actorPage).join('\n')}\n</mxfile>\n`;
writeFileSync(out, xml, 'utf8');

const unique = new Set(ACTORS.flatMap((a) => a.ucs));
console.log(`pages=${ACTORS.length} unique_use_cases=${unique.size} ` + ACTORS.map((a) => `${a.name}=${a.ucs.length}`).join(' '));
