/**
 * Google Drive Cloud Synchronization Utility — PETROBRAS PARETO RECURSIVO
 * Integrates via Google Apps Script (JSONP / REST) with safe merging, ID preservation, and integrity validation.
 */

import {
  BACKUP_FILE_NAME,
  BACKUP_SCHEMA_VERSION,
  EXCLUDED_STORAGE_KEYS,
  LEGACY_BACKUP_FILE_NAME,
  STORAGE_KEYS,
} from './backupRegistry';
import {
  migrateBackupToCurrent,
  type CompleteBackupPayload,
} from './backupMigration';
import {
  generateCompleteBackupSync,
  generateValidatedBackupAsync,
} from './backupSerializer';
import { applyBackupRestoreSync } from './backupRestoreService';
import {
  buildIntegrityCanonicalTarget,
  computeSyncDigest,
  validateBackupPayloadStructure,
} from './backupValidator';
import {
  deduplicateFocusLogs,
  normalizeRestoredPomodoroOnAppOpen,
  type PomodoroActiveState,
  type StudyResumeState,
} from './studyFocusStorage';

export const STORAGE_KEY_DRIVE_ENDPOINT = 'google_drive_sync_endpoint_v1';
export const STORAGE_KEY_DRIVE_AUTO_SYNC = 'google_drive_auto_sync_v1';
export const STORAGE_KEY_DRIVE_AUTO_PUSH = 'google_drive_auto_push_v1';
export const STORAGE_KEY_DRIVE_VALIDATED = 'google_drive_sync_validated_v1';
export const STORAGE_KEY_DRIVE_LAST_SYNC = 'google_drive_last_sync_date_v1';
export const STORAGE_KEY_DRIVE_FILE_ID = 'google_drive_sync_file_id_v1';
export const STORAGE_KEY_DRIVE_SAFETY_BACKUP = 'transpetro_pre_drive_sync_safety_backup_v1';

export const GOOGLE_DRIVE_FILE_NAME = BACKUP_FILE_NAME; // 'PLATAFORMA TRANSPETRO.json'
export const GOOGLE_DRIVE_DEFAULT_FILE_PREFIX = 'PLATAFORMA TRANSPETRO';
export const GOOGLE_DRIVE_ALT_FILE_PREFIX = 'Petrobras_Enfase_Operacao_Jr';
export const GOOGLE_DRIVE_ALT_FILE_NAME = LEGACY_BACKUP_FILE_NAME;
export const GOOGLE_DRIVE_ACCOUNT_EMAIL = 'marianzo.cs@gmail.com';
export const GOOGLE_DRIVE_BACKUP_FOLDER = 'backups';

export function normalizeAppsScriptUrl(url: string): string {
  if (!url) return '';
  let cleaned = url.trim();
  cleaned = cleaned.replace(/^["']|["']$/g, '').trim();
  cleaned = cleaned.replace(/[?#].*$/, '');
  cleaned = cleaned.replace(/\/+$/, '');

  if (cleaned.includes('/edit')) {
    cleaned = cleaned.replace(/\/edit.*$/, '/exec');
  } else if (cleaned.includes('/dev')) {
    cleaned = cleaned.replace(/\/dev.*$/, '/exec');
  } else if (cleaned.includes('/macros/s/') && !cleaned.endsWith('/exec')) {
    cleaned = cleaned + '/exec';
  }

  return cleaned;
}

export function getDriveEndpoint(): string {
  try {
    return localStorage.getItem(STORAGE_KEY_DRIVE_ENDPOINT) || '';
  } catch {
    return '';
  }
}

export function setDriveEndpoint(url: string): void {
  try {
    localStorage.setItem(STORAGE_KEY_DRIVE_ENDPOINT, url.trim());
  } catch (err) {
    console.error('Error saving drive endpoint', err);
  }
}

export function getDriveFileId(): string | null {
  try {
    const val = localStorage.getItem(STORAGE_KEY_DRIVE_FILE_ID);
    return val && val.trim() ? val.trim() : null;
  } catch {
    return null;
  }
}

export function setDriveFileId(fileId: string | null): void {
  try {
    if (!fileId || !fileId.trim()) {
      localStorage.removeItem(STORAGE_KEY_DRIVE_FILE_ID);
    } else {
      localStorage.setItem(STORAGE_KEY_DRIVE_FILE_ID, fileId.trim());
    }
  } catch (err) {
    console.error('Error saving drive file id', err);
  }
}

export function getDriveAutoSync(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY_DRIVE_AUTO_SYNC) === 'true';
  } catch {
    return false;
  }
}

export function setDriveAutoSync(enabled: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY_DRIVE_AUTO_SYNC, enabled ? 'true' : 'false');
  } catch (err) {
    console.error('Error saving auto-sync preference', err);
  }
}

