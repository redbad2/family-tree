import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { ConfigProvider, Layout, theme, message, Button, Drawer } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { ClockCircleOutlined, RightOutlined, LeftOutlined } from '@ant-design/icons';
import FamilyTreeGraph from './components/FamilyTreeGraph';
import PersonDetail from './components/PersonDetail';
import PersonForm from './components/PersonForm';
import KinshipPanel from './components/KinshipPanel';
import Toolbar from './components/Toolbar';
import Timeline from './components/Timeline';
import StatisticsPanel from './components/StatisticsPanel';
import LineageExportModal from './components/LineageExportModal';
import FilterPanel from './components/FilterPanel';
import { sampleFamilyTree } from './data/sample';
import type { FamilyTreeData, KinshipResult, SiderMode, ViewMode } from './types';
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
import { exportToGedcom, parseGedcom } from './utils/gedcom';
import { useIsMobile } from './hooks/useIsMobile';
import { useUndoableState } from './hooks/useUndoableState';

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

/** 右侧面板内容（桌面 & 移动端共用） */
function RightPanelContent({
  siderMode,
  selectedPerson,
  parentName,
  childrenNames,
  siblingIndex,
  siblingCount,
  selectedIds,
  kinshipResult,
  personA,
  personB,
  treeData,
  rangeStart,
  rangeEnd,
  branches,
  handleAddChild,
  handleEdit,
  handleDelete,
  handleAddRoot,
  handleMoveUp,
  handleMoveDown,
  handleTraceAncestors,
  handleFormSubmit,
  handleFormCancel,
  handleFilterSelect,
}: {
  siderMode: SiderMode;
  selectedPerson: any;
  parentName: string | null;
  childrenNames: string[];
  siblingIndex: number;
  siblingCount: number;
  selectedIds: string[];
  kinshipResult: KinshipResult | null;
  personA: any;
  personB: any;
  treeData: FamilyTreeData;
  rangeStart: number;
  rangeEnd: number;
  branches: string[];
  handleAddChild: () => void;
  handleEdit: () => void;
  handleDelete: () => void;
  handleAddRoot: () => void;
  handleMoveUp: () => void;
  handleMoveDown: () => void;
  handleTraceAncestors: (id: string) => void;
  handleFormSubmit: (values: any) => void;
  handleFormCancel: () => void;
  handleFilterSelect: (personId: string) => void;
}) {
  return (
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
            onTraceAncestors={handleTraceAncestors}
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
          <FilterPanel
            persons={treeData.persons}
            onSelect={handleFilterSelect}
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
  );
}

