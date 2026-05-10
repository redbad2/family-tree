/** 中国历史朝代及重大事件（用于时间轴展示） */

export interface HistoricalEvent {
  year: number;
  title: string;
  dynasty: string;
  type: 'political' | 'war' | 'culture' | 'disaster' | 'other';
}

export interface EraRange {
  name: string;
  start: number;
  end: number;
  dynasty: string;
}

export const DYNASTY_RANGES: { name: string; start: number; end: number; color: string }[] = [
  { name: '元', start: 1271, end: 1368, color: '#5b8ff9' },
  { name: '明', start: 1368, end: 1644, color: '#5ad8a6' },
  { name: '清', start: 1644, end: 1912, color: '#f6bd16' },
  { name: '中华民国', start: 1912, end: 1949, color: '#e86452' },
  { name: '中华人民共和国', start: 1949, end: 2026, color: '#6dc8ec' },
];

export const ERA_RANGES: EraRange[] = [
  { name: '洪武', start: 1368, end: 1398, dynasty: '明' },
  { name: '建文', start: 1399, end: 1402, dynasty: '明' },
  { name: '永乐', start: 1403, end: 1424, dynasty: '明' },
  { name: '洪熙', start: 1425, end: 1425, dynasty: '明' },
  { name: '宣德', start: 1426, end: 1435, dynasty: '明' },
  { name: '正统', start: 1436, end: 1449, dynasty: '明' },
  { name: '景泰', start: 1450, end: 1456, dynasty: '明' },
  { name: '天顺', start: 1457, end: 1464, dynasty: '明' },
  { name: '成化', start: 1465, end: 1487, dynasty: '明' },
  { name: '弘治', start: 1488, end: 1505, dynasty: '明' },
  { name: '正德', start: 1506, end: 1521, dynasty: '明' },
  { name: '嘉靖', start: 1522, end: 1566, dynasty: '明' },
  { name: '隆庆', start: 1567, end: 1572, dynasty: '明' },
  { name: '万历', start: 1573, end: 1620, dynasty: '明' },
  { name: '泰昌', start: 1620, end: 1620, dynasty: '明' },
  { name: '天启', start: 1621, end: 1627, dynasty: '明' },
  { name: '崇祯', start: 1628, end: 1644, dynasty: '明' },
  { name: '顺治', start: 1644, end: 1661, dynasty: '清' },
  { name: '康熙', start: 1662, end: 1722, dynasty: '清' },
  { name: '雍正', start: 1723, end: 1735, dynasty: '清' },
  { name: '乾隆', start: 1736, end: 1795, dynasty: '清' },
  { name: '嘉庆', start: 1796, end: 1820, dynasty: '清' },
  { name: '道光', start: 1821, end: 1850, dynasty: '清' },
  { name: '咸丰', start: 1851, end: 1861, dynasty: '清' },
  { name: '同治', start: 1862, end: 1874, dynasty: '清' },
  { name: '光绪', start: 1875, end: 1908, dynasty: '清' },
  { name: '宣统', start: 1909, end: 1912, dynasty: '清' },
];

