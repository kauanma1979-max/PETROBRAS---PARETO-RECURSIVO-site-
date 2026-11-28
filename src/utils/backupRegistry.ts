/**
 * Registro Centralizado de Fontes de Dados Persistentes
 * Garante cobertura integral de todos os módulos e chaves da plataforma.
 */

import {
  deduplicateFocusLogs,
  FOCUS_STORAGE_KEYS,
  normalizeRestoredPomodoroOnAppOpen,
} from './studyFocusStorage';

export type BackupModuleCategory = 'data' | 'settings' | 'legacy';

export interface BackupModuleReadResult {
  rawPresent: boolean;
  value: unknown;
  parseError?: string;
}

export interface BackupModuleDefinition {
  id: string;
  moduleName: string;
  category: BackupModuleCategory;
  storageSource: 'localStorage';
  primaryKey: string;
  version: string;
  defaultValue: () => unknown;
  countRecords: (value: unknown) => number;
  validateValue: (value: unknown) => string[];
  normalizeForWrite?: (value: unknown) => unknown;
  isRawString?: boolean;
}

export const BACKUP_FILE_NAME = 'PLATAFORMA TRANSPETRO.json';
export const LEGACY_BACKUP_FILE_NAME = 'Petrobras_Enfase_Operacao_Jr.json';
export const BACKUP_SCHEMA_VERSION = '2.3';
export const BACKUP_APP_NAME = 'PETROBRAS - PARETO RECURSIVO';
export const UNKNOWN_FIELDS_STORAGE_KEY = 'transpetro_backup_unknown_fields_v1';

/**
 * Chaves conhecidas que NUNCA devem entrar no backup exportado:
 * - Tokens OAuth / credenciais de sessão
 * - Snapshots internos de segurança / rollback (evita recursão infinita)
 * - Estados puramente locais do navegador atual
 */
export const EXCLUDED_STORAGE_KEYS = new Set<string>([
  'transpetro_pre_drive_sync_safety_backup_v1',
  'transpetro_pre_restore_rollback_v1',
  'transpetro_google_drive_oauth_token_v1',
  'google_drive_sync_validated_v1',
  'google_drive_last_sync_date_v1',
  'google_drive_sync_file_id_v1',
  UNKNOWN_FIELDS_STORAGE_KEY,
]);

export const STORAGE_KEYS = {
  COMPLETED_DAYS: 'transpetro_completed_days_v2',
  COMPLETED_BLOCKS: 'transpetro_completed_blocks_v1',
  ERROR_NOTEBOOK: 'transpetro_caderno_erros',
  ERROR_NOTEBOOK_CUSTOMIZED: 'transpetro_caderno_erros_customized',
  ERROR_NOTEBOOK_AREAS_CUSTOM: 'transpetro_caderno_areas_custom_v1',
  ERROR_NOTEBOOK_SIMULATOR: 'transpetro_caderno_simulador_v1',
  VERTICAL_SYLLABUS: 'transpetro_edital_verticalizado_progress_v2',
  VERTICAL_FILTER_MACRO: 'transpetro_vertical_macro',
  VERTICAL_FILTER_ORIGEM: 'transpetro_vertical_origem',
  VERTICAL_FILTER_PRIORIDADE: 'transpetro_vertical_prioridade',
  VERTICAL_FILTER_STATUS: 'transpetro_vertical_status',
  CUSTOM_MATERIALS: 'transpetro_material_estudo_custom_v1',
  MATERIAL_SELECTED_MODULO: 'transpetro_material_selected_modulo',
  MATERIAL_LINKS: 'transpetro_material_links_v1',
  SCHEDULE_DAY_NOTES: 'transpetro_schedule_day_notes',
  BANCA_NOTES: 'transpetro_banca_notes_v1',
  FOCUS_LOGS: FOCUS_STORAGE_KEYS.FOCUS_LOGS,
  POMODORO_ACTIVE_STATE: FOCUS_STORAGE_KEYS.ACTIVE_STATE,
  STUDY_RESUME_STATE: FOCUS_STORAGE_KEYS.RESUME_STATE,
  CALENDAR_SELECTED_DATE: FOCUS_STORAGE_KEYS.SELECTED_DATE,
  ACTIVE_TAB: 'transpetro_active_tab_v1',
  DRIVE_ENDPOINT: 'google_drive_sync_endpoint_v1',
  DRIVE_AUTO_SYNC: 'google_drive_auto_sync_v1',
  DRIVE_AUTO_PUSH: 'google_drive_auto_push_v1',
} as const;

