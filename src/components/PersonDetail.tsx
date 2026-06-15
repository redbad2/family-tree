import { useMemo } from 'react';
import { Descriptions, Tag, Empty, Button, Space, Popconfirm, Tooltip, Divider, Timeline } from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, UserAddOutlined,
  ArrowUpOutlined, ArrowDownOutlined, QuestionCircleOutlined,
  HistoryOutlined, AimOutlined,
} from '@ant-design/icons';
import type { Person, PersonalEvent } from '../types';
import { calculateLifespan, generationLabel, getYear } from '../utils/tree';
import { formatYearWithEra, getEventsInRange } from '../data/history';
import { getLocalEventsInRange } from '../data/localHistory';

interface PersonDetailProps {
  person: Person | null;
  parentName: string | null;
  childrenNames: string[];
  siblingIndex: number;
  siblingCount: number;
  onAddChild: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddRoot: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  hasSelection: boolean;
  onTraceAncestors: (personId: string) => void;
}

const SPOUSE_TYPE_COLOR: Record<string, string> = {
  '正室': 'gold',
  '续弦': 'blue',
  '侧室': 'green',
  '妾': 'orange',
  '其他': 'default',
};

function formatDateWithEra(dateStr: string | null): string {
  if (!dateStr) return '';
  const year = getYear(dateStr);
  if (year == null) return dateStr;
  const yearWithEra = formatYearWithEra(year);
  if (dateStr.length === 4) return yearWithEra;
  return yearWithEra + dateStr.slice(4);
}

