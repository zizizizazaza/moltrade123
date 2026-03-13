import React from 'react';
import { Link } from 'react-router-dom';
import CopyTaskList from './CopyTaskList';

const CopyTradePanel: React.FC = () => {
  return (
    <div className="container mx-auto px-6 py-10 md:py-14 space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-bold tracking-[0.2em] text-gray-400 uppercase mb-2">
            Copy Trading
          </p>
          <h2 className="font-serif text-4xl md:text-5xl italic text-black">
            Copytrade Tasks.
          </h2>
          <p className="text-gray-500 mt-3 text-sm font-medium max-w-lg">
            Manage your copy trade tasks — pause, resume, stop, and monitor performance of all your live and simulated trades.
          </p>
        </div>

        <Link
          to="/trade"
          className="self-start inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-black text-white text-xs font-bold tracking-wider hover:bg-gray-800 transition-colors shadow-sm"
        >
          <span>+</span>
          Create New Task
        </Link>
      </div>

      {/* Task list */}
      <CopyTaskList
        title="Task Control Center"
        description="Pause, resume, stop tasks, and view dry-run / live execution results."
      />
    </div>
  );
};

export default CopyTradePanel;