const isPlainObject = (val: unknown): val is Record<string, any> =>
  Boolean(val) && typeof val === 'object' && !Array.isArray(val);

export const BACKUP_MODULES_REGISTRY: BackupModuleDefinition[] = [
  {
    id: 'edital_verticalizado',
    moduleName: 'Edital Verticalizado (Progresso)',
    category: 'data',
    storageSource: 'localStorage',
    primaryKey: STORAGE_KEYS.VERTICAL_SYLLABUS,
    version: BACKUP_SCHEMA_VERSION,
    defaultValue: () => ({}),
    countRecords: (val) => (isPlainObject(val) ? Object.keys(val).length : 0),
    validateValue: (val) =>
      isPlainObject(val) ? [] : ['Progresso do Edital Verticalizado deve ser um objeto.'],
  },
  {
    id: 'caderno_erros',
    moduleName: 'Caderno de Erros',
    category: 'data',
    storageSource: 'localStorage',
    primaryKey: STORAGE_KEYS.ERROR_NOTEBOOK,
    version: BACKUP_SCHEMA_VERSION,
    defaultValue: () => [],
    countRecords: (val) => (Array.isArray(val) ? val.length : 0),
    validateValue: (val) => {
      if (!Array.isArray(val)) return ['Caderno de Erros deve ser uma lista (array).'];
      const errors: string[] = [];
      val.forEach((item, idx) => {
        if (!isPlainObject(item) || !item.id || typeof item.subtopico !== 'string') {
          errors.push(`Registro inválido no Caderno de Erros no índice ${idx}.`);
        }
      });
      return errors;
    },
  },
  {
    id: 'caderno_erros_flag',
    moduleName: 'Caderno de Erros (Flag de Personalização)',
    category: 'settings',
    storageSource: 'localStorage',
    primaryKey: STORAGE_KEYS.ERROR_NOTEBOOK_CUSTOMIZED,
    version: BACKUP_SCHEMA_VERSION,
    defaultValue: () => null,
    countRecords: (val) => (val !== null && val !== undefined && val !== '' ? 1 : 0),
    validateValue: () => [],
    isRawString: true,
  },
  {
    id: 'caderno_areas_custom',
    moduleName: 'Caderno de Erros (Áreas Personalizadas)',
    category: 'data',
    storageSource: 'localStorage',
    primaryKey: STORAGE_KEYS.ERROR_NOTEBOOK_AREAS_CUSTOM,
    version: BACKUP_SCHEMA_VERSION,
    defaultValue: () => ({}),
    countRecords: (val) => (isPlainObject(val) ? Object.keys(val).length : 0),
    validateValue: (val) =>
      isPlainObject(val) ? [] : ['Áreas personalizadas do Caderno devem ser um objeto.'],
  },
  {
    id: 'caderno_simulador',
    moduleName: 'Simulador de Acertos (Caderno)',
    category: 'settings',
    storageSource: 'localStorage',
    primaryKey: STORAGE_KEYS.ERROR_NOTEBOOK_SIMULATOR,
    version: BACKUP_SCHEMA_VERSION,
    defaultValue: () => null,
    countRecords: (val) => (isPlainObject(val) ? 1 : 0),
    validateValue: (val) =>
      val === null || val === undefined || isPlainObject(val)
        ? []
        : ['Estado do simulador de acertos deve ser um objeto.'],
  },
  {
    id: 'material_estudo_custom',
    moduleName: 'Material de Estudo (Notas & Mapas Mentais)',
    category: 'data',
    storageSource: 'localStorage',
    primaryKey: STORAGE_KEYS.CUSTOM_MATERIALS,
    version: BACKUP_SCHEMA_VERSION,
    defaultValue: () => ({}),
    countRecords: (val) => (isPlainObject(val) ? Object.keys(val).length : 0),
    validateValue: (val) =>
      isPlainObject(val) ? [] : ['Materiais customizados devem ser um objeto.'],
  },
  {
    id: 'material_links',
    moduleName: 'Links e Materiais de Estudo',
    category: 'data',
    storageSource: 'localStorage',
    primaryKey: STORAGE_KEYS.MATERIAL_LINKS,
    version: BACKUP_SCHEMA_VERSION,
    defaultValue: () => [],
    countRecords: (val) => (Array.isArray(val) ? val.length : 0),
    validateValue: (val) => {
      if (!Array.isArray(val)) return ['Links de materiais devem ser uma lista (array).'];
      const errors: string[] = [];
      val.forEach((item, idx) => {
        if (!isPlainObject(item) || !item.id || typeof item.titulo !== 'string') {
          errors.push(`Link de material inválido no índice ${idx}.`);
        }
      });
      return errors;
    },
  },
  {
    id: 'cronograma_notas',
    moduleName: 'Cronograma & Ciclos (Anotações por Bloco)',
    category: 'data',
    storageSource: 'localStorage',
    primaryKey: STORAGE_KEYS.SCHEDULE_DAY_NOTES,
    version: BACKUP_SCHEMA_VERSION,
    defaultValue: () => ({}),
    countRecords: (val) => (isPlainObject(val) ? Object.keys(val).length : 0),
    validateValue: (val) =>
      isPlainObject(val) ? [] : ['Anotações do cronograma devem ser um objeto.'],
  },
  {
    id: 'foco_logs',
    moduleName: 'Histórico Líquido de Foco (50/20)',
    category: 'data',
    storageSource: 'localStorage',
    primaryKey: STORAGE_KEYS.FOCUS_LOGS,
    version: BACKUP_SCHEMA_VERSION,
    defaultValue: () => [],
    countRecords: (val) => (Array.isArray(val) ? deduplicateFocusLogs(val).length : 0),
    validateValue: (val) =>
      Array.isArray(val) ? [] : ['Registros de foco devem ser uma lista (array).'],
    normalizeForWrite: (val) => (Array.isArray(val) ? deduplicateFocusLogs(val) : []),
  },
  {
    id: 'pomodoro_ativo',
    moduleName: 'Cronômetro Ativo (Checkpoint)',
    category: 'data',
    storageSource: 'localStorage',
    primaryKey: STORAGE_KEYS.POMODORO_ACTIVE_STATE,
    version: BACKUP_SCHEMA_VERSION,
    defaultValue: () => null,
    countRecords: (val) => (isPlainObject(val) ? 1 : 0),
    validateValue: (val) =>
      val === null || val === undefined || isPlainObject(val)
        ? []
        : ['Estado ativo do cronômetro deve ser objeto ou nulo.'],
    normalizeForWrite: (val) =>
      isPlainObject(val) ? normalizeRestoredPomodoroOnAppOpen(val as any) : null,
  },
  {
    id: 'retomada_estudo',
    moduleName: 'Ponteiro de Retomada de Estudo',
    category: 'data',
    storageSource: 'localStorage',
    primaryKey: STORAGE_KEYS.STUDY_RESUME_STATE,
    version: BACKUP_SCHEMA_VERSION,
    defaultValue: () => null,
    countRecords: (val) => (isPlainObject(val) ? 1 : 0),
    validateValue: (val) =>
      val === null || val === undefined || isPlainObject(val)
        ? []
        : ['Estado de retomada deve ser objeto ou nulo.'],
  },
  {
    id: 'calendario_data',
    moduleName: 'Calendário 2027 (Data Selecionada)',
    category: 'settings',
    storageSource: 'localStorage',
    primaryKey: STORAGE_KEYS.CALENDAR_SELECTED_DATE,
    version: BACKUP_SCHEMA_VERSION,
    defaultValue: () => null,
    countRecords: (val) => (typeof val === 'string' && val.trim() ? 1 : 0),
    validateValue: (val) =>
      val === null || val === undefined || typeof val === 'string'
        ? []
        : ['Data selecionada do calendário deve ser string.'],
    isRawString: true,
  },
  {
    id: 'edital_filtro_macro',
    moduleName: 'Edital Verticalizado (Filtro Macro)',
    category: 'settings',
    storageSource: 'localStorage',
    primaryKey: STORAGE_KEYS.VERTICAL_FILTER_MACRO,
    version: BACKUP_SCHEMA_VERSION,
    defaultValue: () => null,
    countRecords: (val) => (typeof val === 'string' && val.trim() ? 1 : 0),
    validateValue: () => [],
    isRawString: true,
  },
  {
    id: 'edital_filtro_origem',
    moduleName: 'Edital Verticalizado (Filtro Origem)',
    category: 'settings',
    storageSource: 'localStorage',
    primaryKey: STORAGE_KEYS.VERTICAL_FILTER_ORIGEM,
    version: BACKUP_SCHEMA_VERSION,
    defaultValue: () => null,
    countRecords: (val) => (typeof val === 'string' && val.trim() ? 1 : 0),
    validateValue: () => [],
    isRawString: true,
  },
  {
    id: 'edital_filtro_prioridade',
    moduleName: 'Edital Verticalizado (Filtro Prioridade)',
    category: 'settings',
    storageSource: 'localStorage',
    primaryKey: STORAGE_KEYS.VERTICAL_FILTER_PRIORIDADE,
    version: BACKUP_SCHEMA_VERSION,
    defaultValue: () => null,
    countRecords: (val) => (typeof val === 'string' && val.trim() ? 1 : 0),
    validateValue: () => [],
    isRawString: true,
  },
  {
    id: 'edital_filtro_status',
    moduleName: 'Edital Verticalizado (Filtro Status)',
    category: 'settings',
    storageSource: 'localStorage',
    primaryKey: STORAGE_KEYS.VERTICAL_FILTER_STATUS,
    version: BACKUP_SCHEMA_VERSION,
    defaultValue: () => null,
    countRecords: (val) => (typeof val === 'string' && val.trim() ? 1 : 0),
    validateValue: () => [],
    isRawString: true,
  },
  {
    id: 'material_modulo_ativo',
    moduleName: 'Material de Estudo (Módulo Selecionado)',
    category: 'settings',
    storageSource: 'localStorage',
    primaryKey: STORAGE_KEYS.MATERIAL_SELECTED_MODULO,
    version: BACKUP_SCHEMA_VERSION,
    defaultValue: () => null,
    countRecords: (val) => (typeof val === 'string' && val.trim() ? 1 : 0),
    validateValue: () => [],
    isRawString: true,
  },
  {
    id: 'navegacao_aba_ativa',
    moduleName: 'Navegação (Aba Ativa)',
    category: 'settings',
    storageSource: 'localStorage',
    primaryKey: STORAGE_KEYS.ACTIVE_TAB,
    version: BACKUP_SCHEMA_VERSION,
    defaultValue: () => null,
    countRecords: (val) => (typeof val === 'string' && val.trim() ? 1 : 0),
    validateValue: () => [],
    isRawString: true,
  },
  {
    id: 'config_drive_endpoint',
    moduleName: 'Configuração Drive (URL Apps Script)',
    category: 'settings',
    storageSource: 'localStorage',
    primaryKey: STORAGE_KEYS.DRIVE_ENDPOINT,
    version: BACKUP_SCHEMA_VERSION,
    defaultValue: () => null,
    countRecords: (val) => (typeof val === 'string' && val.trim() ? 1 : 0),
    validateValue: () => [],
    isRawString: true,
  },
  {
    id: 'config_drive_auto_sync',
    moduleName: 'Configuração Drive (Auto-Sync)',
    category: 'settings',
    storageSource: 'localStorage',
    primaryKey: STORAGE_KEYS.DRIVE_AUTO_SYNC,
    version: BACKUP_SCHEMA_VERSION,
    defaultValue: () => null,
    countRecords: (val) => (typeof val === 'string' && val.trim() ? 1 : 0),
    validateValue: () => [],
    isRawString: true,
  },
  {
    id: 'config_drive_auto_push',
    moduleName: 'Configuração Drive (Auto-Push)',
    category: 'settings',
    storageSource: 'localStorage',
    primaryKey: STORAGE_KEYS.DRIVE_AUTO_PUSH,
    version: BACKUP_SCHEMA_VERSION,
    defaultValue: () => null,
    countRecords: (val) => (typeof val === 'string' && val.trim() ? 1 : 0),
    validateValue: () => [],
    isRawString: true,
  },
  {
    id: 'legado_completed_days',
    moduleName: 'Legado (Dias Concluídos v2)',
    category: 'legacy',
    storageSource: 'localStorage',
    primaryKey: STORAGE_KEYS.COMPLETED_DAYS,
    version: BACKUP_SCHEMA_VERSION,
    defaultValue: () => [],
    countRecords: (val) => (Array.isArray(val) ? val.length : 0),
    validateValue: (val) => (Array.isArray(val) ? [] : ['completedDays legado deve ser array.']),
  },
  {
    id: 'legado_completed_blocks',
    moduleName: 'Legado (Blocos Concluídos v1)',
    category: 'legacy',
    storageSource: 'localStorage',
    primaryKey: STORAGE_KEYS.COMPLETED_BLOCKS,
    version: BACKUP_SCHEMA_VERSION,
    defaultValue: () => [],
    countRecords: (val) => (Array.isArray(val) ? val.length : 0),
    validateValue: (val) => (Array.isArray(val) ? [] : ['completedBlocks legado deve ser array.']),
  },
  {
    id: 'legado_banca_notes',
    moduleName: 'Legado (Notas da Banca)',
    category: 'legacy',
    storageSource: 'localStorage',
    primaryKey: STORAGE_KEYS.BANCA_NOTES,
    version: BACKUP_SCHEMA_VERSION,
    defaultValue: () => ({}),
    countRecords: (val) => (isPlainObject(val) ? Object.keys(val).length : 0),
    validateValue: (val) => (isPlainObject(val) ? [] : ['bancaNotes legado deve ser objeto.']),
  },
];

