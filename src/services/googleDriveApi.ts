import {
  generateCompleteBackupSync,
  generateValidatedBackupAsync,
  restoreFromRawData,
} from '../utils/backupStorage';
import {
  getDriveFileId,
  GOOGLE_DRIVE_ALT_FILE_PREFIX,
  GOOGLE_DRIVE_BACKUP_FOLDER,
  GOOGLE_DRIVE_DEFAULT_FILE_PREFIX,
  GOOGLE_DRIVE_FILE_NAME,
  mergeTranspetroBackupData,
  savePreSyncSafetyBackup,
  setDriveFileId,
  setDriveSyncValidated,
  setLastDriveSyncDate,
} from '../utils/driveSync';
import {
  clearGoogleDriveToken,
  getGoogleDriveAccessToken,
} from './googleDriveAuth';

const DRIVE_FILES_API = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3/files';
const DRIVE_FIELDS = 'id,name,modifiedTime,mimeType,webViewLink,size,trashed';

export interface DriveFileSummary {
  id: string;
  name: string;
  modifiedTime?: string;
  mimeType?: string;
  webViewLink?: string;
  size?: string;
  trashed?: boolean;
}

function createNeedsAuthError(message: string): Error & { needsAuth?: boolean } {
  const error = new Error(message) as Error & { needsAuth?: boolean };
  error.needsAuth = true;
  return error;
}

async function driveFetch(url: string, init?: RequestInit): Promise<Response> {
  const token = getGoogleDriveAccessToken();
  if (!token) {
    throw createNeedsAuthError(
      'Sessão do Google Drive expirada. Conecte sua conta Google novamente.'
    );
  }

  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.headers || {}),
    },
  });

  if (response.status === 401) {
    clearGoogleDriveToken();
    throw createNeedsAuthError(
      'Token do Google Drive expirado. Clique em "Sign in with Google" para revalidar.'
    );
  }

  if (!response.ok) {
    let errorMessage = `Erro na API do Google Drive (${response.status}).`;
    try {
      const errorData = await response.json();
      if (errorData?.error?.message) {
        errorMessage = errorData.error.message;
      }
    } catch {
      // ignore non-JSON error body
    }
    const err: any = new Error(errorMessage);
    err.status = response.status;
    throw err;
  }

  return response;
}

async function findBackupFolderId(): Promise<string | null> {
  const params = new URLSearchParams({
    q: `trashed = false and mimeType = 'application/vnd.google-apps.folder'`,
    orderBy: 'modifiedTime desc',
    pageSize: '50',
    fields: 'files(id,name)',
  });

  const response = await driveFetch(`${DRIVE_FILES_API}?${params.toString()}`);
  const data = await response.json();
  const folders: Array<{ id: string; name: string }> = Array.isArray(data?.files)
    ? data.files
    : [];

  const targetLower = GOOGLE_DRIVE_BACKUP_FOLDER.toLowerCase();
  const match = folders.find((f) => f.name.trim().toLowerCase() === targetLower);
  return match?.id || null;
}

async function getOrCreateBackupFolderId(): Promise<string> {
  const existingId = await findBackupFolderId();
  if (existingId) return existingId;

  const response = await driveFetch(`${DRIVE_FILES_API}?fields=id,name`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: GOOGLE_DRIVE_BACKUP_FOLDER,
      mimeType: 'application/vnd.google-apps.folder',
    }),
  });

  const created = await response.json();
  return created.id;
}

function pickBestBackupFile(files: DriveFileSummary[]): DriveFileSummary | null {
  if (files.length === 0) return null;

  const primaryExact = files.find(
    (f) => f.name.trim().toLowerCase() === GOOGLE_DRIVE_FILE_NAME.toLowerCase()
  );
  if (primaryExact) return primaryExact;

  const primaryPrefix = files.find((f) =>
    f.name.trim().toLowerCase().startsWith(GOOGLE_DRIVE_DEFAULT_FILE_PREFIX.toLowerCase())
  );
  if (primaryPrefix) return primaryPrefix;

  const legacyMatch = files.find((f) =>
    f.name.trim().toLowerCase().startsWith(GOOGLE_DRIVE_ALT_FILE_PREFIX.toLowerCase())
  );
  return legacyMatch || files[0];
}

