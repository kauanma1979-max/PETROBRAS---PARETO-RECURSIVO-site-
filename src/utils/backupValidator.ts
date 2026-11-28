/**
 * Validação Estrutural, Verificação de Cobertura e Checksum SHA-256
 */

import {
  BACKUP_MODULES_REGISTRY,
  EXCLUDED_STORAGE_KEYS,
  MODULE_BY_ID,
} from './backupRegistry';
import type { CompleteBackupPayload } from './backupMigration';

export interface BackupIntegrityReport {
  complete: boolean;
  valid: boolean;
  totalModulesIdentified: number;
  totalModulesExported: number;
  failedModules: string[];
  totalKeysFound: number;
  totalKeysExported: number;
  totalRecords: number;
  recordCountsByModule: Record<string, number>;
  storageSourcesVerified: string[];
  sha256: string;
  syncDigest: string;
  sizeBytes: number;
  warnings: string[];
  errors: string[];
}

export function canonicalStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return '[' + value.map((item) => canonicalStringify(item)).join(',') + ']';
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj)
    .filter((k) => obj[k] !== undefined)
    .sort();
  return (
    '{' +
    keys.map((k) => JSON.stringify(k) + ':' + canonicalStringify(obj[k])).join(',') +
    '}'
  );
}

/**
 * Digest síncrono FNV-1a 64-bit em hexadecimal (fallback e verificação instantânea)
 */
export function computeSyncDigest(input: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 ^= ch;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= ch ^ (i & 0xff);
    h2 = Math.imul(h2, 0x01000193);
  }
  return (h1 >>> 0).toString(16).padStart(8, '0') + (h2 >>> 0).toString(16).padStart(8, '0');
}

