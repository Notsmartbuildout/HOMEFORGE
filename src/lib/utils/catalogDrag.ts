type CatalogDragType = 'door' | 'window' | 'furniture' | 'room' | 'room-template';
const types: readonly string[] = ['door', 'window', 'furniture', 'room', 'room-template'];

export function writeCatalogDrag(data: Pick<DataTransfer, 'setData'> | null, type: CatalogDragType, id: string) {
  if (!data) return;
  data.setData('application/o3d-type', type);
  data.setData('application/o3d-id', id);
  // WebKit on Windows drops custom MIME types during native drag operations.
  data.setData('text/plain', `o3d:${JSON.stringify([type, id])}`);
}

export function readCatalogDrag(data: Pick<DataTransfer, 'getData'> | null): { type: CatalogDragType; id: string } | null {
  if (!data) return null;
  let type: unknown = data.getData('application/o3d-type');
  let id: unknown = data.getData('application/o3d-id');
  if (!type || !id) {
    const text = data.getData('text/plain');
    if (!text.startsWith('o3d:')) return null;
    try {
      const payload: unknown = JSON.parse(text.slice(4));
      if (!Array.isArray(payload) || payload.length !== 2) return null;
      [type, id] = payload;
    } catch { return null; }
  }
  return typeof type === 'string' && types.includes(type) && typeof id === 'string' && id.length > 0
    ? { type: type as CatalogDragType, id }
    : null;
}
