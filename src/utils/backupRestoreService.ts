/**
 * Serviço Transacional de Inspeção e Restauração Completa de Backups
 * - Pré-visualização antes de sobrescrever
 * - Preservação opcional do estado atual
 * - Validação estrutural + Checksum SHA-256
 * - Preservação de campos desconhecidos e IDs originais
 * - Rollback atômico em caso de falha durante gravação
 */

import {
  BACKUP_MODULES_REGISTRY,
  EXCLUDED_STORAGE_KEYS,
  isKnownAppKeyPrefix,
  REGISTERED_KEY_TO_MODULE,
  STORAGE_KEYS,
  UNKNOWN_FIELDS_STORAGE_KEY,
  writeModuleToStorage,
} from './backupRegistry';
import {
  migrateBackupToCurrent,
  type CompleteBackupPayload,
} from './backupMigration';
import {
  validateBackupPayloadStructure,
  verifyChecksumIntegrity,
  type BackupIntegrityReport,
} from './backupValidator';
import { generateCompleteBackupSync } from './backupSerializer';
import { dispatchFocusUpdated } from './studyFocusStorage';

export interface BackupModuleSummaryItem {
  id: string;
  moduleName: string;
  count: number;
}

export interface BackupInspectionResult {
  valid: boolean;
  canRestore: boolean;
  detectedVersion: string;
  migratedFromLegacy: boolean;
  createdAtFormatted: string;
  checksumStatus: 'verified' | 'mismatch' | 'not_present';
  totalRecords: number;
  totalKeys: number;
  modulesSummary: BackupModuleSummaryItem[];
  warnings: string[];
  errors: string[];
  migratedPayload: CompleteBackupPayload | null;
  integrityReport: BackupIntegrityReport | null;
}

export interface RestoreExecutionResult {
  success: boolean;
  rolledBack: boolean;
  message: string;
  report?: BackupIntegrityReport;
  stats?: {
    completedDaysCount: number;
    errorNotebookCount: number;
    verticalTopicsCount: number;
    customMaterialsCount: number;
    materialLinksCount: number;
    scheduleNotesCount: number;
    bancaNotesCount: number;
    focusLogsCount: number;
    totalItems: number;
  };
}

export const PRE_RESTORE_SAFETY_KEY = 'transpetro_pre_restore_rollback_v1';

export async function inspectBackupObject(rawInput: unknown): Promise<BackupInspectionResult> {
  try {
    const migration = migrateBackupToCurrent(rawInput);
    const { payload, detectedVersion, migratedFromLegacy, warnings: migrationWarnings } = migration;

    const checksumTarget =
      !migratedFromLegacy &&
      rawInput &&
      typeof rawInput === 'object' &&
      'integrity' in rawInput &&
      'data' in rawInput
        ? (rawInput as CompleteBackupPayload)
        : payload;
    const checksumStatus = await verifyChecksumIntegrity(checksumTarget);
    const report = validateBackupPayloadStructure(payload);
    const warnings = Array.from(new Set([...migrationWarnings, ...report.warnings]));
    const errors = [...report.errors];

    if (checksumStatus === 'mismatch') {
      errors.push(
        'Checksum SHA-256 divergente: o arquivo pode ter sido alterado ou corrompido após a geração.'
      );
    }

    const modulesSummary: BackupModuleSummaryItem[] = BACKUP_MODULES_REGISTRY.map((mod) => ({
      id: mod.id,
      moduleName: mod.moduleName,
      count: report.recordCountsByModule[mod.id] || 0,
    })).filter((m) => m.count > 0);

    const canRestore = errors.length === 0;

    return {
      valid: canRestore,
      canRestore,
      detectedVersion,
      migratedFromLegacy,
      createdAtFormatted: payload.exportDateFormatted || payload.exportTimestamp,
      checksumStatus,
      totalRecords: report.totalRecords,
      totalKeys: Object.keys(payload.data.localStorage || {}).length,
      modulesSummary,
      warnings,
      errors,
      migratedPayload: payload,
      integrityReport: report,
    };
  } catch (err: any) {
    return {
      valid: false,
      canRestore: false,
      detectedVersion: 'unknown',
      migratedFromLegacy: false,
      createdAtFormatted: '-',
      checksumStatus: 'not_present',
      totalRecords: 0,
      totalKeys: 0,
      modulesSummary: [],
      warnings: [],
      errors: [err?.message || 'Formato de backup inválido ou corrompido.'],
      migratedPayload: null,
      integrityReport: null,
    };
  }
}

