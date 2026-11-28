/**
 * Migração controlada de versões de backup (v1/v2.0/v2.2 -> v2.3)
 * Preserva integralmente dados originais e campos desconhecidos,
 * removendo apenas contaminação recursiva de snapshots de segurança.
 */

import {
  BACKUP_APP_NAME,
  BACKUP_SCHEMA_VERSION,
  EXCLUDED_STORAGE_KEYS,
  STORAGE_KEYS,
} from './backupRegistry';
import { deduplicateFocusLogs, normalizeRestoredPomodoroOnAppOpen } from './studyFocusStorage';

export interface CompleteBackupMetadata {
  application: string;
  backupVersion: string;
  createdAt: string;
  createdAtFormatted: string;
  applicationVersion: string;
  format: 'complete-backup';
  complete: boolean;
}

export interface CompleteBackupManifest {
  modules: string[];
  registeredModules: string[];
  storageSources: string[];
  exportedKeys: string[];
  unregisteredKeys: string[];
  recordCounts: Record<string, number>;
  totalRecords: number;
  validation: {
    valid: boolean;
    complete: boolean;
    warnings: string[];
    errors: string[];
  };
}

export interface CompleteBackupIntegrity {
  algorithm: 'SHA-256';
  sha256: string;
  syncDigest: string;
  sizeBytes?: number;
}

export interface CompleteBackupPayload {
  version: string;
  app: string;
  exportTimestamp: string;
  exportDateFormatted: string;
  metadata: CompleteBackupMetadata;
  manifest: CompleteBackupManifest;
  integrity?: CompleteBackupIntegrity;
  data: {
    // Formato estruturado v2.3
    localStorage: Record<string, unknown>;
    sessionStorage: Record<string, unknown>;
    indexedDB: Record<string, unknown>;
    modules: Record<string, unknown>;
    settings: Record<string, unknown>;
    legacy: Record<string, unknown>;
    unknownFields?: Record<string, unknown>;
    // Campos de compatibilidade direta (v2.2 e anteriores)
    completedDays: string[];
    completedBlocks?: string[];
    errorNotebook: any[];
    verticalSyllabusProgress: Record<string, any>;
    customMaterials: Record<string, any>;
    materialLinks: any[];
    scheduleDayNotes?: Record<string, string>;
    bancaNotes?: Record<string, any>;
    pomodoroFocusLogs?: any[];
    pomodoroActiveState?: any | null;
    studyResumeState?: any | null;
    calendarSelectedDate?: string;
    otherStorageKeys?: Record<string, any>;
  };
  unknownRootFields?: Record<string, unknown>;
}

const KNOWN_ROOT_KEYS = new Set([
  'version',
  'app',
  'exportTimestamp',
  'exportDateFormatted',
  'metadata',
  'manifest',
  'integrity',
  'data',
  'unknownRootFields',
]);

const KNOWN_DATA_KEYS = new Set([
  'localStorage',
  'sessionStorage',
  'indexedDB',
  'modules',
  'settings',
  'legacy',
  'unknownFields',
  'completedDays',
  'completedBlocks',
  'errorNotebook',
  'verticalSyllabusProgress',
  'customMaterials',
  'materialLinks',
  'scheduleDayNotes',
  'bancaNotes',
  'pomodoroFocusLogs',
  'pomodoroActiveState',
  'studyResumeState',
  'calendarSelectedDate',
  'otherStorageKeys',
]);

const isPlainObject = (v: unknown): v is Record<string, any> =>
  Boolean(v) && typeof v === 'object' && !Array.isArray(v);

export function detectBackupVersion(raw: any): string {
  if (!isPlainObject(raw)) return 'unknown';
  if (isPlainObject(raw.metadata) && typeof raw.metadata.backupVersion === 'string') {
    return raw.metadata.backupVersion;
  }
  if (typeof raw.version === 'string' && raw.version.trim()) {
    return raw.version.trim();
  }
  if (isPlainObject(raw.data)) return '2.0';
  return '1.0-flat';
}

function sanitizeOtherStorageKeys(rawOther: unknown): Record<string, unknown> {
  if (!isPlainObject(rawOther)) return {};
  const cleaned: Record<string, unknown> = {};
  Object.entries(rawOther).forEach(([k, v]) => {
    if (EXCLUDED_STORAGE_KEYS.has(k)) return;
    cleaned[k] = v;
  });
  return cleaned;
}

export interface MigrationOutcome {
  detectedVersion: string;
  migratedFromLegacy: boolean;
  warnings: string[];
  payload: CompleteBackupPayload;
}

