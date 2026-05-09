import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PipelineBoard } from '../pipeline-board';
import type { PipelineStage } from '@propagent/shared';

// --- Mocks ---

const mockRefresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

const mockAddToast = vi.fn();
vi.mock('@/components/ui/toast', () => ({
  useToast: () => ({ addToast: mockAddToast }),
}));

const mockUpdate = vi.fn();
const mockEq = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: () => ({
      update: (data: Record<string, unknown>) => {
        mockUpdate(data);
        return { eq: (col: string, val: string) => { mockEq(col, val); return mockEq._result; } };
      },
    }),
  }),
}));

// Capture the onDragEnd handler from DndContext so we can invoke it directly
let capturedOnDragEnd: ((event: any) => void) | null = null;
let capturedOnDragStart: ((event: any) => void) | null = null;

vi.mock('@dnd-kit/core', () => {
  const actual = {
    closestCenter: vi.fn(),
    useSensor: vi.fn((sensor: any, opts?: any) => ({ sensor, opts })),
    useSensors: vi.fn((...sensors: any[]) => sensors),
    useDroppable: vi.fn(({ id }: { id: string }) => ({
      setNodeRef: vi.fn(),
      isOver: false,
    })),
    useDraggable: vi.fn(({ id }: { id: string }) => ({
      attributes: { role: 'button', tabIndex: 0, 'aria-roledescription': 'draggable' },
      listeners: {},
      setNodeRef: vi.fn(),
      isDragging: false,
    })),
    PointerSensor: class PointerSensor {},
    TouchSensor: class TouchSensor {},
    KeyboardSensor: class KeyboardSensor {},
    DndContext: ({ children, onDragEnd, onDragStart, onDragCancel }: any) => {
      capturedOnDragEnd = onDragEnd;
      capturedOnDragStart = onDragStart;
      return <div data-testid="dnd-context">{children}</div>;
    },
    DragOverlay: ({ children }: any) => (
      <div data-testid="drag-overlay">{children}</div>
    ),
  };
  return actual;
});

// Mock next/link used by LeadCard
vi.mock('next/link', () => ({
  default: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

// --- Test Data ---

function createLead(overrides: Partial<{
  id: string;
  status: PipelineStage;
  contactName: string;
}> = {}) {
  return {
    id: overrides.id ?? 'lead-1',
    status: overrides.status ?? 'new_lead' as PipelineStage,
    deal_type: 'purchase',
    urgency: 'warm',
    source: 'referral',
    intent_score: 3,
    verification_score: null,
    eligibility_risk: false,
    last_activity_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    contact: {
      full_name: overrides.contactName ?? 'John Doe',
      phone: '+65 9123 4567',
      email: 'john@example.com',
    },
    tasks: [],
  };
}

const stages = [
  { key: 'new_lead' as PipelineStage, label: 'New Lead', order: 1 },
  { key: 'contacted' as PipelineStage, label: 'Contacted', order: 2 },
  { key: 'qualified' as PipelineStage, label: 'Qualified', order: 3 },
  { key: 'viewing_booked' as PipelineStage, label: 'Viewing Booked', order: 4 },
  { key: 'viewing_done' as PipelineStage, label: 'Viewing Done', order: 5 },
  { key: 'negotiating' as PipelineStage, label: 'Negotiating', order: 6 },
  { key: 'otp_loi_issued' as PipelineStage, label: 'OTP / LOI Issued', order: 7 },
];

// --- Tests ---

describe('PipelineBoard integration: persistence and error handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedOnDragEnd = null;
    capturedOnDragStart = null;
    // Default: Supabase update succeeds
    mockEq._result = Promise.resolve({ error: null });
  });

  describe('Successful drop - persistence (Req 3.2, 4.1, 4.2)', () => {
    it('calls supabase .update() with correct stage key and lead ID on drop', async () => {
      const lead = createLead({ id: 'lead-abc', status: 'new_lead' });
      render(<PipelineBoard leads={[lead]} stages={stages} />);

      expect(capturedOnDragEnd).not.toBeNull();

      // Simulate a drag end event: drop lead-abc onto "contacted" column
      await act(async () => {
        capturedOnDragEnd!({
          active: { id: 'lead-abc' },
          over: { id: 'contacted' },
        });
      });

      // Verify .update() was called with correct status and last_activity_at
      expect(mockUpdate).toHaveBeenCalledTimes(1);
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'contacted',
          last_activity_at: expect.any(String),
        })
      );

      // Verify .eq() was called with correct lead ID
      expect(mockEq).toHaveBeenCalledWith('id', 'lead-abc');
    });

    it('calls router.refresh() after successful Supabase update', async () => {
      const lead = createLead({ id: 'lead-xyz', status: 'new_lead' });
      mockEq._result = Promise.resolve({ error: null });

      render(<PipelineBoard leads={[lead]} stages={stages} />);

      await act(async () => {
        capturedOnDragEnd!({
          active: { id: 'lead-xyz' },
          over: { id: 'qualified' },
        });
      });

      await waitFor(() => {
        expect(mockRefresh).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Error handling - revert and toast (Req 3.3, 4.2)', () => {
    it('reverts localLeads and shows error toast when Supabase returns an error', async () => {
      const lead = createLead({ id: 'lead-err', status: 'new_lead', contactName: 'Jane Smith' });
      mockEq._result = Promise.resolve({ error: { message: 'DB error' } });

      render(<PipelineBoard leads={[lead]} stages={stages} />);

      await act(async () => {
        capturedOnDragEnd!({
          active: { id: 'lead-err' },
          over: { id: 'negotiating' },
        });
      });

      // Verify error toast is displayed
      await waitFor(() => {
        expect(mockAddToast).toHaveBeenCalledWith(
          'Failed to update lead stage. Please try again.',
          'error'
        );
      });

      // Verify router.refresh() was NOT called
      expect(mockRefresh).not.toHaveBeenCalled();

      // Verify the lead is still rendered in the "New Lead" column
      // (the card should show the contact name, confirming it reverted)
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });
  });

  describe('Same-column drop - no-op (Req 2.3)', () => {
    it('does not call Supabase when lead is dropped on its current column', async () => {
      const lead = createLead({ id: 'lead-same', status: 'contacted' });
      render(<PipelineBoard leads={[lead]} stages={stages} />);

      await act(async () => {
        capturedOnDragEnd!({
          active: { id: 'lead-same' },
          over: { id: 'contacted' }, // same column
        });
      });

      // No Supabase call should be made
      expect(mockUpdate).not.toHaveBeenCalled();
      expect(mockEq).not.toHaveBeenCalled();
      expect(mockRefresh).not.toHaveBeenCalled();
      expect(mockAddToast).not.toHaveBeenCalled();
    });

    it('does not call Supabase when drop has no target (over is null)', async () => {
      const lead = createLead({ id: 'lead-null', status: 'new_lead' });
      render(<PipelineBoard leads={[lead]} stages={stages} />);

      await act(async () => {
        capturedOnDragEnd!({
          active: { id: 'lead-null' },
          over: null,
        });
      });

      expect(mockUpdate).not.toHaveBeenCalled();
      expect(mockRefresh).not.toHaveBeenCalled();
    });
  });
});