export async function inspectBackupFromJsonString(
  jsonString: string
): Promise<BackupInspectionResult> {
  if (!jsonString || !jsonString.trim()) {
    return {
      valid: false,
      canRestore: false,
      detectedVersion: 'unknown',
      migratedFromLegacy: false,
      createdAtFormatted: '-',
      checksumStatus: 'not_present',
      totalRecords: 0,
      totalKeys: 0,
      modulesSummary: [],
      warnings: [],
      errors: ['O texto JSON fornecido está vazio.'],
      migratedPayload: null,
      integrityReport: null,
    };
  }

  try {
    const parsed = JSON.parse(jsonString);
    return inspectBackupObject(parsed);
  } catch (err: any) {
    return {
      valid: false,
      canRestore: false,
      detectedVersion: 'unknown',
      migratedFromLegacy: false,
      createdAtFormatted: '-',
      checksumStatus: 'not_present',
      totalRecords: 0,
      totalKeys: 0,
      modulesSummary: [],
      warnings: [],
      errors: [`JSON inválido: ${err?.message || 'Erro de sintaxe.'}`],
      migratedPayload: null,
      integrityReport: null,
    };
  }
}

export async function inspectBackupFromFile(file: File): Promise<BackupInspectionResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      if (!content) {
        resolve({
          valid: false,
          canRestore: false,
          detectedVersion: 'unknown',
          migratedFromLegacy: false,
          createdAtFormatted: '-',
          checksumStatus: 'not_present',
          totalRecords: 0,
          totalKeys: 0,
          modulesSummary: [],
          warnings: [],
          errors: ['O arquivo selecionado está vazio.'],
          migratedPayload: null,
          integrityReport: null,
        });
        return;
      }
      resolve(await inspectBackupFromJsonString(content));
    };
    reader.onerror = () => {
      resolve({
        valid: false,
        canRestore: false,
        detectedVersion: 'unknown',
        migratedFromLegacy: false,
        createdAtFormatted: '-',
        checksumStatus: 'not_present',
        totalRecords: 0,
        totalKeys: 0,
        modulesSummary: [],
        warnings: [],
        errors: ['Falha na leitura do arquivo selecionado.'],
        migratedPayload: null,
        integrityReport: null,
      });
    };
    reader.readAsText(file);
  });
}

function captureAllAppStorageSnapshot(): Record<string, string> {
  const snapshot: Record<string, string> = {};
  if (typeof localStorage === 'undefined') return snapshot;

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;
    if (EXCLUDED_STORAGE_KEYS.has(key)) continue;
    if (!REGISTERED_KEY_TO_MODULE.has(key) && !isKnownAppKeyPrefix(key)) continue;
    const raw = localStorage.getItem(key);
    if (raw !== null) {
      snapshot[key] = raw;
    }
  }
  return snapshot;
}

function rollbackAppStorage(previousSnapshot: Record<string, string>): void {
  if (typeof localStorage === 'undefined') return;

  // Remover quaisquer chaves atuais do app que foram escritas parcialmente
  const keysToClear: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;
    if (EXCLUDED_STORAGE_KEYS.has(key)) continue;
    if (REGISTERED_KEY_TO_MODULE.has(key) || isKnownAppKeyPrefix(key)) {
      keysToClear.push(key);
    }
  }
  keysToClear.forEach((k) => {
    try {
      localStorage.removeItem(k);
    } catch {
      // ignore
    }
  });

  // Restaurar exatamente as chaves anteriores
  Object.entries(previousSnapshot).forEach(([k, v]) => {
    try {
      localStorage.setItem(k, v);
    } catch {
      // ignore
    }
  });
}

