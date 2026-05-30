import { useEffect, useRef, useState } from 'react';
import { Graph, treeToGraphData, register, Rect } from '@antv/g6';
import type { Point } from '@antv/g6';
import { Text } from '@antv/g';
import type { Group } from '@antv/g';
import type { Person, FamilyTreeData, KinshipResult } from '../types';
import {
  buildPersonMap,
  buildChildrenMap,
  findShortestPath,
  getParent,
  getChildren,
  getYear,
} from '../utils/tree';
import { calculateKinship } from '../utils/kinship';

interface FamilyTreeGraphProps {
  data: FamilyTreeData;
  selectedIds: string[];
  currentYear: number | null;
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
  onNodeSelect,
  onKinshipResult,
}: FamilyTreeGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<Graph | null>(null);
  const collapsedIdsRef = useRef<Set<string>>(new Set());
  const prevHighlightRef = useRef<string[]>([]);
  const prevYearHighlightRef = useRef<string[]>([]);
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
        },
      },
      edge: {
        type: 'cubic-vertical',
        style: { stroke: '#bbb', lineWidth: 1.5 },
        state: { highlight: { stroke: '#ffd43b', lineWidth: 3 } },
      },
      layout: {
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

    let layoutReady = false;

    const handleLayout = async () => {
      if (layoutReady) return;
      layoutReady = true;
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
    };

    const onAfterLayout = (e: any) => {
      if (e?.data?.type !== 'post') return;
      handleLayout();
    };

    graph.on('afterlayout', onAfterLayout);
    graph.render().catch(() => {});

    return () => {
      try { graph.off('afterlayout', onAfterLayout); } catch {}
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
  }, [data]);

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

    if (selectedIds.length === 1) {
      const id = selectedIds[0];
      if (!graph.destroyed) {
        graph.setElementState(id, 'selected');
      }
      newHighlights.push(id);

      const parentId = getParent(id, personMap);
      if (parentId) {
        if (!graph.destroyed) {
          graph.setElementState(parentId, 'parent');
        }
        newHighlights.push(parentId);
      }

      for (const cid of getChildren(id, childrenMap)) {
        if (!graph.destroyed) {
          graph.setElementState(cid, 'child');
        }
        newHighlights.push(cid);
      }
    } else if (selectedIds.length === 2) {
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

  // 容器尺寸变化时重新适配视口（左侧栏/右侧栏展开收起时）
  useEffect(() => {
    const graph = graphRef.current;
    const container = containerRef.current;
    if (!graph || !container || !graphReadyRef.current) return;

    let timer: number;
    const observer = new ResizeObserver(() => {
      clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (graph.destroyed) return;
        graph.fitView().catch(() => {});
      }, 100);
    });
    observer.observe(container);
    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, [renderVersion]);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', overflow: 'hidden' }} />
  );
}
