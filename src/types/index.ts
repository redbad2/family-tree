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

/** 个人生平事件类型 */
export type PersonalEventType = 'birth' | 'marriage' | 'child' | 'migration' | 'achievement' | 'death' | 'other';

/** 个人生平事件 */
export interface PersonalEvent {
  year: number;
  title: string;
  type: PersonalEventType;
  note?: string;
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
  /** 出生日期是否为推断值 */
  birthDateInferred?: boolean;
  /** 个人生平事件（出生外的关键节点） */
  personalEvents?: PersonalEvent[];
  /** 照片 URL（占位字段，暂不实现上传存储） */
  photoUrl?: string;
}

/** 父子关系类型 */
export type ParentChildRelationType = 'biological' | 'adoptive' | 'dual-inheritance';

/** 父子关系边 */
export interface ParentChildRelation {
  parent: string;
  child: string;
  /** 关系类型：biological=亲生，adoptive=过继，dual-inheritance=兼祧。旧数据无此字段默认为 biological */
  type?: ParentChildRelationType;
  /** 备注（如"兼祧两房"） */
  note?: string;
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
export type NodeState = 'default' | 'selected' | 'parent' | 'child' | 'path' | 'alive' | 'ancestor' | 'leaf' | 'incomplete';

/** 节点选中模式 */
export type SelectionMode = 'single' | 'dual';

/** 右侧面板显示模式 */
export type SiderMode = 'view' | 'add-child' | 'add-root' | 'edit';

/** 树图视图模式：tree=标准树形图，pagoda=宝塔图，radial=扇形图 */
export type ViewMode = 'tree' | 'pagoda' | 'radial';
