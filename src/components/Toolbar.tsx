import { Button, Space, Upload, Tooltip, Tag } from 'antd';
import {
  ExportOutlined,
  ImportOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
  FullscreenOutlined,
  UndoOutlined,
  UserAddOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import type { FamilyTreeData } from '../types';

interface ToolbarProps {
  onExport: () => void;
  onImport: (data: FamilyTreeData) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  onClearSelection: () => void;
  onAddRoot: () => void;
  onSave: () => void;
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
  hasUnsavedChanges,
  savedFileName,
}: ToolbarProps) {
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
