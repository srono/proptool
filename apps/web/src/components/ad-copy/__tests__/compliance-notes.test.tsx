import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ComplianceNotes } from '../compliance-notes';
import type { ComplianceWarning } from '@/lib/ai/ad-copy-types';

// --- Helpers ---

const sampleWarnings: ComplianceWarning[] = [
  {
    phrase: 'best deal',
    category: 'unsupported_superlative',
    message: 'Unsupported superlative claim',
  },
  {
    phrase: 'guaranteed 5% return',
    category: 'misleading_claim',
    message: 'Misleading claim about returns',
  },
];

// --- Tests ---

describe('ComplianceNotes', () => {
  describe('Warning display (Req 6.5)', () => {
    it('displays warnings with flagged phrase quoted', () => {
      render(<ComplianceNotes warnings={sampleWarnings} checkFailed={false} />);
      expect(screen.getByText(/best deal/)).toBeInTheDocument();
      expect(screen.getByText(/guaranteed 5% return/)).toBeInTheDocument();
    });

    it('displays the compliance category for each warning', () => {
      render(<ComplianceNotes warnings={sampleWarnings} checkFailed={false} />);
      expect(screen.getByText(/Unsupported Superlative/)).toBeInTheDocument();
      expect(screen.getByText(/Misleading Claim/)).toBeInTheDocument();
    });

    it('displays the warning count in the header', () => {
      render(<ComplianceNotes warnings={sampleWarnings} checkFailed={false} />);
      expect(screen.getByText(/Compliance Warnings \(2\)/)).toBeInTheDocument();
    });

    it('displays discriminatory language category correctly', () => {
      const warnings: ComplianceWarning[] = [
        {
          phrase: 'no families',
          category: 'discriminatory_language',
          message: 'Discriminatory language',
        },
      ];
      render(<ComplianceNotes warnings={warnings} checkFailed={false} />);
      expect(screen.getByText(/Discriminatory Language/)).toBeInTheDocument();
    });

    it('displays unverified factual claim category correctly', () => {
      const warnings: ComplianceWarning[] = [
        {
          phrase: '5 min walk to MRT',
          category: 'unverified_factual_claim',
          message: 'Verify before publishing',
        },
      ];
      render(<ComplianceNotes warnings={warnings} checkFailed={false} />);
      expect(screen.getByText(/Unverified Factual Claim/)).toBeInTheDocument();
    });
  });

  describe('Empty state (Req 6.6)', () => {
    it('displays "No compliance issues detected" when warnings array is empty', () => {
      render(<ComplianceNotes warnings={[]} checkFailed={false} />);
      expect(screen.getByText(/no compliance issues detected/i)).toBeInTheDocument();
    });

    it('does not display warning header when no warnings', () => {
      render(<ComplianceNotes warnings={[]} checkFailed={false} />);
      expect(screen.queryByText(/Compliance Warnings/)).not.toBeInTheDocument();
    });
  });

  describe('Fallback warning when check failed (Req 6.7)', () => {
    it('displays fallback warning when checkFailed is true', () => {
      render(<ComplianceNotes warnings={[]} checkFailed={true} />);
      expect(
        screen.getByText(/compliance checking could not be completed/i)
      ).toBeInTheDocument();
    });

    it('displays manual review advice when check failed', () => {
      render(<ComplianceNotes warnings={[]} checkFailed={true} />);
      expect(screen.getByText(/review manually before publishing/i)).toBeInTheDocument();
    });

    it('shows fallback warning even if warnings array has items (checkFailed takes priority)', () => {
      render(<ComplianceNotes warnings={sampleWarnings} checkFailed={true} />);
      expect(
        screen.getByText(/compliance checking could not be completed/i)
      ).toBeInTheDocument();
      // Should not show individual warnings when check failed
      expect(screen.queryByText(/best deal/)).not.toBeInTheDocument();
    });
  });
});
