// Sinh Actor_UseCase.drawio: 1 trang tổng quan + 1 trang cho mỗi actor.
// Chạy: node scripts/docs/gen_usecase_drawio.mjs [output]
// Muốn thêm / bớt UC: sửa mảng PAGES bên dưới rồi chạy lại.
import { writeFileSync } from 'node:fs';

const out = process.argv[2] || 'Actor_UseCase.drawio';

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const STYLE = {
  actor: 'shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;html=1;outlineConnect=0;fontSize=12;fontStyle=1;',
  uc: 'ellipse;whiteSpace=wrap;html=1;fontSize=11;fillColor=#dae8fc;strokeColor=#6c8ebf;',
  ucInclude: 'ellipse;whiteSpace=wrap;html=1;fontSize=11;fillColor=#f5f5f5;strokeColor=#666666;dashed=1;',
  boundary: 'rounded=0;whiteSpace=wrap;html=1;fillColor=none;verticalAlign=top;align=center;fontSize=13;fontStyle=1;spacingTop=6;',
  frame: 'ruoFrame=1;rounded=1;arcSize=3;whiteSpace=wrap;html=1;dashed=1;fillColor=#fafafa;strokeColor=#b0b0b0;verticalAlign=top;align=left;spacingLeft=8;spacingTop=2;fontSize=10;fontStyle=2;fontColor=#555555;',
  pkg: 'shape=folder;tabWidth=70;tabHeight=14;tabPosition=left;html=1;whiteSpace=wrap;fontSize=12;fillColor=#fff2cc;strokeColor=#d6b656;verticalAlign=middle;',
  assoc: 'endArrow=none;html=1;rounded=0;',
  // Quan hệ giữa 2 UC cùng cột: vòng ra bên phải để không đè lên đường nối của actor
  depSide: 'endArrow=open;endSize=10;dashed=1;html=1;fontSize=10;labelBackgroundColor=#ffffff;edgeStyle=orthogonalEdgeStyle;rounded=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=1;entryY=0.5;entryDx=0;entryDy=0;',
  dep: 'endArrow=open;endSize=10;dashed=1;html=1;rounded=0;fontSize=10;labelBackgroundColor=#ffffff;',
  gen: 'endArrow=block;endFill=0;endSize=12;html=1;rounded=0;',
  note: 'text;html=1;align=left;verticalAlign=top;fontSize=10;fontColor=#666666;whiteSpace=wrap;'
};

const A4_LANDSCAPE = [1169, 827];
const A4_PORTRAIT = [827, 1169];

class Page {
  constructor(id, name) {
    this.id = id;
    this.name = name;
    this.cells = [];
    this.n = 0;
    this.size = A4_LANDSCAPE;
  }
  vertex(id, value, style, x, y, w, h) {
    this.cells.push(`<mxCell id="${id}" value="${esc(value)}" style="${style}" vertex="1" parent="1"><mxGeometry x="${x}" y="${y}" width="${w}" height="${h}" as="geometry"/></mxCell>`);
  }
  rawVertex(id, htmlValue, style, x, y, w, h) {
    this.cells.push(`<mxCell id="${id}" value="${htmlValue}" style="${style}" vertex="1" parent="1"><mxGeometry x="${x}" y="${y}" width="${w}" height="${h}" as="geometry"/></mxCell>`);
  }
  edge(src, tgt, style, label = '') {
    const id = `${this.id}_e${++this.n}`;
    this.cells.push(`<mxCell id="${id}" value="${esc(label)}" style="${style}" edge="1" parent="1" source="${src}" target="${tgt}"><mxGeometry relative="1" as="geometry"/></mxCell>`);
  }
  xml() {
    const [w, h] = this.size;
    return `<diagram id="${this.id}" name="${esc(this.name)}"><mxGraphModel dx="1200" dy="800" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="${w}" pageHeight="${h}" math="0" shadow="0"><root>\n<mxCell id="0"/>\n<mxCell id="1" parent="0"/>\n${this.cells.join('\n')}\n</root></mxGraphModel></diagram>`;
  }
}

