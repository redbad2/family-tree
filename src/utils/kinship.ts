import type { Person, KinshipResult } from '../types';
import { buildPersonMap, findLCA, findShortestPath, pathToAncestor } from './tree';

/**
 * 中国亲属称谓计算引擎
 *
 * 核心逻辑：
 * 1. 找到 A、B 的最近公共祖先 LCA
 * 2. 计算 A 到 LCA 的代差 da，B 到 LCA 的代差 db
 * 3. 根据 gender + da + db 查表得称谓
 */

/** 判断是否同辈 */
function isSameGeneration(da: number, db: number): boolean {
  return da === db;
}

/** 同宗称谓：同辈男性（堂兄弟） */
function sameClanSameGen(ageDiff: number, toGender: 'male' | 'female'): string {
  if (toGender === 'female') {
    return ageDiff > 0 ? '堂姐' : ageDiff < 0 ? '堂妹' : '堂姐/堂妹';
  }
  return ageDiff > 0 ? '堂兄' : ageDiff < 0 ? '堂弟' : '兄弟';
}

/** 同宗称谓：不同辈 */
function sameClanDiffGen(da: number, db: number, toGender: 'male' | 'female'): string {
  const genDiff = da - db; // 正数说明 A 辈分低（B 是长辈），负数说明 A 辈分高

  if (genDiff === 1) {
    // B 是 A 的父辈
    return toGender === 'male' ? '伯父/叔父' : '姑母';
  }
  if (genDiff === -1) {
    // A 是 B 的父辈
    return toGender === 'male' ? '侄儿' : '侄女';
  }
  if (genDiff === 2) {
    // B 是 A 的祖辈
    return toGender === 'male' ? '祖父/伯祖/叔祖' : '姑祖母';
  }
  if (genDiff === -2) {
    return toGender === 'male' ? '侄孙' : '侄孙女';
  }
  if (genDiff === 3) {
    return toGender === 'male' ? '曾祖' : '曾姑祖母';
  }
  if (genDiff === -3) {
    return toGender === 'male' ? '曾侄孙' : '曾侄孙女';
  }

  // 超过三代，用数字描述
  if (genDiff > 0) {
    return toGender === 'male' ? `第${genDiff}世祖` : `第${genDiff}世姑祖`;
  }
  return toGender === 'male' ? `第${-genDiff}世侄孙` : `第${-genDiff}世侄孙女`;
}

/** 直系称谓 */
function directLineal(da: number, db: number, toGender: 'male' | 'female'): string {
  // da === 0 意味着 A 就是 LCA，B 是 A 的后代
  // db === 0 意味着 B 就是 LCA，A 是 B 的后代

  if (da === 0) {
    // B 是 A 的后代
    if (db === 1) return toGender === 'male' ? '儿子' : '女儿';
    if (db === 2) return toGender === 'male' ? '孙子' : '孙女';
    if (db === 3) return toGender === 'male' ? '曾孙' : '曾孙女';
    if (db === 4) return toGender === 'male' ? '玄孙' : '玄孙女';
    return toGender === 'male' ? `第${db}世孙` : `第${db}世孙女`;
  }

  // db === 0: A 是 B 的后代
  if (db === 0) {
    if (da === 1) return toGender === 'male' ? '父亲' : '母亲';
    if (da === 2) return toGender === 'male' ? '祖父' : '祖母';
    if (da === 3) return toGender === 'male' ? '曾祖父' : '曾祖母';
    if (da === 4) return toGender === 'male' ? '高祖父' : '高祖母';
    return toGender === 'male' ? `第${da}世祖` : `第${da}世祖母`;
  }

  return '';
}

/**
 * 计算两个节点之间的亲属称谓
 */
export function calculateKinship(
  personA: Person,
  personB: Person,
  data: { persons: Person[] },
): KinshipResult {
  const personMap = buildPersonMap(data.persons);
  const lcaId = findLCA(personA.id, personB.id, personMap);

  if (!lcaId) {
    return {
      titleAToB: '无关系',
      titleBToA: '无关系',
      path: [],
      lcaId: '',
    };
  }

  const lca = personMap.get(lcaId)!;
  const pathA = pathToAncestor(personA.id, lcaId, personMap);
  const pathB = pathToAncestor(personB.id, lcaId, personMap);
  const da = pathA.length - 1; // A 到 LCA 的代差
  const db = pathB.length - 1; // B 到 LCA 的代差

  let titleAToB: string;
  let titleBToA: string;

  // 情况1: 直系（一方就是 LCA）
  if (da === 0 || db === 0) {
    titleAToB = directLineal(da, db, personB.gender);
    titleBToA = directLineal(db, da, personA.gender);
  }
  // 情况2: 同宗同辈（堂兄弟等）
  else if (isSameGeneration(da, db)) {
    // 简化：按 id 排序模拟年龄差
    const ageDiff = personA.id.localeCompare(personB.id);
    titleAToB = sameClanSameGen(ageDiff, personB.gender);
    titleBToA = sameClanSameGen(-ageDiff, personA.gender);
  }
  // 情况3: 同宗不同辈
  else {
    titleAToB = sameClanDiffGen(da, db, personB.gender);
    titleBToA = sameClanDiffGen(db, da, personA.gender);
  }

  const path = findShortestPath(personA.id, personB.id, personMap);

  return {
    titleAToB,
    titleBToA,
    path,
    lcaId,
  };
}
