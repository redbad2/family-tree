import type { FamilyTreeData } from '../types';

/**
 * 从族谱书籍照片提取的数据
 * 
 * 注意：OCR 从照片中识别古文/族谱格式容易出错，
 * 此数据需要人工校对
 */
export const extractedFamilyTree: FamilyTreeData = {
  meta: {
    familyName: '待确认',
    originAncestor: '待确认',
    lastUpdated: new Date().toISOString().slice(0, 10),
  },
  persons: [
    // ===== 由于图片分辨率和族谱排版的限制，以下为示意性提取 =====
    // 实际使用时请根据原书校对修改
    {
      id: 'p1',
      name: '待确认-始祖',
      generation: 1,
      gender: 'male',
      branch: null,
      birthDate: null,
      deathDate: null,
      spouses: [],
      education: null,
      deeds: null,
      parentId: null,
      needsVerification: false,
      migrationLocation: null,
    },
  ],
  relations: [],
};

/**
 * 提取族谱数据的工作流建议：
 * 
 * 1. 分批拍照：每次 5-10 页，避免一次性发太多导致上下文丢失
 * 2. 每批提取后校对：尤其注意人名、生卒年份、父子关系
 * 3. 合并数据：所有批次提取完成后，合并为一个完整的 JSON 文件
 * 4. 导入系统后在界面上逐人核对
 */
