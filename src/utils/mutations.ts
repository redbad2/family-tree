import { nanoid } from 'nanoid';
import type { Person, FamilyTreeData, Spouse, Gender } from '../types';
import { buildChildrenMap } from './tree';

/** 生成唯一人物 ID */
export function generatePersonId(): string {
  return 'p' + nanoid(8);
}

/** 生成唯一配偶 ID */
export function generateSpouseId(): string {
  return 's' + nanoid(8);
}

/** 添加子女节点 */
export function addChildPerson(
  data: FamilyTreeData,
  parentId: string,
  fields: {
    name: string;
    gender: Gender;
    branch?: string | null;
    birthDate?: string | null;
    deathDate?: string | null;
    spouses?: Spouse[];
    education?: string | null;
    deeds?: string | null;
    migrationLocation?: string | null;
  },
): FamilyTreeData {
  const parent = data.persons.find((p) => p.id === parentId);
  if (!parent) throw new Error('父节点不存在: ' + parentId);

  const id = generatePersonId();
  const newPerson: Person = {
    id,
    name: fields.name,
    generation: parent.generation + 1,
    gender: fields.gender,
    branch: fields.branch !== undefined ? fields.branch : parent.branch,
    birthDate: fields.birthDate ?? null,
    deathDate: fields.deathDate ?? null,
    spouses: fields.spouses ?? [],
    education: fields.education ?? null,
    deeds: fields.deeds ?? null,
    parentId,
    needsVerification: false,
    migrationLocation: fields.migrationLocation ?? null,
  };

  return {
    meta: { ...data.meta, lastUpdated: new Date().toISOString().slice(0, 10) },
    persons: [...data.persons, newPerson],
    relations: [...data.relations, { parent: parentId, child: id }],
  };
}

/** 添加始祖节点（无父节点） */
export function addRootPerson(
  data: FamilyTreeData,
  fields: {
    name: string;
    gender: Gender;
    generation?: number;
    branch?: string | null;
    birthDate?: string | null;
    deathDate?: string | null;
    spouses?: Spouse[];
    education?: string | null;
    deeds?: string | null;
    migrationLocation?: string | null;
  },
): FamilyTreeData {
  const id = generatePersonId();
  const newPerson: Person = {
    id,
    name: fields.name,
    generation: fields.generation ?? 1,
    gender: fields.gender,
    branch: fields.branch ?? null,
    birthDate: fields.birthDate ?? null,
    deathDate: fields.deathDate ?? null,
    spouses: fields.spouses ?? [],
    education: fields.education ?? null,
    deeds: fields.deeds ?? null,
    parentId: null,
    needsVerification: false,
    migrationLocation: fields.migrationLocation ?? null,
  };

  return {
    meta: { ...data.meta, lastUpdated: new Date().toISOString().slice(0, 10) },
    persons: [...data.persons, newPerson],
    relations: data.relations, // 无父节点，不新增 relation
  };
}

/** 更新人物信息 */
export function updatePerson(
  data: FamilyTreeData,
  personId: string,
  updates: Partial<Omit<Person, 'id'>>,
): FamilyTreeData {
  const oldPerson = data.persons.find((p) => p.id === personId);
  if (!oldPerson) throw new Error('人物不存在: ' + personId);

  const updatedPerson: Person = { ...oldPerson, ...updates };

  let newRelations = data.relations;

  // 如果 parentId 变更，同步更新 relations
  if (updates.parentId !== undefined && updates.parentId !== oldPerson.parentId) {
    // 移除旧关系
    newRelations = newRelations.filter(
      (r) => !(r.child === personId && r.parent === oldPerson.parentId),
    );
    // 添加新关系（如果新 parentId 不为 null）
    if (updates.parentId !== null) {
      newRelations = [...newRelations, { parent: updates.parentId, child: personId }];
    }
  }

  return {
    meta: { ...data.meta, lastUpdated: new Date().toISOString().slice(0, 10) },
    persons: data.persons.map((p) => (p.id === personId ? updatedPerson : p)),
    relations: newRelations,
  };
}