export function getDriveAutoPush(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY_DRIVE_AUTO_PUSH) === 'true';
  } catch {
    return false;
  }
}

export function setDriveAutoPush(enabled: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY_DRIVE_AUTO_PUSH, enabled ? 'true' : 'false');
  } catch (err) {
    console.error('Error saving auto-push preference', err);
  }
}

export function getDriveSyncValidated(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY_DRIVE_VALIDATED) === 'true';
  } catch {
    return false;
  }
}

export function setDriveSyncValidated(valid: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY_DRIVE_VALIDATED, valid ? 'true' : 'false');
  } catch (err) {
    console.error('Error saving sync validated state', err);
  }
}

export function getLastDriveSyncDate(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY_DRIVE_LAST_SYNC);
  } catch {
    return null;
  }
}

export function setLastDriveSyncDate(dateStr: string): void {
  try {
    localStorage.setItem(STORAGE_KEY_DRIVE_LAST_SYNC, dateStr);
  } catch (err) {
    console.error('Error saving last sync date', err);
  }
}

export function savePreSyncSafetyBackup(): void {
  try {
    const current = generateCompleteBackupSync().payload;
    localStorage.setItem(STORAGE_KEY_DRIVE_SAFETY_BACKUP, JSON.stringify(current));
  } catch (err) {
    console.error('Error saving safety backup', err);
  }
}

export function getPreSyncSafetyBackup(): CompleteBackupPayload | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DRIVE_SAFETY_BACKUP);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Error loading safety backup', err);
  }
  return null;
}

export function restorePreSyncSafetyBackup(): { success: boolean; message: string } {
  try {
    const backup = getPreSyncSafetyBackup();
    if (!backup) {
      return { success: false, message: 'Nenhum backup de segurança anterior encontrado.' };
    }
    const res = applyBackupRestoreSync(backup, { preserveCurrentStateInStorage: false });
    if (res.success) {
      localStorage.removeItem(STORAGE_KEY_DRIVE_SAFETY_BACKUP);
    }
    return res;
  } catch (e: any) {
    return {
      success: false,
      message: `Erro ao restaurar backup pré-sincronização: ${e?.message || 'Erro'}`,
    };
  }
}

/**
 * Mesclagem segura anti-perda entre snapshot local v2.3 e remoto (v2.2 ou v2.3).
 */
