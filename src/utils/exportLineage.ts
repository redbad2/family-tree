/**
 * 族谱世系表导出工具
 *
 * 支持：
 * - 欧式（表格）：每页一世，列为姓名/字号/性别/生卒/配偶/学历/事迹/父名/子名
 * - 苏式（横行）：世代垂直缩进，每世一行，显示直系传承
 */
import type { FamilyTreeData, Person } from '../types';
import { buildChildrenMap, buildPersonMap, generationLabel, getYear } from './tree';

/** 欧式表格行 */
export interface OushiRow {
  name: string;
  gender: string;
  generation: number;
  generationLabel: string;
  birthYear: string;
  deathYear: string;
  spouses: string;
  education: string;
  deeds: string;
  fatherName: string;
  childrenNames: string;
  branch: string;
}

/** 苏式树节点 */
export interface SushiNode {
  person: Person;
  children: SushiNode[];
}

/**
 * 构建欧式表格数据：按世代分组，每组一张表
 */
export function buildOushiTables(
  data: FamilyTreeData,
  startGen?: number,
  endGen?: number,
): Map<number, OushiRow[]> {
  const personMap = buildPersonMap(data.persons);
  const childrenMap = buildChildrenMap(data.persons);

  const minGen = startGen ?? Math.min(...data.persons.map((p) => p.generation));
  const maxGen = endGen ?? Math.max(...data.persons.map((p) => p.generation));

  const tables = new Map<number, OushiRow[]>();

  for (let gen = minGen; gen <= maxGen; gen++) {
    const rows: OushiRow[] = [];
    for (const p of data.persons) {
      if (p.generation !== gen) continue;

      const father = p.parentId ? personMap.get(p.parentId) : undefined;
      const kids = childrenMap.get(p.id) ?? [];

      rows.push({
        name: p.name,
        gender: p.gender === 'male' ? '男' : '女',
        generation: p.generation,
        generationLabel: generationLabel(p.generation),
        birthYear: getYear(p.birthDate)?.toString() ?? '',
        deathYear: getYear(p.deathDate)?.toString() ?? '',
        spouses: p.spouses.map((s) => s.name + (s.type !== '正室' ? `(${s.type})` : '')).join('、') || '',
        education: p.education ?? '',
        deeds: p.deeds ?? '',
        fatherName: father?.name ?? '',
        childrenNames: kids.map((kid) => personMap.get(kid)?.name ?? kid).join('、') || '',
        branch: p.branch ?? '',
      });
    }
    if (rows.length > 0) {
      tables.set(gen, rows);
    }
  }

  return tables;
}

/**
 * 构建苏式树：从指定根节点（默认始祖）递归生成层级结构
 */
export function buildSushiTree(data: FamilyTreeData, rootId?: string): SushiNode[] {
  const childrenMap = buildChildrenMap(data.persons);
  const personMap = buildPersonMap(data.persons);

  const roots = rootId
    ? [personMap.get(rootId)].filter(Boolean) as Person[]
    : data.persons.filter((p) => p.parentId == null);

  function buildNode(person: Person): SushiNode {
    const kids = childrenMap.get(person.id) ?? [];
    return {
      person,
      children: kids
        .map((kid) => personMap.get(kid))
        .filter(Boolean)
        .map((p) => buildNode(p!)),
    };
  }

  return roots.map(buildNode);
}

/** 格式化苏式节点的文本行 */
export function formatSushiNodeText(
  node: SushiNode,
  indent: number = 0,
  includeSpouses: boolean = true,
  includeDates: boolean = true,
  includeDeeds: boolean = false,
): string[] {
  const lines: string[] = [];
  const p = node.person;
  const prefix = '　'.repeat(indent); // 全角空格缩进

  let line = `${prefix}${generationLabel(p.generation)} ${p.name}`;

  if (includeDates) {
    const by = getYear(p.birthDate);
    const dy = getYear(p.deathDate);
    if (by || dy) {
      line += `（${by ?? '?'}${dy ? '-' + dy : ''}）`;
    }
  }

  if (includeSpouses && p.spouses.length > 0) {
    line += ` 配${p.spouses.map((s) => s.name).join('、')}`;
  }

  if (includeDeeds && p.deeds) {
    line += ` ${p.deeds}`;
  }

  lines.push(line);

  for (const child of node.children) {
    lines.push(...formatSushiNodeText(child, indent + 1, includeSpouses, includeDates, includeDeeds));
  }

  return lines;
}
