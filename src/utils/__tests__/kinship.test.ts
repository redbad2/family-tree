import { describe, it, expect } from 'vitest';
import type { Person } from '../../types';
import { calculateKinship } from '../kinship';

function p(
  id: string,
  parentId: string | null,
  gender: 'male' | 'female' = 'male',
  overrides: Partial<Person> = {},
): Person {
  return {
    id,
    name: id,
    generation: 1,
    gender,
    branch: null,
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

/**
 * 测试树（四代）:
 *        g1(始祖)
 *       /       \
 *     g2a       g2b
 *     /  \        \
 *   g3a  g3b      g3c
 *    |
 *   g4a
 */
const persons = [
  p('g1', null),
  p('g2a', 'g1'),
  p('g2b', 'g1'),
  p('g3a', 'g2a'),
  p('g3b', 'g2a'),
  p('g3c', 'g2b'),
  p('g4a', 'g3a'),
];
const data = { persons };

describe('calculateKinship - 直系', () => {
  it('父 → 子', () => {
    const r = calculateKinship(persons[1], persons[3], data); // g2a -> g3a
    expect(r.titleAToB).toBe('儿子');
    expect(r.titleBToA).toBe('父亲');
    expect(r.lcaId).toBe('g2a');
  });

  it('母 → 女', () => {
    const mother = p('m', null, 'female');
    const daughter = p('d', 'm', 'female');
    const r = calculateKinship(mother, daughter, { persons: [mother, daughter] });
    expect(r.titleAToB).toBe('女儿');
    expect(r.titleBToA).toBe('母亲');
  });

  it('祖父 → 孙子', () => {
    const r = calculateKinship(persons[0], persons[3], data); // g1 -> g3a
    expect(r.titleAToB).toBe('孙子');
    expect(r.titleBToA).toBe('祖父');
  });

  it('曾祖 → 曾孙', () => {
    const r = calculateKinship(persons[0], persons[6], data); // g1 -> g4a
    expect(r.titleAToB).toBe('曾孙');
    expect(r.titleBToA).toBe('曾祖父');
  });
});

describe('calculateKinship - 同辈旁系', () => {
  it('堂兄弟互称', () => {
    const r = calculateKinship(persons[3], persons[4], data); // g3a vs g3b
    // 同辈男性：按 id 比较，g3a < g3b，所以 A 是"兄"一侧
    expect(r.titleAToB).toBe('堂弟');
    expect(r.titleBToA).toBe('堂兄');
  });

  it('堂姐/妹', () => {
    const c1 = p('x1', 'pa', 'female');
    const c2 = p('x2', 'pb', 'female');
    const father = p('pa', 'g');
    const uncle = p('pb', 'g');
    const grand = p('g', null);
    const r = calculateKinship(c1, c2, { persons: [grand, father, uncle, c1, c2] });
    expect(r.titleAToB).toBe('堂妹');
    expect(r.titleBToA).toBe('堂姐');
  });
});

describe('calculateKinship - 不同辈旁系', () => {
  it('叔侄互称', () => {
    const r = calculateKinship(persons[4], persons[6], data); // g3b(叔辈) vs g4a(侄辈)
    expect(r.titleAToB).toBe('侄儿');
    expect(r.titleBToA).toBe('伯父/叔父');
  });

  it('伯父 ↔ 侄儿', () => {
    const r = calculateKinship(persons[2], persons[3], data); // g2b(伯辈) vs g3a(侄辈)
    expect(r.titleAToB).toBe('侄儿');
    expect(r.titleBToA).toBe('伯父/叔父');
  });

  it('姑祖母 ↔ 侄孙', () => {
    // 始祖之女（g1 的女儿）是 g3c 一辈的姑祖母
    const femaleElder = p('e', 'g1', 'female');
    const youngMale = p('y', 'g3c');
    const r = calculateKinship(youngMale, femaleElder, {
      persons: [...persons, femaleElder, youngMale],
    });
    expect(r.titleAToB).toBe('姑祖母');
    expect(r.titleBToA).toBe('侄孙');
  });
});

describe('calculateKinship - 无关系 / 路径', () => {
  it('无公共祖先时返回无关系', () => {
    const x = p('x1', null);
    const y = p('x2', null);
    const r = calculateKinship(x, y, { persons: [x, y] });
    expect(r.titleAToB).toBe('无关系');
    expect(r.path).toEqual([]);
  });

  it('path 是两节点间最短路径且包含两端', () => {
    const r = calculateKinship(persons[3], persons[5], data);
    expect(r.path[0]).toBe('g3a');
    expect(r.path[r.path.length - 1]).toBe('g3c');
    expect(r.path).toContain('g1'); // 经过 LCA
  });
});