export function mergeTranspetroBackupData(
  localRaw: CompleteBackupPayload,
  remoteInput: any
): CompleteBackupPayload {
  const local = migrateBackupToCurrent(localRaw).payload;
  const remote = migrateBackupToCurrent(remoteInput || {}).payload;
  const localData = local.data;
  const remoteData = remote.data;

  // 1. Completed Days union
  const mergedDays = Array.from(
    new Set([...(localData.completedDays || []), ...(remoteData.completedDays || [])])
  ).filter((d) => typeof d === 'string' && d.trim().length > 0);

  // 2. Completed Blocks union
  const mergedBlocks = Array.from(
    new Set([...(localData.completedBlocks || []), ...(remoteData.completedBlocks || [])])
  ).filter((b) => typeof b === 'string' && b.trim().length > 0);

  // 3. Error Notebook deduplication (preserva remotos + edits locais)
  const errorMap = new Map<string, any>();
  (remoteData.errorNotebook || []).forEach((item) => {
    if (!item) return;
    const key = String(item.id || item.timestamp || item.enunciado || item.subtopico || JSON.stringify(item));
    errorMap.set(key, item);
  });
  (localData.errorNotebook || []).forEach((item) => {
    if (!item) return;
    const key = String(item.id || item.timestamp || item.enunciado || item.subtopico || JSON.stringify(item));
    errorMap.set(key, item);
  });
  const mergedErrorNotebook = Array.from(errorMap.values());

  // 4. Vertical Syllabus Progress merge
  const localVertical = localData.verticalSyllabusProgress || {};
  const remoteVertical = remoteData.verticalSyllabusProgress || {};
  const allVerticalKeys = new Set([
    ...Object.keys(localVertical),
    ...Object.keys(remoteVertical),
  ]);
  const mergedVerticalProgress: Record<string, any> = {};

  allVerticalKeys.forEach((key) => {
    const lVal = localVertical[key];
    const rVal = remoteVertical[key];
    if (!lVal) mergedVerticalProgress[key] = rVal;
    else if (!rVal) mergedVerticalProgress[key] = lVal;
    else if (typeof lVal === 'object' && typeof rVal === 'object') {
      mergedVerticalProgress[key] = {
        ...rVal,
        ...lVal,
        teoria: Boolean(lVal.teoria || rVal.teoria),
        questoes: Boolean(lVal.questoes || rVal.questoes),
        revisao: Boolean(lVal.revisao || rVal.revisao),
        revisado: Boolean(lVal.revisado || rVal.revisado),
        estudado: Boolean(lVal.estudado || rVal.estudado),
        questoesFeitas: Math.max(Number(lVal.questoesFeitas) || 0, Number(rVal.questoesFeitas) || 0),
        questoesAcertos: Math.max(Number(lVal.questoesAcertos) || 0, Number(rVal.questoesAcertos) || 0),
        acertos: Math.max(Number(lVal.acertos) || 0, Number(rVal.acertos) || 0),
        erros: Math.max(Number(lVal.erros) || 0, Number(rVal.erros) || 0),
      };
    } else {
      mergedVerticalProgress[key] = lVal || rVal;
    }
  });

  // 5. Custom Materials (preserva mapas mentais de ambos por ID)
  const localMaterials = localData.customMaterials || {};
  const remoteMaterials = remoteData.customMaterials || {};
  const allMatKeys = new Set([...Object.keys(localMaterials), ...Object.keys(remoteMaterials)]);
  const mergedCustomMaterials: Record<string, any> = {};

  allMatKeys.forEach((secId) => {
    const lSec = localMaterials[secId];
    const rSec = remoteMaterials[secId];
    if (!lSec) {
      mergedCustomMaterials[secId] = rSec;
      return;
    }
    if (!rSec) {
      mergedCustomMaterials[secId] = lSec;
      return;
    }
    const mapById = new Map<string, any>();
    (Array.isArray(rSec.mindMaps) ? rSec.mindMaps : []).forEach((m: any) => {
      if (m?.id) mapById.set(String(m.id), m);
    });
    (Array.isArray(lSec.mindMaps) ? lSec.mindMaps : []).forEach((m: any) => {
      if (m?.id) mapById.set(String(m.id), m);
    });
    mergedCustomMaterials[secId] = {
      ...rSec,
      ...lSec,
      notes: lSec.notes && String(lSec.notes).trim() ? lSec.notes : rSec.notes || '',
      mindMaps: Array.from(mapById.values()),
    };
  });

  // 6. Material Links
  const linkMap = new Map<string, any>();
  (remoteData.materialLinks || []).forEach((link) => {
    if (!link) return;
    const key = String(link.url || link.id || link.titulo || JSON.stringify(link));
    linkMap.set(key, link);
  });
  (localData.materialLinks || []).forEach((link) => {
    if (!link) return;
    const key = String(link.url || link.id || link.titulo || JSON.stringify(link));
    linkMap.set(key, link);
  });
  const mergedMaterialLinks = Array.from(linkMap.values());

  // 7. Schedule Day Notes
  const mergedNotes: Record<string, string> = { ...(remoteData.scheduleDayNotes || {}) };
  Object.entries(localData.scheduleDayNotes || {}).forEach(([dayId, noteText]) => {
    if (noteText && String(noteText).trim()) {
      mergedNotes[dayId] = noteText;
    }
  });

  // 8. Banca Notes
  const mergedBancaNotes = {
    ...(remoteData.bancaNotes || {}),
    ...(localData.bancaNotes || {}),
  };

  // 9. Focus Logs
  const mergedFocusLogs = deduplicateFocusLogs([
    ...(remoteData.pomodoroFocusLogs || []),
    ...(localData.pomodoroFocusLogs || []),
  ]);

  // 10. Study Resume State
  const localResume = localData.studyResumeState as StudyResumeState | null | undefined;
  const remoteResume = remoteData.studyResumeState as StudyResumeState | null | undefined;
  let mergedResumeState: StudyResumeState | null = localResume || remoteResume || null;
  if (localResume && remoteResume) {
    mergedResumeState =
      (Number(localResume.updatedAt) || 0) >= (Number(remoteResume.updatedAt) || 0)
        ? localResume
        : remoteResume;
  }

  // 11. Pomodoro Active State
  const localActive = normalizeRestoredPomodoroOnAppOpen(
    (localData.pomodoroActiveState as PomodoroActiveState | null | undefined) || null
  );
  const remoteActive = normalizeRestoredPomodoroOnAppOpen(
    (remoteData.pomodoroActiveState as PomodoroActiveState | null | undefined) || null
  );
  let mergedActiveState: PomodoroActiveState | null = localActive || remoteActive || null;
  if (localActive && remoteActive) {
    mergedActiveState =
      (Number(localActive.lastCheckpointAt) || 0) >= (Number(remoteActive.lastCheckpointAt) || 0)
        ? localActive
        : remoteActive;
  }

  // 12. Calendar Selected Date
  const mergedCalendarSelectedDate =
    typeof localData.calendarSelectedDate === 'string' && localData.calendarSelectedDate.trim()
      ? localData.calendarSelectedDate
      : typeof remoteData.calendarSelectedDate === 'string' && remoteData.calendarSelectedDate.trim()
      ? remoteData.calendarSelectedDate
      : undefined;

  // 13. Mesclar mapa completo de localStorage (áreas custom, simulador, filtros, configurações, chaves extras)
  const mergedLocalStorage: Record<string, unknown> = {
    ...(remoteData.localStorage || {}),
    ...(localData.localStorage || {}),
    [STORAGE_KEYS.VERTICAL_SYLLABUS]: mergedVerticalProgress,
    [STORAGE_KEYS.ERROR_NOTEBOOK]: mergedErrorNotebook,
    [STORAGE_KEYS.CUSTOM_MATERIALS]: mergedCustomMaterials,
    [STORAGE_KEYS.MATERIAL_LINKS]: mergedMaterialLinks,
    [STORAGE_KEYS.SCHEDULE_DAY_NOTES]: mergedNotes,
    [STORAGE_KEYS.FOCUS_LOGS]: mergedFocusLogs,
  };

  if (mergedActiveState) {
    mergedLocalStorage[STORAGE_KEYS.POMODORO_ACTIVE_STATE] = mergedActiveState;
  } else {
    delete mergedLocalStorage[STORAGE_KEYS.POMODORO_ACTIVE_STATE];
  }
  if (mergedResumeState) {
    mergedLocalStorage[STORAGE_KEYS.STUDY_RESUME_STATE] = mergedResumeState;
  }
  if (mergedCalendarSelectedDate) {
    mergedLocalStorage[STORAGE_KEYS.CALENDAR_SELECTED_DATE] = mergedCalendarSelectedDate;
  }
  if (mergedDays.length > 0) {
    mergedLocalStorage[STORAGE_KEYS.COMPLETED_DAYS] = mergedDays;
  }
  if (mergedBlocks.length > 0) {
    mergedLocalStorage[STORAGE_KEYS.COMPLETED_BLOCKS] = mergedBlocks;
  }
  if (Object.keys(mergedBancaNotes).length > 0) {
    mergedLocalStorage[STORAGE_KEYS.BANCA_NOTES] = mergedBancaNotes;
  }

  // Remover chaves excluídas caso existam
  EXCLUDED_STORAGE_KEYS.forEach((k) => {
    delete mergedLocalStorage[k];
  });

  const mergedOther = {
    ...(remoteData.otherStorageKeys || {}),
    ...(localData.otherStorageKeys || {}),
  };
  EXCLUDED_STORAGE_KEYS.forEach((k) => {
    delete mergedOther[k];
  });

  const mergedUnknownFields = {
    ...(remoteData.unknownFields || {}),
    ...(localData.unknownFields || {}),
  };

  const now = new Date();
  const mergedPayload: CompleteBackupPayload = {
    version: BACKUP_SCHEMA_VERSION,
    app: local.app,
    exportTimestamp: now.toISOString(),
    exportDateFormatted: now.toLocaleString('pt-BR'),
    metadata: {
      ...local.metadata,
      backupVersion: BACKUP_SCHEMA_VERSION,
      createdAt: now.toISOString(),
      createdAtFormatted: now.toLocaleString('pt-BR'),
      complete: true,
    },
    manifest: {
      ...local.manifest,
      exportedKeys: Object.keys(mergedLocalStorage),
    },
    data: {
      localStorage: mergedLocalStorage,
      sessionStorage: {},
      indexedDB: {},
      modules: {
        ...(remoteData.modules || {}),
        ...(localData.modules || {}),
        edital_verticalizado: mergedVerticalProgress,
        caderno_erros: mergedErrorNotebook,
        material_estudo_custom: mergedCustomMaterials,
        material_links: mergedMaterialLinks,
        cronograma_notas: mergedNotes,
        foco_logs: mergedFocusLogs,
        pomodoro_ativo: mergedActiveState,
        retomada_estudo: mergedResumeState,
      },
      settings: {
        ...(remoteData.settings || {}),
        ...(localData.settings || {}),
      },
      legacy: {
        completedDays: mergedDays,
        completedBlocks: mergedBlocks,
        bancaNotes: mergedBancaNotes,
      },
      ...(Object.keys(mergedUnknownFields).length > 0
        ? { unknownFields: mergedUnknownFields }
        : {}),
      completedDays: mergedDays,
      completedBlocks: mergedBlocks,
      errorNotebook: mergedErrorNotebook,
      verticalSyllabusProgress: mergedVerticalProgress,
      customMaterials: mergedCustomMaterials,
      materialLinks: mergedMaterialLinks,
      scheduleDayNotes: mergedNotes,
      bancaNotes: mergedBancaNotes,
      pomodoroFocusLogs: mergedFocusLogs,
      pomodoroActiveState: mergedActiveState,
      studyResumeState: mergedResumeState,
      calendarSelectedDate: mergedCalendarSelectedDate,
      otherStorageKeys: mergedOther,
    },
  };

  const report = validateBackupPayloadStructure(mergedPayload);
  mergedPayload.metadata.complete = report.complete;
  mergedPayload.manifest.recordCounts = report.recordCountsByModule;
  mergedPayload.manifest.totalRecords = report.totalRecords;
  mergedPayload.manifest.validation = {
    valid: report.valid,
    complete: report.complete,
    warnings: report.warnings,
    errors: report.errors,
  };
  const canonical = buildIntegrityCanonicalTarget(mergedPayload);
  const digest = computeSyncDigest(canonical);
  mergedPayload.integrity = {
    algorithm: 'SHA-256',
    sha256: `fnv-${digest}`,
    syncDigest: digest,
  };

  return mergedPayload;
}

