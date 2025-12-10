import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from './components/Header';
import { StartScreen } from './components/StartScreen';
import { AlarmOverlay } from './components/AlarmOverlay';
import { AppStatus } from './types';
import { audioService } from './services/audioService';
import { ACTIVE_ORDERS_PAGE, CHECK_ORDER_API, POLLING_INTERVAL_MS } from './constants';
import { RefreshCw, TestTube, ExternalLink, CheckCircle2 } from 'lucide-react';

export default function App() {
  // Initialize state from LocalStorage to remember "Online" status and last order
  const [appStatus, setAppStatus] = useState<AppStatus>(AppStatus.IDLE);
  
  const [lastOrderId, setLastOrderId] = useState<string | null>(() => {
    return localStorage.getItem('irsakitchen_last_order_id');
  });

  const [hasPermission, setHasPermission] = useState(() => {
    return localStorage.getItem('irsakitchen_rider_active') === 'true';
  });

  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [iframeKey, setIframeKey] = useState(0); // Used to force reload iframe
  const [errorMessage, setErrorMessage] = useState<string>(''); // To show specific error details
  
  // Refs to handle stale closures in setInterval
  const pollingTimerRef = useRef<number | null>(null);
  const lastOrderIdRef = useRef(lastOrderId);

  // Keep ref in sync with state
  useEffect(() => {
    lastOrderIdRef.current = lastOrderId;
  }, [lastOrderId]);

  // 1. Auto-resume logic: If user is already "Online", try to init audio on first touch
  useEffect(() => {
    if (hasPermission) {
      if (appStatus === AppStatus.IDLE) {
          setAppStatus(AppStatus.MONITORING);
      }
      
      const handleUserInteraction = () => {
        // Browsers require a gesture to start audio. 
        // We catch this on the first click/tap anywhere in the app.
        audioService.initialize().catch(e => console.log("Audio resume silent fail:", e));
        
        // Remove listeners once done
        document.removeEventListener('click', handleUserInteraction);
        document.removeEventListener('touchstart', handleUserInteraction);
      };

      document.addEventListener('click', handleUserInteraction);
      document.addEventListener('touchstart', handleUserInteraction);

      return () => {
        document.removeEventListener('click', handleUserInteraction);
        document.removeEventListener('touchstart', handleUserInteraction);
      };
    }
  }, [hasPermission]);

  // Request notification permission
  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  };

  const startMonitoring = async () => {
    await audioService.initialize();
    await requestNotificationPermission();
    
    // Save "Online" state so we don't ask again
    localStorage.setItem('irsakitchen_rider_active', 'true');
    setHasPermission(true);
    setAppStatus(AppStatus.MONITORING);
    
    // Initial fetch
    checkForNewOrder();
  };

  const stopAlarm = useCallback(() => {
    audioService.stopAlarm();
    // If we stop the alarm, we go back to monitoring
    setAppStatus(AppStatus.MONITORING);
  }, []);

  const triggerAlarm = useCallback(() => {
    // Don't trigger if already active to avoid restarting loop
    setAppStatus(prev => {
        if (prev === AppStatus.ALARM_ACTIVE) return prev;
        return AppStatus.ALARM_ACTIVE;
    });
    
    audioService.startAlarm();

    // Send system notification
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        const notif = new Notification('New Order Received!', {
            body: 'A new delivery is waiting for acceptance.',
            icon: '/vite.svg',
            // @ts-ignore
            vibrate: [200, 100, 200],
            requireInteraction: true,
            tag: 'new-order'
        });
        
        // Clicking notification stops the sound
        notif.onclick = () => {
            window.focus();
            notif.close();
            stopAlarm();
        };
      } catch (e) {
        console.error("Notification failed", e);
      }
    }
    
    // Refresh iframe so the rider sees the new order immediately
    setIframeKey(prev => prev + 1);
  }, [stopAlarm]);

  /**
   * Real Polling Logic
   * Fetches the JSON file from your server.
   */
  const checkForNewOrder = async () => {
    setLastChecked(new Date());

    try {
        // SIMPLIFIED FETCH STRATEGY
        // We remove custom headers (Cache-Control, Pragma) to keep this a "Simple Request" in CORS terms.
        // We use a query parameter `?t=` to bypass cache instead of headers.
        const response = await fetch(`${CHECK_ORDER_API}?t=${Date.now()}`, {
            method: 'GET',
            credentials: 'omit', // Don't send cookies, helps with wildcard (*) CORS
        });
        
        if (response.ok) {
            setErrorMessage('');
            // Attempt to parse JSON
            let data;
            try {
                data = await response.json();
            } catch (jsonError) {
                console.warn("Invalid JSON received:", jsonError);
                return;
            }
            
            // We assume the JSON has an 'id' or 'order_id' field.
            const remoteId = data.id || data.order_id || data.orderId;

            if (remoteId) {
                const remoteIdStr = String(remoteId);
                const currentStoredId = lastOrderIdRef.current;

                // If the ID from server is different from what we saw last time
                // AND it's not null
                if (remoteIdStr !== currentStoredId) {
                    console.log(`New order detected! Old: ${currentStoredId}, New: ${remoteIdStr}`);
                    
                    setLastOrderId(remoteIdStr);
                    localStorage.setItem('irsakitchen_last_order_id', remoteIdStr);
                    
                    triggerAlarm();
                } else {
                    // ID is the same
                    // If we were in error state, recover to monitoring
                    if (appStatus === AppStatus.CONNECTION_ERROR) {
                        setAppStatus(AppStatus.MONITORING);
                    }
                }
            } else {
                // Remote ID is null/empty (Order was likely accepted/declined/cleared)
                
                // If alarm is currently ringing, stop it automatically!
                if (appStatus === AppStatus.ALARM_ACTIVE) {
                    console.log("Remote order cleared, stopping alarm.");
                    stopAlarm();
                }
                
                if (appStatus === AppStatus.CONNECTION_ERROR) {
                    setAppStatus(AppStatus.MONITORING);
                }
            }
        } else {
             // Response not OK (404, 500, etc)
             const msg = `Server Error: ${response.status} ${response.statusText}`;
             console.warn(msg);
             setErrorMessage(msg);
             
             if (appStatus !== AppStatus.ALARM_ACTIVE) {
                setAppStatus(AppStatus.CONNECTION_ERROR);
             }
        }
    } catch (e: any) {
        console.error("Polling error (CORS or Network):", e);
        const msg = e.message || 'Network/CORS Error';
        setErrorMessage(msg);

        if (appStatus !== AppStatus.ALARM_ACTIVE) {
            setAppStatus(AppStatus.CONNECTION_ERROR);
        }
    }
  };

  // Set up polling interval
  useEffect(() => {
    // Start polling if we are authenticated (have permission)
    if (hasPermission) {
      // Run immediately
      checkForNewOrder();
      
      // If alarm is active, check faster (every 2s) to stop it quickly when they accept
      // Otherwise check at standard interval
      const interval = appStatus === AppStatus.ALARM_ACTIVE ? 2000 : POLLING_INTERVAL_MS;
      
      pollingTimerRef.current = window.setInterval(checkForNewOrder, interval);
    }

    return () => {
      if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
    };
  }, [hasPermission, appStatus, triggerAlarm, stopAlarm]); 

  // ---- SIMULATION (Keep strictly for testing) ----
  const simulateNewOrder = () => {
    const fakeNewId = Date.now().toString();
    console.log("Simulating new order:", fakeNewId);
    setLastOrderId(fakeNewId);
    localStorage.setItem('irsakitchen_last_order_id', fakeNewId);
    triggerAlarm();
  };
  // ---------------------------------------------------------

  if (!hasPermission) {
    return <StartScreen onStart={startMonitoring} />;
  }

  return (
    <div className="flex flex-col h-screen bg-slate-100">
      <Header status={appStatus} lastChecked={lastChecked} />

      {/* Alarm Overlay - Blocks screen until silenced */}
      {appStatus === AppStatus.ALARM_ACTIVE && (
        <AlarmOverlay onStop={stopAlarm} />
      )}

      {/* Main Content: The Existing Web Page */}
      <main className="flex-1 relative w-full overflow-hidden bg-white">
        {/* We use an iframe to "Show the page as it is" */}
        <iframe 
            key={iframeKey}
            src={ACTIVE_ORDERS_PAGE}
            title="Active Orders"
            className="w-full h-full border-0"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
        />

        {/* Floating Controls */}
        <div className="absolute bottom-6 right-6 flex flex-col gap-3">
             {/* Refresh Button */}
             <button 
                onClick={() => setIframeKey(prev => prev + 1)}
                className="bg-white p-3 rounded-full shadow-lg border border-slate-200 text-slate-700 hover:bg-slate-50 active:scale-95 transition"
                title="Reload Page"
            >
                <RefreshCw size={24} />
            </button>

            {/* Simulation Button - Test sound without waiting for order */}
            <button 
                onClick={simulateNewOrder}
                className="bg-blue-600/50 p-2 rounded-full shadow-lg text-white hover:bg-blue-700 active:scale-95 transition opacity-50 hover:opacity-100"
                title="Test Alarm (Simulation)"
            >
                <TestTube size={20} />
            </button>
        </div>
      </main>

      {/* Footer Info */}
      <footer className="bg-white border-t border-slate-200 p-2 text-center text-xs text-slate-400">
        <div className="flex items-center justify-center gap-2">
            {appStatus === AppStatus.MONITORING && (
                <span className="flex items-center gap-1 text-green-600 font-medium">
                    <CheckCircle2 size={12} /> Connected
                </span>
            )}
            <span className="text-slate-400">• ID: {lastOrderId || 'Waiting...'}</span>
        </div>
        
        {appStatus === AppStatus.CONNECTION_ERROR && (
            <div className="mt-2 p-2 bg-red-50 text-red-600 rounded">
                <p className="font-bold mb-1">
                    {errorMessage || `Connection Failed`}
                </p>
                <a 
                    href={CHECK_ORDER_API} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center underline text-red-700 hover:text-red-900"
                >
                    Test Server Connection <ExternalLink size={12} className="ml-1" />
                </a>
            </div>
        )}
      </footer>
    </div>
  );
}