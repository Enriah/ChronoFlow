import { useMemo, useState } from 'react';
import { BookOpen, Search, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { clsx } from 'clsx';
import { useCompanionStore } from '../../store/useCompanionStore';
import type { JournalEntry } from '../../models/companion/types';

function monthName(date: string) {
  return format(parseISO(date), 'MMMM');
}

function dayName(date: string) {
  return format(parseISO(date), 'MMMM d');
}

function groupEntries(entries: JournalEntry[]) {
  return entries.reduce<Record<string, Record<string, JournalEntry[]>>>((groups, entry) => {
    const year = entry.date.slice(0, 4);
    const month = monthName(entry.date);
    groups[year] ||= {};
    groups[year][month] ||= [];
    groups[year][month].push(entry);
    return groups;
  }, {});
}

export function CompanionJournalViewer({ onClose }: { onClose: () => void }) {
  const journal = useCompanionStore(state => state.journal);
  const [search, setSearch] = useState('');
  const [selectedDate, setSelectedDate] = useState<string | null>(journal.at(-1)?.date || null);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const entries = [...journal].sort((a, b) => b.date.localeCompare(a.date));
    if (!query) return entries;

    return entries.filter(entry => [
      entry.date,
      entry.reflection,
      ...entry.importantEvents,
    ].join(' ').toLowerCase().includes(query));
  }, [journal, search]);

  const grouped = groupEntries(filtered);
  const selected = filtered.find(entry => entry.date === selectedDate) || filtered[0];

  return (
    <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-5xl h-[86vh] overflow-hidden rounded-[2rem] border border-border bg-surface shadow-2xl flex flex-col">
        <div className="p-6 border-b border-border flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <BookOpen className="w-5 h-5 text-primary" />
            <div>
              <h3 className="text-xl font-black text-text">Companion Journal</h3>
              <p className="text-xs text-text-secondary opacity-70">{journal.length} daily reflections</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 transition-colors" title="Close journal">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] min-h-0 flex-1">
          <aside className="border-r border-border min-h-0 flex flex-col">
            <div className="p-4 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary opacity-50" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search reflections..."
                  className="w-full bg-bg-secondary border border-white/10 rounded-xl py-2 pl-9 pr-3 text-sm focus:outline-none focus:border-primary/50"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              {Object.entries(grouped).map(([year, months]) => (
                <div key={year} className="mb-5">
                  <p className="text-xs font-black text-primary mb-3">{year}</p>
                  {Object.entries(months).map(([month, entries]) => (
                    <div key={month} className="mb-4 pl-3 border-l border-white/10">
                      <p className="text-[10px] uppercase tracking-widest text-text-secondary font-black mb-2">{month}</p>
                      <div className="space-y-1">
                        {entries.map(entry => (
                          <button
                            key={entry.date}
                            onClick={() => setSelectedDate(entry.date)}
                            className={clsx(
                              "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors",
                              selected?.date === entry.date ? "bg-primary text-white" : "hover:bg-white/10 text-text"
                            )}
                          >
                            {dayName(entry.date)}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </aside>

          <main className="min-h-0 overflow-y-auto p-8 custom-scrollbar">
            {!selected ? (
              <div className="h-full flex items-center justify-center text-center text-text-secondary opacity-60">
                <p>No journal entries yet.</p>
              </div>
            ) : (
              <article className="max-w-2xl space-y-6">
                <div>
                  <p className="text-sm text-primary font-bold">{format(parseISO(selected.date), 'EEEE, MMMM d, yyyy')}</p>
                  <h2 className="text-3xl font-black text-text mt-1">Daily Reflection</h2>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-[10px] uppercase tracking-widest text-text-secondary font-black opacity-60">Focus Hours</p>
                    <p className="text-2xl font-black text-text mt-1">{selected.stats.focusHours}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-[10px] uppercase tracking-widest text-text-secondary font-black opacity-60">Tasks Completed</p>
                    <p className="text-2xl font-black text-text mt-1">{selected.stats.completedTasks}</p>
                  </div>
                </div>

                <div className="p-5 rounded-xl bg-white/5 border border-white/10">
                  {selected.reflection ? (
                    <p className="text-base leading-8 text-text whitespace-pre-line">{selected.reflection}</p>
                  ) : (
                    <p className="text-sm text-text-secondary italic">Reflection pending. The Companion will try again later.</p>
                  )}
                </div>

                {selected.importantEvents.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] uppercase tracking-widest text-text-secondary font-black opacity-60">Remembered Moments</p>
                    <div className="space-y-2">
                      {selected.importantEvents.map(event => (
                        <p key={event} className="text-sm text-text-secondary bg-white/5 border border-white/10 rounded-lg px-3 py-2">{event}</p>
                      ))}
                    </div>
                  </div>
                )}
              </article>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