export default function PersonDetail({
  person,
  parentName,
  childrenNames,
  siblingIndex,
  siblingCount,
  onAddChild,
  onEdit,
  onDelete,
  onAddRoot,
  onMoveUp,
  onMoveDown,
  hasSelection,
  onTraceAncestors,
}: PersonDetailProps) {
  if (!person) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <Empty description="点击节点查看详细信息">
          <Button type="primary" icon={<UserAddOutlined />} onClick={onAddRoot}>
            添加始祖
          </Button>
        </Empty>
      </div>
    );
  }

  const lifespan = calculateLifespan(person);
  const canMoveUp = person.parentId != null && siblingIndex > 0;
  const canMoveDown = person.parentId != null && siblingIndex < siblingCount - 1;

  return (
    <div>
      {/* 操作按钮栏 */}
      <div style={{ marginBottom: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Button type="primary" size="small" icon={<PlusOutlined />} onClick={onAddChild}>
          添加子女
        </Button>
        <Button size="small" icon={<EditOutlined />} onClick={onEdit}>
          编辑
        </Button>
        <Popconfirm
          title="确定删除该人物？"
          description="删除后无法恢复。如有子女则不允许删除。"
          onConfirm={onDelete}
          okText="确定"
          cancelText="取消"
        >
          <Button danger size="small" icon={<DeleteOutlined />}>
            删除
          </Button>
        </Popconfirm>
        <div style={{ width: 1, height: 24, background: '#e8e8e8', margin: '0 4px', alignSelf: 'center' }} />
        <Tooltip title="高亮从该人到始祖的直系祖先链">
          <Button size="small" icon={<AimOutlined />} onClick={() => onTraceAncestors(person.id)}>
            寻根溯源
          </Button>
        </Tooltip>
        {person.parentId && (
          <>
            <div style={{ width: 1, height: 24, background: '#e8e8e8', margin: '0 4px', alignSelf: 'center' }} />
            <Tooltip title="上移（子树跟随）">
              <Button size="small" icon={<ArrowUpOutlined />} onClick={onMoveUp} disabled={!canMoveUp} />
            </Tooltip>
            <Tooltip title="下移（子树跟随）">
              <Button size="small" icon={<ArrowDownOutlined />} onClick={onMoveDown} disabled={!canMoveDown} />
            </Tooltip>
          </>
        )}
      </div>

      <Descriptions
        title={
          <span>
            {person.name}
            {person.needsVerification && (
              <Tag color="red" style={{ marginLeft: 8 }}>待勘误</Tag>
            )}
          </span>
        }
        bordered
        size="small"
        column={1}
        labelStyle={{ width: 80, fontWeight: 600 }}
      >
        <Descriptions.Item label="世代">
          {generationLabel(person.generation)}
        </Descriptions.Item>
        <Descriptions.Item label="性别">
          {person.gender === 'male' ? '男' : '女'}
        </Descriptions.Item>
        {person.branch && (
          <Descriptions.Item label="分支">
            <Tag color="blue">{person.branch}</Tag>
          </Descriptions.Item>
        )}
        <Descriptions.Item label="出生">
          {person.birthDate ? (
            <span>
              <span style={person.birthDateInferred ? { color: '#999', fontStyle: 'italic' } : undefined}>
                {formatDateWithEra(person.birthDate)}
              </span>
              {person.birthDateInferred && (
                <Tooltip title="出生年份为算法推断，非原始记录">
                  <QuestionCircleOutlined style={{ color: '#999', marginLeft: 4, fontSize: 12 }} />
                </Tooltip>
              )}
            </span>
          ) : (
            '不详'
          )}
        </Descriptions.Item>
        <Descriptions.Item label="去世">
          {person.deathDate ? formatDateWithEra(person.deathDate) : '不详'}
        </Descriptions.Item>
        {lifespan !== null && (
          <Descriptions.Item label="寿命">
            {lifespan} 岁
          </Descriptions.Item>
        )}
        {person.spouses.length > 0 && (
          <Descriptions.Item label="配偶">
            {person.spouses.map((s) => {
              const dateParts: string[] = [];
              if (s.birthDate) dateParts.push(formatDateWithEra(s.birthDate));
              if (s.deathDate) dateParts.push('—' + formatDateWithEra(s.deathDate));
              const dateStr = dateParts.length > 0 ? ' · ' + dateParts.join('') : '';
              return (
                <Tag key={s.id} color={SPOUSE_TYPE_COLOR[s.type] ?? 'default'}>
                  {s.name}({s.type}){dateStr}
                </Tag>
              );
            })}
          </Descriptions.Item>
        )}
        {person.education && (
          <Descriptions.Item label="学历">
            {person.education}
          </Descriptions.Item>
        )}
        {person.deeds && (
          <Descriptions.Item label="事迹">
            {person.deeds}
          </Descriptions.Item>
        )}
        {person.migrationLocation && (
          <Descriptions.Item label="迁移地">
            <Tag color="cyan">{person.migrationLocation}</Tag>
          </Descriptions.Item>
        )}
        {parentName && (
          <Descriptions.Item label="父/母">
            {parentName}
          </Descriptions.Item>
        )}
        {childrenNames.length > 0 && (
          <Descriptions.Item label="子女">
            {childrenNames.join('、')}
          </Descriptions.Item>
        )}
      </Descriptions>

      {/* 生平历史事件 */}
      <LifetimeEvents person={person} />
    </div>
  );
}

/** 个人事件类型 → Timeline 颜色 + 标签 */
const PERSONAL_EVENT_STYLE: Record<string, { color: string; label: string }> = {
  birth: { color: 'green', label: '出生' },
  marriage: { color: 'magenta', label: '婚配' },
  child: { color: 'blue', label: '生育' },
  migration: { color: 'cyan', label: '迁徙' },
  achievement: { color: 'gold', label: '功名' },
  death: { color: 'gray', label: '去世' },
  other: { color: 'default', label: '其他' },
};

interface TimelineEntry {
  year: number;
  /** 个人事件（有则为个人条目），无则为历史背景条目 */
  personal?: { title: string; type: string; note?: string };
  national?: { title: string; type: string };
  local?: { title: string; location?: string };
}

function LifetimeEvents({ person }: { person: Person }) {
  const { entries, startYear, endYear } = useMemo(() => {
    const by = getYear(person.birthDate);
    const dy = getYear(person.deathDate);
    if (by == null) return { entries: [] as TimelineEntry[], startYear: null, endYear: null };

    const start = by;
    const end = dy ?? by + 60;
    const nationalEvents = getEventsInRange(start, end);
    const localEvents = getLocalEventsInRange(start, end);

    // 合并三源事件到统一时间线
    const allEntries: TimelineEntry[] = [];

    // ① 自动推导的出生事件
    allEntries.push({ year: by, personal: { title: '出生', type: 'birth' } });

    // ② 自动推导的去世事件
    if (dy != null) {
      allEntries.push({ year: dy, personal: { title: '去世', type: 'death' } });
    }

    // ③ 用户录入的 personalEvents
    if (person.personalEvents?.length) {
      for (const pe of person.personalEvents) {
        // 跳过已自动推导的出生/去世事件（避免重复）
        if (pe.type === 'birth' && pe.year === by) continue;
        if (pe.type === 'death' && pe.year === dy) continue;
        allEntries.push({ year: pe.year, personal: { title: pe.title, type: pe.type, note: pe.note } });
      }
    }

    // ④ 全国历史事件
    for (const e of nationalEvents) {
      allEntries.push({ year: e.year, national: { title: e.title, type: e.type } });
    }

    // ⑤ 地方历史事件
    for (const e of localEvents) {
      allEntries.push({ year: e.year, local: { title: e.title, location: e.location } });
    }

    // 按年份升序排序
    allEntries.sort((a, b) => a.year - b.year);

    return { entries: allEntries, startYear: start, endYear: end };
  }, [person]);

  if (startYear == null) return null;

  return (
    <div style={{ marginTop: 12 }}>
      <Divider style={{ margin: '12px 0' }}>
        <span style={{ fontSize: 12, color: '#666' }}>
          <HistoryOutlined style={{ marginRight: 4 }} />
          生平时间线（{formatYearWithEra(startYear)} ~ {formatYearWithEra(endYear!)}）
        </span>
      </Divider>
      {entries.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#999', fontSize: 12 }}>暂无记录</div>
      ) : (
        <Timeline
          mode="left"
          style={{ paddingTop: 4, paddingBottom: 0 }}
          items={entries.map((entry, idx) => {
            const age = entry.year - startYear;
            const ageStr = age > 0 ? `${age}岁` : '';

            if (entry.personal) {
              // 个人生平事件 —— 实色圆点
              const style = PERSONAL_EVENT_STYLE[entry.personal.type] ?? PERSONAL_EVENT_STYLE.other;
              return {
                key: `p-${idx}`,
                color: style.color,
                children: (
                  <div style={{ fontSize: 12 }}>
                    <span style={{ color: '#666', marginRight: 8 }}>
                      {formatYearWithEra(entry.year)}{ageStr ? ` (${ageStr})` : ''}
                    </span>
                    <Tag color={style.color} style={{ fontSize: 11, margin: 0 }}>{style.label}</Tag>
                    {' '}{entry.personal.title}
                    {entry.personal.note && (
                      <span style={{ color: '#999', marginLeft: 4 }}>- {entry.personal.note}</span>
                    )}
                  </div>
                ),
              };
            }

            // 历史背景事件 —— 空心灰点
            const isLocal = !!entry.local;
            const title = entry.national?.title ?? entry.local?.title ?? '';
            const locTag = entry.local?.location ? (
              <Tag color="cyan" style={{ fontSize: 10, margin: 0, lineHeight: '16px' }}>{entry.local.location}</Tag>
            ) : null;

            return {
              key: `h-${idx}`,
              dot: <div style={{
                width: 8, height: 8, borderRadius: '50%',
                border: '1.5px solid #bbb', background: '#fff',
                marginLeft: 2, marginTop: 4,
              }} />,
              children: (
                <div style={{ fontSize: 11, color: '#999' }}>
                  <span style={{ marginRight: 6 }}>{formatYearWithEra(entry.year)}</span>
                  {locTag}{' '}{title}
                </div>
              ),
            };
          })}
        />
      )}
    </div>
  );
}
