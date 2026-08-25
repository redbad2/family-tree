import { describe, it, expect } from 'vitest';
import type { FamilyTreeData } from '../../types';
import { exportToGedcom, parseGedcom } from '../gedcom';

const sample: FamilyTreeData = {
  meta: {
    familyName: '张',
    originAncestor: '张始祖',
    lastUpdated: '2026-01-01',
  },
  persons: [
    {
      id: 'p1',
      name: '张始祖',
      generation: 1,
      gender: 'male',
      branch: '东门',
      birthDate: '1368',
      deathDate: '1435',
      spouses: [
        { id: 's1', name: '李氏', type: '正室', birthDate: '1370', deathDate: null },
      ],
      education: '进士',
      deeds: '洪武年间迁居忻州',
      parentId: null,
      needsVerification: false,
      migrationLocation: '忻州',
    },
    {
      id: 'p2',
      name: '张二世',
      generation: 2,
      gender: 'male',
      branch: '东门',
      birthDate: '1395-03',
      deathDate: null,
      spouses: [],
      education: null,
      deeds: null,
      parentId: 'p1',
      needsVerification: false,
      migrationLocation: null,
    },
  ],
  relations: [{ parent: 'p1', child: 'p2' }],
};

describe('GEDCOM 往返转换', () => {
  it('导出包含 HEAD/TRLR 和 INDI/FAM 记录', () => {
    const ged = exportToGedcom(sample);
    expect(ged).toContain('0 HEAD');
    expect(ged).toContain('2 VERS 5.5.1');
    expect(ged).toContain('0 TRLR');
    expect(ged.match(/ INDI$/gm)!.length).toBe(3); // p1 + p2 + 配偶
    expect(ged).toContain('@F1@ FAM');
  });

  it('导出日期格式正确（年 / 年-月）', () => {
    const ged = exportToGedcom(sample);
    expect(ged).toContain('2 DATE 1368');
    expect(ged).toContain('2 DATE MAR 1395');
  });

  it('导出的文本可被解析回等价数据', () => {
    const parsed = parseGedcom(exportToGedcom(sample));
    // 血脉人物：p1、p2（配偶转为嵌入 spouse）
    expect(parsed.persons.length).toBe(2);
    expect(parsed.meta.familyName).toBe('张');
  });

  it('往返后保留姓名、性别、生卒年', () => {
    const parsed = parseGedcom(exportToGedcom(sample));
    const root = parsed.persons.find((x) => x.parentId === null)!;
    expect(root.name).toBe('张始祖');
    expect(root.gender).toBe('male');
    expect(root.birthDate).toBe('1368');
    expect(root.deathDate).toBe('1435');
    expect(root.education).toBe('进士');
    expect(root.migrationLocation).toBe('忻州');
  });

  it('往返后保留父子关系与世代', () => {
    const parsed = parseGedcom(exportToGedcom(sample));
    const root = parsed.persons.find((x) => x.name === '张始祖')!;
    const son = parsed.persons.find((x) => x.parentId === root.id);
    expect(son).toBeDefined();
    expect(son!.generation).toBe(2);
    expect(parsed.relations.length).toBe(1);
  });

  it('往返后配偶信息还原', () => {
    const parsed = parseGedcom(exportToGedcom(sample));
    const root = parsed.persons.find((x) => x.parentId === null)!;
    expect(root.spouses.length).toBe(1);
    expect(root.spouses[0].name).toBe('李氏');
    expect(root.spouses[0].birthDate).toBe('1370');
  });
});

describe('parseGedcom 直接解析外部 GEDCOM', () => {
  it('解析标准 GEDCOM 文本', () => {
    const ged = [
      '0 HEAD',
      '1 CHAR UTF-8',
      '0 @I1@ INDI',
      '1 NAME 始祖 /王/',
      '1 SEX M',
      '1 BIRT',
      '2 DATE 1900',
      '0 @I2@ INDI',
      '1 NAME 长子 /王/',
      '1 SEX M',
      '1 FAMC @F1@',
      '0 @F1@ FAM',
      '1 HUSB @I1@',
      '1 CHIL @I2@',
      '0 TRLR',
    ].join('\n');
    const parsed = parseGedcom(ged);
    expect(parsed.meta.familyName).toBe('王');
    expect(parsed.persons.length).toBe(2);
    const father = parsed.persons.find((x) => x.name === '王始祖')!;
    const son = parsed.persons.find((x) => x.name === '王长子')!;
    expect(father.gender).toBe('male');
    expect(father.birthDate).toBe('1900');
    expect(son.parentId).toBe(father.id);
    expect(son.generation).toBe(2);
  });

  it('解析含前缀修饰词的日期（ABT/EST）', () => {
    const ged = [
      '0 HEAD',
      '1 CHAR UTF-8',
      '0 @I1@ INDI',
      '1 NAME 某甲 /李/',
      '1 BIRT',
      '2 DATE ABT 1850',
      '0 TRLR',
    ].join('\n');
    const parsed = parseGedcom(ged);
    expect(parsed.persons[0].birthDate).toBe('1850');
  });
});
