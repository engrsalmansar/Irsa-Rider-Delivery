import React from 'react';
import { Play } from 'lucide-react';

interface StartScreenProps {
  onStart: () => void;
}

export const StartScreen: React.FC<StartScreenProps> = ({ onStart }) => {
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h1 className="text-4xl font-black text-white mb-2">Irsa Kitchen</h1>
          <p className="text-slate-400 text-lg">Rider Alert System</p>
        </div>

        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
          <p className="text-slate-300 mb-6">
            This app needs permission to play sounds and send notifications when new orders arrive.
          </p>
          
          <button
            onClick={onStart}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 px-6 rounded-xl shadow-lg transition flex items-center justify-center gap-3 text-lg"
          >
            <Play fill="currentColor" />
            GO ONLINE
          </button>
        </div>
        
        <p className="text-xs text-slate-600">
          Please keep this tab open to receive alerts.
        </p>
      </div>
    </div>
  );
};