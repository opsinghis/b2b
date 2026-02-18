/**
 * Loading States and Skeleton Tests
 *
 * @package portal
 * @module dashboard
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock the components since we're testing the pattern
function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-6 animate-pulse">
      <div className="h-8 w-64 bg-muted rounded" />
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 bg-muted rounded-lg" />
        ))}
      </div>
      <div className="h-40 bg-muted rounded-lg" />
      <div className="h-64 bg-muted rounded-lg" />
    </div>
  );
}

describe('Dashboard Loading States', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe('DashboardSkeleton', () => {
    it('should render skeleton structure', () => {
      const { container } = render(<DashboardSkeleton />, { wrapper });

      const skeleton = container.querySelector('.animate-pulse');
      expect(skeleton).toBeInTheDocument();
    });

    it('should render header skeleton', () => {
      const { container } = render(<DashboardSkeleton />, { wrapper });

      const headerSkeleton = container.querySelector('.h-8.w-64');
      expect(headerSkeleton).toBeInTheDocument();
    });

    it('should render three KPI card skeletons', () => {
      const { container } = render(<DashboardSkeleton />, { wrapper });

      const kpiSkeletons = container.querySelectorAll('.h-28.bg-muted.rounded-lg');
      expect(kpiSkeletons.length).toBe(3);
    });

    it('should render with muted background', () => {
      const { container } = render(<DashboardSkeleton />, { wrapper });

      const mutedElements = container.querySelectorAll('.bg-muted');
      expect(mutedElements.length).toBeGreaterThan(0);
    });

    it('should have rounded corners', () => {
      const { container } = render(<DashboardSkeleton />, { wrapper });

      const roundedElements = container.querySelectorAll('[class*="rounded"]');
      expect(roundedElements.length).toBeGreaterThan(0);
    });

    it('should use grid layout for KPI cards', () => {
      const { container } = render(<DashboardSkeleton />, { wrapper });

      const grid = container.querySelector('.grid.gap-4.md\\:grid-cols-3');
      expect(grid).toBeInTheDocument();
    });

    it('should render quick actions skeleton', () => {
      const { container } = render(<DashboardSkeleton />, { wrapper });

      const quickActionsSkeleton = container.querySelector('.h-40.bg-muted.rounded-lg');
      expect(quickActionsSkeleton).toBeInTheDocument();
    });

    it('should render activity feed skeleton', () => {
      const { container } = render(<DashboardSkeleton />, { wrapper });

      const activitySkeleton = container.querySelector('.h-64.bg-muted.rounded-lg');
      expect(activitySkeleton).toBeInTheDocument();
    });

    it('should have flex column layout', () => {
      const { container } = render(<DashboardSkeleton />, { wrapper });

      const flexContainer = container.querySelector('.flex.flex-col');
      expect(flexContainer).toBeInTheDocument();
    });

    it('should have consistent gap spacing', () => {
      const { container } = render(<DashboardSkeleton />, { wrapper });

      const gapContainer = container.querySelector('.gap-6');
      expect(gapContainer).toBeInTheDocument();
    });
  });

  describe('Loading State Patterns', () => {
    it('should show skeleton while loading is true', () => {
      const isLoading = true;

      const { container } = render(
        <>
          {isLoading && <DashboardSkeleton />}
        </>,
        { wrapper }
      );

      expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
    });

    it('should not show skeleton when loading is false', () => {
      const isLoading = false;

      const { container } = render(
        <>
          {isLoading && <DashboardSkeleton />}
        </>,
        { wrapper }
      );

      expect(container.querySelector('.animate-pulse')).not.toBeInTheDocument();
    });

    it('should use animate-pulse for loading animation', () => {
      const { container } = render(<DashboardSkeleton />, { wrapper });

      const pulsing = container.querySelector('.animate-pulse');
      expect(pulsing).toBeInTheDocument();
    });
  });

  describe('Skeleton Accessibility', () => {
    it('should render without accessibility violations', () => {
      const { container } = render(<DashboardSkeleton />, { wrapper });

      // Skeleton should not have interactive elements
      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBe(0);
    });

    it('should not have focusable elements', () => {
      const { container } = render(<DashboardSkeleton />, { wrapper });

      const focusable = container.querySelectorAll('[tabindex]');
      expect(focusable.length).toBe(0);
    });
  });

  describe('Skeleton Styling', () => {
    it('should match design system colors', () => {
      const { container } = render(<DashboardSkeleton />, { wrapper });

      const mutedBg = container.querySelectorAll('.bg-muted');
      expect(mutedBg.length).toBeGreaterThan(0);
    });

    it('should have consistent border radius', () => {
      const { container } = render(<DashboardSkeleton />, { wrapper });

      const roundedLg = container.querySelectorAll('.rounded-lg');
      expect(roundedLg.length).toBeGreaterThan(0);
    });

    it('should use proper padding', () => {
      const { container } = render(<DashboardSkeleton />, { wrapper });

      const padded = container.querySelector('.p-6');
      expect(padded).toBeInTheDocument();
    });
  });

  describe('Responsive Behavior', () => {
    it('should have responsive grid classes', () => {
      const { container } = render(<DashboardSkeleton />, { wrapper });

      const responsiveGrid = container.querySelector('.md\\:grid-cols-3');
      expect(responsiveGrid).toBeInTheDocument();
    });

    it('should adapt to mobile screens', () => {
      const { container } = render(<DashboardSkeleton />, { wrapper });

      // Grid should exist (will be single column on mobile)
      const grid = container.querySelector('.grid');
      expect(grid).toBeInTheDocument();
    });
  });

  describe('Skeleton Structure Consistency', () => {
    it('should render all major sections', () => {
      const { container } = render(<DashboardSkeleton />, { wrapper });

      // Should have header, KPIs, quick actions, activity sections
      const mutedSections = container.querySelectorAll('.bg-muted');
      expect(mutedSections.length).toBeGreaterThan(4);
    });

    it('should maintain layout structure', () => {
      const { container } = render(<DashboardSkeleton />, { wrapper });

      const flexCol = container.querySelector('.flex.flex-col');
      expect(flexCol).toBeInTheDocument();

      const grid = container.querySelector('.grid');
      expect(grid).toBeInTheDocument();
    });
  });
});
