import { useMemo, useRef, useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Collapse } from 'antd';
import * as echarts from 'echarts';
import type { Person } from '../types';
import { buildChildrenMap, getDescendants } from '../utils/tree';

function useECharts(containerRef: React.RefObject<HTMLDivElement | null>) {
  const chartRef = useRef<echarts.ECharts | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function tryInit() {
      if (el!.clientWidth > 0 && el!.clientHeight > 0 && !chartRef.current) {
        chartRef.current = echarts.init(el!);
        setReady(true);
        return true;
      }
      return false;
    }

    if (tryInit()) return;

    const observer = new ResizeObserver(() => {
      if (!tryInit() && chartRef.current) {
        chartRef.current.resize();
      }
    });
    observer.observe(el);

    return () => {
      observer.disconnect();
      chartRef.current?.dispose();
      chartRef.current = null;
    };
  }, [containerRef]);

  return { chartRef, ready };
}

interface StatisticsPanelProps {
  persons: Person[];
  rangeStart: number;
  rangeEnd: number;
  basePersonId?: string | null;
}

function getYear(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const year = parseInt(dateStr.slice(0, 4), 10);
  return isNaN(year) ? null : year;
}

/** 判断某人在某年是否存活；若无去世年份，按出生年份+100估算 */
function isAliveInYear(person: Person, year: number): boolean {
  const birthYear = getYear(person.birthDate);
  const deathYear = getYear(person.deathDate);
  if (!birthYear) return false;
  if (year < birthYear) return false;
  const effectiveDeathYear = deathYear ?? (birthYear + 100);
  if (year > effectiveDeathYear) return false;
  return true;
}

/** 获取在时间范围内存活的人；若无去世年份，按出生年份+100估算 */
function getAlivePersons(persons: Person[], startYear: number, endYear: number): Person[] {
  return persons.filter((p) => {
    const birthYear = getYear(p.birthDate);
    const deathYear = getYear(p.deathDate);
    if (birthYear == null) return true;
    const effectiveDeathYear = deathYear ?? (birthYear + 100);
    return birthYear <= endYear && effectiveDeathYear >= startYear;
  });
}

/** 年龄段标签 */
function ageRangeLabel(age: number): string {
  if (age < 20) return '0-19';
  if (age < 40) return '20-39';
  if (age < 60) return '40-59';
  if (age < 80) return '60-79';
  return '80+';
}

/** 寿命段标签 */
function lifespanLabel(age: number): string {
  if (age < 30) return '<30';
  if (age < 50) return '30-49';
  if (age < 60) return '50-59';
  if (age < 70) return '60-69';
  if (age < 80) return '70-79';
  if (age < 90) return '80-89';
  return '90+';
}

function EChartsPie({ data, title, height = 200, colors }: { data: { name: string; value: number }[]; title: string; height?: number; colors?: string[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const { chartRef, ready } = useECharts(ref);

  useEffect(() => {
    if (!ready) return;
    chartRef.current!.setOption({
      title: {
        text: title,
        left: 'center',
        top: 0,
        textStyle: { fontSize: 13, fontWeight: 600 },
      },
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      color: colors,
      series: [{
        type: 'pie',
        radius: ['35%', '65%'],
        center: ['50%', '58%'],
        data,
        label: { fontSize: 11 },
        itemStyle: { borderRadius: 4 },
      }],
    });
  }, [data, title, ready, colors]);

  return <div ref={ref} style={{ width: '100%', height }} />;
}

function EChartsBar({ data, title, height = 200, colorFrom, colorTo }: { data: { name: string; value: number }[]; title: string; height?: number; colorFrom?: string; colorTo?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const { chartRef, ready } = useECharts(ref);

  useEffect(() => {
    if (!ready) return;
    chartRef.current!.setOption({
      title: {
        text: title,
        left: 'center',
        top: 0,
        textStyle: { fontSize: 13, fontWeight: 600 },
      },
      tooltip: { trigger: 'axis' },
      xAxis: {
        type: 'category',
        data: data.map((d) => d.name),
        axisLabel: { fontSize: 11 },
      },
      yAxis: { type: 'value', minInterval: 1 },
      series: [{
        type: 'bar',
        data: data.map((d) => d.value),
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: colorFrom ?? '#8e44ad' },
            { offset: 1, color: colorTo ?? '#c39bd3' },
          ]),
          borderRadius: [4, 4, 0, 0],
        },
        barMaxWidth: 36,
      }],
      grid: { top: 36, bottom: 24, left: 36, right: 12 },
    });
  }, [data, title, ready, colorFrom, colorTo]);

  return <div ref={ref} style={{ width: '100%', height }} />;
}

