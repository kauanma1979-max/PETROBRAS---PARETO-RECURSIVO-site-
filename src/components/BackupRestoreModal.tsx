import React, { useState, useRef, useEffect } from 'react';
import {
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Database,
  FileJson,
  Calendar,
  BookOpen,
  HelpCircle,
  Link as LinkIcon,
  Sparkles,
  Copy,
  Check,
  Code2,
  Cloud,
  ShieldCheck,
  RotateCcw,
  Loader2,
  XCircle,
} from 'lucide-react';
import {
  BACKUP_FILE_NAME,
  BACKUP_MODULES_REGISTRY,
  downloadValidatedBackupFile,
  getBackupStats,
  BackupStats,
  getBackupJsonString,
  copyBackupToClipboard,
  inspectBackupFromFile,
  inspectBackupFromJsonString,
  applyInspectedBackupRestore,
  restorePreRestoreRollbackSnapshot,
  hasPreRestoreSafetySnapshot,
  type BackupExportStage,
  type BackupInspectionResult,
  type BackupIntegrityReport,
} from '../utils/backupStorage';
import { DriveSyncPanel } from './DriveSyncPanel';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';

interface BackupRestoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataRestored?: () => void;
  initialTab?: 'drive' | 'file' | 'code';
}

const EXPORT_STAGE_LABELS: Record<BackupExportStage, string> = {
  preparing: 'Preparando módulos e rascunhos...',
  collecting: 'Coletando dados de todos os armazenamentos...',
  verifying_modules: 'Calculando hash SHA-256 e verificando cobertura...',
  validating_integrity: 'Validando integridade estrutural...',
  generating_file: 'Gerando arquivo JSON único...',
  completed: 'Backup completo validado e gerado!',
  error: 'Falha ao validar ou gerar backup.',
};

