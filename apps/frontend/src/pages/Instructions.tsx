import { useState } from 'react';
import { InstructionService, type DisasterInstruction } from '../services/InstructionService';

export function Instructions() {
  const instructions = InstructionService.getInstructions();
  const [selectedCategory, setSelectedCategory] = useState<DisasterInstruction['category']>('STRUCTURAL_COLLAPSE');

  const currentInstruction = instructions.find(i => i.category === selectedCategory) || instructions[0];

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-10">
      {/* Header & Offline Provenance Indicator */}
      <div className="flex flex-wrap justify-between items-center gap-2">
        <div>
          <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <span>📖</span> Emergency Survival Protocols
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Disaster-specific tactical instructions pre-cached on device for offline emergency response
          </p>
        </div>

        <div className="flex items-center space-x-2 font-mono text-xs">
          <span className="px-2.5 py-1 rounded-full font-bold border bg-amber-50 text-amber-800 border-amber-300 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            LOCAL CACHED INFORMATION (100% OFFLINE)
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
              className={`p-3 rounded-xl border text-center transition flex flex-col items-center justify-center space-y-1 ${
                isSelected
                  ? 'border-red-600 bg-red-50 text-red-900 ring-2 ring-red-300 font-bold shadow-sm'
                  : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span className="text-xl">{inst.icon}</span>
              <span className="text-xs font-sans leading-tight">{inst.title.split('/')[0]}</span>
            </button>
          );
        })}
      </div>

      {/* Active Disaster Protocol Card */}
      {currentInstruction && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-md space-y-5">
          <div className="flex justify-between items-start border-b pb-4">
            <div className="flex items-center space-x-3">
              <span className="text-3xl">{currentInstruction.icon}</span>
              <div>
                <h3 className="text-lg font-black text-gray-900">{currentInstruction.title}</h3>
                <span className="text-xs text-gray-500 font-mono">CATEGORY: {currentInstruction.category}</span>
              </div>
            </div>
            <span className={`px-2.5 py-1 rounded font-mono font-bold text-xs ${
              currentInstruction.urgency === 'CRITICAL' ? 'bg-red-600 text-white' : 'bg-orange-500 text-white'
            }`}>
              {currentInstruction.urgency} PRIORITY
            </span>
          </div>

          {/* Action Steps */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
              <span>⚡</span> Step-by-Step Survival Actions:
            </h4>
            <div className="space-y-2">
              {currentInstruction.steps.map((step, idx) => (
                <div key={idx} className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-800 flex items-start space-x-3">
                  <span className="font-mono font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded shrink-0">
                    0{idx + 1}
                  </span>
                  <span className="leading-relaxed font-sans">{step}</span>
                </div>
              ))}
            </div>
          </div>

          {/* DO NOT Warnings */}
          <div className="p-4 bg-red-50 rounded-xl border border-red-200 space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-red-800 flex items-center gap-1.5">
              <span>🚫</span> Critical Warnings (DO NOT):
            </h4>
            <ul className="space-y-1.5 text-xs text-red-700 font-sans">
              {currentInstruction.doNotList.map((warning, idx) => (
                <li key={idx} className="flex items-start space-x-2">
                  <span className="font-bold">•</span>
                  <span>{warning}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Tactical Tips (Signalling & Mesh) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t text-xs font-sans">
            <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200 space-y-1">
              <span className="font-bold text-blue-900 block">📣 Rescue Signalling Tip:</span>
              <p className="text-blue-800 text-[11px] leading-relaxed">{currentInstruction.signallingTips}</p>
            </div>

            <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-200 space-y-1">
              <span className="font-bold text-purple-900 block">📶 Mesh Network Advantage:</span>
              <p className="text-purple-800 text-[11px] leading-relaxed">{currentInstruction.meshTips}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