export const REGISTERED_KEY_TO_MODULE = new Map<string, BackupModuleDefinition>(
  BACKUP_MODULES_REGISTRY.map((mod) => [mod.primaryKey, mod])
);

export const MODULE_BY_ID = new Map<string, BackupModuleDefinition>(
  BACKUP_MODULES_REGISTRY.map((mod) => [mod.id, mod])
);

export function isKnownAppKeyPrefix(key: string): boolean {
  return key.startsWith('transpetro_') || key.startsWith('google_drive_');
}

export function readModuleFromStorage(mod: BackupModuleDefinition): BackupModuleReadResult {
  if (typeof localStorage === 'undefined') {
    return { rawPresent: false, value: mod.defaultValue() };
  }
  try {
    const raw = localStorage.getItem(mod.primaryKey);
    if (raw === null) {
      return { rawPresent: false, value: mod.defaultValue() };
    }
    if (mod.isRawString) {
      return { rawPresent: true, value: raw };
    }
    try {
      const parsed = JSON.parse(raw);
      return { rawPresent: true, value: parsed };
    } catch (parseErr: any) {
      return {
        rawPresent: true,
        value: raw,
        parseError: `Conteúdo JSON corrompido na chave "${mod.primaryKey}": ${parseErr?.message || 'Erro de sintaxe'}`,
      };
    }
  } catch (readErr: any) {
    return {
      rawPresent: false,
      value: mod.defaultValue(),
      parseError: `Erro ao ler chave "${mod.primaryKey}": ${readErr?.message || 'Erro de acesso'}`,
    };
  }
}

