import { CONFIG } from 'utils/config';
import { Logger } from 'utils/logger';

const enableProfiling = true;

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

const timerStarts: Record<string, number> = {};
const timerStats: Record<string, { count: number; average: number }> = {};

const timerStatReportCooldown = 500_000;
let timerStatReportEnqueued = false;
let timerStatReportTime = 0;

function startTimer(label: string): void {
  timerStarts[label] = minetest.get_us_time();
}

function endTimer(label: string): void {
  const ms = (minetest.get_us_time() - timerStarts[label]) / 1000;
  Logger.trace(`${label}: ${ms} ms`);
  delete timerStarts[label];

  const stats = timerStats[label];
  if (stats) {
    stats.count++;
    stats.average =
      stats.average * ((stats.count - 1) / stats.count) + ms / stats.count;
    reportTimerStats(label);
  } else {
    timerStats[label] = { count: 1, average: ms };
  }
}

function reportTimerStats(label: string) {
  if (timerStatReportTime + timerStatReportCooldown < minetest.get_us_time()) {
    const stats = timerStats[label];
    Logger.trace(`${label}: average ${stats.average} ms`);
    timerStatReportTime = minetest.get_us_time();
    timerStatReportEnqueued = false;
  } else if (!timerStatReportEnqueued) {
    timerStatReportEnqueued = true;
    minetest.after(timerStatReportCooldown / 1000000, () =>
      reportTimerStats(label)
    );
  }
}
