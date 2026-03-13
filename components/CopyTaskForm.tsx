import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { startCopyTrading } from '../api';

type CopyTaskFormProps = {
  title?: string;
  description?: string;
  ctaLabel?: string;
  initialSourceWallet?: string;
  initialMarketId?: string;
  onTaskCreated?: (task: { task_id: string; status: string; accepted: boolean; reason?: string | null }) => void;
};

const defaultForm = {
  source_wallet: '',
  market_id: '',
  side: 'YES' as 'YES' | 'NO',
  copy_ratio: 1,
  max_per_trade_usd: 100,
  min_trade_size_usd: 5,
  slippage_max: 0.03,
  daily_risk_budget_usd: 500,
  dry_run: true,
};

const CopyTaskForm: React.FC<CopyTaskFormProps> = ({
  title = 'Create Copy Task',
  description = '从雷达中选中地址后会自动回填到这里，你也可以手动输入钱包和 Market ID。',
  ctaLabel = 'Create Copytrade Task',
  initialSourceWallet,
  initialMarketId,
  onTaskCreated,
}) => {
  const [form, setForm] = useState(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (typeof initialSourceWallet === 'string') {
      setForm((prev) => ({ ...prev, source_wallet: initialSourceWallet }));
    }
  }, [initialSourceWallet]);

  useEffect(() => {
    if (typeof initialMarketId === 'string') {
      setForm((prev) => ({ ...prev, market_id: initialMarketId }));
    }
  }, [initialMarketId]);

  const onCreateTask = async () => {
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const created = await startCopyTrading(form);
      setSuccess(`Task created: ${created.task_id}`);
      setForm((prev) => ({
        ...prev,
        market_id: '',
      }));
      onTaskCreated?.(created);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="glass rounded-3xl p-6 md:p-8 bg-white border border-gray-100 shadow-sm space-y-5">
      <div className="space-y-2">
        <h3 className="text-sm font-bold tracking-widest text-gray-500">{title.toUpperCase()}</h3>
        <p className="text-sm text-gray-500">{description}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input
          value={form.source_wallet}
          onChange={(e) => setForm((prev) => ({ ...prev, source_wallet: e.target.value }))}
          placeholder="Source wallet (0x...)"
          className="px-4 py-3 rounded-2xl border border-gray-200 text-sm outline-none focus:border-black"
        />
        <input
          value={form.market_id}
          onChange={(e) => setForm((prev) => ({ ...prev, market_id: e.target.value }))}
          placeholder="Market ID"
          className="px-4 py-3 rounded-2xl border border-gray-200 text-sm outline-none focus:border-black"
        />

        <select
          value={form.side}
          onChange={(e) => setForm((prev) => ({ ...prev, side: e.target.value as 'YES' | 'NO' }))}
          className="px-4 py-3 rounded-2xl border border-gray-200 text-sm outline-none focus:border-black"
        >
          <option value="YES">YES</option>
          <option value="NO">NO</option>
        </select>
        <label className="flex items-center gap-2 px-4 py-3 rounded-2xl border border-gray-200 text-sm">
          <input
            type="checkbox"
            checked={form.dry_run}
            onChange={(e) => setForm((prev) => ({ ...prev, dry_run: e.target.checked }))}
          />
          Dry Run
        </label>

        <NumberInput label="Copy Ratio" value={form.copy_ratio} onChange={(value) => setForm((prev) => ({ ...prev, copy_ratio: value }))} />
        <NumberInput label="Max/Trade USD" value={form.max_per_trade_usd} onChange={(value) => setForm((prev) => ({ ...prev, max_per_trade_usd: value }))} />
        <NumberInput label="Min Trade USD" value={form.min_trade_size_usd} onChange={(value) => setForm((prev) => ({ ...prev, min_trade_size_usd: value }))} />
        <NumberInput label="Slippage Max" value={form.slippage_max} step={0.001} onChange={(value) => setForm((prev) => ({ ...prev, slippage_max: value }))} />
        <NumberInput label="Daily Budget USD" value={form.daily_risk_budget_usd} onChange={(value) => setForm((prev) => ({ ...prev, daily_risk_budget_usd: value }))} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => void onCreateTask()}
          disabled={submitting || !form.source_wallet || !form.market_id}
          className="px-6 py-3 rounded-full bg-black text-white text-xs font-bold tracking-widest disabled:opacity-50"
        >
          {submitting ? 'Creating...' : ctaLabel}
        </button>
        <Link
          to="/copytrade"
          className="px-5 py-3 rounded-full border border-gray-200 text-xs font-bold tracking-widest text-gray-600 hover:text-black hover:border-black transition-colors"
        >
          View Tasks
        </Link>
      </div>

      {success && <p className="text-xs text-green-600 font-medium">{success}</p>}
      {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
    </section>
  );
};

const NumberInput: React.FC<{
  label: string;
  value: number;
  step?: number;
  onChange: (value: number) => void;
}> = ({ label, value, onChange, step = 0.01 }) => (
  <label className="flex flex-col gap-1">
    <span className="text-[11px] font-bold text-gray-500">{label}</span>
    <input
      type="number"
      value={Number.isFinite(value) ? value : 0}
      step={step}
      onChange={(e) => onChange(Number(e.target.value))}
      className="px-4 py-3 rounded-2xl border border-gray-200 text-sm outline-none focus:border-black"
    />
  </label>
);

export default CopyTaskForm;