/**
 * Fetch Google Drive JSON via JSONP (com captura automática de fileId quando disponível)
 */
export function fetchGoogleDriveDataViaJsonp(
  endpoint: string,
  onStatusChange?: (statusText: string) => void
): Promise<any> {
  return new Promise((resolve, reject) => {
    const normalized = normalizeAppsScriptUrl(endpoint);

    if (!normalized || !normalized.startsWith('https://script.google.com/')) {
      const err = 'Configure a URL do Apps Script (deve iniciar com https://script.google.com/).';
      if (onStatusChange) onStatusChange(err);
      return reject(new Error(err));
    }

    if (normalized !== endpoint) {
      setDriveEndpoint(normalized);
    }

    if (onStatusChange) onStatusChange('Buscando dados no Google Drive...');

    let scriptAtual: HTMLScriptElement | null = null;
    let timeoutAtual: any = null;
    let callbackAtual: string | null = null;

    const limpar = () => {
      if (timeoutAtual) clearTimeout(timeoutAtual);
      if (scriptAtual && scriptAtual.parentNode) {
        scriptAtual.parentNode.removeChild(scriptAtual);
      }
      if (callbackAtual && (window as any)[callbackAtual]) {
        delete (window as any)[callbackAtual];
      }
      scriptAtual = null;
      callbackAtual = null;
    };

    callbackAtual = 'receberDrive_' + Date.now() + '_' + Math.random().toString(36).slice(2);
    const nomeCallback = callbackAtual;
    const script = document.createElement('script');
    scriptAtual = script;

    (window as any)[nomeCallback] = (resposta: any) => {
      limpar();

      if (!resposta || typeof resposta !== 'object') {
        const msg = 'O JSON recebido do Google Drive é inválido.';
        if (onStatusChange) onStatusChange(msg);
        return reject(new Error(msg));
      }

      if (resposta.error) {
        const msg = resposta.error;
        if (onStatusChange) onStatusChange(msg);
        return reject(new Error(msg));
      }

      // Desembrulha envelope v2.3 { __driveEnvelope: true, fileId, fileName, payload }
      let dados = resposta;
      if (resposta.__driveEnvelope && resposta.payload && typeof resposta.payload === 'object') {
        if (typeof resposta.fileId === 'string' && resposta.fileId.trim()) {
          setDriveFileId(resposta.fileId);
        }
        dados = resposta.payload;
      }

      if (onStatusChange) onStatusChange('Dados recebidos. Integrando...');

      try {
        window.dispatchEvent(
          new CustomEvent('drive-json-loaded', {
            detail: dados,
          })
        );
      } catch (err) {
        console.error('Error dispatching drive-json-loaded', err);
      }

      if (onStatusChange) {
        onStatusChange('Dados recebidos com sucesso!');
      }

      resolve(dados);
    };

    script.onerror = () => {
      limpar();
      const msg = 'Falha no acesso. Confira a URL e as permissões.';
      if (onStatusChange) onStatusChange(msg);
      const err: any = new Error(msg);
      err.normalizedUrl = normalized;
      err.isPermissionOrUrlError = true;
      reject(err);
    };

    timeoutAtual = setTimeout(() => {
      limpar();
      const msg =
        'Tempo esgotado ao contatar Google Apps Script. Verifique sua conexão e tente novamente.';
      if (onStatusChange) onStatusChange(msg);
      reject(new Error(msg));
    }, 16000);

    const knownFileId = getDriveFileId();
    const separador = normalized.includes('?') ? '&' : '?';
    script.src =
      normalized +
      separador +
      'callback=' +
      encodeURIComponent(nomeCallback) +
      '&envelope=1' +
      (knownFileId ? '&fileId=' + encodeURIComponent(knownFileId) : '') +
      '&_=' +
      Date.now();

    document.head.appendChild(script);
  });
}