function notifyRestoredApplicationState(): void {
  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('transpetro_storage_changed', { detail: { key: undefined } }));
      window.dispatchEvent(new CustomEvent('transpetro_data_restored', { detail: { key: undefined } }));
    }
  } catch {
    // ignore
  }
  dispatchFocusUpdated();
}

export function applyBackupRestoreSync(
  rawInput: unknown,
  options?: {
    preserveCurrentStateInStorage?: boolean;
    ignoreChecksumMismatch?: boolean;
  }
): RestoreExecutionResult {
  if (typeof localStorage === 'undefined') {
    return {
      success: false,
      rolledBack: false,
      message: 'Armazenamento local (localStorage) indisponível neste ambiente.',
    };
  }

  let migration;
  try {
    migration = migrateBackupToCurrent(rawInput);
  } catch (err: any) {
    return {
      success: false,
      rolledBack: false,
      message: err?.message || 'Formato de backup inválido.',
    };
  }

  const payload = migration.payload;
  const preReport = validateBackupPayloadStructure(payload);
  if (!preReport.valid) {
    return {
      success: false,
      rolledBack: false,
      message: preReport.errors[0] || 'Backup reprovado na validação estrutural.',
      report: preReport,
    };
  }

  // Capturar snapshot completo antes de qualquer escrita (para rollback atômico)
  const rollbackSnapshot = captureAllAppStorageSnapshot();

  if (options?.preserveCurrentStateInStorage) {
    try {
      const currentBundle = generateCompleteBackupSync();
      localStorage.setItem(PRE_RESTORE_SAFETY_KEY, currentBundle.jsonString);
    } catch {
      // Não impede restauração se cota estiver apertada, pois rollbackSnapshot já está em RAM
    }
  }

  try {
    const incomingLocalMap = payload.data.localStorage || {};

    // 1. Limpar chaves de dados/configurações do app atuais que NÃO existem mais no backup alvo
    //    (mantém chaves excluídas e preserva configurações de Drive se não vierem no backup)
    for (const mod of BACKUP_MODULES_REGISTRY) {
      if (mod.primaryKey in incomingLocalMap) {
        writeModuleToStorage(mod, incomingLocalMap[mod.primaryKey]);
      } else if (mod.category === 'data') {
        // Módulo ausente no backup -> volta ao estado limpo padrão do backup alvo
        localStorage.removeItem(mod.primaryKey);
      }
    }

    // 2. Gravar chaves extras/não-registradas presentes no backup (sem descartar nada)
    Object.entries(incomingLocalMap).forEach(([k, v]) => {
      if (EXCLUDED_STORAGE_KEYS.has(k)) return;
      if (REGISTERED_KEY_TO_MODULE.has(k)) return;
      if (typeof v === 'string') {
        localStorage.setItem(k, v);
      } else {
        localStorage.setItem(k, JSON.stringify(v));
      }
    });

    // 3. Preservar campos desconhecidos (round-trip) se houver
    if (
      (payload.data.unknownFields && Object.keys(payload.data.unknownFields).length > 0) ||
      (payload.unknownRootFields && Object.keys(payload.unknownRootFields).length > 0)
    ) {
      localStorage.setItem(
        UNKNOWN_FIELDS_STORAGE_KEY,
        JSON.stringify({
          ...(payload.data.unknownFields || {}),
          ...(payload.unknownRootFields ? { __root: payload.unknownRootFields } : {}),
        })
      );
    } else {
      localStorage.removeItem(UNKNOWN_FIELDS_STORAGE_KEY);
    }

    // 4. Validação pós-gravação: reler estado salvo e confirmar integridade
    const postBundle = generateCompleteBackupSync();
    if (!postBundle.report.valid) {
      throw new Error(
        postBundle.report.errors[0] || 'Falha na verificação pós-restauração dos dados gravados.'
      );
    }

    // Confirmar que contagens críticas restauradas batem com o backup
    const criticalModuleIds = [
      'edital_verticalizado',
      'caderno_erros',
      'material_estudo_custom',
      'material_links',
      'cronograma_notas',
      'foco_logs',
    ];
    for (const id of criticalModuleIds) {
      const expected = preReport.recordCountsByModule[id] || 0;
      const actual = postBundle.report.recordCountsByModule[id] || 0;
      if (expected !== actual) {
        throw new Error(
          `Divergência após restauração no módulo "${id}": esperado=${expected}, gravado=${actual}.`
        );
      }
    }

    notifyRestoredApplicationState();

    const rc = postBundle.report.recordCountsByModule;
    const completedDaysCount = rc.legado_completed_days || 0;
    const errorNotebookCount = rc.caderno_erros || 0;
    const verticalTopicsCount = rc.edital_verticalizado || 0;
    const customMaterialsCount = rc.material_estudo_custom || 0;
    const materialLinksCount = rc.material_links || 0;
    const scheduleNotesCount = rc.cronograma_notas || 0;
    const bancaNotesCount = rc.legado_banca_notes || 0;
    const focusLogsCount = rc.foco_logs || 0;

    return {
      success: true,
      rolledBack: false,
      report: postBundle.report,
      stats: {
        completedDaysCount,
        errorNotebookCount,
        verticalTopicsCount,
        customMaterialsCount,
        materialLinksCount,
        scheduleNotesCount,
        bancaNotesCount,
        focusLogsCount,
        totalItems:
          completedDaysCount +
          errorNotebookCount +
          verticalTopicsCount +
          customMaterialsCount +
          materialLinksCount +
          scheduleNotesCount +
          bancaNotesCount +
          focusLogsCount,
      },
      message: `Backup v${migration.detectedVersion} restaurado com sucesso! (${verticalTopicsCount} tópicos do edital, ${errorNotebookCount} erros, ${scheduleNotesCount} notas do cronograma, ${materialLinksCount} links/materiais e ${focusLogsCount} registros de foco).`,
    };
  } catch (err: any) {
    rollbackAppStorage(rollbackSnapshot);
    notifyRestoredApplicationState();
    return {
      success: false,
      rolledBack: true,
      message: `Falha na restauração (${err?.message || 'Erro de gravação'}). Rollback executado: nenhum dado anterior foi perdido.`,
    };
  }
}

