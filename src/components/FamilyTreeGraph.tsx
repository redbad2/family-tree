import { useEffect, useRef } from 'react';
import { Graph, treeToGraphData, register, Rect } from '@antv/g6';
import { Text } from '@antv/g';
import type { Group } from '@antv/g';
import type { Person, FamilyTreeData, KinshipResult } from '../types';
import {
  buildPersonMap,
  buildChildrenMap,
  findShortestPath,
  getParent,
  getChildren,
} from '../utils/tree';
import { calculateKinship } from '../utils/kinship';

interface FamilyTreeGraphProps {
  data: FamilyTreeData;
  selectedIds: string[];
  currentYear: number | null;
  onNodeSelect: (id: string, multi: boolean) => void;
  onKinshipResult: (result: KinshipResult | null) => void;
}

const BRANCH_PALETTE = [
  '#c0392b', '#2980b9', '#27ae60', '#e67e22', '#8e44ad',
  '#16a085', '#d35400', '#2c3e50', '#c2185b', '#00838f',
  '#6a1b9a', '#ef6c00',
];

const DEFAULT_COLOR = '#7f8c8d';
const FEMALE_COLOR = '#ad1457';

function getBranchColor(branch: string | null): string {
  if (!branch) return DEFAULT_COLOR;
  let hash = 0;
  for (let i = 0; i < branch.length; i++) {
    hash = ((hash << 5) - hash + branch.charCodeAt(i)) | 0;
  }
  return BRANCH_PALETTE[Math.abs(hash) % BRANCH_PALETTE.length];
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface FamilyNodeStyleProps extends Record<string, any> {}

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
    }
  }

  register('node', 'family-node', FamilyNode);
  registered = true;
}

function transformToTreeData(data: FamilyTreeData) {
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
    return {
      id: person.id,
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
        collapsed: false,
        needsVerification: isFlagged,
        migrationLocation: person.migrationLocation,
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

  // 数据变化时：销毁重建图，然后聚焦到选中节点
  useEffect(() => {
    if (!containerRef.current) return;

    ensureCustomNodeRegistered();

    const hadGraph = graphRef.current !== null;
    let savedZoom = 1;

    // 销毁旧图前保存缩放比例
    if (graphRef.current) {
      savedZoom = graphRef.current.getZoom();
      graphRef.current.destroy();
      graphRef.current = null;
    }

    const treeData = transformToTreeData(data);
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
        'collapse-expand',
      ],
      animation: true,
      padding: 30,
    });

    graphRef.current = graph;

    graph.on('node:click', (evt: any) => {
      const nodeId = evt.target?.id;
      if (nodeId) {
        const originalEvent = evt.originalEvent as MouseEvent | undefined;
        const isMulti = originalEvent?.ctrlKey || originalEvent?.metaKey;
        onNodeSelect(nodeId, !!isMulti);
      }
    });

    (window as any).__familyTreeGraph = graph;

    graph.render().then(() => {
      // 首次渲染适配视图；后续渲染恢复缩放
      if (!hadGraph) {
        graph.fitView().catch(() => {});
      } else {
        graph.zoomTo(savedZoom, false).catch(() => {});
      }

      if (selectedIds.length > 0) {
        setTimeout(() => {
          try {
            graph.focusElement(selectedIds[0], true);
          } catch {}
        }, 100);
      }
    });

    return () => {
      if (graphRef.current) {
        graphRef.current.destroy();
        graphRef.current = null;
      }
      (window as any).__familyTreeGraph = undefined;
    };
  }, [data]);

  // 选中节点变化时聚焦
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph || selectedIds.length === 0) return;
    setTimeout(() => {
      try {
        graph.focusElement(selectedIds[0], true);
      } catch {}
    }, 100);
  }, [selectedIds]);

  // 处理选中高亮
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) return;

    const allNodes = graph.getNodeData();
    const allEdges = graph.getEdgeData();

    const clearStates: Record<string, string[]> = {};
    for (const n of allNodes) clearStates[n.id] = [];
    for (const e of allEdges) { if (e.id) clearStates[e.id] = []; }
    graph.setElementState(clearStates);

    if (selectedIds.length === 0) return;

    const personMap = buildPersonMap(data.persons);
    const childrenMap = buildChildrenMap(data.persons);

    if (selectedIds.length === 1) {
      const id = selectedIds[0];
      graph.setElementState(id, 'selected');
      const parentId = getParent(id, personMap);
      if (parentId) graph.setElementState(parentId, 'parent');
      for (const cid of getChildren(id, childrenMap)) graph.setElementState(cid, 'child');
    } else if (selectedIds.length === 2) {
      const [idA, idB] = selectedIds;
      const path = findShortestPath(idA, idB, personMap);
      const pathSet = new Set(path);
      const stateUpdates: Record<string, string | string[]> = {};
      for (const pid of path) stateUpdates[pid] = 'path';
      for (const e of allEdges) {
        const edgeData = e as any;
        if (pathSet.has(edgeData.source) && pathSet.has(edgeData.target)) {
          if (Math.abs(path.indexOf(edgeData.source) - path.indexOf(edgeData.target)) === 1 && e.id) {
            stateUpdates[e.id] = 'highlight';
          }
        }
      }
      graph.setElementState(stateUpdates);
      const personA = personMap.get(idA);
      const personB = personMap.get(idB);
      if (personA && personB) onKinshipResult(calculateKinship(personA, personB, data));
    }
  }, [selectedIds, data]);

  // 年份高亮
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph || currentYear == null || selectedIds.length > 0) return;

    const allNodes = graph.getNodeData();
    const stateUpdates: Record<string, string[]> = {};
    for (const n of allNodes) {
      const personData = (n as any).data as Person | undefined;
      if (!personData) { stateUpdates[n.id] = []; continue; }
      const birthYear = personData.birthDate ? new Date(personData.birthDate).getFullYear() : null;
      const deathYear = personData.deathDate ? new Date(personData.deathDate).getFullYear() : null;
      const isAlive = birthYear != null && currentYear >= birthYear && (deathYear == null || currentYear <= deathYear);
      stateUpdates[n.id] = isAlive ? ['path'] : [];
    }
    graph.setElementState(stateUpdates);
  }, [currentYear, data, selectedIds]);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
  );
}
