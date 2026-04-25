import { useMemo, useState } from 'react';
import { Slider, Tag, Space, Tooltip, Button } from 'antd';
import { DownOutlined, UpOutlined, ClockCircleOutlined } from '@ant-design/icons';
import {
  DYNASTY_RANGES,
  getEventsInRange,
  getDynastyForYear,
} from '../data/history';

interface TimelineProps {
  minYear: number;
  maxYear: number;
  currentYear: number;
  rangeStart: number;
  rangeEnd: number;
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
  onCurrentYearChange,
  onRangeChange,
}: TimelineProps) {
  const [expanded, setExpanded] = useState(false);

  // 范围内的历史事件
  const rangeEvents = useMemo(
    () => getEventsInRange(rangeStart, rangeEnd),
    [rangeStart, rangeEnd],
  );

  // 时间轴上的标记点（朝代分界线）
  const marks: Record<number, { label: string; style?: React.CSSProperties }> = useMemo(() => {
    const m: Record<number, { label: string; style?: React.CSSProperties }> = {};
    for (const d of DYNASTY_RANGES) {
      if (d.start >= minYear && d.start <= maxYear) {
        m[d.start] = {
          label: d.name + ' (' + d.start + ')',
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
            tooltip={{ formatter: (v) => v + '年' }}
            styles={{
              track: { background: '#8e44ad' },
            }}
          />

          {/* 范围选择 */}
          <div>
            <span style={{ fontSize: 12, color: '#666', marginRight: 8 }}>
              统计范围: {rangeStart} - {rangeEnd}
            </span>
            <Slider
              range
              min={minYear}
              max={maxYear}
              value={[rangeStart, rangeEnd]}
              onChange={(v) => onRangeChange(v[0], v[1])}
              tooltip={{ formatter: (v) => v + '年' }}
              styles={{
                track: { background: 'rgba(142,68,173,0.3)' },
              }}
            />
          </div>

          {/* 历史事件 */}
          {rangeEvents.length > 0 && (
            <div style={{ marginTop: 4 }}>
              <span style={{ fontSize: 12, color: '#999', marginRight: 8 }}>
                范围内历史事件:
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
                      {e.year} {e.title}
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
