import { useEffect, useRef } from 'react';
import { EPGData, WatcherRule, WatcherNotification } from '../types';

interface UseWatcherProps {
  epgData: EPGData | null;
  watcherRules: WatcherRule[];
  setWatcherNotifications: React.Dispatch<React.SetStateAction<WatcherNotification[]>>;
}

export function useWatcher({ epgData, watcherRules, setWatcherNotifications }: UseWatcherProps) {
  const notifiedProgramsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!epgData || watcherRules.length === 0) return;

    const scanInterval = setInterval(() => {
      const now = new Date();
      const newNotifications: WatcherNotification[] = [];
      const activeRules = watcherRules.filter(r => r.isActive);
      
      if (activeRules.length === 0) return;

      Object.entries(epgData.programs).forEach(([channelId, programs]) => {
        const currentProgram = programs.find(p => now >= p.start && now <= p.stop);
        if (currentProgram) {
          const titleLower = currentProgram.title.toLowerCase();
          const descLower = (currentProgram.description || '').toLowerCase();

          activeRules.forEach(rule => {
            const keywordLower = rule.keyword.toLowerCase();
            const matches = titleLower.includes(keywordLower) || descLower.includes(keywordLower);

            if (matches) {
              const notificationId = `${rule.id}-${channelId}-${currentProgram.start.getTime()}`;
              if (!notifiedProgramsRef.current.has(notificationId)) {
                notifiedProgramsRef.current.add(notificationId);
                const channelName = epgData.channels[channelId] || channelId;
                newNotifications.push({
                  id: notificationId,
                  ruleId: rule.id,
                  programTitle: currentProgram.title,
                  channelName,
                  channelId,
                  startTime: currentProgram.start,
                  timestamp: Date.now()
                });
              }
            }
          });
        }
      });

      if (newNotifications.length > 0) {
        setWatcherNotifications(prev => [...newNotifications, ...prev].slice(0, 10));
      }
    }, 60000); // Scan every minute

    return () => clearInterval(scanInterval);
  }, [epgData, watcherRules, setWatcherNotifications]);

  return null;
}
