import type { PreViewingChecklist } from '@propagent/shared';

interface Props {
  checklist: PreViewingChecklist;
}

const CHECKLIST_ITEMS: { key: keyof PreViewingChecklist; label: string }[] = [
  { key: 'residency_confirmed', label: 'Residency status confirmed' },
  { key: 'eligibility_confirmed', label: 'Eligibility confirmed' },
  { key: 'financing_discussed', label: 'Financing discussed' },
  { key: 'existing_property_understood', label: 'Existing property understood' },
  { key: 'decision_maker_confirmed', label: 'Decision maker confirmed' },
  { key: 'timeline_genuine', label: 'Timeline is genuine' },
  { key: 'paynow_verified', label: 'PayNow verified' },
];

export function QualificationChecklist({ checklist }: Props) {
  const completedCount = CHECKLIST_ITEMS.filter((item) => checklist[item.key]).length;
  const totalCount = CHECKLIST_ITEMS.length;
  const allComplete = completedCount === totalCount;

  return (
    <div className="bg-onyx-card border border-onyx-line rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-display font-bold text-white">Pre-Viewing Checklist</h3>
        <span className={`chip ${
          allComplete
            ? 'text-status-green border-status-green/40 bg-status-green/10'
            : 'text-status-amber border-status-amber/40 bg-status-amber/10'
        }`}>
          {completedCount}/{totalCount}
        </span>
      </div>
      <ul className="space-y-1.5">
        {CHECKLIST_ITEMS.map((item) => (
          <li key={item.key} className="flex items-center gap-2 text-sm">
            <span className={checklist[item.key] ? 'text-status-green' : 'text-gray-2/40'}>
              {checklist[item.key] ? '✓' : '○'}
            </span>
            <span className={checklist[item.key] ? 'text-white' : 'text-gray-2'}>
              {item.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
