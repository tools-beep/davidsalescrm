import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SyncStats {
  lastSyncTime: string | null;
  syncedCount: number;
  isSyncing: boolean;
}

export function useDialpadAutoSync(intervalMinutes: number = 15, enabled: boolean = true) {
  const [stats, setStats] = useState<SyncStats>({
    lastSyncTime: null,
    syncedCount: 0,
    isSyncing: false,
  });
  const { toast } = useToast();

  const syncCalls = async (showToast: boolean = false) => {
    if (!enabled) return;

    try {
      setStats(prev => ({ ...prev, isSyncing: true }));

      console.log('🔄 Starting Dialpad auto-sync...');

      // Call sync edge function with Stats API parameters
      const { data, error } = await supabase.functions.invoke('dialpad-sync', {
        body: {
          days_ago_start: 0,  // Today
          days_ago_end: 0,    // Today
          // office_id: 'YOUR_OFFICE_ID', // Add if required by your Dialpad account
        },
      });

      if (error) {
        console.error('❌ Dialpad sync error:', error);
        if (showToast) {
          toast({
            title: "Sync Failed",
            description: error.message || "Failed to sync calls from Dialpad",
            variant: "destructive",
          });
        }
        return;
      }

      const syncTime = new Date().toISOString();
      localStorage.setItem('last_dialpad_sync', syncTime);
      
      const syncedCount = data?.synced_count || 0;
      
      setStats({
        lastSyncTime: syncTime,
        syncedCount,
        isSyncing: false,
      });

      console.log('✅ Dialpad sync completed:', { syncedCount, syncTime });

      if (showToast && syncedCount > 0) {
        toast({
          title: "Sync Complete",
          description: `Synced ${syncedCount} call${syncedCount !== 1 ? 's' : ''} from Dialpad`,
        });
      }
    } catch (error: any) {
      console.error('❌ Auto-sync error:', error);
      setStats(prev => ({ ...prev, isSyncing: false }));
      
      if (showToast) {
        toast({
          title: "Sync Error",
          description: error.message || "An error occurred during sync",
          variant: "destructive",
        });
      }
    }
  };

  // Manual sync function that can be called from UI
  const manualSync = () => syncCalls(true);

  useEffect(() => {
    if (!enabled) return;

    // Initial sync on mount
    syncCalls(false);

    // Set up interval for automatic syncing
    const interval = setInterval(() => {
      syncCalls(false);
    }, intervalMinutes * 60 * 1000);

    return () => clearInterval(interval);
  }, [intervalMinutes, enabled]);

  return {
    ...stats,
    manualSync,
  };
}

