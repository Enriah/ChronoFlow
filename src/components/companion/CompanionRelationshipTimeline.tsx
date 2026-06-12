import { CalendarDays, X } from 'lucide-react';
import { useCompanionStore } from '../../store/useCompanionStore';

export function CompanionRelationshipTimeline({ onClose }: { onClose: () => void }) {
  const milestones = useCompanionStore(state => state.milestones);

  return (
    <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-3xl max-h-[86vh] overflow-hidden rounded-[2rem] border border-border bg-surface shadow-2xl flex flex-col">
        <div className="p-6 border-b border-border flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <CalendarDays className="w-5 h-5 text-primary" />
            <div>
              <h3 className="text-xl font-black text-text">Relationship History</h3>
              <p className="text-xs text-text-secondary opacity-70">{milestones.length} remembered milestones</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 transition-colors" title="Close relationship history">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {milestones.length === 0 ? (
            <p className="text-sm text-text-secondary opacity-60 italic text-center py-16">No milestones unlocked yet.</p>
          ) : (
            <div className="relative pl-6">
              <div className="absolute left-2 top-0 bottom-0 w-px bg-white/10" />
              {[...milestones].sort((a, b) => b.date.localeCompare(a.date)).map(milestone => (
                <div key={milestone.id} className="relative pb-8">
                  <div className="absolute -left-[21px] top-1 w-4 h-4 rounded-full bg-primary border-4 border-surface" />
                  <p className="text-xs font-bold text-primary">{milestone.date}</p>
                  <h4 className="text-base font-black text-text mt-1">{milestone.title}</h4>
                  <p className="text-sm text-text-secondary mt-1 leading-relaxed">{milestone.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