export async function applyInspectedBackupRestore(
  inspection: BackupInspectionResult,
  options?: { preserveCurrentStateInStorage?: boolean }
): Promise<RestoreExecutionResult> {
  if (!inspection.canRestore || !inspection.migratedPayload) {
    return {
      success: false,
      rolledBack: false,
      message: inspection.errors[0] || 'Este backup não passou na validação de integridade.',
    };
  }
  return applyBackupRestoreSync(inspection.migratedPayload, options);
}

export function restorePreRestoreRollbackSnapshot(): RestoreExecutionResult {
  if (typeof localStorage === 'undefined') {
    return { success: false, rolledBack: false, message: 'localStorage indisponível.' };
  }
  try {
    const raw = localStorage.getItem(PRE_RESTORE_SAFETY_KEY);
    if (!raw) {
      return {
        success: false,
        rolledBack: false,
        message: 'Nenhum backup pré-restauração encontrado.',
      };
    }
    const parsed = JSON.parse(raw);
    return applyBackupRestoreSync(parsed, { preserveCurrentStateInStorage: false });
  } catch (err: any) {
    return {
      success: false,
      rolledBack: false,
      message: `Erro ao restaurar estado anterior: ${err?.message || 'Erro'}`,
    };
  }
}

export function hasPreRestoreSafetySnapshot(): boolean {
  try {
    return typeof localStorage !== 'undefined' && Boolean(localStorage.getItem(PRE_RESTORE_SAFETY_KEY));
  } catch {
    return false;
  }
}
