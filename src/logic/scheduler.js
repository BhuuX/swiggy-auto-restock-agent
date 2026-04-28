import cron from 'node-cron';
import { restockAgent } from '../agent/restock-agent.js';
import { logsRepo } from '../db/store.js';

/**
 * Scheduler runs the restock cycle on a cron schedule.
 *
 * Default: every day at 8:00 AM
 * You can adjust the cron expression as needed.
 */

let schedulerTask = null;

export function startScheduler(cronExpression = '0 8 * * *') {
  if (schedulerTask) {
    console.log('[Scheduler] Already running');
    return;
  }

  schedulerTask = cron.schedule(cronExpression, async () => {
    console.log('[Scheduler] Running restock cycle...');
    logsRepo.add('scheduler_trigger', { time: new Date().toISOString() });

    try {
      const result = await restockAgent.runRestockCycle('scheduler');
      console.log('[Scheduler] Cycle result:', result.status);
    } catch (err) {
      console.error('[Scheduler] Cycle failed:', err.message);
      logsRepo.add('scheduler_error', { error: err.message });
    }
  });

  console.log(`[Scheduler] Started with schedule: ${cronExpression}`);
  logsRepo.add('scheduler_started', { cron: cronExpression });
}

export function stopScheduler() {
  if (schedulerTask) {
    schedulerTask.stop();
    schedulerTask = null;
    console.log('[Scheduler] Stopped');
  }
}

export function getSchedulerStatus() {
  return {
    running: schedulerTask !== null,
    next_run: schedulerTask ? 'Next 8:00 AM' : null,
  };
}
