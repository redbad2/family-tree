/**
 * GEDCOM 5.5.1 导入/导出工具
 *
 * GEDCOM（Genealogical Data Communication）是国际通用族谱数据交换格式。
 * 本模块实现：
 * - exportToGedcom：将 FamilyTreeData 导出为 GEDCOM 文本
 * - parseGedcom：将 GEDCOM 文本解析为 FamilyTreeData
 *
 * 数据模型映射：
 * - Person（血脉人物）→ GEDCOM INDI 记录
 * - Spouse（嵌入配偶）→ GEDCOM INDI 记录（通过 FAM 关联）
 * - 父子关系 → GEDCOM FAM 记录中的 CHIL 链接
 *
 * 限制：
 * - 配偶性别为推断值（与人物性别相反）
 * - 子女统一关联到第一个 FAM，无法区分不同配偶所生
 * - 导入时通过 FAMC/CHIL 关系推断血脉人物 vs 配偶
 */
import type { FamilyTreeData, Person, Spouse, Gender } from '../types';
import { buildChildrenMap } from './tree';

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const MONTH_MAP: Record<string, number> = {};
MONTHS.forEach((m, i) => (MONTH_MAP[m] = i + 1));

/** 将应用日期（YYYY / YYYY-MM / YYYY-MM-DD）转为 GEDCOM 日期 */
function toGedcomDate(dateStr: string): string {
  const parts = dateStr.split('-');
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) {
    const mon = parseInt(parts[1], 10);
    return `${MONTHS[mon - 1] ?? ''} ${parts[0]}`;
  }
  const day = parseInt(parts[2], 10);
  const mon = parseInt(parts[1], 10);
  return `${day} ${MONTHS[mon - 1] ?? ''} ${parts[0]}`;
}

