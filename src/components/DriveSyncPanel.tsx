import React, { useState, useEffect, useCallback } from 'react';
import type { User } from 'firebase/auth';
import {
  Cloud,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  Code,
  RotateCcw,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  UploadCloud,
  Smartphone,
  Link as LinkIcon,
  ArrowLeftRight,
  LogOut,
  Search,
  FileText,
  Trash2,
  FolderOpen,
  DownloadCloud,
} from 'lucide-react';
import {
  getDriveEndpoint,
  setDriveEndpoint,
  getDriveAutoSync,
  setDriveAutoSync,
  getDriveAutoPush,
  setDriveAutoPush,
  getDriveSyncValidated,
  getLastDriveSyncDate,
  getPreSyncSafetyBackup,
  restorePreSyncSafetyBackup,
  fetchGoogleDriveDataViaJsonp,
  pushBackupToGoogleDrive,
  syncBidirectionalWithGoogleDrive,
  buildDevicePairingLink,
  getGoogleAppsScriptTemplate,
  normalizeAppsScriptUrl,
  GOOGLE_DRIVE_FILE_NAME,
  GOOGLE_DRIVE_ACCOUNT_EMAIL,
  GOOGLE_DRIVE_BACKUP_FOLDER,
} from '../utils/driveSync';
import {
  googleSignIn,
  logoutGoogleDrive,
  subscribeGoogleAuth,
} from '../services/googleDriveAuth';
import {
  findAppBackupFileInDrive,
  listDriveFiles,
  pullAndMergeBackupFromDriveApi,
  saveBackupToDriveApi,
  trashDriveFileApi,
  type DriveFileSummary,
} from '../services/googleDriveApi';
import { GoogleSignInButton } from './GoogleSignInButton';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { Button } from './ui/Button';

interface DriveSyncPanelProps {
  onSyncSuccess?: () => void;
  compact?: boolean;
}

type PendingDriveMutation =
  | {
      kind: 'upload';
      existingFile: DriveFileSummary | null;
      title: string;
      message: string;
      confirmLabel: string;
    }
  | {
      kind: 'trash';
      file: DriveFileSummary;
      title: string;
      message: string;
      confirmLabel: string;
    }
  | null;