export const HISTORICAL_EVENTS: HistoricalEvent[] = [
  { year: 1368, title: '明朝建立，朱元璋称帝，定都南京', dynasty: '明', type: 'political' },
  { year: 1369, title: '徐达攻占大都，元朝灭亡', dynasty: '明', type: 'war' },
  { year: 1370, title: '设锦衣卫，加强皇权', dynasty: '明', type: 'political' },
  { year: 1371, title: '平定四川明玉珍政权', dynasty: '明', type: 'war' },
  { year: 1372, title: '李文忠北伐失利', dynasty: '明', type: 'war' },
  { year: 1373, title: '恢复科举制度', dynasty: '明', type: 'culture' },
  { year: 1376, title: '空印案，严惩地方官员', dynasty: '明', type: 'political' },
  { year: 1380, title: '胡惟庸案，废丞相制', dynasty: '明', type: 'political' },
  { year: 1381, title: '平定云南，沐英留守', dynasty: '明', type: 'war' },
  { year: 1382, title: '设都察院，改锦衣卫', dynasty: '明', type: 'political' },
  { year: 1387, title: '蓝玉北伐，大破北元', dynasty: '明', type: 'war' },
  { year: 1390, title: '郭桓案，严惩贪官', dynasty: '明', type: 'political' },
  { year: 1393, title: '蓝玉案，诛杀功臣', dynasty: '明', type: 'political' },
  { year: 1398, title: '朱元璋去世，朱允炆即位', dynasty: '明', type: 'political' },
  { year: 1399, title: '靖难之役开始', dynasty: '明', type: 'war' },
  { year: 1402, title: '朱棣攻占南京，建文帝失踪', dynasty: '明', type: 'war' },
  { year: 1403, title: '朱棣改元永乐，迁都北京', dynasty: '明', type: 'political' },
  { year: 1405, title: '郑和首次下西洋', dynasty: '明', type: 'culture' },
  { year: 1407, title: '《永乐大典》编成', dynasty: '明', type: 'culture' },
  { year: 1409, title: '设奴儿干都司', dynasty: '明', type: 'political' },
  { year: 1410, title: '朱棣亲征蒙古', dynasty: '明', type: 'war' },
  { year: 1414, title: '朱棣第二次亲征蒙古', dynasty: '明', type: 'war' },
  { year: 1416, title: '郑和第四次下西洋', dynasty: '明', type: 'culture' },
  { year: 1420, title: '北京紫禁城建成', dynasty: '明', type: 'culture' },
  { year: 1421, title: '正式迁都北京', dynasty: '明', type: 'political' },
  { year: 1424, title: '朱棣第五次亲征，病逝归途', dynasty: '明', type: 'war' },
  { year: 1425, title: '朱高炽即位，洪熙新政', dynasty: '明', type: 'political' },
  { year: 1426, title: '朱瞻基即位，平定汉王之乱', dynasty: '明', type: 'war' },
  { year: 1430, title: '郑和第七次下西洋', dynasty: '明', type: 'culture' },
  { year: 1435, title: '朱瞻基去世，英宗即位', dynasty: '明', type: 'political' },
  { year: 1444, title: '瓦剌也先统一蒙古各部', dynasty: '明', type: 'war' },
  { year: 1449, title: '北京保卫战，于谦督战', dynasty: '明', type: 'war' },
  { year: 1449, title: '土木堡之变，英宗被俘', dynasty: '明', type: 'war' },
  { year: 1450, title: '英宗被释回京，景泰帝即位', dynasty: '明', type: 'political' },
  { year: 1457, title: '夺门之变，英宗复辟', dynasty: '明', type: 'political' },
  { year: 1461, title: '曹石之变，平定叛乱', dynasty: '明', type: 'war' },
  { year: 1465, title: '荆襄流民起义', dynasty: '明', type: 'war' },
  { year: 1487, title: '宪宗去世，孝宗即位', dynasty: '明', type: 'political' },
  { year: 1488, title: '明孝宗即位，弘治中兴', dynasty: '明', type: 'political' },
  { year: 1494, title: '小王子侵扰边境', dynasty: '明', type: 'war' },
  { year: 1505, title: '孝宗去世，武宗即位', dynasty: '明', type: 'political' },
  { year: 1506, title: '刘瑾专权，开始乱政', dynasty: '明', type: 'political' },
  { year: 1510, title: '诛杀刘瑾，平定安化王之乱', dynasty: '明', type: 'political' },
  { year: 1519, title: '宁王朱宸濠之乱', dynasty: '明', type: 'war' },
  { year: 1521, title: '武宗去世，世宗即位', dynasty: '明', type: 'political' },
  { year: 1522, title: '大礼议之争开始', dynasty: '明', type: 'political' },
  { year: 1529, title: '王阳明去世，心学传播', dynasty: '明', type: 'culture' },
  { year: 1542, title: '壬寅宫变，宫女弑帝未遂', dynasty: '明', type: 'political' },
  { year: 1550, title: '庚戌之变，俺答汗兵临北京', dynasty: '明', type: 'war' },
  { year: 1555, title: '倭寇侵扰江南，戚继光抗倭', dynasty: '明', type: 'war' },
  { year: 1562, title: '严嵩被罢，徐阶执政', dynasty: '明', type: 'political' },
  { year: 1566, title: '海瑞上《治安疏》，嘉靖帝去世', dynasty: '明', type: 'political' },
  { year: 1567, title: '隆庆开关，解除海禁', dynasty: '明', type: 'political' },
  { year: 1570, title: '俺答封贡，边疆安定', dynasty: '明', type: 'political' },
  { year: 1573, title: '张居正开始改革', dynasty: '明', type: 'political' },
  { year: 1578, title: '清丈田亩，推行一条鞭法', dynasty: '明', type: 'political' },
  { year: 1582, title: '张居正去世，改革中断', dynasty: '明', type: 'political' },
  { year: 1587, title: '海瑞去世，戚继光去世', dynasty: '明', type: 'culture' },
  { year: 1592, title: '万历朝鲜战争开始', dynasty: '明', type: 'war' },
  { year: 1598, title: '万历朝鲜战争结束', dynasty: '明', type: 'war' },
  { year: 1601, title: '意大利传教士利玛窦抵京', dynasty: '明', type: 'culture' },
  { year: 1615, title: '梃击案，太子遇袭', dynasty: '明', type: 'political' },
  { year: 1616, title: '努尔哈赤建立后金', dynasty: '明', type: 'war' },
  { year: 1620, title: '红丸案，光宗去世', dynasty: '明', type: 'political' },
  { year: 1621, title: '移宫案，熹宗即位', dynasty: '明', type: 'political' },
  { year: 1626, title: '宁远之战，袁崇焕击败努尔哈赤', dynasty: '明', type: 'war' },
  { year: 1627, title: '天启帝去世，崇祯帝即位', dynasty: '明', type: 'political' },
  { year: 1628, title: '陕西大旱，李自成起义', dynasty: '明', type: 'disaster' },
  { year: 1629, title: '己巳之变，皇太极入关', dynasty: '明', type: 'war' },
  { year: 1630, title: '袁崇焕被凌迟处死', dynasty: '明', type: 'political' },
  { year: 1636, title: '皇太极改国号为清', dynasty: '明', type: 'political' },
  { year: 1637, title: '宋应星《天工开物》刊行', dynasty: '明', type: 'culture' },
  { year: 1642, title: '松锦之战，明军大败', dynasty: '明', type: 'war' },
  { year: 1644, title: '李自成攻占北京，崇祯自缢，明朝灭亡', dynasty: '明', type: 'political' },
  { year: 1644, title: '清军入关，定都北京', dynasty: '明', type: 'war' },
  { year: 1645, title: '扬州十日，嘉定三屠', dynasty: '清', type: 'war' },
  { year: 1646, title: '南明隆武帝殉国', dynasty: '清', type: 'war' },
  { year: 1650, title: '桂林、广州陷落', dynasty: '清', type: 'war' },
  { year: 1652, title: '永历帝入缅，李定国抗清', dynasty: '清', type: 'war' },
  { year: 1659, title: '郑成功北伐南京失利', dynasty: '清', type: 'war' },
  { year: 1661, title: '郑成功收复台湾，顺治帝去世', dynasty: '清', type: 'war' },
  { year: 1662, title: '康熙帝即位', dynasty: '清', type: 'political' },
  { year: 1669, title: '擒鳌拜，康熙亲政', dynasty: '清', type: 'political' },
  { year: 1673, title: '三藩之乱爆发', dynasty: '清', type: 'war' },
  { year: 1678, title: '吴三桂称帝，病死衡州', dynasty: '清', type: 'war' },
  { year: 1681, title: '平定三藩之乱', dynasty: '清', type: 'war' },
  { year: 1683, title: '收复台湾，设台湾府', dynasty: '清', type: 'war' },
  { year: 1685, title: '雅克萨之战', dynasty: '清', type: 'war' },
  { year: 1689, title: '签订《尼布楚条约》', dynasty: '清', type: 'political' },
  { year: 1690, title: '乌兰布通之战，击败噶尔丹', dynasty: '清', type: 'war' },
  { year: 1696, title: '昭莫多之战，大败噶尔丹', dynasty: '清', type: 'war' },
  { year: 1697, title: '噶尔丹兵败自杀', dynasty: '清', type: 'war' },
  { year: 1712, title: '宣布滋生人丁永不加赋', dynasty: '清', type: 'political' },
  { year: 1713, title: '册封班禅额尔德尼', dynasty: '清', type: 'political' },
  { year: 1722, title: '康熙帝去世', dynasty: '清', type: 'political' },
  { year: 1723, title: '雍正帝即位', dynasty: '清', type: 'political' },
  { year: 1725, title: '年羹尧被赐死', dynasty: '清', type: 'political' },
  { year: 1727, title: '设置驻藏大臣，中俄签订《布连斯奇条约》', dynasty: '清', type: 'political' },
  { year: 1729, title: '设立军机处', dynasty: '清', type: 'political' },
  { year: 1730, title: '《古今图书集成》编成', dynasty: '清', type: 'culture' },
  { year: 1732, title: '平定罗卜藏丹津之乱', dynasty: '清', type: 'war' },
  { year: 1735, title: '雍正帝去世', dynasty: '清', type: 'political' },
  { year: 1736, title: '乾隆帝即位', dynasty: '清', type: 'political' },
  { year: 1747, title: '第一次金川之战', dynasty: '清', type: 'war' },
  { year: 1755, title: '平定准噶尔', dynasty: '清', type: 'war' },
  { year: 1757, title: '平定大小和卓之乱', dynasty: '清', type: 'war' },
  { year: 1759, title: '统一新疆，设伊犁将军', dynasty: '清', type: 'political' },
  { year: 1760, title: '设广州十三行', dynasty: '清', type: 'political' },
  { year: 1771, title: '土尔扈特部东归', dynasty: '清', type: 'political' },
  { year: 1782, title: '《四库全书》编成', dynasty: '清', type: 'culture' },
  { year: 1793, title: '英国马戛尔尼使团访华', dynasty: '清', type: 'culture' },
  { year: 1795, title: '乾隆禅位，嘉庆即位', dynasty: '清', type: 'political' },
  { year: 1796, title: '川楚白莲教起义', dynasty: '清', type: 'war' },
  { year: 1799, title: '和珅被赐死，抄没家产', dynasty: '清', type: 'political' },
  { year: 1803, title: '禁教令，限制天主教传播', dynasty: '清', type: 'political' },
  { year: 1813, title: '天理教起义，攻入紫禁城', dynasty: '清', type: 'war' },
  { year: 1816, title: '英国阿美士德使团访华', dynasty: '清', type: 'culture' },
  { year: 1820, title: '嘉庆帝去世', dynasty: '清', type: 'political' },
  { year: 1821, title: '道光帝即位', dynasty: '清', type: 'political' },
  { year: 1839, title: '林则徐虎门销烟', dynasty: '清', type: 'political' },
  { year: 1840, title: '第一次鸦片战争爆发', dynasty: '清', type: 'war' },
  { year: 1841, title: '三元里抗英', dynasty: '清', type: 'war' },
  { year: 1842, title: '签订《南京条约》', dynasty: '清', type: 'political' },
  { year: 1850, title: '道光帝去世，太平天国起义', dynasty: '清', type: 'war' },
  { year: 1851, title: '太平天国定都天京', dynasty: '清', type: 'war' },
  { year: 1853, title: '捻军起义爆发', dynasty: '清', type: 'war' },
  { year: 1856, title: '第二次鸦片战争爆发', dynasty: '清', type: 'war' },
  { year: 1858, title: '签订《天津条约》', dynasty: '清', type: 'political' },
  { year: 1860, title: '英法联军火烧圆明园', dynasty: '清', type: 'war' },
  { year: 1861, title: '咸丰帝去世，慈禧开始执政', dynasty: '清', type: 'political' },
  { year: 1862, title: '同治帝即位，洋务运动开始', dynasty: '清', type: 'political' },
  { year: 1864, title: '太平天国灭亡', dynasty: '清', type: 'war' },
  { year: 1868, title: '捻军失败，西捻军覆灭', dynasty: '清', type: 'war' },
  { year: 1870, title: '天津教案', dynasty: '清', type: 'political' },
  { year: 1874, title: '同治帝去世', dynasty: '清', type: 'political' },
  { year: 1875, title: '光绪帝即位', dynasty: '清', type: 'political' },
  { year: 1876, title: '中英《烟台条约》', dynasty: '清', type: 'political' },
  { year: 1883, title: '中法战争爆发', dynasty: '清', type: 'war' },
  { year: 1885, title: '中法签订《中法新约》', dynasty: '清', type: 'political' },
  { year: 1887, title: '黄河决口，严重水灾', dynasty: '清', type: 'disaster' },
  { year: 1888, title: '北洋海军正式成立', dynasty: '清', type: 'political' },
  { year: 1894, title: '甲午战争爆发', dynasty: '清', type: 'war' },
  { year: 1895, title: '签订《马关条约》，台湾割让', dynasty: '清', type: 'political' },
  { year: 1898, title: '戊戌变法，百日维新', dynasty: '清', type: 'political' },
  { year: 1899, title: '义和团运动兴起', dynasty: '清', type: 'war' },
  { year: 1900, title: '八国联军侵华，慈禧西逃', dynasty: '清', type: 'war' },
  { year: 1901, title: '签订《辛丑条约》', dynasty: '清', type: 'political' },
  { year: 1905, title: '废除科举制度', dynasty: '清', type: 'political' },
  { year: 1908, title: '光绪帝、慈禧先后去世', dynasty: '清', type: 'political' },
  { year: 1909, title: '宣统帝即位', dynasty: '清', type: 'political' },
  { year: 1911, title: '武昌起义，辛亥革命', dynasty: '清', type: 'war' },
  { year: 1912, title: '清朝灭亡，中华民国成立', dynasty: '清', type: 'political' },
];

/** 获取某年份所在的朝代 */
export function getDynastyForYear(year: number): string {
  for (const d of DYNASTY_RANGES) {
    if (year >= d.start && year <= d.end) return d.name;
  }
  return '';
}

/** 获取某年份对应的年号 */
export function getEraForYear(year: number): { name: string; yearInEra: number } | null {
  for (const e of ERA_RANGES) {
    if (year >= e.start && year <= e.end) {
      return { name: e.name, yearInEra: year - e.start + 1 };
    }
  }
  return null;
}

/** 格式化年份为 "公元年（年号X年）" */
export function formatYearWithEra(year: number): string {
  const era = getEraForYear(year);
  if (era) {
    return `${year}（${era.name}${era.yearInEra}年）`;
  }
  return String(year);
}

/** 获取某年份附近的历史事件 */
export function getEventsNearYear(year: number, range: number = 10): HistoricalEvent[] {
  return HISTORICAL_EVENTS.filter((e) => Math.abs(e.year - year) <= range);
}

/** 获取时间范围内的历史事件 */
export function getEventsInRange(startYear: number, endYear: number): HistoricalEvent[] {
  return HISTORICAL_EVENTS.filter((e) => e.year >= startYear && e.year <= endYear);
}