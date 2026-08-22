import { useState } from 'react';
import { InstructionService, type DisasterInstruction } from '../services/InstructionService';
import { 
  BookOpenIcon, 
  AlertTriangleIcon, 
  RadioIcon 
} from '../components/Icons';

export function Instructions() {
  const instructions = InstructionService.getInstructions();
  const [selectedCategory, setSelectedCategory] = useState<DisasterInstruction['category']>('STRUCTURAL_COLLAPSE');

  const currentInstruction = instructions.find(i => i.category === selectedCategory) || instructions[0];

  return (
    <div className="space-y-4 max-w-3xl mx-auto pb-8">
      {/* Header & Offline Provenance Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-1.5 rounded-lg bg-cyan-950/80 border border-cyan-800/80 text-cyan-400">
              <BookOpenIcon size={18} />
            </span>
            <h1 className="text-xl font-black text-white tracking-tight">Survival Instructions</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Actionable disaster-specific emergency protocols cached offline on device.
          </p>
        </div>

        <div className="self-start sm:self-auto font-mono text-[11px]">
          <span className="px-2.5 py-1 rounded-full font-bold border bg-emerald-950/80 text-emerald-300 border-emerald-800/80 flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>100% OFFLINE CACHED</span>
          </span>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {instructions.map((inst) => {
          const isSelected = selectedCategory === inst.category;
          return (
            <button
              key={inst.id}
              onClick={() => setSelectedCategory(inst.category)}
              className={`p-3 rounded-2xl border text-center transition flex flex-col items-center justify-center space-y-1 ${
                isSelected
                  ? 'border-red-500/80 bg-red-950/40 text-white ring-2 ring-red-500/30 font-bold shadow-md'
                  : 'border-slate-800 bg-slate-900/90 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <span className="text-xl">{inst.icon}</span>
              <span className="text-xs leading-tight mt-1">{inst.title.split('/')[0]}</span>
            </button>
          );
        })}
      </div>

      {/* Active Disaster Protocol Card */}
      {currentInstruction && (
        <div className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 shadow-xl space-y-5">
          <div className="flex justify-between items-start border-b border-slate-800/80 pb-4">
            <div className="flex items-center space-x-3">
              <span className="text-3xl">{currentInstruction.icon}</span>
              <div>
                <h2 className="text-lg font-black text-white">{currentInstruction.title}</h2>
                <span className="text-[11px] text-slate-400 font-mono">CATEGORY: {currentInstruction.category}</span>
              </div>
            </div>
            <span className={`px-2.5 py-1 rounded font-mono font-bold text-xs uppercase ${
              currentInstruction.urgency === 'CRITICAL' 
                ? 'bg-red-950/80 text-red-300 border border-red-800' 
                : 'bg-orange-950/80 text-orange-300 border border-orange-800'
            }`}>
              {currentInstruction.urgency} PRIORITY
            </span>
          </div>

          {/* Action Steps */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center space-x-1.5">
              <span>⚡</span>
              <span>Step-by-Step Survival Actions</span>
            </h3>
            <div className="space-y-2">
              {currentInstruction.steps.map((step, idx) => (
                <div key={idx} className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-xs text-slate-200 flex items-start space-x-3">
                  <span className="font-mono font-bold text-red-400 bg-red-950/80 border border-red-900/80 px-2 py-0.5 rounded shrink-0">
                    0{idx + 1}
                  </span>
                  <span className="leading-relaxed">{step}</span>
                </div>
              ))}
            </div>
          </div>

          {/* DO NOT Warnings */}
          <div className="p-4 bg-red-950/30 rounded-xl border border-red-900/60 space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-red-400 flex items-center space-x-1.5">
              <AlertTriangleIcon size={14} />
              <span>Critical Warnings (DO NOT)</span>
            </h3>
            <ul className="space-y-1.5 text-xs text-red-200">
              {currentInstruction.doNotList.map((warning, idx) => (
                <li key={idx} className="flex items-start space-x-2">
                  <span className="font-bold text-red-500">•</span>
                  <span>{warning}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Tactical Tips (Signalling & Mesh) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800/80 text-xs">
            <div className="p-3 bg-cyan-950/20 rounded-xl border border-cyan-900/50 space-y-1">
              <span className="font-bold text-cyan-300 block">📣 Rescue Signalling Tip:</span>
              <p className="text-slate-300 text-[11px] leading-relaxed">{currentInstruction.signallingTips}</p>
            </div>

            <div className="p-3 bg-purple-950/20 rounded-xl border border-purple-900/50 space-y-1">
              <span className="font-bold text-purple-300 block flex items-center space-x-1">
                <RadioIcon size={12} />
                <span>Mesh Network Advantage:</span>
              </span>
              <p className="text-slate-300 text-[11px] leading-relaxed">{currentInstruction.meshTips}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