export const DriveSyncPanel: React.FC<DriveSyncPanelProps> = ({ onSyncSuccess }) => {
  // Official Google Drive OAuth state
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [hasGoogleToken, setHasGoogleToken] = useState<boolean>(false);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [oauthStatusText, setOauthStatusText] = useState<string>(
    'Conecte sua conta Google para sincronizar diretamente com seu Google Drive.'
  );
  const [oauthStatusType, setOauthStatusType] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [isOauthBusy, setIsOauthBusy] = useState<boolean>(false);
  const [driveBackupFile, setDriveBackupFile] = useState<DriveFileSummary | null>(null);
  const [driveFiles, setDriveFiles] = useState<DriveFileSummary[]>([]);
  const [driveSearchQuery, setDriveSearchQuery] = useState<string>('');
  const [isSearchingDrive, setIsSearchingDrive] = useState<boolean>(false);
  const [showDriveBrowser, setShowDriveBrowser] = useState<boolean>(false);
  const [pendingMutation, setPendingMutation] = useState<PendingDriveMutation>(null);

  // Apps Script (legacy / pairing link) state
  const [showAppsScriptSection, setShowAppsScriptSection] = useState<boolean>(false);
  const [endpoint, setEndpoint] = useState<string>(getDriveEndpoint());
  const [autoSync, setAutoSync] = useState<boolean>(getDriveAutoSync());
  const [autoPush, setAutoPush] = useState<boolean>(getDriveAutoPush());
  const [isValidated, setIsValidated] = useState<boolean>(getDriveSyncValidated());
  const [lastSync, setLastSync] = useState<string | null>(getLastDriveSyncDate());
  const [statusText, setStatusText] = useState<string>('Pronto para sincronizar via Apps Script');
  const [statusType, setStatusType] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showScriptCode, setShowScriptCode] = useState<boolean>(false);
  const [codeCopied, setCodeCopied] = useState<boolean>(false);
  const [pairingCopied, setPairingCopied] = useState<boolean>(false);
  const [shareAppUrl, setShareAppUrl] = useState<string>(() =>
    typeof window !== 'undefined' ? window.location.origin : ''
  );
  const [hasSafetyBackup, setHasSafetyBackup] = useState<boolean>(Boolean(getPreSyncSafetyBackup()));
  const [urlFixedNotice, setUrlFixedNotice] = useState<boolean>(false);
  const [showUndoConfirm, setShowUndoConfirm] = useState<boolean>(false);

  const refreshDriveState = useCallback(async () => {
    setIsSearchingDrive(true);
    try {
      const [foundBackup, recent] = await Promise.all([
        findAppBackupFileInDrive(),
        listDriveFiles(driveSearchQuery, 12),
      ]);
      setDriveBackupFile(foundBackup);
      setDriveFiles(recent);
    } catch (err: any) {
      if (err?.needsAuth) {
        setOauthStatusType('idle');
        setOauthStatusText('Clique em "Sign in with Google" para acessar seu Google Drive.');
      } else {
        setOauthStatusType('error');
        setOauthStatusText(err?.message || 'Erro ao consultar arquivos no Google Drive.');
      }
    } finally {
      setIsSearchingDrive(false);
    }
  }, [driveSearchQuery]);

  useEffect(() => {
    setEndpoint(getDriveEndpoint());
    setAutoSync(getDriveAutoSync());
    setAutoPush(getDriveAutoPush());
    setIsValidated(getDriveSyncValidated());
    setLastSync(getLastDriveSyncDate());
    setHasSafetyBackup(Boolean(getPreSyncSafetyBackup()));

    const unsub = subscribeGoogleAuth(({ user, hasToken }) => {
      setGoogleUser(user);
      setHasGoogleToken(hasToken);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (hasGoogleToken) {
      refreshDriveState();
    } else {
      setDriveBackupFile(null);
      setDriveFiles([]);
    }
  }, [hasGoogleToken, refreshDriveState]);

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    setOauthStatusType('loading');
    setOauthStatusText('Abrindo login seguro do Google...');
    try {
      const res = await googleSignIn();
      setOauthStatusType('success');
      setOauthStatusText(
        `Conectado como ${res.user.email || res.user.displayName || 'Conta Google'}.`
      );
    } catch (err: any) {
      setOauthStatusType('error');
      setOauthStatusText(err?.message || 'Não foi possível autenticar com o Google.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGoogleLogout = async () => {
    await logoutGoogleDrive();
    setOauthStatusType('idle');
    setOauthStatusText('Conta Google desconectada deste navegador.');
  };

  // Read-only pull & safe local merge (never modifies user's Drive)
  const handlePullFromDriveApi = async (specificFile?: DriveFileSummary) => {
    if (isOauthBusy) return;
    setIsOauthBusy(true);
    setOauthStatusType('loading');
    setOauthStatusText('Baixando e mesclando backup do Google Drive...');
    try {
      const { file, mergedStatsSummary } = await pullAndMergeBackupFromDriveApi(specificFile);
      setDriveBackupFile(file);
      setLastSync(getLastDriveSyncDate());
      setIsValidated(true);
      setHasSafetyBackup(Boolean(getPreSyncSafetyBackup()));
      setOauthStatusType('success');
      setOauthStatusText(
        `Backup "${file.name}" mesclado com sucesso (${mergedStatsSummary}).`
      );
      onSyncSuccess?.();
    } catch (err: any) {
      setOauthStatusType('error');
      setOauthStatusText(err?.message || 'Erro ao baixar dados do Google Drive.');
    } finally {
      setIsOauthBusy(false);
    }
  };

  // Prepares upload mutation and ALWAYS prompts user confirmation first
  const requestSaveToDriveApi = async () => {
    if (isOauthBusy) return;
    setIsOauthBusy(true);
    setOauthStatusType('loading');
    setOauthStatusText('Verificando arquivo existente no Google Drive...');
    try {
      const existing = await findAppBackupFileInDrive();
      setDriveBackupFile(existing);
      setOauthStatusType('idle');
      setOauthStatusText('Confirme a gravação no Google Drive para continuar.');
      setPendingMutation({
        kind: 'upload',
        existingFile: existing,
        title: existing
          ? `Sobrescrever "${existing.name}" no Google Drive?`
          : `Criar "${GOOGLE_DRIVE_FILE_NAME}" no Google Drive?`,
        message: existing
          ? `O arquivo "${existing.name}" já existe no seu Google Drive (última modificação: ${
              existing.modifiedTime
                ? new Date(existing.modifiedTime).toLocaleString('pt-BR')
                : 'desconhecida'
            }). Deseja atualizar seu conteúdo com o progresso local atual?`
          : `Um novo arquivo de backup "${GOOGLE_DRIVE_FILE_NAME}" será criado no seu Google Drive com seu progresso atual.`,
        confirmLabel: existing ? 'Confirmar Atualização' : 'Criar Arquivo no Drive',
      });
    } catch (err: any) {
      setOauthStatusType('error');
      setOauthStatusText(err?.message || 'Erro ao verificar Google Drive.');
    } finally {
      setIsOauthBusy(false);
    }
  };

  // Bidirectional sync: 1) safe read+merge locally, 2) explicit confirmation before writing to Drive
  const requestBidirectionalDriveApi = async () => {
    if (isOauthBusy) return;
    setIsOauthBusy(true);
    setOauthStatusType('loading');
    setOauthStatusText('1/2 · Verificando e mesclando backup do Google Drive...');
    try {
      const existing = await findAppBackupFileInDrive();
      setDriveBackupFile(existing);
      if (existing) {
        await pullAndMergeBackupFromDriveApi(existing);
        setHasSafetyBackup(Boolean(getPreSyncSafetyBackup()));
        onSyncSuccess?.();
      }
      setOauthStatusType('idle');
      setOauthStatusText(
        existing
          ? '1/2 concluído (dados da nuvem mesclados localmente). Confirme o envio da versão unificada.'
          : 'Nenhum backup prévio no Drive. Confirme a criação do arquivo inicial.'
      );
      setPendingMutation({
        kind: 'upload',
        existingFile: existing,
        title: existing
          ? `Atualizar "${existing.name}" com dados mesclados?`
          : `Criar "${GOOGLE_DRIVE_FILE_NAME}" no Google Drive?`,
        message: existing
          ? `Os dados da nuvem foram mesclados ao seu aparelho. Confirma a atualização do arquivo "${existing.name}" no seu Google Drive com a versão unificada?`
          : `Deseja criar o arquivo "${GOOGLE_DRIVE_FILE_NAME}" no seu Google Drive com seus dados atuais?`,
        confirmLabel: existing ? 'Enviar Versão Unificada' : 'Criar no Google Drive',
      });
    } catch (err: any) {
      setOauthStatusType('error');
      setOauthStatusText(err?.message || 'Falha na sincronização com o Google Drive.');
    } finally {
      setIsOauthBusy(false);
    }
  };

  const requestTrashDriveFile = (file: DriveFileSummary) => {
    setPendingMutation({
      kind: 'trash',
      file,
      title: `Mover "${file.name}" para a lixeira do Drive?`,
      message: `Esta ação moverá o arquivo "${file.name}" para a lixeira do seu Google Drive. Deseja continuar?`,
      confirmLabel: 'Mover para Lixeira',
    });
  };

  const executeConfirmedDriveMutation = async () => {
    const mutation = pendingMutation;
    setPendingMutation(null);
    if (!mutation) return;

    setIsOauthBusy(true);
    setOauthStatusType('loading');

    try {
      if (mutation.kind === 'upload') {
        setOauthStatusText('Salvando arquivo no Google Drive...');
        const saved = await saveBackupToDriveApi(mutation.existingFile?.id || null);
        setDriveBackupFile(saved);
        setLastSync(getLastDriveSyncDate());
        setIsValidated(true);
        setOauthStatusType('success');
        setOauthStatusText(`Arquivo "${saved.name}" atualizado no Google Drive com sucesso!`);
        await refreshDriveState();
      } else if (mutation.kind === 'trash') {
        setOauthStatusText(`Movendo "${mutation.file.name}" para a lixeira...`);
        await trashDriveFileApi(mutation.file.id);
        if (driveBackupFile?.id === mutation.file.id) {
          setDriveBackupFile(null);
        }
        setOauthStatusType('success');
        setOauthStatusText(`Arquivo "${mutation.file.name}" movido para a lixeira do Google Drive.`);
        await refreshDriveState();
      }
    } catch (err: any) {
      setOauthStatusType('error');
      setOauthStatusText(err?.message || 'Erro ao atualizar arquivo no Google Drive.');
    } finally {
      setIsOauthBusy(false);
    }
  };

  // --- Legacy Apps Script Handlers ---
  const handleEndpointChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setEndpoint(val);
    setDriveEndpoint(val);
    setUrlFixedNotice(false);
    if (isValidated) {
      setIsValidated(false);
    }
  };

  const handleFixUrl = () => {
    const fixed = normalizeAppsScriptUrl(endpoint);
    setEndpoint(fixed);
    setDriveEndpoint(fixed);
    setUrlFixedNotice(true);
    setStatusText('URL corrigida para o formato final /exec.');
    setStatusType('idle');
  };

  const trimmedUrl = endpoint.trim();
  const isInvalidUrlFormat =
    trimmedUrl.length > 0 &&
    (trimmedUrl.includes('/edit') ||
      trimmedUrl.includes('/dev') ||
      (trimmedUrl.startsWith('https://script.google.com/macros/s/') && !trimmedUrl.endsWith('/exec')));

  const handleAutoSyncToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setAutoSync(checked);
    setDriveAutoSync(checked);
  };

  const handleAutoPushToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setAutoPush(checked);
    setDriveAutoPush(checked);
  };

  const resolveValidTargetUrl = (): string | null => {
    let targetUrl = endpoint.trim();
    if (!targetUrl) {
      setStatusText('Cole a URL do Google Apps Script antes de sincronizar.');
      setStatusType('error');
      return null;
    }

    const normalized = normalizeAppsScriptUrl(targetUrl);
    if (normalized !== targetUrl) {
      targetUrl = normalized;
      setEndpoint(normalized);
      setDriveEndpoint(normalized);
      setUrlFixedNotice(true);
    }

    if (!targetUrl.startsWith('https://script.google.com/')) {
      setStatusText('A URL deve iniciar com https://script.google.com/...');
      setStatusType('error');
      return null;
    }
    return targetUrl;
  };

  const executarSincronizacao = async () => {
    if (isLoading) return;
    const targetUrl = resolveValidTargetUrl();
    if (!targetUrl) return;

    setIsLoading(true);
    setStatusType('loading');
    setStatusText('Buscando dados no Google Drive...');

    try {
      await fetchGoogleDriveDataViaJsonp(targetUrl, (msg) => {
        setStatusText(msg);
      });

      setStatusType('success');
      setStatusText('Sincronização concluída com sucesso.');
      setIsValidated(true);
      setLastSync(new Date().toLocaleString('pt-BR'));
      setHasSafetyBackup(Boolean(getPreSyncSafetyBackup()));
      setUrlFixedNotice(false);
      onSyncSuccess?.();
    } catch (err: any) {
      setStatusType('error');
      setStatusText(err?.message || 'Falha no acesso. Confira a URL e as permissões.');
    } finally {
      setIsLoading(false);
    }
  };

  const executarEnvioDrive = async () => {
    if (isLoading) return;
    const targetUrl = resolveValidTargetUrl();
    if (!targetUrl) return;

    setIsLoading(true);
    setStatusType('loading');
    setStatusText('Enviando dados locais para o Google Drive...');

    try {
      const res = await pushBackupToGoogleDrive(targetUrl, (msg) => setStatusText(msg));
      setStatusType('success');
      setStatusText(res.message);
      setIsValidated(true);
      setLastSync(new Date().toLocaleString('pt-BR'));
      setUrlFixedNotice(false);
    } catch (err: any) {
      setStatusType('error');
      setStatusText(err?.message || 'Erro ao enviar dados para o Google Drive.');
    } finally {
      setIsLoading(false);
    }
  };

  const executarSincronizacaoBidirecional = async () => {
    if (isLoading) return;
    const targetUrl = resolveValidTargetUrl();
    if (!targetUrl) return;

    setIsLoading(true);
    setStatusType('loading');
    setStatusText('Sincronizando (baixando e enviando) com o Google Drive...');

    try {
      await syncBidirectionalWithGoogleDrive(targetUrl, (msg) => setStatusText(msg));
      setStatusType('success');
      setStatusText('Tudo sincronizado! Seus computadores e celulares estão alinhados.');
      setIsValidated(true);
      setLastSync(new Date().toLocaleString('pt-BR'));
      setHasSafetyBackup(Boolean(getPreSyncSafetyBackup()));
      setUrlFixedNotice(false);
      onSyncSuccess?.();
    } catch (err: any) {
      setStatusType('error');
      setStatusText(err?.message || 'Falha ao sincronizar com o Google Drive.');
    } finally {
      setIsLoading(false);
    }
  };

  const validPairingEndpoint =
    trimmedUrl.startsWith('https://script.google.com/') && !isInvalidUrlFormat;
  const pairingLink = validPairingEndpoint
    ? buildDevicePairingLink(
        shareAppUrl || (typeof window !== 'undefined' ? window.location.origin : ''),
        trimmedUrl
      )
    : '';

  const handleCopyPairingLink = async () => {
    if (!pairingLink) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(pairingLink);
      }
      setPairingCopied(true);
      setTimeout(() => setPairingCopied(false), 3000);
    } catch {
      // ignore
    }
  };

  const confirmUndoSync = () => {
    const res = restorePreSyncSafetyBackup();
    if (res.success) {
      setStatusType('success');
      setStatusText('Sincronização desfeita! Dados locais restaurados.');
      setOauthStatusType('success');
      setOauthStatusText('Backup anterior à sincronização restaurado no navegador.');
      setHasSafetyBackup(false);
      onSyncSuccess?.();
    } else {
      setStatusType('error');
      setStatusText(res.message);
    }
  };

  const handleCopyScript = async () => {
    try {
      const script = getGoogleAppsScriptTemplate(GOOGLE_DRIVE_FILE_NAME);
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(script);
      }
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 3000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-4">
      {/* PRIMARY: Native Google Drive OAuth Integration */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#E6F4EC] text-[#008542] border border-[#008542]/25 flex items-center justify-center shrink-0">
              <Cloud className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h4 className="text-sm sm:text-base font-display font-bold text-slate-900">
                Google Drive Direto ({GOOGLE_DRIVE_ACCOUNT_EMAIL})
              </h4>
              <p className="text-xs text-slate-600 mt-0.5 flex flex-wrap items-center gap-1.5">
                <span>Pasta/arquivo:</span>
                <code className="font-mono font-semibold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">
                  {GOOGLE_DRIVE_BACKUP_FOLDER}/{GOOGLE_DRIVE_FILE_NAME}
                </code>
              </p>
            </div>
          </div>

          {lastSync && (
            <div className="text-right">
              <div className="text-[11px] text-slate-500">Última sincronização</div>
              <div className="text-xs font-mono tabular-nums font-semibold text-slate-800">{lastSync}</div>
            </div>
          )}
        </div>

        {/* Auth Gate: Sign in with Google when not authenticated or token unavailable */}
        {!hasGoogleToken ? (
          <div className="bg-[#F6F8F7] border border-slate-200 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-sm font-bold text-slate-900">
                {googleUser
                  ? `Revalidar acesso ao Google Drive (${googleUser.email})`
                  : 'Conecte sua conta Google em 1 clique'}
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Entre com sua conta Google para salvar, mesclar e acessar seu progresso e materiais diretamente do Google Drive em qualquer computador ou celular.
              </p>
            </div>
            <div className="shrink-0">
              <GoogleSignInButton onClick={handleGoogleLogin} isLoading={isLoggingIn} />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Signed-in user bar */}
            <div className="bg-[#E6F4EC]/70 border border-[#008542]/25 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {googleUser?.photoURL ? (
                  <img
                    src={googleUser.photoURL}
                    alt={googleUser.displayName || 'Conta Google'}
                    className="w-8 h-8 rounded-full border border-[#008542]/30 shrink-0"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[#008542] text-white text-xs font-bold flex items-center justify-center shrink-0">
                    {(googleUser?.email || 'G')[0].toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="text-xs font-bold text-[#071F14] truncate">
                    {googleUser?.displayName || 'Conta Google conectada'}
                  </div>
                  <div className="text-[11px] text-[#006837] font-mono truncate">
                    {googleUser?.email}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refreshDriveState}
                  isLoading={isSearchingDrive}
                  leftIcon={!isSearchingDrive ? <RefreshCw className="w-3.5 h-3.5" /> : undefined}
                >
                  Atualizar lista
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGoogleLogout}
                  leftIcon={<LogOut className="w-3.5 h-3.5 text-slate-600" />}
                >
                  Sair
                </Button>
              </div>
            </div>

            {/* Backup File Status */}
            <div className="bg-[#F6F8F7] border border-slate-200 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-xs">
              {driveBackupFile ? (
                <>
                  <div className="flex items-center gap-2 text-slate-800">
                    <CheckCircle2 className="w-4 h-4 text-[#008542] shrink-0" aria-hidden="true" />
                    <span>
                      Backup encontrado no Drive: <strong>{driveBackupFile.name}</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-slate-600 font-mono">
                    {driveBackupFile.modifiedTime && (
                      <span>
                        Modificado em {new Date(driveBackupFile.modifiedTime).toLocaleString('pt-BR')}
                      </span>
                    )}
                    {driveBackupFile.webViewLink && (
                      <a
                        href={driveBackupFile.webViewLink}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#006837] font-sans font-semibold hover:underline inline-flex items-center gap-1"
                      >
                        Abrir <ExternalLink className="w-3 h-3" aria-hidden="true" />
                      </a>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2 text-slate-600">
                  <FileText className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
                  <span>
                    Arquivo <strong>{GOOGLE_DRIVE_FILE_NAME}</strong> ainda não foi criado neste Google Drive.
                  </span>
                </div>
              )}
            </div>

            {/* Primary Sync Actions */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={requestBidirectionalDriveApi}
                disabled={isOauthBusy}
                className="h-10 px-4 rounded-xl bg-[#071F14] hover:bg-[#0D3321] disabled:bg-slate-400 text-[#FDB913] font-semibold text-xs inline-flex items-center gap-2 transition-colors cursor-pointer disabled:cursor-not-allowed whitespace-nowrap shrink-0"
              >
                <ArrowLeftRight className="w-4 h-4" aria-hidden="true" />
                <span>Sincronizar Tudo (Mesclar + Enviar)</span>
              </button>

              <button
                type="button"
                onClick={requestSaveToDriveApi}
                disabled={isOauthBusy}
                className="h-10 px-3.5 rounded-xl bg-[#008542] hover:bg-[#006837] disabled:bg-slate-400 text-white font-semibold text-xs inline-flex items-center gap-2 transition-colors cursor-pointer disabled:cursor-not-allowed whitespace-nowrap shrink-0"
              >
                <UploadCloud className="w-4 h-4" aria-hidden="true" />
                <span>Salvar no Google Drive</span>
              </button>

              <button
                type="button"
                onClick={() => handlePullFromDriveApi()}
                disabled={isOauthBusy || !driveBackupFile}
                className="h-10 px-3.5 rounded-xl bg-white hover:bg-[#F6F8F7] disabled:bg-slate-100 disabled:text-slate-400 text-slate-800 border border-slate-300 font-semibold text-xs inline-flex items-center gap-2 transition-colors cursor-pointer disabled:cursor-not-allowed whitespace-nowrap shrink-0"
              >
                <DownloadCloud className="w-4 h-4" aria-hidden="true" />
                <span>Baixar e Mesclar do Drive</span>
              </button>
            </div>

            {/* Drive File Explorer Toggle */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setShowDriveBrowser(!showDriveBrowser)}
                className="w-full px-4 py-2.5 bg-[#F6F8F7] hover:bg-[#EFF4F1] flex items-center justify-between text-xs font-semibold text-slate-800 transition-colors cursor-pointer"
              >
                <span className="inline-flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-[#008542]" aria-hidden="true" />
                  Meus Arquivos no Google Drive ({driveFiles.length})
                </span>
                {showDriveBrowser ? (
                  <ChevronUp className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <ChevronDown className="w-4 h-4" aria-hidden="true" />
                )}
              </button>

              {showDriveBrowser && (
                <div className="p-3.5 bg-white border-t border-slate-200 space-y-3">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      refreshDriveState();
                    }}
                    className="flex gap-2"
                  >
                    <div className="relative flex-1">
                      <Search
                        className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
                        aria-hidden="true"
                      />
                      <input
                        type="text"
                        value={driveSearchQuery}
                        onChange={(e) => setDriveSearchQuery(e.target.value)}
                        placeholder="Buscar arquivo ou apostila no seu Google Drive..."
                        className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-slate-200 bg-[#F6F8F7] focus:bg-white focus:border-[#008542] focus:outline-hidden"
                      />
                    </div>
                    <Button type="submit" variant="outline" size="sm" isLoading={isSearchingDrive}>
                      Buscar
                    </Button>
                  </form>

                  {driveFiles.length === 0 ? (
                    <div className="text-xs text-slate-500 py-3 text-center">
                      Nenhum arquivo encontrado com esse filtro.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto">
                      {driveFiles.map((file) => {
                        const isJson =
                          file.name.toLowerCase().endsWith('.json') ||
                          file.mimeType === 'application/json';
                        return (
                          <div
                            key={file.id}
                            className="py-2 flex items-center justify-between gap-2 text-xs"
                          >
                            <div className="min-w-0">
                              <div className="font-semibold text-slate-800 truncate">{file.name}</div>
                              <div className="text-[11px] text-slate-500 font-mono">
                                {file.modifiedTime
                                  ? new Date(file.modifiedTime).toLocaleString('pt-BR')
                                  : file.mimeType}
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {isJson && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handlePullFromDriveApi(file)}
                                  disabled={isOauthBusy}
                                >
                                  Mesclar JSON
                                </Button>
                              )}
                              {file.webViewLink && (
                                <a
                                  href={file.webViewLink}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="h-8 px-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs inline-flex items-center gap-1"
                                >
                                  Abrir <ExternalLink className="w-3 h-3" aria-hidden="true" />
                                </a>
                              )}
                              <button
                                type="button"
                                onClick={() => requestTrashDriveFile(file)}
                                disabled={isOauthBusy}
                                title={`Mover ${file.name} para lixeira`}
                                aria-label={`Mover ${file.name} para lixeira`}
                                className="h-8 w-8 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 inline-flex items-center justify-center cursor-pointer disabled:opacity-50"
                              >
                                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* OAuth Status Banner + Undo Safety Backup */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div
            role="status"
            className={`text-xs font-medium ${
              oauthStatusType === 'error'
                ? 'text-rose-600'
                : oauthStatusType === 'success'
                ? 'text-[#006837]'
                : 'text-slate-600'
            }`}
          >
            {oauthStatusText}
          </div>

          {hasSafetyBackup && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowUndoConfirm(true)}
              leftIcon={<RotateCcw className="w-3.5 h-3.5 text-rose-600" />}
              className="text-rose-700 border-rose-200 hover:bg-rose-50"
            >
              Desfazer Sincronização
            </Button>
          )}
        </div>

        {/* Anti-loss Rule */}
        <div className="bg-[#E6F4EC]/80 border border-[#008542]/25 rounded-xl p-3.5 text-xs text-[#071F14] leading-relaxed flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-[#008542] shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <strong>Sincronização Segura (Anti-Perda):</strong> O aplicativo une o progresso local com o do Google Drive sem apagar seus registros, e solicita confirmação explícita antes de criar, sobrescrever ou remover arquivos na nuvem.
          </div>
        </div>
      </div>

      {/* SECONDARY COLLAPSIBLE: Legacy Google Apps Script Mode + Pairing Link */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <button
          type="button"
          onClick={() => setShowAppsScriptSection(!showAppsScriptSection)}
          aria-expanded={showAppsScriptSection}
          className="w-full px-5 py-3.5 flex items-center justify-between text-xs font-bold text-slate-700 hover:bg-[#F6F8F7] transition-colors cursor-pointer"
        >
          <span className="inline-flex items-center gap-2 text-left">
            <Code className="w-4 h-4 text-slate-500 shrink-0" aria-hidden="true" />
            <span>
              Sincronização via Google Apps Script ({GOOGLE_DRIVE_ACCOUNT_EMAIL} · pasta{' '}
              <code className="font-mono">{GOOGLE_DRIVE_BACKUP_FOLDER}</code>)
            </span>
          </span>
          {showAppsScriptSection ? (
            <ChevronUp className="w-4 h-4 shrink-0" aria-hidden="true" />
          ) : (
            <ChevronDown className="w-4 h-4 shrink-0" aria-hidden="true" />
          )}
        </button>

        {showAppsScriptSection && (
          <div className="p-5 pt-3 border-t border-slate-100 space-y-4">
            <div className="bg-[#E6F4EC]/70 border border-[#008542]/25 rounded-xl px-3.5 py-2.5 text-xs text-[#071F14] flex flex-wrap items-center justify-between gap-2">
              <span>
                <strong>Conta do Script:</strong>{' '}
                <code className="font-mono font-semibold">{GOOGLE_DRIVE_ACCOUNT_EMAIL}</code>
              </span>
              <span>
                <strong>Destino no Drive:</strong>{' '}
                <code className="font-mono font-semibold">
                  {GOOGLE_DRIVE_BACKUP_FOLDER}/{GOOGLE_DRIVE_FILE_NAME}
                </code>
              </span>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="drive-endpoint-input" className="text-xs font-bold text-slate-700">
                  URL do Web App (Google Apps Script /exec)
                </label>
                {isValidated ? (
                  <span className="text-[11px] text-[#006837] font-semibold inline-flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" /> Validada
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-500">Deve terminar em /exec</span>
                )}
              </div>
              <input
                id="drive-endpoint-input"
                type="url"
                value={endpoint}
                onChange={handleEndpointChange}
                placeholder="https://script.google.com/macros/s/.../exec"
                className={`w-full text-xs font-mono px-3.5 py-2.5 rounded-xl border bg-[#F6F8F7] focus:bg-white focus:outline-hidden transition-colors ${
                  isInvalidUrlFormat
                    ? 'border-orange-400 focus:border-orange-500 text-orange-950'
                    : 'border-slate-200 focus:border-[#008542] text-slate-900'
                }`}
              />

              {urlFixedNotice && (
                <div className="flex items-center gap-2 bg-[#E6F4EC] border border-[#008542]/30 text-[#071F14] p-2.5 rounded-xl text-xs">
                  <CheckCircle2 className="w-4 h-4 text-[#008542] shrink-0" aria-hidden="true" />
                  <span>
                    URL formatada automaticamente para o endpoint público final <strong>/exec</strong>.
                  </span>
                </div>
              )}

              {isInvalidUrlFormat && (
                <div className="flex items-center justify-between gap-2 bg-orange-50 border border-orange-200 text-orange-950 p-2.5 rounded-xl text-xs">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-600 shrink-0" aria-hidden="true" />
                    <span>
                      A URL do Apps Script precisa terminar em <strong>/exec</strong> (sem /edit ou /dev).
                    </span>
                  </div>
                  <Button variant="secondary" size="sm" onClick={handleFixUrl}>
                    Corrigir /exec
                  </Button>
                </div>
              )}
            </div>

            <div id="drive-sync" className="space-y-2.5 py-1">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={executarSincronizacaoBidirecional}
                  disabled={isLoading}
                  className="h-9 px-3.5 rounded-xl bg-[#071F14] hover:bg-[#0D3321] disabled:bg-slate-400 text-[#FDB913] font-semibold text-xs inline-flex items-center gap-2 transition-colors cursor-pointer disabled:cursor-not-allowed whitespace-nowrap shrink-0"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Sincronizar Tudo</span>
                </button>

                <button
                  type="button"
                  onClick={executarEnvioDrive}
                  disabled={isLoading}
                  className="h-9 px-3 rounded-xl bg-[#008542] hover:bg-[#006837] disabled:bg-slate-400 text-white font-semibold text-xs inline-flex items-center gap-2 transition-colors cursor-pointer disabled:cursor-not-allowed whitespace-nowrap shrink-0"
                >
                  <UploadCloud className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Salvar via Script</span>
                </button>

                <button
                  id="drive-sync-btn"
                  type="button"
                  onClick={executarSincronizacao}
                  disabled={isLoading}
                  className="h-9 px-3 rounded-xl bg-white hover:bg-[#F6F8F7] disabled:bg-slate-100 text-slate-800 border border-slate-300 font-semibold text-xs inline-flex items-center gap-2 transition-colors cursor-pointer disabled:cursor-not-allowed whitespace-nowrap shrink-0"
                >
                  {isLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />}
                  <span>Atualizar via Script</span>
                </button>
              </div>

              <div
                id="drive-sync-status"
                role="status"
                className={`text-xs font-medium ${
                  statusType === 'error'
                    ? 'text-rose-600'
                    : statusType === 'success'
                    ? 'text-[#006837]'
                    : 'text-slate-600'
                }`}
              >
                {statusText}
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
              <label
                className={`flex items-center gap-2 select-none font-medium ${
                  !isValidated
                    ? 'opacity-60 cursor-not-allowed text-slate-500'
                    : 'text-slate-700 hover:text-slate-900 cursor-pointer'
                }`}
              >
                <input
                  type="checkbox"
                  checked={autoSync}
                  onChange={handleAutoSyncToggle}
                  disabled={!isValidated}
                  className="w-4 h-4 rounded-sm accent-[#008542] cursor-pointer disabled:cursor-not-allowed"
                />
                <span>Baixar dados automaticamente ao abrir em cada aparelho</span>
              </label>

              <label
                className={`flex items-center gap-2 select-none font-medium ${
                  !isValidated
                    ? 'opacity-60 cursor-not-allowed text-slate-500'
                    : 'text-slate-700 hover:text-slate-900 cursor-pointer'
                }`}
              >
                <input
                  type="checkbox"
                  checked={autoPush}
                  onChange={handleAutoPushToggle}
                  disabled={!isValidated}
                  className="w-4 h-4 rounded-sm accent-[#008542] cursor-pointer disabled:cursor-not-allowed"
                />
                <span>Enviar alterações automaticamente via Apps Script</span>
              </label>
            </div>

            {/* Multi-Device Quick Access Card */}
            <div className="bg-[#F6F8F7] border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#071F14] text-[#FDB913] flex items-center justify-center shrink-0">
                  <Smartphone className="w-4 h-4" aria-hidden="true" />
                </div>
                <div>
                  <h5 className="text-xs sm:text-sm font-bold text-slate-900">
                    Link Conectado (Apps Script)
                  </h5>
                  <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                    Gere um link com sua URL do Apps Script embutida para abrir no celular ou em outro computador.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
                <div className="sm:col-span-2">
                  <label htmlFor="share-app-url-input" className="block text-[11px] font-bold text-slate-700 mb-1">
                    Endereço do App:
                  </label>
                  <input
                    id="share-app-url-input"
                    type="url"
                    value={shareAppUrl}
                    onChange={(e) => setShareAppUrl(e.target.value)}
                    placeholder="https://ais-pre-....run.app"
                    className="w-full text-xs font-mono px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-800"
                  />
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={!pairingLink}
                  onClick={handleCopyPairingLink}
                  leftIcon={pairingCopied ? <Check className="w-3.5 h-3.5" /> : <LinkIcon className="w-3.5 h-3.5" />}
                >
                  {pairingCopied ? 'Link Copiado!' : 'Copiar Link'}
                </Button>
              </div>
            </div>

            {/* Accordion: Apps Script Instructions */}
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
              <button
                type="button"
                onClick={() => setShowScriptCode(!showScriptCode)}
                aria-expanded={showScriptCode}
                className="w-full px-4 py-2.5 flex items-center justify-between text-xs font-semibold text-slate-800 hover:bg-[#F6F8F7] transition-colors cursor-pointer"
              >
                <span>Ver Código.gs do Google Apps Script</span>
                {showScriptCode ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showScriptCode && (
                <div className="p-4 border-t border-slate-200 bg-[#F6F8F7] space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono text-slate-600 font-semibold">Código.gs</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyScript}
                      leftIcon={
                        codeCopied ? (
                          <Check className="w-3.5 h-3.5 text-[#008542]" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 text-slate-500" />
                        )
                      }
                    >
                      {codeCopied ? 'Copiado' : 'Copiar código'}
                    </Button>
                  </div>
                  <pre className="bg-[#071F14] text-[#FDB913] p-3.5 rounded-xl text-[11px] font-mono overflow-x-auto max-h-60 leading-relaxed select-all border border-[#123826]">
                    {getGoogleAppsScriptTemplate(
                      GOOGLE_DRIVE_FILE_NAME,
                      GOOGLE_DRIVE_BACKUP_FOLDER,
                      GOOGLE_DRIVE_ACCOUNT_EMAIL
                    )}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Mandatory User Confirmation before mutating/overwriting/deleting Google Drive files */}
      <ConfirmDialog
        isOpen={pendingMutation !== null}
        title={pendingMutation?.title || ''}
        message={pendingMutation?.message || ''}
        confirmLabel={pendingMutation?.confirmLabel || 'Confirmar'}
        cancelLabel="Cancelar"
        variant={pendingMutation?.kind === 'trash' ? 'danger' : 'warning'}
        onConfirm={executeConfirmedDriveMutation}
        onCancel={() => setPendingMutation(null)}
      />

      <ConfirmDialog
        isOpen={showUndoConfirm}
        title="Desfazer última sincronização?"
        message="Deseja reverter a última sincronização e restaurar seus dados locais exatamente como estavam antes?"
        confirmLabel="Desfazer Sincronização"
        cancelLabel="Cancelar"
        variant="warning"
        onConfirm={confirmUndoSync}
        onCancel={() => setShowUndoConfirm(false)}
      />
    </div>
  );
};