export function writeModuleToStorage(mod: BackupModuleDefinition, rawValue: unknown): void {
  if (typeof localStorage === 'undefined') return;
  const value = mod.normalizeForWrite ? mod.normalizeForWrite(rawValue) : rawValue;

  if (value === null || value === undefined) {
    localStorage.removeItem(mod.primaryKey);
    return;
  }

  if (mod.isRawString) {
    const strVal = typeof value === 'string' ? value : String(value);
    if (!strVal) {
      localStorage.removeItem(mod.primaryKey);
    } else {
      localStorage.setItem(mod.primaryKey, strVal);
    }
    return;
  }

  localStorage.setItem(mod.primaryKey, JSON.stringify(value));
}

export function discoverUnregisteredAppStorage(): {
  extraEntries: Record<string, unknown>;
  unregisteredKeys: string[];
  parseWarnings: string[];
} {
  const extraEntries: Record<string, unknown> = {};
  const unregisteredKeys: string[] = [];
  const parseWarnings: string[] = [];

  if (typeof localStorage === 'undefined') {
    return { extraEntries, unregisteredKeys, parseWarnings };
  }

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;
    if (EXCLUDED_STORAGE_KEYS.has(key)) continue;
    if (REGISTERED_KEY_TO_MODULE.has(key)) continue;
    if (!isKnownAppKeyPrefix(key)) continue;

    unregisteredKeys.push(key);
    const raw = localStorage.getItem(key);
    if (raw === null) continue;
    try {
      extraEntries[key] = JSON.parse(raw);
    } catch {
      extraEntries[key] = raw;
      parseWarnings.push(`Chave extra "${key}" armazenada como texto bruto (não-JSON).`);
    }
  }

  return { extraEntries, unregisteredKeys, parseWarnings };
}
