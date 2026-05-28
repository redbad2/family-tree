import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { ConfigProvider, Layout, theme, message, Button } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { ClockCircleOutlined, RightOutlined, LeftOutlined } from '@ant-design/icons';
import FamilyTreeGraph from './components/FamilyTreeGraph';
import PersonDetail from './components/PersonDetail';
import PersonForm from './components/PersonForm';
import KinshipPanel from './components/KinshipPanel';
import Toolbar from './components/Toolbar';
import Timeline from './components/Timeline';
import StatisticsPanel from './components/StatisticsPanel';
import { sampleFamilyTree } from './data/sample';
import type { FamilyTreeData, KinshipResult, SiderMode } from './types';
import {
  buildPersonMap,
  buildChildrenMap,
  getChildren,
  validateFamilyTreeData,
  getBranchNames,
  getYear,
} from './utils/tree';
import {
  addChildPerson,
  addRootPerson,
  updatePerson,
  deletePerson as deletePersonMutation,
  movePersonAmongSiblings,
} from './utils/mutations';
import { saveToDisk, removeStoredFileHandle } from './utils/fileSystem';

const { Content } = Layout;

const RIGHT_SIDER_WIDTH = 380;

const STORAGE_KEY = 'family-tree-data';

function loadFromStorage(): FamilyTreeData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as FamilyTreeData;
  } catch {}
  return null;
}

function saveToStorage(data: FamilyTreeData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('\u4fdd\u5b58\u5931\u8d25', e);
  }
}

function getGraphInstance() {
  return (window as any).__familyTreeGraph;
}