// ── Trang theo actor: 1 actor bên trái, UC 1 cột, nhóm theo gói chức năng ──
function actorPage(id, name, spec) {
  const p = new Page(id, name);
  const UC_W = 210, UC_H = 34, UC_GAP = 10;
  const BX = 250, BW = 470, BY = 40;
  const FRAME_X = BX + 20, FRAME_W = BW - 40;
  const UC_X = BX + 50;
  const ucIds = {};
  const frames = [];
  const ucs = [];

  let y = BY + 40;
  for (const g of spec.groups) {
    const top = y;
    y += 22;
    for (const [key, label] of g.ucs) {
      ucIds[key] = `${id}_${key}`;
      ucs.push([ucIds[key], label, y]);
      y += UC_H + UC_GAP;
    }
    y += 4;
    frames.push([g.pkg, top, y - top]);
    y += 12;
  }
  const height = y - BY;
  if (BY + height + 80 > A4_LANDSCAPE[1]) p.size = A4_PORTRAIT;

  // Thứ tự vẽ: khung hệ thống → khung nhóm → UC (để UC nằm trên cùng)
  p.vertex(`${id}_sys`, spec.title, STYLE.boundary, BX, BY, BW, height);
  frames.forEach(([pkg, top, h], i) => p.vertex(`${id}_f${i}`, pkg, STYLE.frame, FRAME_X, top, FRAME_W, h));
  for (const [cid, label, uy] of ucs) p.vertex(cid, label, STYLE.uc, UC_X, uy, UC_W, UC_H);

  const aid = `${id}_actor`;
  p.vertex(aid, spec.actor, STYLE.actor, BX - 150, BY + height / 2 - 30, 30, 60);
  for (const [cid] of ucs) p.edge(aid, cid, STYLE.assoc);
  for (const [from, to, label] of spec.deps || []) p.edge(ucIds[from], ucIds[to], STYLE.depSide, label);
  if (spec.note) p.vertex(`${id}_note`, spec.note, STYLE.note, BX, BY + height + 12, BW, 60);
  return p;
}

// ── Trang Guest & User: 2 actor + quan hệ tổng quát hoá ──
function authPage() {
  const p = new Page('p2', '2. Guest & User');
  const UC_W = 190, UC_H = 36, BX = 230, BW = 520, BY = 40;
  p.vertex('p2_sys', 'Authentication (6 UC)', STYLE.boundary, BX, BY, BW, 380);
  const left = [['a1', 'Register account'], ['a2', 'Log in'], ['a3', 'Recover password']];
  const right = [['a4', 'Log out'], ['a5', 'Update profile'], ['a6', 'Change password']];
  left.forEach(([k, l], i) => p.vertex(`p2_${k}`, l, STYLE.uc, BX + 30, BY + 60 + i * 60, UC_W, UC_H));
  right.forEach(([k, l], i) => p.vertex(`p2_${k}`, l, STYLE.uc, BX + BW - 30 - UC_W, BY + 60 + i * 60, UC_W, UC_H));
  p.vertex('p2_otp', 'Verify email OTP', STYLE.ucInclude, BX + 30, BY + 300, UC_W, UC_H);

  p.vertex('p2_G', 'Guest', STYLE.actor, BX - 130, BY + 110, 30, 60);
  p.vertex('p2_U', 'User', STYLE.actor, BX + BW + 100, BY + 110, 30, 60);
  left.forEach(([k]) => p.edge('p2_G', `p2_${k}`, STYLE.assoc));
  right.forEach(([k]) => p.edge('p2_U', `p2_${k}`, STYLE.assoc));
  p.edge('p2_a1', 'p2_otp', STYLE.depSide, '«include»');
  p.edge('p2_a3', 'p2_otp', STYLE.depSide, '«include»');

  ['Lecturer', 'Facility Manager', 'Technician', 'Admin'].forEach((name, i) => {
    p.vertex(`p2_g${i}`, name, STYLE.actor, BX + BW + 260, BY + i * 100, 30, 60);
    p.edge(`p2_g${i}`, 'p2_U', STYLE.gen);
  });
  p.vertex('p2_note', 'User là actor trừu tượng: mọi actor đã đăng nhập đều kế thừa 3 UC của User. Register account chỉ tạo được tài khoản Lecturer, bắt buộc xác thực email bằng OTP. Tài khoản Facility Manager / Technician / Admin do Admin tạo.', STYLE.note, BX, BY + 395, BW, 60);
  return p;
}

