// Sinh Actor_UseCase.drawio: 1 trang tổng quan (8 gói) + 4 trang UC chi tiết.
// Chạy: node gen_usecase_drawio.mjs <đường-dẫn-output>
import { writeFileSync } from 'node:fs';

const out = process.argv[2] || 'Actor_UseCase.drawio';

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const STYLE = {
  actor: 'shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;html=1;outlineConnect=0;fontSize=11;fontStyle=1;',
  uc: 'ellipse;whiteSpace=wrap;html=1;fontSize=11;fillColor=#dae8fc;strokeColor=#6c8ebf;',
  ucInclude: 'ellipse;whiteSpace=wrap;html=1;fontSize=11;fillColor=#f5f5f5;strokeColor=#666666;dashed=1;',
  boundary: 'rounded=0;whiteSpace=wrap;html=1;fillColor=none;verticalAlign=top;align=center;fontSize=13;fontStyle=1;spacingTop=6;',
  pkg: 'shape=folder;tabWidth=70;tabHeight=14;tabPosition=left;html=1;whiteSpace=wrap;fontSize=12;fillColor=#fff2cc;strokeColor=#d6b656;verticalAlign=middle;',
  assoc: 'endArrow=none;html=1;rounded=0;',
  dep: 'endArrow=open;endSize=10;dashed=1;html=1;rounded=0;fontSize=10;labelBackgroundColor=#ffffff;',
  gen: 'endArrow=block;endFill=0;endSize=12;html=1;rounded=0;',
  note: 'text;html=1;align=left;verticalAlign=top;fontSize=10;fontColor=#666666;whiteSpace=wrap;'
};

class Page {
  constructor(id, name) {
    this.id = id;
    this.name = name;
    this.cells = [];
    this.n = 0;
  }
  vertex(id, value, style, x, y, w, h) {
    this.cells.push(`<mxCell id="${id}" value="${esc(value)}" style="${style}" vertex="1" parent="1"><mxGeometry x="${x}" y="${y}" width="${w}" height="${h}" as="geometry"/></mxCell>`);
  }
  edge(src, tgt, style, label = '') {
    const id = `${this.id}_e${++this.n}`;
    this.cells.push(`<mxCell id="${id}" value="${esc(label)}" style="${style}" edge="1" parent="1" source="${src}" target="${tgt}"><mxGeometry relative="1" as="geometry"/></mxCell>`);
  }
  xml() {
    return `<diagram id="${this.id}" name="${esc(this.name)}"><mxGraphModel dx="1200" dy="800" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1169" pageHeight="827" math="0" shadow="0"><root>\n<mxCell id="0"/>\n<mxCell id="1" parent="0"/>\n${this.cells.join('\n')}\n</root></mxGraphModel></diagram>`;
  }
}

// ── Bố cục trang chi tiết: actor trái/phải, UC xếp cột cạnh actor ──
const UC_W = 180, UC_H = 40, UC_GAP = 12, GROUP_GAP = 34;
const BX = 170, BW = 640, BY = 40;
const LEFT_UC_X = BX + 30;
const RIGHT_UC_X = BX + BW - 30 - UC_W;
const MID_UC_X = BX + (BW - UC_W) / 2;

