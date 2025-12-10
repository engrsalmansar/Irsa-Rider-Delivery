import React from 'react';
import { AppStatus } from '../types';
import { Bell, Wifi, WifiOff, AlertTriangle } from 'lucide-react';

interface HeaderProps {
  status: AppStatus;
  lastChecked: Date | null;
}

export const Header: React.FC<HeaderProps> = ({ status, lastChecked }) => {
  return (
    <header className="bg-slate-900 text-white p-4 shadow-md sticky top-0 z-50">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="bg-orange-500 p-2 rounded-full">
            <Bell size={20} className="text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">Irsa Kitchen</h1>
            <p className="text-xs text-slate-400">Rider Dispatch</p>
          </div>
        </div>

        <div className="flex flex-col items-end">
          <div className={`flex items-center gap-1 text-sm font-medium px-2 py-1 rounded-full ${
            status === AppStatus.MONITORING ? 'bg-green-500/20 text-green-400' : 
            status === AppStatus.ALARM_ACTIVE ? 'bg-red-500/20 text-red-400 animate-pulse' : 
            status === AppStatus.CONNECTION_ERROR ? 'bg-yellow-500/20 text-yellow-400' :
            'bg-slate-700 text-slate-400'
          }`}>
            {status === AppStatus.MONITORING && <Wifi size={14} />}
            {status === AppStatus.IDLE && <WifiOff size={14} />}
            {status === AppStatus.CONNECTION_ERROR && <AlertTriangle size={14} />}
            {status === AppStatus.ALARM_ACTIVE && <Bell size={14} className="animate-bounce" />}
            
            <span>
              {status === AppStatus.MONITORING ? 'Live' : 
               status === AppStatus.ALARM_ACTIVE ? 'ALERT' : 
               status === AppStatus.CONNECTION_ERROR ? 'Error' : 'Offline'}
            </span>
          </div>
          {lastChecked && (
             <span className="text-[10px] text-slate-500 mt-1">
               Checked: {lastChecked.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
             </span>
          )}
        </div>
      </div>
    </header>
  );
};