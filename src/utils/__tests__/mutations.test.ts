import { describe, it, expect } from 'vitest';
import type { FamilyTreeData, Person } from '../../types';
import {
  addChildPerson,
  addRootPerson,
  updatePerson,
  deletePerson,
  movePersonAmongSiblings,
  generateSpouseId,
} from '../mutations';

function p(
  id: string,
  parentId: string | null,
  overrides: Partial<Person> = {},
): Person {
  return {
    id,
    name: '人物' + id,
    generation: 1,
    gender: 'male',
    branch: '东门',
    birthDate: null,
    deathDate: null,
    spouses: [],
    education: null,
    deeds: null,
    parentId,
    needsVerification: false,
    migrationLocation: null,
    ...overrides,
  };
}

function makeData(persons: Person[]): FamilyTreeData {
  return {
    meta: { familyName: '张', originAncestor: '张root', lastUpdated: '2026-01-01' },
    persons,
    relations: persons
      .filter((x) => x.parentId)
      .map((x) => ({ parent: x.parentId!, child: x.id })),
  };
}

const base = () => makeData([p('root', null), p('a', 'root'), p('b', 'root')]);

describe('addChildPerson', () => {
  it('世代 +1、默认继承父分支、同步新增 relation', () => {
    const data = base();
    const next = addChildPerson(data, 'a', { name: '张小三', gender: 'male' });
    const child = next.persons[next.persons.length - 1];
    expect(child.generation).toBe(2); // a 是第1世（测试数据默认 generation=1）
    expect(child.branch).toBe('东门');
    expect(child.parentId).toBe('a');
    expect(next.relations).toContainEqual({ parent: 'a', child: child.id });
  });

  it('显式指定 branch 时覆盖继承值', () => {
    const data = base();
    const next = addChildPerson(data, 'a', { name: 'x', gender: 'male', branch: '西门' });
    expect(next.persons[next.persons.length - 1].branch).toBe('西门');
  });

  it('父节点不存在时抛错', () => {
    expect(() => addChildPerson(base(), 'ghost', { name: 'x', gender: 'male' })).toThrow();
  });
});

describe('addRootPerson', () => {
  it('无父节点、不新增 relation', () => {
    const before = base().relations.length;
    const next = addRootPerson(base(), { name: '新始祖', gender: 'female' });
    const root = next.persons[next.persons.length - 1];
    expect(root.parentId).toBeNull();
    expect(root.generation).toBe(1);
    expect(next.relations.length).toBe(before);
  });
});

describe('updatePerson', () => {
  it('更新字段且不影响他人', () => {
    const next = updatePerson(base(), 'a', { name: '改名', deeds: '中举' });
    const a = next.persons.find((x) => x.id === 'a')!;
    expect(a.name).toBe('改名');
    expect(a.deeds).toBe('中举');
    expect(next.persons.find((x) => x.id === 'b')?.name).toBe('人物b');
  });

  it('parentId 变更时同步 relations', () => {
    const data = base();
    // 把 b 挂到 a 下
    const next = updatePerson(data, 'b', { parentId: 'a', generation: 2 });
    expect(next.relations.some((r) => r.parent === 'a' && r.child === 'b')).toBe(true);
    expect(next.relations.some((r) => r.parent === 'root' && r.child === 'b')).toBe(false);
  });

  it('parentId 改为 null 时移除 relation（变为始祖）', () => {
    const next = updatePerson(base(), 'b', { parentId: null });
    expect(next.relations.some((r) => r.child === 'b')).toBe(false);
  });

  it('拒绝把父节点设为自己', () => {
    expect(() => updatePerson(base(), 'a', { parentId: 'a' })).toThrow(/自己/);
  });

  it('拒绝把父节点设为自己的后代（防环）', () => {
    const data = makeData([
      p('g1', null),
      p('g2', 'g1'),
      p('g3', 'g2'),
    ]);
    expect(() => updatePerson(data, 'g1', { parentId: 'g3' })).toThrow(/后代|循环/);
  });

  it('人物不存在时抛错', () => {
    expect(() => updatePerson(base(), 'ghost', { name: 'x' })).toThrow();
  });
});

describe('deletePerson', () => {
  it('有子女时拒绝删除', () => {
    const data = base();
    const result = deletePerson(data, 'root');
    expect(result.success).toBe(false);
    expect(result.message).toContain('无法删除');
  });

  it('叶子节点可删除且清理 relation', () => {
    const data = base();
    const result = deletePerson(data, 'b');
    expect(result.success).toBe(true);
    expect(result.data.persons.some((x) => x.id === 'b')).toBe(false);
    expect(result.data.relations.some((r) => r.child === 'b')).toBe(false);
    expect(result.data.persons.length).toBe(2);
  });

  it('删除不存在的人物返回失败', () => {
    expect(deletePerson(base(), 'ghost').success).toBe(false);
  });
});

describe('movePersonAmongSiblings', () => {
  it('下移交换兄弟顺序（含子树整体移动）', () => {
    const data = makeData([
      p('root', null),
      p('a', 'root'),
      p('a-child', 'a'),   // a 的子树成员
      p('b', 'root'),
    ]);
    const next = movePersonAmongSiblings(data, 'a', 'down');
    const order = next.persons.filter((x) => x.parentId === 'root').map((x) => x.id);
    expect(order).toEqual(['b', 'a']);
    // 子树成员仍存在且关系不变
    expect(next.persons.some((x) => x.id === 'a-child' && x.parentId === 'a')).toBe(true);
  });

  it('已在边界时数据不变', () => {
    const data = base();
    expect(movePersonAmongSiblings(data, 'a', 'up')).toBe(data);
    expect(movePersonAmongSiblings(data, 'b', 'down')).toBe(data);
  });

  it('根节点无法移动', () => {
    const data = base();
    expect(movePersonAmongSiblings(data, 'root', 'up')).toBe(data);
  });
});

describe('generateSpouseId', () => {
  it('生成的 ID 以 s 开头且唯一', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateSpouseId()));
    expect(ids.size).toBe(100);
    for (const id of ids) expect(id.startsWith('s')).toBe(true);
  });
});
