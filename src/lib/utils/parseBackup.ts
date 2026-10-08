/** JSON.parse alone silently drops repeated keys. Check keys in each object,
 * including escaped spellings, while skipping encoded project/history strings.
 */
export function parseBackup(raw: string): Record<string, unknown> {
  let value;
  try { value = JSON.parse(raw); }
  catch { throw new Error('This backup is not readable JSON. No projects were restored.'); }
  const objects: (Set<string> | null)[] = [];
  for (let i = 0; i < raw.length; i++) {
    const char = raw[i];
    if (char === '{') objects.push(new Set());
    else if (char === '[') objects.push(null);
    else if (char === '}' || char === ']') objects.pop();
    else if (char === '"') {
      let end = i;
      do {
        end = raw.indexOf('"', end + 1);
        let slashes = 0;
        for (let k = end - 1; k > i && raw[k] === '\\'; k--) slashes++;
        if (slashes % 2 === 0) break;
      } while (end !== -1);
      let next = end + 1;
      while (/\s/.test(raw[next] ?? '') && next < raw.length) next++;
      const keys = objects.at(-1);
      if (keys && raw[next] === ':') {
        const key = JSON.parse(raw.slice(i, end + 1));
        if (keys.has(key)) throw new Error(`This backup repeats the key “${String(key).slice(0, 80)}”. No projects were restored.`);
        keys.add(key);
      }
      i = end;
    }
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Choose a library backup JSON file. No projects were restored.');
  return value;
}

