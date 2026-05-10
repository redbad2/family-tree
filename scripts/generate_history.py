#!/usr/bin/env python3
"""生成扩充的明清历史事件数据，写入 src/data/history.ts"""

import json
from datetime import datetime

# 明清年号表
ERA_RANGES = [
    # 明朝
    {"name": "洪武", "start": 1368, "end": 1398, "dynasty": "明"},
    {"name": "建文", "start": 1399, "end": 1402, "dynasty": "明"},
    {"name": "永乐", "start": 1403, "end": 1424, "dynasty": "明"},
    {"name": "洪熙", "start": 1425, "end": 1425, "dynasty": "明"},
    {"name": "宣德", "start": 1426, "end": 1435, "dynasty": "明"},
    {"name": "正统", "start": 1436, "end": 1449, "dynasty": "明"},
    {"name": "景泰", "start": 1450, "end": 1456, "dynasty": "明"},
    {"name": "天顺", "start": 1457, "end": 1464, "dynasty": "明"},
    {"name": "成化", "start": 1465, "end": 1487, "dynasty": "明"},
    {"name": "弘治", "start": 1488, "end": 1505, "dynasty": "明"},
    {"name": "正德", "start": 1506, "end": 1521, "dynasty": "明"},
    {"name": "嘉靖", "start": 1522, "end": 1566, "dynasty": "明"},
    {"name": "隆庆", "start": 1567, "end": 1572, "dynasty": "明"},
    {"name": "万历", "start": 1573, "end": 1620, "dynasty": "明"},
    {"name": "泰昌", "start": 1620, "end": 1620, "dynasty": "明"},
    {"name": "天启", "start": 1621, "end": 1627, "dynasty": "明"},
    {"name": "崇祯", "start": 1628, "end": 1644, "dynasty": "明"},
    # 清朝
    {"name": "顺治", "start": 1644, "end": 1661, "dynasty": "清"},
    {"name": "康熙", "start": 1662, "end": 1722, "dynasty": "清"},
    {"name": "雍正", "start": 1723, "end": 1735, "dynasty": "清"},
    {"name": "乾隆", "start": 1736, "end": 1795, "dynasty": "清"},
    {"name": "嘉庆", "start": 1796, "end": 1820, "dynasty": "清"},
    {"name": "道光", "start": 1821, "end": 1850, "dynasty": "清"},
    {"name": "咸丰", "start": 1851, "end": 1861, "dynasty": "清"},
    {"name": "同治", "start": 1862, "end": 1874, "dynasty": "清"},
    {"name": "光绪", "start": 1875, "end": 1908, "dynasty": "清"},
    {"name": "宣统", "start": 1909, "end": 1912, "dynasty": "清"},
]

