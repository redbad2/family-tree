import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { AutoComplete, Button, Space, Tooltip, Tag, Input, Upload } from 'antd';
import {
  ExportOutlined,
  ImportOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
  FullscreenOutlined,
  UndoOutlined,
  UserAddOutlined,
  SaveOutlined,
  SearchOutlined,
  TableOutlined,
} from '@ant-design/icons';
import type { FamilyTreeData, Person } from '../types';

interface ToolbarProps {
  onExport: () => void;
  onImport: (data: FamilyTreeData) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  onClearSelection: () => void;
  onAddRoot: () => void;
  onSave: () => void;
  onSearchSelect: (personId: string) => void;
  onExportLineage: () => void;
  persons: Person[];
  hasUnsavedChanges: boolean;
  savedFileName?: string;
}

export default function Toolbar({
  onExport,
  onImport,
  onZoomIn,
  onZoomOut,
  onFitView,
  onClearSelection,
  onAddRoot,
  onSave,
  onSearchSelect,
  onExportLineage,
  persons,
  hasUnsavedChanges,
  savedFileName,
}: ToolbarProps) {
  const [searchText, setSearchText] = useState('');
  const justSelectedRef = useRef(false);

  // 构建搜索索引：每人 + 每个配偶的名字
  const searchOptions = useMemo(() => {
    const map = new Map<string, { label: string; value: string }>();
    for (const p of persons) {
      const key = p.name + '###' + p.id;
      if (!map.has(key)) {
        map.set(key, { label: p.name, value: p.id });
      }
      for (const s of p.spouses) {
        const skey = s.name + '###' + p.id;
        if (!map.has(skey)) {
          map.set(skey, {
            label: `${s.name}（${p.name}之配偶）`,
            value: p.id,
          });
        }
      }
    }
    return Array.from(map.values());
  }, [persons]);

  // 过滤后的选项
  const filteredOptions = useMemo(() => {
    if (!searchText.trim()) return [];
    const q = searchText.trim();
    const lowerQ = q.toLowerCase();
    return searchOptions.filter(
      (opt) =>
        opt.label.toLowerCase().includes(lowerQ) ||
        opt.label.includes(q),
    ).slice(0, 20);
  }, [searchText, searchOptions]);

  // 切换族谱数据时清空搜索文本
  useEffect(() => {
    setSearchText('');
  }, [persons]);

  const handleSearchSelect = useCallback(
    (value: string) => {
      justSelectedRef.current = true;
      onSearchSelect(value);
      setSearchText('');
    },
    [onSearchSelect],
  );

  const handleSearchChange = useCallback((val: string) => {
    if (justSelectedRef.current) {
      justSelectedRef.current = false;
      return;
    }
    setSearchText(val);
  }, []);

  const handleImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string) as FamilyTreeData;
        onImport(data);
      } catch (err) {
        alert('导入失败：JSON 格式不正确');
      }
    };
    reader.readAsText(file);
    return false;
  };

  return (
    <div
      style={{
        padding: '8px 16px',
        borderBottom: '1px solid #f0f0f0',
        background: '#fff',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <Space>
        <Tooltip title="添加始祖">
          <Button icon={<UserAddOutlined />} size="small" onClick={onAddRoot}>
            添加始祖
          </Button>
        </Tooltip>
        <div style={{ width: 1, height: 24, background: '#e8e8e8', margin: '0 4px' }} />
        <AutoComplete
          value={searchText}
            onChange={handleSearchChange}
          onSelect={handleSearchSelect}
          options={filteredOptions}
          style={{ width: 240 }}
          filterOption={false}
        >
          <Input
            prefix={<SearchOutlined />}
            placeholder="搜索姓名（含配偶）..."
            size="small"
            allowClear
            onClear={() => setSearchText('')}
          />
        </AutoComplete>
        <div style={{ width: 1, height: 24, background: '#e8e8e8', margin: '0 4px' }} />
        <Tooltip title={savedFileName ? `保存到：${savedFileName}` : '首次保存需选择文件位置'}>
          <Button
            icon={<SaveOutlined />}
            size="small"
            type="primary"
            onClick={onSave}
          >
            保存
          </Button>
        </Tooltip>
        {savedFileName && (
          <Tag color="blue" style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {savedFileName}
          </Tag>
        )}
        {hasUnsavedChanges && <Tag color="orange">未保存</Tag>}
        <Tooltip title="导入 JSON">
          <Upload
            accept=".json"
            showUploadList={false}
            beforeUpload={handleImport}
          >
            <Button icon={<ImportOutlined />} size="small">
              导入
            </Button>
          </Upload>
        </Tooltip>
        <Tooltip title="导出 JSON">
          <Button icon={<ExportOutlined />} size="small" onClick={onExport}>
            导出
          </Button>
        </Tooltip>
        <Tooltip title="导出欧式/苏式世系表（PDF/文本）">
          <Button icon={<TableOutlined />} size="small" onClick={onExportLineage}>
            世系表
          </Button>
        </Tooltip>
        <div style={{ width: 1, height: 24, background: '#e8e8e8', margin: '0 4px' }} />
        <Tooltip title="放大">
          <Button icon={<ZoomInOutlined />} size="small" onClick={onZoomIn} />
        </Tooltip>
        <Tooltip title="缩小">
          <Button icon={<ZoomOutOutlined />} size="small" onClick={onZoomOut} />
        </Tooltip>
        <Tooltip title="适配视图">
          <Button icon={<FullscreenOutlined />} size="small" onClick={onFitView} />
        </Tooltip>
        <div style={{ width: 1, height: 24, background: '#e8e8e8', margin: '0 4px' }} />
        <Tooltip title="清除选中">
          <Button icon={<UndoOutlined />} size="small" onClick={onClearSelection}>
            清除选中
          </Button>
        </Tooltip>
      </Space>
    </div>
  );
}
