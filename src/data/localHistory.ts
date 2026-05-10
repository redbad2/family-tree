/**
 * 地方历史事件数据源
 *
 * 每个地区独立维护，便于适配不同家族的起源地。
 * 目前包含：山西忻州（古称秀容、忻县，今忻府区）
 */

export interface LocalHistoricalEvent {
  year: number;
  title: string;
  location: string;
  type: 'political' | 'war' | 'culture' | 'disaster' | 'other';
  /** 事件详细描述（可选） */
  description?: string;
}

/** 山西忻州地区历史大事记 */
export const XINZHOU_EVENTS: LocalHistoricalEvent[] = [
  // 先秦至汉
  { year: -453, title: '晋阳之战，赵襄子据晋阳', location: '忻州', type: 'war', description: '三家分晋的关键战役' },
  { year: -221, title: '秦置太原郡，忻地属之', location: '忻州', type: 'political' },
  { year: -196, title: '刘邦封刘恒为代王，都晋阳', location: '忻州', type: 'political' },
  { year: -129, title: '卫青出击匈奴，过勾注山', location: '忻州', type: 'war' },

  // 魏晋南北朝
  { year: 220, title: '曹魏重置新兴郡', location: '忻州', type: 'political' },
  { year: 304, title: '刘渊起兵反晋，建汉国', location: '忻州', type: 'war', description: '五胡乱华开端' },
  { year: 398, title: '北魏置秀容郡', location: '忻州', type: 'political', description: '"秀容"之名始于此' },
  { year: 446, title: '北魏太武帝灭佛，忻州寺庙受损', location: '忻州', type: 'culture' },
  { year: 528, title: '秀容酋长尔朱荣起兵，控制北魏朝政', location: '秀容', type: 'war', description: '尔朱荣为秀容川人' },

  // 隋唐
  { year: 581, title: '隋改新兴郡为娄烦郡', location: '忻州', type: 'political' },
  { year: 598, title: '隋开皇十八年，置忻州，因忻口得名', location: '忻州', type: 'political', description: '"忻州"之名始于此' },
  { year: 607, title: '隋炀帝改忻州为秀容郡', location: '忻州', type: 'political' },
  { year: 615, title: '李渊任山西河东慰抚大使，路过忻州', location: '忻州', type: 'political' },
  { year: 617, title: '李渊起兵太原，经忻州南下关中', location: '忻州', type: 'war' },
  { year: 620, title: '唐复置忻州', location: '忻州', type: 'political' },
  { year: 682, title: '突厥攻扰忻州', location: '忻州', type: 'war' },
  { year: 705, title: '唐中宗重置秀容县', location: '忻州', type: 'political' },

  // 五代宋辽金
  { year: 923, title: '李存勖建后唐，忻州属河东', location: '忻州', type: 'political' },
  { year: 936, title: '石敬瑭割让燕云十六州，忻州属辽', location: '忻州', type: 'political' },
  { year: 959, title: '周世宗北伐，收复忻州', location: '忻州', type: 'war' },
  { year: 986, title: '杨业北伐辽国，兵败陈家谷', location: '忻州', type: 'war', description: '杨家将故事原型' },
  { year: 1125, title: '金灭辽，忻州归金', location: '忻州', type: 'war' },
  { year: 1211, title: '蒙古攻金，忻州沦陷', location: '忻州', type: 'war' },

  // 元明
  { year: 1260, title: '元世祖忽必烈改秀容县为忻州', location: '忻州', type: 'political' },
  { year: 1368, title: '明军攻克忻州，改属太原府', location: '忻州', type: 'war' },
  { year: 1369, title: '明洪武二年，复置秀容县', location: '忻州', type: 'political' },
  { year: 1371, title: '明洪武四年，废秀容县入忻州', location: '忻州', type: 'political', description: '秀容县至此废除' },
  { year: 1380, title: '明重修忻州城墙', location: '忻州', type: 'political' },
  { year: 1449, title: '土木堡之变，瓦剌经忻州南下', location: '忻州', type: 'war' },
  { year: 1550, title: '俺答汗攻扰山西，忻州受扰', location: '忻州', type: 'war' },
  { year: 1585, title: '忻州大旱，饥荒', location: '忻州', type: 'disaster' },
  { year: 1614, title: '重修忻州城，扩建城墙', location: '忻州', type: 'political' },

  // 清
  { year: 1644, title: '李自成部将陈永福据守忻州', location: '忻州', type: 'war' },
  { year: 1649, title: '姜瓖大同反正，忻州响应', location: '忻州', type: 'war' },
  { year: 1653, title: '清顺治十年，忻州属太原府', location: '忻州', type: 'political' },
  { year: 1693, title: '康熙三十二年，忻州地震', location: '忻州', type: 'disaster' },
  { year: 1724, title: '雍正二年，忻州升为直隶州', location: '忻州', type: 'political' },
  { year: 1772, title: '乾隆三十七年，忻州大旱', location: '忻州', type: 'disaster' },
  { year: 1813, title: '天理教起义波及忻州', location: '忻州', type: 'war' },
  { year: 1877, title: '丁戊奇荒，忻州大饥', location: '忻州', type: 'disaster', description: '华北地区特大旱灾' },

  // 民国
  { year: 1911, title: '辛亥革命，忻州光复', location: '忻州', type: 'political' },
  { year: 1912, title: '废州改县，称忻县', location: '忻县', type: 'political', description: '忻州改称忻县' },
  { year: 1920, title: '晋绥军驻防忻县', location: '忻县', type: 'war' },
  { year: 1937, title: '日军侵占忻县', location: '忻县', type: 'war', description: '平型关大捷后日军仍占领县城' },
  { year: 1937, title: '忻口战役爆发', location: '忻口', type: 'war', description: '国共合作抗日的重要战役' },
  { year: 1938, title: '晋察冀边区在忻县建立抗日政权', location: '忻县', type: 'political' },
  { year: 1940, title: '百团大战，忻县境内铁路被破袭', location: '忻县', type: 'war' },
  { year: 1945, title: '忻县光复，日军投降', location: '忻县', type: 'war' },
  { year: 1946, title: '国共内战，忻县多次易手', location: '忻县', type: 'war' },

  // 新中国
  { year: 1949, title: '忻县解放，属忻县专区', location: '忻县', type: 'political' },
  { year: 1958, title: '忻县专区与雁北专区合并', location: '忻县', type: 'political' },
  { year: 1961, title: '恢复忻县专区', location: '忻县', type: 'political' },
  { year: 1983, title: '撤县设市，忻县改为忻州市', location: '忻州市', type: 'political' },
  { year: 2000, title: '撤地设市，原忻州市改为忻府区', location: '忻府区', type: 'political', description: '忻府区之名始于此' },
];

/** 获取地方历史事件（可传入地区名称筛选） */
export function getLocalEventsInRange(
  startYear: number,
  endYear: number,
  locationFilter?: string,
): LocalHistoricalEvent[] {
  return XINZHOU_EVENTS.filter((e) => {
    if (e.year < startYear || e.year > endYear) return false;
    if (locationFilter && !e.location.includes(locationFilter)) return false;
    return true;
  });
}

/** 获取某年份附近的地方历史事件 */
export function getLocalEventsNearYear(
  year: number,
  range: number = 10,
  locationFilter?: string,
): LocalHistoricalEvent[] {
  return XINZHOU_EVENTS.filter((e) => {
    if (Math.abs(e.year - year) > range) return false;
    if (locationFilter && !e.location.includes(locationFilter)) return false;
    return true;
  });
}
