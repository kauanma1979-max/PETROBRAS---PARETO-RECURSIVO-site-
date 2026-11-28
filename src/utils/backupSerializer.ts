/**
 * Serializador Centralizado & Pipeline Imutável de Exportação JSON v2.3
 */

import {
  BACKUP_APP_NAME,
  BACKUP_FILE_NAME,
  BACKUP_MODULES_REGISTRY,
  BACKUP_SCHEMA_VERSION,
  discoverUnregisteredAppStorage,
  EXCLUDED_STORAGE_KEYS,
  readModuleFromStorage,
  STORAGE_KEYS,
  UNKNOWN_FIELDS_STORAGE_KEY,
} from './backupRegistry';
import type { CompleteBackupPayload } from './backupMigration';
import {
  buildIntegrityCanonicalTarget,
  computeSha256Hex,
  computeSyncDigest,
  validateBackupPayloadStructure,
  type BackupIntegrityReport,
} from './backupValidator';
import { deduplicateFocusLogs } from './studyFocusStorage';

export type BackupExportStage =
  | 'preparing'
  | 'collecting'
  | 'verifying_modules'
  | 'validating_integrity'
  | 'generating_file'
  | 'completed'
  | 'error';

export interface ValidatedBackupBundle {
  payload: CompleteBackupPayload;
  jsonString: string;
  report: BackupIntegrityReport;
}

function deepCloneImmutable<T>(value: T): T {
  if (value === null || typeof value !== 'object') return value;
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(value);
    } catch {
      // fallback below
    }
  }
  return JSON.parse(JSON.stringify(value));
}

/**
 * Solicita flush síncrono de quaisquer rascunhos ou fatias em memória antes do snapshot.
 */
export function flushPendingAppPersistence(): void {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new CustomEvent('transpetro_prepare_backup_flush'));
  } catch {
    // ignore in non-DOM contexts
  }
}