function EChartsLine({ data, title, height = 200 }: { data: { name: string; value: number }[]; title: string; height?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const { chartRef, ready } = useECharts(ref);

  useEffect(() => {
    if (!ready) return;
    chartRef.current!.setOption({
      title: {
        text: title,
        left: 'center',
        top: 0,
        textStyle: { fontSize: 13, fontWeight: 600 },
      },
      tooltip: { trigger: 'axis' },
      xAxis: {
        type: 'category',
        data: data.map((d) => d.name),
        axisLabel: { fontSize: 10, rotate: 30 },
      },
      yAxis: { type: 'value', minInterval: 1 },
      series: [{
        type: 'line',
        data: data.map((d) => d.value),
        smooth: true,
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(142,68,173,0.35)' },
            { offset: 1, color: 'rgba(142,68,173,0.05)' },
          ]),
        },
        lineStyle: { color: '#8e44ad', width: 2 },
        itemStyle: { color: '#8e44ad' },
        symbol: 'circle',
        symbolSize: 4,
      }],
      grid: { top: 36, bottom: 36, left: 36, right: 12 },
    });
  }, [data, title, ready]);

  return <div ref={ref} style={{ width: '100%', height }} />;
}

export default function StatisticsPanel({ persons, rangeStart, rangeEnd, basePersonId }: StatisticsPanelProps) {
  const scopedPersons = useMemo(() => {
    if (!basePersonId) return persons;
    const childrenMap = buildChildrenMap(persons);
    const descendantIds = new Set([basePersonId, ...getDescendants(basePersonId, childrenMap)]);
    return persons.filter((p) => descendantIds.has(p.id));
  }, [persons, basePersonId]);

  const scopedYearRange = useMemo(() => {
    let min = 9999;
    let max = 0;
    for (const p of scopedPersons) {
      const by = getYear(p.birthDate);
      const dy = getYear(p.deathDate);
      const effectiveDy = dy ?? (by != null ? by + 100 : null);
      if (by != null) { if (by < min) min = by; if (by > max) max = by; }
      if (effectiveDy != null && effectiveDy > max) max = effectiveDy;
    }
    return min <= max ? { start: min, end: max } : null;
  }, [scopedPersons]);

  const displayRange = useMemo(() => {
    if (basePersonId && scopedYearRange) return scopedYearRange;
    return { start: rangeStart, end: rangeEnd };
  }, [basePersonId, scopedYearRange, rangeStart, rangeEnd]);

  const alivePersons = useMemo(
    () => getAlivePersons(scopedPersons, displayRange.start, displayRange.end),
    [scopedPersons, displayRange],
  );

  const childrenMap = useMemo(() => buildChildrenMap(scopedPersons), [scopedPersons]);

  const basePerson = basePersonId ? persons.find((p) => p.id === basePersonId) : undefined;
  const cardTitle = basePerson
    ? `${basePerson.name} 子树统计 (${displayRange.start}-${displayRange.end})`
    : `统计信息 (${displayRange.start}-${displayRange.end})`;

  // 性别分布
  const genderData = useMemo(() => {
    const male = alivePersons.filter((p) => p.gender === 'male').length;
    const female = alivePersons.filter((p) => p.gender === 'female').length;
    return [
      { name: '男', value: male, itemStyle: { color: '#3498db' } },
      { name: '女', value: female, itemStyle: { color: '#e91e63' } },
    ];
  }, [alivePersons]);

  // 分支分布
  const branchData = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of alivePersons) {
      const b = p.branch || '未分支';
      map.set(b, (map.get(b) || 0) + 1);
    }
    const colors = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c'];
    return Array.from(map.entries()).map(([name, value], i) => ({
      name,
      value,
      itemStyle: { color: colors[i % colors.length] },
    }));
  }, [alivePersons]);

  // 年龄段分布（按范围中点年份算）
  const ageData = useMemo(() => {
    const midYear = Math.floor((displayRange.start + displayRange.end) / 2);
    const map = new Map<string, number>();
    for (const p of alivePersons) {
      const birthYear = getYear(p.birthDate);
      if (!birthYear) continue;
      const age = midYear - birthYear;
      const label = ageRangeLabel(age);
      map.set(label, (map.get(label) || 0) + 1);
    }
    const order = ['0-19', '20-39', '40-59', '60-79', '80+'];
    return order
      .filter((l) => map.has(l))
      .map((name) => ({ name, value: map.get(name) || 0 }));
  }, [alivePersons, displayRange]);

  // 世代分布
  const generationData = useMemo(() => {
    const map = new Map<number, number>();
    for (const p of alivePersons) {
      map.set(p.generation, (map.get(p.generation) || 0) + 1);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a - b)
      .map(([gen, count]) => ({
        name: '第' + gen + '世',
        value: count,
      }));
  }, [alivePersons]);

  // ─── 增强统计 ───

  // 寿命分析：有明确出生和去世年份的人
  const lifespanData = useMemo(() => {
    const map = new Map<string, number>();
    const order = ['<30', '30-49', '50-59', '60-69', '70-79', '80-89', '90+'];
    let total = 0;
    let sum = 0;
    for (const p of scopedPersons) {
      const by = getYear(p.birthDate);
      const dy = getYear(p.deathDate);
      if (by == null || dy == null) continue;
      const lifespan = dy - by;
      if (lifespan < 0 || lifespan > 150) continue; // 过滤异常数据
      total++;
      sum += lifespan;
      const label = lifespanLabel(lifespan);
      map.set(label, (map.get(label) || 0) + 1);
    }
    const avg = total > 0 ? (sum / total).toFixed(1) : '-';
    const chartData = order
      .filter((l) => map.has(l))
      .map((name) => ({ name, value: map.get(name) || 0 }));
    return { chartData, avg, total };
  }, [scopedPersons]);

  // 代际间隔：父-子出生年份差
  const generationalGapData = useMemo(() => {
    const gaps: number[] = [];
    for (const p of scopedPersons) {
      if (!p.parentId) continue;
      const parent = scopedPersons.find((pp) => pp.id === p.parentId);
      if (!parent) continue;
      const childBirth = getYear(p.birthDate);
      const parentBirth = getYear(parent.birthDate);
      if (childBirth == null || parentBirth == null) continue;
      const gap = childBirth - parentBirth;
      if (gap > 10 && gap < 80) gaps.push(gap); // 过滤不合理数据
    }
    if (gaps.length === 0) return { byGen: [], avg: '-', median: '-' };

    // 按世代分组
    const genGaps = new Map<number, number[]>();
    for (const p of scopedPersons) {
      if (!p.parentId) continue;
      const parent = scopedPersons.find((pp) => pp.id === p.parentId);
      if (!parent) continue;
      const childBirth = getYear(p.birthDate);
      const parentBirth = getYear(parent.birthDate);
      if (childBirth == null || parentBirth == null) continue;
      const gap = childBirth - parentBirth;
      if (gap <= 10 || gap >= 80) continue;
      if (!genGaps.has(p.generation)) genGaps.set(p.generation, []);
      genGaps.get(p.generation)!.push(gap);
    }
    const byGen = Array.from(genGaps.entries())
      .sort(([a], [b]) => a - b)
      .map(([gen, gs]) => ({
        name: '第' + gen + '世',
        value: +(gs.reduce((a, b) => a + b, 0) / gs.length).toFixed(1),
      }));

    const avg = (gaps.reduce((a, b) => a + b, 0) / gaps.length).toFixed(1);
    const sorted = [...gaps].sort((a, b) => a - b);
    const median = sorted.length % 2 === 0
      ? ((sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2).toFixed(1)
      : sorted[Math.floor(sorted.length / 2)].toFixed(1);

    return { byGen, avg, median };
  }, [scopedPersons]);

  // 人口趋势：按年代统计存活人数
  const populationTrendData = useMemo(() => {
    const allYears = scopedPersons
      .flatMap((p) => [getYear(p.birthDate), getYear(p.deathDate)])
      .filter((y): y is number => y != null);
    if (allYears.length === 0) return [];

    const minY = Math.min(...allYears);
    const maxY = Math.max(...allYears);
    // 选择合理的采样间隔
    const span = maxY - minY;
    let step = 10;
    if (span > 500) step = 50;
    else if (span > 200) step = 25;

    const points: { name: string; value: number }[] = [];
    for (let y = Math.floor(minY / step) * step; y <= maxY; y += step) {
      const count = scopedPersons.filter((p) => isAliveInYear(p, y)).length;
      points.push({ name: y.toString(), value: count });
    }
    return points;
  }, [scopedPersons]);

  // 子女人数分布
  const childrenCountData = useMemo(() => {
    const map = new Map<number, number>();
    for (const p of scopedPersons) {
      const count = (childrenMap.get(p.id) ?? []).length;
      map.set(count, (map.get(count) || 0) + 1);
    }
    const maxChildren = Math.max(...Array.from(map.keys()), 0);
    const result: { name: string; value: number }[] = [];
    for (let i = 0; i <= Math.min(maxChildren, 12); i++) {
      if (map.has(i)) {
        result.push({ name: i + '人', value: map.get(i)! });
      }
    }
    if (maxChildren > 12 && map.has(maxChildren)) {
      // 合并 >12 的数据
      let merged = 0;
      for (let i = 13; i <= maxChildren; i++) {
        merged += map.get(i) ?? 0;
      }
      if (merged > 0) result.push({ name: '13+人', value: merged });
    }
    return result;
  }, [scopedPersons, childrenMap]);

  // 婚姻统计：配偶数量分布
  const marriageData = useMemo(() => {
    const map = new Map<number, number>();
    for (const p of scopedPersons) {
      const count = p.spouses.length;
      map.set(count, (map.get(count) || 0) + 1);
    }
    const maxSpouses = Math.max(...Array.from(map.keys()), 0);
    const result: { name: string; value: number }[] = [];
    for (let i = 0; i <= Math.min(maxSpouses, 5); i++) {
      if (map.has(i)) {
        result.push({ name: i + '位', value: map.get(i)! });
      }
    }
    if (maxSpouses > 5) {
      let merged = 0;
      for (let i = 6; i <= maxSpouses; i++) {
        merged += map.get(i) ?? 0;
      }
      if (merged > 0) result.push({ name: '6+位', value: merged });
    }
    return result;
  }, [scopedPersons]);

  // 无后代率
  const noDescendantRate = useMemo(() => {
    if (scopedPersons.length === 0) return '-';
    const noDescCount = scopedPersons.filter(
      (p) => (childrenMap.get(p.id) ?? []).length === 0,
    ).length;
    return ((noDescCount / scopedPersons.length) * 100).toFixed(1) + '%';
  }, [scopedPersons, childrenMap]);

  if (alivePersons.length === 0) {
    return (
      <Card title={cardTitle} size="small" style={{ marginTop: 16 }}>
        <div style={{ textAlign: 'center', color: '#999', padding: 16 }}>
          {basePerson ? '该子树在时间范围内无存活族人' : '该时间范围内无存活族人'}
        </div>
      </Card>
    );
  }

  return (
    <Card
      title={cardTitle}
      size="small"
      style={{ marginTop: 16 }}
    >
      <Row gutter={16} style={{ marginBottom: 8 }}>
        <Col span={8}>
          <Statistic title="存活人数" value={alivePersons.length} valueStyle={{ color: '#8e44ad', fontSize: 20 }} />
        </Col>
        <Col span={8}>
          <Statistic
            title="男/女"
            value={genderData[0]?.value || 0}
            suffix={'/ ' + (genderData[1]?.value || 0)}
            valueStyle={{ fontSize: 20 }}
          />
        </Col>
        <Col span={8}>
          <Statistic
            title="分支数"
            value={new Set(alivePersons.map((p) => p.branch || '')).size}
            valueStyle={{ fontSize: 20 }}
          />
        </Col>
      </Row>

      <Row gutter={8}>
        <Col span={12}>
          <EChartsPie data={genderData} title="性别分布" height={180} />
        </Col>
        <Col span={12}>
          <EChartsPie data={branchData} title="分支分布" height={180} />
        </Col>
      </Row>
      <Row gutter={8}>
        <Col span={12}>
          <EChartsBar data={ageData} title="年龄段分布" height={180} />
        </Col>
        <Col span={12}>
          <EChartsBar data={generationData} title="世代分布" height={180} />
        </Col>
      </Row>

      {/* ─── 增强统计 ─── */}
      <Collapse
        ghost
        items={[{
          key: 'advanced',
          label: <span style={{ fontWeight: 600, color: '#8e44ad' }}>更多统计 ▾</span>,
          children: (
            <>
              {/* 寿命分析 */}
              <Row gutter={8} style={{ marginTop: 4 }}>
                <Col span={12}>
                  <EChartsBar
                    data={lifespanData.chartData}
                    title={`寿命分布 (平均${lifespanData.avg}岁, 共${lifespanData.total}人)`}
                    height={180}
                    colorFrom="#e67e22"
                    colorTo="#f9ca79"
                  />
                </Col>
                <Col span={12}>
                  <EChartsLine
                    data={populationTrendData}
                    title="人口趋势"
                    height={180}
                  />
                </Col>
              </Row>

              {/* 代际间隔 */}
              {generationalGapData.byGen.length > 0 && (
                <Row gutter={8}>
                  <Col span={12}>
                    <EChartsBar
                      data={generationalGapData.byGen}
                      title={`代际间隔 (均${generationalGapData.avg}年中位${generationalGapData.median}年)`}
                      height={180}
                      colorFrom="#2ecc71"
                      colorTo="#82e0aa"
                    />
                  </Col>
                  <Col span={12}>
                    <EChartsBar
                      data={childrenCountData}
                      title="子女人数分布"
                      height={180}
                      colorFrom="#3498db"
                      colorTo="#85c1e9"
                    />
                  </Col>
                </Row>
              )}

              {/* 婚姻 & 无后代率 */}
              <Row gutter={8}>
                <Col span={12}>
                  <EChartsBar
                    data={marriageData}
                    title="配偶数量分布"
                    height={180}
                    colorFrom="#e91e63"
                    colorTo="#f48fb1"
                  />
                </Col>
                <Col span={12}>
                  <EChartsPie
                    data={[
                      {
                        name: '无后代',
                        value: scopedPersons.filter((p) => (childrenMap.get(p.id) ?? []).length === 0).length,
                      },
                      {
                        name: '有后代',
                        value: scopedPersons.filter((p) => (childrenMap.get(p.id) ?? []).length > 0).length,
                      },
                    ]}
                    colors={['#e74c3c', '#2ecc71']}
                    title={`后代情况 (无后代率${noDescendantRate})`}
                    height={180}
                  />
                </Col>
              </Row>
            </>
          ),
        }]}
      />
    </Card>
  );
}
