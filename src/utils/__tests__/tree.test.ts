import { describe, it, expect } from 'vitest';
import type { FamilyTreeData, Person } from '../../types';
import {
  buildChildrenMap,
  buildPersonMap,
  getAncestors,
  findLCA,
  findShortestPath,
  pathToAncestor,
  getDescendants,
  getYear,
  calculateLifespan,
  generationLabel,
  getBranchNames,
  validateFamilyTreeData,
} from '../tree';

/** 构造测试人物 */
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

function makeData(persons: Person[]): FamilyTreeData {
  return {
    meta: { familyName: '张', originAncestor: '张一', lastUpdated: '2026-01-01' },
    persons,
    relations: persons
      .filter((x) => x.parentId)
      .map((x) => ({ parent: x.parentId!, child: x.id })),
  };
}

// 三代树: root -> [a, b], a -> [a1]
const tree = () => makeData([p('root', null), p('a', 'root'), p('b', 'root'), p('a1', 'a')]);

describe('buildChildrenMap / buildPersonMap', () => {
  it('正确构建父子映射与人物映射', () => {
    const cm = buildChildrenMap(tree().persons);
    expect(cm.get('root')).toEqual(['a', 'b']);
    expect(cm.get('a')).toEqual(['a1']);
    expect(cm.get('b')).toBeUndefined();

    const pm = buildPersonMap(tree().persons);
    expect(pm.get('a')?.name).toBe('人物a');
    expect(pm.size).toBe(4);
  });
});

describe('getAncestors / pathToAncestor', () => {
  it('从叶到根的祖先链', () => {
    const pm = buildPersonMap(tree().persons);
    expect(getAncestors('a1', pm)).toEqual(['a', 'root']);
    expect(getAncestors('root', pm)).toEqual([]);
  });

  it('pathToAncestor 包含两端且到目标即停', () => {
    const pm = buildPersonMap(tree().persons);
    expect(pathToAncestor('a1', 'root', pm)).toEqual(['a1', 'a', 'root']);
    expect(pathToAncestor('b', 'root', pm)).toEqual(['b', 'root']);
  });
});

describe('findLCA / findShortestPath', () => {
  it('兄弟节点的 LCA 是父节点', () => {
    const pm = buildPersonMap(tree().persons);
    expect(findLCA('a', 'b', pm)).toBe('root');
  });

  it('跨代节点的 LCA 正确', () => {
    const pm = buildPersonMap(tree().persons);
    expect(findLCA('a1', 'b', pm)).toBe('root');
    expect(findLCA('a1', 'a', pm)).toBe('a');
  });

  it('最短路径经过 LCA 且不重复', () => {
    const pm = buildPersonMap(tree().persons);
    expect(findShortestPath('a1', 'b', pm)).toEqual(['a1', 'a', 'root', 'b']);
    expect(findShortestPath('a', 'b', pm)).toEqual(['a', 'root', 'b']);
  });
});

describe('getDescendants', () => {
  it('递归收集所有后代', () => {
    const cm = buildChildrenMap(tree().persons);
    expect(getDescendants('root', cm).sort()).toEqual(['a', 'a1', 'b']);
    expect(getDescendants('a1', cm)).toEqual([]);
  });
});

describe('getYear / calculateLifespan / generationLabel / getBranchNames', () => {
  it('getYear 解析各种日期格式', () => {
    expect(getYear('1368')).toBe(1368);
    expect(getYear('1368-03')).toBe(1368);
    expect(getYear('1368-03-15')).toBe(1368);
    expect(getYear(null)).toBeNull();
    expect(getYear('abc')).toBeNull();
  });

  it('calculateLifespan 计算寿命', () => {
    expect(calculateLifespan(p('x', null, { birthDate: '1368', deathDate: '1435' }))).toBe(67);
    expect(calculateLifespan(p('x', null, { birthDate: '1368' }))).toBeNull();
  });

  it('generationLabel 中文世代', () => {
    expect(generationLabel(1)).toBe('始祖');
    expect(generationLabel(3)).toBe('三世');
    expect(generationLabel(11)).toBe('第11世');
  });

  it('getBranchNames 去重并过滤空值', () => {
    const persons = [
      p('x', null, { branch: '东门' }),
      p('y', null, { branch: '东门' }),
      p('z', null, { branch: null }),
      p('w', null, { branch: '西门' }),
    ];
    expect(getBranchNames(persons).sort()).toEqual(['东门', '西门']);
  });
});

describe('validateFamilyTreeData', () => {
  it('合法数据无错误', () => {
    expect(validateFamilyTreeData(tree())).toEqual([]);
  });

  it('检测不存在的父节点引用', () => {
    const errors = validateFamilyTreeData(makeData([p('a', 'ghost')]));
    expect(errors.some((e) => e.includes('ghost'))).toBe(true);
  });

  it('检测 parentId 自引用', () => {
    const errors = validateFamilyTreeData(makeData([p('a', 'a')]));
    expect(errors.some((e) => e.includes('自己的父节点'))).toBe(true);
  });

  it('检测父子环', () => {
    // a 的父是 b，b 的父是 a
    const errors = validateFamilyTreeData(makeData([p('a', 'b'), p('b', 'a')]));
    expect(errors.some((e) => e.includes('循环'))).toBe(true);
  });

  it('检测更深的环（隔代）', () => {
    // root -> a -> b，且 b.parentId 指向 root 造成环
    const errors = validateFamilyTreeData(makeData([
      p('root', 'b'),
      p('a', 'root'),
      p('b', 'a'),
    ]));
    expect(errors.some((e) => e.includes('循环'))).toBe(true);
  });

  it('检测去世年份早于出生年份', () => {
    const errors = validateFamilyTreeData(makeData([
      p('a', null, { birthDate: '1400', deathDate: '1390' }),
    ]));
    expect(errors.some((e) => e.includes('早于出生年份'))).toBe(true);
  });

  it('检测子代出生年份早于父代过多', () => {
    const errors = validateFamilyTreeData(makeData([
      p('father', null, { birthDate: '1400' }),
      p('child', 'father', { birthDate: '1405' }), // 仅晚5年
    ]));
    expect(errors.some((e) => e.includes('疑似数据错误'))).toBe(true);
  });

  it('检测父子年龄差过大', () => {
    const errors = validateFamilyTreeData(makeData([
      p('father', null, { birthDate: '1400' }),
      p('child', 'father', { birthDate: '1500' }), // 晚100年
    ]));
    expect(errors.some((e) => e.includes('超出合理生育年龄'))).toBe(true);
  });

  it('正常父子年龄差不报错', () => {
    const errors = validateFamilyTreeData(makeData([
      p('father', null, { birthDate: '1400' }),
      p('child', 'father', { birthDate: '1430' }),
    ]));
    expect(errors).toEqual([]);
  });
});