export async function getDriveFileById(fileId: string): Promise<DriveFileSummary | null> {
  try {
    const resp = await driveFetch(
      `${DRIVE_FILES_API}/${encodeURIComponent(fileId)}?fields=${encodeURIComponent(DRIVE_FIELDS)}`
    );
    const file = (await resp.json()) as DriveFileSummary;
    if (file?.trashed) return null;
    return file;
  } catch (err: any) {
    if (err?.status === 404) return null;
    throw err;
  }
}

export async function findAppBackupFileInDrive(): Promise<DriveFileSummary | null> {
  // 0. Verificar primeiro o ID persistido se existir
  const knownId = getDriveFileId();
  if (knownId) {
    const byId = await getDriveFileById(knownId);
    if (byId) return byId;
  }

  const folderId = await findBackupFolderId();
  const nameFilter = `(name = '${GOOGLE_DRIVE_FILE_NAME}' or name contains '${GOOGLE_DRIVE_DEFAULT_FILE_PREFIX}' or name contains '${GOOGLE_DRIVE_ALT_FILE_PREFIX}')`;

  // 1. Priorizar arquivos dentro da pasta "backups"
  if (folderId) {
    const folderParams = new URLSearchParams({
      q: `trashed = false and '${folderId}' in parents and ${nameFilter}`,
      orderBy: 'modifiedTime desc',
      pageSize: '20',
      fields: `files(${DRIVE_FIELDS})`,
    });
    const folderResp = await driveFetch(`${DRIVE_FILES_API}?${folderParams.toString()}`);
    const folderData = await folderResp.json();
    const folderFiles: DriveFileSummary[] = Array.isArray(folderData?.files)
      ? folderData.files
      : [];
    const bestInFolder = pickBestBackupFile(folderFiles);
    if (bestInFolder) {
      setDriveFileId(bestInFolder.id);
      return bestInFolder;
    }
  }

  // 2. Fallback: buscar no Drive inteiro para não gerar duplicata
  const params = new URLSearchParams({
    q: `trashed = false and ${nameFilter}`,
    orderBy: 'modifiedTime desc',
    pageSize: '20',
    fields: `files(${DRIVE_FIELDS})`,
  });

  const response = await driveFetch(`${DRIVE_FILES_API}?${params.toString()}`);
  const data = await response.json();
  const files: DriveFileSummary[] = Array.isArray(data?.files) ? data.files : [];
  const picked = pickBestBackupFile(files);
  if (picked) {
    setDriveFileId(picked.id);
  }
  return picked;
}

export async function listDriveFiles(
  query: string = '',
  pageSize: number = 12
): Promise<DriveFileSummary[]> {
  const trimmed = query.trim();
  const escaped = trimmed.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const q = trimmed
    ? `trashed = false and name contains '${escaped}'`
    : 'trashed = false';

  const params = new URLSearchParams({
    q,
    orderBy: 'modifiedTime desc',
    pageSize: String(pageSize),
    fields: `files(${DRIVE_FIELDS})`,
  });

  const response = await driveFetch(`${DRIVE_FILES_API}?${params.toString()}`);
  const data = await response.json();
  return Array.isArray(data?.files) ? data.files : [];
}

