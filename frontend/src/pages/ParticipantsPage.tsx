import React, { useState, useEffect } from 'react';
import { getParticipants, deleteParticipant } from '../services/api';
import { Participant } from '../types';
import { ParticipantCard } from '../components/participants/ParticipantCard';
import { ParticipantDetailModal } from '../components/participants/ParticipantDetailModal';
import {
  Users,
  Search,
  ArrowUpDown,
  Filter,
  Plus,
  RefreshCw,
  UserCheck,
} from 'lucide-react';

export const ParticipantsPage: React.FC = () => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [search, setSearch] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [page, setPage] = useState<number>(0);
  const [limit] = useState<number>(12);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Selected participant for detail modal
  const [selectedParticipantId, setSelectedParticipantId] = useState<number | null>(null);

  const fetchParticipants = () => {
    setIsLoading(true);
    getParticipants({
      search: search.trim() || undefined,
      sort_by: sortBy,
      skip: page * limit,
      limit,
    })
      .then((data: { items: Participant[]; total: number }) => {
        setParticipants(data.items);
        setTotalCount(data.total);
      })
      .catch((err: any) => console.error('Failed to load participants:', err))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchParticipants();
  }, [search, sortBy, page]);

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this participant record and their snapshot?')) {
      return;
    }

    try {
      await deleteParticipant(id);
      fetchParticipants();
    } catch (err) {
      console.error('Delete error:', err);
      alert('Failed to delete participant.');
    }
  };

  const totalPages = Math.ceil(totalCount / limit);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-500" />
            <span>Registered Participants</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Browse, manage, and view profiles of consented participants registered in FaceSense AI.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-semibold border border-indigo-500/20">
            {totalCount} Total Registered
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            placeholder="Search by code (P00001) or name..."
            className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 pl-9 pr-3.5 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Sorting Dropdown */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <ArrowUpDown className="w-4 h-4 text-slate-400" />
          <select
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value);
              setPage(0);
            }}
            className="text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="newest">Sort: Newest First</option>
            <option value="oldest">Sort: Oldest First</option>
            <option value="name">Sort: Name (A-Z)</option>
            <option value="code">Sort: Participant Code</option>
          </select>
        </div>
      </div>

      {/* Gallery Grid */}
      {isLoading ? (
        <div className="py-20 text-center text-xs text-slate-400">Loading participant gallery...</div>
      ) : participants.length === 0 ? (
        <div className="py-20 text-center space-y-2 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 p-8">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            No Participants Found
          </p>
          <p className="text-xs text-slate-400">
            {search ? 'Try adjusting your search criteria.' : 'Scan a face on the Live Scanner page to register your first participant.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {participants.map((p) => (
            <ParticipantCard
              key={p.id}
              participant={p}
              onViewDetails={(participant: Participant) => setSelectedParticipantId(participant.id)}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
          <span className="text-xs text-slate-500">
            Showing Page {page + 1} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Participant Detail Modal */}
      <ParticipantDetailModal
        participantId={selectedParticipantId}
        onClose={() => setSelectedParticipantId(null)}
        onDeleted={fetchParticipants}
      />
    </div>
  );
};
