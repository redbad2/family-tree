import { useMemo, useRef, useEffect } from 'react';
import { Card, Row, Col, Statistic } from 'antd';
import * as echarts from 'echarts';
import type { Person } from '../types';

interface StatisticsPanelProps {
  persons: Person[];
  rangeStart: number;
  rangeEnd: number;
}

/** 判断某人在某年是否存活 */
function isAliveInYear(person: Person, year: number): boolean {
  const birthYear = person.birthDate ? new Date(person.birthDate).getFullYear() : null;
  const deathYear = person.deathDate ? new Date(person.deathDate).getFullYear() : null;
  if (!birthYear) return false;
  if (year < birthYear) return false;
  if (deathYear && year > deathYear) return false;
  return true;
}

/** 获取在某年存活的人 */
function getAlivePersons(persons: Person[], startYear: number, endYear: number): Person[] {
  return persons.filter((p) => isAliveInYear(p, startYear) || isAliveInYear(p, endYear) || 
    (p.birthDate && new Date(p.birthDate).getFullYear() <= endYear && 
     (!p.deathDate || new Date(p.deathDate).getFullYear() >= startYear))
  );
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

export default function StatisticsPanel({ persons, rangeStart, rangeEnd }: StatisticsPanelProps) {
  const alivePersons = useMemo(
    () => getAlivePersons(persons, rangeStart, rangeEnd),
    [persons, rangeStart, rangeEnd],
  );

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
    const midYear = Math.floor((rangeStart + rangeEnd) / 2);
    const map = new Map<string, number>();
    for (const p of alivePersons) {
      const birthYear = p.birthDate ? new Date(p.birthDate).getFullYear() : null;
      if (!birthYear) continue;
      const age = midYear - birthYear;
      const label = ageRangeLabel(age);
      map.set(label, (map.get(label) || 0) + 1);
    }
    const order = ['0-19', '20-39', '40-59', '60-79', '80+'];
    return order
      .filter((l) => map.has(l))
      .map((name) => ({ name, value: map.get(name) || 0 }));
  }, [alivePersons, rangeStart, rangeEnd]);

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
      <Card title="统计信息" size="small" style={{ marginTop: 16 }}>
        <div style={{ textAlign: 'center', color: '#999', padding: 16 }}>
          该时间范围内无存活族人
        </div>
      </Card>
    );
  }

  return (
    <Card
      title={'统计信息 (' + rangeStart + '-' + rangeEnd + ')'}
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