export default function App() {
  const isMobile = useIsMobile();

  const {
    state: treeData,
    setState: setTreeData,
    undo,
    redo,
    canUndo,
    canRedo,
    reset: resetTreeData,
  } = useUndoableState<FamilyTreeData>(
    loadFromStorage() ?? sampleFamilyTree,
  );
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [kinshipResult, setKinshipResult] = useState<KinshipResult | null>(null);
  const [siderMode, setSiderMode] = useState<SiderMode>('view');
  const [ancestorPathId, setAncestorPathId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('tree');

  const savedDataRef = useRef<string>(JSON.stringify(treeData));
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [savedFileName, setSavedFileName] = useState<string | undefined>(undefined);
  const [leftSiderCollapsed, setLeftSiderCollapsed] = useState(false);
  const [leftSiderWidth, setLeftSiderWidth] = useState(260);
  const leftSiderDragRef = useRef(false);
  const [rightSiderCollapsed, setRightSiderCollapsed] = useState(true);
  const [lineageExportOpen, setLineageExportOpen] = useState(false);
  const [showLeafMark, setShowLeafMark] = useState(false);
  const [showIncompleteMark, setShowIncompleteMark] = useState(false);
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

  // 防抖自动保存到 localStorage，刷新不丢失
  useEffect(() => {
    const t = setTimeout(() => saveToStorage(treeData), 800);
    return () => clearTimeout(t);
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
    setAncestorPathId(null); // 用户点别的节点时清除祖先路径
    setSiderMode('view');
    setRightSiderCollapsed(false);
  }, []);

  const handleKinshipResult = useCallback((result: KinshipResult | null) => {
    setKinshipResult(result);
  }, []);

  const handleTraceAncestors = useCallback((personId: string) => {
    setAncestorPathId(personId);
    setSelectedIds([personId]);
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
      saveToStorage(treeData); // 同步到 localStorage
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
    resetTreeData(data);
    setSelectedIds([]);
    setKinshipResult(null);
    setSiderMode('view');
    setSavedFileName(undefined);
    removeStoredFileHandle();
    savedDataRef.current = JSON.stringify(data);
    setHasUnsavedChanges(false);
    message.success('导入成功');
  }, [resetTreeData]);

  const handleExportGedcom = useCallback(() => {
    try {
      const gedcom = exportToGedcom(treeData);
      const blob = new Blob([gedcom], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = '族谱-' + treeData.meta.familyName + '-' + new Date().toISOString().slice(0, 10) + '.ged';
      a.click();
      URL.revokeObjectURL(url);
      message.success('GEDCOM 导出成功');
    } catch (e) {
      message.error('GEDCOM 导出失败');
    }
  }, [treeData]);

  const handleImportGedcom = useCallback((text: string) => {
    try {
      const data = parseGedcom(text);
      const errors = validateFamilyTreeData(data);
      if (errors.length > 0) {
        alert('GEDCOM 导入后有数据校验警告:\n' + errors.join('\n') + '\n\n已导入数据，请手动核对。');
      }
      resetTreeData(data);
      setSelectedIds([]);
      setKinshipResult(null);
      setSiderMode('view');
      setSavedFileName(undefined);
      removeStoredFileHandle();
      savedDataRef.current = JSON.stringify(data);
      setHasUnsavedChanges(false);
      message.success(`GEDCOM 导入成功（${data.persons.length}人）`);
    } catch (e) {
      message.error('GEDCOM 解析失败: ' + (e as Error).message);
    }
  }, [resetTreeData]);

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

  // 撤销/重做键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 不在输入框/文本域中时才响应
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
      const isUndo = (e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey;
      const isRedo = (e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey));
      if (isUndo) { e.preventDefault(); undo(); }
      else if (isRedo) { e.preventDefault(); redo(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  // 共享的面板 props
  const panelProps = {
    siderMode,
    selectedPerson,
    parentName,
    childrenNames,
    siblingIndex,
    siblingCount,
    selectedIds,
    kinshipResult,
    personA,
    personB,
    treeData,
    rangeStart,
    rangeEnd,
    branches,
    handleAddChild,
    handleEdit,
    handleDelete,
    handleAddRoot,
    handleMoveUp,
    handleMoveDown,
    handleTraceAncestors,
    handleFormSubmit,
    handleFormCancel,
    handleFilterSelect: handleSearchSelect,
  };

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
          onExportLineage={() => setLineageExportOpen(true)}
          showLeafMark={showLeafMark}
          showIncompleteMark={showIncompleteMark}
          onToggleLeafMark={() => setShowLeafMark(prev => !prev)}
          onToggleIncompleteMark={() => setShowIncompleteMark(prev => !prev)}
          persons={treeData.persons}
          hasUnsavedChanges={hasUnsavedChanges}
          savedFileName={savedFileName}
          isMobile={isMobile}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onUndo={undo}
          onRedo={redo}
          canUndo={canUndo}
          canRedo={canRedo}
          onExportGedcom={handleExportGedcom}
          onImportGedcom={handleImportGedcom}
        />

        {isMobile ? (
          /* ========== 移动端布局 ========== */
          <Content style={{ position: 'relative', background: '#f5f5f5' }}>
            <FamilyTreeGraph
              data={treeData}
              selectedIds={selectedIds}
              currentYear={currentYear}
              ancestorPathId={ancestorPathId}
              showLeafMark={showLeafMark}
              showIncompleteMark={showIncompleteMark}
              viewMode={viewMode}
              onNodeSelect={handleNodeSelect}
              onKinshipResult={handleKinshipResult}
            />
          </Content>
        ) : (
          /* ========== 桌面端布局 ========== */
          <Layout hasSider style={{ flexDirection: 'row' }}>
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
                ancestorPathId={ancestorPathId}
                showLeafMark={showLeafMark}
                showIncompleteMark={showIncompleteMark}
                viewMode={viewMode}
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
              <RightPanelContent {...panelProps} />
            </div>
          </Layout>
        )}
      </Layout>

      {/* 移动端底部抽屉 */}
      {isMobile && (
        <Drawer
          placement="bottom"
          height="60vh"
          open={!rightSiderCollapsed}
          onClose={() => setRightSiderCollapsed(true)}
          title={selectedPerson?.name ?? '人物详情'}
          styles={{ body: { padding: 0, overflowY: 'auto' } }}
        >
          <RightPanelContent {...panelProps} />
        </Drawer>
      )}

      <LineageExportModal
        open={lineageExportOpen}
        onClose={() => setLineageExportOpen(false)}
        data={treeData}
        isMobile={isMobile}
      />
    </ConfigProvider>
  );
}
