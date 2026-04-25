import { useEffect } from 'react';
import {
  Form,
  Input,
  Radio,
  Select,
  Button,
  Space,
  Divider,
  Card,
} from 'antd';
import { PlusOutlined, MinusCircleOutlined } from '@ant-design/icons';
import { Checkbox } from 'antd';
import type { Person, Spouse, Gender, SiderMode } from '../types';
import { generateSpouseId } from '../utils/mutations';
import { generationLabel } from '../utils/tree';

const DATE_PATTERN = /^(\d{4}|\d{4}-\d{2}|\d{4}-\d{2}-\d{2})$/;
const DATE_VALIDATOR = (_: any, value: string) => {
  if (!value || !value.trim()) return Promise.resolve();
  if (DATE_PATTERN.test(value.trim())) return Promise.resolve();
  return Promise.reject(new Error('格式：YYYY 或 YYYY-MM 或 YYYY-MM-DD'));
};

interface PersonFormProps {
  mode: SiderMode;
  parentPerson?: Person | null;
  person?: Person | null;
  existingBranches: string[];
  onSubmit: (values: any) => void;
  onCancel: () => void;
}

const SPOUSE_TYPES = [
  { value: '正室', label: '正室' },
  { value: '续弦', label: '续弦' },
  { value: '侧室', label: '侧室' },
  { value: '妾', label: '妾' },
  { value: '其他', label: '其他' },
];

const MODE_TITLES: Record<string, string> = {
  'add-child': '添加子女',
  'add-root': '添加始祖',
  'edit': '编辑人物',
};