function collectRawSnapshotSync(): {
  payload: CompleteBackupPayload;
  sourceCounts: Record<string, number>;
  totalKeysFound: number;
  collectErrors: string[];
  collectWarnings: string[];
} {
  flushPendingAppPersistence();

  const now = new Date();
  const collectErrors: string[] = [];
  const collectWarnings: string[] = [];
  const sourceCounts: Record<string, number> = {};

  const localStorageSnapshot: Record<string, unknown> = {};
  const modulesData: Record<string, unknown> = {};
  const settingsData: Record<string, unknown> = {};
  const legacyData: Record<string, unknown> = {};

  let presentKeysCount = 0;

  for (const mod of BACKUP_MODULES_REGISTRY) {
    const readRes = readModuleFromStorage(mod);
    if (readRes.parseError) {
      collectErrors.push(readRes.parseError);
    }

    const clonedVal = deepCloneImmutable(readRes.value);
    const recordCount = mod.countRecords(clonedVal);
    sourceCounts[mod.id] = recordCount;

    if (readRes.rawPresent) {
      presentKeysCount += 1;
      if (!EXCLUDED_STORAGE_KEYS.has(mod.primaryKey)) {
        localStorageSnapshot[mod.primaryKey] = clonedVal;
      }
    }

    if (mod.category === 'data') {
      modulesData[mod.id] = clonedVal;
    } else if (mod.category === 'settings') {
      settingsData[mod.primaryKey] = clonedVal;
    } else if (mod.category === 'legacy') {
      legacyData[mod.id] = clonedVal;
    }
  }

  // Descobrir quaisquer chaves adicionais do app ainda não registradas formalmente
  const { extraEntries, unregisteredKeys, parseWarnings } = discoverUnregisteredAppStorage();
  collectWarnings.push(...parseWarnings);

  const otherStorageKeys: Record<string, unknown> = {};
  Object.entries(extraEntries).forEach(([k, v]) => {
    const cloned = deepCloneImmutable(v);
    localStorageSnapshot[k] = cloned;
    otherStorageKeys[k] = cloned;
    presentKeysCount += 1;
  });

  if (unregisteredKeys.length > 0) {
    collectWarnings.push(
      `Chaves adicionais preservadas automaticamente: ${unregisteredKeys.join(', ')}.`
    );
  }

  // Preservar campos desconhecidos guardados de restaurações anteriores (round-trip sem perda)
  let preservedUnknownFields: Record<string, unknown> | undefined;
  if (typeof localStorage !== 'undefined') {
    try {
      const rawUnknown = localStorage.getItem(UNKNOWN_FIELDS_STORAGE_KEY);
      if (rawUnknown) {
        const parsedUnknown = JSON.parse(rawUnknown);
        if (parsedUnknown && typeof parsedUnknown === 'object' && !Array.isArray(parsedUnknown)) {
          preservedUnknownFields = parsedUnknown;
        }
      }
    } catch {
      // ignore
    }
  }

  const completedDays = Array.isArray(legacyData.legado_completed_days)
    ? (legacyData.legado_completed_days as string[])
    : [];
  const completedBlocks = Array.isArray(legacyData.legado_completed_blocks)
    ? (legacyData.legado_completed_blocks as string[])
    : [];
  const bancaNotes =
    legacyData.legado_banca_notes && typeof legacyData.legado_banca_notes === 'object'
      ? (legacyData.legado_banca_notes as Record<string, any>)
      : {};

  const errorNotebook = Array.isArray(modulesData.caderno_erros) ? modulesData.caderno_erros : [];
  const verticalSyllabusProgress =
    modulesData.edital_verticalizado && typeof modulesData.edital_verticalizado === 'object'
      ? (modulesData.edital_verticalizado as Record<string, any>)
      : {};
  const customMaterials =
    modulesData.material_estudo_custom && typeof modulesData.material_estudo_custom === 'object'
      ? (modulesData.material_estudo_custom as Record<string, any>)
      : {};
  const materialLinks = Array.isArray(modulesData.material_links) ? modulesData.material_links : [];
  const scheduleDayNotes =
    modulesData.cronograma_notas && typeof modulesData.cronograma_notas === 'object'
      ? (modulesData.cronograma_notas as Record<string, string>)
      : {};
  const pomodoroFocusLogs = Array.isArray(modulesData.foco_logs)
    ? deduplicateFocusLogs(modulesData.foco_logs)
    : [];
  const pomodoroActiveState = modulesData.pomodoro_ativo || null;
  const studyResumeState = modulesData.retomada_estudo || null;
  const calendarSelectedDate =
    typeof settingsData[STORAGE_KEYS.CALENDAR_SELECTED_DATE] === 'string' &&
    String(settingsData[STORAGE_KEYS.CALENDAR_SELECTED_DATE]).trim()
      ? String(settingsData[STORAGE_KEYS.CALENDAR_SELECTED_DATE]).trim()
      : undefined;

  const totalRecords = Object.values(sourceCounts).reduce((acc, n) => acc + n, 0);
  const registeredIds = BACKUP_MODULES_REGISTRY.map((m) => m.id);

  const payload: CompleteBackupPayload = {
    version: BACKUP_SCHEMA_VERSION,
    app: BACKUP_APP_NAME,
    exportTimestamp: now.toISOString(),
    exportDateFormatted: now.toLocaleString('pt-BR'),
    metadata: {
      application: BACKUP_APP_NAME,
      backupVersion: BACKUP_SCHEMA_VERSION,
      createdAt: now.toISOString(),
      createdAtFormatted: now.toLocaleString('pt-BR'),
      applicationVersion: '2027.1',
      format: 'complete-backup',
      complete: false, // Será marcado true apenas após validação integral
    },
    manifest: {
      modules: registeredIds,
      registeredModules: registeredIds,
      storageSources: ['localStorage', 'sessionStorage', 'indexedDB'],
      exportedKeys: Object.keys(localStorageSnapshot),
      unregisteredKeys,
      recordCounts: sourceCounts,
      totalRecords,
      validation: {
        valid: collectErrors.length === 0,
        complete: false,
        warnings: collectWarnings,
        errors: collectErrors,
      },
    },
    data: {
      localStorage: localStorageSnapshot,
      sessionStorage: {},
      indexedDB: {},
      modules: modulesData,
      settings: settingsData,
      legacy: legacyData,
      ...(preservedUnknownFields ? { unknownFields: preservedUnknownFields } : {}),
      // Campos compatíveis v2.2
      completedDays,
      completedBlocks,
      errorNotebook,
      verticalSyllabusProgress,
      customMaterials,
      materialLinks,
      scheduleDayNotes,
      bancaNotes,
      pomodoroFocusLogs,
      pomodoroActiveState,
      studyResumeState,
      calendarSelectedDate,
      otherStorageKeys,
    },
  };

  const canonical = buildIntegrityCanonicalTarget(payload);
  const syncDigest = computeSyncDigest(canonical);
  payload.integrity = {
    algorithm: 'SHA-256',
    sha256: `fnv-${syncDigest}`,
    syncDigest,
  };

  const initialReport = validateBackupPayloadStructure(payload, sourceCounts, presentKeysCount);
  payload.metadata.complete = initialReport.complete;
  payload.manifest.validation = {
    valid: initialReport.valid,
    complete: initialReport.complete,
    warnings: initialReport.warnings,
    errors: initialReport.errors,
  };

  return {
    payload,
    sourceCounts,
    totalKeysFound: presentKeysCount,
    collectErrors,
    collectWarnings,
  };
}

