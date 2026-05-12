import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TweaksPanel } from '../tweaks-panel';
import { DEFAULT_PREFERENCES } from '@/lib/nurture/types';
import type { NurturePreferences } from '@/lib/nurture/types';

describe('TweaksPanel', () => {
  const defaultProps = {
    preferences: { ...DEFAULT_PREFERENCES },
    onPreferenceChange: vi.fn(),
  };

  function renderPanel(overrides?: Partial<{ preferences: NurturePreferences; onPreferenceChange: (key: keyof NurturePreferences, value: any) => void }>) {
    return render(<TweaksPanel {...defaultProps} {...overrides} />);
  }

  // ─── Expand / Collapse Behavior ──────────────────────────────────────────

  it('renders expanded state by default (when tweaksPanelCollapsed is false)', () => {
    renderPanel();
    // Should show the "Tweaks" heading and all toggle labels
    expect(screen.getByText('Tweaks')).toBeInTheDocument();
    expect(screen.getByText('Row Density')).toBeInTheDocument();
    expect(screen.getByText('Group By')).toBeInTheDocument();
    expect(screen.getByText('Show Last Activity')).toBeInTheDocument();
  });

  it('renders collapsed state (only settings icon) when tweaksPanelCollapsed is true', () => {
    renderPanel({
      preferences: { ...DEFAULT_PREFERENCES, tweaksPanelCollapsed: true },
    });
    // Should show the expand button but not the toggle labels
    expect(screen.getByRole('button', { name: /expand display preferences/i })).toBeInTheDocument();
    expect(screen.queryByText('Tweaks')).not.toBeInTheDocument();
    expect(screen.queryByText('Row Density')).not.toBeInTheDocument();
  });

  it('clicking collapse button calls onPreferenceChange with ("tweaksPanelCollapsed", true)', () => {
    const onPreferenceChange = vi.fn();
    renderPanel({ onPreferenceChange });

    const collapseButton = screen.getByRole('button', { name: /collapse display preferences/i });
    fireEvent.click(collapseButton);
    expect(onPreferenceChange).toHaveBeenCalledWith('tweaksPanelCollapsed', true);
  });

  it('clicking expand button (settings icon in collapsed state) calls onPreferenceChange with ("tweaksPanelCollapsed", false)', () => {
    const onPreferenceChange = vi.fn();
    renderPanel({
      preferences: { ...DEFAULT_PREFERENCES, tweaksPanelCollapsed: true },
      onPreferenceChange,
    });

    const expandButton = screen.getByRole('button', { name: /expand display preferences/i });
    fireEvent.click(expandButton);
    expect(onPreferenceChange).toHaveBeenCalledWith('tweaksPanelCollapsed', false);
  });

  // ─── Row Density Toggle ──────────────────────────────────────────────────

  it('Row Density toggle: clicking "Compact" calls onPreferenceChange("density", "compact")', () => {
    const onPreferenceChange = vi.fn();
    renderPanel({ onPreferenceChange });

    const compactButton = screen.getByRole('button', { name: /Row Density: Compact/i });
    fireEvent.click(compactButton);
    expect(onPreferenceChange).toHaveBeenCalledWith('density', 'compact');
  });

  it('Row Density toggle: clicking "Comfortable" calls onPreferenceChange("density", "comfortable")', () => {
    const onPreferenceChange = vi.fn();
    renderPanel({
      preferences: { ...DEFAULT_PREFERENCES, density: 'compact' },
      onPreferenceChange,
    });

    const comfortableButton = screen.getByRole('button', { name: /Row Density: Comfortable/i });
    fireEvent.click(comfortableButton);
    expect(onPreferenceChange).toHaveBeenCalledWith('density', 'comfortable');
  });

  // ─── Group By Toggle ─────────────────────────────────────────────────────

  it('Group By toggle: clicking "Playbook" calls onPreferenceChange("groupBy", "playbook")', () => {
    const onPreferenceChange = vi.fn();
    renderPanel({ onPreferenceChange });

    const playbookButton = screen.getByRole('button', { name: /Group By: Playbook/i });
    fireEvent.click(playbookButton);
    expect(onPreferenceChange).toHaveBeenCalledWith('groupBy', 'playbook');
  });

  it('Group By toggle: clicking "Urgency" calls onPreferenceChange("groupBy", "urgency")', () => {
    const onPreferenceChange = vi.fn();
    renderPanel({
      preferences: { ...DEFAULT_PREFERENCES, groupBy: 'playbook' },
      onPreferenceChange,
    });

    const urgencyButton = screen.getByRole('button', { name: /Group By: Urgency/i });
    fireEvent.click(urgencyButton);
    expect(onPreferenceChange).toHaveBeenCalledWith('groupBy', 'urgency');
  });

  // ─── Show Last Activity Toggle ───────────────────────────────────────────

  it('Show Last Activity toggle: clicking "Off" calls onPreferenceChange("showLastActivity", false)', () => {
    const onPreferenceChange = vi.fn();
    renderPanel({ onPreferenceChange });

    const offButton = screen.getByRole('button', { name: /Show Last Activity: Off/i });
    fireEvent.click(offButton);
    expect(onPreferenceChange).toHaveBeenCalledWith('showLastActivity', false);
  });

  it('Show Last Activity toggle: clicking "On" calls onPreferenceChange("showLastActivity", true)', () => {
    const onPreferenceChange = vi.fn();
    renderPanel({
      preferences: { ...DEFAULT_PREFERENCES, showLastActivity: false },
      onPreferenceChange,
    });

    const onButton = screen.getByRole('button', { name: /Show Last Activity: On/i });
    fireEvent.click(onButton);
    expect(onPreferenceChange).toHaveBeenCalledWith('showLastActivity', true);
  });

  // ─── Active / Inactive Toggle Styling ────────────────────────────────────

  it('active toggle option has brand blue background (bg-brand class)', () => {
    renderPanel();
    // "Comfortable" is the default active option for Row Density
    const comfortableButton = screen.getByRole('button', { name: /Row Density: Comfortable/i });
    expect(comfortableButton.className).toContain('bg-brand');
  });

  it('inactive toggle option has onyx-raised background (bg-onyx-raised class)', () => {
    renderPanel();
    // "Compact" is the inactive option for Row Density when default is "comfortable"
    const compactButton = screen.getByRole('button', { name: /Row Density: Compact/i });
    expect(compactButton.className).toContain('bg-onyx-raised');
  });
});
