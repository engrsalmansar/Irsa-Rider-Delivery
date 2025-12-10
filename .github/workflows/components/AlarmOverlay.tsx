import React from 'react';
import { BellOff, ArrowDownCircle } from 'lucide-react';

interface AlarmOverlayProps {
  onStop: () => void;
}

export const AlarmOverlay: React.FC<AlarmOverlayProps> = ({ onStop }) => {
  return (
    <div className="fixed inset-0 bg-red-600/90 z-[60] flex flex-col items-center justify-center animate-pulse p-6">
      <div className="bg-white rounded-2xl p-8 shadow-2xl flex flex-col items-center max-w-sm w-full text-center space-y-6">
        <div className="bg-red-100 p-4 rounded-full">
          <BellOff size={48} className="text-red-600" />
        </div>
        
        <div>
          <h2 className="text-3xl font-black text-slate-900 mb-2">NEW ORDER!</h2>
          <p className="text-slate-600">A new delivery request has arrived.</p>
        </div>

        <button 
          onClick={onStop}
          className="w-full bg-red-600 hover:bg-red-700 text-white text-xl font-bold py-4 px-6 rounded-xl shadow-lg transform transition active:scale-95 flex items-center justify-center gap-2"
        >
          <BellOff size={24} />
          SILENCE ALARM
        </button>

        <p className="text-xs text-slate-400">
          Click above to stop sound, then Accept/Decline below.
        </p>
      </div>
    </div>
  );
};