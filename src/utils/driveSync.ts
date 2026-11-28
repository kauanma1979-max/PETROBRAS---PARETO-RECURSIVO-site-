/**
 * Google Drive Cloud Synchronization Utility for Transpetro 2026.3
 * Integrates via Google Apps Script (JSONP / REST) with safe data merging.
 */

import {
  BackupDataPayload,
  generateBackupPayload,
  restoreFromRawData,
  STORAGE_KEYS
} from './backupStorage';
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
export const STORAGE_KEY_DRIVE_SAFETY_BACKUP = 'transpetro_pre_drive_sync_safety_backup_v1';

export const GOOGLE_DRIVE_DEFAULT_FILE_PREFIX = 'Petrobras_Enfase_Operacao_Jr';
export const GOOGLE_DRIVE_FILE_NAME = 'Petrobras_Enfase_Operacao_Jr.json';
export const GOOGLE_DRIVE_ALT_FILE_PREFIX = 'PLATAFORMA TRANSPETRO';
export const GOOGLE_DRIVE_ACCOUNT_EMAIL = 'marianzo.cs@gmail.com';
export const GOOGLE_DRIVE_BACKUP_FOLDER = 'backups';

/**
 * Normalizes Google Apps Script URL to always point to the public web app /exec endpoint.
 * Handles cases where:
 * - User copies URL ending with deployment ID without /exec (e.g. .../macros/s/AKfycbx...90U)
 * - User copies URL ending in /edit, /dev, or trailing slashes
 * - User pastes URL with trailing whitespace, quotes or query strings
 */