export async function pullAndMergeBackupFromDriveApi(
  specificFile?: DriveFileSummary
): Promise<{ file: DriveFileSummary; mergedStatsSummary: string }> {
  const targetFile = specificFile || (await findAppBackupFileInDrive());
  if (!targetFile) {
    throw new Error(
      `Arquivo "${GOOGLE_DRIVE_FILE_NAME}" não encontrado na pasta "${GOOGLE_DRIVE_BACKUP_FOLDER}" do Google Drive.`
    );
  }

  setDriveFileId(targetFile.id);

  const response = await driveFetch(
    `${DRIVE_FILES_API}/${encodeURIComponent(targetFile.id)}?alt=media`
  );
  const rawText = await response.text();

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new Error(
      `O arquivo "${targetFile.name}" não contém um backup JSON válido.`
    );
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error(`Formato de backup inválido em "${targetFile.name}".`);
  }

  savePreSyncSafetyBackup();
  const currentLocal = generateCompleteBackupSync().payload;
  const merged = mergeTranspetroBackupData(currentLocal, parsed);
  const restoreResult = restoreFromRawData(merged);

  if (!restoreResult.success) {
    throw new Error(restoreResult.message || 'Erro ao aplicar backup mesclado.');
  }

  setDriveSyncValidated(true);
  setLastDriveSyncDate(new Date().toLocaleString('pt-BR'));

  const rc = merged.manifest?.recordCounts || {};
  const topicsCount = rc.edital_verticalizado || Object.keys(merged.data.verticalSyllabusProgress || {}).length;
  const errorsCount = rc.caderno_erros || merged.data.errorNotebook?.length || 0;
  const focusCount = rc.foco_logs || merged.data.pomodoroFocusLogs?.length || 0;

  return {
    file: targetFile,
    mergedStatsSummary: `${topicsCount} tópicos · ${errorsCount} erros · ${focusCount} registros de foco`,
  };
}

export async function saveBackupToDriveApi(
  existingFileId: string | null,
  options?: { allowCreateIfMissing?: boolean }
): Promise<DriveFileSummary> {
  // Gera e valida integralmente (SHA-256 + cobertura) antes de enviar
  const bundle = await generateValidatedBackupAsync();
  const jsonContent = bundle.jsonString;

  let resolvedFileId = existingFileId;
  if (!resolvedFileId) {
    // Verifica se já existe arquivo antes de criar qualquer novo (zero duplicatas)
    const discovered = await findAppBackupFileInDrive();
    if (discovered) {
      resolvedFileId = discovered.id;
    } else if (options?.allowCreateIfMissing === false) {
      throw new Error(
        `Arquivo "${GOOGLE_DRIVE_FILE_NAME}" não foi encontrado no Google Drive. Operação interrompida sem criar duplicatas.`
      );
    }
  } else {
    // Confirma se o arquivo pelo ID ainda existe e não está na lixeira
    const check = await getDriveFileById(resolvedFileId);
    if (!check) {
      throw new Error(
        `O arquivo original do Google Drive (ID: ${resolvedFileId}) não foi encontrado. Operação interrompida para evitar duplicatas.`
      );
    }
  }

  const boundary = `petrobras_drive_boundary_${Date.now()}`;
  const metadata: Record<string, unknown> = {
    mimeType: 'application/json',
  };

  if (!resolvedFileId) {
    const folderId = await getOrCreateBackupFolderId();
    metadata.name = GOOGLE_DRIVE_FILE_NAME;
    metadata.parents = [folderId];
  }

  const multipartBody = [
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    JSON.stringify(metadata),
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    jsonContent,
    `--${boundary}--`,
  ].join('\r\n');

  const url = resolvedFileId
    ? `${DRIVE_UPLOAD_API}/${encodeURIComponent(resolvedFileId)}?uploadType=multipart&fields=${encodeURIComponent(DRIVE_FIELDS)}`
    : `${DRIVE_UPLOAD_API}?uploadType=multipart&fields=${encodeURIComponent(DRIVE_FIELDS)}`;

  const response = await driveFetch(url, {
    method: resolvedFileId ? 'PATCH' : 'POST',
    headers: {
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: multipartBody,
  });

  const savedFile = (await response.json()) as DriveFileSummary;
  setDriveFileId(savedFile.id);
  setDriveSyncValidated(true);
  setLastDriveSyncDate(new Date().toLocaleString('pt-BR'));
  return savedFile;
}

export async function trashDriveFileApi(fileId: string): Promise<void> {
  await driveFetch(`${DRIVE_FILES_API}/${encodeURIComponent(fileId)}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ trashed: true }),
  });
  if (getDriveFileId() === fileId) {
    setDriveFileId(null);
  }
}