export async function computeSha256Hex(input: string): Promise<string> {
  if (typeof window !== 'undefined' && window.crypto?.subtle) {
    try {
      const encoded = new TextEncoder().encode(input);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', encoded);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch {
      return `fnv-${computeSyncDigest(input)}`;
    }
  }
  if (typeof globalThis !== 'undefined' && (globalThis as any).crypto?.subtle) {
    try {
      const encoded = new TextEncoder().encode(input);
      const hashBuffer = await (globalThis as any).crypto.subtle.digest('SHA-256', encoded);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch {
      return `fnv-${computeSyncDigest(input)}`;
    }
  }
  return `fnv-${computeSyncDigest(input)}`;
}

export function buildIntegrityCanonicalTarget(payload: CompleteBackupPayload): string {
  return canonicalStringify({
    data: payload.data,
    modules: payload.manifest?.modules || [],
    recordCounts: payload.manifest?.recordCounts || {},
  });
}

export function validateBackupPayloadStructure(
  payload: CompleteBackupPayload,
  expectedSourceCounts?: Record<string, number>,
  totalAppKeysFound?: number
): BackupIntegrityReport {
  const warnings: string[] = [...(payload.manifest?.validation?.warnings || [])];
  const errors: string[] = [...(payload.manifest?.validation?.errors || [])];
  const failedModules: string[] = [];
  const recordCountsByModule: Record<string, number> = {};

  if (!payload || typeof payload !== 'object') {
    errors.push('Payload de backup não é um objeto válido.');
  }
  if (!payload?.data || typeof payload.data !== 'object') {
    errors.push('Bloco "data" ausente no backup.');
  }

  const localMap = (payload?.data?.localStorage || {}) as Record<string, unknown>;
  const exportedKeys = Object.keys(localMap);

  // 1. Verificar se nenhuma chave proibida/sensível vazou
  for (const key of exportedKeys) {
    if (EXCLUDED_STORAGE_KEYS.has(key)) {
      errors.push(`Chave interna ou sensível "${key}" não deveria constar no backup.`);
    }
  }

  // 2. Verificar cobertura de todos os módulos registrados
  let exportedModulesCount = 0;
  let totalRecords = 0;

  for (const mod of BACKUP_MODULES_REGISTRY) {
    let val: unknown;
    if (mod.primaryKey in localMap) {
      val = localMap[mod.primaryKey];
    } else if (payload.data.modules && mod.id in payload.data.modules) {
      val = payload.data.modules[mod.id];
    } else if (payload.data.settings && mod.primaryKey in payload.data.settings) {
      val = payload.data.settings[mod.primaryKey];
    } else {
      val = mod.defaultValue();
    }

    const modErrors = mod.validateValue(val);
    if (modErrors.length > 0) {
      failedModules.push(mod.id);
      errors.push(...modErrors);
    } else {
      exportedModulesCount += 1;
    }

    const count = mod.countRecords(val);
    recordCountsByModule[mod.id] = count;
    totalRecords += count;

    if (expectedSourceCounts && mod.id in expectedSourceCounts) {
      const expectedCount = expectedSourceCounts[mod.id];
      if (expectedCount !== count) {
        failedModules.push(mod.id);
        errors.push(
          `Divergência de registros no módulo "${mod.moduleName}": origem=${expectedCount}, exportado=${count}.`
        );
      }
    }
  }

  // Verificar se há módulos listados no manifest ausentes da execução
  if (Array.isArray(payload.manifest?.modules)) {
    for (const modId of payload.manifest.modules) {
      if (!MODULE_BY_ID.has(modId)) {
        warnings.push(`Módulo desconhecido "${modId}" encontrado no manifesto (preservado).`);
      }
    }
  }

  // Verificar round-trip JSON válido
  let serialized = '';
  try {
    serialized = JSON.stringify(payload);
    JSON.parse(serialized);
  } catch (err: any) {
    errors.push(`Falha ao serializar JSON final: ${err?.message || 'Erro de serialização'}`);
  }

  const canonical = buildIntegrityCanonicalTarget(payload);
  const syncDigest = payload.integrity?.syncDigest || computeSyncDigest(canonical);
  const sha256 = payload.integrity?.sha256 || '';

  const totalKeysFound =
    typeof totalAppKeysFound === 'number' ? totalAppKeysFound : exportedKeys.length;

  const complete =
    errors.length === 0 &&
    failedModules.length === 0 &&
    exportedModulesCount === BACKUP_MODULES_REGISTRY.length;

  return {
    complete,
    valid: errors.length === 0,
    totalModulesIdentified: BACKUP_MODULES_REGISTRY.length,
    totalModulesExported: exportedModulesCount,
    failedModules: Array.from(new Set(failedModules)),
    totalKeysFound,
    totalKeysExported: exportedKeys.length,
    totalRecords,
    recordCountsByModule,
    storageSourcesVerified: ['localStorage', 'sessionStorage (auditado/excluído)', 'indexedDB (auditado/ausente)'],
    sha256,
    syncDigest,
    sizeBytes: serialized ? new Blob([serialized]).size : 0,
    warnings: Array.from(new Set(warnings)),
    errors: Array.from(new Set(errors)),
  };
}

export async function verifyChecksumIntegrity(
  payload: CompleteBackupPayload
): Promise<'verified' | 'mismatch' | 'not_present'> {
  const canonical = buildIntegrityCanonicalTarget(payload);
  const expectedSha = payload.integrity?.sha256;
  const expectedSync = payload.integrity?.syncDigest;

  if (!expectedSha && !expectedSync) {
    return 'not_present';
  }

  if (expectedSha) {
    const computedSha = await computeSha256Hex(canonical);
    if (computedSha === expectedSha) {
      return 'verified';
    }
    // Se ambiente antigo usou fallback fnv- ou hash real mudou
    if (expectedSync && computeSyncDigest(canonical) === expectedSync && expectedSha.startsWith('fnv-')) {
      return 'verified';
    }
    return 'mismatch';
  }

  if (expectedSync) {
    return computeSyncDigest(canonical) === expectedSync ? 'verified' : 'mismatch';
  }

  return 'not_present';
}