/** 删除人物（有子女时拒绝） */
export function deletePerson(
  data: FamilyTreeData,
  personId: string,
): { data: FamilyTreeData; success: boolean; message: string } {
  const person = data.persons.find((p) => p.id === personId);
  if (!person) {
    return { data, success: false, message: '人物不存在' };
  }

  const childrenMap = buildChildrenMap(data.persons);
  const children = childrenMap.get(personId) ?? [];
  if (children.length > 0) {
    return {
      data,
      success: false,
      message: '该人物有子女，无法删除。请先删除或转移其子女。',
    };
  }

  return {
    data: {
      meta: { ...data.meta, lastUpdated: new Date().toISOString().slice(0, 10) },
      persons: data.persons.filter((p) => p.id !== personId),
      relations: data.relations.filter((r) => r.child !== personId),
    },
    success: true,
    message: '删除成功',
  };
}

/** 从 persons[].parentId 重建 relations[]（安全兜底） */
export function rebuildRelations(data: FamilyTreeData): FamilyTreeData {
  const relations = data.persons
    .filter((p) => p.parentId !== null)
    .map((p) => ({ parent: p.parentId!, child: p.id }));
  return { ...data, relations };
}

/** 在兄弟节点中上移/下移一个节点（含其整个子树） */
export function movePersonAmongSiblings(
  data: FamilyTreeData,
  personId: string,
  direction: 'up' | 'down',
): FamilyTreeData {
  const person = data.persons.find((p) => p.id === personId);
  if (!person || !person.parentId) return data; // 根节点无法移动

  const siblings = data.persons.filter((p) => p.parentId === person.parentId);
  const idx = siblings.findIndex((s) => s.id === personId);
  if (idx === -1) return data;

  const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (targetIdx < 0 || targetIdx >= siblings.length) return data; // 已在边界

  // 获取这两个节点各自的子树所有 ID
  const childrenMap = buildChildrenMap(data.persons);
  function getSubtreeIds(id: string): string[] {
    const result = [id];
    const children = childrenMap.get(id) ?? [];
    for (const cid of children) {
      result.push(...getSubtreeIds(cid));
    }
    return result;
  }

  const subtreeA = new Set(getSubtreeIds(personId));
  const subtreeB = new Set(getSubtreeIds(siblings[targetIdx].id));

  // 在 persons 数组中，交换这两个子树的位置
  // 策略：收集两个子树的元素，在原位置上先放 B 子树，再放 A 子树（或反之）
  // 简化实现：重新排序 persons 数组中属于同一父节点的子树块
  const personIndices = new Map(data.persons.map((p, i) => [p.id, i]));

  // 收集所有非该父节点子女的 persons，以及该父节点的子女子树块
  const otherPersons = data.persons.filter((p) => p.parentId !== person.parentId);
  const siblingSubtrees: { anchorIdx: number; persons: Person[] }[] = siblings.map((s) => ({
    anchorIdx: personIndices.get(s.id)!,
    persons: getSubtreeIds(s.id).map((id) => data.persons[personIndices.get(id)!]),
  }));

  // 交换位置
  [siblingSubtrees[idx], siblingSubtrees[targetIdx]] = [siblingSubtrees[targetIdx], siblingSubtrees[idx]];

  // 重建 persons 数组：先放 otherPersons（保持原顺序），再在父节点位置插入排好序的子树
  // 更简单的做法：直接按子树顺序拼接
  const reorderedSubtreePersons = siblingSubtrees.flatMap((st) => st.persons);
  const reorderedOther = otherPersons;

  // 合并：otherPersons 中的顺序保持不变，子树部分按新顺序
  // 我们需要保持非子树节点在原位，子树节点按新顺序排列
  // 最简单的实现：重建整个数组
  const newPersons: Person[] = [];
  const subtreePersonSet = new Set<string>();
  for (const st of siblingSubtrees) {
    for (const p of st.persons) subtreePersonSet.add(p.id);
  }

  let subtreeInserted = false;
  for (const p of data.persons) {
    if (subtreePersonSet.has(p.id)) {
      if (!subtreeInserted) {
        newPersons.push(...reorderedSubtreePersons);
        subtreeInserted = true;
      }
      // 跳过原始子树节点，它们已经被批量插入
    } else {
      newPersons.push(p);
    }
  }

  return {
    meta: { ...data.meta, lastUpdated: new Date().toISOString().slice(0, 10) },
    persons: newPersons,
    relations: data.relations, // 关系不变，只是 persons 数组中的顺序变了
  };
}
