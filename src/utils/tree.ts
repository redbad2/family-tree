import type { Person, FamilyTreeData, KinshipResult } from '../types';

/**
 * 族谱树操作工具集
 */

/** 从 persons 数组构建 parentId -> children 映射 */
export function buildChildrenMap(persons: Person[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const p of persons) {
    if (p.parentId) {
      const children = map.get(p.parentId) ?? [];
      children.push(p.id);
      map.set(p.parentId, children);
    }
  }
  return map;
}

/** 从 persons 数组构建 id -> Person 映射 */
export function buildPersonMap(persons: Person[]): Map<string, Person> {
  const map = new Map<string, Person>();
  for (const p of persons) {
    map.set(p.id, p);
  }
  return map;
}

/** 获取某节点的所有祖先 ID（从父到根） */
export function getAncestors(personId: string, personMap: Map<string, Person>): string[] {
  const ancestors: string[] = [];
  let current = personMap.get(personId);
  while (current?.parentId) {
    ancestors.push(current.parentId);
    current = personMap.get(current.parentId);
  }
  return ancestors;
}

/** 找到两个节点的最近公共祖先 (LCA) */
export function findLCA(
  idA: string,
  idB: string,
  personMap: Map<string, Person>,
): string | null {
  const ancestorsA = [idA, ...getAncestors(idA, personMap)];
  const ancestorsB = new Set([idB, ...getAncestors(idB, personMap)]);

  for (const a of ancestorsA) {
    if (ancestorsB.has(a)) {
      return a;
    }
  }
  return null;
}

/** 获取从某节点到某个祖先的路径（包含两端） */
export function pathToAncestor(
  personId: string,
  ancestorId: string,
  personMap: Map<string, Person>,
): string[] {
  const path: string[] = [];
  let current: string | undefined = personId;
  while (current) {
    path.push(current);
    if (current === ancestorId) break;
    const person = personMap.get(current);
    current = person?.parentId ?? undefined;
  }
  return path;
}

/** 找到两个节点之间的最短路径 */
export function findShortestPath(
  idA: string,
  idB: string,
  personMap: Map<string, Person>,
): string[] {
  const lca = findLCA(idA, idB, personMap);
  if (!lca) return [];

  const pathA = pathToAncestor(idA, lca, personMap);
  const pathB = pathToAncestor(idB, lca, personMap);

  // pathA: A -> ... -> LCA, pathB: B -> ... -> LCA
  // 合并：A -> ... -> LCA -> ... -> B (LCA 只出现一次)
  return [...pathA, ...pathB.slice(1).reverse()];
}

/** 获取某节点的直系子节点 */
export function getChildren(personId: string, childrenMap: Map<string, string[]>): string[] {
  return childrenMap.get(personId) ?? [];
}

/** 获取父节点 ID */
export function getParent(personId: string, personMap: Map<string, Person>): string | null {
  return personMap.get(personId)?.parentId ?? null;
}

export function getYear(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const year = parseInt(dateStr.slice(0, 4), 10);
  return isNaN(year) ? null : year;
}

/** 计算寿命 */
export function calculateLifespan(person: Person): number | null {
  if (!person.birthDate || !person.deathDate) return null;
  const birthYear = getYear(person.birthDate);
  const deathYear = getYear(person.deathDate);
  if (birthYear == null || deathYear == null) return null;
  return deathYear - birthYear;
}

/** 世代中文表示 */
export function generationLabel(gen: number): string {
  const labels: Record<number, string> = {
    1: '始祖',
    2: '二世',
    3: '三世',
    4: '四世',
    5: '五世',
    6: '六世',
    7: '七世',
    8: '八世',
    9: '九世',
    10: '十世',
  };
  return labels[gen] ?? `第${gen}世`;
}

/** 校验族谱数据 */
export function validateFamilyTreeData(data: FamilyTreeData): string[] {
  const errors: string[] = [];
  const personIds = new Set(data.persons.map((p) => p.id));

  for (const p of data.persons) {
    if (p.parentId && !personIds.has(p.parentId)) {
      errors.push(`人物 "${p.name}"(id=${p.id}) 的父节点 ${p.parentId} 不存在`);
    }
  }

  for (const r of data.relations) {
    if (!personIds.has(r.parent)) {
      errors.push(`关系中的父节点 ${r.parent} 不存在`);
    }
    if (!personIds.has(r.child)) {
      errors.push(`关系中的子节点 ${r.child} 不存在`);
    }
  }

  return errors;
}

/** 获取某节点的所有后代 ID（递归，深度优先） */
export function getDescendants(personId: string, childrenMap: Map<string, string[]>): string[] {
  const result: string[] = [];
  const children = childrenMap.get(personId) ?? [];
  for (const childId of children) {
    result.push(childId);
    result.push(...getDescendants(childId, childrenMap));
  }
  return result;
}

/** 获取所有分支名（去重） */
export function getBranchNames(persons: Person[]): string[] {
  return Array.from(new Set(persons.map((p) => p.branch).filter((b): b is string => b !== null)));
}
