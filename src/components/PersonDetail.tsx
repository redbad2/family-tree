import { Descriptions, Tag, Empty, Button, Space, Popconfirm, Tooltip } from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, UserAddOutlined,
  ArrowUpOutlined, ArrowDownOutlined,
} from '@ant-design/icons';
import type { Person } from '../types';
import { calculateLifespan, generationLabel } from '../utils/tree';

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
}

const SPOUSE_TYPE_COLOR: Record<string, string> = {
  '正室': 'gold',
  '续弦': 'blue',
  '侧室': 'green',
  '妾': 'orange',
  '其他': 'default',
};

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
          {person.birthDate ?? '不详'}
        </Descriptions.Item>
        <Descriptions.Item label="去世">
          {person.deathDate ?? '不详'}
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
              if (s.birthDate) dateParts.push(s.birthDate);
              if (s.deathDate) dateParts.push('—' + s.deathDate);
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
    </div>
  );
}