# 扩充的历史事件列表（1368-1912）
EVENTS_RAW = [
    # 洪武年间
    (1368, "明朝建立，朱元璋称帝，定都南京", "political"),
    (1369, "徐达攻占大都，元朝灭亡", "war"),
    (1370, "设锦衣卫，加强皇权", "political"),
    (1371, "平定四川明玉珍政权", "war"),
    (1372, "李文忠北伐失利", "war"),
    (1373, "恢复科举制度", "culture"),
    (1376, "空印案，严惩地方官员", "political"),
    (1380, "胡惟庸案，废丞相制", "political"),
    (1381, "平定云南，沐英留守", "war"),
    (1382, "设都察院，改锦衣卫", "political"),
    (1387, "蓝玉北伐，大破北元", "war"),
    (1390, "郭桓案，严惩贪官", "political"),
    (1393, "蓝玉案，诛杀功臣", "political"),
    (1398, "朱元璋去世，朱允炆即位", "political"),
    (1399, "靖难之役开始", "war"),
    (1402, "朱棣攻占南京，建文帝失踪", "war"),
    # 永乐年间
    (1403, "朱棣改元永乐，迁都北京", "political"),
    (1405, "郑和首次下西洋", "culture"),
    (1407, "《永乐大典》编成", "culture"),
    (1409, "设奴儿干都司", "political"),
    (1410, "朱棣亲征蒙古", "war"),
    (1414, "朱棣第二次亲征蒙古", "war"),
    (1416, "郑和第四次下西洋", "culture"),
    (1420, "北京紫禁城建成", "culture"),
    (1421, "正式迁都北京", "political"),
    (1424, "朱棣第五次亲征，病逝归途", "war"),
    # 洪熙、宣德
    (1425, "朱高炽即位，洪熙新政", "political"),
    (1426, "朱瞻基即位，平定汉王之乱", "war"),
    (1430, "郑和第七次下西洋", "culture"),
    (1435, "朱瞻基去世，英宗即位", "political"),
    # 正统
    (1444, "瓦剌也先统一蒙古各部", "war"),
    (1449, "土木堡之变，英宗被俘", "war"),
    (1449, "北京保卫战，于谦督战", "war"),
    # 景泰、天顺
    (1450, "英宗被释回京，景泰帝即位", "political"),
    (1457, "夺门之变，英宗复辟", "political"),
    (1461, "曹石之变，平定叛乱", "war"),
    # 成化
    (1465, "荆襄流民起义", "war"),
    (1487, "宪宗去世，孝宗即位", "political"),
    # 弘治
    (1488, "明孝宗即位，弘治中兴", "political"),
    (1494, "小王子侵扰边境", "war"),
    (1505, "孝宗去世，武宗即位", "political"),
    # 正德
    (1506, "刘瑾专权，开始乱政", "political"),
    (1510, "诛杀刘瑾，平定安化王之乱", "political"),
    (1519, "宁王朱宸濠之乱", "war"),
    (1521, "武宗去世，世宗即位", "political"),
    # 嘉靖
    (1522, "大礼议之争开始", "political"),
    (1529, "王阳明去世，心学传播", "culture"),
    (1542, "壬寅宫变，宫女弑帝未遂", "political"),
    (1550, "庚戌之变，俺答汗兵临北京", "war"),
    (1555, "倭寇侵扰江南，戚继光抗倭", "war"),
    (1562, "严嵩被罢，徐阶执政", "political"),
    (1566, "海瑞上《治安疏》，嘉靖帝去世", "political"),
    # 隆庆
    (1567, "隆庆开关，解除海禁", "political"),
    (1570, "俺答封贡，边疆安定", "political"),
    # 万历
    (1573, "张居正开始改革", "political"),
    (1578, "清丈田亩，推行一条鞭法", "political"),
    (1582, "张居正去世，改革中断", "political"),
    (1587, "海瑞去世，戚继光去世", "culture"),
    (1592, "万历朝鲜战争开始", "war"),
    (1598, "万历朝鲜战争结束", "war"),
    (1601, "意大利传教士利玛窦抵京", "culture"),
    (1615, "梃击案，太子遇袭", "political"),
    (1616, "努尔哈赤建立后金", "war"),
    # 天启
    (1620, "红丸案，光宗去世", "political"),
    (1621, "移宫案，熹宗即位", "political"),
    (1626, "宁远之战，袁崇焕击败努尔哈赤", "war"),
    (1627, "天启帝去世，崇祯帝即位", "political"),
    # 崇祯
    (1628, "陕西大旱，李自成起义", "disaster"),
    (1629, "己巳之变，皇太极入关", "war"),
    (1630, "袁崇焕被凌迟处死", "political"),
    (1636, "皇太极改国号为清", "political"),
    (1637, "宋应星《天工开物》刊行", "culture"),
    (1642, "松锦之战，明军大败", "war"),
    (1644, "李自成攻占北京，崇祯自缢，明朝灭亡", "political"),
    # 顺治
    (1644, "清军入关，定都北京", "war"),
    (1645, "扬州十日，嘉定三屠", "war"),
    (1646, "南明隆武帝殉国", "war"),
    (1650, "桂林、广州陷落", "war"),
    (1652, "永历帝入缅，李定国抗清", "war"),
    (1659, "郑成功北伐南京失利", "war"),
    (1661, "郑成功收复台湾，顺治帝去世", "war"),
    # 康熙
    (1662, "康熙帝即位", "political"),
    (1669, "擒鳌拜，康熙亲政", "political"),
    (1673, "三藩之乱爆发", "war"),
    (1678, "吴三桂称帝，病死衡州", "war"),
    (1681, "平定三藩之乱", "war"),
    (1683, "收复台湾，设台湾府", "war"),
    (1685, "雅克萨之战", "war"),
    (1689, "签订《尼布楚条约》", "political"),
    (1690, "乌兰布通之战，击败噶尔丹", "war"),
    (1696, "昭莫多之战，大败噶尔丹", "war"),
    (1697, "噶尔丹兵败自杀", "war"),
    (1712, "宣布滋生人丁永不加赋", "political"),
    (1713, "册封班禅额尔德尼", "political"),
    (1722, "康熙帝去世", "political"),
    # 雍正
    (1723, "雍正帝即位", "political"),
    (1725, "年羹尧被赐死", "political"),
    (1727, "设置驻藏大臣，中俄签订《布连斯奇条约》", "political"),
    (1729, "设立军机处", "political"),
    (1730, "《古今图书集成》编成", "culture"),
    (1732, "平定罗卜藏丹津之乱", "war"),
    (1735, "雍正帝去世", "political"),
    # 乾隆
    (1736, "乾隆帝即位", "political"),
    (1747, "第一次金川之战", "war"),
    (1755, "平定准噶尔", "war"),
    (1757, "平定大小和卓之乱", "war"),
    (1759, "统一新疆，设伊犁将军", "political"),
    (1760, "设广州十三行", "political"),
    (1771, "土尔扈特部东归", "political"),
    (1782, "《四库全书》编成", "culture"),
    (1793, "英国马戛尔尼使团访华", "culture"),
    (1795, "乾隆禅位，嘉庆即位", "political"),
    # 嘉庆
    (1796, "川楚白莲教起义", "war"),
    (1799, "和珅被赐死，抄没家产", "political"),
    (1803, "禁教令，限制天主教传播", "political"),
    (1813, "天理教起义，攻入紫禁城", "war"),
    (1816, "英国阿美士德使团访华", "culture"),
    (1820, "嘉庆帝去世", "political"),
    # 道光
    (1821, "道光帝即位", "political"),
    (1839, "林则徐虎门销烟", "political"),
    (1840, "第一次鸦片战争爆发", "war"),
    (1841, "三元里抗英", "war"),
    (1842, "签订《南京条约》", "political"),
    (1850, "道光帝去世，太平天国起义", "war"),
    # 咸丰
    (1851, "太平天国定都天京", "war"),
    (1853, "捻军起义爆发", "war"),
    (1856, "第二次鸦片战争爆发", "war"),
    (1858, "签订《天津条约》", "political"),
    (1860, "英法联军火烧圆明园", "war"),
    (1861, "咸丰帝去世，慈禧开始执政", "political"),
    # 同治
    (1862, "同治帝即位，洋务运动开始", "political"),
    (1864, "太平天国灭亡", "war"),
    (1868, "捻军失败，西捻军覆灭", "war"),
    (1870, "天津教案", "political"),
    (1874, "同治帝去世", "political"),
    # 光绪
    (1875, "光绪帝即位", "political"),
    (1876, "中英《烟台条约》", "political"),
    (1883, "中法战争爆发", "war"),
    (1885, "中法签订《中法新约》", "political"),
    (1887, "黄河决口，严重水灾", "disaster"),
    (1888, "北洋海军正式成立", "political"),
    (1894, "甲午战争爆发", "war"),
    (1895, "签订《马关条约》，台湾割让", "political"),
    (1898, "戊戌变法，百日维新", "political"),
    (1899, "义和团运动兴起", "war"),
    (1900, "八国联军侵华，慈禧西逃", "war"),
    (1901, "签订《辛丑条约》", "political"),
    (1905, "废除科举制度", "political"),
    (1908, "光绪帝、慈禧先后去世", "political"),
    # 宣统
    (1909, "宣统帝即位", "political"),
    (1911, "武昌起义，辛亥革命", "war"),
    (1912, "清朝灭亡，中华民国成立", "political"),
]

