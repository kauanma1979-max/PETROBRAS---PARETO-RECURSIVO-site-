import React, { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showManualGuide, setShowManualGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        id="btn-install-pwa"
        type="button"
        onClick={install}
        title="Instalar aplicativo na tela inicial do celular ou computador"
        className="h-9 px-3 rounded-lg bg-[#05160E] hover:bg-[#113825] text-[#FDB913] border border-[#1F5A3D] transition-colors text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
      >
        <Download className="w-3.5 h-3.5" aria-hidden="true" />
        <span className="hidden sm:inline">Instalar App</span>
      </button>
    );
  }

  return (
    <>
      <button
        id="btn-install-pwa-guide"
        type="button"
        onClick={() => setShowManualGuide(true)}
        title="Como instalar no celular (Android/iPhone) ou computador"
        className="h-9 px-3 rounded-lg bg-[#05160E] hover:bg-[#113825] text-slate-200 border border-[#1F5A3D] transition-colors text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
      >
        <Smartphone className="w-3.5 h-3.5 text-[#FDB913]" aria-hidden="true" />
        <span className="hidden lg:inline">App Celular/PC</span>
      </button>

      {showManualGuide && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-guide-title"
        >
          <div className="w-full max-w-md rounded-2xl bg-white text-slate-900 border border-slate-200 p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 id="pwa-guide-title" className="text-base font-display font-bold text-slate-900">
                  Instalar no Celular ou Computador
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Use como aplicativo na tela inicial e acesse mesmo sem internet.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowManualGuide(false)}
                aria-label="Fechar instruções"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-700 leading-relaxed">
              {isIOS ? (
                <div className="bg-[#F6F8F7] p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                  <div className="font-bold text-[#006837]">No iPhone / iPad (Safari):</div>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Toque no ícone <strong>Compartilhar</strong> na barra do Safari.</li>
                    <li>Role para baixo e toque em <strong>Adicionar à Tela de Início</strong>.</li>
                    <li>Confirme em <strong>Adicionar</strong>.</li>
                  </ol>
                </div>
              ) : (
                <>
                  <div className="bg-[#F6F8F7] p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                    <div className="font-bold text-[#006837]">No Android (Chrome / Edge):</div>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Toque no menu <strong>⋮</strong> (canto superior direito).</li>
                      <li>Selecione <strong>Adicionar à tela inicial</strong> ou <strong>Instalar aplicativo</strong>.</li>
                    </ol>
                  </div>
                  <div className="bg-[#F6F8F7] p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                    <div className="font-bold text-slate-900">No iPhone (Safari):</div>
                    <p>Toque em <strong>Compartilhar → Adicionar à Tela de Início</strong>.</p>
                  </div>
                  <div className="bg-[#F6F8F7] p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                    <div className="font-bold text-slate-900">No Computador (Chrome / Edge):</div>
                    <p>Clique no ícone de <strong>Instalar</strong> na barra de endereço ou em <strong>Menu → Salvar e compartilhar → Instalar página como app</strong>.</p>
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => setShowManualGuide(false)}
                className="px-4 py-2 rounded-xl bg-[#008542] hover:bg-[#006837] text-white text-xs font-semibold cursor-pointer"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
