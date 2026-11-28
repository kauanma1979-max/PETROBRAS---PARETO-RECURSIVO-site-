/**
 * Fachada Centralizada de Backup & Restauração — PETROBRAS PARETO RECURSIVO
 * Delega coleta, migração, validação SHA-256 e restauração transacional para os serviços unificados.
 */

import {
  BACKUP_FILE_NAME,
  BACKUP_MODULES_REGISTRY,
  LEGACY_BACKUP_FILE_NAME,
  STORAGE_KEYS,
} from './backupRegistry';
import type { CompleteBackupPayload } from './backupMigration';
import {
  downloadValidatedBackupFile,
  generateCompleteBackupSync,
  generateValidatedBackupAsync,
  type BackupExportStage,
  type ValidatedBackupBundle,
} from './backupSerializer';
import type { BackupIntegrityReport } from './backupValidator';
import {
  applyBackupRestoreSync,
  inspectBackupFromFile,
  inspectBackupFromJsonString,
  inspectBackupObject,
  applyInspectedBackupRestore,
  restorePreRestoreRollbackSnapshot,
  hasPreRestoreSafetySnapshot,
  type BackupInspectionResult,
  type RestoreExecutionResult,
} from './backupRestoreService';

export {
  BACKUP_FILE_NAME,
  LEGACY_BACKUP_FILE_NAME,
  BACKUP_MODULES_REGISTRY,
  STORAGE_KEYS,
  generateCompleteBackupSync,
  generateValidatedBackupAsync,
  downloadValidatedBackupFile,
  inspectBackupFromFile,
  inspectBackupFromJsonString,
  inspectBackupObject,
  applyInspectedBackupRestore,
  restorePreRestoreRollbackSnapshot,
  hasPreRestoreSafetySnapshot,
};

export type {
  BackupExportStage,
  BackupIntegrityReport,
  BackupInspectionResult,
  CompleteBackupPayload,
  RestoreExecutionResult,
  ValidatedBackupBundle,
};

export type BackupDataPayload = CompleteBackupPayload;

export interface BackupStats {
  completedDaysCount: number;
  errorNotebookCount: number;
  verticalTopicsCount: number;
  customMaterialsCount: number;
  materialLinksCount: number;
  scheduleNotesCount: number;
  bancaNotesCount: number;
  focusLogsCount: number;
  totalItems: number;
  totalModules: number;
  totalKeys: number;
  totalRecordsAllModules: number;
}

export const notifyDataUpdated = (sourceKey?: string) => {
  try {
    window.dispatchEvent(
      new CustomEvent('transpetro_storage_changed', { detail: { key: sourceKey } })
    );
    if (!sourceKey) {
      window.dispatchEvent(
        new CustomEvent('transpetro_data_restored', { detail: { key: sourceKey } })
      );
    }
  } catch {
    // ignore
  }
};

export const getBackupStats = (): BackupStats => {
  try {
    const bundle = generateCompleteBackupSync();
    const rc = bundle.report.recordCountsByModule;

    const completedDaysCount = rc.legado_completed_days || 0;
    const errorNotebookCount = rc.caderno_erros || 0;
    const verticalTopicsCount = rc.edital_verticalizado || 0;
    const customMaterialsCount = rc.material_estudo_custom || 0;
    const materialLinksCount = rc.material_links || 0;
    const scheduleNotesCount = rc.cronograma_notas || 0;
    const bancaNotesCount = rc.legado_banca_notes || 0;
    const focusLogsCount = rc.foco_logs || 0;

    return {
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
      totalModules: bundle.report.totalModulesExported,
      totalKeys: bundle.report.totalKeysExported,
      totalRecordsAllModules: bundle.report.totalRecords,
    };
  } catch {
    return {
      completedDaysCount: 0,
      errorNotebookCount: 0,
      verticalTopicsCount: 0,
      customMaterialsCount: 0,
      materialLinksCount: 0,
      scheduleNotesCount: 0,
      bancaNotesCount: 0,
      focusLogsCount: 0,
      totalItems: 0,
      totalModules: 0,
      totalKeys: 0,
      totalRecordsAllModules: 0,
    };
  }
};

export const generateBackupPayload = (): CompleteBackupPayload => {
  return generateCompleteBackupSync().payload;
};

export const getBackupJsonString = (): string => {
  return generateCompleteBackupSync().jsonString;
};

export const copyBackupToClipboard = async (): Promise<boolean> => {
  try {
    const bundle = await generateValidatedBackupAsync();
    const jsonStr = bundle.jsonString;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(jsonStr);
      return true;
    }
    const textarea = document.createElement('textarea');
    textarea.value = jsonStr;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textarea);
    return successful;
  } catch (e) {
    console.error('Failed to copy to clipboard', e);
    return false;
  }
};

export const exportFullBackup = async (
  onStage?: (stage: BackupExportStage) => void
): Promise<ValidatedBackupBundle> => {
  return downloadValidatedBackupFile(onStage);
};

export const exportErrorNotebookJson = async (
  onStage?: (stage: BackupExportStage) => void
): Promise<ValidatedBackupBundle> => {
  return downloadValidatedBackupFile(onStage);
};

export const restoreFromRawData = (
  dataObj: any
): RestoreExecutionResult => {
  return applyBackupRestoreSync(dataObj, { preserveCurrentStateInStorage: true });
};

export const importBackupFromJsonString = (
  jsonString: string
): RestoreExecutionResult => {
  try {
    if (!jsonString || !jsonString.trim()) {
      return { success: false, rolledBack: false, message: 'O texto JSON fornecido está vazio.' };
    }
    const parsed = JSON.parse(jsonString);
    return restoreFromRawData(parsed);
  } catch (err: any) {
    return {
      success: false,
      rolledBack: false,
      message: `Erro ao analisar JSON: Formato inválido. Detalhe: ${err?.message || 'Sintaxe inválida'}`,
    };
  }
};

export const importFullBackup = async (
  file: File
): Promise<RestoreExecutionResult> => {
  const inspection = await inspectBackupFromFile(file);
  if (!inspection.canRestore || !inspection.migratedPayload) {
    return {
      success: false,
      rolledBack: false,
      message: inspection.errors[0] || 'Arquivo de backup inválido ou corrompido.',
    };
  }
  return applyInspectedBackupRestore(inspection, { preserveCurrentStateInStorage: true });
};