# 去重并排序
events_dict = {}
for year, title, etype in EVENTS_RAW:
    key = f"{year}-{title}"
    if key not in events_dict:
        # 确定朝代
        dynasty = ""
        for era in ERA_RANGES:
            if era["start"] <= year <= era["end"]:
                dynasty = era["dynasty"]
                break
        if not dynasty:
            if year < 1368:
                dynasty = "元"
            elif year > 1912:
                dynasty = "中华民国"
        events_dict[key] = {
            "year": year,
            "title": title,
            "dynasty": dynasty,
            "type": etype,
        }

events = sorted(events_dict.values(), key=lambda x: (x["year"], x["title"]))

print(f"生成历史事件: {len(events)} 条")
print(f"覆盖年份: {events[0]['year']} ~ {events[-1]['year']}")

# 输出 TypeScript 格式的文件内容
lines = []
lines.append('/** 中国历史朝代及重大事件（用于时间轴展示） */')
lines.append('')
lines.append('export interface HistoricalEvent {')
lines.append('  year: number;')
lines.append('  title: string;')
lines.append('  dynasty: string;')
lines.append("  type: 'political' | 'war' | 'culture' | 'disaster' | 'other';")
lines.append('}')
lines.append('')
lines.append('export interface EraRange {')
lines.append('  name: string;')
lines.append('  start: number;')
lines.append('  end: number;')
lines.append('  dynasty: string;')
lines.append('}')
lines.append('')
lines.append('export const DYNASTY_RANGES: { name: string; start: number; end: number; color: string }[] = [')
lines.append("  { name: '元', start: 1271, end: 1368, color: '#5b8ff9' },")
lines.append("  { name: '明', start: 1368, end: 1644, color: '#5ad8a6' },")
lines.append("  { name: '清', start: 1644, end: 1912, color: '#f6bd16' },")
lines.append("  { name: '中华民国', start: 1912, end: 1949, color: '#e86452' },")
lines.append("  { name: '中华人民共和国', start: 1949, end: 2026, color: '#6dc8ec' },")
lines.append('];')
lines.append('')
lines.append('export const ERA_RANGES: EraRange[] = [')
for era in ERA_RANGES:
    lines.append(f"  {{ name: '{era['name']}', start: {era['start']}, end: {era['end']}, dynasty: '{era['dynasty']}' }},")
