import React, { useState, useEffect } from 'react';
import { Calculator, Sparkles } from 'lucide-react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';

interface FormulaCalculatorModalProps {
  isOpen: boolean;
  initialFormulaNome?: string;
  onClose: () => void;
}

type CalculatorType =
  | 'escalas_temp'
  | 'hidrostatica'
  | 'reynolds'
  | 'gases_ideais'
  | 'concentracao'
  | 'energia_mecanica'
  | 'ohm_potencia';

const FORMULA_TABS: { id: CalculatorType; label: string }[] = [
  { id: 'escalas_temp', label: 'Escalas Térmicas' },
  { id: 'hidrostatica', label: 'Hidrostática (Stevin)' },
  { id: 'reynolds', label: 'Número de Reynolds' },
  { id: 'gases_ideais', label: 'Gases (PV = nRT)' },
  { id: 'concentracao', label: 'Molaridade & Diluição' },
  { id: 'energia_mecanica', label: 'Energia Mecânica' },
  { id: 'ohm_potencia', label: 'Lei de Ohm & Potência' },
];

export const FormulaCalculatorModal: React.FC<FormulaCalculatorModalProps> = ({
  isOpen,
  initialFormulaNome,
  onClose
}) => {
  const [calcType, setCalcType] = useState<CalculatorType>('escalas_temp');

  // Escalas térmicas
  const [tempCelsius, setTempCelsius] = useState<number>(25);

  // Hidrostática
  const [hidPatm, setHidPatm] = useState<number>(101325);
  const [hidRho, setHidRho] = useState<number>(850);
  const [hidG, setHidG] = useState<number>(9.81);
  const [hidH, setHidH] = useState<number>(10);

  // Reynolds
  const [reyRho, setReyRho] = useState<number>(850);
  const [reyV, setReyV] = useState<number>(2);
  const [reyD, setReyD] = useState<number>(0.2);
  const [reyMu, setReyMu] = useState<number>(0.01);

  // Gases ideais
  const [gasN, setGasN] = useState<number>(2);
  const [gasT, setGasT] = useState<number>(27);
  const [gasV, setGasV] = useState<number>(10);

  // Concentração
  const [concMassa, setConcMassa] = useState<number>(40);
  const [concMM, setConcMM] = useState<number>(40);
  const [concVol, setConcVol] = useState<number>(2);

  // Energia Mecânica
  const [emMassa, setEmMassa] = useState<number>(10);
  const [emVel, setEmVel] = useState<number>(4);
  const [emAlt, setEmAlt] = useState<number>(5);

  // Ohm e Potência
  const [ohmU, setOhmU] = useState<number>(220);
  const [ohmR, setOhmR] = useState<number>(44);

  useEffect(() => {
    if (initialFormulaNome) {
      const lower = initialFormulaNome.toLowerCase();
      if (lower.includes('temperatura') || lower.includes('escala')) setCalcType('escalas_temp');
      else if (lower.includes('stevin') || lower.includes('hidrost')) setCalcType('hidrostatica');
      else if (lower.includes('reynolds')) setCalcType('reynolds');
      else if (lower.includes('gases') || lower.includes('clapeyron')) setCalcType('gases_ideais');
      else if (lower.includes('molar') || lower.includes('dilui') || lower.includes('concentra')) setCalcType('concentracao');
      else if (lower.includes('energia')) setCalcType('energia_mecanica');
      else if (lower.includes('ohm') || lower.includes('potência')) setCalcType('ohm_potencia');
    }
  }, [initialFormulaNome]);

  const inputClass =
    'w-full px-3 py-2 bg-[#F6F8F7] border border-slate-200 rounded-xl text-sm font-mono tabular-nums font-bold text-slate-900 focus:bg-white focus:border-[#008542] focus:outline-hidden transition-colors';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="2xl"
      title="Calculadora Técnica de Fórmulas"
      subtitle="Simulador interativo das equações de Dutos & Terminais e Operação"
      icon={<Calculator className="w-5 h-5" />}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-slate-600">
            Dica de prova: confira sempre se temperatura está em Kelvin (K) e unidades no SI.
          </span>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Fechar Calculadora
          </Button>
        </div>
      }
    >
      {/* Formula Selector Tabs */}
      <div
        role="tablist"
        aria-label="Selecionar fórmula"
        className="bg-[#F6F8F7] px-5 py-3 border-b border-slate-200 overflow-x-auto flex items-center gap-1.5 scrollbar-none"
      >
        {FORMULA_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={calcType === tab.id}
            onClick={() => setCalcType(tab.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
              calcType === tab.id
                ? 'bg-[#071F14] text-[#FDB913] border-b-2 border-orange-500 shadow-2xs'
                : 'bg-white text-slate-700 hover:bg-[#EFF4F1] border border-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Modal Body */}
      <div className="p-5 sm:p-6 space-y-5">
        {calcType === 'escalas_temp' && (() => {
          const kelvin = tempCelsius + 273.15;
          const fahr = tempCelsius * 1.8 + 32;
          return (
            <div className="space-y-5">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-800 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-slate-900">
                  <Sparkles className="w-4 h-4 text-[#008542]" aria-hidden="true" />
                  <span>Fórmulas: T(K) = T(°C) + 273,15 | T(°F) = 1,8 · T(°C) + 32</span>
                </div>
                <p className="text-slate-600">Conversão direta entre as escalas Celsius, Fahrenheit e Kelvin (Petrobras PB-B2.08).</p>
              </div>
              <div>
                <label htmlFor="calc-temp-c" className="block text-xs font-semibold text-slate-700 mb-1">
                  Temperatura em Celsius (°C)
                </label>
                <input id="calc-temp-c" type="number" value={tempCelsius} onChange={e => setTempCelsius(Number(e.target.value))} className={inputClass} />
              </div>
              <div className="bg-[#071F14] text-white rounded-xl p-5 space-y-3 border border-[#123826]">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono tabular-nums">
                  <div className="bg-[#05160E] p-3.5 rounded-lg border border-[#133B28]">
                    <div className="text-[11px] text-slate-400">Kelvin (SI)</div>
                    <div className="text-xl font-bold text-[#FDB913]">{kelvin.toFixed(2)} K</div>
                  </div>
                  <div className="bg-[#05160E] p-3.5 rounded-lg border border-[#133B28]">
                    <div className="text-[11px] text-slate-400">Fahrenheit</div>
                    <div className="text-xl font-bold text-orange-400">{fahr.toFixed(2)} °F</div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {calcType === 'hidrostatica' && (() => {
          const pMan = hidRho * hidG * hidH;
          const pAbs = hidPatm + pMan;
          return (
            <div className="space-y-5">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-800 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-slate-900">
                  <Sparkles className="w-4 h-4 text-[#008542]" aria-hidden="true" />
                  <span>Teorema de Stevin: P_abs = P_atm + ρ · g · h</span>
                </div>
                <p className="text-slate-600">Calcula a pressão hidrostática manométrica e absoluta no fundo de tanques ou dutos.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label htmlFor="calc-hid-patm" className="block text-xs font-semibold text-slate-700 mb-1">P_atm (Pa)</label>
                  <input id="calc-hid-patm" type="number" value={hidPatm} onChange={e => setHidPatm(Number(e.target.value))} className={inputClass} />
                </div>
                <div>
                  <label htmlFor="calc-hid-rho" className="block text-xs font-semibold text-slate-700 mb-1">Densidade ρ (kg/m³)</label>
                  <input id="calc-hid-rho" type="number" value={hidRho} onChange={e => setHidRho(Number(e.target.value))} className={inputClass} />
                </div>
                <div>
                  <label htmlFor="calc-hid-g" className="block text-xs font-semibold text-slate-700 mb-1">Gravidade g (m/s²)</label>
                  <input id="calc-hid-g" type="number" step="0.01" value={hidG} onChange={e => setHidG(Number(e.target.value))} className={inputClass} />
                </div>
                <div>
                  <label htmlFor="calc-hid-h" className="block text-xs font-semibold text-slate-700 mb-1">Altura h (m)</label>
                  <input id="calc-hid-h" type="number" value={hidH} onChange={e => setHidH(Number(e.target.value))} className={inputClass} />
                </div>
              </div>
              <div className="bg-[#071F14] text-white rounded-xl p-5 space-y-2 border border-[#123826] font-mono tabular-nums text-xs">
                <div>Pressão Manométrica (ρ·g·h): <strong className="text-orange-400">{(pMan / 1000).toFixed(2)} kPa</strong></div>
                <div className="text-base pt-2 border-t border-[#133B28] flex justify-between items-center">
                  <span>Pressão Absoluta Total:</span>
                  <strong className="text-xl text-[#FDB913]">{(pAbs / 1000).toFixed(2)} kPa ({(pAbs / 101325).toFixed(2)} atm)</strong>
                </div>
              </div>
            </div>
          );
        })()}

        {calcType === 'reynolds' && (() => {
          const re = reyMu > 0 ? (reyRho * reyV * reyD) / reyMu : 0;
          const regime = re < 2000 ? 'Laminar (Re < 2000)' : re <= 4000 ? 'Transição (2000–4000)' : 'Turbulento (Re > 4000)';
          return (
            <div className="space-y-5">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-800 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-slate-900">
                  <Sparkles className="w-4 h-4 text-[#008542]" aria-hidden="true" />
                  <span>Número de Reynolds: Re = (ρ · v · D) / μ</span>
                </div>
                <p className="text-slate-600">Classifica o regime de escoamento interno em tubulações e dutos (laminar, transição ou turbulento).</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label htmlFor="calc-rey-rho" className="block text-xs font-semibold text-slate-700 mb-1">ρ (kg/m³)</label>
                  <input id="calc-rey-rho" type="number" value={reyRho} onChange={e => setReyRho(Number(e.target.value))} className={inputClass} />
                </div>
                <div>
                  <label htmlFor="calc-rey-v" className="block text-xs font-semibold text-slate-700 mb-1">Velocidade v (m/s)</label>
                  <input id="calc-rey-v" type="number" step="0.1" value={reyV} onChange={e => setReyV(Number(e.target.value))} className={inputClass} />
                </div>
                <div>
                  <label htmlFor="calc-rey-d" className="block text-xs font-semibold text-slate-700 mb-1">Diâmetro D (m)</label>
                  <input id="calc-rey-d" type="number" step="0.01" value={reyD} onChange={e => setReyD(Number(e.target.value))} className={inputClass} />
                </div>
                <div>
                  <label htmlFor="calc-rey-mu" className="block text-xs font-semibold text-slate-700 mb-1">Viscosidade μ (Pa·s)</label>
                  <input id="calc-rey-mu" type="number" step="0.001" value={reyMu} onChange={e => setReyMu(Number(e.target.value))} className={inputClass} />
                </div>
              </div>
              <div className="bg-[#071F14] text-white rounded-xl p-5 space-y-2 border border-[#123826] font-mono tabular-nums text-xs">
                <div className="flex justify-between items-center text-sm">
                  <span>Número de Reynolds (adimensional):</span>
                  <strong className="text-2xl text-[#FDB913]">{Math.round(re).toLocaleString('pt-BR')}</strong>
                </div>
                <div className="pt-2 border-t border-[#133B28] text-orange-300 font-bold">
                  Regime de Escoamento: {regime}
                </div>
              </div>
            </div>
          );
        })()}

        {calcType === 'gases_ideais' && (() => {
          const tempK = gasT + 273.15;
          const R = 0.082;
          const pAtm = gasV > 0 ? (gasN * R * tempK) / gasV : 0;
          return (
            <div className="space-y-5">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-800 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-slate-900">
                  <Sparkles className="w-4 h-4 text-[#008542]" aria-hidden="true" />
                  <span>Equação de Clapeyron: P · V = n · R · T (R = 0,082 atm·L/mol·K)</span>
                </div>
                <p className="text-slate-600">Calcula a pressão do gás convertendo automaticamente °C para Kelvin.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="calc-gas-n" className="block text-xs font-semibold text-slate-700 mb-1">Mols (n)</label>
                  <input id="calc-gas-n" type="number" value={gasN} onChange={e => setGasN(Number(e.target.value))} className={inputClass} />
                </div>
                <div>
                  <label htmlFor="calc-gas-t" className="block text-xs font-semibold text-slate-700 mb-1">Temperatura (°C)</label>
                  <input id="calc-gas-t" type="number" value={gasT} onChange={e => setGasT(Number(e.target.value))} className={inputClass} />
                </div>
                <div>
                  <label htmlFor="calc-gas-v" className="block text-xs font-semibold text-slate-700 mb-1">Volume (Litros)</label>
                  <input id="calc-gas-v" type="number" value={gasV} onChange={e => setGasV(Number(e.target.value))} className={inputClass} />
                </div>
              </div>
              <div className="bg-[#071F14] text-white rounded-xl p-5 space-y-2 border border-[#123826] font-mono tabular-nums text-xs">
                <div>Temperatura Absoluta: <strong className="text-orange-300">{tempK.toFixed(2)} K</strong></div>
                <div className="pt-2 border-t border-[#133B28] flex justify-between items-center text-sm">
                  <span>Pressão Resultante (P):</span>
                  <strong className="text-2xl text-[#FDB913]">{pAtm.toFixed(2)} atm ({(pAtm * 101.325).toFixed(1)} kPa)</strong>
                </div>
              </div>
            </div>
          );
        })()}

        {calcType === 'concentracao' && (() => {
          const mols = concMM > 0 ? concMassa / concMM : 0;
          const molaridade = concVol > 0 ? mols / concVol : 0;
          const concComum = concVol > 0 ? concMassa / concVol : 0;
          return (
            <div className="space-y-5">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-800 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-slate-900">
                  <Sparkles className="w-4 h-4 text-[#008542]" aria-hidden="true" />
                  <span>Concentração Comum (g/L) e Molaridade (mol/L)</span>
                </div>
                <p className="text-slate-600">C = m / V e M = m / (MM · V).</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="calc-conc-m" className="block text-xs font-semibold text-slate-700 mb-1">Massa Soluto (g)</label>
                  <input id="calc-conc-m" type="number" value={concMassa} onChange={e => setConcMassa(Number(e.target.value))} className={inputClass} />
                </div>
                <div>
                  <label htmlFor="calc-conc-mm" className="block text-xs font-semibold text-slate-700 mb-1">Massa Molar (g/mol)</label>
                  <input id="calc-conc-mm" type="number" value={concMM} onChange={e => setConcMM(Number(e.target.value))} className={inputClass} />
                </div>
                <div>
                  <label htmlFor="calc-conc-v" className="block text-xs font-semibold text-slate-700 mb-1">Volume Solução (L)</label>
                  <input id="calc-conc-v" type="number" step="0.1" value={concVol} onChange={e => setConcVol(Number(e.target.value))} className={inputClass} />
                </div>
              </div>
              <div className="bg-[#071F14] text-white rounded-xl p-5 space-y-2 border border-[#123826] font-mono tabular-nums text-xs">
                <div>Concentração Comum (C): <strong className="text-orange-300">{concComum.toFixed(2)} g/L</strong></div>
                <div className="pt-2 border-t border-[#133B28] flex justify-between items-center text-sm">
                  <span>Molaridade (M):</span>
                  <strong className="text-2xl text-[#FDB913]">{molaridade.toFixed(3)} mol/L</strong>
                </div>
              </div>
            </div>
          );
        })()}

        {calcType === 'energia_mecanica' && (() => {
          const ec = 0.5 * emMassa * emVel * emVel;
          const ep = emMassa * 9.81 * emAlt;
          const emTotal = ec + ep;
          return (
            <div className="space-y-5">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-800 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-slate-900">
                  <Sparkles className="w-4 h-4 text-[#008542]" aria-hidden="true" />
                  <span>Conservação da Energia Mecânica: Em = ½mv² + mgh</span>
                </div>
                <p className="text-slate-600">Calcula energia cinética, potencial gravitacional e mecânica total (g = 9,81 m/s²).</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="calc-em-m" className="block text-xs font-semibold text-slate-700 mb-1">Massa (kg)</label>
                  <input id="calc-em-m" type="number" value={emMassa} onChange={e => setEmMassa(Number(e.target.value))} className={inputClass} />
                </div>
                <div>
                  <label htmlFor="calc-em-v" className="block text-xs font-semibold text-slate-700 mb-1">Velocidade (m/s)</label>
                  <input id="calc-em-v" type="number" value={emVel} onChange={e => setEmVel(Number(e.target.value))} className={inputClass} />
                </div>
                <div>
                  <label htmlFor="calc-em-h" className="block text-xs font-semibold text-slate-700 mb-1">Altura (m)</label>
                  <input id="calc-em-h" type="number" value={emAlt} onChange={e => setEmAlt(Number(e.target.value))} className={inputClass} />
                </div>
              </div>
              <div className="bg-[#071F14] text-white rounded-xl p-5 space-y-2 border border-[#123826] font-mono tabular-nums text-xs">
                <div>Energia Cinética (Ec): <strong className="text-orange-300">{ec.toFixed(2)} J</strong> · Potencial (Ep): <strong className="text-emerald-300">{ep.toFixed(2)} J</strong></div>
                <div className="pt-2 border-t border-[#133B28] flex justify-between items-center text-sm">
                  <span>Energia Mecânica Total (Em):</span>
                  <strong className="text-2xl text-[#FDB913]">{emTotal.toFixed(2)} J</strong>
                </div>
              </div>
            </div>
          );
        })()}

        {calcType === 'ohm_potencia' && (() => {
          const corrente = ohmR > 0 ? ohmU / ohmR : 0;
          const potencia = ohmU * corrente;
          return (
            <div className="space-y-5">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-800 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-slate-900">
                  <Sparkles className="w-4 h-4 text-[#008542]" aria-hidden="true" />
                  <span>1ª Lei de Ohm &amp; Potência: U = R · i | P = U · i</span>
                </div>
                <p className="text-slate-600">Dimensionamento rápido de corrente e potência dissipada por efeito Joule.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="calc-ohm-u" className="block text-xs font-semibold text-slate-700 mb-1">Tensão U (Volts)</label>
                  <input id="calc-ohm-u" type="number" value={ohmU} onChange={e => setOhmU(Number(e.target.value))} className={inputClass} />
                </div>
                <div>
                  <label htmlFor="calc-ohm-r" className="block text-xs font-semibold text-slate-700 mb-1">Resistência R (Ohms)</label>
                  <input id="calc-ohm-r" type="number" value={ohmR} onChange={e => setOhmR(Number(e.target.value))} className={inputClass} />
                </div>
              </div>
              <div className="bg-[#071F14] text-white rounded-xl p-5 space-y-2 border border-[#123826] font-mono tabular-nums text-xs">
                <div>Corrente Elétrica (i = U/R): <strong className="text-orange-300">{corrente.toFixed(2)} A</strong></div>
                <div className="pt-2 border-t border-[#133B28] flex justify-between items-center text-sm">
                  <span>Potência Elétrica (P):</span>
                  <strong className="text-2xl text-[#FDB913]">{potencia.toFixed(1)} W ({(potencia / 1000).toFixed(2)} kW)</strong>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </Modal>
  );
};
