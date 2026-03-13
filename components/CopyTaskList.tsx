import React, { useEffect, useState, useCallback } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import {
  fetchCopyPerformance,
  fetchCopyTasks,
  CopyPerformance,
  CopyTaskItem,
  stopCopyTask,
  updateCopyTask,
} from '../api';
import ConfirmModal from './ConfirmModal';

/* ────────────────────────────── helpers ────────────────────────────── */

const shortAddr = (a: string) =>
  a.length > 14 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a;

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const fmtMoney = (v: number) =>
  v >= 1000 ? `$${(v / 1000).toFixed(1)}K` : `$${v.toFixed(0)}`;

type Status = 'running' | 'paused' | 'stopped' | string;

const statusMeta: Record<string, { label: string; dot: string; bg: string; text: string }> = {
  running: { label: 'Running', dot: 'bg-emerald-400', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  paused: { label: 'Paused', dot: 'bg-amber-400', bg: 'bg-amber-50', text: 'text-amber-700' },
  stopped: { label: 'Stopped', dot: 'bg-gray-400', bg: 'bg-gray-100', text: 'text-gray-500' },
};

const getStatusMeta = (s: Status) =>
  statusMeta[s] || { label: s, dot: 'bg-gray-400', bg: 'bg-gray-100', text: 'text-gray-500' };

/* ────────────────────────────── component ──────────────────────────── */

type CopyTaskListProps = {
  title?: string;
  description?: string;
  limit?: number;
  emptyMessage?: string;
};

const CopyTaskList: React.FC<CopyTaskListProps> = ({
  title = 'Task Control Center',
  description = 'Pause, resume, stop tasks, and view dry run / live results.',
  limit = 100,
  emptyMessage = 'No copytrade tasks yet.',
}) => {
  const { ready, authenticated } = usePrivy();
  const [tasks, setTasks] = useState<CopyTaskItem[]>([]);
  const [performance, setPerformance] = useState<Record<string, CopyPerformance>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedPerf, setExpandedPerf] = useState<Set<string>>(new Set());

  // Modal state
  const [stopTarget, setStopTarget] = useState<string | null>(null);
  const [stopping, setStopping] = useState(false);

  // Mode toggle state
  const [modeToggleTarget, setModeToggleTarget] = useState<{ taskId: string; toMode: 'live' | 'dry_run' } | null>(null);
  const [togglingMode, setTogglingMode] = useState(false);

  /* ── data ── */
  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchCopyTasks(limit);
      setTasks(rows);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    if (!ready || !authenticated) return;
    void reload();
  }, [ready, authenticated, reload]);

  /* ── actions ── */
  const onPauseResume = async (task: CopyTaskItem) => {
    const newStatus = task.status === 'running' ? 'paused' : 'running';
    try {
      await updateCopyTask({ task_id: task.task_id, status: newStatus });
      await reload();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const handleConfirmStop = async () => {
    if (!stopTarget) return;
    setStopping(true);
    try {
      await stopCopyTask(stopTarget);
      setStopTarget(null);
      await reload();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
      setStopTarget(null);
    } finally {
      setStopping(false);
    }
  };

  // Mode toggle handler
  const handleConfirmModeToggle = async () => {
    if (!modeToggleTarget) return;
    setTogglingMode(true);
    try {
      const isDryRun = modeToggleTarget.toMode === 'dry_run';
      await updateCopyTask({ task_id: modeToggleTarget.taskId, dry_run: isDryRun });
      setModeToggleTarget(null);
      await reload();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
      setModeToggleTarget(null);
    } finally {
      setTogglingMode(false);
    }
  };

  const togglePerformance = async (taskId: string) => {
    setExpandedPerf((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
    if (!performance[taskId]) {
      try {
        const perf = await fetchCopyPerformance(taskId);
        setPerformance((prev) => ({ ...prev, [taskId]: perf }));
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : String(e));
      }
    }
  };

  /* ── render ── */
  return (
    <>
      <section className="rounded-2xl bg-white border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-bold tracking-[0.15em] text-gray-400 uppercase">{title}</h3>
            <p className="text-[13px] text-gray-500 mt-1">{description}</p>
          </div>
          <button
            onClick={() => void reload()}
            className="h-8 px-4 rounded-lg text-xs font-semibold text-gray-600 bg-gray-50 border border-gray-200 hover:bg-gray-100 hover:border-gray-300 transition-all"
          >
            ↻ Refresh
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-xs text-red-600 font-medium">
              {error}
            </div>
          )}

          {!ready ? (
            <EmptyState text="Initializing..." />
          ) : !authenticated ? (
            <EmptyState text="Connect your wallet to view copy trade tasks." />
          ) : loading ? (
            <EmptyState text="Loading tasks..." />
          ) : tasks.length === 0 ? (
            <EmptyState text={emptyMessage} />
          ) : (
            <div className="space-y-4">
              {tasks.map((task) => {
                const sm = getStatusMeta(task.status);
                const isStopped = task.status === 'stopped';
                const perf = performance[task.task_id];
                const perfOpen = expandedPerf.has(task.task_id);

                return (
                  <div
                    key={task.task_id}
                    className={`rounded-xl border transition-all ${isStopped
                        ? 'border-gray-200 bg-gray-50/50'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                      }`}
                  >
                    {/* Top row */}
                    <div className="px-5 pt-5 pb-4">
                      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                        {/* Left: Identity */}
                        <div className="space-y-3 min-w-0 flex-1">
                          {/* ID + badges */}
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[11px] font-mono font-bold text-gray-400 tracking-wider">
                              {task.task_id}
                            </span>
                            {/* Status badge */}
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${sm.bg} ${sm.text}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${sm.dot}`} />
                              {sm.label}
                            </span>
                            {/* Dry Run / Live badge — clickable to toggle */}
                            <button
                              onClick={() =>
                                setModeToggleTarget({
                                  taskId: task.task_id,
                                  toMode: task.dry_run ? 'live' : 'dry_run',
                                })
                              }
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold cursor-pointer transition-all hover:shadow-sm ${task.dry_run
                                  ? 'bg-violet-50 text-violet-600 border border-violet-200 hover:bg-violet-100'
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                }`}
                              title={task.dry_run ? 'Click to switch to Live mode' : 'Click to switch to Dry Run mode'}
                            >
                              {task.dry_run ? '🧪 Dry Run' : '💰 Live'}
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
                              </svg>
                            </button>
                          </div>

                          {/* Strategy */}
                          <div>
                            <p className="text-sm font-bold text-black">
                              {task.side} · {task.market_id === '*' ? 'All Markets' : task.market_id}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              Source: <span className="font-mono">{shortAddr(task.source_wallet)}</span>
                            </p>
                          </div>

                          {/* Parameter grid */}
                          <div className="flex flex-wrap gap-x-5 gap-y-1 text-[11px]">
                            <ParamItem label="Max/Trade" value={fmtMoney(task.max_per_trade_usd)} />
                            <ParamItem label="Daily Budget" value={fmtMoney(task.daily_risk_budget_usd)} />
                            <ParamItem label="Slippage" value={`${(task.slippage_max * 100).toFixed(0)}%`} />
                            <ParamItem label="Min Size" value={fmtMoney(task.min_trade_size_usd)} />
                            <ParamItem label="Ratio" value={`${task.copy_ratio}x`} />
                          </div>
                        </div>

                        {/* Right: Actions + date */}
                        <div className="flex flex-col items-end gap-3 shrink-0">
                          <div className="flex items-center gap-2">
                            {!isStopped && (
                              <button
                                onClick={() => void onPauseResume(task)}
                                className="h-8 px-4 rounded-lg text-xs font-bold text-black bg-white border border-gray-200 hover:border-black transition-colors"
                              >
                                {task.status === 'running' ? '⏸ Pause' : '▶ Resume'}
                              </button>
                            )}
                            {isStopped ? (
                              <button
                                onClick={() => void onPauseResume(task)}
                                className="h-8 px-4 rounded-lg text-xs font-bold text-white bg-black hover:bg-gray-800 transition-colors"
                              >
                                ▶ Restart
                              </button>
                            ) : (
                              <button
                                onClick={() => setStopTarget(task.task_id)}
                                className="h-8 px-4 rounded-lg text-xs font-bold text-white bg-red-500 hover:bg-red-600 transition-colors"
                              >
                                ■ Stop
                              </button>
                            )}
                            <button
                              onClick={() => void togglePerformance(task.task_id)}
                              className={`h-8 px-4 rounded-lg text-xs font-bold border transition-colors ${perfOpen
                                  ? 'bg-black text-white border-black'
                                  : 'text-gray-500 bg-white border-gray-200 hover:border-black hover:text-black'
                                }`}
                            >
                              📊 Stats
                            </button>
                          </div>
                          <p className="text-[10px] text-gray-400">
                            Created {fmtDate(task.created_at)} · Updated {fmtDate(task.updated_at)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Performance panel */}
                    {perfOpen && (
                      <div className="border-t border-gray-100 bg-gray-50/80 px-5 py-4">
                        {perf ? (
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                            <StatCard label="Total Trades" value={String(perf.total_trades)} />
                            <StatCard
                              label="Successful"
                              value={String(perf.success_trades)}
                              accent="text-emerald-600"
                            />
                            <StatCard
                              label="Failed"
                              value={String(perf.failed_trades)}
                              accent={perf.failed_trades > 0 ? 'text-red-500' : undefined}
                            />
                            <StatCard label="Skipped" value={String(perf.skipped_trades)} />
                            <StatCard label="Total Amount" value={`$${perf.total_amount_usd.toFixed(2)}`} />
                            <StatCard
                              label="Success Rate"
                              value={`${(perf.success_rate * 100).toFixed(1)}%`}
                              accent={perf.success_rate >= 0.5 ? 'text-emerald-600' : 'text-red-500'}
                            />
                          </div>
                        ) : (
                          <p className="text-xs text-gray-400 text-center py-2">Loading performance data...</p>
                        )}
                      </div>
                    )}

                    {/* Reason bar (for stopped tasks) */}
                    {isStopped && task.reason && (
                      <div className="border-t border-gray-100 px-5 py-2.5 bg-gray-50/50">
                        <p className="text-[11px] text-gray-400 italic">
                          ⓘ {task.reason}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Stop confirmation modal */}
      <ConfirmModal
        open={stopTarget !== null}
        onConfirm={() => void handleConfirmStop()}
        onCancel={() => setStopTarget(null)}
        title="Stop Copy Trade Task"
        description="This will permanently stop the copy trade task. Active position tracking will cease and no further trades will be executed. This action cannot be undone."
        confirmText="Stop Task"
        cancelText="Keep Running"
        variant="danger"
        loading={stopping}
      />

      {/* Mode toggle confirmation modal */}
      <ConfirmModal
        open={modeToggleTarget !== null}
        onConfirm={() => void handleConfirmModeToggle()}
        onCancel={() => setModeToggleTarget(null)}
        title={
          modeToggleTarget?.toMode === 'live'
            ? 'Switch to Live Mode'
            : 'Switch to Dry Run Mode'
        }
        description={
          modeToggleTarget?.toMode === 'live'
            ? 'Live mode will execute REAL trades using your USDC balance. Make sure your delegated wallet has sufficient funds. Trades are irreversible once submitted.'
            : 'Switching back to Dry Run mode. No real trades will be executed — the system will only simulate and log orders.'
        }
        confirmText={
          modeToggleTarget?.toMode === 'live' ? '💰 Go Live' : '🧪 Switch to Dry Run'
        }
        cancelText="Cancel"
        variant={modeToggleTarget?.toMode === 'live' ? 'warning' : 'info'}
        loading={togglingMode}
      />
    </>
  );
};

/* ────────────────────────────── sub-components ─────────────────────── */

const EmptyState: React.FC<{ text: string }> = ({ text }) => (
  <div className="py-12 text-center">
    <p className="text-sm text-gray-400">{text}</p>
  </div>
);

const ParamItem: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <span className="text-gray-400">
    {label}: <span className="font-bold text-gray-600">{value}</span>
  </span>
);

const StatCard: React.FC<{ label: string; value: string; accent?: string }> = ({
  label,
  value,
  accent,
}) => (
  <div className="bg-white rounded-xl px-3.5 py-2.5 border border-gray-100">
    <p className="text-[10px] font-bold text-gray-400 tracking-wider uppercase">{label}</p>
    <p className={`text-base font-bold mt-0.5 ${accent || 'text-black'}`}>{value}</p>
  </div>
);

export default CopyTaskList;
