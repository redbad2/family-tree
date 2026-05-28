import { useMemo, useState, useCallback } from 'react';
import { Slider, Tag, Space, Tooltip, Button, Statistic, Row, Col, InputNumber } from 'antd';
import {
  ClockCircleOutlined,
  MinusOutlined,
  PlusOutlined,
  DoubleLeftOutlined,
  DoubleRightOutlined,
} from '@ant-design/icons';
import {
  DYNASTY_RANGES,
  getEventsInRange,
  getDynastyForYear,
  formatYearWithEra,
  getEraForYear,
  ERA_RANGES,
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
  const [inputYear, setInputYear] = useState<number>(currentYear);

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

  const currentDynasty = getDynastyForYear(currentYear);
  const currentEra = getEraForYear(currentYear);

  // 快捷跳转
  const handleJumpYear = useCallback((delta: number) => {
    const newYear = Math.max(minYear, Math.min(maxYear, currentYear + delta));
    onCurrentYearChange(newYear);
    setInputYear(newYear);
  }, [currentYear, minYear, maxYear, onCurrentYearChange]);

  // 输入框确认
  const handleInputConfirm = useCallback((value: number | null) => {
    if (value != null && value >= minYear && value <= maxYear) {
      onCurrentYearChange(value);
      setInputYear(value);
    }
  }, [minYear, maxYear, onCurrentYearChange]);

  // 点击年号跳转
  const handleEraClick = useCallback((era: { start: number; end: number }) => {
    const targetYear = Math.max(era.start, Math.min(era.end, currentYear));
    onCurrentYearChange(targetYear);
    setInputYear(targetYear);
  }, [currentYear, onCurrentYearChange]);

  // 点击事件跳转
  const handleEventClick = useCallback((year: number) => {
    onCurrentYearChange(year);
    setInputYear(year);
  }, [onCurrentYearChange]);

  // Slider marks - 朝代更替年份
  const sliderMarks = useMemo(() => {
    const marks: Record<number, string> = {};
    DYNASTY_RANGES.forEach((d) => {
      if (d.start >= minYear && d.start <= maxYear) {
        marks[d.start] = d.name;
      }
      if (d.end >= minYear && d.end <= maxYear) {
        marks[d.end] = '';
      }
    });
    return marks;
  }, [minYear, maxYear]);

  return (
    <div
      style={{
        background: '#fff',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* 年份显示区 */}
      <div
        style={{
          padding: '12px 16px 8px',
          borderBottom: '1px solid #f0f0f0',
        }}
      >
        {/* 年份数字 */}
        <div style={{ fontSize: 32, fontWeight: 700, color: '#8e44ad', lineHeight: 1.1 }}>
          {currentYear}
        </div>
        {/* 年号 */}
        <div style={{ marginTop: 4 }}>
          {currentDynasty && (
            <Tag color="blue" style={{ fontSize: 11, margin: 0 }}>
              {currentDynasty}
            </Tag>
          )}
          {currentEra && (
            <Tag color="purple" style={{ fontSize: 11, margin: '2px 0 0 4px' }}>
              {currentEra.name}{currentEra.yearInEra}年
            </Tag>
          )}
        </div>
      </div>

      {/* 年份输入 + 快捷跳转 */}
      <div
        style={{
          padding: '8px 16px',
          borderBottom: '1px solid #f0f0f0',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8 }}>
          <InputNumber
            value={inputYear}
            onChange={(v) => setInputYear(v as number)}
            onPressEnter={(e) => handleInputConfirm(Number((e.target as HTMLInputElement).value))}
            onBlur={(e) => handleInputConfirm(Number(e.target.value))}
            min={minYear}
            max={maxYear}
            style={{ width: 80 }}
            size="small"
          />
          <Button
            type="primary"
            size="small"
            onClick={() => handleInputConfirm(inputYear)}
          >
            跳转
          </Button>
        </div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          <Button size="small" onClick={() => handleJumpYear(-50)} style={{ flex: 1, minWidth: 50 }}>
            -50年
          </Button>
          <Button size="small" onClick={() => handleJumpYear(-10)} style={{ flex: 1, minWidth: 50 }}>
            -10年
          </Button>
          <Button size="small" onClick={() => handleJumpYear(10)} style={{ flex: 1, minWidth: 50 }}>
            +10年
          </Button>
          <Button size="small" onClick={() => handleJumpYear(50)} style={{ flex: 1, minWidth: 50 }}>
            +50年
          </Button>
        </div>
      </div>

      {/* 可滚动内容区 */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* 当前年份水平 Slider */}
        <div style={{ padding: '12px 16px 8px' }}>
          <div style={{ fontSize: 11, color: '#999', marginBottom: 4 }}>
            当前年份
          </div>
          <Slider
            min={minYear}
            max={maxYear}
            value={currentYear}
            onChange={(v) => {
              onCurrentYearChange(v as number);
              setInputYear(v as number);
            }}
            tooltip={{ formatter: (v) => formatYearWithEra(v as number) }}
            marks={sliderMarks}
            styles={{
              track: { background: '#8e44ad' },
              handle: { borderColor: '#8e44ad' },
            }}
          />
        </div>

        {/* 范围选择 */}
        <div style={{ padding: '0 16px 12px', borderBottom: '1px solid #f0f0f0' }}>
          <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>
            时间范围
          </div>
          <div style={{ fontSize: 11, color: '#8e44ad', marginBottom: 4, fontWeight: 500 }}>
            {formatYearWithEra(rangeStart)} - {formatYearWithEra(rangeEnd)}
          </div>
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
        <div style={{ padding: '8px 16px', borderBottom: '1px solid #f0f0f0' }}>
          <div style={{ fontSize: 11, color: '#999', marginBottom: 4 }}>
            范围内出生 {bornStats.total} 人
          </div>
          <Row gutter={8}>
            <Col span={12}>
              <Statistic
                title="男"
                value={bornStats.male}
                valueStyle={{ color: '#8e44ad', fontSize: 16 }}
              />
            </Col>
            <Col span={12}>
              <Statistic
                title="女"
                value={bornStats.female}
                valueStyle={{ color: '#8e44ad', fontSize: 16 }}
              />
            </Col>
          </Row>
        </div>

        {/* 当前范围内的年号列表 */}
        <div style={{ padding: '8px 16px', borderBottom: '1px solid #f0f0f0' }}>
          <div style={{ fontSize: 11, color: '#999', marginBottom: 4 }}>
            年号
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {ERA_RANGES.filter(
              (era) => era.end >= rangeStart && era.start <= rangeEnd
            ).map((era) => (
              <div
                key={era.name}
                onClick={() => handleEraClick(era)}
                style={{
                  fontSize: 11,
                  padding: '2px 6px',
                  borderRadius: 4,
                  cursor: 'pointer',
                  background: currentYear >= era.start && currentYear <= era.end ? '#f6e8ff' : 'transparent',
                  color: currentYear >= era.start && currentYear <= era.end ? '#8e44ad' : '#666',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  if (!(currentYear >= era.start && currentYear <= era.end)) {
                    e.currentTarget.style.background = '#f5f5f5';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!(currentYear >= era.start && currentYear <= era.end)) {
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                <span style={{ fontWeight: currentYear >= era.start && currentYear <= era.end ? 600 : 400 }}>
                  {era.name}
                </span>
                <span style={{ color: '#999', marginLeft: 4 }}>
                  {era.start}-{era.end}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 全国历史事件 */}
        {rangeEvents.length > 0 && (
          <div style={{ padding: '8px 16px', borderBottom: '1px solid #f0f0f0' }}>
            <div style={{ fontSize: 11, color: '#999', marginBottom: 4 }}>
              📌 全国大事 ({rangeEvents.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {rangeEvents.map((e) => (
                <Tooltip key={e.year + '-' + e.title} title={`[${EVENT_TYPE_LABEL[e.type] || '其他'}] ${e.title}（${formatYearWithEra(e.year)}年）`}>
                  <div
                    onClick={() => handleEventClick(e.year)}
                    style={{
                      fontSize: 11,
                      padding: '2px 6px',
                      borderRadius: 4,
                      cursor: 'pointer',
                      background: currentYear === e.year ? '#e6f7ff' : 'transparent',
                      color: EVENT_TYPE_COLOR[e.type] || '#666',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      transition: 'background 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#f5f5f5';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = currentYear === (e as any).year ? '#e6f7ff' : 'transparent';
                    }}
                  >
                    <span style={{ fontWeight: 500, minWidth: 36 }}>{formatYearWithEra(e.year)}</span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {e.title}
                    </span>
                  </div>
                </Tooltip>
              ))}
            </div>
          </div>
        )}

        {/* 地方历史事件 */}
        {localRangeEvents.length > 0 && (
          <div style={{ padding: '8px 16px' }}>
            <div style={{ fontSize: 11, color: '#999', marginBottom: 4 }}>
              📍 忻州大事 ({localRangeEvents.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {localRangeEvents.map((e) => (
                <Tooltip
                  key={'local-' + e.year + '-' + e.title}
                  title={`[${EVENT_TYPE_LABEL[e.type] || '其他'}] ${e.title}（${formatYearWithEra(e.year)}年）${e.description ? ' - ' + e.description : ''}`}
                >
                  <div
                    onClick={() => handleEventClick(e.year)}
                    style={{
                      fontSize: 11,
                      padding: '2px 6px',
                      borderRadius: 4,
                      cursor: 'pointer',
                      background: currentYear === e.year ? '#fff7e6' : 'transparent',
                      color: EVENT_TYPE_COLOR[e.type] || '#666',
                      borderLeft: '2px dashed ' + (EVENT_TYPE_COLOR[e.type] || '#d9d9d9'),
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      transition: 'background 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#f5f5f5';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = currentYear === (e as any).year ? '#fff7e6' : 'transparent';
                    }}
                  >
                    <span style={{ fontWeight: 500, minWidth: 36 }}>{formatYearWithEra(e.year)}</span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {e.title}
                    </span>
                  </div>
                </Tooltip>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
