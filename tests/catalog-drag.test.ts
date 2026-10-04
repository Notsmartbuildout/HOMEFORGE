import { describe, expect, it } from 'vitest';
import { readCatalogDrag, writeCatalogDrag } from '../src/lib/utils/catalogDrag';

function transfer() {
  const values = new Map<string, string>();
  return {
    get types() { return [...values.keys()]; },
    setData(type: string, value: string) { values.set(type, value); },
    getData(type: string) { return values.get(type) ?? ''; },
    clearData(type: string) { values.delete(type); },
  };
}

describe('catalog drag payload', () => {
  it.each(['door', 'window', 'furniture', 'room', 'room-template'] as const)('survives removal of custom MIME types for %s', type => {
    const data = transfer();
    writeCatalogDrag(data, type, 'item-1');
    data.clearData('application/o3d-type');
    data.clearData('application/o3d-id');
    expect(readCatalogDrag(data)).toEqual({ type, id: 'item-1' });
  });
  it('preserves the existing custom payload', () => {
    const data = transfer();
    data.setData('application/o3d-type', 'door');
    data.setData('application/o3d-id', 'single');
    expect(readCatalogDrag(data)).toEqual({ type: 'door', id: 'single' });
  });
  it.each(['ordinary text', 'o3d:not-json', 'o3d:["unknown","id"]', 'o3d:["door",""]', 'o3d:["door",{}]'])('rejects invalid text %s', text => {
    const data = transfer(); data.setData('text/plain', text);
    expect(readCatalogDrag(data)).toBeNull();
  });
});
