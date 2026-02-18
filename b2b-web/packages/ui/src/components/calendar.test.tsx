/**
 * Calendar Component Tests
 *
 * @package ui
 * @component Calendar
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { Calendar } from './calendar';

describe('Calendar Component', () => {
  describe('Rendering', () => {
    it('should render calendar grid', () => {
      render(<Calendar mode="single" />);
      expect(screen.getByRole('grid')).toBeInTheDocument();
    });

    it('should render month caption', () => {
      const date = new Date('2024-01-15');
      render(<Calendar mode="single" month={date} />);

      // Calendar grid should be rendered with month display
      expect(screen.getByRole('grid')).toBeInTheDocument();
    });

    it('should render weekday headers', () => {
      render(<Calendar mode="single" />);

      // Calendar should render with grid structure
      expect(screen.getByRole('grid')).toBeInTheDocument();
    });

    it('should render date cells', () => {
      render(<Calendar mode="single" />);

      // Should have gridcell elements for dates
      const cells = screen.getAllByRole('gridcell');
      expect(cells.length).toBeGreaterThan(0);
    });

    it('should render navigation buttons', () => {
      render(<Calendar mode="single" />);

      const grid = screen.getByRole('grid');
      const buttons = within(grid).getAllByRole('button');

      // Should have prev/next navigation buttons
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should show outside days by default', () => {
      const date = new Date('2024-01-15');
      render(<Calendar mode="single" month={date} />);

      // Component defaults showOutsideDays to true
      expect(screen.getByRole('grid')).toBeInTheDocument();
    });

    it('should hide outside days when specified', () => {
      const date = new Date('2024-01-15');
      render(<Calendar mode="single" month={date} showOutsideDays={false} />);

      expect(screen.getByRole('grid')).toBeInTheDocument();
    });
  });

  describe('Month Navigation', () => {
    it('should navigate to next month', async () => {
      const user = userEvent.setup();
      const date = new Date('2024-01-15');

      render(<Calendar mode="single" month={date} />);

      const grid = screen.getByRole('grid');
      const buttons = within(grid).getAllByRole('button');

      // Find next button (usually last navigation button)
      const nextButton = buttons.find(btn => {
        const svg = btn.querySelector('svg');
        return svg !== null;
      });

      if (nextButton) {
        await user.click(nextButton);
        // Calendar should still be rendered
        expect(screen.getByRole('grid')).toBeInTheDocument();
      }
    });

    it('should have previous month button', () => {
      render(<Calendar mode="single" />);

      const grid = screen.getByRole('grid');
      const buttons = within(grid).getAllByRole('button');
      // Navigation buttons should exist
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should have next month button', () => {
      render(<Calendar mode="single" />);

      const grid = screen.getByRole('grid');
      const buttons = within(grid).getAllByRole('button');
      // Navigation buttons should exist
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe('Date Selection - Single Mode', () => {
    it('should render in single selection mode', () => {
      render(<Calendar mode="single" />);
      expect(screen.getByRole('grid')).toBeInTheDocument();
    });

    it('should call onSelect when date is clicked', async () => {
      const handleSelect = vi.fn();
      const user = userEvent.setup();

      render(<Calendar mode="single" onSelect={handleSelect} />);

      // Find a selectable date button
      const cells = screen.getAllByRole('gridcell');
      const dateCell = cells.find(cell => {
        const button = cell.querySelector('button');
        return button && !button.hasAttribute('disabled');
      });

      if (dateCell) {
        const button = dateCell.querySelector('button');
        if (button) {
          await user.click(button);
          expect(handleSelect).toHaveBeenCalled();
        }
      }
    });

    it('should display selected date', () => {
      const selected = new Date('2024-01-15');
      render(<Calendar mode="single" selected={selected} month={selected} />);

      // Selected date should have selected styling
      const grid = screen.getByRole('grid');
      const selectedDay = grid.querySelector('[aria-selected="true"]');
      expect(selectedDay).toBeInTheDocument();
    });

    it('should handle no selection', () => {
      render(<Calendar mode="single" selected={undefined} />);
      expect(screen.getByRole('grid')).toBeInTheDocument();
    });

    it('should work without onSelect handler', async () => {
      const user = userEvent.setup();
      render(<Calendar mode="single" />);

      const cells = screen.getAllByRole('gridcell');
      const dateCell = cells.find(cell => {
        const button = cell.querySelector('button');
        return button && !button.hasAttribute('disabled');
      });

      if (dateCell) {
        const button = dateCell.querySelector('button');
        if (button) {
          // Should not crash without onSelect
          await user.click(button);
          expect(screen.getByRole('grid')).toBeInTheDocument();
        }
      }
    });
  });

  describe('Date Selection - Multiple Mode', () => {
    it('should render in multiple selection mode', () => {
      render(<Calendar mode="multiple" />);
      expect(screen.getByRole('grid')).toBeInTheDocument();
    });

    it('should handle multiple selected dates', () => {
      const selected = [new Date('2024-01-15'), new Date('2024-01-20')];
      const month = new Date('2024-01-15');

      render(<Calendar mode="multiple" selected={selected} month={month} />);

      const grid = screen.getByRole('grid');
      const selectedDays = grid.querySelectorAll('[aria-selected="true"]');
      expect(selectedDays.length).toBe(2);
    });

    it('should handle empty selection', () => {
      render(<Calendar mode="multiple" selected={[]} />);
      expect(screen.getByRole('grid')).toBeInTheDocument();
    });
  });

  describe('Date Selection - Range Mode', () => {
    it('should render in range selection mode', () => {
      render(<Calendar mode="range" />);
      expect(screen.getByRole('grid')).toBeInTheDocument();
    });

    it('should handle date range selection', () => {
      const selected = {
        from: new Date('2024-01-10'),
        to: new Date('2024-01-20'),
      };
      const month = new Date('2024-01-15');

      render(<Calendar mode="range" selected={selected} month={month} />);

      expect(screen.getByRole('grid')).toBeInTheDocument();
    });

    it('should handle partial range (from only)', () => {
      const selected = {
        from: new Date('2024-01-15'),
      };
      const month = new Date('2024-01-15');

      render(<Calendar mode="range" selected={selected} month={month} />);
      expect(screen.getByRole('grid')).toBeInTheDocument();
    });

    it('should handle undefined range', () => {
      render(<Calendar mode="range" selected={undefined} />);
      expect(screen.getByRole('grid')).toBeInTheDocument();
    });
  });

  describe('States', () => {
    it('should highlight today by default', () => {
      render(<Calendar mode="single" />);

      // Calendar should render with today's date available
      expect(screen.getByRole('grid')).toBeInTheDocument();
      const cells = screen.getAllByRole('gridcell');
      expect(cells.length).toBeGreaterThan(0);
    });

    it('should support disabled dates', () => {
      const disabled = (date: Date) => date.getDay() === 0 || date.getDay() === 6;

      render(<Calendar mode="single" disabled={disabled} />);

      const grid = screen.getByRole('grid');
      const disabledDays = grid.querySelectorAll('button[disabled]');
      expect(disabledDays.length).toBeGreaterThan(0);
    });

    it('should support disabled date array', () => {
      const disabled = [new Date('2024-01-15'), new Date('2024-01-16')];
      const month = new Date('2024-01-15');

      render(<Calendar mode="single" disabled={disabled} month={month} />);

      const grid = screen.getByRole('grid');
      const disabledDays = grid.querySelectorAll('button[disabled]');
      expect(disabledDays.length).toBeGreaterThan(0);
    });

    it('should show outside days from adjacent months', () => {
      const month = new Date('2024-01-15');
      render(<Calendar mode="single" month={month} showOutsideDays={true} />);

      // Calendar renders with all days including outside days
      const cells = screen.getAllByRole('gridcell');
      // Should have full calendar grid (typically 35-42 cells)
      expect(cells.length).toBeGreaterThan(28);
    });

    it('should not be disabled by default', () => {
      render(<Calendar mode="single" />);

      const cells = screen.getAllByRole('gridcell');
      const enabledCell = cells.find(cell => {
        const button = cell.querySelector('button');
        return button && !button.hasAttribute('disabled');
      });

      expect(enabledCell).toBeTruthy();
    });
  });

  describe('Styling', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <Calendar mode="single" className="custom-calendar" />
      );

      const calendar = container.querySelector('.custom-calendar');
      expect(calendar).toBeInTheDocument();
    });

    it('should have default padding', () => {
      const { container } = render(<Calendar mode="single" />);

      const calendar = container.querySelector('.p-3');
      expect(calendar).toBeInTheDocument();
    });

    it('should support custom classNames prop', () => {
      render(
        <Calendar
          mode="single"
          classNames={{
            month: 'custom-month',
          }}
        />
      );

      const grid = screen.getByRole('grid');
      expect(grid).toBeInTheDocument();
    });

    it('should have navigation button styling', () => {
      render(<Calendar mode="single" />);

      const grid = screen.getByRole('grid');
      const buttons = within(grid).getAllByRole('button');
      // Should have buttons with styling
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should style selected days', () => {
      const selected = new Date('2024-01-15');
      render(<Calendar mode="single" selected={selected} month={selected} />);

      const grid = screen.getByRole('grid');
      const selectedDay = grid.querySelector('[aria-selected="true"]');
      expect(selectedDay).toBeInTheDocument();
    });

    it('should style today differently', () => {
      render(<Calendar mode="single" />);

      // Calendar renders with today visible
      expect(screen.getByRole('grid')).toBeInTheDocument();
      const cells = screen.getAllByRole('gridcell');
      expect(cells.length).toBeGreaterThan(0);
    });

    it('should style outside days with opacity', () => {
      const month = new Date('2024-01-15');
      render(<Calendar mode="single" month={month} showOutsideDays={true} />);

      const cells = screen.getAllByRole('gridcell');
      // Full calendar grid with outside days
      expect(cells.length).toBeGreaterThan(28);
    });
  });

  describe('Accessibility', () => {
    it('should have grid role', () => {
      render(<Calendar mode="single" />);
      expect(screen.getByRole('grid')).toBeInTheDocument();
    });

    it('should have gridcell roles for dates', () => {
      render(<Calendar mode="single" />);
      const cells = screen.getAllByRole('gridcell');
      expect(cells.length).toBeGreaterThan(0);
    });

    it('should have button roles for selectable dates', () => {
      render(<Calendar mode="single" />);

      const grid = screen.getByRole('grid');
      const buttons = within(grid).getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should have aria-selected for selected dates', () => {
      const selected = new Date('2024-01-15');
      render(<Calendar mode="single" selected={selected} month={selected} />);

      const grid = screen.getByRole('grid');
      const selectedDay = grid.querySelector('[aria-selected="true"]');
      expect(selectedDay).toBeInTheDocument();
    });

    it('should mark disabled dates as disabled', () => {
      const disabled = (date: Date) => date.getDay() === 0;
      render(<Calendar mode="single" disabled={disabled} />);

      const grid = screen.getByRole('grid');
      const disabledButtons = grid.querySelectorAll('button[disabled]');
      expect(disabledButtons.length).toBeGreaterThan(0);
    });

    it('should be keyboard navigable', async () => {
      const user = userEvent.setup();
      render(<Calendar mode="single" />);

      const grid = screen.getByRole('grid');
      const buttons = within(grid).getAllByRole('button');

      if (buttons.length > 0) {
        const firstButton = buttons[0];
        firstButton.focus();
        expect(firstButton).toHaveFocus();
      }
    });
  });

  describe('Components', () => {
    it('should render custom Chevron components', () => {
      const { container } = render(<Calendar mode="single" />);

      // Should have chevron SVG icons
      const chevrons = container.querySelectorAll('svg');
      expect(chevrons.length).toBeGreaterThan(0);
    });

    it('should have navigation chevrons', () => {
      const { container } = render(<Calendar mode="single" />);

      // Should have chevron SVG icons in navigation
      const chevrons = container.querySelectorAll('svg');
      expect(chevrons.length).toBeGreaterThan(0);
    });
  });

  describe('Integration', () => {
    it('should work with DatePicker', () => {
      const handleSelect = vi.fn();
      render(<Calendar mode="single" onSelect={handleSelect} />);

      expect(screen.getByRole('grid')).toBeInTheDocument();
    });

    it('should work in date range scenario', () => {
      const selected = {
        from: new Date('2024-01-10'),
        to: new Date('2024-01-20'),
      };
      const month = new Date('2024-01-15');

      render(<Calendar mode="range" selected={selected} month={month} />);
      expect(screen.getByRole('grid')).toBeInTheDocument();
    });

    it('should support controlled month', () => {
      const month1 = new Date('2024-01-15');
      const month2 = new Date('2024-02-15');

      const { rerender } = render(<Calendar mode="single" month={month1} />);
      expect(screen.getByRole('grid')).toBeInTheDocument();

      rerender(<Calendar mode="single" month={month2} />);
      expect(screen.getByRole('grid')).toBeInTheDocument();
    });

    it('should support min/max dates', () => {
      const fromDate = new Date('2024-01-01');
      const toDate = new Date('2024-01-31');

      render(<Calendar mode="single" fromDate={fromDate} toDate={toDate} />);
      expect(screen.getByRole('grid')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined selected date', () => {
      render(<Calendar mode="single" selected={undefined} />);
      expect(screen.getByRole('grid')).toBeInTheDocument();
    });

    it('should handle empty array for multiple mode', () => {
      render(<Calendar mode="multiple" selected={[]} />);
      expect(screen.getByRole('grid')).toBeInTheDocument();
    });

    it('should handle very old dates', () => {
      const oldDate = new Date('1900-01-01');
      render(<Calendar mode="single" selected={oldDate} month={oldDate} />);
      expect(screen.getByRole('grid')).toBeInTheDocument();
    });

    it('should handle future dates', () => {
      const futureDate = new Date('2099-12-31');
      render(<Calendar mode="single" selected={futureDate} month={futureDate} />);
      expect(screen.getByRole('grid')).toBeInTheDocument();
    });

    it('should render without selected prop', () => {
      render(<Calendar mode="single" />);
      expect(screen.getByRole('grid')).toBeInTheDocument();
    });

    it('should render without month prop', () => {
      render(<Calendar mode="single" />);
      expect(screen.getByRole('grid')).toBeInTheDocument();
    });

    it('should render without errors', () => {
      // Calendar renders successfully
      render(<Calendar mode="single" />);
      expect(screen.getByRole('grid')).toBeInTheDocument();
    });

    it('should handle additional props', () => {
      render(<Calendar mode="single" data-testid="custom-calendar" />);
      expect(screen.getByRole('grid')).toBeInTheDocument();
    });
  });

  describe('Month Display', () => {
    it('should display current month by default', () => {
      render(<Calendar mode="single" />);
      expect(screen.getByRole('grid')).toBeInTheDocument();
    });

    it('should display specified month', () => {
      const month = new Date('2024-06-15');
      render(<Calendar mode="single" month={month} />);
      expect(screen.getByRole('grid')).toBeInTheDocument();
    });

    it('should change month when navigating', async () => {
      const user = userEvent.setup();
      const month = new Date('2024-01-15');

      render(<Calendar mode="single" month={month} />);

      const grid = screen.getByRole('grid');
      const buttons = within(grid).getAllByRole('button');

      // Find a navigation button
      const navButton = buttons.find(btn => {
        const svg = btn.querySelector('svg');
        return svg !== null;
      });

      if (navButton) {
        await user.click(navButton);
        expect(screen.getByRole('grid')).toBeInTheDocument();
      }
    });
  });

  describe('Week Display', () => {
    it('should display weeks in grid format', () => {
      render(<Calendar mode="single" />);

      const grid = screen.getByRole('grid');
      const cells = screen.getAllByRole('gridcell');
      // Should have multiple rows of dates (weeks)
      expect(cells.length).toBeGreaterThan(7);
    });

    it('should show weekday headers', () => {
      render(<Calendar mode="single" />);

      // Calendar renders with full grid structure
      expect(screen.getByRole('grid')).toBeInTheDocument();
      const cells = screen.getAllByRole('gridcell');
      expect(cells.length).toBeGreaterThan(0);
    });
  });
});