/** 将 GEDCOM 日期转回应用日期格式 */
function fromGedcomDate(gedcomDate: string): string {
  const tokens = gedcomDate.trim().split(/\s+/);
  const PREFIXES = new Set(['ABT', 'EST', 'BEF', 'AFT', 'CAL', 'INT', 'AND', 'TO', 'BET', 'FROM']);
  const filtered = tokens.filter((t) => !PREFIXES.has(t.toUpperCase()));
  if (filtered.length === 0) return gedcomDate;
  if (filtered.length === 1) return filtered[0].replace(/[^0-9]/g, '') || gedcomDate;
  if (filtered.length === 2) {
    const mon = MONTH_MAP[filtered[0].toUpperCase()];
    const year = filtered[1].replace(/[^0-9]/g, '');
    if (mon && year) return `${year}-${String(mon).padStart(2, '0')}`;
  }
  if (filtered.length >= 3) {
    const day = parseInt(filtered[0], 10);
    const mon = MONTH_MAP[filtered[1].toUpperCase()];
    const year = filtered[2].replace(/[^0-9]/g, '');
    if (mon && year && day) return `${year}-${String(mon).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
  return gedcomDate;
}

/** 从配偶姓名中提取姓氏（如"李氏"→"李"，"王秀英"→"王"） */
function extractSurname(name: string): string {
  if (name.endsWith('氏')) return name.slice(0, name.length - 1);
  if (name.length <= 1) return name;
  return name[0];
}

/** 从 GEDCOM NAME 标签重建完整中文姓名 */
function reconstructName(name?: string, givn?: string, surn?: string): string {
  if (name) {
    const match = name.match(/^(.*?)\s*\/(.*?)\/\s*$/);
    if (match) {
      const given = match[1].trim();
      const surname = match[2].trim();
      return surname + given;
    }
    return name.replace(/\//g, '');
  }
  if (surn && givn) return surn + givn;
  return givn || surn || '未知';
}

// ========== 导出 ==========

export function exportToGedcom(data: FamilyTreeData): string {
  const familyName = data.meta.familyName;
  const lines: string[] = [];

  // 分配 ID
  const personToIndi = new Map<string, string>();
  const spouseToIndi = new Map<string, string>();
  let indiCounter = 1;
  for (const p of data.persons) {
    personToIndi.set(p.id, `I${indiCounter++}`);
    for (const s of p.spouses) {
      if (!spouseToIndi.has(s.id)) spouseToIndi.set(s.id, `I${indiCounter++}`);
    }
  }

  // 构建 FAM 映射
  const childrenMap = buildChildrenMap(data.persons);
  const personFams = new Map<string, string[]>();
  const spouseFams = new Map<string, string[]>();
  const personFamc = new Map<string, string>();
  const writtenSpouses = new Set<string>();

  interface FamRec {
    famId: string;
    personId: string;
    spouseId: string | null;
    childIds: string[];
  }
  const famRecords: FamRec[] = [];
  let famCounter = 1;

  for (const p of data.persons) {
    const childIds = childrenMap.get(p.id) ?? [];
    if (childIds.length === 0 && p.spouses.length === 0) continue;
    const famCount = Math.max(1, p.spouses.length);
    const personFamList: string[] = [];
    for (let i = 0; i < famCount; i++) {
      const famId = `F${famCounter++}`;
      const spouse = p.spouses[i];
      const spouseId = spouse ? spouse.id : null;
      const famChildIds = i === 0 ? childIds : [];
      famRecords.push({ famId, personId: p.id, spouseId, childIds: famChildIds });
      personFamList.push(famId);
      if (spouseId) {
        const sFams = spouseFams.get(spouseId) ?? [];
        sFams.push(famId);
        spouseFams.set(spouseId, sFams);
      }
      for (const childId of famChildIds) personFamc.set(childId, famId);
    }
    personFams.set(p.id, personFamList);
  }

  // HEAD
  lines.push('0 HEAD');
  lines.push('1 SOUR FamilyTree');
  lines.push('2 NAME 族谱管理系统');
  lines.push('2 VERS 1.0');
  lines.push('1 GEDC');
  lines.push('2 VERS 5.5.1');
  lines.push('2 FORM LINEAGE-LINKED');
  lines.push('1 CHAR UTF-8');

  // INDI: 血脉人物
  for (const p of data.persons) {
    const indiId = personToIndi.get(p.id)!;
    lines.push(`0 @${indiId}@ INDI`);
    const givenName = p.name.startsWith(familyName) ? p.name.slice(familyName.length) : p.name;
    lines.push(`1 NAME ${givenName} /${familyName}/`);
    if (givenName) lines.push(`2 GIVN ${givenName}`);
    lines.push(`2 SURN ${familyName}`);
    lines.push(`1 SEX ${p.gender === 'male' ? 'M' : 'F'}`);
    if (p.birthDate) { lines.push('1 BIRT'); lines.push(`2 DATE ${toGedcomDate(p.birthDate)}`); }
    if (p.deathDate) { lines.push('1 DEAT'); lines.push(`2 DATE ${toGedcomDate(p.deathDate)}`); }
    if (p.education) lines.push(`1 EDUC ${p.education}`);
    if (p.deeds) lines.push(`1 NOTE ${p.deeds}`);
    if (p.migrationLocation) lines.push(`1 RESI ${p.migrationLocation}`);
    const famcId = personFamc.get(p.id);
    if (famcId) lines.push(`1 FAMC @${famcId}@`);
    const fams = personFams.get(p.id);
    if (fams) for (const fid of fams) lines.push(`1 FAMS @${fid}@`);
  }

  // INDI: 配偶
  for (const p of data.persons) {
    for (const s of p.spouses) {
      if (writtenSpouses.has(s.id)) continue;
      writtenSpouses.add(s.id);
      const indiId = spouseToIndi.get(s.id)!;
      lines.push(`0 @${indiId}@ INDI`);
      const surn = extractSurname(s.name);
      const givn = s.name.slice(surn.length);
      lines.push(`1 NAME ${givn} /${surn}/`);
      if (givn) lines.push(`2 GIVN ${givn}`);
      lines.push(`2 SURN ${surn}`);
      lines.push(`1 SEX ${p.gender === 'male' ? 'F' : 'M'}`);
      if (s.birthDate) { lines.push('1 BIRT'); lines.push(`2 DATE ${toGedcomDate(s.birthDate)}`); }
      if (s.deathDate) { lines.push('1 DEAT'); lines.push(`2 DATE ${toGedcomDate(s.deathDate)}`); }
      if (s.type && s.type !== '正室') lines.push(`1 NOTE 配偶类型: ${s.type}`);
      const fams = spouseFams.get(s.id);
      if (fams) for (const fid of fams) lines.push(`1 FAMS @${fid}@`);
    }
  }

  // FAM
  for (const fam of famRecords) {
    lines.push(`0 @${fam.famId}@ FAM`);
    const person = data.persons.find((p) => p.id === fam.personId)!;
    const personIndiId = personToIndi.get(fam.personId)!;
    const spouseIndiId = fam.spouseId ? spouseToIndi.get(fam.spouseId) : null;
    if (person.gender === 'male') {
      lines.push(`1 HUSB @${personIndiId}@`);
      if (spouseIndiId) lines.push(`1 WIFE @${spouseIndiId}@`);
    } else {
      lines.push(`1 WIFE @${personIndiId}@`);
      if (spouseIndiId) lines.push(`1 HUSB @${spouseIndiId}@`);
    }
    for (const childId of fam.childIds) {
      const childIndiId = personToIndi.get(childId);
      if (childIndiId) lines.push(`1 CHIL @${childIndiId}@`);
    }
  }

  lines.push('0 TRLR');
  return lines.join('\n');
}

// ========== 导入（解析）==========

interface GedcomLine {
  level: number;
  tag: string;
  value: string;
  xref?: string;
  children: GedcomLine[];
}

/** 解析 GEDCOM 文本为行树结构 */
function parseGedcomLines(text: string): GedcomLine[] {
  const rawLines = text.split(/\r?\n/);
  const flat: GedcomLine[] = [];

  for (const line of rawLines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const match = trimmed.match(/^(\d+)\s+(@[^@]+@)?\s*(\S+)?\s*(.*)$/);
    if (!match) continue;
    const level = parseInt(match[1], 10);
    let xref: string | undefined = match[2]?.replace(/@/g, '');
    let tag = match[3] ?? '';
    let value = match[4] ?? '';
    if (xref && !tag) { value = `@${xref}@`; xref = undefined; tag = ''; }
    flat.push({ level, tag, value, xref, children: [] });
  }

  const root: GedcomLine[] = [];
  const stack: GedcomLine[] = [];
  for (const line of flat) {
    while (stack.length > 0 && stack[stack.length - 1].level >= line.level) stack.pop();
    if (stack.length === 0) root.push(line);
    else stack[stack.length - 1].children.push(line);
    stack.push(line);
  }
  return root;
}

function findChild(node: GedcomLine, tag: string): GedcomLine | undefined {
  return node.children.find((c) => c.tag === tag);
}

/**
 * 将 GEDCOM 文本解析为 FamilyTreeData
 */
export function parseGedcom(text: string): FamilyTreeData {
  const root = parseGedcomLines(text);

  interface IndiRec {
    id: string; name?: string; givn?: string; surn?: string; sex: Gender;
    birthDate?: string; deathDate?: string; education?: string; note?: string; resi?: string;
    fams: string[]; famc?: string;
  }
  interface FamRec { id: string; husb?: string; wife?: string; children: string[]; }

  const indis = new Map<string, IndiRec>();
  const fams = new Map<string, FamRec>();
  let familyName = '未知';
  let originAncestor = '未知';

  for (const node of root) {
    if (node.tag === 'INDI' && node.xref) {
      const indi: IndiRec = { id: node.xref, sex: 'male', fams: [] };
      for (const child of node.children) {
        switch (child.tag) {
          case 'NAME': {
            indi.name = child.value;
            // 标准 GEDCOM 中 GIVN/SURN 是 NAME 的下级记录（level 2），
            // 在本解析器的行树中挂在 NAME 节点之下，需从这里读取
            const givnChild = findChild(child, 'GIVN');
            const surnChild = findChild(child, 'SURN');
            if (givnChild?.value) indi.givn = givnChild.value;
            if (surnChild?.value) {
              indi.surn = surnChild.value;
              if (familyName === '未知') familyName = surnChild.value;
            } else if (familyName === '未知') {
              // 无显式 SURN 标签时，从 NAME 的 "/surname/" 部分提取家族姓氏
              const m = child.value.match(/\/(.*)\//);
              if (m?.[1]) familyName = m[1].trim();
            }
            break;
          }
          case 'GIVN': indi.givn = child.value; break;
          case 'SURN': {
            indi.surn = child.value;
            if (child.value && familyName === '未知') familyName = child.value;
            break;
          }
          case 'SEX': indi.sex = child.value === 'M' ? 'male' : 'female'; break;
          case 'BIRT': { const d = findChild(child, 'DATE'); if (d) indi.birthDate = fromGedcomDate(d.value); break; }
          case 'DEAT': { const d = findChild(child, 'DATE'); if (d) indi.deathDate = fromGedcomDate(d.value); break; }
          case 'EDUC': indi.education = child.value; break;
          case 'NOTE': indi.note = child.value; break;
          case 'RESI': indi.resi = child.value; break;
          case 'FAMS': { const r = child.value.replace(/@/g, ''); if (r) indi.fams.push(r); break; }
          case 'FAMC': indi.famc = child.value.replace(/@/g, ''); break;
        }
      }
      indis.set(indi.id, indi);
    } else if (node.tag === 'FAM' && node.xref) {
      const fam: FamRec = { id: node.xref, children: [] };
      for (const child of node.children) {
        if (child.tag === 'HUSB') fam.husb = child.value.replace(/@/g, '');
        else if (child.tag === 'WIFE') fam.wife = child.value.replace(/@/g, '');
        else if (child.tag === 'CHIL') fam.children.push(child.value.replace(/@/g, ''));
      }
      fams.set(fam.id, fam);
    }
  }

  // 推断血脉人物 vs 配偶
  // 族谱语义：与家族同姓的一方为血脉，异姓一方为嫁入的配偶。
  // 若双方都同姓或都异姓（无法区分），则回退为都视为血脉人物。
  const bloodIndiIds = new Set<string>();
  const isSameSurname = (indiId: string) => indis.get(indiId)?.surn === familyName;
  for (const fam of fams.values()) {
    const partners = [fam.husb, fam.wife].filter(Boolean) as string[];
    if (fam.children.length > 0) {
      const sameSurname = partners.filter(isSameSurname);
      for (const p of sameSurname.length > 0 ? sameSurname : partners) bloodIndiIds.add(p);
      for (const childId of fam.children) bloodIndiIds.add(childId);
    }
  }
  for (const indi of indis.values()) { if (indi.famc) bloodIndiIds.add(indi.id); }
  // 无任何家庭关联的独立 INDI（如未婚且无后代的叶子）也视为血脉人物，避免导入时被丢弃
  for (const indi of indis.values()) {
    if (indi.fams.length === 0 && !indi.famc) bloodIndiIds.add(indi.id);
  }
  // 无子女 FAM：仅保留与家族同姓的一方（叶子节点），异姓方视为配偶
  for (const fam of fams.values()) {
    if (fam.children.length > 0) continue;
    const partners = [fam.husb, fam.wife].filter(Boolean) as string[];
    const anySameSurname = partners.some(isSameSurname);
    for (const p of partners) {
      if (bloodIndiIds.has(p)) continue;
      let hasChild = false;
      for (const f of fams.values()) { if (f.children.includes(p)) { hasChild = true; break; } }
      if (hasChild) continue;
      if (!anySameSurname || isSameSurname(p)) bloodIndiIds.add(p);
    }
  }

  // 构建 Person 数组
  const persons: Person[] = [];
  const indiToPersonId = new Map<string, string>();
  let personCounter = 1;
  const spouseIdCounter = { v: 1 };
  function makePersonId(): string { return 'p' + personCounter++; }
  function makeSpouseId(): string { return 's' + spouseIdCounter.v++; }

  for (const indi of indis.values()) {
    if (!bloodIndiIds.has(indi.id)) continue;
    indiToPersonId.set(indi.id, makePersonId());
  }

  // 推断世代
  const childToParent = new Map<string, string>();
  for (const fam of fams.values()) {
    const partners = [fam.husb, fam.wife].filter(Boolean) as string[];
    for (const childId of fam.children) {
      if (bloodIndiIds.has(childId) && partners.length > 0) {
        for (const p of partners) {
          if (bloodIndiIds.has(p)) { childToParent.set(childId, p); break; }
        }
      }
    }
  }
  const generationMap = new Map<string, number>();
  const roots: string[] = [];
  for (const indiId of bloodIndiIds) { if (!childToParent.has(indiId)) roots.push(indiId); }
  for (const r of roots) generationMap.set(r, 1);
  const queue = [...roots];
  while (queue.length > 0) {
    const current = queue.shift()!;
    const gen = generationMap.get(current) ?? 1;
    for (const [childId, parentId] of childToParent) {
      if (parentId === current && !generationMap.has(childId)) {
        generationMap.set(childId, gen + 1);
        queue.push(childId);
      }
    }
  }

  // 构建 spouses 映射
  const personSpousesMap = new Map<string, Spouse[]>();
  const validSpouseTypes: Spouse['type'][] = ['正室', '续弦', '侧室', '妾', '其他'];
  for (const fam of fams.values()) {
    const partners = [fam.husb, fam.wife].filter(Boolean) as string[];
    for (const p of partners) {
      if (!bloodIndiIds.has(p)) continue;
      const other = partners.find((x) => x !== p);
      if (other && !bloodIndiIds.has(other)) {
        const otherIndi = indis.get(other);
        if (otherIndi) {
          const list = personSpousesMap.get(p) ?? [];
          const noteMatch = otherIndi.note?.match(/配偶类型:\s*(.+)/);
          const st = noteMatch?.[1] as Spouse['type'] | undefined;
          list.push({
            id: makeSpouseId(),
            name: reconstructName(otherIndi.name, otherIndi.givn, otherIndi.surn),
            type: st && validSpouseTypes.includes(st) ? st : '正室',
            birthDate: otherIndi.birthDate ?? null,
            deathDate: otherIndi.deathDate ?? null,
          });
          personSpousesMap.set(p, list);
        }
      }
    }
  }

  // 创建 Person 对象
  for (const indi of indis.values()) {
    if (!bloodIndiIds.has(indi.id)) continue;
    const pid = indiToPersonId.get(indi.id)!;
    const parentId = childToParent.has(indi.id) ? (indiToPersonId.get(childToParent.get(indi.id)!) ?? null) : null;
    const gen = generationMap.get(indi.id) ?? 1;
    const spouseTypeNote = indi.note?.match(/配偶类型:\s*(.+)/);
    const deeds = (spouseTypeNote ? indi.note?.replace(/配偶类型:\s*.+/, '').trim() : indi.note) ?? null;
    persons.push({
      id: pid,
      name: reconstructName(indi.name, indi.givn, indi.surn),
      generation: gen,
      gender: indi.sex,
      branch: null,
      birthDate: indi.birthDate ?? null,
      deathDate: indi.deathDate ?? null,
      spouses: personSpousesMap.get(indi.id) ?? [],
      education: indi.education ?? null,
      deeds: deeds || null,
      parentId,
      needsVerification: false,
      migrationLocation: indi.resi ?? null,
    });
  }

  const relations = persons
    .filter((p) => p.parentId !== null)
    .map((p) => ({ parent: p.parentId!, child: p.id }));

  const rootPerson = persons.find((p) => p.parentId === null);
  if (rootPerson) originAncestor = rootPerson.name;

  return {
    meta: { familyName, originAncestor, lastUpdated: new Date().toISOString().slice(0, 10) },
    persons,
    relations,
  };
}