export function migrateBackupToCurrent(rawInput: unknown): MigrationOutcome {
  if (!isPlainObject(rawInput)) {
    throw new Error('Estrutura de backup inválida: o conteúdo raiz deve ser um objeto JSON.');
  }

  const detectedVersion = detectBackupVersion(rawInput);
  const warnings: string[] = [];
  const rawData: Record<string, any> = isPlainObject(rawInput.data) ? rawInput.data : rawInput;

  const isLegacyFlatOr22 =
    detectedVersion !== BACKUP_SCHEMA_VERSION || !isPlainObject(rawData.localStorage);

  if (isLegacyFlatOr22) {
    warnings.push(`Backup convertido automaticamente da versão ${detectedVersion} para v${BACKUP_SCHEMA_VERSION}.`);
  }

  // Preservar campos desconhecidos na raiz e dentro de data
  const unknownRootFields: Record<string, unknown> = isPlainObject(rawInput.unknownRootFields)
    ? { ...rawInput.unknownRootFields }
    : {};
  Object.entries(rawInput).forEach(([k, v]) => {
    if (!KNOWN_ROOT_KEYS.has(k) && isPlainObject(rawInput.data)) {
      unknownRootFields[k] = v;
    }
  });

  const unknownDataFields: Record<string, unknown> = isPlainObject(rawData.unknownFields)
    ? { ...rawData.unknownFields }
    : {};
  Object.entries(rawData).forEach(([k, v]) => {
    if (!KNOWN_DATA_KEYS.has(k)) {
      unknownDataFields[k] = v;
    }
  });

  // Reconstruir mapa localStorage consolidado a partir de data.localStorage + campos v2.2 + otherStorageKeys
  const localStorageMap: Record<string, unknown> = {};
  if (isPlainObject(rawData.localStorage)) {
    Object.entries(rawData.localStorage).forEach(([k, v]) => {
      if (!EXCLUDED_STORAGE_KEYS.has(k)) {
        localStorageMap[k] = v;
      } else {
        warnings.push(`Chave interna/sensível "${k}" ignorada durante a migração por segurança.`);
      }
    });
  }

  // Extrair campos conhecidos v2.2 / v2.3
  const completedDays: string[] = Array.isArray(rawData.completedDays)
    ? rawData.completedDays
    : Array.isArray(localStorageMap[STORAGE_KEYS.COMPLETED_DAYS])
    ? (localStorageMap[STORAGE_KEYS.COMPLETED_DAYS] as string[])
    : [];

  const completedBlocks: string[] = Array.isArray(rawData.completedBlocks)
    ? rawData.completedBlocks
    : Array.isArray(localStorageMap[STORAGE_KEYS.COMPLETED_BLOCKS])
    ? (localStorageMap[STORAGE_KEYS.COMPLETED_BLOCKS] as string[])
    : [];

  const errorNotebook: any[] = Array.isArray(rawData.errorNotebook)
    ? rawData.errorNotebook
    : Array.isArray(rawData.modules?.caderno_erros)
    ? rawData.modules.caderno_erros
    : Array.isArray(localStorageMap[STORAGE_KEYS.ERROR_NOTEBOOK])
    ? (localStorageMap[STORAGE_KEYS.ERROR_NOTEBOOK] as any[])
    : [];

  const verticalSyllabusProgress: Record<string, any> = isPlainObject(rawData.verticalSyllabusProgress)
    ? rawData.verticalSyllabusProgress
    : isPlainObject(rawData.modules?.edital_verticalizado)
    ? rawData.modules.edital_verticalizado
    : isPlainObject(localStorageMap[STORAGE_KEYS.VERTICAL_SYLLABUS])
    ? (localStorageMap[STORAGE_KEYS.VERTICAL_SYLLABUS] as Record<string, any>)
    : {};

  const customMaterials: Record<string, any> = isPlainObject(rawData.customMaterials)
    ? rawData.customMaterials
    : isPlainObject(rawData.modules?.material_estudo_custom)
    ? rawData.modules.material_estudo_custom
    : isPlainObject(localStorageMap[STORAGE_KEYS.CUSTOM_MATERIALS])
    ? (localStorageMap[STORAGE_KEYS.CUSTOM_MATERIALS] as Record<string, any>)
    : {};

  const materialLinks: any[] = Array.isArray(rawData.materialLinks)
    ? rawData.materialLinks
    : Array.isArray(rawData.modules?.material_links)
    ? rawData.modules.material_links
    : Array.isArray(localStorageMap[STORAGE_KEYS.MATERIAL_LINKS])
    ? (localStorageMap[STORAGE_KEYS.MATERIAL_LINKS] as any[])
    : [];

  const scheduleDayNotes: Record<string, string> = isPlainObject(rawData.scheduleDayNotes)
    ? rawData.scheduleDayNotes
    : isPlainObject(rawData.modules?.cronograma_notas)
    ? rawData.modules.cronograma_notas
    : isPlainObject(localStorageMap[STORAGE_KEYS.SCHEDULE_DAY_NOTES])
    ? (localStorageMap[STORAGE_KEYS.SCHEDULE_DAY_NOTES] as Record<string, string>)
    : {};

  const bancaNotes: Record<string, any> = isPlainObject(rawData.bancaNotes)
    ? rawData.bancaNotes
    : isPlainObject(localStorageMap[STORAGE_KEYS.BANCA_NOTES])
    ? (localStorageMap[STORAGE_KEYS.BANCA_NOTES] as Record<string, any>)
    : {};

  const rawFocusLogs = Array.isArray(rawData.pomodoroFocusLogs)
    ? rawData.pomodoroFocusLogs
    : Array.isArray(rawData.modules?.foco_logs)
    ? rawData.modules.foco_logs
    : Array.isArray(localStorageMap[STORAGE_KEYS.FOCUS_LOGS])
    ? (localStorageMap[STORAGE_KEYS.FOCUS_LOGS] as any[])
    : [];
  const pomodoroFocusLogs = deduplicateFocusLogs(rawFocusLogs);

  const rawActivePomodoro =
    rawData.pomodoroActiveState !== undefined
      ? rawData.pomodoroActiveState
      : rawData.modules?.pomodoro_ativo !== undefined
      ? rawData.modules.pomodoro_ativo
      : localStorageMap[STORAGE_KEYS.POMODORO_ACTIVE_STATE] ?? null;
  const pomodoroActiveState = isPlainObject(rawActivePomodoro)
    ? isLegacyFlatOr22
      ? normalizeRestoredPomodoroOnAppOpen(rawActivePomodoro as any)
      : rawActivePomodoro
    : null;

  const studyResumeState = isPlainObject(rawData.studyResumeState)
    ? rawData.studyResumeState
    : isPlainObject(rawData.modules?.retomada_estudo)
    ? rawData.modules.retomada_estudo
    : isPlainObject(localStorageMap[STORAGE_KEYS.STUDY_RESUME_STATE])
    ? localStorageMap[STORAGE_KEYS.STUDY_RESUME_STATE]
    : null;

  const calendarSelectedDate =
    typeof rawData.calendarSelectedDate === 'string' && rawData.calendarSelectedDate.trim()
      ? rawData.calendarSelectedDate.trim()
      : typeof localStorageMap[STORAGE_KEYS.CALENDAR_SELECTED_DATE] === 'string'
      ? String(localStorageMap[STORAGE_KEYS.CALENDAR_SELECTED_DATE]).trim()
      : undefined;

  const cleanOther = sanitizeOtherStorageKeys(rawData.otherStorageKeys);
  if (
    isPlainObject(rawData.otherStorageKeys) &&
    'transpetro_pre_drive_sync_safety_backup_v1' in rawData.otherStorageKeys
  ) {
    warnings.push(
      'Recursão legada (transpetro_pre_drive_sync_safety_backup_v1) removida automaticamente durante a migração.'
    );
  }

  // Preencher localStorageMap apenas ao migrar backups legados (sem data.localStorage autoritativo)
  if (isLegacyFlatOr22) {
    if (!(STORAGE_KEYS.VERTICAL_SYLLABUS in localStorageMap) && isPlainObject(verticalSyllabusProgress)) {
      localStorageMap[STORAGE_KEYS.VERTICAL_SYLLABUS] = verticalSyllabusProgress;
    }
    if (!(STORAGE_KEYS.ERROR_NOTEBOOK in localStorageMap) && Array.isArray(errorNotebook)) {
      localStorageMap[STORAGE_KEYS.ERROR_NOTEBOOK] = errorNotebook;
    }
    if (!(STORAGE_KEYS.CUSTOM_MATERIALS in localStorageMap) && isPlainObject(customMaterials)) {
      localStorageMap[STORAGE_KEYS.CUSTOM_MATERIALS] = customMaterials;
    }
    if (!(STORAGE_KEYS.MATERIAL_LINKS in localStorageMap) && Array.isArray(materialLinks)) {
      localStorageMap[STORAGE_KEYS.MATERIAL_LINKS] = materialLinks;
    }
    if (!(STORAGE_KEYS.SCHEDULE_DAY_NOTES in localStorageMap) && isPlainObject(scheduleDayNotes)) {
      localStorageMap[STORAGE_KEYS.SCHEDULE_DAY_NOTES] = scheduleDayNotes;
    }
    if (!(STORAGE_KEYS.FOCUS_LOGS in localStorageMap) && Array.isArray(pomodoroFocusLogs)) {
      localStorageMap[STORAGE_KEYS.FOCUS_LOGS] = pomodoroFocusLogs;
    }
    if (!(STORAGE_KEYS.POMODORO_ACTIVE_STATE in localStorageMap) && pomodoroActiveState) {
      localStorageMap[STORAGE_KEYS.POMODORO_ACTIVE_STATE] = pomodoroActiveState;
    }
    if (!(STORAGE_KEYS.STUDY_RESUME_STATE in localStorageMap) && studyResumeState) {
      localStorageMap[STORAGE_KEYS.STUDY_RESUME_STATE] = studyResumeState;
    }
    if (!(STORAGE_KEYS.CALENDAR_SELECTED_DATE in localStorageMap) && calendarSelectedDate) {
      localStorageMap[STORAGE_KEYS.CALENDAR_SELECTED_DATE] = calendarSelectedDate;
    }
    if (!(STORAGE_KEYS.COMPLETED_DAYS in localStorageMap) && completedDays.length > 0) {
      localStorageMap[STORAGE_KEYS.COMPLETED_DAYS] = completedDays;
    }
    if (!(STORAGE_KEYS.COMPLETED_BLOCKS in localStorageMap) && completedBlocks.length > 0) {
      localStorageMap[STORAGE_KEYS.COMPLETED_BLOCKS] = completedBlocks;
    }
    if (!(STORAGE_KEYS.BANCA_NOTES in localStorageMap) && Object.keys(bancaNotes).length > 0) {
      localStorageMap[STORAGE_KEYS.BANCA_NOTES] = bancaNotes;
    }

    Object.entries(cleanOther).forEach(([k, v]) => {
      if (!(k in localStorageMap)) {
        localStorageMap[k] = v;
      }
    });

    if (isPlainObject(rawData.settings)) {
      Object.entries(rawData.settings).forEach(([k, v]) => {
        if (!EXCLUDED_STORAGE_KEYS.has(k) && !(k in localStorageMap) && v !== null && v !== undefined) {
          localStorageMap[k] = v;
        }
      });
    }
  }

  const createdAt =
    (isPlainObject(rawInput.metadata) && typeof rawInput.metadata.createdAt === 'string'
      ? rawInput.metadata.createdAt
      : undefined) ||
    (typeof rawInput.exportTimestamp === 'string' ? rawInput.exportTimestamp : undefined) ||
    new Date().toISOString();

  const createdAtFormatted =
    (typeof rawInput.exportDateFormatted === 'string' ? rawInput.exportDateFormatted : undefined) ||
    new Date(createdAt).toLocaleString('pt-BR');

  const payload: CompleteBackupPayload = {
    version: BACKUP_SCHEMA_VERSION,
    app: BACKUP_APP_NAME,
    exportTimestamp: createdAt,
    exportDateFormatted: createdAtFormatted,
    metadata: {
      application: BACKUP_APP_NAME,
      backupVersion: BACKUP_SCHEMA_VERSION,
      createdAt,
      createdAtFormatted,
      applicationVersion:
        (isPlainObject(rawInput.metadata) && typeof rawInput.metadata.applicationVersion === 'string'
          ? rawInput.metadata.applicationVersion
          : undefined) || '2027.1',
      format: 'complete-backup',
      complete: Boolean(isPlainObject(rawInput.metadata) ? rawInput.metadata.complete : true),
    },
    manifest: isPlainObject(rawInput.manifest)
      ? (rawInput.manifest as CompleteBackupManifest)
      : {
          modules: [],
          registeredModules: [],
          storageSources: ['localStorage'],
          exportedKeys: Object.keys(localStorageMap),
          unregisteredKeys: [],
          recordCounts: {},
          totalRecords: 0,
          validation: {
            valid: true,
            complete: true,
            warnings: [...warnings],
            errors: [],
          },
        },
    integrity: isPlainObject(rawInput.integrity)
      ? (rawInput.integrity as CompleteBackupIntegrity)
      : undefined,
    data: {
      localStorage: localStorageMap,
      sessionStorage: {},
      indexedDB: {},
      modules: isPlainObject(rawData.modules)
        ? { ...rawData.modules }
        : {
            edital_verticalizado: verticalSyllabusProgress,
            caderno_erros: errorNotebook,
            material_estudo_custom: customMaterials,
            material_links: materialLinks,
            cronograma_notas: scheduleDayNotes,
            foco_logs: pomodoroFocusLogs,
            pomodoro_ativo: pomodoroActiveState,
            retomada_estudo: studyResumeState,
          },
      settings: isPlainObject(rawData.settings) ? { ...rawData.settings } : {},
      legacy: isPlainObject(rawData.legacy)
        ? { ...rawData.legacy }
        : {
            completedDays,
            completedBlocks,
            bancaNotes,
          },
      ...(Object.keys(unknownDataFields).length > 0 ? { unknownFields: unknownDataFields } : {}),
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
      otherStorageKeys: cleanOther,
    },
    ...(Object.keys(unknownRootFields).length > 0 ? { unknownRootFields } : {}),
  };

  return {
    detectedVersion,
    migratedFromLegacy: isLegacyFlatOr22,
    warnings,
    payload,
  };
}
