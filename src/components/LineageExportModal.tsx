import { useState, useMemo, useRef, useCallback } from 'react';
import { Modal, Form, Select, Switch, Button, Tabs, Spin, message, Space, Drawer } from 'antd';
import { DownloadOutlined, FilePdfOutlined, FileTextOutlined } from '@ant-design/icons';
import type { FamilyTreeData } from '../types';
import { buildOushiTables, buildSushiTree, formatSushiNodeText } from '../utils/exportLineage';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface LineageExportModalProps {
  open: boolean;
  onClose: () => void;
  data: FamilyTreeData;
  isMobile?: boolean;
}

type ExportFormat = 'oushi' | 'sushi';

const OUSHI_COLUMNS = [
  { key: 'name', label: '姓名' },
  { key: 'generationLabel', label: '世代' },
  { key: 'gender', label: '性别' },
  { key: 'birthYear', label: '出生' },
  { key: 'deathYear', label: '卒年' },
  { key: 'spouses', label: '配偶' },
  { key: 'education', label: '学历' },
  { key: 'deeds', label: '事迹' },
  { key: 'fatherName', label: '父名' },
  { key: 'childrenNames', label: '子名' },
  { key: 'branch', label: '分支' },
];

export default function LineageExportModal({ open, onClose, data, isMobile = false }: LineageExportModalProps) {
  const [form] = Form.useForm();
  const previewRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const format = Form.useWatch('format', form) ?? 'oushi';
  const startGen = Form.useWatch('startGen', form);
  const endGen = Form.useWatch('endGen', form);
  const includeSpouses = Form.useWatch('includeSpouses', form) ?? true;
  const includeDates = Form.useWatch('includeDates', form) ?? true;
  const includeDeeds = Form.useWatch('includeDeeds', form) ?? false;

  // 世代范围
  const genRange = useMemo(() => {
    const gens = data.persons.map((p) => p.generation);
    const min = Math.min(...gens);
    const max = Math.max(...gens);
    return { min, max };
  }, [data]);

  // 构建预览数据
  const previewContent = useMemo(() => {
    if (format === 'oushi') {
      const tables = buildOushiTables(data, startGen, endGen);
      return { type: 'oushi' as const, tables };
    } else {
      const trees = buildSushiTree(data);
      return {
        type: 'sushi' as const,
        trees,
        lines: trees.flatMap((t) =>
          formatSushiNodeText(t, 0, includeSpouses, includeDates, includeDeeds),
        ),
      };
    }
  }, [data, format, startGen, endGen, includeSpouses, includeDates, includeDeeds]);

  // 导出为 PDF
  const handleExportPDF = useCallback(async () => {
    if (!previewRef.current) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(previewRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;

      // A4 尺寸 (mm)
      const pdfWidth = 210;
      const pdfHeight = 297;
      const margin = 10;
      const contentWidth = pdfWidth - margin * 2;
      const scaleFactor = contentWidth / imgWidth;
      const contentHeight = imgHeight * scaleFactor;

      const pdf = new jsPDF('p', 'mm', 'a4');

      // 如果内容超过一页，分页
      const pageContentHeight = pdfHeight - margin * 2;
      let yOffset = 0;
      let page = 0;

      while (yOffset < contentHeight) {
        if (page > 0) pdf.addPage();
        pdf.addImage(
          imgData,
          'PNG',
          margin,
          margin - yOffset,
          contentWidth,
          contentHeight,
        );
        yOffset += pageContentHeight;
        page++;
      }

      const familyName = data.meta.familyName;
      const formatLabel = format === 'oushi' ? '欧式世系表' : '苏式世系表';
      pdf.save(`${familyName}-${formatLabel}-${new Date().toISOString().slice(0, 10)}.pdf`);
      message.success('PDF 导出成功');
    } catch (e) {
      console.error('PDF export failed:', e);
      message.error('PDF 导出失败，请重试');
    } finally {
      setExporting(false);
    }
  }, [data, format]);

  // 导出为纯文本
  const handleExportText = useCallback(() => {
    let text = '';
    const familyName = data.meta.familyName;

    if (format === 'oushi') {
      const tables = buildOushiTables(data, startGen, endGen);
      text += `${familyName}族谱 — 欧式世系表\n`;
      text += '=' .repeat(60) + '\n\n';
      tables.forEach((rows, gen) => {
        text += `【第${gen}世】\n`;
        text += '-'.repeat(60) + '\n';
        // 表头
        const header = OUSHI_COLUMNS.map((c) => c.label).join('\t');
        text += header + '\n';
        text += '-'.repeat(60) + '\n';
        for (const row of rows) {
          const line = OUSHI_COLUMNS.map((c) => (row as any)[c.key] ?? '').join('\t');
          text += line + '\n';
        }
        text += '\n';
      });
    } else {
      const trees = buildSushiTree(data);
      text += `${familyName}族谱 — 苏式世系表\n`;
      text += '=' .repeat(60) + '\n\n';
      for (const tree of trees) {
        const lines = formatSushiNodeText(tree, 0, includeSpouses, includeDates, includeDeeds);
        text += lines.join('\n') + '\n\n';
      }
    }

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const formatLabel = format === 'oushi' ? '欧式世系表' : '苏式世系表';
    a.href = url;
    a.download = `${familyName}-${formatLabel}-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    message.success('文本导出成功');
  }, [data, format, startGen, endGen, includeSpouses, includeDates, includeDeeds]);

  const innerContent = (
    <div style={{ display: 'flex', gap: isMobile ? 0 : 16, flexDirection: isMobile ? 'column' : 'row', height: isMobile ? 'auto' : 520 }}>
      {/* 左侧选项 */}
      <div style={{ width: isMobile ? '100%' : 240, flexShrink: 0 }}>
        <Form
          form={form}
          layout={isMobile ? 'horizontal' : 'vertical'}
          initialValues={{
            format: 'oushi',
            startGen: genRange.min,
            endGen: genRange.max,
            includeSpouses: true,
            includeDates: true,
            includeDeeds: false,
          }}
          size="small"
        >
          <Form.Item name="format" label="格式">
            <Select
              options={[
                { value: 'oushi', label: '欧式（表格）' },
                { value: 'sushi', label: '苏式（横行）' },
              ]}
            />
          </Form.Item>
          {format === 'oushi' && (
            <>
              <Form.Item name="startGen" label="起始世代">
                <Select
                  options={Array.from(
                    { length: genRange.max - genRange.min + 1 },
                    (_, i) => ({
                      value: genRange.min + i,
                      label: `第${genRange.min + i}世`,
                    }),
                  )}
                />
              </Form.Item>
              <Form.Item name="endGen" label="结束世代">
                <Select
                  options={Array.from(
                    { length: genRange.max - genRange.min + 1 },
                    (_, i) => ({
                      value: genRange.min + i,
                      label: `第${genRange.min + i}世`,
                    }),
                  )}
                />
              </Form.Item>
            </>
          )}
          {format === 'sushi' && (
            <>
              <Form.Item name="includeSpouses" label="显示配偶" valuePropName="checked">
                <Switch size="small" />
              </Form.Item>
              <Form.Item name="includeDates" label="显示生卒年" valuePropName="checked">
                <Switch size="small" />
              </Form.Item>
              <Form.Item name="includeDeeds" label="显示事迹" valuePropName="checked">
                <Switch size="small" />
              </Form.Item>
            </>
          )}
        </Form>
        <div style={{ marginTop: 16 }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Button
              icon={<FilePdfOutlined />}
              onClick={handleExportPDF}
              loading={exporting}
              block
            >
              导出 PDF
            </Button>
            <Button
              icon={<FileTextOutlined />}
              onClick={handleExportText}
              block
            >
              导出文本
            </Button>
          </Space>
        </div>
      </div>

      {/* 右侧预览 */}
      <div
        style={{
          flex: 1,
          border: '1px solid #f0f0f0',
          borderRadius: 6,
          overflow: 'auto',
          background: '#fff',
          minHeight: isMobile ? 300 : undefined,
        }}
      >
        <div ref={previewRef} style={{ padding: 16 }}>
          {previewContent.type === 'oushi' ? (
            <OushiPreview tables={previewContent.tables} />
          ) : (
            <SushiPreview lines={previewContent.lines} />
          )}
        </div>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer
        title="导出世系表"
        open={open}
        onClose={onClose}
        placement="bottom"
        height="85vh"
        destroyOnClose
      >
        {innerContent}
      </Drawer>
    );
  }

  return (
    <Modal
      title="导出世系表"
      open={open}
      onCancel={onClose}
      width={900}
      footer={null}
      destroyOnClose
    >
      {innerContent}
    </Modal>
  );
}

/** 欧式表格预览 */
function OushiPreview({ tables }: { tables: Map<number, any[]> }) {
  if (tables.size === 0) {
    return <div style={{ color: '#999', textAlign: 'center', padding: 40 }}>暂无数据</div>;
  }

  const entries = Array.from(tables.entries());

  return (
    <div>
      {entries.map(([gen, rows]) => (
        <div key={gen} style={{ marginBottom: 24 }}>
          <h4 style={{ margin: '8px 0', color: '#8e44ad' }}>【第{gen}世】</h4>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: 12,
            }}
          >
            <thead>
              <tr>
                {OUSHI_COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    style={{
                      border: '1px solid #ddd',
                      padding: '4px 6px',
                      background: '#f5f0ff',
                      textAlign: 'left',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i}>
                  {OUSHI_COLUMNS.map((col) => (
                    <td
                      key={col.key}
                      style={{
                        border: '1px solid #ddd',
                        padding: '4px 6px',
                        whiteSpace: 'nowrap',
                        maxWidth: 120,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {(row as any)[col.key] ?? ''}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

/** 苏式横行预览 */
function SushiPreview({ lines }: { lines: string[] }) {
  if (lines.length === 0) {
    return <div style={{ color: '#999', textAlign: 'center', padding: 40 }}>暂无数据</div>;
  }

  return (
    <div
      style={{
        fontFamily: '"Songti SC", "SimSun", serif',
        fontSize: 14,
        lineHeight: 2,
        whiteSpace: 'pre',
      }}
    >
      {lines.map((line, i) => (
        <div key={i}>{line}</div>
      ))}
    </div>
  );
}