export default function App() {
  const [treeData, setTreeData] = useState<FamilyTreeData>(() => {
    return sampleFamilyTree;
  });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [kinshipResult, setKinshipResult] = useState<KinshipResult | null>(null);
  const [siderMode, setSiderMode] = useState<SiderMode>('view');

  const savedDataRef = useRef<string>(JSON.stringify(treeData));
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [savedFileName, setSavedFileName] = useState<string | undefined>(undefined);
  const [leftSiderCollapsed, setLeftSiderCollapsed] = useState(false);
  const [leftSiderWidth, setLeftSiderWidth] = useState(260);
  const leftSiderDragRef = useRef(false);
  const [rightSiderCollapsed, setRightSiderCollapsed] = useState(true);
  const handleToggleRightSider = useCallback(() => {
    setRightSiderCollapsed(prev => !prev);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!leftSiderDragRef.current) return;
      const newWidth = Math.max(180, Math.min(500, e.clientX));
      setLeftSiderWidth(newWidth);
    };
    const handleMouseUp = () => {
      leftSiderDragRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  useEffect(() => {
    const current = JSON.stringify(treeData);
    setHasUnsavedChanges(current !== savedDataRef.current);
  }, [treeData]);

  const [currentYear, setCurrentYear] = useState<number | null>(null);
  const [rangeStart, setRangeStart] = useState<number>(1368);
  const [rangeEnd, setRangeEnd] = useState<number>(1510);

  const personMap = buildPersonMap(treeData.persons);
  const childrenMap = buildChildrenMap(treeData.persons);
  const branches = useMemo(() => getBranchNames(treeData.persons), [treeData.persons]);

  const { minYear, maxYear } = useMemo(() => {
    let min = 3000;
    let max = 0;
    for (const p of treeData.persons) {
      const birthYear = getYear(p.birthDate);
      const deathYear = getYear(p.deathDate);
      if (birthYear != null) {
        if (birthYear < min) min = birthYear;
        if (birthYear > max) max = birthYear;
      }
      if (deathYear != null && deathYear > max) {
        max = deathYear;
      }
    }
    return { minYear: min, maxYear: max };
  }, [treeData]);

  // 数据变化时，自动同步时间范围到实际数据的年份范围
  useEffect(() => {
    if (minYear <= maxYear) {
      setRangeStart(minYear);
      setRangeEnd(maxYear);
      if (currentYear == null || currentYear < minYear || currentYear > maxYear) {
        setCurrentYear(minYear);
      }
    }
  }, [minYear, maxYear]);

  const selectedPerson = selectedIds.length >= 1 ? personMap.get(selectedIds[0]) ?? null : null;
  const siblingIndex = selectedPerson?.parentId
    ? treeData.persons.filter((p) => p.parentId === selectedPerson.parentId).findIndex((p) => p.id === selectedPerson.id)
    : -1;
  const siblingCount = selectedPerson?.parentId
    ? treeData.persons.filter((p) => p.parentId === selectedPerson.parentId).length
    : 0;
  const parentName = selectedPerson?.parentId
    ? personMap.get(selectedPerson.parentId)?.name ?? null
    : null;
  const childrenNames = selectedPerson
    ? getChildren(selectedPerson.id, childrenMap).map((id) => personMap.get(id)?.name ?? id)
    : [];

  const personA = selectedIds.length >= 1 ? personMap.get(selectedIds[0]) ?? null : null;
  const personB = selectedIds.length >= 2 ? personMap.get(selectedIds[1]) ?? null : null;

  const handleNodeSelect = useCallback((id: string, multi: boolean) => {
    if (multi) {
      setSelectedIds((prev) => {
        if (prev.includes(id)) return prev.filter((i) => i !== id);
        if (prev.length >= 2) return [prev[1], id];
        return [...prev, id];
      });
    } else {
      setSelectedIds([id]);
      setKinshipResult(null);
    }
    setSiderMode('view');
    setRightSiderCollapsed(false);
  }, []);

  const handleKinshipResult = useCallback((result: KinshipResult | null) => {
    setKinshipResult(result);
  }, []);

  const handleSearchSelect = useCallback((personId: string) => {
    setSelectedIds([personId]);
    setKinshipResult(null);
    setSiderMode('view');
    setRightSiderCollapsed(false);
  }, []);

  const handleExport = useCallback(() => {
    const json = JSON.stringify(treeData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '族谱-' + treeData.meta.familyName + '-' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [treeData]);

  const handleSave = useCallback(async () => {
    const result = await saveToDisk(treeData);
    if (result.success) {
      savedDataRef.current = JSON.stringify(treeData);
      setHasUnsavedChanges(false);
      if (result.fileName) setSavedFileName(result.fileName);
      message.success(result.message);
    } else {
      message.warning(result.message);
    }
  }, [treeData]);

  const handleImport = useCallback((data: FamilyTreeData) => {
    const errors = validateFamilyTreeData(data);
    if (errors.length > 0) {
      alert('数据校验失败:\n' + errors.join('\n'));
      return;
    }
    setTreeData(data);
    setSelectedIds([]);
    setKinshipResult(null);
    setSiderMode('view');
    setSavedFileName(undefined);
    removeStoredFileHandle();
    savedDataRef.current = JSON.stringify(data);
    setHasUnsavedChanges(false);
    message.success('导入成功');
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedIds([]);
    setKinshipResult(null);
  }, []);

  const handleToggleLeftSider = useCallback(() => {
    setLeftSiderCollapsed(prev => !prev);
  }, []);

  const handleZoomIn = useCallback(() => {
    const graph = getGraphInstance();
    if (graph) graph.zoomBy(1.2);
  }, []);

  const handleZoomOut = useCallback(() => {
    const graph = getGraphInstance();
    if (graph) graph.zoomBy(0.8);
  }, []);

  const handleFitView = useCallback(() => {
    const graph = getGraphInstance();
    if (graph) graph.fitView();
  }, []);

  const handleCurrentYearChange = useCallback((year: number) => {
    setCurrentYear(year);
    setSelectedIds([]);
    setKinshipResult(null);
    setSiderMode('view');
  }, []);

  const handleRangeChange = useCallback((start: number, end: number) => {
    setRangeStart(start);
    setRangeEnd(end);
  }, []);

  // ---- CRUD ----

  const handleAddChild = useCallback(() => {
    if (!selectedPerson) return;
    setSiderMode('add-child');
  }, [selectedPerson]);

  const handleAddRoot = useCallback(() => {
    setSiderMode('add-root');
  }, []);

  const handleEdit = useCallback(() => {
    if (!selectedPerson) return;
    setSiderMode('edit');
  }, [selectedPerson]);

  const handleDelete = useCallback(() => {
    if (!selectedPerson) return;
    const result = deletePersonMutation(treeData, selectedPerson.id);
    if (!result.success) {
      message.warning(result.message);
      return;
    }
    setTreeData(result.data);
    // 删除后不清除选中，而是选中其父节点（如果有），保持视图连贯
    // 与编辑节点保持一致：操作后不重置视图状态
    if (selectedPerson.parentId) {
      setSelectedIds([selectedPerson.parentId]);
    } else {
      setSelectedIds([]);
    }
    setSiderMode('view');
    message.success('删除成功');
  }, [selectedPerson, treeData]);

  const handleFormSubmit = useCallback(
    (values: any) => {
      if (siderMode === 'add-child' && selectedPerson) {
        const newData = addChildPerson(treeData, selectedPerson.id, values);
        setTreeData(newData);
        // 保持选中当前节点（父节点），不切换到新节点
        setSelectedIds([selectedPerson.id]);
      } else if (siderMode === 'add-root') {
        const newData = addRootPerson(treeData, values);
        setTreeData(newData);
        const newPerson = newData.persons[newData.persons.length - 1];
        setSelectedIds([newPerson.id]);
      } else if (siderMode === 'edit' && selectedPerson) {
        const newData = updatePerson(treeData, selectedPerson.id, values);
        setTreeData(newData);
      }
      setSiderMode('view');
    },
    [siderMode, selectedPerson, treeData],
  );

  const handleMoveUp = useCallback(() => {
    if (!selectedPerson) return;
    const newData = movePersonAmongSiblings(treeData, selectedPerson.id, 'up');
    setTreeData(newData);
  }, [selectedPerson, treeData]);

  const handleMoveDown = useCallback(() => {
    if (!selectedPerson) return;
    const newData = movePersonAmongSiblings(treeData, selectedPerson.id, 'down');
    setTreeData(newData);
  }, [selectedPerson, treeData]);

  const handleFormCancel = useCallback(() => {
    setSiderMode('view');
  }, []);

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: { colorPrimary: '#8e44ad' },
      }}
    >
      <Layout style={{ height: '100vh' }}>
        <Toolbar
          onExport={handleExport}
          onImport={handleImport}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onFitView={handleFitView}
          onClearSelection={handleClearSelection}
          onAddRoot={handleAddRoot}
          onSave={handleSave}
          onSearchSelect={handleSearchSelect}
          persons={treeData.persons}
          hasUnsavedChanges={hasUnsavedChanges}
          savedFileName={savedFileName}
        />
        <Layout>
            <div style={{ display: 'flex', height: '100%' }}>
            {/* 左侧 Sider */}
            <div
              style={{
                width: leftSiderCollapsed ? 0 : leftSiderWidth,
                minWidth: leftSiderCollapsed ? 0 : leftSiderWidth,
                transition: leftSiderDragRef.current ? 'none' : 'width 0.2s, min-width 0.2s',
                overflow: 'hidden',
                borderRight: leftSiderCollapsed ? 'none' : '1px solid #f0f0f0',
                background: '#fff',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <Timeline
                minYear={minYear}
                maxYear={maxYear}
                currentYear={currentYear ?? minYear}
                rangeStart={rangeStart}
                rangeEnd={rangeEnd}
                persons={treeData.persons}
                onCurrentYearChange={handleCurrentYearChange}
                onRangeChange={handleRangeChange}
              />
            </div>
            {/* 拖拽调整宽度的分隔条 */}
            {!leftSiderCollapsed && (
              <div
                style={{
                  width: 4,
                  minWidth: 4,
                  cursor: 'col-resize',
                  background: 'transparent',
                  position: 'relative',
                  zIndex: 10,
                }}
                onMouseDown={() => {
                  leftSiderDragRef.current = true;
                  document.body.style.cursor = 'col-resize';
                  document.body.style.userSelect = 'none';
                }}
              />
            )}
            {/* 收起/展开按钮 */}
            <div
              onClick={handleToggleLeftSider}
              style={{
                width: 20,
                minWidth: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                background: '#fafafa',
                borderRight: '1px solid #f0f0f0',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f0f0f0';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#fafafa';
              }}
            >
              {leftSiderCollapsed ? (
                <RightOutlined style={{ fontSize: 12, color: '#8e44ad' }} />
              ) : (
                <LeftOutlined style={{ fontSize: 12, color: '#8e44ad' }} />
              )}
            </div>
          </div>
          <Content style={{ position: 'relative', background: '#f5f5f5' }}>
            <FamilyTreeGraph
              data={treeData}
              selectedIds={selectedIds}
              currentYear={currentYear}
              onNodeSelect={handleNodeSelect}
              onKinshipResult={handleKinshipResult}
            />
          </Content>
          {/* 右侧收起/展开按钮 */}
          <div
            onClick={handleToggleRightSider}
            style={{
              width: 20,
              minWidth: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              background: '#fafafa',
              borderLeft: '1px solid #f0f0f0',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f0f0f0';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#fafafa';
            }}
          >
            {rightSiderCollapsed ? (
              <LeftOutlined style={{ fontSize: 12, color: '#8e44ad' }} />
            ) : (
              <RightOutlined style={{ fontSize: 12, color: '#8e44ad' }} />
            )}
          </div>
          {/* 右侧面板 */}
          <div
            style={{
              width: rightSiderCollapsed ? 0 : RIGHT_SIDER_WIDTH,
              minWidth: rightSiderCollapsed ? 0 : RIGHT_SIDER_WIDTH,
              transition: 'width 0.2s, min-width 0.2s',
              overflow: 'hidden',
              borderLeft: rightSiderCollapsed ? 'none' : '1px solid #f0f0f0',
              background: '#fff',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ padding: 16, overflowY: 'auto', flex: 1 }}>
              {siderMode === 'view' && (
                <>
                  <PersonDetail
                    person={selectedPerson}
                    parentName={parentName}
                    childrenNames={childrenNames}
                    siblingIndex={siblingIndex}
                    siblingCount={siblingCount}
                    onAddChild={handleAddChild}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onAddRoot={handleAddRoot}
                    onMoveUp={handleMoveUp}
                    onMoveDown={handleMoveDown}
                    hasSelection={selectedIds.length > 0}
                  />
                  {selectedIds.length >= 2 && (
                    <KinshipPanel
                      result={kinshipResult}
                      personA={personA}
                      personB={personB}
                    />
                  )}
                  <StatisticsPanel
                    persons={treeData.persons}
                    rangeStart={rangeStart}
                    rangeEnd={rangeEnd}
                    basePersonId={selectedIds[0] ?? null}
                  />
                </>
              )}
              {(siderMode === 'add-child' || siderMode === 'add-root' || siderMode === 'edit') && (
                <PersonForm
                  mode={siderMode}
                  parentPerson={siderMode === 'add-child' ? selectedPerson : null}
                  person={siderMode === 'edit' ? selectedPerson : null}
                  existingBranches={branches}
                  onSubmit={handleFormSubmit}
                  onCancel={handleFormCancel}
                />
              )}
            </div>
          </div>
        </Layout>
      </Layout>
    </ConfigProvider>
  );
}
