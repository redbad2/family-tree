import { useEffect, useRef, useState } from 'react';
import { Graph, treeToGraphData, register, Rect } from '@antv/g6';
import type { Point } from '@antv/g6';
import { Text } from '@antv/g';
import type { Group } from '@antv/g';
import type { Person, FamilyTreeData, KinshipResult, ViewMode } from '../types';
import {
  buildPersonMap,
  buildChildrenMap,
  findShortestPath,
  getAncestors,
  getParent,
  getChildren,
  getYear,
} from '../utils/tree';
import { calculateKinship } from '../utils/kinship';

interface FamilyTreeGraphProps {
  data: FamilyTreeData;
  selectedIds: string[];
  currentYear: number | null;
  /** 祖先路径回溯的起始节点 ID，设置后高亮该节点到始祖的直系祖先链 */
  ancestorPathId: string | null;
  /** 显示无后代叶子节点标记 */
  showLeafMark: boolean;
    /** 显示待补/待勘误节点标记 */
  showIncompleteMark: boolean;
  /** 视图模式：tree=标准树形, pagoda=宝塔图, radial=扇形图 */
  viewMode: ViewMode;
  onNodeSelect: (id: string, multi: boolean) => void;
  onKinshipResult: (result: KinshipResult | null) => void;
}

const DEFAULT_COLOR = '#7f8c8d';
const FEMALE_COLOR = '#ad1457';
const ANIMATION_NODE_THRESHOLD = 200;

