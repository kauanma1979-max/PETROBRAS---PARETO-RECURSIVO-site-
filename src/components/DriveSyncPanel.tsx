import React, { useState, useEffect } from 'react';
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
  ArrowLeftRight
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
  GOOGLE_DRIVE_FILE_NAME
} from '../utils/driveSync';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { Button } from './ui/Button';

interface DriveSyncPanelProps {
  onSyncSuccess?: () => void;
  compact?: boolean;
}

export const DriveSyncPanel: React.FC<DriveSyncPanelProps> = ({
  onSyncSuccess
}) => {
  const [endpoint, setEndpoint] = useState<string>(getDriveEndpoint());
  const [autoSync, setAutoSync] = useState<boolean>(getDriveAutoSync());
  const [autoPush, setAutoPush] = useState<boolean>(getDriveAutoPush());
  const [isValidated, setIsValidated] = useState<boolean>(getDriveSyncValidated());
  const [lastSync, setLastSync] = useState<string | null>(getLastDriveSyncDate());
  const [statusText, setStatusText] = useState<string>('Pronto para sincronizar');
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

  useEffect(() => {
    setEndpoint(getDriveEndpoint());
    setAutoSync(getDriveAutoSync());
    setAutoPush(getDriveAutoPush());
    setIsValidated(getDriveSyncValidated());
    setLastSync(getLastDriveSyncDate());
    setHasSafetyBackup(Boolean(getPreSyncSafetyBackup()));
  }, []);

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
      if (onSyncSuccess) {
        onSyncSuccess();
      }
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
      if (onSyncSuccess) onSyncSuccess();
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
    ? buildDevicePairingLink(shareAppUrl || (typeof window !== 'undefined' ? window.location.origin : ''), trimmedUrl)
    : '';

  const handleCopyPairingLink = async () => {
    if (!pairingLink) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(pairingLink);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = pairingLink;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
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
      setHasSafetyBackup(false);
      if (onSyncSuccess) onSyncSuccess();
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
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = script;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 3000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#E6F4EC] text-[#008542] border border-[#008542]/25 flex items-center justify-center shrink-0">
            <Cloud className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <h4 className="text-sm sm:text-base font-display font-bold text-slate-900">
              Sincronização com Google Drive
            </h4>
            <p className="text-xs text-slate-600 mt-0.5 flex flex-wrap items-center gap-1.5">
              <span>Arquivo alvo:</span>
              <code className="font-mono font-semibold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">
                {GOOGLE_DRIVE_FILE_NAME}
              </code>
              <span className="text-[#006837] font-medium">· Versão mais recente automática</span>
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

      {/* URL Input */}
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
            <span>URL formatada automaticamente para o endpoint público final <strong>/exec</strong>.</span>
          </div>
        )}

        {isInvalidUrlFormat && (
          <div className="flex items-center justify-between gap-2 bg-orange-50 border border-orange-200 text-orange-950 p-2.5 rounded-xl text-xs">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-600 shrink-0" aria-hidden="true" />
              <span>A URL do Apps Script precisa terminar em <strong>/exec</strong> (sem /edit ou /dev).</span>
            </div>
            <Button variant="secondary" size="sm" onClick={handleFixUrl}>
              Corrigir /exec
            </Button>
          </div>
        )}
      </div>

      {/* Preserved Drive Sync Button & Two-Way Actions */}
      <div id="drive-sync" className="space-y-2.5 py-1">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={executarSincronizacaoBidirecional}
            disabled={isLoading}
            className="h-10 px-4 rounded-xl bg-[#071F14] hover:bg-[#0D3321] disabled:bg-slate-400 text-[#FDB913] font-semibold text-xs inline-flex items-center gap-2 transition-colors cursor-pointer disabled:cursor-not-allowed whitespace-nowrap shrink-0"
          >
            <ArrowLeftRight className="w-4 h-4" aria-hidden="true" />
            <span>Sincronizar Tudo (Enviar + Baixar)</span>
          </button>

          <button
            type="button"
            onClick={executarEnvioDrive}
            disabled={isLoading}
            className="h-10 px-3.5 rounded-xl bg-[#008542] hover:bg-[#006837] disabled:bg-slate-400 text-white font-semibold text-xs inline-flex items-center gap-2 transition-colors cursor-pointer disabled:cursor-not-allowed whitespace-nowrap shrink-0"
          >
            <UploadCloud className="w-4 h-4" aria-hidden="true" />
            <span>Salvar no Google Drive</span>
          </button>

          <button
            id="drive-sync-btn"
            type="button"
            onClick={executarSincronizacao}
            disabled={isLoading}
            className="h-10 px-3.5 rounded-xl bg-white hover:bg-[#F6F8F7] disabled:bg-slate-100 text-slate-800 border border-slate-300 font-semibold text-xs inline-flex items-center gap-2 transition-colors cursor-pointer disabled:cursor-not-allowed whitespace-nowrap shrink-0"
          >
            {isLoading && <RefreshCw className="w-4 h-4 animate-spin" aria-hidden="true" />}
            <span>Atualizar dados do Google Drive</span>
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

      {/* Troubleshooting panel on error */}
      {statusType === 'error' && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 space-y-3 text-xs text-rose-900 animate-fadeIn">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="space-y-1">
              <div className="font-bold text-rose-950 text-sm">
                Diagnóstico: Como liberar o acesso no Google Apps Script
              </div>
              <p className="text-rose-800 text-xs leading-relaxed">
                O navegador foi impedido de carregar o arquivo. Em 99% dos casos, isso ocorre porque a implantação está com{' '}
                <strong>"Quem tem acesso: Somente eu"</strong>.
              </p>
            </div>
          </div>

          <div className="bg-white border border-rose-200 rounded-lg p-3 space-y-1.5 text-xs text-slate-700">
            <div className="font-bold text-slate-900">Como ajustar a permissão em 1 minuto:</div>
            <ol className="list-decimal list-inside space-y-1 text-slate-600 leading-relaxed">
              <li>
                Acesse{' '}
                <a
                  href="https://script.google.com"
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-700 font-semibold underline inline-flex items-center gap-0.5"
                >
                  script.google.com <ExternalLink className="w-3 h-3" aria-hidden="true" />
                </a>{' '}
                e abra seu projeto.
              </li>
              <li>Clique em <strong>Implantar &gt; Gerenciar implantações</strong> e depois no ícone de <strong>Editar</strong>.</li>
              <li>Em <strong>"Quem tem acesso"</strong>, selecione <strong>"Qualquer pessoa"</strong> (Anyone).</li>
              <li>Em <strong>Versão</strong>, escolha <strong>"Nova versão"</strong> e clique em <strong>Implantar</strong>.</li>
            </ol>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {trimmedUrl && (
              <a
                href={normalizeAppsScriptUrl(trimmedUrl)}
                target="_blank"
                rel="noreferrer"
                className="h-8 px-3 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs inline-flex items-center gap-1.5 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Testar link no navegador</span>
              </a>
            )}
            <Button variant="outline" size="sm" onClick={executarSincronizacao} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
              Tentar novamente
            </Button>
          </div>
        </div>
      )}

      {/* Advanced Options & Safety */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
        <div className="space-y-2">
          <label
            className={`flex items-center gap-2 select-none font-medium ${
              !isValidated ? 'opacity-60 cursor-not-allowed text-slate-500' : 'text-slate-700 hover:text-slate-900 cursor-pointer'
            }`}
            title={!isValidated ? 'Sincronize pelo menos uma vez com sucesso para habilitar atualização automática' : ''}
          >
            <input
              type="checkbox"
              checked={autoSync}
              onChange={handleAutoSyncToggle}
              disabled={!isValidated}
              className="w-4 h-4 rounded-sm accent-[#008542] cursor-pointer disabled:cursor-not-allowed"
            />
            <span>Baixar dados automaticamente ao abrir em cada aparelho</span>
            {!isValidated && (
              <span className="text-[11px] text-orange-800 bg-orange-50 px-2 py-0.5 rounded font-semibold">
                Requer validação prévia
              </span>
            )}
          </label>

          <label
            className={`flex items-center gap-2 select-none font-medium ${
              !isValidated ? 'opacity-60 cursor-not-allowed text-slate-500' : 'text-slate-700 hover:text-slate-900 cursor-pointer'
            }`}
          >
            <input
              type="checkbox"
              checked={autoPush}
              onChange={handleAutoPushToggle}
              disabled={!isValidated}
              className="w-4 h-4 rounded-sm accent-[#008542] cursor-pointer disabled:cursor-not-allowed"
            />
            <span>Enviar alterações automaticamente para o Google Drive (recomendado para usar vários PCs/celulares)</span>
          </label>
        </div>

        {hasSafetyBackup && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowUndoConfirm(true)}
            leftIcon={<RotateCcw className="w-3.5 h-3.5 text-rose-600" />}
            className="text-rose-700 border-rose-200 hover:bg-rose-50 self-start sm:self-center"
          >
            Desfazer Sincronização
          </Button>
        )}
      </div>

      {/* Multi-Device Quick Access Card */}
      <div className="bg-[#F6F8F7] border border-slate-200 rounded-xl p-4 space-y-3">
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#071F14] text-[#FDB913] flex items-center justify-center shrink-0">
            <Smartphone className="w-4 h-4" aria-hidden="true" />
          </div>
          <div>
            <h5 className="text-xs sm:text-sm font-bold text-slate-900">
              Acesso em Vários Computadores e Celulares (1 Clique)
            </h5>
            <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
              Depois de configurar a URL do Apps Script acima, gere um <strong>Link Conectado</strong> para abrir no celular ou em outro PC sem precisar colar a URL do Drive de novo.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
          <div className="sm:col-span-2">
            <label htmlFor="share-app-url-input" className="block text-[11px] font-bold text-slate-700 mb-1">
              Endereço do App (use o Shared App URL para abrir fora deste PC):
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
            {pairingCopied ? 'Link Copiado!' : 'Copiar Link Celular/PC'}
          </Button>
        </div>

        {pairingLink ? (
          <div className="text-[11px] font-mono bg-white border border-slate-200 rounded-lg p-2.5 text-slate-700 break-all">
            {pairingLink}
          </div>
        ) : (
          <div className="text-[11px] text-slate-500">
            Cole uma URL válida do Apps Script (/exec) acima para gerar seu link de acesso multi-dispositivo.
          </div>
        )}
      </div>

      {/* Anti-loss Rule */}
      <div className="bg-[#E6F4EC]/80 border border-[#008542]/25 rounded-xl p-3.5 text-xs text-[#071F14] leading-relaxed flex items-start gap-2.5">
        <ShieldCheck className="w-4 h-4 text-[#008542] shrink-0 mt-0.5" aria-hidden="true" />
        <div>
          <strong>Sincronização Segura (Anti-Perda):</strong> O aplicativo une o progresso local com o do Google Drive sem apagar seus registros. Um backup de segurança é salvo antes de cada mesclagem.
        </div>
      </div>

      {/* Accordion: Apps Script Instructions */}
      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
        <button
          type="button"
          onClick={() => setShowScriptCode(!showScriptCode)}
          aria-expanded={showScriptCode}
          className="w-full px-4 py-3 flex items-center justify-between text-xs font-semibold text-slate-800 hover:bg-[#F6F8F7] transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Code className="w-4 h-4 text-[#008542] shrink-0" aria-hidden="true" />
            <span className="truncate">Passo a Passo & Código do Google Apps Script ({GOOGLE_DRIVE_FILE_NAME})</span>
          </div>
          {showScriptCode ? <ChevronUp className="w-4 h-4 shrink-0" /> : <ChevronDown className="w-4 h-4 shrink-0" />}
        </button>

        {showScriptCode && (
          <div className="p-4 border-t border-slate-200 bg-[#F6F8F7] space-y-3 text-xs">
            <div className="space-y-1.5 text-slate-700">
              <div className="font-bold text-slate-900">Como configurar em 4 passos simples:</div>
              <ol className="list-decimal list-inside space-y-1.5 leading-relaxed">
                <li>
                  Salve o arquivo <code className="bg-slate-200 px-1.5 py-0.5 rounded font-mono font-semibold text-slate-900">{GOOGLE_DRIVE_FILE_NAME}</code> no seu Google Drive.
                </li>
                <li>
                  Acesse{' '}
                  <a href="https://script.google.com" target="_blank" rel="noreferrer" className="text-[#006837] hover:underline font-semibold inline-flex items-center gap-0.5">
                    script.google.com <ExternalLink className="w-3 h-3" aria-hidden="true" />
                  </a>{' '}
                  e crie um <strong>Novo projeto</strong>.
                </li>
                <li>Cole o código abaixo em <code className="font-mono">Código.gs</code> e salve.</li>
                <li>
                  Clique em <strong>Implantar &gt; Nova implantação &gt; Aplicativo da Web</strong> com acesso para <strong>Qualquer pessoa</strong> e cole a URL <code className="font-mono">/exec</code> acima.
                </li>
              </ol>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-slate-600 font-semibold">Código.gs</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyScript}
                  leftIcon={codeCopied ? <Check className="w-3.5 h-3.5 text-[#008542]" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                >
                  {codeCopied ? 'Copiado' : 'Copiar código'}
                </Button>
              </div>
              <pre className="bg-[#071F14] text-[#FDB913] p-3.5 rounded-xl text-[11px] font-mono overflow-x-auto max-h-60 leading-relaxed select-all border border-[#123826]">
                {getGoogleAppsScriptTemplate(GOOGLE_DRIVE_FILE_NAME)}
              </pre>
            </div>
          </div>
        )}
      </div>

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
