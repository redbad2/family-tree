import { useMemo, useRef, useEffect } from 'react';
import { Card, Row, Col, Statistic } from 'antd';
import * as echarts from 'echarts';
import type { Person } from '../types';
import { buildChildrenMap, getDescendants } from '../utils/tree';

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
    // 无出生日期，默认计入（族谱中有记录但生卒年不详）
    if (birthYear == null) return true;
    // 有出生日期，判定生命周期与时间范围是否有交集
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

function EChartsPie({ data, title, height = 200 }: { data: { name: string; value: number }[]; title: string; height?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    if (!chartRef.current) {
      chartRef.current = echarts.init(ref.current);
    }
    chartRef.current.setOption({
      title: {
        text: title,
        left: 'center',
        top: 0,
        textStyle: { fontSize: 13, fontWeight: 600 },
      },
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      series: [{
        type: 'pie',
        radius: ['35%', '65%'],
        center: ['50%', '58%'],
        data,
        label: { fontSize: 11 },
        itemStyle: { borderRadius: 4 },
      }],
    });
    return () => { chartRef.current?.dispose(); chartRef.current = null; };
  }, [data, title]);

  return <div ref={ref} style={{ width: '100%', height }} />;
}

function EChartsBar({ data, title, height = 200 }: { data: { name: string; value: number }[]; title: string; height?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    if (!chartRef.current) {
      chartRef.current = echarts.init(ref.current);
    }
    chartRef.current.setOption({
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
            { offset: 0, color: '#8e44ad' },
            { offset: 1, color: '#c39bd3' },
          ]),
          borderRadius: [4, 4, 0, 0],
        },
        barMaxWidth: 36,
      }],
      grid: { top: 36, bottom: 24, left: 36, right: 12 },
    });
    return () => { chartRef.current?.dispose(); chartRef.current = null; };
  }, [data, title]);

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
    </Card>
  );
}