function detailPage(id, name, title, spec) {
  const p = new Page(id, name);
  const ucIds = {};
  const actorPos = {};
  const placeSide = (groups, ucX, actorX) => {
    let y = BY + 50;
    for (const g of groups) {
      const top = y;
      for (const [key, label] of g.ucs) {
        const cid = `${id}_${key}`;
        ucIds[key] = cid;
        p.vertex(cid, label, STYLE.uc, ucX, y, UC_W, UC_H);
        y += UC_H + UC_GAP;
      }
      // Actor cao 60px + nhãn ~18px: mỗi nhóm chiếm ít nhất 100px để actor không đè nhau
      if (y - top < 100) y = top + 100;
      const mid = (top + y - UC_GAP) / 2;
      const aid = `${id}_a_${g.key}`;
      p.vertex(aid, g.name, STYLE.actor, actorX, mid - 30, 30, 60);
      actorPos[g.key] = { x: actorX, y: mid - 30 };
      for (const [key] of g.ucs) p.edge(aid, ucIds[key], STYLE.assoc);
      g.cellId = aid;
      y += GROUP_GAP - UC_GAP;
    }
    return y;
  };
  const leftBottom = placeSide(spec.left, LEFT_UC_X, BX - 90);
  const rightBottom = placeSide(spec.right || [], RIGHT_UC_X, BX + BW + 60);
  for (const [key, label, y] of spec.middle || []) {
    const cid = `${id}_${key}`;
    ucIds[key] = cid;
    p.vertex(cid, label, STYLE.ucInclude, MID_UC_X, y, UC_W, UC_H);
  }
  const actorIds = Object.fromEntries([...spec.left, ...(spec.right || [])].map((g) => [g.key, g.cellId]));
  for (const [actorKey, ucKey] of spec.extraAssoc || []) p.edge(actorIds[actorKey], ucIds[ucKey], STYLE.assoc);
  for (const [from, to, label] of spec.deps || []) p.edge(ucIds[from], ucIds[to], STYLE.dep, label);

  const height = Math.max(leftBottom, rightBottom, ...(spec.middle || []).map((m) => m[2] + UC_H + 30)) - BY + 10;
  // Khung hệ thống đặt đầu danh sách để nằm dưới các hình khác
  p.cells.unshift(`<mxCell id="${id}_sys" value="${esc(title)}" style="${STYLE.boundary}" vertex="1" parent="1"><mxGeometry x="${BX}" y="${BY}" width="${BW}" height="${height}" as="geometry"/></mxCell>`);
  if (spec.generalize) {
    // Xếp dọc bên phải actor cha để đường tổng quát hoá ngắn, không cắt qua khung hệ thống
    const parentKey = spec.generalize.parent;
    const parent = actorIds[parentKey];
    const { x: px, y: py } = actorPos[parentKey];
    const kids = spec.generalize.children;
    const startY = Math.max(20, py - ((kids.length - 1) / 2) * 100);
    kids.forEach((name, i) => {
      const cid = `${id}_g${i}`;
      p.vertex(cid, name, STYLE.actor, px + 160, startY + i * 100, 30, 60);
      p.edge(cid, parent, STYLE.gen);
    });
  }
  if (spec.note) p.vertex(`${id}_note`, spec.note, STYLE.note, BX, BY + height + 10, BW, 40);
  return p;
}

// ── Trang 1: Tổng quan ──
function overviewPage() {
  const p = new Page('p1', '1. Tổng quan');
  const PX = 330, PW = 230, PH = 70, COL2 = PX + PW + 60, PY = 90, PGAP = 40;
  p.vertex('p1_sys', 'Hệ thống Ruo — Quản lý Cơ sở vật chất (48 Use Case)', STYLE.boundary, PX - 40, 40, PW * 2 + 140, PY + 4 * (PH + PGAP) - 40 + 20);
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
  for (const [k, name, n, x, row] of pkgs) {
    p.cells.push(`<mxCell id="p1_${k}" value="&lt;b&gt;${name}&lt;/b&gt;&lt;br&gt;&lt;font style=&quot;font-size:10px&quot;&gt;${n} use case&lt;/font&gt;" style="${STYLE.pkg}" vertex="1" parent="1"><mxGeometry x="${x}" y="${PY + row * (PH + PGAP)}" width="${PW}" height="${PH}" as="geometry"/></mxCell>`);
  }
  const actors = [
    ['G', 'Guest', 60, 70],
    ['U', 'User', 180, 70],
    ['L', 'Lecturer', 60, 230],
    ['FM', 'Facility Manager', 120, 400],
    ['T', 'Technician', 1000, 160],
    ['A', 'Admin', 1000, 400]
  ];
  for (const [k, name, x, y] of actors) p.vertex(`p1_${k}`, name, STYLE.actor, x, y, 30, 60);
  const links = [
    ['G', 'P1'], ['U', 'P1'],
    ['L', 'P2'], ['L', 'P4'],
    ['FM', 'P2'], ['FM', 'P3'], ['FM', 'P4'], ['FM', 'P5'], ['FM', 'P6'], ['FM', 'P8'],
    ['T', 'P2'], ['T', 'P3'], ['T', 'P5'],
    ['A', 'P6'], ['A', 'P7'], ['A', 'P8']
  ];
  for (const [a, k] of links) p.edge(`p1_${a}`, `p1_${k}`, STYLE.assoc);
  p.vertex('p1_note', 'User = actor trừu tượng, gồm Lecturer, Facility Manager, Technician, Admin (xem trang 2). Chi tiết từng gói xem trang 2–5.', STYLE.note, PX - 40, 40 + PY + 4 * (PH + PGAP) - 10, PW * 2 + 140, 30);
  return p;
}

