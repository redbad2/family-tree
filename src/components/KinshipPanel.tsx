import { Card, Descriptions, Tag, Empty } from 'antd';
import type { KinshipResult, Person } from '../types';

interface KinshipPanelProps {
  result: KinshipResult | null;
  personA: Person | null;
  personB: Person | null;
}

export default function KinshipPanel({ result, personA, personB }: KinshipPanelProps) {
  if (!result || !personA || !personB) {
    return (
      <Card title="亲属关系" size="small" style={{ marginTop: 16 }}>
        <Empty description="按住 Ctrl/Cmd 点击两个节点查看亲属关系" />
      </Card>
    );
  }

  return (
    <Card title="亲属关系" size="small" style={{ marginTop: 16 }}>
      <Descriptions bordered size="small" column={1} labelStyle={{ width: 100 }}>
        <Descriptions.Item label="人物 A">
          <Tag color="blue">{personA.name}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="人物 B">
          <Tag color="green">{personB.name}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="A 称 B">
          <Tag color="orange" style={{ fontSize: 16, padding: '4px 12px' }}>
            {result.titleAToB}
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item label="B 称 A">
          <Tag color="purple" style={{ fontSize: 16, padding: '4px 12px' }}>
            {result.titleBToA}
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item label="最近共祖">
          {result.lcaId}
        </Descriptions.Item>
        <Descriptions.Item label="最短路径">
          <span style={{ fontSize: 12, wordBreak: 'break-all' }}>
            {result.path.join(' → ')}
          </span>
        </Descriptions.Item>
      </Descriptions>
    </Card>
  );
}
