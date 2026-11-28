import React, { useState, useRef, useEffect } from 'react';
import {
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Database,
  FileJson,
  RefreshCw,
  Calendar,
  BookOpen,
  HelpCircle,
  Link as LinkIcon,
  Sparkles,
  Copy,
  Check,
  Code2,
  Cloud
} from 'lucide-react';
import {
  BACKUP_FILE_NAME,
  exportFullBackup,
  importFullBackup,
  getBackupStats,
  BackupStats,
  getBackupJsonString,
  importBackupFromJsonString,
  copyBackupToClipboard
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

export const BackupRestoreModal: React.FC<BackupRestoreModalProps> = ({
  isOpen,
  onClose,
  onDataRestored,
  initialTab = 'drive'
}) => {
  const [activeMode, setActiveMode] = useState<'drive' | 'file' | 'code'>(initialTab);
  const [stats, setStats] = useState<BackupStats>(getBackupStats());
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [rawJsonInput, setRawJsonInput] = useState<string>('');
  const [previewJson, setPreviewJson] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveMode(initialTab);
      setStats(getBackupStats());
      setFeedback(null);
      setCopied(false);
      try {
        setPreviewJson(getBackupJsonString());
      } catch {
        setPreviewJson('');
      }
    }
  }, [isOpen, initialTab]);

  const handleExport = () => {
    try {
      exportFullBackup();
      setFeedback({
        type: 'success',
        message: `Arquivo "${BACKUP_FILE_NAME}" baixado com sucesso! Contém todas as informações do seu estudo.`
      });
      setStats(getBackupStats());
    } catch (e: any) {
      setFeedback({
        type: 'error',
        message: `Falha ao gerar backup: ${e?.message || 'Erro desconhecido'}`
      });
    }
  };

  const handleCopyClipboard = async () => {
    try {
      const success = await copyBackupToClipboard();
      if (success) {
        setCopied(true);
        setFeedback({
          type: 'success',
          message: 'Código JSON completo copiado para a área de transferência.'
        });
        setTimeout(() => setCopied(false), 3000);
      } else {
        setFeedback({
          type: 'error',
          message: 'Não foi possível copiar automaticamente. Use a aba "Código JSON" para copiar manualmente.'
        });
      }
    } catch (e: any) {
      setFeedback({
        type: 'error',
        message: `Erro ao copiar: ${e?.message || 'Permissão negada'}`
      });
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setFeedback(null);

    const result = await importFullBackup(file);
    setIsImporting(false);

    if (result.success) {
      setFeedback({ type: 'success', message: result.message });
      if (result.stats) setStats(result.stats);
      setPreviewJson(getBackupJsonString());
      if (onDataRestored) onDataRestored();
    } else {
      setFeedback({ type: 'error', message: result.message });
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRestoreFromTextInput = () => {
    if (!rawJsonInput.trim()) {
      setFeedback({
        type: 'error',
        message: 'Por favor, cole o texto JSON antes de clicar em restaurar.'
      });
      return;
    }

    setIsImporting(true);
    setFeedback(null);

    const result = importBackupFromJsonString(rawJsonInput);
    setIsImporting(false);

    if (result.success) {
      setFeedback({ type: 'success', message: result.message });
      if (result.stats) setStats(result.stats);
      setPreviewJson(getBackupJsonString());
      setRawJsonInput('');
      if (onDataRestored) onDataRestored();
    } else {
      setFeedback({ type: 'error', message: result.message });
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
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>
            Fechar
          </Button>
        </div>
      }
    >
      <div className="p-5 sm:p-6 space-y-5">
        {/* Current Stats Overview */}
        <div className="bg-[#F6F8F7] border border-slate-200 rounded-xl p-4 space-y-3">
          <div className="text-xs font-semibold text-slate-700 flex items-center justify-between">
            <span>Status dos Dados Armazenados</span>
            <span className="text-xs font-semibold text-[#006837] font-mono tabular-nums">
              {stats.totalItems} registros · {jsonSizeKB} KB
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-center">
              <div className="text-[11px] text-slate-600 flex items-center justify-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[#008542]" aria-hidden="true" />
                <span>Sessões Feitas</span>
              </div>
              <div className="text-sm font-bold text-slate-900 mt-0.5 font-mono tabular-nums">
                {stats.completedDaysCount}
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

        {/* Mode 1: Google Drive Sync */}
        {activeMode === 'drive' && (
          <DriveSyncPanel
            onSyncSuccess={() => {
              setStats(getBackupStats());
              setPreviewJson(getBackupJsonString());
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
                  Gera o download automático de <strong>{BACKUP_FILE_NAME}</strong> com 100% dos seus dados reunidos.
                </p>
              </div>
              <div className="space-y-2 pt-2">
                <Button
                  id="btn-modal-export-backup"
                  variant="primary"
                  size="md"
                  onClick={handleExport}
                  leftIcon={<Download className="w-4 h-4" />}
                  className="w-full"
                >
                  Baixar Backup (.JSON)
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
                  Carregue um arquivo <strong>.json</strong> salvo anteriormente para restaurar 100% dos dados.
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
                  isLoading={isImporting}
                  onClick={() => fileInputRef.current?.click()}
                  leftIcon={!isImporting ? <Upload className="w-4 h-4" /> : undefined}
                  className="w-full"
                >
                  {isImporting ? 'Restaurando...' : 'Selecionar Arquivo JSON'}
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
                <Upload className="w-4 h-4 text-[#008542]" aria-hidden="true" /> Colar Código JSON para Restaurar
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
                isLoading={isImporting}
                disabled={!rawJsonInput.trim()}
                onClick={handleRestoreFromTextInput}
                leftIcon={!isImporting ? <CheckCircle2 className="w-4 h-4" /> : undefined}
                className="w-full"
              >
                Aplicar e Restaurar deste JSON
              </Button>
            </div>
          </div>
        )}

        <div className="text-xs text-slate-700 bg-orange-50/70 p-3.5 rounded-xl border border-orange-200 leading-relaxed flex items-start gap-2.5">
          <Sparkles className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" aria-hidden="true" />
          <span>
            <strong>Dica de Segurança:</strong> Seus dados de cronograma, caderno de erros, anotações e links ficam salvos com segurança no seu navegador.
          </span>
        </div>
      </div>
    </Modal>
  );
};
