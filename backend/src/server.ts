import 'dotenv/config';
import app from './app';
import { testDbConnection } from './config/db';
import logger from './utils/logger';
import { ImapPollingWorker } from './workers/imap-poller.worker';

const port = process.env.PORT || 3001;

app.listen(port, async () => {
  logger.info(`Backend server is running on port ${port}`);

  try {
    await testDbConnection();
  } catch (err) {
    logger.error('Startup database connection test failed', {
      error: err,
    });
  }

  if (process.env.IMAP_HOST) {
    ImapPollingWorker.start();
  } else {
    logger.warn('IMAP_HOST not configured, skipping IMAP Polling Worker startup');
  }
});