function getBranchColor(branch: string | null): string {
  if (!branch) return DEFAULT_COLOR;
  let hash = 0x811c9dc5;
  for (let i = 0; i < branch.length; i++) {
    hash ^= branch.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  const hue = (hash >>> 0) % 340;
  return `hsl(${hue}, 55%, 50%)`;
}

let registered = false;

function ensureCustomNodeRegistered() {
  if (registered) return;

  class FamilyNode extends Rect {
    protected drawLabelShape(attributes: any, container: Group): void {
      const name = attributes.personName || '';
      const subText = attributes.personSubText || '';
      const hasChildren = attributes.hasChildren || false;
      const collapsed = attributes.collapsed || false;
      const needsVerification = attributes.needsVerification || false;

      this.upsert('label-name', Text, {
        text: name, x: 0, y: hasChildren ? -7 : -3,
        fontSize: 13, fontWeight: 700, fill: '#ffffff',
        textAlign: 'center', textBaseline: 'middle',
      }, container);

      this.upsert('label-sub', Text, {
        text: subText, x: 0, y: hasChildren ? 10 : 12,
        fontSize: 10, fill: 'rgba(255,255,255,0.75)',
        textAlign: 'center', textBaseline: 'middle',
      }, container);

      if (hasChildren) {
        this.upsert('collapse-badge', Text, {
          text: collapsed ? '+' : '-',
          x: 56, y: 0, fontSize: 12, fontWeight: 700,
          fill: 'rgba(255,255,255,0.6)',
          textAlign: 'center', textBaseline: 'middle',
        }, container);
      } else {
        this.upsert('collapse-badge', Text, false as any, container);
      }

      if (needsVerification) {
        this.upsert('verification-badge', Text, {
          text: '✱',
          x: 56, y: -16,
          fontSize: 14, fontWeight: 700,
          fill: '#ff4d4f',
          textAlign: 'center', textBaseline: 'middle',
        }, container);
      } else {
        this.upsert('verification-badge', Text, false as any, container);
      }

      const migrationLocation = attributes.migrationLocation || '';
      if (migrationLocation) {
        this.upsert('migration-badge', Text, {
          text: '↗',
          x: -56, y: -16,
          fontSize: 12, fontWeight: 700,
          fill: '#13c2c2',
          textAlign: 'center', textBaseline: 'middle',
        }, container);
      } else {
        this.upsert('migration-badge', Text, false as any, container);
      }

      const birthDateInferred = attributes.birthDateInferred || false;
      if (birthDateInferred) {
        this.upsert('inferred-badge', Text, {
          text: '?',
          x: -56, y: 16,
          fontSize: 11, fontWeight: 700,
          fill: 'rgba(255,255,255,0.5)',
          textAlign: 'center', textBaseline: 'middle',
        }, container);
      } else {
        this.upsert('inferred-badge', Text, false as any, container);
      }
    }
  }

  register('node', 'family-node', FamilyNode);
  registered = true;
}

function transformToTreeData(data: FamilyTreeData, collapsedIds: Set<string>) {
  const personMap = buildPersonMap(data.persons);
  const childrenMap = buildChildrenMap(data.persons);

  const roots = data.persons.filter((p) => !p.parentId);
  if (roots.length === 0) return { id: 'empty' };

  function buildNode(person: Person): any {
    const branchColor = getBranchColor(person.branch);
    const nodeColor = person.gender === 'female' ? FEMALE_COLOR : branchColor;
    const childIds = getChildren(person.id, childrenMap);
    const migrationPart = person.migrationLocation ? '→' + person.migrationLocation : '';
    const subText = person.branch
      ? person.generation + '世·' + person.branch + migrationPart
      : person.generation + '世' + migrationPart;

    const isFlagged = person.needsVerification;
    const isCollapsed = collapsedIds.has(person.id);
    return {
      id: person.id,
      type: 'family-node',
      data: { ...person, nodeColor },
      style: {
        size: [130, 44],
        fill: nodeColor,
        stroke: isFlagged ? '#ff4d4f' : '#fff',
        lineWidth: isFlagged ? 3 : 2,
        lineDash: isFlagged ? [4, 2] : undefined,
        radius: 6,
        shadowColor: isFlagged ? 'rgba(255,77,79,0.35)' : 'rgba(0,0,0,0.12)',
        shadowBlur: isFlagged ? 8 : 4,
        shadowOffsetY: 2,
        personName: person.name,
        personSubText: subText,
        hasChildren: childIds.length > 0,
        collapsed: isCollapsed,
        needsVerification: isFlagged,
        migrationLocation: person.migrationLocation,
        birthDateInferred: person.birthDateInferred,
        label: false,
        icon: false,
      },
      children: childIds.map((cid) => personMap.get(cid)).filter(Boolean).map((child) => buildNode(child!)),
    };
  }

  return buildNode(roots[0]);
}

export default function FamilyTreeGraph({
  data,
  selectedIds,
  currentYear,
  ancestorPathId,
  showLeafMark,
  showIncompleteMark,
  viewMode,
  onNodeSelect,
  onKinshipResult,
}: FamilyTreeGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<Graph | null>(null);
  const collapsedIdsRef = useRef<Set<string>>(new Set());
  const prevHighlightRef = useRef<string[]>([]);
  const prevYearHighlightRef = useRef<string[]>([]);
  const prevAncestorHighlightRef = useRef<string[]>([]);
  const onNodeSelectRef = useRef(onNodeSelect);
  const onKinshipResultRef = useRef(onKinshipResult);
  const selectedIdsRef = useRef(selectedIds);
  const savedViewportRef = useRef<{
    zoom: number;
    selectedNodeId: string | undefined;
  } | null>(null);
  const skipFocusRef = useRef(false);
  const graphReadyRef = useRef(false);
  const generationRef = useRef(0);
  const [renderVersion, setRenderVersion] = useState(0);

  onNodeSelectRef.current = onNodeSelect;
  onKinshipResultRef.current = onKinshipResult;
  selectedIdsRef.current = selectedIds;

  // 数据变化：销毁重建图（G6 树图最可靠的方式），但保存缩放和折叠状态
  useEffect(() => {
    const gen = ++generationRef.current;
    if (!containerRef.current) return;

    graphReadyRef.current = false;
    if (containerRef.current.childElementCount > 0) {
      containerRef.current.innerHTML = '';
    }
    ensureCustomNodeRegistered();

    const treeData = transformToTreeData(data, collapsedIdsRef.current);
    const graphData = treeToGraphData(treeData);

    const graph = new Graph({
      container: containerRef.current,
      data: graphData,
      node: {
        type: 'family-node',
        style: { size: [130, 44] },
        state: {
          selected: { stroke: '#ffd700', lineWidth: 3, shadowBlur: 8 },
          parent: { stroke: '#ff6b6b', lineWidth: 3 },
          child: { stroke: '#51cf66', lineWidth: 3 },
          path: { stroke: '#ffd43b', lineWidth: 3, shadowBlur: 6 },
          alive: { stroke: '#ffd700', lineWidth: 5, shadowBlur: 15, shadowColor: 'rgba(255, 215, 0, 0.7)' },
          ancestor: { stroke: '#9b59b6', lineWidth: 3, shadowBlur: 6 },
          leaf: { opacity: 0.6, stroke: '#bbb', lineWidth: 1, lineDash: [3, 3] },
          incomplete: { stroke: '#ff4d4f', lineWidth: 3, lineDash: [4, 2], shadowBlur: 8, shadowColor: 'rgba(255, 77, 79, 0.3)' },
        },
      },
            edge: {
        type: viewMode === 'radial' ? 'cubic-radial' : 'cubic-vertical',
        style: { stroke: '#bbb', lineWidth: 1.5 },
        state: { highlight: { stroke: '#ffd43b', lineWidth: 3 } },
      },
      layout:
        viewMode === 'radial'
          ? {
              type: 'compact-box',
              direction: 'TB',
              radial: true,
              getHGap: () => 30, getVGap: () => 80,
              getWidth: () => 130, getHeight: () => 44,
            }
          : viewMode === 'pagoda'
            ? {
                type: 'dendrogram',
                direction: 'TB',
                nodeSep: 150,
                rankSep: 80,
                subTreeSep: 30,
                getHGap: () => 10, getVGap: () => 80,
                getWidth: () => 130, getHeight: () => 44,
              }
            : {
                type: 'compact-box',
                direction: 'TB',
                getHGap: () => 20, getVGap: () => 60,
                getWidth: () => 130, getHeight: () => 44,
              },
      behaviors: [
        { type: 'drag-canvas', enable: true },
        'zoom-canvas',
        {
          type: 'collapse-expand',
          trigger: 'dblclick',
          onCollapse: (id: string) => collapsedIdsRef.current.add(id),
          onExpand: (id: string) => collapsedIdsRef.current.delete(id),
        },
      ],
      autoFit: 'view',
      animation: data.persons.length <= ANIMATION_NODE_THRESHOLD,
      padding: 30,
    });

    graphRef.current = graph;

    graph.on('node:click', (evt: any) => {
      const nodeId = evt.target?.id;
      if (nodeId) {
        const originalEvent = evt.originalEvent as MouseEvent | undefined;
        const isMulti = originalEvent?.ctrlKey || originalEvent?.metaKey;
        onNodeSelectRef.current(nodeId, !!isMulti);
      }
    });

    (window as any).__familyTreeGraph = graph;

    const saved = savedViewportRef.current;
    savedViewportRef.current = null;

    // 注意：compact-box 属于 preLayout 类型布局，G6 在 render() 中走 preLayoutDraw 分支，
    // 只会发出 afterlayout 的 'pre' 事件，永远不会发出 'post' 事件。
    // 因此不能依赖 afterlayout('post') 来判断图就绪，必须 await graph.render() 完成本身。
    // render() 内部已完成 preLayout（布局）+ createElements/updateElements（绘制）+ autoFit。
    graph.render().then(async () => {
      if (generationRef.current !== gen || graph.destroyed) return;
      if (saved) {
        await graph.zoomTo(saved.zoom, false).catch(() => {});
        if (saved.selectedNodeId && graph.hasNode(saved.selectedNodeId)) {
          skipFocusRef.current = true;
          try {
            await graph.focusElement(saved.selectedNodeId, false);
          } catch {}
        }
      } else {
        graph.fitView().catch(() => {});
      }
      if (generationRef.current !== gen || graph.destroyed) return;
      graphReadyRef.current = true;
      setRenderVersion(v => v + 1);
    }).catch(() => {});

    return () => {
      const g = graphRef.current;
      if (g) {
        if (graphReadyRef.current) {
          try {
            savedViewportRef.current = {
              zoom: g.getZoom(),
              selectedNodeId: selectedIdsRef.current[0],
            };
          } catch {}
        }
        try { g.destroy(); } catch {}
        graphRef.current = null;
      }
      graphReadyRef.current = false;
      (window as any).__familyTreeGraph = undefined;
    };
    }, [data, viewMode]);

        // 监听容器尺寸变化，自动同步 G6 画布大小
  // 解决：左侧栏折叠/展开后容器宽度变化，但 G6 画布尺寸未跟随更新，
  //       导致内容向左偏移、右侧出现等宽空白区域的问题。
  // 注意：用定时器防抖而非 rAF，等 CSS transition(0.2s) 结束后再做一次 resize，
  //       避免动画过程中每帧 resize → 清空画布重绘 → 连续闪烁。
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let resizeTimer: ReturnType<typeof setTimeout> | undefined;

    const resizeObserver = new ResizeObserver(() => {
      const graph = graphRef.current;
      if (!graph || !graphReadyRef.current || graph.destroyed) return;

      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        const g = graphRef.current;
        if (!g || g.destroyed) return;
        const w = container.clientWidth;
        const h = container.clientHeight;
        if (!w || !h) return;
        try {
          g.resize(w, h);
          // resize 后用动画平滑地将选中节点重新居中，避免视觉跳动
          const selectedId = selectedIdsRef.current[0];
          if (selectedId && g.hasNode(selectedId)) {
            g.focusElement(selectedId, true);
          }
        } catch {}
      }, 220);
    });

    resizeObserver.observe(container);
    return () => {
      resizeObserver.disconnect();
      if (resizeTimer) clearTimeout(resizeTimer);
    };
  }, []);

  // 选中节点变化时聚焦（但视口恢复期间跳过，避免干扰已恢复的位置）
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph || !graphReadyRef.current || selectedIds.length === 0) return;
    if (skipFocusRef.current) {
      skipFocusRef.current = false;
      return;
    }
    requestAnimationFrame(() => {
      if (graph.destroyed) return;
      try {
        graph.focusElement(selectedIds[0], false);
      } catch {}
    });
  }, [selectedIds]);

  // 处理选中高亮——只操作相关节点，不遍历全图
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph || !graphReadyRef.current) return;

    // 清除上次高亮
    if (prevHighlightRef.current.length > 0) {
      if (!graph.destroyed) {
        const clearStates: Record<string, string[]> = {};
        for (const id of prevHighlightRef.current) clearStates[id] = [];
        graph.setElementState(clearStates);
      }
      prevHighlightRef.current = [];
    }

    if (selectedIds.length === 0) return;

    const personMap = buildPersonMap(data.persons);
    const childrenMap = buildChildrenMap(data.persons);
    const newHighlights: string[] = [];

    if (selectedIds.length === 1 && !graph.destroyed) {
      const id = selectedIds[0];
      const parentId = getParent(id, personMap);
      const childIds = getChildren(id, childrenMap);
      const allEdges = graph.getEdgeData();

      graph.setElementState(id, 'selected');
      newHighlights.push(id);

      if (parentId) {
        graph.setElementState(parentId, 'parent');
        newHighlights.push(parentId);
        const edgeId = allEdges.find(
          (e) => (e.source === parentId && e.target === id) || (e.source === id && e.target === parentId),
        )?.id;
        if (edgeId) {
          graph.setElementState(edgeId, 'highlight');
          newHighlights.push(edgeId);
        }
      }

      for (const cid of childIds) {
        graph.setElementState(cid, 'child');
        newHighlights.push(cid);
        const edgeId = allEdges.find(
          (e) => (e.source === id && e.target === cid) || (e.source === cid && e.target === id),
        )?.id;
        if (edgeId) {
          graph.setElementState(edgeId, 'highlight');
          newHighlights.push(edgeId);
        }
      }
    } else if (selectedIds.length === 2 && !graph.destroyed) {
      const [idA, idB] = selectedIds;
      const path = findShortestPath(idA, idB, personMap);
      const stateUpdates: Record<string, string | string[]> = {};

      for (const pid of path) {
        stateUpdates[pid] = 'path';
        newHighlights.push(pid);
      }

      for (let i = 0; i < path.length - 1; i++) {
        const src = path[i];
        const tgt = path[i + 1];
        const edgeId = `${src}-${tgt}`;
        stateUpdates[edgeId] = 'highlight';
        newHighlights.push(edgeId);
      }

      if (!graph.destroyed) {
        graph.setElementState(stateUpdates);
      }

      const personA = personMap.get(idA);
      const personB = personMap.get(idB);
      if (personA && personB) onKinshipResultRef.current(calculateKinship(personA, personB, data));
    }

    prevHighlightRef.current = newHighlights;
  }, [selectedIds, renderVersion]);

  // 年份高亮——存活节点金色高亮
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph || !graphReadyRef.current || currentYear == null) return;

    // 清除上次年份高亮
    if (prevYearHighlightRef.current.length > 0) {
      if (!graph.destroyed) {
        const clearStates: Record<string, string[]> = {};
        for (const id of prevYearHighlightRef.current) clearStates[id] = [];
        graph.setElementState(clearStates);
      }
      prevYearHighlightRef.current = [];
    }

    const stateUpdates: Record<string, string[]> = {};
    const newHighlights: string[] = [];

    for (const p of data.persons) {
      const birthYear = getYear(p.birthDate);
      if (birthYear == null) continue;
      const deathYear = getYear(p.deathDate);
      const effectiveDeathYear = deathYear ?? (birthYear + 100);
      const isAlive = currentYear >= birthYear && currentYear <= effectiveDeathYear;
      if (isAlive) {
        stateUpdates[p.id] = ['alive'];
        newHighlights.push(p.id);
      }
    }

    if (newHighlights.length > 0 && !graph.destroyed) {
      graph.setElementState(stateUpdates);
    }
    prevYearHighlightRef.current = newHighlights;
  }, [currentYear, renderVersion]);

  // 祖先路径高亮——从选中节点到始祖的直系祖先链
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph || !graphReadyRef.current || graph.destroyed) return;

    // 清除上次祖先高亮
    if (prevAncestorHighlightRef.current.length > 0) {
      const clearStates: Record<string, string[]> = {};
      for (const id of prevAncestorHighlightRef.current) clearStates[id] = [];
      graph.setElementState(clearStates);
      prevAncestorHighlightRef.current = [];
    }

    if (!ancestorPathId) return;

    const personMap = buildPersonMap(data.persons);
    const ancestorIds = getAncestors(ancestorPathId, personMap);
    const chainIds = [ancestorPathId, ...ancestorIds]; // 从自己到始祖

    const stateUpdates: Record<string, string[]> = {};
    const newHighlights: string[] = [];

    for (const id of chainIds) {
      stateUpdates[id] = ['ancestor'];
      newHighlights.push(id);
    }

    // 高亮祖先链上的边
    const childrenMap = buildChildrenMap(data.persons);
    for (let i = 0; i < chainIds.length; i++) {
      const childId = chainIds[i];
      const parentId = i + 1 < chainIds.length ? chainIds[i + 1] : null;
      if (!parentId) continue;
      // 查找连接父子节点的边
      try {
        const edges = graph.getEdgeData() as Array<{ id: string; source: string | { id: string }; target: string | { id: string } }>;
        for (const edge of edges) {
          const src = typeof edge.source === 'string' ? edge.source : edge.source?.id;
          const tgt = typeof edge.target === 'string' ? edge.target : edge.target?.id;
          if ((src === parentId && tgt === childId) || (src === childId && tgt === parentId)) {
            stateUpdates[edge.id] = ['highlight'];
            newHighlights.push(edge.id);
            break;
          }
        }
      } catch {}
    }

    if (newHighlights.length > 0) {
      graph.setElementState(stateUpdates);
    }
    prevAncestorHighlightRef.current = newHighlights;
  }, [ancestorPathId, renderVersion]);

  // 无后代/待补节点标记（可切换开关）
  const prevMarkRef = useRef<string[]>([]);
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph || !graphReadyRef.current || graph.destroyed) return;

    // 清除上次标记
    if (prevMarkRef.current.length > 0) {
      const clearStates: Record<string, string[]> = {};
      for (const id of prevMarkRef.current) clearStates[id] = [];
      graph.setElementState(clearStates);
      prevMarkRef.current = [];
    }

    if (!showLeafMark && !showIncompleteMark) return;

    const childrenMap = buildChildrenMap(data.persons);
    const stateUpdates: Record<string, string[]> = {};
    const newMarks: string[] = [];

    for (const p of data.persons) {
      const hasChildren = (childrenMap.get(p.id) ?? []).length > 0;

      // 无后代叶子节点标记
      if (showLeafMark && !hasChildren) {
        stateUpdates[p.id] = ['leaf'];
        newMarks.push(p.id);
      }

      // 待补/待勘误标记：needsVerification 或推断年份且无事迹无配偶
      if (showIncompleteMark) {
        const isIncomplete = p.needsVerification ||
          (p.birthDateInferred && !p.deeds && p.spouses.length === 0);
        if (isIncomplete && !stateUpdates[p.id]) {
          stateUpdates[p.id] = ['incomplete'];
          newMarks.push(p.id);
        } else if (isIncomplete && stateUpdates[p.id]) {
          // 如果已经有 leaf 标记，用 incomplete 覆盖（优先级更高）
          stateUpdates[p.id] = ['incomplete'];
        }
      }
    }

    if (newMarks.length > 0) {
      graph.setElementState(stateUpdates);
    }
    prevMarkRef.current = newMarks;
  }, [showLeafMark, showIncompleteMark, renderVersion]);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', overflow: 'hidden' }} />
  );
}