lines.append('];')
lines.append('')
lines.append('export const HISTORICAL_EVENTS: HistoricalEvent[] = [')
for e in events:
    lines.append(f"  {{ year: {e['year']}, title: '{e['title']}', dynasty: '{e['dynasty']}', type: '{e['type']}' }},")
lines.append('];')
lines.append('')
lines.append('/** 获取某年份所在的朝代 */')
lines.append('export function getDynastyForYear(year: number): string {')
lines.append('  for (const d of DYNASTY_RANGES) {')
lines.append('    if (year >= d.start && year <= d.end) return d.name;')
lines.append('  }')
lines.append("  return '';")
lines.append('}')
lines.append('')
lines.append('/** 获取某年份对应的年号 */')
lines.append('export function getEraForYear(year: number): { name: string; yearInEra: number } | null {')
lines.append('  for (const e of ERA_RANGES) {')
lines.append('    if (year >= e.start && year <= e.end) {')
lines.append('      return { name: e.name, yearInEra: year - e.start + 1 };')
lines.append('    }')
lines.append('  }')
lines.append('  return null;')
lines.append('}')
lines.append('')
lines.append('/** 格式化年份为 "公元年（年号X年）" */')
lines.append('export function formatYearWithEra(year: number): string {')
lines.append('  const era = getEraForYear(year);')
lines.append('  if (era) {')
lines.append("    return `${year}（${era.name}${era.yearInEra}年）`;")
lines.append('  }')
lines.append(f"  return String(year);")
lines.append('}')
lines.append('')
lines.append('/** 获取某年份附近的历史事件 */')
lines.append('export function getEventsNearYear(year: number, range: number = 10): HistoricalEvent[] {')
lines.append('  return HISTORICAL_EVENTS.filter((e) => Math.abs(e.year - year) <= range);')
lines.append('}')
lines.append('')
lines.append('/** 获取时间范围内的历史事件 */')
lines.append('export function getEventsInRange(startYear: number, endYear: number): HistoricalEvent[] {')
lines.append('  return HISTORICAL_EVENTS.filter((e) => e.year >= startYear && e.year <= endYear);')
lines.append('}')

output = '\n'.join(lines)

with open('/Users/zhangzaifeng/Documents/project/family-tree/src/data/history.ts', 'w', encoding='utf-8') as f:
    f.write(output)

print(f"已写入 src/data/history.ts，共 {len(output)} 字符")