// ── Trang 1: Tổng quan actor ↔ gói chức năng ──
function overviewPage() {
  const p = new Page('p1', '1. Tổng quan');
  const PX = 330, PW = 230, PH = 70, COL2 = PX + PW + 60, PY = 90, PGAP = 40;
  p.vertex('p1_sys', 'Hệ thống Ruo — Quản lý Cơ sở vật chất (48 Use Case)', STYLE.boundary, PX - 40, 40, PW * 2 + 140, PY + 4 * (PH + PGAP) - 20);
  const pkgs = [
    ['P1', '1. Authentication', 6, PX, 0],
    ['P2', '2. Repair', 10, PX, 1],
    ['P4', '4. Equipment Registry', 7, PX, 2],
    ['P3', '3. Warehouse &amp; Movement', 6, PX, 3],
    ['P5', '5. Inventory', 3, COL2, 0],
    ['P6', '6. Disposal', 2, COL2, 1],
    ['P8', '8. Reporting &amp; Audit', 5, COL2, 2],
    ['P7', '7. Administration', 9, COL2, 3]
  ];
  for (const [k, title, n, x, row] of pkgs) {
    p.rawVertex(`p1_${k}`, `&lt;b&gt;${title}&lt;/b&gt;&lt;br&gt;&lt;font style=&quot;font-size:10px&quot;&gt;${n} use case&lt;/font&gt;`, STYLE.pkg, x, PY + row * (PH + PGAP), PW, PH);
  }
  const actors = [
    ['G', 'Guest', 60, 70], ['U', 'User', 180, 70], ['L', 'Lecturer', 60, 230],
    ['FM', 'Facility Manager', 120, 400], ['T', 'Technician', 1000, 160], ['A', 'Admin', 1000, 400]
  ];
  for (const [k, label, x, y] of actors) p.vertex(`p1_${k}`, label, STYLE.actor, x, y, 30, 60);
  const links = [
    ['G', 'P1'], ['U', 'P1'], ['L', 'P2'], ['L', 'P4'],
    ['FM', 'P2'], ['FM', 'P3'], ['FM', 'P4'], ['FM', 'P5'], ['FM', 'P6'], ['FM', 'P8'],
    ['T', 'P2'], ['T', 'P3'], ['T', 'P5'], ['A', 'P6'], ['A', 'P7'], ['A', 'P8']
  ];
  for (const [a, k] of links) p.edge(`p1_${a}`, `p1_${k}`, STYLE.assoc);
  p.vertex('p1_note', 'Chi tiết theo từng actor: trang 2 (Guest & User) · 3 (Lecturer) · 4 (Technician) · 5 (Facility Manager) · 6 (Admin).', STYLE.note, PX - 40, 40 + PY + 4 * (PH + PGAP), PW * 2 + 140, 30);
  return p;
}

