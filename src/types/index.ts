/** 配偶信息 */
export interface Spouse {
  id: string;
  name: string;
  type: '正室' | '续弦' | '侧室' | '妾' | '其他';
  /** 出生日期，格式同 birthDate：YYYY / YYYY-MM / YYYY-MM-DD */
  birthDate: string | null;
  /** 去世日期，格式同 birthDate：YYYY / YYYY-MM / YYYY-MM-DD */
  deathDate: string | null;
}

/** 性别 */
export type Gender = 'male' | 'female';

/** 人物节点 */
export interface Person {
  id: string;
  /** 姓名 */
  name: string;
  /** 世代：始祖=1, 二世=2, ... */
  generation: number;
  /** 性别 */
  gender: Gender;
  /** 分支别名（如：东门、西门、南门、北门） */
  branch: string | null;
  /** 出生日期 */
  birthDate: string | null;
  /** 去世日期 */
  deathDate: string | null;
  /** 配偶列表 */
  spouses: Spouse[];
  /** 学历 */
  education: string | null;
  /** 事迹 */
  deeds: string | null;
  /** 父节点 ID，始祖为 null */
  parentId: string | null;
  /** 待勘误：该节点信息可能存在错误，需要核实 */
  needsVerification: boolean;
  /** 迁移地：从原聚集地迁往的地区 */
  migrationLocation: string | null;
}

/** 父子关系边 */
export interface ParentChildRelation {
  parent: string;
  child: string;
}

/** 族谱数据格式（导入导出用） */
export interface FamilyTreeData {
  meta: {
    familyName: string;
    originAncestor: string;
    lastUpdated: string;
  };
  persons: Person[];
  relations: ParentChildRelation[];
}

/** 亲属称谓计算结果 */
export interface KinshipResult {
  /** A 称呼 B */
  titleAToB: string;
  /** B 称呼 A */
  titleBToA: string;
  /** 最短路径上的节点 ID 列表 */
  path: string[];
  /** 最近公共祖先 ID */
  lcaId: string;
}

/** 节点高亮状态 */
export type NodeState = 'default' | 'selected' | 'parent' | 'child' | 'path';

/** 节点选中模式 */
export type SelectionMode = 'single' | 'dual';

/** 右侧面板显示模式 */
export type SiderMode = 'view' | 'add-child' | 'add-root' | 'edit';