export default function PersonForm({
  mode,
  parentPerson,
  person,
  existingBranches,
  onSubmit,
  onCancel,
}: PersonFormProps) {
  const [form] = Form.useForm();

  // 编辑模式下初始化表单
  useEffect(() => {
    if (mode === 'edit' && person) {
      form.setFieldsValue({
        name: person.name,
        gender: person.gender,
        generation: person.generation,
        branch: person.branch ?? undefined,
        birthDate: person.birthDate ?? '',
        deathDate: person.deathDate ?? '',
        education: person.education ?? '',
        deeds: person.deeds ?? '',
        needsVerification: person.needsVerification,
        migrationLocation: person.migrationLocation ?? '',
        spouses: person.spouses.map((s) => ({ name: s.name, type: s.type, birthDate: s.birthDate ?? '', deathDate: s.deathDate ?? '' })),
      });
    } else if (mode === 'add-child' && parentPerson) {
      form.setFieldsValue({
        name: '',
        gender: 'male',
        generation: parentPerson.generation + 1,
        branch: parentPerson.branch ?? undefined,
        birthDate: '',
        deathDate: '',
        education: '',
        deeds: '',
        needsVerification: false,
        migrationLocation: '',
        spouses: [],
      });
    } else if (mode === 'add-root') {
      form.setFieldsValue({
        name: '',
        gender: 'male',
        generation: 1,
        branch: undefined,
        birthDate: '',
        deathDate: '',
        education: '',
        deeds: '',
        needsVerification: false,
        migrationLocation: '',
        spouses: [],
      });
    }
  }, [mode, person, parentPerson, form]);

  const handleFinish = (values: any) => {
    const spouses: Spouse[] = (values.spouses || []).map(
      (s: { name: string; type: string; birthDate?: string; deathDate?: string }) => ({
        id: generateSpouseId(),
        name: s.name,
        type: s.type as Spouse['type'],
        birthDate: s.birthDate?.trim() || null,
        deathDate: s.deathDate?.trim() || null,
      }),
    );

    onSubmit({
      name: values.name,
      gender: values.gender,
      generation: values.generation,
      branch: values.branch || null,
      birthDate: values.birthDate?.trim() || null,
      deathDate: values.deathDate?.trim() || null,
      education: values.education || null,
      deeds: values.deeds || null,
      needsVerification: !!values.needsVerification,
      migrationLocation: values.migrationLocation?.trim() || null,
      spouses,
    });
  };

  return (
    <Card
      title={MODE_TITLES[mode] || '编辑'}
      size="small"
      extra={
        <Button size="small" onClick={onCancel}>
          取消
        </Button>
      }
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        size="small"
      >
        <Form.Item
          name="name"
          label="姓名"
          rules={[{ required: true, message: '请输入姓名' }]}
        >
          <Input placeholder="请输入姓名" />
        </Form.Item>

        <Form.Item name="gender" label="性别" rules={[{ required: true }]}>
          <Radio.Group>
            <Radio value="male">男</Radio>
            <Radio value="female">女</Radio>
          </Radio.Group>
        </Form.Item>

        <Form.Item name="generation" label="世代">
          <Input disabled addonAfter={form.getFieldValue('generation') ? generationLabel(form.getFieldValue('generation')) : ''} />
        </Form.Item>

        <Form.Item name="branch" label="分支">
          <Select
            allowClear
            showSearch
            placeholder="选择已有分支或输入新分支名"
            options={existingBranches.map((b) => ({ value: b, label: b }))}
            filterOption={(input, option) => (option?.label ?? '').includes(input)}
            dropdownRender={(menu) => (
              <>
                {menu}
                <div style={{ padding: '4px 8px', borderTop: '1px solid #f0f0f0' }}>
                  <Input
                    placeholder="输入新分支名后回车"
                    size="small"
                    onPressEnter={(e) => {
                      const val = (e.target as HTMLInputElement).value.trim();
                      if (val && !existingBranches.includes(val)) {
                        form.setFieldValue('branch', val);
                      }
                    }}
                  />
                </div>
              </>
            )}
          />
        </Form.Item>

        <Form.Item name="birthDate" label="出生日期" rules={[{ validator: DATE_VALIDATOR }]}>
          <Input placeholder="如：1368 或 1368-03 或 1368-03-15" />
        </Form.Item>

        <Form.Item name="deathDate" label="去世日期" rules={[{ validator: DATE_VALIDATOR }]}>
          <Input placeholder="如：1435 或 1435-08 或 1435-08-20" />
        </Form.Item>

        <Form.Item name="education" label="学历">
          <Input placeholder="如：进士、举人、秀才" />
        </Form.Item>

        <Form.Item name="deeds" label="事迹">
          <Input.TextArea rows={3} placeholder="请输入事迹" />
        </Form.Item>

        <Form.Item name="migrationLocation" label="迁移地">
          <Input placeholder="如：北京、上海、广东" />
        </Form.Item>

        <Form.Item name="needsVerification" valuePropName="checked">
          <Checkbox style={{ color: '#e74c3c', fontWeight: 600 }}>
            待勘误（该节点信息存疑，需要核实）
          </Checkbox>
        </Form.Item>

        <Divider orientation="left" style={{ fontSize: 13, margin: '8px 0 12px' }}>
          配偶信息
        </Divider>

        <Form.List name="spouses">
          {(fields, { add, remove }) => (
            <>
              {fields.map(({ key, name, ...restField }) => (
                <Space key={key} style={{ display: 'flex', marginBottom: 4, flexWrap: 'wrap' }} align="baseline">
                  <Form.Item
                    {...restField}
                    name={[name, 'name']}
                    rules={[{ required: true, message: '姓名' }]}
                    style={{ marginBottom: 0 }}
                  >
                    <Input placeholder="配偶姓名" style={{ width: 100 }} />
                  </Form.Item>
                  <Form.Item
                    {...restField}
                    name={[name, 'type']}
                    initialValue={SPOUSE_TYPES[0].value}
                    style={{ marginBottom: 0 }}
                  >
                    <Select options={SPOUSE_TYPES} style={{ width: 72 }} />
                  </Form.Item>
                  <Form.Item
                    {...restField}
                    name={[name, 'birthDate']}
                    rules={[{ validator: DATE_VALIDATOR }]}
                    style={{ marginBottom: 0 }}
                  >
                    <Input placeholder="出生" style={{ width: 90 }} />
                  </Form.Item>
                  <Form.Item
                    {...restField}
                    name={[name, 'deathDate']}
                    rules={[{ validator: DATE_VALIDATOR }]}
                    style={{ marginBottom: 0 }}
                  >
                    <Input placeholder="去世" style={{ width: 90 }} />
                  </Form.Item>
                  <MinusCircleOutlined
                    onClick={() => remove(name)}
                    style={{ color: '#ff4d4f' }}
                  />
                </Space>
              ))}
              <Button
                type="dashed"
                onClick={() => add()}
                block
                icon={<PlusOutlined />}
                style={{ marginBottom: 12 }}
              >
                添加配偶
              </Button>
            </>
          )}
        </Form.List>

        <Form.Item style={{ marginBottom: 0, marginTop: 8 }}>
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button onClick={onCancel}>取消</Button>
            <Button type="primary" htmlType="submit">
              保存
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );
}
