/** 中国历史朝代及重大事件（用于时间轴展示） */

export interface HistoricalEvent {
  year: number;
  title: string;
  dynasty: string;
  type: 'political' | 'war' | 'culture' | 'disaster' | 'other';
}

export const DYNASTY_RANGES: { name: string; start: number; end: number; color: string }[] = [
  { name: '元', start: 1271, end: 1368, color: '#5b8ff9' },
  { name: '明', start: 1368, end: 1644, color: '#5ad8a6' },
  { name: '清', start: 1644, end: 1912, color: '#f6bd16' },
  { name: '中华民国', start: 1912, end: 1949, color: '#e86452' },
  { name: '中华人民共和国', start: 1949, end: 2026, color: '#6dc8ec' },
];

export const HISTORICAL_EVENTS: HistoricalEvent[] = [
  { year: 1368, title: '明朝建立', dynasty: '明', type: 'political' },
  { year: 1398, title: '建文帝即位', dynasty: '明', type: 'political' },
  { year: 1402, title: '靖难之役', dynasty: '明', type: 'war' },
  { year: 1405, title: '郑和下西洋', dynasty: '明', type: 'culture' },
  { year: 1420, title: '迁都北京', dynasty: '明', type: 'political' },
  { year: 1449, title: '土木堡之变', dynasty: '明', type: 'war' },
  { year: 1457, title: '夺门之变', dynasty: '明', type: 'political' },
  { year: 1487, title: '弘治中兴', dynasty: '明', type: 'political' },
  { year: 1505, title: '正德帝即位', dynasty: '明', type: 'political' },
  { year: 1521, title: '嘉靖帝即位', dynasty: '明', type: 'political' },
  { year: 1550, title: '庚戌之变', dynasty: '明', type: 'war' },
  { year: 1566, title: '隆庆帝即位', dynasty: '明', type: 'political' },
  { year: 1572, title: '万历帝即位', dynasty: '明', type: 'political' },
  { year: 1616, title: '后金建立', dynasty: '明', type: 'war' },
  { year: 1628, title: '崇祯帝即位', dynasty: '明', type: 'political' },
  { year: 1644, title: '明朝灭亡，清军入关', dynasty: '清', type: 'political' },
  { year: 1661, title: '康熙帝即位', dynasty: '清', type: 'political' },
  { year: 1673, title: '三藩之乱', dynasty: '清', type: 'war' },
  { year: 1689, title: '中俄尼布楚条约', dynasty: '清', type: 'political' },
  { year: 1722, title: '雍正帝即位', dynasty: '清', type: 'political' },
  { year: 1735, title: '乾隆帝即位', dynasty: '清', type: 'political' },
  { year: 1796, title: '嘉庆帝即位', dynasty: '清', type: 'political' },
  { year: 1840, title: '鸦片战争', dynasty: '清', type: 'war' },
  { year: 1851, title: '太平天国运动', dynasty: '清', type: 'war' },
  { year: 1894, title: '甲午战争', dynasty: '清', type: 'war' },
  { year: 1900, title: '庚子国变', dynasty: '清', type: 'war' },
  { year: 1911, title: '辛亥革命', dynasty: '清', type: 'political' },
  { year: 1912, title: '中华民国成立', dynasty: '中华民国', type: 'political' },
  { year: 1937, title: '全面抗战爆发', dynasty: '中华民国', type: 'war' },
  { year: 1945, title: '抗日战争胜利', dynasty: '中华民国', type: 'war' },
  { year: 1949, title: '中华人民共和国成立', dynasty: '中华人民共和国', type: 'political' },
  { year: 1978, title: '改革开放', dynasty: '中华人民共和国', type: 'political' },
];

/** 获取某年份所在的朝代 */
export function getDynastyForYear(year: number): string {
  for (const d of DYNASTY_RANGES) {
    if (year >= d.start && year <= d.end) return d.name;
  }
  return '';
}

/** 获取某年份附近的历史事件 */
export function getEventsNearYear(year: number, range: number = 10): HistoricalEvent[] {
  return HISTORICAL_EVENTS.filter((e) => Math.abs(e.year - year) <= range);
}

/** 获取时间范围内的历史事件 */
export function getEventsInRange(startYear: number, endYear: number): HistoricalEvent[] {
  return HISTORICAL_EVENTS.filter((e) => e.year >= startYear && e.year <= endYear);
}
