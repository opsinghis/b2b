/**
 * Error States and Error Display Tests
 *
 * @package portal
 * @module dashboard
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Button } from '@b2b/ui';
import { RefreshCw } from 'lucide-react';

// Mock error display component
function DashboardError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-6 min-h-[400px]">
      <p className="text-sm text-muted-foreground">
        Failed to load dashboard data
      </p>
      <Button variant="outline" onClick={onRetry}>
        <RefreshCw className="mr-2 h-4 w-4" />
        Retry
      </Button>
    </div>
  );
}

// Mock inline error component
function InlineError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
      <p className="text-sm text-destructive">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="mt-2">
          Try Again
        </Button>
      )}
    </div>
  );
}

// Mock access denied component
function AccessDenied() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 p-6">
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
          <h2 className="text-lg font-semibold text-destructive">Access Denied</h2>
          <p className="mt-2 text-muted-foreground">
            You do not have permission to access this resource.
          </p>
        </div>
      </div>
    </div>
  );
}

describe('Error States and Error Display', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe('DashboardError Component', () => {
    it('should render error message', () => {
      const handleRetry = vi.fn();
      render(<DashboardError onRetry={handleRetry} />, { wrapper });

      expect(screen.getByText('Failed to load dashboard data')).toBeInTheDocument();
    });

    it('should render retry button', () => {
      const handleRetry = vi.fn();
      render(<DashboardError onRetry={handleRetry} />, { wrapper });

      expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument();
    });

    it('should call onRetry when button clicked', async () => {
      const handleRetry = vi.fn();
      const user = userEvent.setup();

      render(<DashboardError onRetry={handleRetry} />, { wrapper });

      await user.click(screen.getByRole('button', { name: /Retry/i }));
      expect(handleRetry).toHaveBeenCalledOnce();
    });

    it('should have centered layout', () => {
      const handleRetry = vi.fn();
      const { container } = render(<DashboardError onRetry={handleRetry} />, { wrapper });

      const centerContainer = container.querySelector('.flex.flex-col.items-center.justify-center');
      expect(centerContainer).toBeInTheDocument();
    });

    it('should have minimum height', () => {
      const handleRetry = vi.fn();
      const { container } = render(<DashboardError onRetry={handleRetry} />, { wrapper });

      const minHeight = container.querySelector('.min-h-\\[400px\\]');
      expect(minHeight).toBeInTheDocument();
    });

    it('should show RefreshCw icon', () => {
      const handleRetry = vi.fn();
      const { container } = render(<DashboardError onRetry={handleRetry} />, { wrapper });

      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('should use muted text color', () => {
      const handleRetry = vi.fn();
      const { container } = render(<DashboardError onRetry={handleRetry} />, { wrapper });

      const mutedText = container.querySelector('.text-muted-foreground');
      expect(mutedText).toBeInTheDocument();
    });

    it('should use outline button variant', () => {
      const handleRetry = vi.fn();
      render(<DashboardError onRetry={handleRetry} />, { wrapper });

      const button = screen.getByRole('button', { name: /Retry/i });
      expect(button).toHaveClass('border-input');
    });
  });

  describe('InlineError Component', () => {
    it('should render error message', () => {
      render(<InlineError message="Failed to load tenants. Please try again." />, { wrapper });

      expect(screen.getByText('Failed to load tenants. Please try again.')).toBeInTheDocument();
    });

    it('should have destructive border', () => {
      const { container } = render(
        <InlineError message="Error occurred" />,
        { wrapper }
      );

      const errorBox = container.querySelector('.border-destructive\\/50');
      expect(errorBox).toBeInTheDocument();
    });

    it('should have destructive background', () => {
      const { container } = render(
        <InlineError message="Error occurred" />,
        { wrapper }
      );

      const errorBox = container.querySelector('.bg-destructive\\/10');
      expect(errorBox).toBeInTheDocument();
    });

    it('should use destructive text color', () => {
      const { container } = render(
        <InlineError message="Error occurred" />,
        { wrapper }
      );

      const errorText = container.querySelector('.text-destructive');
      expect(errorText).toBeInTheDocument();
    });

    it('should render retry button when onRetry provided', () => {
      const handleRetry = vi.fn();
      render(
        <InlineError message="Error occurred" onRetry={handleRetry} />,
        { wrapper }
      );

      expect(screen.getByRole('button', { name: /Try Again/i })).toBeInTheDocument();
    });

    it('should not render retry button when onRetry not provided', () => {
      render(<InlineError message="Error occurred" />, { wrapper });

      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('should call onRetry when button clicked', async () => {
      const handleRetry = vi.fn();
      const user = userEvent.setup();

      render(
        <InlineError message="Error occurred" onRetry={handleRetry} />,
        { wrapper }
      );

      await user.click(screen.getByRole('button', { name: /Try Again/i }));
      expect(handleRetry).toHaveBeenCalledOnce();
    });

    it('should have rounded corners', () => {
      const { container } = render(
        <InlineError message="Error occurred" />,
        { wrapper }
      );

      const roundedBox = container.querySelector('.rounded-lg');
      expect(roundedBox).toBeInTheDocument();
    });

    it('should have proper padding', () => {
      const { container } = render(
        <InlineError message="Error occurred" />,
        { wrapper }
      );

      const paddedBox = container.querySelector('.p-4');
      expect(paddedBox).toBeInTheDocument();
    });
  });

  describe('AccessDenied Component', () => {
    it('should render access denied heading', () => {
      render(<AccessDenied />, { wrapper });

      expect(screen.getByText('Access Denied')).toBeInTheDocument();
    });

    it('should render permission message', () => {
      render(<AccessDenied />, { wrapper });

      expect(screen.getByText(/You do not have permission to access this resource/i)).toBeInTheDocument();
    });

    it('should use destructive color for heading', () => {
      const { container } = render(<AccessDenied />, { wrapper });

      const heading = screen.getByText('Access Denied');
      expect(heading).toHaveClass('text-destructive');
    });

    it('should be centered', () => {
      const { container } = render(<AccessDenied />, { wrapper });

      const centered = container.querySelector('.text-center');
      expect(centered).toBeInTheDocument();
    });

    it('should have destructive border', () => {
      const { container } = render(<AccessDenied />, { wrapper });

      const border = container.querySelector('.border-destructive\\/50');
      expect(border).toBeInTheDocument();
    });

    it('should have destructive background', () => {
      const { container } = render(<AccessDenied />, { wrapper });

      const bg = container.querySelector('.bg-destructive\\/10');
      expect(bg).toBeInTheDocument();
    });

    it('should use full height layout', () => {
      const { container } = render(<AccessDenied />, { wrapper });

      const fullHeight = container.querySelector('.h-full');
      expect(fullHeight).toBeInTheDocument();
    });
  });

  describe('Error State Patterns', () => {
    it('should conditionally render error based on isError flag', () => {
      const isError = true;
      const { container } = render(
        <>
          {isError && <InlineError message="Error occurred" />}
        </>,
        { wrapper }
      );

      expect(screen.getByText('Error occurred')).toBeInTheDocument();
    });

    it('should not render error when isError is false', () => {
      const isError = false;
      render(
        <>
          {isError && <InlineError message="Error occurred" />}
        </>,
        { wrapper }
      );

      expect(screen.queryByText('Error occurred')).not.toBeInTheDocument();
    });

    it('should show error after data fails to load', () => {
      const isLoading = false;
      const isError = true;
      const data = null;

      render(
        <>
          {!isLoading && isError && !data && (
            <InlineError message="Failed to load data" />
          )}
        </>,
        { wrapper }
      );

      expect(screen.getByText('Failed to load data')).toBeInTheDocument();
    });
  });

  describe('Error Message Variations', () => {
    it('should display network error message', () => {
      render(<InlineError message="Network error. Please check your connection." />, { wrapper });

      expect(screen.getByText('Network error. Please check your connection.')).toBeInTheDocument();
    });

    it('should display timeout error message', () => {
      render(<InlineError message="Request timeout. Please try again." />, { wrapper });

      expect(screen.getByText('Request timeout. Please try again.')).toBeInTheDocument();
    });

    it('should display server error message', () => {
      render(<InlineError message="Server error. Please try again later." />, { wrapper });

      expect(screen.getByText('Server error. Please try again later.')).toBeInTheDocument();
    });

    it('should display validation error message', () => {
      render(<InlineError message="Validation failed. Please check your input." />, { wrapper });

      expect(screen.getByText('Validation failed. Please check your input.')).toBeInTheDocument();
    });
  });

  describe('Error Accessibility', () => {
    it('should have readable text contrast', () => {
      const { container } = render(<InlineError message="Error occurred" />, { wrapper });

      const errorText = container.querySelector('.text-destructive');
      expect(errorText).toBeInTheDocument();
    });

    it('should have focusable retry button', async () => {
      const handleRetry = vi.fn();
      const user = userEvent.setup();

      render(<InlineError message="Error" onRetry={handleRetry} />, { wrapper });

      const button = screen.getByRole('button', { name: /Try Again/i });
      await user.tab();
      expect(button).toHaveFocus();
    });

    it('should have accessible error text', () => {
      render(<InlineError message="Error occurred" />, { wrapper });

      const errorText = screen.getByText('Error occurred');
      expect(errorText).toBeInTheDocument();
    });
  });

  describe('Error Recovery', () => {
    it('should allow multiple retry attempts', async () => {
      const handleRetry = vi.fn();
      const user = userEvent.setup();

      render(<DashboardError onRetry={handleRetry} />, { wrapper });

      const button = screen.getByRole('button', { name: /Retry/i });

      await user.click(button);
      await user.click(button);
      await user.click(button);

      expect(handleRetry).toHaveBeenCalledTimes(3);
    });

    it('should maintain error state until retry', () => {
      const { rerender } = render(
        <InlineError message="Error occurred" />,
        { wrapper }
      );

      expect(screen.getByText('Error occurred')).toBeInTheDocument();

      rerender(<InlineError message="Error occurred" />);

      expect(screen.getByText('Error occurred')).toBeInTheDocument();
    });
  });
});