export function normalizeAppsScriptUrl(url: string): string {
  if (!url) return '';
  let cleaned = url.trim();

  // Strip wrapping quotes
  cleaned = cleaned.replace(/^["']|["']$/g, '').trim();

  // Strip query parameters (?...) or hash (#...) if present
  cleaned = cleaned.replace(/[?#].*$/, '');

  // Strip trailing slashes
  cleaned = cleaned.replace(/\/+$/, '');

  // Replace /edit or /dev with /exec
  if (cleaned.includes('/edit')) {
    cleaned = cleaned.replace(/\/edit.*$/, '/exec');
  } else if (cleaned.includes('/dev')) {
    cleaned = cleaned.replace(/\/dev.*$/, '/exec');
  } else if (cleaned.includes('/macros/s/') && !cleaned.endsWith('/exec')) {
    // If it has deployment ID without /exec, append /exec
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
    const current = generateBackupPayload();
    localStorage.setItem(STORAGE_KEY_DRIVE_SAFETY_BACKUP, JSON.stringify(current));
  } catch (err) {
    console.error('Error saving safety backup', err);
  }
}

export function getPreSyncSafetyBackup(): BackupDataPayload | null {
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
    const res = restoreFromRawData(backup);
    if (res.success) {
      // Remove safety backup once restored
      localStorage.removeItem(STORAGE_KEY_DRIVE_SAFETY_BACKUP);
    }
    return res;
  } catch (e: any) {
    return { success: false, message: `Erro ao restaurar backup pré-sincronização: ${e?.message || 'Erro'}` };
  }
}

/**
 * Intelligent safe merge of local and remote data
 * Guarantees zero loss: unions completed days/blocks, merges error notebooks,
 * combines syllabus progress, materials and links.
 */
export function mergeTranspetroBackupData(
  local: BackupDataPayload,
  remoteRaw: any
): BackupDataPayload {
  const remoteData = (remoteRaw && remoteRaw.data) ? remoteRaw.data : (remoteRaw || {});

  // 1. Completed Days union
  const localDays: string[] = Array.isArray(local.data?.completedDays) ? local.data.completedDays : [];
  const remoteDays: string[] = Array.isArray(remoteData.completedDays) ? remoteData.completedDays : [];
  const mergedDays = Array.from(new Set([...localDays, ...remoteDays])).filter(d => typeof d === 'string' && d.trim().length > 0);

  // 2. Completed Blocks union
  const localBlocks: string[] = Array.isArray(local.data?.completedBlocks) ? local.data.completedBlocks : [];
  const remoteBlocks: string[] = Array.isArray(remoteData.completedBlocks) ? remoteData.completedBlocks : [];
  const mergedBlocks = Array.from(new Set([...localBlocks, ...remoteBlocks])).filter(b => typeof b === 'string' && b.trim().length > 0);

  // 3. Error Notebook deduplication
  const localErrors: any[] = Array.isArray(local.data?.errorNotebook) ? local.data.errorNotebook : [];
  const remoteErrors: any[] = Array.isArray(remoteData.errorNotebook) ? remoteData.errorNotebook : [];
  const errorMap = new Map<string, any>();

  // Add remote first
  remoteErrors.forEach(item => {
    if (!item) return;
    const key = String(item.id || item.timestamp || item.enunciado || item.pergunta || JSON.stringify(item));
    errorMap.set(key, item);
  });
  // Add local (so local edits take precedence while remote items are preserved)
  localErrors.forEach(item => {
    if (!item) return;
    const key = String(item.id || item.timestamp || item.enunciado || item.pergunta || JSON.stringify(item));
    errorMap.set(key, item);
  });
  const mergedErrorNotebook = Array.from(errorMap.values());

  // 4. Vertical Syllabus Progress merge
  const localVertical = (local.data?.verticalSyllabusProgress && typeof local.data.verticalSyllabusProgress === 'object')
    ? local.data.verticalSyllabusProgress
    : {};
  const remoteVertical = (remoteData.verticalSyllabusProgress && typeof remoteData.verticalSyllabusProgress === 'object')
    ? remoteData.verticalSyllabusProgress
    : {};

  const allVerticalKeys = new Set([...Object.keys(localVertical), ...Object.keys(remoteVertical)]);
  const mergedVerticalProgress: Record<string, any> = {};

  allVerticalKeys.forEach(key => {
    const lVal = localVertical[key];
    const rVal = remoteVertical[key];

    if (!lVal) {
      mergedVerticalProgress[key] = rVal;
    } else if (!rVal) {
      mergedVerticalProgress[key] = lVal;
    } else if (typeof lVal === 'object' && typeof rVal === 'object') {
      mergedVerticalProgress[key] = {
        ...rVal,
        ...lVal,
        estudado: Boolean(lVal.estudado || rVal.estudado),
        teoria: Boolean(lVal.teoria || rVal.teoria),
        revisado: Boolean(lVal.revisado || rVal.revisado),
        questoes: Math.max(Number(lVal.questoes) || 0, Number(rVal.questoes) || 0),
        acertos: Math.max(Number(lVal.acertos) || 0, Number(rVal.acertos) || 0),
        erros: Math.max(Number(lVal.erros) || 0, Number(rVal.erros) || 0)
      };
    } else {
      mergedVerticalProgress[key] = lVal || rVal;
    }
  });

  // 5. Custom Materials
  const localMaterials = (local.data?.customMaterials && typeof local.data.customMaterials === 'object')
    ? local.data.customMaterials
    : {};
  const remoteMaterials = (remoteData.customMaterials && typeof remoteData.customMaterials === 'object')
    ? remoteData.customMaterials
    : {};
  const mergedCustomMaterials = { ...remoteMaterials, ...localMaterials };

  // 6. Material Links
  const localLinks: any[] = Array.isArray(local.data?.materialLinks) ? local.data.materialLinks : [];
  const remoteLinks: any[] = Array.isArray(remoteData.materialLinks) ? remoteData.materialLinks : [];
  const linkMap = new Map<string, any>();

  remoteLinks.forEach(link => {
    if (!link) return;
    const key = String(link.url || link.id || link.titulo || JSON.stringify(link));
    linkMap.set(key, link);
  });
  localLinks.forEach(link => {
    if (!link) return;
    const key = String(link.url || link.id || link.titulo || JSON.stringify(link));
    linkMap.set(key, link);
  });
  const mergedMaterialLinks = Array.from(linkMap.values());

  // 7. Schedule Day Notes
  const localNotes = (local.data?.scheduleDayNotes && typeof local.data.scheduleDayNotes === 'object')
    ? local.data.scheduleDayNotes
    : {};
  const remoteNotes = (remoteData.scheduleDayNotes && typeof remoteData.scheduleDayNotes === 'object')
    ? remoteData.scheduleDayNotes
    : {};
  const mergedNotes: Record<string, string> = { ...remoteNotes };
  Object.entries(localNotes).forEach(([dayId, noteText]) => {
    if (noteText && String(noteText).trim()) {
      mergedNotes[dayId] = noteText;
    }
  });

  // 8. Banca Notes
  const localBanca = (local.data?.bancaNotes && typeof local.data.bancaNotes === 'object')
    ? local.data.bancaNotes
    : {};
  const remoteBanca = (remoteData.bancaNotes && typeof remoteData.bancaNotes === 'object')
    ? remoteData.bancaNotes
    : {};
  const mergedBancaNotes = { ...remoteBanca, ...localBanca };

  // 9. Pomodoro Focus Logs (união deduplicada por id)
  const localFocusLogs = Array.isArray(local.data?.pomodoroFocusLogs)
    ? local.data.pomodoroFocusLogs
    : [];
  const remoteFocusLogs = Array.isArray(remoteData.pomodoroFocusLogs)
    ? remoteData.pomodoroFocusLogs
    : [];
  const mergedFocusLogs = deduplicateFocusLogs([...remoteFocusLogs, ...localFocusLogs]);

  // 10. Study Resume State (preserva o mais recente por updatedAt)
  const localResume = local.data?.studyResumeState as StudyResumeState | null | undefined;
  const remoteResume = remoteData.studyResumeState as StudyResumeState | null | undefined;
  let mergedResumeState: StudyResumeState | null = localResume || remoteResume || null;
  if (localResume && remoteResume) {
    mergedResumeState =
      (Number(localResume.updatedAt) || 0) >= (Number(remoteResume.updatedAt) || 0)
        ? localResume
        : remoteResume;
  }

  // 11. Pomodoro Active State (mais recente por lastCheckpointAt, sempre normalizado pausado)
  const localActive = normalizeRestoredPomodoroOnAppOpen(
    (local.data?.pomodoroActiveState as PomodoroActiveState | null | undefined) || null
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
    typeof local.data?.calendarSelectedDate === 'string' && local.data.calendarSelectedDate.trim()
      ? local.data.calendarSelectedDate
      : typeof remoteData.calendarSelectedDate === 'string' && remoteData.calendarSelectedDate.trim()
      ? remoteData.calendarSelectedDate
      : undefined;

  // 13. Other Storage Keys
  const localOther = (local.data?.otherStorageKeys && typeof local.data.otherStorageKeys === 'object')
    ? local.data.otherStorageKeys
    : {};
  const remoteOther = (remoteData.otherStorageKeys && typeof remoteData.otherStorageKeys === 'object')
    ? remoteData.otherStorageKeys
    : {};
  const mergedOther = { ...remoteOther, ...localOther };

  const now = new Date();
  return {
    version: '2.3',
    app: 'Transpetro & Petrobras - Guia Técnico Mesclado (Dutos e Terminais + Operação)',
    exportTimestamp: now.toISOString(),
    exportDateFormatted: now.toLocaleString('pt-BR'),
    data: {
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
      otherStorageKeys: mergedOther
    }
  };
}

/**
 * Fetch Google Drive JSON via JSONP with safe memory script creation, URL auto-normalization, and timeout
 */
export function fetchGoogleDriveDataViaJsonp(
  endpoint: string,
  onStatusChange?: (statusText: string) => void
): Promise<any> {
  return new Promise((resolve, reject) => {
    // Automatically sanitize and ensure /exec endpoint
    const normalized = normalizeAppsScriptUrl(endpoint);

    if (!normalized || !normalized.startsWith('https://script.google.com/')) {
      const err = 'Configure a URL do Apps Script (deve iniciar com https://script.google.com/).';
      if (onStatusChange) onStatusChange(err);
      return reject(new Error(err));
    }

    // Persist normalized endpoint if it was cleaned
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

    (window as any)[nomeCallback] = (dados: any) => {
      limpar();

      if (!dados || typeof dados !== 'object') {
        const msg = 'O JSON recebido do Google Drive é inválido.';
        if (onStatusChange) onStatusChange(msg);
        return reject(new Error(msg));
      }

      if (dados.error) {
        const msg = dados.error;
        if (onStatusChange) onStatusChange(msg);
        return reject(new Error(msg));
      }

      if (onStatusChange) onStatusChange('Dados recebidos. Integrando...');

      // Dispatch integration event required by the specification
      try {
        window.dispatchEvent(
          new CustomEvent('drive-json-loaded', {
            detail: dados
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
      const msg = 'Tempo esgotado ao contatar Google Apps Script. Verifique sua conexão e tente novamente.';
      if (onStatusChange) onStatusChange(msg);
      reject(new Error(msg));
    }, 16000);

    const separador = normalized.includes('?') ? '&' : '?';
    script.src =
      normalized +
      separador +
      'callback=' +
      encodeURIComponent(nomeCallback) +
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
  onStatusChange?: (statusText: string) => void
): Promise<{ success: boolean; message: string }> {
  const normalized = normalizeAppsScriptUrl(endpoint);
  if (!normalized || !normalized.startsWith('https://script.google.com/')) {
    const errMsg = 'Configure a URL do Apps Script (deve iniciar com https://script.google.com/).';
    onStatusChange?.(errMsg);
    throw new Error(errMsg);
  }

  if (normalized !== endpoint) {
    setDriveEndpoint(normalized);
  }

  onStatusChange?.('Enviando dados locais para o Google Drive...');
  const payload = generateBackupPayload();

  const response = await fetch(normalized, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Falha ao enviar dados (${response.status}). Confira a implantação do Apps Script.`);
  }

  let message = `Arquivo "${GOOGLE_DRIVE_FILE_NAME}" salvo com sucesso no Google Drive!`;
  try {
    const data = await response.json();
    if (data && data.success === false) {
      throw new Error(data.error || 'Erro ao gravar arquivo no Google Drive.');
    }
    if (data?.message) {
      message = data.message;
    }
  } catch (err: any) {
    if (err?.message && err.name !== 'SyntaxError') {
      throw err;
    }
  }

  setDriveSyncValidated(true);
  setLastDriveSyncDate(new Date().toLocaleString('pt-BR'));
  onStatusChange?.(message);
  return { success: true, message };
}

export async function syncBidirectionalWithGoogleDrive(
  endpoint: string,
  onStatusChange?: (statusText: string) => void
): Promise<void> {
  try {
    await fetchGoogleDriveDataViaJsonp(endpoint, onStatusChange);
  } catch (err: any) {
    const msg = String(err?.message || '');
    if (!msg.includes('não foi encontrado') && !msg.includes('Nenhum arquivo')) {
      throw err;
    }
    onStatusChange?.('Nenhum backup prévio no Drive. Criando backup inicial...');
  }

  await pushBackupToGoogleDrive(endpoint, onStatusChange);
}

/**
 * Retorna o código do Google Apps Script configurado para a conta marianzo.cs@gmail.com
 * e para a pasta "backups" do Google Drive ("backups/Petrobras_Enfase_Operacao_Jr.json").
 */
export function getGoogleAppsScriptTemplate(
  targetFileName: string = GOOGLE_DRIVE_FILE_NAME,
  targetFolderName: string = GOOGLE_DRIVE_BACKUP_FOLDER,
  targetAccountEmail: string = GOOGLE_DRIVE_ACCOUNT_EMAIL
): string {
  return `// ============================================================================
// GOOGLE APPS SCRIPT — SINCRONIZAÇÃO PETROBRAS ÊNFASE OPERAÇÃO JR
// Conta Google: ${targetAccountEmail}
// Pasta no Google Drive: "${targetFolderName}"
// Arquivo no Google Drive: "${targetFolderName}/${targetFileName}"
// ============================================================================
//
// PASSO A PASSO PARA ATIVAR EM MENOS DE 2 MINUTOS:
// 1. Faça login em https://script.google.com usando a conta ${targetAccountEmail}
// 2. Clique em "+ Novo projeto", apague o código padrão e cole este script completo
// 3. Salve (Ctrl+S) e clique no botão azul "Implantar" > "Nova implantação"
// 4. Configure:
//    - Tipo (engrenagem): "Aplicativo da Web"
//    - Descrição: "Sincronizador Petrobras Enfase Operacao Jr (${targetFolderName})"
//    - Executar como: "Eu (${targetAccountEmail})"
//    - QUEM TEM ACESSO: "Qualquer pessoa" (OBRIGATÓRIO para evitar bloqueio CORS/acesso)
// 5. Clique em "Implantar", autorize o acesso ao Drive da conta ${targetAccountEmail} e COPIE a URL /exec
// 6. Cole a URL /exec no aplicativo!
// ============================================================================

var TARGET_FOLDER_NAME = "${targetFolderName}";
var TARGET_FILE_NAME = "${targetFileName}";
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

    var isExact = (lower === "petrobras_enfase_operacao_jr.json" || lower === "petrobras_enfase_operacao_jr");
    var startsWith = (lower.indexOf("petrobras_enfase_operacao_jr") === 0);
    var contains = (lower.indexOf("operacao") !== -1 && lower.indexOf("petrobras") !== -1) ||
                   (lower === "plataforma transpetro.json" || lower.indexOf("plataforma transpetro") === 0);

    if (isExact || startsWith || contains) {
      matchingFiles.push({
        file: file,
        name: name,
        isExact: isExact,
        startsWith: startsWith,
        updated: file.getLastUpdated().getTime()
      });
    }
  }
}

function doGet(e) {
  var matchingFiles = [];

  // 1. Busca prioritária dentro da pasta "backups" da conta ${targetAccountEmail}
  try {
    var backupFolder = findBackupFolder();
    if (backupFolder) {
      collectMatchingFiles(backupFolder.getFiles(), matchingFiles);
    }
  } catch (errFolder) {}

  // 2. Fallback: busca na raiz/Drive caso o arquivo ainda esteja fora da pasta "backups"
  if (matchingFiles.length === 0) {
    try {
      var searchQueries = [
        "title contains 'Petrobras_Enfase_Operacao_Jr' and trashed = false",
        "title contains 'petrobras_enfase_operacao_jr' and trashed = false",
        "title contains 'PLATAFORMA TRANSPETRO' and trashed = false"
      ];
      for (var i = 0; i < searchQueries.length; i++) {
        collectMatchingFiles(DriveApp.searchFiles(searchQueries[i]), matchingFiles);
        if (matchingFiles.length > 0) break;
      }
    } catch (errSearch) {}
  }

  if (matchingFiles.length === 0) {
    return outputResponse(e, {
      error: "Nenhum arquivo '" + TARGET_FILE_NAME + "' foi encontrado na pasta '" + TARGET_FOLDER_NAME + "' do Google Drive (" + EXPECTED_ACCOUNT + ")."
    });
  }

  matchingFiles.sort(function(a, b) {
    if (a.isExact && !b.isExact) return -1;
    if (!a.isExact && b.isExact) return 1;
    if (a.startsWith && !b.startsWith) return -1;
    if (!a.startsWith && b.startsWith) return 1;
    return b.updated - a.updated;
  });

  var selected = matchingFiles[0].file;

  try {
    var content = selected.getBlob().getDataAsString("UTF-8");
    var parsed = JSON.parse(content);
    return outputResponse(e, parsed);
  } catch (parseErr) {
    return outputResponse(e, {
      error: "O arquivo '" + selected.getName() + "' foi localizado, mas seu conteúdo não é um JSON válido: " + parseErr.message
    });
  }
}

// Salva ou atualiza diretamente dentro da pasta "backups" do Google Drive
function doPost(e) {
  try {
    var content = (e && e.postData && e.postData.contents) ? e.postData.contents : "";
    if (!content) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: "Nenhum dado recebido no POST." }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    JSON.parse(content);

    var folder = getOrCreateBackupFolder();
    var filesInFolder = folder.getFilesByName(TARGET_FILE_NAME);
    var targetFile;

    if (filesInFolder.hasNext()) {
      targetFile = filesInFolder.next();
      targetFile.setContent(content);
    } else {
      targetFile = folder.createFile(TARGET_FILE_NAME, content, MimeType.PLAIN_TEXT);
    }

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: "Arquivo '" + TARGET_FOLDER_NAME + "/" + TARGET_FILE_NAME + "' salvo com sucesso no Google Drive (" + EXPECTED_ACCOUNT + ")!",
      account: EXPECTED_ACCOUNT,
      folder: folder.getName(),
      fileName: targetFile.getName(),
      updated: targetFile.getLastUpdated().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Formatação da resposta: JSONP (se houver parâmetro callback) ou JSON padrão
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
