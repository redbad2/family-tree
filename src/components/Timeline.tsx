import { useMemo, useState } from 'react';
import { Slider, Tag, Space, Tooltip, Button, Statistic, Row, Col } from 'antd';
import { DownOutlined, UpOutlined, ClockCircleOutlined } from '@ant-design/icons';
import {
  DYNASTY_RANGES,
  getEventsInRange,
  getDynastyForYear,
  formatYearWithEra,
  getEraForYear,
} from '../data/history';
import {
  getLocalEventsInRange,
  type LocalHistoricalEvent,
} from '../data/localHistory';
import type { Person } from '../types';
import { getYear } from '../utils/tree';

interface TimelineProps {
  minYear: number;
  maxYear: number;
  currentYear: number;
  rangeStart: number;
  rangeEnd: number;
  persons: Person[];
  onCurrentYearChange: (year: number) => void;
  onRangeChange: (start: number, end: number) => void;
}

const EVENT_TYPE_COLOR: Record<string, string> = {
  political: '#1890ff',
  war: '#f5222d',
  culture: '#52c41a',
  disaster: '#fa8c16',
  other: '#8c8c8c',
};

const EVENT_TYPE_LABEL: Record<string, string> = {
  political: '政治',
  war: '战争',
  culture: '文化',
  disaster: '灾害',
  other: '其他',
};

export default function Timeline({
  minYear,
  maxYear,
  currentYear,
  rangeStart,
  rangeEnd,
  persons,
  onCurrentYearChange,
  onRangeChange,
}: TimelineProps) {
  const [expanded, setExpanded] = useState(false);

  // 范围内的历史事件（全国）
  const rangeEvents = useMemo(
    () => getEventsInRange(rangeStart, rangeEnd),
    [rangeStart, rangeEnd],
  );

  // 范围内的历史事件（地方）
  const localRangeEvents = useMemo(
    () => getLocalEventsInRange(rangeStart, rangeEnd),
    [rangeStart, rangeEnd],
  );

  // 范围内出生人数统计
  const bornStats = useMemo(() => {
    const born = persons.filter((p) => {
      const by = getYear(p.birthDate);
      return by != null && by >= rangeStart && by <= rangeEnd;
    });
    const male = born.filter((p) => p.gender === 'male').length;
    const female = born.filter((p) => p.gender === 'female').length;
    return { total: born.length, male, female };
  }, [persons, rangeStart, rangeEnd]);

  // 时间轴上的标记点（朝代分界线）
  const marks: Record<number, { label: string; style?: React.CSSProperties }> = useMemo(() => {
    const m: Record<number, { label: string; style?: React.CSSProperties }> = {};
    for (const d of DYNASTY_RANGES) {
      if (d.start >= minYear && d.start <= maxYear) {
        const era = getEraForYear(d.start);
        const eraLabel = era ? ` ${era.name}${era.yearInEra}年` : '';
        m[d.start] = {
          label: d.name + eraLabel + ' (' + d.start + ')',
          style: { color: d.color, fontWeight: 600, fontSize: 11 },
        };
      }
    }
    return m;
  }, [minYear, maxYear]);

  const currentDynasty = getDynastyForYear(currentYear);

  return (
    <div
      style={{
        background: '#fff',
        borderTop: '1px solid #f0f0f0',
      }}
    >
      {/* 折叠标题栏 */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 24px',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <ClockCircleOutlined style={{ color: '#8e44ad' }} />
        <span style={{ fontSize: 22, fontWeight: 700, color: '#8e44ad' }}>
          {currentYear}
        </span>
        {currentDynasty && (
          <Tag color="purple" style={{ fontSize: 12, margin: 0 }}>
            {currentDynasty}
          </Tag>
        )}
        {(() => {
          const era = getEraForYear(currentYear);
          if (era) {
            return (
              <Tag color="blue" style={{ fontSize: 12, margin: 0 }}>
                {era.name}{era.yearInEra}年
              </Tag>
            );
          }
          return null;
        })()}
        <span style={{ color: '#999', fontSize: 12, flex: 1 }}>
          {expanded ? '' : '拖动滑块查看当年存活族人 | 拖动范围选择器查看区间统计'}
        </span>
        <Button
          type="text"
          size="small"
          icon={expanded ? <DownOutlined /> : <UpOutlined />}
          style={{ color: '#999' }}
        />
      </div>

      {/* 展开内容 */}
      {expanded && (
        <div style={{ padding: '0 24px 8px' }}>
          {/* 年份滑块 */}
          <Slider
            min={minYear}
            max={maxYear}
            value={currentYear}
            onChange={(v) => onCurrentYearChange(v as number)}
            marks={marks}
            tooltip={{ formatter: (v) => formatYearWithEra(v as number) }}
            styles={{
              track: { background: '#8e44ad' },
            }}
          />

          {/* 范围选择 */}
          <div>
            <span style={{ fontSize: 12, color: '#666', marginRight: 8 }}>
              统计范围: {formatYearWithEra(rangeStart)} - {formatYearWithEra(rangeEnd)}
            </span>
            <Slider
              range
              min={minYear}
              max={maxYear}
              value={[rangeStart, rangeEnd]}
              onChange={(v) => onRangeChange(v[0], v[1])}
              tooltip={{ formatter: (v) => formatYearWithEra(v as number) }}
              styles={{
                track: { background: 'rgba(142,68,173,0.3)' },
              }}
            />
          </div>

          {/* 范围内出生人数统计 */}
          <div style={{ marginTop: 8, marginBottom: 8 }}>
            <Row gutter={16}>
              <Col span={8}>
                <Statistic
                  title="范围内出生人数"
                  value={bornStats.total}
                  valueStyle={{ color: '#8e44ad', fontSize: 18 }}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="男"
                  value={bornStats.male}
                  valueStyle={{ fontSize: 18 }}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="女"
                  value={bornStats.female}
                  valueStyle={{ fontSize: 18 }}
                />
              </Col>
            </Row>
          </div>

          {/* 全国历史事件 */}
          {rangeEvents.length > 0 && (
            <div style={{ marginTop: 4 }}>
              <span style={{ fontSize: 12, color: '#999', marginRight: 8 }}>
                全国范围内历史事件 ({rangeEvents.length}条):
              </span>
              <Space size={4} wrap>
                {rangeEvents.map((e) => (
                  <Tooltip
                    key={e.year + '-' + e.title}
                    title={EVENT_TYPE_LABEL[e.type] || ''}
                  >
                    <Tag
                      color={EVENT_TYPE_COLOR[e.type] || 'default'}
                      style={{ fontSize: 11, margin: 0 }}
                    >
                      {formatYearWithEra(e.year)} {e.title}
                    </Tag>
                  </Tooltip>
                ))}
              </Space>
            </div>
          )}

          {/* 地方历史事件 */}
          {localRangeEvents.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <span style={{ fontSize: 12, color: '#999', marginRight: 8 }}>
                忻州地方历史事件 ({localRangeEvents.length}条):
              </span>
              <Space size={4} wrap>
                {localRangeEvents.map((e) => (
                  <Tooltip
                    key={'local-' + e.year + '-' + e.title}
                    title={e.description || EVENT_TYPE_LABEL[e.type] || ''}
                  >
                    <Tag
                      color={EVENT_TYPE_COLOR[e.type] || 'default'}
                      style={{ fontSize: 11, margin: 0, borderStyle: 'dashed' }}
                    >
                      {formatYearWithEra(e.year)} {e.title}
                    </Tag>
                  </Tooltip>
                ))}
              </Space>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