export const BackupRestoreModal: React.FC<BackupRestoreModalProps> = ({
  isOpen,
  onClose,
  onDataRestored,
  initialTab = 'drive',
}) => {
  const [activeMode, setActiveMode] = useState<'drive' | 'file' | 'code'>(initialTab);
  const [stats, setStats] = useState<BackupStats>(getBackupStats());
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportStage, setExportStage] = useState<BackupExportStage | null>(null);
  const [lastIntegrityReport, setLastIntegrityReport] = useState<BackupIntegrityReport | null>(null);
  const [lastExportDate, setLastExportDate] = useState<string | null>(null);

  const [isInspecting, setIsInspecting] = useState<boolean>(false);
  const [isRestoring, setIsRestoring] = useState<boolean>(false);
  const [pendingInspection, setPendingInspection] = useState<{
    source: 'file' | 'code';
    sourceLabel: string;
    inspection: BackupInspectionResult;
  } | null>(null);
  const [preserveBeforeRestore, setPreserveBeforeRestore] = useState<boolean>(true);
  const [hasRollbackSnapshot, setHasRollbackSnapshot] = useState<boolean>(() =>
    hasPreRestoreSafetySnapshot()
  );

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [rawJsonInput, setRawJsonInput] = useState<string>('');
  const [previewJson, setPreviewJson] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refreshLocalViews = () => {
    setStats(getBackupStats());
    setHasRollbackSnapshot(hasPreRestoreSafetySnapshot());
    try {
      setPreviewJson(getBackupJsonString());
    } catch {
      setPreviewJson('');
    }
  };

  useEffect(() => {
    if (isOpen) {
      setActiveMode(initialTab);
      setFeedback(null);
      setCopied(false);
      setExportStage(null);
      setPendingInspection(null);
      refreshLocalViews();
    }
  }, [isOpen, initialTab]);

  const handleExport = async () => {
    if (isExporting) return;
    setIsExporting(true);
    setFeedback(null);
    setExportStage('preparing');
    try {
      const bundle = await downloadValidatedBackupFile((stage) => {
        setExportStage(stage);
      });
      setLastIntegrityReport(bundle.report);
      setLastExportDate(bundle.payload.exportDateFormatted || new Date().toLocaleString('pt-BR'));
      setFeedback({
        type: 'success',
        message: `Arquivo "${BACKUP_FILE_NAME}" validado (SHA-256) e baixado com ${bundle.report.totalModulesExported}/${bundle.report.totalModulesIdentified} módulos e ${bundle.report.totalRecords} registros.`,
      });
      refreshLocalViews();
    } catch (e: any) {
      setExportStage('error');
      setFeedback({
        type: 'error',
        message: `Falha ao gerar backup: ${e?.message || 'Erro desconhecido'}`,
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyClipboard = async () => {
    try {
      const success = await copyBackupToClipboard();
      if (success) {
        setCopied(true);
        setFeedback({
          type: 'success',
          message: 'Código JSON completo validado (SHA-256) copiado para a área de transferência.',
        });
        setTimeout(() => setCopied(false), 3000);
      } else {
        setFeedback({
          type: 'error',
          message: 'Não foi possível copiar automaticamente. Use a aba "Código JSON" para copiar manualmente.',
        });
      }
    } catch (e: any) {
      setFeedback({
        type: 'error',
        message: `Erro ao copiar: ${e?.message || 'Permissão negada'}`,
      });
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsInspecting(true);
    setFeedback(null);
    setPendingInspection(null);

    try {
      const inspection = await inspectBackupFromFile(file);
      setPendingInspection({
        source: 'file',
        sourceLabel: file.name,
        inspection,
      });
      if (!inspection.canRestore) {
        setFeedback({
          type: 'error',
          message:
            inspection.errors[0] ||
            'O arquivo selecionado apresentou falhas na verificação e não pode ser restaurado.',
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: `Falha ao inspecionar arquivo: ${err?.message || 'Erro de leitura'}`,
      });
    } finally {
      setIsInspecting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleInspectFromTextInput = async () => {
    if (!rawJsonInput.trim()) {
      setFeedback({
        type: 'error',
        message: 'Por favor, cole o texto JSON antes de inspecionar.',
      });
      return;
    }

    setIsInspecting(true);
    setFeedback(null);
    setPendingInspection(null);

    try {
      const inspection = await inspectBackupFromJsonString(rawJsonInput);
      setPendingInspection({
        source: 'code',
        sourceLabel: 'Código JSON colado',
        inspection,
      });
      if (!inspection.canRestore) {
        setFeedback({
          type: 'error',
          message:
            inspection.errors[0] ||
            'O JSON fornecido apresentou erros estruturais ou checksum divergente.',
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: `Falha ao analisar JSON: ${err?.message || 'Erro'}`,
      });
    } finally {
      setIsInspecting(false);
    }
  };

  const handleConfirmRestore = async () => {
    if (!pendingInspection || !pendingInspection.inspection.canRestore || isRestoring) return;
    setIsRestoring(true);
    setFeedback(null);

    try {
      const result = await applyInspectedBackupRestore(pendingInspection.inspection, {
        preserveCurrentStateInStorage: preserveBeforeRestore,
      });

      if (result.success) {
        setFeedback({ type: 'success', message: result.message });
        if (pendingInspection.source === 'code') {
          setRawJsonInput('');
        }
        setPendingInspection(null);
        refreshLocalViews();
        if (onDataRestored) onDataRestored();
      } else {
        setFeedback({
          type: 'error',
          message: result.message,
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: `Erro inesperado na restauração: ${err?.message || 'Erro'}`,
      });
    } finally {
      setIsRestoring(false);
    }
  };

  const handleUndoLastRestore = () => {
    const res = restorePreRestoreRollbackSnapshot();
    if (res.success) {
      setFeedback({
        type: 'success',
        message: 'Estado anterior à última restauração recuperado com sucesso!',
      });
      refreshLocalViews();
      if (onDataRestored) onDataRestored();
    } else {
      setFeedback({
        type: 'error',
        message: res.message,
      });
    }
  };

  const jsonSizeKB = (previewJson.length / 1024).toFixed(1);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="2xl"
      title="Backup e Sincronização em Nuvem"
      subtitle="Sincronize com o Google Drive ou salve e restaure seu progresso localmente"
      icon={<Database className="w-5 h-5" />}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2 w-full">
          <div>
            {hasRollbackSnapshot && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleUndoLastRestore}
                leftIcon={<RotateCcw className="w-3.5 h-3.5 text-amber-700" />}
                className="text-amber-800 border-amber-200 hover:bg-amber-50"
              >
                Reverter última restauração
              </Button>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={onClose}>
            Fechar
          </Button>
        </div>
      }
    >
      <div className="p-5 sm:p-6 space-y-5">
        {/* Current Stats Overview */}
        <div className="bg-[#F6F8F7] border border-slate-200 rounded-xl p-4 space-y-3">
          <div className="text-xs font-semibold text-slate-700 flex flex-wrap items-center justify-between gap-2">
            <span>Status dos Dados Armazenados ({stats.totalModules}/{BACKUP_MODULES_REGISTRY.length} módulos)</span>
            <span className="text-xs font-semibold text-[#006837] font-mono tabular-nums">
              {stats.totalRecordsAllModules} registros · {stats.totalKeys} chaves · {jsonSizeKB} KB
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-center">
              <div className="text-[11px] text-slate-600 flex items-center justify-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[#008542]" aria-hidden="true" />
                <span>Anotações Dias</span>
              </div>
              <div className="text-sm font-bold text-slate-900 mt-0.5 font-mono tabular-nums">
                {stats.scheduleNotesCount}
              </div>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-center">
              <div className="text-[11px] text-slate-600 flex items-center justify-center gap-1">
                <BookOpen className="w-3.5 h-3.5 text-orange-600" aria-hidden="true" />
                <span>Tópicos Edital</span>
              </div>
              <div className="text-sm font-bold text-slate-900 mt-0.5 font-mono tabular-nums">
                {stats.verticalTopicsCount}
              </div>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-center">
              <div className="text-[11px] text-slate-600 flex items-center justify-center gap-1">
                <HelpCircle className="w-3.5 h-3.5 text-amber-700" aria-hidden="true" />
                <span>Caderno Erros</span>
              </div>
              <div className="text-sm font-bold text-slate-900 mt-0.5 font-mono tabular-nums">
                {stats.errorNotebookCount}
              </div>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-center">
              <div className="text-[11px] text-slate-600 flex items-center justify-center gap-1">
                <LinkIcon className="w-3.5 h-3.5 text-[#006837]" aria-hidden="true" />
                <span>Links & Materiais</span>
              </div>
              <div className="text-sm font-bold text-slate-900 mt-0.5 font-mono tabular-nums">
                {stats.materialLinksCount}
              </div>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-center col-span-2 sm:col-span-1">
              <div className="text-[11px] text-slate-600 flex items-center justify-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-sky-700" aria-hidden="true" />
                <span>Registros Foco</span>
              </div>
              <div className="text-sm font-bold text-slate-900 mt-0.5 font-mono tabular-nums">
                {stats.focusLogsCount}
              </div>
            </div>
          </div>
        </div>

        {/* Mode Switcher */}
        <div role="tablist" aria-label="Modo de backup" className="flex border-b border-slate-200">
          <button
            type="button"
            role="tab"
            aria-selected={activeMode === 'drive'}
            onClick={() => setActiveMode('drive')}
            className={`flex-1 py-2.5 text-xs font-semibold border-b-2 flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeMode === 'drive'
                ? 'border-[#008542] text-[#006837] bg-[#E6F4EC]/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Cloud className="w-4 h-4" aria-hidden="true" />
            <span>Google Drive (Nuvem)</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeMode === 'file'}
            onClick={() => setActiveMode('file')}
            className={`flex-1 py-2.5 text-xs font-semibold border-b-2 flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeMode === 'file'
                ? 'border-[#008542] text-[#006837] bg-[#E6F4EC]/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileJson className="w-4 h-4" aria-hidden="true" />
            <span>Arquivo .JSON</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeMode === 'code'}
            onClick={() => setActiveMode('code')}
            className={`flex-1 py-2.5 text-xs font-semibold border-b-2 flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeMode === 'code'
                ? 'border-[#008542] text-[#006837] bg-[#E6F4EC]/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Code2 className="w-4 h-4" aria-hidden="true" />
            <span>Código JSON</span>
          </button>
        </div>

        {/* Feedback */}
        {feedback && (
          <div
            role="alert"
            className={`p-3.5 rounded-xl text-xs flex items-start gap-2.5 border ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                : 'bg-rose-50 text-rose-900 border-rose-200'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" aria-hidden="true" />
            )}
            <div className="leading-relaxed font-medium">{feedback.message}</div>
          </div>
        )}

        {/* Export Progress & Integrity Report */}
        {exportStage && exportStage !== 'completed' && exportStage !== 'error' && (
          <div className="bg-[#E6F4EC]/60 border border-[#008542]/25 rounded-xl p-3 flex items-center gap-2.5 text-xs text-[#071F14] font-medium">
            <Loader2 className="w-4 h-4 animate-spin text-[#008542] shrink-0" aria-hidden="true" />
            <span>{EXPORT_STAGE_LABELS[exportStage]}</span>
          </div>
        )}

        {lastIntegrityReport && activeMode !== 'drive' && (
          <div className="bg-white border border-emerald-200 rounded-xl p-4 space-y-2.5 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2 font-bold text-[#071F14]">
                <ShieldCheck className="w-4 h-4 text-[#008542]" aria-hidden="true" />
                <span>Relatório de Integridade do Backup</span>
              </div>
              <span
                className={`px-2 py-0.5 rounded-md text-[11px] font-bold font-mono ${
                  lastIntegrityReport.complete
                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                    : 'bg-rose-100 text-rose-900 border border-rose-300'
                }`}
              >
                {lastIntegrityReport.complete ? 'COMPLETO' : 'INCOMPLETO'}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
              <div className="bg-[#F6F8F7] rounded-lg p-2 border border-slate-200">
                <div className="text-slate-500">Data/Hora</div>
                <div className="font-mono font-semibold text-slate-900 truncate">
                  {lastExportDate || '-'}
                </div>
              </div>
              <div className="bg-[#F6F8F7] rounded-lg p-2 border border-slate-200">
                <div className="text-slate-500">Módulos / Chaves</div>
                <div className="font-mono font-semibold text-slate-900">
                  {lastIntegrityReport.totalModulesExported}/{lastIntegrityReport.totalModulesIdentified} ·{' '}
                  {lastIntegrityReport.totalKeysExported} chaves
                </div>
              </div>
              <div className="bg-[#F6F8F7] rounded-lg p-2 border border-slate-200">
                <div className="text-slate-500">Registros / Tamanho</div>
                <div className="font-mono font-semibold text-slate-900">
                  {lastIntegrityReport.totalRecords} · {(lastIntegrityReport.sizeBytes / 1024).toFixed(1)} KB
                </div>
              </div>
              <div className="bg-[#F6F8F7] rounded-lg p-2 border border-slate-200">
                <div className="text-slate-500">SHA-256</div>
                <div className="font-mono font-semibold text-[#006837] truncate" title={lastIntegrityReport.sha256}>
                  {lastIntegrityReport.sha256 ? lastIntegrityReport.sha256.slice(0, 16) + '...' : '-'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Two-Step Inspection & Confirmation Panel before Overwriting */}
        {pendingInspection && activeMode !== 'drive' && (
          <div className="bg-white border-2 border-[#008542]/40 rounded-xl p-4 sm:p-5 space-y-3.5 shadow-xs">
            <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-[#006837]">
                  Pré-visualização da Restauração
                </div>
                <h4 className="text-sm font-display font-bold text-slate-900 mt-0.5">
                  {pendingInspection.sourceLabel}
                </h4>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold">
                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-200 font-mono">
                  v{pendingInspection.inspection.detectedVersion}
                  {pendingInspection.inspection.migratedFromLegacy ? ' → v2.3' : ''}
                </span>
                {pendingInspection.inspection.checksumStatus === 'verified' && (
                  <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" /> SHA-256 Verificado
                  </span>
                )}
                {pendingInspection.inspection.checksumStatus === 'mismatch' && (
                  <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-800 border border-rose-200 inline-flex items-center gap-1">
                    <XCircle className="w-3.5 h-3.5" aria-hidden="true" /> Checksum Divergente
                  </span>
                )}
                {pendingInspection.inspection.checksumStatus === 'not_present' && (
                  <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 inline-flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" /> Sem Checksum (Legado)
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="bg-[#F6F8F7] rounded-lg p-2.5 border border-slate-200">
                <div className="text-[11px] text-slate-500">Criado em</div>
                <div className="font-mono font-semibold text-slate-900 truncate">
                  {pendingInspection.inspection.createdAtFormatted}
                </div>
              </div>
              <div className="bg-[#F6F8F7] rounded-lg p-2.5 border border-slate-200">
                <div className="text-[11px] text-slate-500">Chaves detectadas</div>
                <div className="font-mono font-semibold text-slate-900">
                  {pendingInspection.inspection.totalKeys}
                </div>
              </div>
              <div className="bg-[#F6F8F7] rounded-lg p-2.5 border border-slate-200">
                <div className="text-[11px] text-slate-500">Total de registros</div>
                <div className="font-mono font-semibold text-slate-900">
                  {pendingInspection.inspection.totalRecords}
                </div>
              </div>
            </div>

            {pendingInspection.inspection.modulesSummary.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {pendingInspection.inspection.modulesSummary.map((item) => (
                  <span
                    key={item.id}
                    className="px-2 py-1 rounded-md bg-[#E6F4EC]/70 border border-[#008542]/20 text-[11px] text-[#071F14] font-medium"
                  >
                    {item.moduleName}: <strong className="font-mono">{item.count}</strong>
                  </span>
                ))}
              </div>
            )}

            {pendingInspection.inspection.warnings.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-[11px] text-amber-900 space-y-1">
                {pendingInspection.inspection.warnings.map((w, idx) => (
                  <div key={idx} className="flex items-start gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-700" aria-hidden="true" />
                    <span>{w}</span>
                  </div>
                ))}
              </div>
            )}

            {pendingInspection.inspection.errors.length > 0 && (
              <div className="bg-rose-50 border border-rose-200 rounded-lg p-2.5 text-[11px] text-rose-900 space-y-1">
                {pendingInspection.inspection.errors.map((errMsg, idx) => (
                  <div key={idx} className="flex items-start gap-1.5">
                    <XCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-700" aria-hidden="true" />
                    <span>{errMsg}</span>
                  </div>
                ))}
              </div>
            )}

            {pendingInspection.inspection.canRestore && (
              <div className="bg-[#F6F8F7] border border-slate-200 rounded-lg p-3 space-y-2.5">
                <label className="flex items-center gap-2 text-xs text-slate-800 font-medium cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={preserveBeforeRestore}
                    onChange={(e) => setPreserveBeforeRestore(e.target.checked)}
                    className="w-4 h-4 rounded-sm accent-[#008542]"
                  />
                  <span>Salvar cópia automática de segurança do estado atual antes de sobrescrever</span>
                </label>
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExport}
                    isLoading={isExporting}
                    leftIcon={!isExporting ? <Download className="w-3.5 h-3.5" /> : undefined}
                  >
                    Baixar estado atual (.JSON) antes
                  </Button>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isRestoring}
                      onClick={() => setPendingInspection(null)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      id="btn-confirm-restore-backup"
                      variant="primary"
                      size="sm"
                      isLoading={isRestoring}
                      onClick={handleConfirmRestore}
                      leftIcon={!isRestoring ? <CheckCircle2 className="w-3.5 h-3.5" /> : undefined}
                    >
                      {isRestoring ? 'Restaurando...' : 'Confirmar Restauração'}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {!pendingInspection.inspection.canRestore && (
              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={() => setPendingInspection(null)}>
                  Descartar arquivo inválido
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Mode 1: Google Drive Sync */}
        {activeMode === 'drive' && (
          <DriveSyncPanel
            onSyncSuccess={() => {
              refreshLocalViews();
              if (onDataRestored) onDataRestored();
            }}
          />
        )}

        {/* Mode 2: File based Backup / Restore */}
        {activeMode === 'file' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="border border-slate-200 rounded-xl p-5 bg-white space-y-3 flex flex-col justify-between">
              <div className="space-y-1.5">
                <div className="w-9 h-9 rounded-lg bg-[#E6F4EC] text-[#006837] border border-[#008542]/25 flex items-center justify-center">
                  <Download className="w-4 h-4" aria-hidden="true" />
                </div>
                <h4 className="text-sm font-display font-bold text-slate-900">1. Baixar Arquivo Único (.JSON)</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Gera o download automático de <strong>{BACKUP_FILE_NAME}</strong> com 100% dos módulos validados e checksum SHA-256.
                </p>
              </div>
              <div className="space-y-2 pt-2">
                <Button
                  id="btn-modal-export-backup"
                  variant="primary"
                  size="md"
                  isLoading={isExporting}
                  onClick={handleExport}
                  leftIcon={!isExporting ? <Download className="w-4 h-4" /> : undefined}
                  className="w-full"
                >
                  {isExporting ? 'Gerando e Validando...' : 'Baixar Backup (.JSON)'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyClipboard}
                  leftIcon={
                    copied ? (
                      <Check className="w-3.5 h-3.5 text-[#008542]" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                    )
                  }
                  className="w-full"
                >
                  {copied ? 'Copiado para o clipboard' : 'Copiar texto JSON'}
                </Button>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl p-5 bg-white space-y-3 flex flex-col justify-between">
              <div className="space-y-1.5">
                <div className="w-9 h-9 rounded-lg bg-orange-50 text-orange-700 border border-orange-200 flex items-center justify-center">
                  <Upload className="w-4 h-4" aria-hidden="true" />
                </div>
                <h4 className="text-sm font-display font-bold text-slate-900">2. Restaurar de Arquivo</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Inspeciona um arquivo <strong>.json</strong> (v1, v2.2 ou v2.3), valida a integridade e exibe o resumo antes de restaurar.
                </p>
              </div>
              <div className="pt-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileChange}
                  className="hidden"
                  id="input-file-backup"
                />
                <Button
                  id="btn-modal-import-backup"
                  variant="secondary"
                  size="md"
                  isLoading={isInspecting || isRestoring}
                  onClick={() => fileInputRef.current?.click()}
                  leftIcon={!isInspecting && !isRestoring ? <Upload className="w-4 h-4" /> : undefined}
                  className="w-full"
                >
                  {isInspecting
                    ? 'Inspecionando...'
                    : isRestoring
                    ? 'Restaurando...'
                    : 'Selecionar Arquivo JSON'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Mode 3: Raw JSON Text */}
        {activeMode === 'code' && (
          <div className="space-y-4">
            <div className="bg-[#F6F8F7] border border-slate-200 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 font-mono tabular-nums">
                  <Code2 className="w-4 h-4 text-[#008542]" aria-hidden="true" /> JSON Atual ({jsonSizeKB} KB)
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyClipboard}
                  leftIcon={
                    copied ? (
                      <Check className="w-3.5 h-3.5 text-[#008542]" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-slate-600" />
                    )
                  }
                >
                  {copied ? 'Copiado' : 'Copiar tudo'}
                </Button>
              </div>
              <pre className="bg-[#071F14] text-[#FDB913] p-3 rounded-lg text-[11px] font-mono max-h-36 overflow-y-auto overflow-x-auto select-all border border-[#123826]">
                {previewJson}
              </pre>
            </div>

            <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-3">
              <label htmlFor="textarea-restore-json" className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Upload className="w-4 h-4 text-[#008542]" aria-hidden="true" /> Colar Código JSON para Inspecionar e Restaurar
              </label>
              <textarea
                id="textarea-restore-json"
                value={rawJsonInput}
                onChange={(e) => setRawJsonInput(e.target.value)}
                placeholder="Cole aqui o texto JSON de backup copiado anteriormente..."
                rows={4}
                className="w-full p-3 rounded-xl border border-slate-200 bg-[#F6F8F7] focus:bg-white text-xs font-mono text-slate-800 focus:border-[#008542] focus:outline-hidden"
              />
              <Button
                variant="primary"
                size="md"
                isLoading={isInspecting}
                disabled={!rawJsonInput.trim()}
                onClick={handleInspectFromTextInput}
                leftIcon={!isInspecting ? <ShieldCheck className="w-4 h-4" /> : undefined}
                className="w-full"
              >
                {isInspecting ? 'Inspecionando...' : 'Inspecionar e Pré-visualizar Restauração'}
              </Button>
            </div>
          </div>
        )}

        <div className="text-xs text-slate-700 bg-orange-50/70 p-3.5 rounded-xl border border-orange-200 leading-relaxed flex items-start gap-2.5">
          <Sparkles className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" aria-hidden="true" />
          <span>
            <strong>Dica de Segurança:</strong> Todo backup exportado é validado contra o esquema v2.3 e assinado com SHA-256. Em caso de erro durante a restauração, o sistema executa rollback automático sem perda de dados.
          </span>
        </div>
      </div>
    </Modal>
  );
};