const pages = [
  overviewPage(),
  detailPage('p2', '2. Authentication', 'Authentication (6 UC)', {
    left: [{ key: 'G', name: 'Guest', ucs: [['a1', 'Register account'], ['a2', 'Log in'], ['a3', 'Recover password']] }],
    right: [{ key: 'U', name: 'User', ucs: [['a4', 'Log out'], ['a5', 'Update profile'], ['a6', 'Change password']] }],
    middle: [['otp', 'Verify email OTP', 300]],
    deps: [['a1', 'otp', '«include»'], ['a3', 'otp', '«include»']],
    generalize: { parent: 'U', children: ['Lecturer', 'Facility Manager', 'Technician', 'Admin'] },
    note: 'Register account chỉ tạo được tài khoản Lecturer, bắt buộc xác thực email bằng OTP. Tài khoản Facility Manager / Technician / Admin do Admin tạo.'
  }),
  detailPage('p3', '3. Repair + Warehouse', 'Repair + Warehouse & Movement (16 UC)', {
    left: [
      { key: 'L', name: 'Lecturer', ucs: [['r1', 'Report malfunction'], ['r2', 'Track repair status'], ['r3', 'Evaluate repair quality']] },
      { key: 'FM', name: 'Facility Manager', ucs: [
        ['r4', 'Assign repair task'], ['w1', 'Select spare equipment'], ['r5', 'Approve parts request'],
        ['w2', 'Assign post-repair location'], ['r6', 'Close repair ticket'], ['w3', 'Order equipment transfer'],
        ['w4', 'Update spare parts stock']] }
    ],
    right: [{ key: 'T', name: 'Technician', ucs: [
      ['r7', 'Accept repair task'], ['r8', 'Update repair progress'], ['r9', 'Request spare parts'],
      ['r10', 'Report repair outcome'], ['w5', 'Replace with spare equipment'], ['w6', 'Confirm equipment movement']] }],
    deps: [['w1', 'r4', '«extend»'], ['w2', 'r10', '«extend»'], ['w5', 'w6', '«include»']],
    note: 'Select spare equipment: chỉ khi kho còn đồ cùng loại. Assign post-repair location: chỉ khi kết quả là repaired (ưu tiên phòng gốc → phòng đang thiếu → kho). Kết quả unrepairable → Propose disposal (trang 4).'
  }),
  detailPage('p4', '4. Equipment + Inventory + Disposal', 'Equipment Registry + Inventory + Disposal (12 UC)', {
    left: [
      { key: 'L', name: 'Lecturer', ucs: [['e7', 'View room equipment']] },
      { key: 'FM', name: 'Facility Manager', ucs: [
        ['e1', 'Register equipment'], ['e4', 'Print QR label'], ['e2', 'Update equipment info'],
        ['e3', 'Import equipment list'], ['e5', 'Check warranty status'], ['e6', 'Update warranty info'],
        ['i1', 'Create inventory session'], ['i2', 'Reconcile inventory result'], ['d1', 'Propose disposal']] }
    ],
    right: [
      { key: 'T', name: 'Technician', ucs: [['i3', 'Scan equipment QR']] },
      { key: 'A', name: 'Admin', ucs: [['d2', 'Approve disposal request']] }
    ],
    deps: [['e4', 'e1', '«extend»'], ['e6', 'e5', '«extend»']],
    note: 'Kiểm kê thấy thiết bị damaged → hệ thống tự tạo phiếu sửa (source = inventory_check). Admin từ chối thanh lý → thiết bị quay về trạng thái repairing.'
  }),
  detailPage('p5', '5. Administration + Reporting', 'Administration + Reporting & Audit (14 UC)', {
    left: [{ key: 'A', name: 'Admin', ucs: [
      ['m1', 'Create user account'], ['m2', 'Assign user role'], ['m3', 'Lock user account'],
      ['m4', 'Reset user password'], ['m5', 'Configure role permissions'], ['m6', 'Define equipment category'],
      ['m7', 'Register supplier'], ['m8', 'Register repair unit'], ['m9', 'Register room'],
      ['p2', 'Export statistical report'], ['p3', 'View audit log'], ['p4', 'Verify audit chain'], ['p5', 'Export audit log']] }],
    right: [{ key: 'FM', name: 'Facility Manager', ucs: [['p1', 'View operation dashboard']] }],
    extraAssoc: [['A', 'p1']],
    deps: [['p5', 'p3', '«extend»']],
    note: 'Register room gồm cả kho (room_type = warehouse) và định mức thiết bị của phòng (required_equipment).'
  })
];

const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<mxfile host="app.diagrams.net" agent="Ruo generator" version="24.7.0">\n${pages.map((p) => p.xml()).join('\n')}\n</mxfile>\n`;
writeFileSync(out, xml, 'utf8');

const ucCount = (xml.match(/ellipse;whiteSpace=wrap;html=1;fontSize=11;fillColor=#dae8fc/g) || []).length;
console.log(`pages=${pages.length} use_cases=${ucCount} bytes=${xml.length}`);