export function buildDevicePairingLink(baseUrl: string, endpoint: string): string {
  const cleanBase = (baseUrl || '').trim().replace(/\/+$/, '');
  const normalizedEndpoint = normalizeAppsScriptUrl(endpoint);
  if (!cleanBase || !normalizedEndpoint) return '';
  return `${cleanBase}?driveEndpoint=${encodeURIComponent(normalizedEndpoint)}`;
}

export async function pushBackupToGoogleDrive(
  endpoint: string,
  onStatusChange?: (statusText: string) => void,
  options?: { allowCreateIfMissing?: boolean }
): Promise<{ success: boolean; message: string; fileId?: string }> {
  const normalized = normalizeAppsScriptUrl(endpoint);
  if (!normalized || !normalized.startsWith('https://script.google.com/')) {
    const errMsg = 'Configure a URL do Apps Script (deve iniciar com https://script.google.com/).';
    onStatusChange?.(errMsg);
    throw new Error(errMsg);
  }

  if (normalized !== endpoint) {
    setDriveEndpoint(normalized);
  }

  onStatusChange?.('Validando integridade do backup completo (SHA-256)...');
  const validatedBundle = await generateValidatedBackupAsync();

  const knownFileId = getDriveFileId();
  const requestEnvelope = {
    __driveWriteRequest: true,
    targetFileId: knownFileId,
    expectedFileName: GOOGLE_DRIVE_FILE_NAME,
    expectedFolder: GOOGLE_DRIVE_BACKUP_FOLDER,
    allowCreateIfMissing: options?.allowCreateIfMissing ?? !knownFileId,
    payload: validatedBundle.payload,
  };

  onStatusChange?.('Enviando backup validado para o Google Drive...');
  const response = await fetch(normalized, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify(requestEnvelope),
  });

  if (!response.ok) {
    throw new Error(
      `Falha ao enviar dados (${response.status}). Confira a implantação do Apps Script.`
    );
  }

  const rawText = await response.text();
  let data: any;
  try {
    data = JSON.parse(rawText);
  } catch {
    throw new Error(
      'O Apps Script retornou uma resposta inesperada (não-JSON). Verifique se a implantação está publicada para "Qualquer pessoa" e utilizando o Código.gs atualizado.'
    );
  }

  if (!data || data.success !== true) {
    throw new Error(
      data?.error || 'O Google Apps Script recusou ou falhou ao gravar o arquivo no Google Drive.'
    );
  }

  if (typeof data.fileId === 'string' && data.fileId.trim()) {
    setDriveFileId(data.fileId);
  }

  const message =
    data.message ||
    `Arquivo "${GOOGLE_DRIVE_BACKUP_FOLDER}/${GOOGLE_DRIVE_FILE_NAME}" atualizado com sucesso no Google Drive!`;

  setDriveSyncValidated(true);
  setLastDriveSyncDate(new Date().toLocaleString('pt-BR'));
  onStatusChange?.(message);

  return {
    success: true,
    message,
    fileId: typeof data.fileId === 'string' ? data.fileId : knownFileId || undefined,
  };
}

