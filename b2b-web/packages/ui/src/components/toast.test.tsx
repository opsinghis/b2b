/**
 * Toast Component Tests
 *
 * @package ui
 * @component Toast
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { ToastProvider, useToast } from './toast';

// Helper component to test useToast hook
function ToastConsumer() {
  const { addToast, toasts } = useToast();

  return (
    <div>
      <button
        onClick={() =>
          addToast({
            title: 'Test Toast',
            description: 'This is a test',
          })
        }
      >
        Show Toast
      </button>
      <button
        onClick={() =>
          addToast({
            title: 'Success',
            variant: 'success',
          })
        }
      >
        Show Success
      </button>
      <button
        onClick={() =>
          addToast({
            title: 'Error',
            variant: 'error',
          })
        }
      >
        Show Error
      </button>
      <button
        onClick={() =>
          addToast({
            title: 'Warning',
            variant: 'warning',
          })
        }
      >
        Show Warning
      </button>
      <div data-testid="toast-count">{toasts.length}</div>
    </div>
  );
}

describe('Toast Component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('ToastProvider', () => {
    it('should render children', () => {
      render(
        <ToastProvider>
          <div>Child content</div>
        </ToastProvider>
      );

      expect(screen.getByText('Child content')).toBeInTheDocument();
    });

    it('should provide toast context', () => {
      render(
        <ToastProvider>
          <ToastConsumer />
        </ToastProvider>
      );

      // Should not throw error
      expect(screen.getByText('Show Toast')).toBeInTheDocument();
    });

    it('should start with no toasts', () => {
      render(
        <ToastProvider>
          <ToastConsumer />
        </ToastProvider>
      );

      expect(screen.getByTestId('toast-count')).toHaveTextContent('0');
    });
  });

  describe('useToast hook', () => {
    it('should throw error when used outside provider', () => {
      // Suppress console error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<ToastConsumer />);
      }).toThrow('useToast must be used within a ToastProvider');

      consoleSpy.mockRestore();
    });
  });

  describe('addToast', () => {
    it('should add toast when button is clicked', async () => {
      const user = userEvent.setup({ delay: null });

      render(
        <ToastProvider>
          <ToastConsumer />
        </ToastProvider>
      );

      await user.click(screen.getByText('Show Toast'));

      expect(screen.getByText('Test Toast')).toBeInTheDocument();
      expect(screen.getByText('This is a test')).toBeInTheDocument();
    });

    it('should add multiple toasts', async () => {
      const user = userEvent.setup({ delay: null });

      render(
        <ToastProvider>
          <ToastConsumer />
        </ToastProvider>
      );

      await user.click(screen.getByText('Show Toast'));
      await user.click(screen.getByText('Show Success'));

      expect(screen.getByText('Test Toast')).toBeInTheDocument();
      expect(screen.getByText('Success')).toBeInTheDocument();
      expect(screen.getByTestId('toast-count')).toHaveTextContent('2');
    });

    it('should assign unique IDs to toasts', async () => {
      const user = userEvent.setup({ delay: null });

      render(
        <ToastProvider>
          <ToastConsumer />
        </ToastProvider>
      );

      await user.click(screen.getByText('Show Toast'));
      await user.click(screen.getByText('Show Toast'));

      // Both toasts should be visible with same content but different IDs
      const toasts = screen.getAllByText('Test Toast');
      expect(toasts).toHaveLength(2);
    });
  });

  describe('Toast Variants', () => {
    it('should display default variant toast', async () => {
      const user = userEvent.setup({ delay: null });

      const { container } = render(
        <ToastProvider>
          <ToastConsumer />
        </ToastProvider>
      );

      await user.click(screen.getByText('Show Toast'));

      // Find toast container with border class
      const toast = container.querySelector('.border.rounded-md');
      expect(toast).toHaveClass('bg-background');
    });

    it('should display success variant toast', async () => {
      const user = userEvent.setup({ delay: null });

      const { container } = render(
        <ToastProvider>
          <ToastConsumer />
        </ToastProvider>
      );

      await user.click(screen.getByText('Show Success'));

      const toast = container.querySelector('.border-green-200');
      expect(toast).toHaveClass('bg-green-50');
    });

    it('should display error variant toast', async () => {
      const user = userEvent.setup({ delay: null });

      const { container } = render(
        <ToastProvider>
          <ToastConsumer />
        </ToastProvider>
      );

      await user.click(screen.getByText('Show Error'));

      const toast = container.querySelector('.border-red-200');
      expect(toast).toHaveClass('bg-red-50');
    });

    it('should display warning variant toast', async () => {
      const user = userEvent.setup({ delay: null });

      const { container } = render(
        <ToastProvider>
          <ToastConsumer />
        </ToastProvider>
      );

      await user.click(screen.getByText('Show Warning'));

      const toast = container.querySelector('.border-amber-200');
      expect(toast).toHaveClass('bg-amber-50');
    });
  });

  describe('Toast Content', () => {
    it('should display title only', async () => {
      const user = userEvent.setup({ delay: null });

      function TitleOnlyConsumer() {
        const { addToast } = useToast();
        return (
          <button onClick={() => addToast({ title: 'Title Only' })}>
            Show
          </button>
        );
      }

      render(
        <ToastProvider>
          <TitleOnlyConsumer />
        </ToastProvider>
      );

      await user.click(screen.getByText('Show'));

      expect(screen.getByText('Title Only')).toBeInTheDocument();
    });

    it('should display description only', async () => {
      const user = userEvent.setup({ delay: null });

      function DescOnlyConsumer() {
        const { addToast } = useToast();
        return (
          <button onClick={() => addToast({ description: 'Description only' })}>
            Show
          </button>
        );
      }

      render(
        <ToastProvider>
          <DescOnlyConsumer />
        </ToastProvider>
      );

      await user.click(screen.getByText('Show'));

      expect(screen.getByText('Description only')).toBeInTheDocument();
    });

    it('should display both title and description', async () => {
      const user = userEvent.setup({ delay: null });

      render(
        <ToastProvider>
          <ToastConsumer />
        </ToastProvider>
      );

      await user.click(screen.getByText('Show Toast'));

      expect(screen.getByText('Test Toast')).toBeInTheDocument();
      expect(screen.getByText('This is a test')).toBeInTheDocument();
    });
  });

  describe('Toast Icons', () => {
    it('should show icon for default variant', async () => {
      const user = userEvent.setup({ delay: null });

      const { container } = render(
        <ToastProvider>
          <ToastConsumer />
        </ToastProvider>
      );

      await user.click(screen.getByText('Show Toast'));

      // Check for icon presence (lucide-react icons create svg elements)
      const icons = container.querySelectorAll('svg');
      expect(icons.length).toBeGreaterThan(0);
    });

    it('should show icon for success variant', async () => {
      const user = userEvent.setup({ delay: null });

      const { container } = render(
        <ToastProvider>
          <ToastConsumer />
        </ToastProvider>
      );

      await user.click(screen.getByText('Show Success'));

      const icons = container.querySelectorAll('svg');
      expect(icons.length).toBeGreaterThan(0);
    });
  });

  describe('removeToast', () => {
    it('should have close button for each toast', async () => {
      const user = userEvent.setup({ delay: null });

      render(
        <ToastProvider>
          <ToastConsumer />
        </ToastProvider>
      );

      await user.click(screen.getByText('Show Toast'));

      expect(screen.getByText('Test Toast')).toBeInTheDocument();

      // Should have close buttons
      const allButtons = screen.getAllByRole('button');
      expect(allButtons.length).toBeGreaterThan(4); // 4 show buttons + close button(s)
    });

    it('should show multiple toasts with close buttons', async () => {
      const user = userEvent.setup({ delay: null });

      render(
        <ToastProvider>
          <ToastConsumer />
        </ToastProvider>
      );

      await user.click(screen.getByText('Show Toast'));
      await user.click(screen.getByText('Show Success'));

      expect(screen.getByText('Test Toast')).toBeInTheDocument();
      expect(screen.getByText('Success')).toBeInTheDocument();

      // Should have multiple close buttons
      const allButtons = screen.getAllByRole('button');
      expect(allButtons.length).toBeGreaterThan(5); // 4 show buttons + 2 close buttons
    });
  });

  describe('Auto-dismiss', () => {
    it('should show toast initially', async () => {
      const user = userEvent.setup({ delay: null });

      render(
        <ToastProvider>
          <ToastConsumer />
        </ToastProvider>
      );

      await user.click(screen.getByText('Show Toast'));

      expect(screen.getByText('Test Toast')).toBeInTheDocument();
    });

    it('should accept custom duration prop', async () => {
      const user = userEvent.setup({ delay: null });

      function CustomDurationConsumer() {
        const { addToast } = useToast();
        return (
          <button
            onClick={() =>
              addToast({ title: 'Quick Toast', duration: 1000 })
            }
          >
            Show Quick
          </button>
        );
      }

      render(
        <ToastProvider>
          <CustomDurationConsumer />
        </ToastProvider>
      );

      await user.click(screen.getByText('Show Quick'));

      // Should show initially
      expect(screen.getByText('Quick Toast')).toBeInTheDocument();
    });

    it('should persist toast before duration completes', async () => {
      const user = userEvent.setup({ delay: null });

      render(
        <ToastProvider>
          <ToastConsumer />
        </ToastProvider>
      );

      await user.click(screen.getByText('Show Toast'));

      expect(screen.getByText('Test Toast')).toBeInTheDocument();

      // Advance time but not enough to dismiss
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      // Should still be visible
      expect(screen.getByText('Test Toast')).toBeInTheDocument();
    });
  });

  describe('Toast Positioning', () => {
    it('should render toast when added', async () => {
      const user = userEvent.setup({ delay: null });

      render(
        <ToastProvider>
          <ToastConsumer />
        </ToastProvider>
      );

      await user.click(screen.getByText('Show Toast'));

      // Toast should be rendered
      expect(screen.getByText('Test Toast')).toBeInTheDocument();
    });

    it('should not show toasts initially', () => {
      const { container } = render(
        <ToastProvider>
          <ToastConsumer />
        </ToastProvider>
      );

      // No toasts initially
      expect(screen.queryByText('Test Toast')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have close button for each toast', async () => {
      const user = userEvent.setup({ delay: null });

      render(
        <ToastProvider>
          <ToastConsumer />
        </ToastProvider>
      );

      await user.click(screen.getByText('Show Toast'));

      // Should have close button (multiple buttons: show buttons + close button)
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(4); // 4 show buttons + close button
    });

    it('should be keyboard accessible', async () => {
      const user = userEvent.setup({ delay: null });

      render(
        <ToastProvider>
          <ToastConsumer />
        </ToastProvider>
      );

      await user.click(screen.getByText('Show Toast'));
      await user.keyboard('{Tab}');

      // Close button should be focusable
      expect(document.activeElement).toBeInstanceOf(HTMLButtonElement);
    });
  });

  describe('Edge Cases', () => {
    it('should handle showing many toasts', async () => {
      const user = userEvent.setup({ delay: null });

      render(
        <ToastProvider>
          <ToastConsumer />
        </ToastProvider>
      );

      // Show multiple toasts quickly
      await user.click(screen.getByText('Show Toast'));
      await user.click(screen.getByText('Show Success'));
      await user.click(screen.getByText('Show Error'));
      await user.click(screen.getByText('Show Warning'));

      expect(screen.getByTestId('toast-count')).toHaveTextContent('4');
    });

    it('should handle empty toast (no title or description)', async () => {
      const user = userEvent.setup({ delay: null });

      function EmptyToastConsumer() {
        const { addToast } = useToast();
        return <button onClick={() => addToast({})}>Show Empty</button>;
      }

      render(
        <ToastProvider>
          <EmptyToastConsumer />
        </ToastProvider>
      );

      // Should not crash
      await user.click(screen.getByText('Show Empty'));

      // Toast should still render with icon and close button
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(1);
    });
  });
});