const pages = [
  overviewPage(),
  authPage(),
  actorPage('p3', '3. Lecturer', {
    actor: 'Lecturer',
    title: 'Lecturer — Giảng viên (4 UC)',
    groups: [
      { pkg: 'Repair', ucs: [['r1', 'Report malfunction'], ['r2', 'Track repair status'], ['r3', 'Evaluate repair quality']] },
      { pkg: 'Equipment Registry', ucs: [['e7', 'View room equipment']] }
    ],
    note: 'Report malfunction tạo phiếu sửa và báo cho Facility Manager. Evaluate repair quality chỉ làm được khi phiếu đã sửa xong.'
  }),
  actorPage('p4', '4. Technician', {
    actor: 'Technician',
    title: 'Technician — Kỹ thuật viên (7 UC)',
    groups: [
      { pkg: 'Repair', ucs: [['r7', 'Accept repair task'], ['r8', 'Update repair progress'], ['r9', 'Request spare parts'], ['r10', 'Report repair outcome']] },
      { pkg: 'Warehouse & Movement', ucs: [['w5', 'Replace with spare equipment'], ['w6', 'Confirm equipment movement']] },
      { pkg: 'Inventory', ucs: [['i3', 'Scan equipment QR']] }
    ],
    deps: [['w5', 'w6', '«include»']],
    note: 'Technician chỉ thực hiện, không tự duyệt. Request spare parts → Facility Manager duyệt. Report repair outcome → Facility Manager quyết định nơi đến (repaired) hoặc đề xuất thanh lý (unrepairable).'
  }),
  actorPage('p5', '5. Facility Manager', {
    actor: 'Facility Manager',
    title: 'Facility Manager — Quản lý CSVC (17 UC)',
    groups: [
      { pkg: 'Repair', ucs: [['r4', 'Assign repair task'], ['w1', 'Select spare equipment'], ['r5', 'Approve parts request'], ['r6', 'Close repair ticket']] },
      { pkg: 'Warehouse & Movement', ucs: [['w2', 'Assign post-repair location'], ['w3', 'Order equipment transfer'], ['w4', 'Update spare parts stock']] },
      { pkg: 'Equipment Registry', ucs: [['e1', 'Register equipment'], ['e4', 'Print QR label'], ['e2', 'Update equipment info'], ['e3', 'Import equipment list'], ['e5', 'Check warranty status'], ['e6', 'Update warranty info']] },
      { pkg: 'Inventory', ucs: [['i1', 'Create inventory session'], ['i2', 'Reconcile inventory result']] },
      { pkg: 'Disposal', ucs: [['d1', 'Propose disposal']] },
      { pkg: 'Reporting', ucs: [['p1', 'View operation dashboard']] }
    ],
    deps: [['w1', 'r4', '«extend»'], ['e4', 'e1', '«extend»'], ['e6', 'e5', '«extend»']],
    note: 'Select spare equipment: chỉ khi kho còn đồ cùng loại. Assign post-repair location: sau khi Technician báo repaired, ưu tiên phòng gốc → phòng đang thiếu → kho. Propose disposal: sau khi Technician báo unrepairable, Admin duyệt.'
  }),
  actorPage('p6', '6. Admin', {
    actor: 'Admin',
    title: 'Admin — Quản trị hệ thống (15 UC)',
    groups: [
      { pkg: 'User Accounts', ucs: [['m1', 'Create user account'], ['m2', 'Assign user role'], ['m3', 'Lock user account'], ['m4', 'Reset user password'], ['m5', 'Configure role permissions']] },
      { pkg: 'Master Data', ucs: [['m6', 'Define equipment category'], ['m7', 'Register supplier'], ['m8', 'Register repair unit'], ['m9', 'Register room']] },
      { pkg: 'Disposal', ucs: [['d2', 'Approve disposal request']] },
      { pkg: 'Reporting & Audit', ucs: [['p1', 'View operation dashboard'], ['p2', 'Export statistical report'], ['p3', 'View audit log'], ['p5', 'Export audit log'], ['p4', 'Verify audit chain']] }
    ],
    deps: [['p5', 'p3', '«extend»']],
    note: 'Register room gồm cả kho (room_type = warehouse) và định mức thiết bị của phòng. Approve disposal request: từ chối thì thiết bị quay về repairing.'
  })
];

const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<mxfile host="app.diagrams.net" agent="Ruo generator" version="24.7.0">\n${pages.map((p) => p.xml()).join('\n')}\n</mxfile>\n`;
writeFileSync(out, xml, 'utf8');

const labels = [...xml.matchAll(/value="([^"]*)" style="ellipse;whiteSpace=wrap;html=1;fontSize=11;fillColor=#dae8fc/g)].map((m) => m[1]);
console.log(`pages=${pages.length} unique_use_cases=${new Set(labels).size} bytes=${xml.length}`);
