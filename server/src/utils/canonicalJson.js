/**
 * Canonical JSON Serializer
 * Produces deterministic JSON strings by recursively sorting keys.
 * Essential for cryptographic hashes and SHA-256 integrity verification.
 */
export function canonicalJSON(val) {
  if (val === null || val === undefined) {
    return 'null';
  }

  if (val instanceof Date) {
    return JSON.stringify(val.toISOString());
  }

  if (Array.isArray(val)) {
    return '[' + val.map(canonicalJSON).join(',') + ']';
  }

  if (typeof val === 'object') {
    // If it has a toJSON or toString representation for ObjectId
    if (typeof val.toHexString === 'function') {
      return JSON.stringify(val.toHexString());
    }

    const sortedKeys = Object.keys(val).sort();
    const entries = sortedKeys
      .filter(k => val[k] !== undefined)
      .map(k => `${JSON.stringify(k)}:${canonicalJSON(val[k])}`);
    return '{' + entries.join(',') + '}';
  }

  return JSON.stringify(val);
}

export default canonicalJSON;
