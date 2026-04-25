import type { FamilyTreeData } from '../types';

const DB_NAME = 'family-tree-db';
const STORE_NAME = 'file-handles';
const KEY = 'save-file-handle';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

async function getStoredFileHandle(): Promise<FileSystemFileHandle | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(KEY);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

async function storeFileHandle(handle: FileSystemFileHandle): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(handle, KEY);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function removeStoredFileHandle(): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // ignore
  }
}

export interface SaveResult {
  success: boolean;
  message: string;
  fileName?: string;
}

export async function saveToDisk(data: FamilyTreeData): Promise<SaveResult> {
  const existingHandle = await getStoredFileHandle();

  if (existingHandle) {
    try {
      const permission = await (existingHandle as any).requestPermission?.({ mode: 'readwrite' });
      if (permission === 'granted' || permission === undefined) {
        const writable = await (existingHandle as any).createWritable();
        const json = JSON.stringify(data, null, 2);
        await writable.write(json);
        await writable.close();
        return { success: true, message: '已保存', fileName: existingHandle.name };
      }
    } catch {
      await removeStoredFileHandle();
    }
  }

  if ('showSaveFilePicker' in window) {
    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: `族谱-${data.meta.familyName}-${new Date().toISOString().slice(0, 10)}.json`,
        types: [{
          description: 'JSON 文件',
          accept: { 'application/json': ['.json'] },
        }],
      });
      const writable = await handle.createWritable();
      const json = JSON.stringify(data, null, 2);
      await writable.write(json);
      await writable.close();
      await storeFileHandle(handle);
      return { success: true, message: '已保存', fileName: handle.name };
    } catch (e: any) {
      if (e.name === 'AbortError') {
        return { success: false, message: '已取消保存' };
      }
      return { success: false, message: '保存失败: ' + (e.message || String(e)) };
    }
  }

  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `族谱-${data.meta.familyName}-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  return { success: true, message: '已下载（当前浏览器不支持直接覆盖保存文件）' };
}
