import { useState, useRef, useCallback } from 'react';

/**
 * 带撤销/重做的状态管理 hook
 *
 * 使用方式（与 useState 类似，但返回额外方法）：
 *   const { state, setState, undo, redo, canUndo, canRedo, reset } = useUndoableState(initial);
 *
 * - setState(newData)  — 记录历史并更新（自动清空 redo 栈）
 * - undo()             — 撤销上一步
 * - redo()             — 重做
 * - reset(newData)     — 清空所有历史并设置新值（用于导入等替换全部数据的场景）
 * - canUndo / canRedo  — 是否可撤销/重做
 */
export function useUndoableState<T>(initial: T, maxHistory = 50) {
  const [state, setStateInternal] = useState<T>(initial);
  const stateRef = useRef<T>(initial);
  const undoStack = useRef<T[]>([]);
  const redoStack = useRef<T[]>([]);

  const setState = useCallback(
    (updater: T | ((prev: T) => T)) => {
      const prev = stateRef.current;
      const newValue =
        typeof updater === 'function' ? (updater as (p: T) => T)(prev) : updater;
      if (newValue === prev) return;
      undoStack.current.push(prev);
      if (undoStack.current.length > maxHistory) undoStack.current.shift();
      redoStack.current = [];
      stateRef.current = newValue;
      setStateInternal(newValue);
    },
    [maxHistory],
  );

  const undo = useCallback(() => {
    if (undoStack.current.length === 0) return;
    const prev = undoStack.current.pop()!;
    redoStack.current.push(stateRef.current);
    stateRef.current = prev;
    setStateInternal(prev);
  }, []);

  const redo = useCallback(() => {
    if (redoStack.current.length === 0) return;
    const next = redoStack.current.pop()!;
    undoStack.current.push(stateRef.current);
    stateRef.current = next;
    setStateInternal(next);
  }, []);

  /** 清空所有历史并设置新值（用于导入数据等场景） */
  const reset = useCallback((newState: T) => {
    undoStack.current = [];
    redoStack.current = [];
    stateRef.current = newState;
    setStateInternal(newState);
  }, []);

  return {
    state,
    setState,
    undo,
    redo,
    canUndo: undoStack.current.length > 0,
    canRedo: redoStack.current.length > 0,
    reset,
  };
}
