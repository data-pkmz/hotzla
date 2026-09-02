import cron from 'node-cron';

import { CartCleanupJob } from '../jobs/cart-cleanup.job';
import logger from '../utils/logger';

// This scheduler is the runtime entry point for the recurring cleanup.
// It allows us to configure the cron pattern via env vars while keeping the code
// easy to test and safe to start only once in the application lifecycle.
const DEFAULT_CRON_EXPRESSION = process.env.CART_CLEANUP_CRON || '0 2 * * *';
const DEFAULT_TIMEZONE = 'Asia/Jerusalem';

// Guard flag prevents duplicate registration if the application file is reloaded
// or if startScheduler() is triggered more than once in the same process.
let schedulerStarted = false;

export function startScheduler() {
  // If the scheduler is already running, skip initialization to avoid multiple
  // cleanup jobs running at the same time.
  if (schedulerStarted) {
    return;
  }

  schedulerStarted = true;

  // Schedule a daily cleanup according to the cron expression. The callback runs
  // inside the Node process and invokes the cleanup routine.
  cron.schedule(
    DEFAULT_CRON_EXPRESSION,
    async () => {
      try {
        // Log the scheduled run before executing the job so Support/Operations can
        // correlate run time with actual cleanup results.
        logger.info('Starting cart cleanup job', {
          cronExpression: DEFAULT_CRON_EXPRESSION,
          timezone: DEFAULT_TIMEZONE,
        });

        await CartCleanupJob.runCleanupJob();
      } catch (error) {
        // Any exception in the job should be captured and logged so it does not get
        // silently swallowed by the cron runner.
        logger.error('Cart cleanup job failed', {
          error,
          cronExpression: DEFAULT_CRON_EXPRESSION,
          timezone: DEFAULT_TIMEZONE,
        });
      }
    },
    {
      timezone: DEFAULT_TIMEZONE,
    }
  );

  logger.info('Cart cleanup scheduler started', {
    cronExpression: DEFAULT_CRON_EXPRESSION,
    timezone: DEFAULT_TIMEZONE,
  });
}

export default startScheduler;
