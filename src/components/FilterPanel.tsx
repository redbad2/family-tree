import { useMemo, useState } from 'react';
import { Checkbox, List, Tag, Input, Space, Collapse } from 'antd';
import {
  SearchOutlined,
  UserOutlined,
  WarningOutlined,
  QuestionCircleOutlined,
  HeartOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import type { Person } from '../types';
import { buildChildrenMap, getYear, generationLabel } from '../utils/tree';

interface FilterPanelProps {
  persons: Person[];
  onSelect: (personId: string) => void;
}

type FilterType = 'noChildren' | 'needsVerification' | 'inferredBirth' | 'noSpouse' | 'noDeeds';

const FILTER_OPTIONS: { key: FilterType; label: string; color: string; icon: React.ReactNode }[] = [
  { key: 'noChildren', label: '无后代', color: '#bbb', icon: <UserOutlined /> },
  { key: 'needsVerification', label: '待勘误', color: '#ff4d4f', icon: <WarningOutlined /> },
  { key: 'inferredBirth', label: '推断年份', color: '#faad14', icon: <QuestionCircleOutlined /> },
  { key: 'noSpouse', label: '无配偶', color: '#eb2f96', icon: <HeartOutlined /> },
  { key: 'noDeeds', label: '无事迹', color: '#8e44ad', icon: <FileTextOutlined /> },
];

export default function FilterPanel({ persons, onSelect }: FilterPanelProps) {
  const [activeFilters, setActiveFilters] = useState<Set<FilterType>>(new Set());
  const [searchText, setSearchText] = useState('');

  const childrenMap = useMemo(() => buildChildrenMap(persons), [persons]);

  const filteredPersons = useMemo(() => {
    let result = persons;

    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      result = result.filter((p) => p.name.toLowerCase().includes(q));
    }

    if (activeFilters.size === 0) return result;

    return result.filter((p) => {
      for (const filter of activeFilters) {
        switch (filter) {
          case 'noChildren':
            if ((childrenMap.get(p.id) ?? []).length > 0) return false;
            break;
          case 'needsVerification':
            if (!p.needsVerification) return false;
            break;
          case 'inferredBirth':
            if (!p.birthDateInferred) return false;
            break;
          case 'noSpouse':
            if (p.spouses.length > 0) return false;
            break;
          case 'noDeeds':
            if (p.deeds) return false;
            break;
        }
      }
      return true;
    });
  }, [persons, activeFilters, searchText, childrenMap]);

  const toggleFilter = (key: FilterType) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const stats = useMemo(() => {
    const counts: Record<FilterType, number> = {
      noChildren: 0,
      needsVerification: 0,
      inferredBirth: 0,
      noSpouse: 0,
      noDeeds: 0,
    };
    for (const p of persons) {
      if ((childrenMap.get(p.id) ?? []).length === 0) counts.noChildren++;
      if (p.needsVerification) counts.needsVerification++;
      if (p.birthDateInferred) counts.inferredBirth++;
      if (p.spouses.length === 0) counts.noSpouse++;
      if (!p.deeds) counts.noDeeds++;
    }
    return counts;
  }, [persons, childrenMap]);

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, color: '#8e44ad' }}>
        🔍 数据筛选
      </div>

      {/* 筛选条件 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
        {FILTER_OPTIONS.map((opt) => (
          <Tag
            key={opt.key}
            color={activeFilters.has(opt.key) ? opt.color : 'default'}
            style={{ cursor: 'pointer', margin: 0 }}
            onClick={() => toggleFilter(opt.key)}
          >
            {opt.icon} {opt.label} ({stats[opt.key]})
          </Tag>
        ))}
      </div>

      {/* 姓名搜索 */}
      <Input
        size="small"
        prefix={<SearchOutlined />}
        placeholder="按姓名筛选..."
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
        allowClear
        style={{ marginBottom: 8 }}
      />

      {/* 结果数量 */}
      <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>
        共 {filteredPersons.length} 人
        {activeFilters.size > 0 && (
          <span
            style={{ color: '#8e44ad', cursor: 'pointer', marginLeft: 8 }}
            onClick={() => setActiveFilters(new Set())}
          >
            清除筛选
          </span>
        )}
      </div>

      {/* 结果列表 */}
      <div style={{ maxHeight: 240, overflowY: 'auto' }}>
        <List
          size="small"
          dataSource={filteredPersons.slice(0, 100)}
          renderItem={(p) => {
            const hasChildren = (childrenMap.get(p.id) ?? []).length > 0;
            return (
              <List.Item
                style={{ padding: '4px 8px', cursor: 'pointer', fontSize: 12 }}
                onClick={() => onSelect(p.id)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%' }}>
                  <span style={{ fontWeight: 600 }}>{p.name}</span>
                  <span style={{ color: '#999' }}>{generationLabel(p.generation)}</span>
                  {!hasChildren && <Tag color="default" style={{ fontSize: 10, margin: 0, lineHeight: '16px' }}>无后</Tag>}
                  {p.needsVerification && <Tag color="red" style={{ fontSize: 10, margin: 0, lineHeight: '16px' }}>勘误</Tag>}
                  {p.birthDateInferred && <Tag color="orange" style={{ fontSize: 10, margin: 0, lineHeight: '16px' }}>推断</Tag>}
                  {p.branch && <Tag color="blue" style={{ fontSize: 10, margin: 0, lineHeight: '16px' }}>{p.branch}</Tag>}
                </div>
              </List.Item>
            );
          }}
          locale={{ emptyText: '无匹配结果' }}
        />
      </div>
    </div>
  );
}