/**
 * Gera snapshot síncrono completo (usado em chamadas síncronas legadas e pré-sync).
 */
export function generateCompleteBackupSync(): ValidatedBackupBundle {
  const { payload, sourceCounts, totalKeysFound } = collectRawSnapshotSync();
  const report = validateBackupPayloadStructure(payload, sourceCounts, totalKeysFound);
  const jsonString = JSON.stringify(payload, null, 2);
  report.sizeBytes = new Blob([jsonString]).size;
  return { payload, jsonString, report };
}

/**
 * Pipeline completo assíncrono com SHA-256 real, validação cruzada e reporte de etapas.
 */
export async function generateValidatedBackupAsync(
  onStage?: (stage: BackupExportStage) => void
): Promise<ValidatedBackupBundle> {
  onStage?.('preparing');
  await Promise.resolve();

  onStage?.('collecting');
  const { payload, sourceCounts, totalKeysFound } = collectRawSnapshotSync();

  onStage?.('verifying_modules');
  const canonical = buildIntegrityCanonicalTarget(payload);
  const sha256 = await computeSha256Hex(canonical);
  const syncDigest = computeSyncDigest(canonical);

  payload.integrity = {
    algorithm: 'SHA-256',
    sha256,
    syncDigest,
  };

  onStage?.('validating_integrity');
  const report = validateBackupPayloadStructure(payload, sourceCounts, totalKeysFound);
  payload.metadata.complete = report.complete;
  payload.manifest.validation = {
    valid: report.valid,
    complete: report.complete,
    warnings: report.warnings,
    errors: report.errors,
  };

  if (!report.valid || !report.complete) {
    onStage?.('error');
    const detail = report.errors[0] || 'Falha na validação de cobertura ou integridade do backup.';
    throw new Error(detail);
  }

  onStage?.('generating_file');
  const jsonString = JSON.stringify(payload, null, 2);
  // Revalidação final pós-serialização
  const reparsed = JSON.parse(jsonString) as CompleteBackupPayload;
  const postReport = validateBackupPayloadStructure(reparsed, sourceCounts, totalKeysFound);
  postReport.sizeBytes = new Blob([jsonString]).size;
  postReport.sha256 = sha256;

  if (payload.integrity) {
    payload.integrity.sizeBytes = postReport.sizeBytes;
  }

  if (!postReport.valid || !postReport.complete) {
    onStage?.('error');
    throw new Error(
      postReport.errors[0] || 'O arquivo JSON gerado falhou na validação final pós-serialização.'
    );
  }

  return {
    payload,
    jsonString: JSON.stringify(payload, null, 2),
    report: postReport,
  };
}

export async function downloadValidatedBackupFile(
  onStage?: (stage: BackupExportStage) => void
): Promise<ValidatedBackupBundle> {
  const bundle = await generateValidatedBackupAsync(onStage);
  const blob = new Blob([bundle.jsonString], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const downloadLink = document.createElement('a');

  downloadLink.href = url;
  downloadLink.setAttribute('download', BACKUP_FILE_NAME);
  document.body.appendChild(downloadLink);
  downloadLink.click();

  setTimeout(() => {
    try {
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(url);
    } catch {
      // ignore
    }
  }, 1200);

  onStage?.('completed');
  return bundle;
}