export async function syncBidirectionalWithGoogleDrive(
  endpoint: string,
  onStatusChange?: (statusText: string) => void
): Promise<void> {
  let foundExistingRemote = false;
  try {
    await fetchGoogleDriveDataViaJsonp(endpoint, onStatusChange);
    foundExistingRemote = true;
  } catch (err: any) {
    const msg = String(err?.message || '');
    if (!msg.includes('não foi encontrado') && !msg.includes('Nenhum arquivo')) {
      throw err;
    }
    onStatusChange?.('Nenhum backup prévio localizado no Drive. Criando arquivo inicial...');
  }

  await pushBackupToGoogleDrive(endpoint, onStatusChange, {
    allowCreateIfMissing: !foundExistingRemote && !getDriveFileId(),
  });
}

/**
 * Retorna o código do Google Apps Script configurado para a conta marianzo.cs@gmail.com
 * e para a pasta "backups" com atualização determinística pelo ID do arquivo existente.
 */
export function getGoogleAppsScriptTemplate(
  targetFileName: string = GOOGLE_DRIVE_FILE_NAME,
  targetFolderName: string = GOOGLE_DRIVE_BACKUP_FOLDER,
  targetAccountEmail: string = GOOGLE_DRIVE_ACCOUNT_EMAIL
): string {
  return `// ============================================================================
// GOOGLE APPS SCRIPT — SINCRONIZAÇÃO PETROBRAS PARETO RECURSIVO
// Conta Google: ${targetAccountEmail}
// Pasta no Google Drive: "${targetFolderName}"
// Arquivo padrão no Google Drive: "${targetFolderName}/${targetFileName}"
// ============================================================================
//
// PASSO A PASSO PARA ATIVAR / ATUALIZAR:
// 1. Faça login em https://script.google.com usando a conta ${targetAccountEmail}
// 2. Cole este script completo em Código.gs e salve (Ctrl+S)
// 3. Clique em "Implantar" > "Gerenciar implantações" > Editar > "Nova versão" (ou "Nova implantação")
// 4. Configure:
//    - Tipo: "Aplicativo da Web"
//    - Executar como: "Eu (${targetAccountEmail})"
//    - QUEM TEM ACESSO: "Qualquer pessoa"
// 5. Autorize o acesso ao Drive e cole a URL /exec no aplicativo!
// ============================================================================

var TARGET_FOLDER_NAME = "${targetFolderName}";
var TARGET_FILE_NAME = "${targetFileName}";
var LEGACY_FILE_NAME = "${LEGACY_BACKUP_FILE_NAME}";
var EXPECTED_ACCOUNT = "${targetAccountEmail}";

function findBackupFolder() {
  var folders = DriveApp.getFolders();
  var targetLower = TARGET_FOLDER_NAME.toLowerCase();
  while (folders.hasNext()) {
    var folder = folders.next();
    if (!folder.isTrashed() && folder.getName().trim().toLowerCase() === targetLower) {
      return folder;
    }
  }
  return null;
}

function getOrCreateBackupFolder() {
  var existing = findBackupFolder();
  if (existing) return existing;
  return DriveApp.createFolder(TARGET_FOLDER_NAME);
}

function collectMatchingFiles(fileIterator, matchingFiles) {
  while (fileIterator.hasNext()) {
    var file = fileIterator.next();
    if (!file || file.isTrashed()) continue;
    var name = file.getName().trim();
    var lower = name.toLowerCase();

    var isPrimaryExact = (lower === TARGET_FILE_NAME.toLowerCase());
    var isLegacyExact = (lower === LEGACY_FILE_NAME.toLowerCase() || lower === "petrobras_enfase_operacao_jr");
    var startsWith = (lower.indexOf("plataforma transpetro") === 0 || lower.indexOf("petrobras_enfase_operacao_jr") === 0);

    if (isPrimaryExact || isLegacyExact || startsWith) {
      matchingFiles.push({
        file: file,
        name: name,
        isExact: isPrimaryExact || isLegacyExact,
        isPrimary: isPrimaryExact,
        startsWith: startsWith,
        updated: file.getLastUpdated().getTime()
      });
    }
  }
}

function findBestExistingBackupFile(preferredFileId) {
  if (preferredFileId) {
    try {
      var byId = DriveApp.getFileById(preferredFileId);
      if (byId && !byId.isTrashed()) {
        return { file: byId, foundById: true };
      }
      return { file: null, foundById: false, missingRequestedId: true };
    } catch (idErr) {
      return { file: null, foundById: false, missingRequestedId: true };
    }
  }

  var matchingFiles = [];
  try {
    var backupFolder = findBackupFolder();
    if (backupFolder) {
      collectMatchingFiles(backupFolder.getFiles(), matchingFiles);
    }
  } catch (errFolder) {}

  if (matchingFiles.length === 0) {
    try {
      var searchQueries = [
        "title contains 'PLATAFORMA TRANSPETRO' and trashed = false",
        "title contains 'Petrobras_Enfase_Operacao_Jr' and trashed = false"
      ];
      for (var i = 0; i < searchQueries.length; i++) {
        collectMatchingFiles(DriveApp.searchFiles(searchQueries[i]), matchingFiles);
        if (matchingFiles.length > 0) break;
      }
    } catch (errSearch) {}
  }

  if (matchingFiles.length === 0) {
    return { file: null, foundById: false, missingRequestedId: false };
  }

  matchingFiles.sort(function(a, b) {
    if (a.isPrimary && !b.isPrimary) return -1;
    if (!a.isPrimary && b.isPrimary) return 1;
    if (a.isExact && !b.isExact) return -1;
    if (!a.isExact && b.isExact) return 1;
    return b.updated - a.updated;
  });

  return { file: matchingFiles[0].file, foundById: false, missingRequestedId: false };
}

function doGet(e) {
  var requestedFileId = (e && e.parameter && e.parameter.fileId) || "";
  var useEnvelope = (e && e.parameter && e.parameter.envelope === "1");
  var lookup = findBestExistingBackupFile(requestedFileId);

  if (!lookup.file) {
    return outputResponse(e, {
      error: "Nenhum arquivo '" + TARGET_FILE_NAME + "' foi encontrado na pasta '" + TARGET_FOLDER_NAME + "' do Google Drive (" + EXPECTED_ACCOUNT + ")."
    });
  }

  var selected = lookup.file;
  try {
    var content = selected.getBlob().getDataAsString("UTF-8");
    var parsed = JSON.parse(content);
    if (useEnvelope) {
      return outputResponse(e, {
        __driveEnvelope: true,
        fileId: selected.getId(),
        fileName: selected.getName(),
        folder: TARGET_FOLDER_NAME,
        payload: parsed
      });
    }
    return outputResponse(e, parsed);
  } catch (parseErr) {
    return outputResponse(e, {
      error: "O arquivo '" + selected.getName() + "' foi localizado, mas seu conteúdo não é um JSON válido: " + parseErr.message
    });
  }
}

function doPost(e) {
  try {
    var rawBody = (e && e.postData && e.postData.contents) ? e.postData.contents : "";
    if (!rawBody) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: "Nenhum dado recebido no POST." }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var bodyObj = JSON.parse(rawBody);
    var targetFileId = null;
    var allowCreateIfMissing = false;
    var payloadToSave = bodyObj;

    if (bodyObj && bodyObj.__driveWriteRequest && bodyObj.payload) {
      targetFileId = bodyObj.targetFileId || null;
      allowCreateIfMissing = Boolean(bodyObj.allowCreateIfMissing);
      payloadToSave = bodyObj.payload;
    }

    var contentToSave = JSON.stringify(payloadToSave, null, 2);
    var lookup = findBestExistingBackupFile(targetFileId);

    if (lookup.missingRequestedId) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        code: "FILE_NOT_FOUND",
        error: "O arquivo original (ID: " + targetFileId + ") não foi encontrado no Google Drive. Operação interrompida para evitar duplicatas."
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var targetFile = lookup.file;
    var folderName = TARGET_FOLDER_NAME;

    if (targetFile) {
      // Substitui o conteúdo do mesmo arquivo preservando o ID original
      targetFile.setContent(contentToSave);
    } else {
      if (!allowCreateIfMissing) {
        return ContentService.createTextOutput(JSON.stringify({
          success: false,
          code: "FILE_NOT_FOUND",
          error: "Arquivo '" + TARGET_FILE_NAME + "' não encontrado na pasta '" + TARGET_FOLDER_NAME + "'. Nenhuma cópia duplicada foi criada."
        })).setMimeType(ContentService.MimeType.JSON);
      }
      var folder = getOrCreateBackupFolder();
      folderName = folder.getName();
      targetFile = folder.createFile(TARGET_FILE_NAME, contentToSave, MimeType.PLAIN_TEXT);
    }

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: "Arquivo '" + targetFile.getName() + "' atualizado com sucesso no Google Drive (" + EXPECTED_ACCOUNT + ")!",
      account: EXPECTED_ACCOUNT,
      folder: folderName,
      fileId: targetFile.getId(),
      fileName: targetFile.getName(),
      updated: targetFile.getLastUpdated().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function outputResponse(e, data) {
  var callback = (e && e.parameter && e.parameter.callback) || "";
  if (callback) {
    var jsOutput = callback + "(" + JSON.stringify(data) + ");";
    return ContentService.createTextOutput(jsOutput)
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
`;
}
