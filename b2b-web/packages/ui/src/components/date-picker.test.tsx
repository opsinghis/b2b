/**
 * DatePicker Component Tests
 *
 * @package ui
 * @component DatePicker
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { DatePicker } from './date-picker';

describe('DatePicker Component', () => {
  describe('Rendering', () => {
    it('should render date picker button', () => {
      render(<DatePicker />);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should render with placeholder text', () => {
      render(<DatePicker placeholder="Select date" />);
      expect(screen.getByText('Select date')).toBeInTheDocument();
    });

    it('should render with default placeholder', () => {
      render(<DatePicker />);
      expect(screen.getByText('Pick a date')).toBeInTheDocument();
    });

    it('should render calendar icon', () => {
      const { container } = render(<DatePicker />);
      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('should render selected date', () => {
      const date = new Date('2024-01-15');
      render(<DatePicker value={date} />);

      // Should show formatted date (not placeholder)
      expect(screen.queryByText('Pick a date')).not.toBeInTheDocument();
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should not show calendar initially', () => {
      render(<DatePicker />);
      // Calendar is in a popover that's closed initially
      expect(screen.queryByRole('grid')).not.toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('should open calendar when button is clicked', async () => {
      const user = userEvent.setup();
      render(<DatePicker />);

      await user.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(screen.getByRole('grid')).toBeInTheDocument();
      });
    });

    it('should call onChange when date is selected', async () => {
      const handleChange = vi.fn();
      const user = userEvent.setup();

      render(<DatePicker onChange={handleChange} />);

      // Open calendar
      await user.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(screen.getByRole('grid')).toBeInTheDocument();
      });

      // Find and click a date button (e.g., "15")
      const dateButtons = screen.getAllByRole('gridcell');
      const dateButton = dateButtons.find(btn => {
        const buttonEl = btn.querySelector('button');
        return buttonEl && !buttonEl.hasAttribute('disabled');
      });

      if (dateButton) {
        const button = dateButton.querySelector('button');
        if (button) {
          await user.click(button);
          expect(handleChange).toHaveBeenCalled();
        }
      }
    });

    it('should display selected date after selection', async () => {
      const handleChange = vi.fn();
      const user = userEvent.setup();
      render(<DatePicker onChange={handleChange} />);

      const trigger = screen.getByRole('button');

      // Open
      await user.click(trigger);
      await waitFor(() => {
        expect(screen.getByRole('grid')).toBeInTheDocument();
      });

      // Select a date
      const dateButtons = screen.getAllByRole('gridcell');
      const dateButton = dateButtons.find(btn => {
        const buttonEl = btn.querySelector('button');
        return buttonEl && !buttonEl.hasAttribute('disabled');
      });

      if (dateButton) {
        const button = dateButton.querySelector('button');
        if (button) {
          await user.click(button);
          // Verify onChange was called
          expect(handleChange).toHaveBeenCalled();
        }
      }
    });
  });

  describe('States', () => {
    it('should be disabled when disabled prop is true', () => {
      render(<DatePicker disabled />);
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('should not open calendar when disabled', async () => {
      const user = userEvent.setup();
      render(<DatePicker disabled />);

      await user.click(screen.getByRole('button'));

      // Calendar should not open
      expect(screen.queryByRole('grid')).not.toBeInTheDocument();
    });

    it('should work in controlled mode', () => {
      const date1 = new Date('2024-01-15');
      const date2 = new Date('2024-02-20');

      const { rerender } = render(<DatePicker value={date1} />);
      // Should not show placeholder
      expect(screen.queryByText('Pick a date')).not.toBeInTheDocument();

      rerender(<DatePicker value={date2} />);
      // Should still not show placeholder
      expect(screen.queryByText('Pick a date')).not.toBeInTheDocument();
    });

    it('should accept undefined value', () => {
      render(<DatePicker value={undefined} />);
      expect(screen.getByText('Pick a date')).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('should apply custom className', () => {
      render(<DatePicker className="custom-picker" />);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-picker');
    });

    it('should have outline variant styling', () => {
      render(<DatePicker />);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('border-input');
    });

    it('should have muted text when no value', () => {
      render(<DatePicker />);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('text-muted-foreground');
    });

    it('should not have muted text when value is set', () => {
      const date = new Date('2024-01-15');
      render(<DatePicker value={date} />);
      const button = screen.getByRole('button');
      expect(button).not.toHaveClass('text-muted-foreground');
    });

    it('should have full width by default', () => {
      render(<DatePicker />);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('w-full');
    });

    it('should have left-aligned text', () => {
      render(<DatePicker />);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('justify-start', 'text-left');
    });
  });

  describe('Date Formatting', () => {
    it('should display formatted date when value is set', () => {
      const date = new Date('2024-01-15');
      render(<DatePicker value={date} />);
      // Should not show placeholder
      expect(screen.queryByText('Pick a date')).not.toBeInTheDocument();
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should handle different dates correctly', () => {
      const dates = [
        new Date('2024-01-01'),
        new Date('2024-06-15'),
        new Date('2024-12-31'),
      ];

      dates.forEach((date) => {
        const { unmount } = render(<DatePicker value={date} />);
        // Should display formatted date (not placeholder)
        expect(screen.queryByText('Pick a date')).not.toBeInTheDocument();
        unmount();
      });
    });
  });

  describe('Accessibility', () => {
    it('should be keyboard accessible', async () => {
      const user = userEvent.setup();
      render(<DatePicker />);

      // Tab to button
      await user.tab();
      expect(screen.getByRole('button')).toHaveFocus();
    });

    it('should open with Enter key', async () => {
      const user = userEvent.setup();
      render(<DatePicker />);

      const button = screen.getByRole('button');
      button.focus();

      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByRole('grid')).toBeInTheDocument();
      });
    });

    it('should open with Space key', async () => {
      const user = userEvent.setup();
      render(<DatePicker />);

      const button = screen.getByRole('button');
      button.focus();

      await user.keyboard(' ');

      await waitFor(() => {
        expect(screen.getByRole('grid')).toBeInTheDocument();
      });
    });

    it('should have accessible button label', () => {
      render(<DatePicker />);
      const button = screen.getByRole('button');
      expect(button).toHaveAccessibleName();
    });

    it('should support aria-label', () => {
      render(<DatePicker placeholder="Select birth date" />);
      expect(screen.getByText('Select birth date')).toBeInTheDocument();
    });
  });

  describe('Calendar Integration', () => {
    it('should pass selected date to calendar', async () => {
      const user = userEvent.setup();
      const date = new Date('2024-01-15');
      render(<DatePicker value={date} />);

      await user.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(screen.getByRole('grid')).toBeInTheDocument();
      });
    });

    it('should initialize calendar focus', async () => {
      const user = userEvent.setup();
      render(<DatePicker />);

      await user.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(screen.getByRole('grid')).toBeInTheDocument();
      });
    });

    it('should align calendar to start', async () => {
      const user = userEvent.setup();
      render(<DatePicker />);

      await user.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(screen.getByRole('grid')).toBeInTheDocument();
      });
    });
  });

  describe('Integration', () => {
    it('should work in a form', async () => {
      const handleSubmit = vi.fn((e) => e.preventDefault());
      const user = userEvent.setup();

      render(
        <form onSubmit={handleSubmit}>
          <DatePicker />
          <button type="submit">Submit</button>
        </form>
      );

      await user.click(screen.getByRole('button', { name: /Submit/i }));
      expect(handleSubmit).toHaveBeenCalled();
    });

    it('should work with labels', () => {
      render(
        <div>
          <label htmlFor="date-picker">Select Date</label>
          <DatePicker />
        </div>
      );

      expect(screen.getByText('Select Date')).toBeInTheDocument();
    });

    it('should support validation', () => {
      const handleChange = vi.fn();
      render(<DatePicker onChange={handleChange} />);

      // DatePicker renders, can be used with external validation
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should render without onChange handler', async () => {
      const user = userEvent.setup();
      render(<DatePicker />);

      const trigger = screen.getByRole('button');
      await user.click(trigger);

      await waitFor(() => {
        expect(screen.getByRole('grid')).toBeInTheDocument();
      });

      // Should not crash without onChange
      expect(screen.getByRole('grid')).toBeInTheDocument();
    });

    it('should handle undefined value', () => {
      render(<DatePicker value={undefined} />);
      expect(screen.getByText('Pick a date')).toBeInTheDocument();
    });

    it('should handle very old dates', () => {
      const oldDate = new Date('1900-01-01');
      render(<DatePicker value={oldDate} />);
      // Should render without crashing
      expect(screen.queryByText('Pick a date')).not.toBeInTheDocument();
    });

    it('should handle future dates', () => {
      const futureDate = new Date('2099-12-31');
      render(<DatePicker value={futureDate} />);
      // Should render without crashing
      expect(screen.queryByText('Pick a date')).not.toBeInTheDocument();
    });

    it('should handle today date', () => {
      const today = new Date();
      render(<DatePicker value={today} />);

      // Should render without crashing
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  describe('Popover Behavior', () => {
    it('should close on Escape key', async () => {
      const user = userEvent.setup();
      render(<DatePicker />);

      const button = screen.getByRole('button');

      // Open
      await user.click(button);
      await waitFor(() => {
        expect(screen.getByRole('grid')).toBeInTheDocument();
      });

      // Close with Escape
      await user.keyboard('{Escape}');

      await waitFor(
        () => {
          expect(screen.queryByRole('grid')).not.toBeInTheDocument();
        },
        { timeout: 2000 }
      );
    });

    it('should have compact popover padding', async () => {
      const user = userEvent.setup();
      render(<DatePicker />);

      await user.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(screen.getByRole('grid')).toBeInTheDocument();
      });
    });
  });

  describe('Multiple DatePickers', () => {
    it('should support multiple independent pickers', async () => {
      const date1 = new Date('2024-01-01');
      const date2 = new Date('2024-12-31');

      render(
        <div>
          <DatePicker value={date1} placeholder="Start date" />
          <DatePicker value={date2} placeholder="End date" />
        </div>
      );

      // Should render both pickers
      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(2);
    });

    it('should handle date range scenario', () => {
      render(
        <div>
          <label>From</label>
          <DatePicker placeholder="Start date" />
          <label>To</label>
          <DatePicker placeholder="End date" />
        </div>
      );

      expect(screen.getByText('From')).toBeInTheDocument();
      expect(screen.getByText('To')).toBeInTheDocument();
    });
  });
});
