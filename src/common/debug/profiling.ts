import { CONFIG } from 'utils/config';
import { createLogger } from 'utils/logger';

const enableProfiling = true;

const timerStatReportCooldownUs = 30 * 1_000_000;
const reportingThresholdMs = 10;
const alertSpikeThresholdPercent = 0.15;

export const Profiling =
  enableProfiling && CONFIG.isDev
    ? {
        startTimer,
        endTimer,
      }
    : {
        startTimer: noop,
        endTimer: noop,
      };

function noop() {}

const logger = createLogger('Profiling');

const timerStartsMs: Record<string, number> = {};
const timerStats: Record<string, { count: number; averageMs: number }> = {};

let timerStatReportTimeUs = 0;

function startTimer(label: string): void {
  timerStartsMs[label] = minetest.get_us_time();
}

function endTimer(label: string): void {
  const durationMs = (minetest.get_us_time() - timerStartsMs[label]) / 1000;
  delete timerStartsMs[label];

  if (durationMs >= reportingThresholdMs) {
    logger.trace(label, '-', durationMs, 'ms');
  }

  const stats = timerStats[label];
  if (stats != null) {
    stats.count++;
    stats.averageMs =
      stats.averageMs * ((stats.count - 1) / stats.count) +
      durationMs / stats.count;
    reportTimerStats(label);

    const diff = durationMs - stats.averageMs;
    if (diff > 17 && diff > stats.averageMs * alertSpikeThresholdPercent) {
      logger.warning(label, '-', diff, 'ms higher than average');
    }
  } else {
    timerStats[label] = { count: 1, averageMs: durationMs };
  }
}

function reportTimerStats(label: string) {
  if (
    timerStatReportTimeUs + timerStatReportCooldownUs <
    minetest.get_us_time()
  ) {
    const stats = timerStats[label];
    logger.trace(label, '- avg', stats.averageMs, 'ms');
    timerStatReportTimeUs = minetest.get_us_time();
  }
}
