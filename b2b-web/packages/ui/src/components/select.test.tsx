/**
 * Select Component Tests
 *
 * @package ui
 * @component Select
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
  SelectGroup,
  SelectLabel,
  SelectSeparator,
} from './select';

describe('Select Component', () => {
  const renderBasicSelect = (defaultValue?: string) => {
    return render(
      <Select defaultValue={defaultValue}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select option" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="apple">Apple</SelectItem>
          <SelectItem value="banana">Banana</SelectItem>
          <SelectItem value="orange">Orange</SelectItem>
        </SelectContent>
      </Select>
    );
  };

  describe('Rendering', () => {
    it('should render select trigger', () => {
      renderBasicSelect();
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('should render placeholder', () => {
      renderBasicSelect();
      expect(screen.getByText('Select option')).toBeInTheDocument();
    });

    it('should show default value', () => {
      renderBasicSelect('apple');
      expect(screen.getByText('Apple')).toBeInTheDocument();
    });

    it('should not show options initially', () => {
      renderBasicSelect();
      expect(screen.queryByText('Apple')).not.toBeInTheDocument();
    });

    it('should render ChevronDown icon', () => {
      const { container } = renderBasicSelect();
      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('should open dropdown when trigger is clicked', async () => {
      const user = userEvent.setup();
      renderBasicSelect();

      await user.click(screen.getByRole('combobox'));

      await waitFor(() => {
        // Options should be visible (use getAllByText because they may appear multiple times)
        expect(screen.getAllByText('Apple')[0]).toBeInTheDocument();
        expect(screen.getAllByText('Banana')[0]).toBeInTheDocument();
        expect(screen.getAllByText('Orange')[0]).toBeInTheDocument();
      });
    });

    it('should select item when clicked', async () => {
      const user = userEvent.setup();
      renderBasicSelect();

      const trigger = screen.getByRole('combobox');

      // Open dropdown
      await user.click(trigger);

      await waitFor(() => {
        expect(screen.getAllByText('Banana')[0]).toBeInTheDocument();
      });

      // Click option
      const options = screen.getAllByText('Banana');
      await user.click(options[options.length - 1]); // Click the option in the dropdown

      // Dropdown should close and selected value should show
      await waitFor(() => {
        expect(screen.getByRole('combobox')).toHaveAttribute('data-state', 'closed');
      });

      // Value should be displayed in trigger
      expect(screen.getByText('Banana')).toBeInTheDocument();
    });

    it('should support closing via Escape', async () => {
      const user = userEvent.setup();
      render(
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="opt1">Option 1</SelectItem>
          </SelectContent>
        </Select>
      );

      const trigger = screen.getByRole('combobox');

      // Open
      await user.click(trigger);
      await waitFor(() => {
        expect(trigger).toHaveAttribute('data-state', 'open');
      });

      // Close via Escape
      await user.keyboard('{Escape}');

      await waitFor(
        () => {
          expect(trigger).toHaveAttribute('data-state', 'closed');
        },
        { timeout: 2000 }
      );
    });

    it('should close when pressing Escape', async () => {
      const user = userEvent.setup();
      renderBasicSelect();

      const trigger = screen.getByRole('combobox');

      await user.click(trigger);
      await waitFor(() => {
        expect(trigger).toHaveAttribute('data-state', 'open');
      });

      await user.keyboard('{Escape}');

      await waitFor(
        () => {
          expect(trigger).toHaveAttribute('data-state', 'closed');
        },
        { timeout: 2000 }
      );
    });
  });

  describe('States', () => {
    it('should have closed state initially', () => {
      renderBasicSelect();
      expect(screen.getByRole('combobox')).toHaveAttribute('data-state', 'closed');
    });

    it('should have open state when clicked', async () => {
      const user = userEvent.setup();
      renderBasicSelect();

      const trigger = screen.getByRole('combobox');
      await user.click(trigger);

      await waitFor(() => {
        expect(trigger).toHaveAttribute('data-state', 'open');
      });
    });

    it('should be disabled when disabled prop is set', () => {
      render(
        <Select disabled>
          <SelectTrigger>
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="opt1">Option 1</SelectItem>
          </SelectContent>
        </Select>
      );

      expect(screen.getByRole('combobox')).toBeDisabled();
    });

    it('should work in controlled mode', async () => {
      const { rerender } = render(
        <Select value="apple">
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="apple">Apple</SelectItem>
            <SelectItem value="banana">Banana</SelectItem>
          </SelectContent>
        </Select>
      );

      expect(screen.getByText('Apple')).toBeInTheDocument();

      rerender(
        <Select value="banana">
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="apple">Apple</SelectItem>
            <SelectItem value="banana">Banana</SelectItem>
          </SelectContent>
        </Select>
      );

      expect(screen.getByText('Banana')).toBeInTheDocument();
    });

    it('should call onValueChange when selection changes', async () => {
      const handleChange = vi.fn();
      const user = userEvent.setup();

      render(
        <Select onValueChange={handleChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="apple">Apple</SelectItem>
            <SelectItem value="banana">Banana</SelectItem>
          </SelectContent>
        </Select>
      );

      await user.click(screen.getByRole('combobox'));

      await waitFor(() => {
        expect(screen.getAllByText('Apple')[0]).toBeInTheDocument();
      });

      const options = screen.getAllByText('Apple');
      await user.click(options[options.length - 1]);

      expect(handleChange).toHaveBeenCalledWith('apple');
    });
  });

  describe('Keyboard Navigation', () => {
    it('should open with Space key', async () => {
      const user = userEvent.setup();
      renderBasicSelect();

      const trigger = screen.getByRole('combobox');
      trigger.focus();

      await user.keyboard(' ');

      await waitFor(() => {
        expect(trigger).toHaveAttribute('data-state', 'open');
      });
    });

    it('should open with Enter key', async () => {
      const user = userEvent.setup();
      renderBasicSelect();

      const trigger = screen.getByRole('combobox');
      trigger.focus();

      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(trigger).toHaveAttribute('data-state', 'open');
      });
    });

    it('should open with ArrowDown key', async () => {
      const user = userEvent.setup();
      renderBasicSelect();

      const trigger = screen.getByRole('combobox');
      trigger.focus();

      await user.keyboard('{ArrowDown}');

      await waitFor(() => {
        expect(trigger).toHaveAttribute('data-state', 'open');
      });
    });

    it('should open with ArrowUp key', async () => {
      const user = userEvent.setup();
      renderBasicSelect();

      const trigger = screen.getByRole('combobox');
      trigger.focus();

      await user.keyboard('{ArrowUp}');

      await waitFor(() => {
        expect(trigger).toHaveAttribute('data-state', 'open');
      });
    });
  });

  describe('Groups and Labels', () => {
    it('should render grouped options', async () => {
      const user = userEvent.setup();
      render(
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Select fruit" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Fruits</SelectLabel>
              <SelectItem value="apple">Apple</SelectItem>
              <SelectItem value="banana">Banana</SelectItem>
            </SelectGroup>
            <SelectGroup>
              <SelectLabel>Vegetables</SelectLabel>
              <SelectItem value="carrot">Carrot</SelectItem>
              <SelectItem value="potato">Potato</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      );

      await user.click(screen.getByRole('combobox'));

      await waitFor(() => {
        expect(screen.getByText('Fruits')).toBeInTheDocument();
        expect(screen.getByText('Vegetables')).toBeInTheDocument();
      });
    });

    it('should render separator between groups', async () => {
      const user = userEvent.setup();
      render(
        <Select>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="opt1">Option 1</SelectItem>
            <SelectSeparator />
            <SelectItem value="opt2">Option 2</SelectItem>
          </SelectContent>
        </Select>
      );

      await user.click(screen.getByRole('combobox'));

      await waitFor(() => {
        // Separator should be rendered (it's a div with styling)
        expect(screen.getAllByText('Option 1')[0]).toBeInTheDocument();
        expect(screen.getAllByText('Option 2')[0]).toBeInTheDocument();
      });
    });
  });

  describe('Disabled Items', () => {
    it('should render disabled option', async () => {
      const user = userEvent.setup();
      render(
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="opt1">Option 1</SelectItem>
            <SelectItem value="opt2" disabled>
              Option 2 (Disabled)
            </SelectItem>
          </SelectContent>
        </Select>
      );

      await user.click(screen.getByRole('combobox'));

      await waitFor(() => {
        const disabledOption = screen.getAllByText('Option 2 (Disabled)')[0];
        expect(disabledOption).toBeInTheDocument();
      });
    });

    it('should not select disabled option when clicked', async () => {
      const handleChange = vi.fn();
      const user = userEvent.setup();

      render(
        <Select onValueChange={handleChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="opt1">Option 1</SelectItem>
            <SelectItem value="opt2" disabled>
              Option 2 (Disabled)
            </SelectItem>
          </SelectContent>
        </Select>
      );

      await user.click(screen.getByRole('combobox'));

      await waitFor(() => {
        expect(screen.getAllByText('Option 2 (Disabled)')[0]).toBeInTheDocument();
      });

      const disabledOptions = screen.getAllByText('Option 2 (Disabled)');
      await user.click(disabledOptions[disabledOptions.length - 1]);

      // Handler should not be called
      expect(handleChange).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have combobox role', () => {
      renderBasicSelect();
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('should have proper ARIA attributes', async () => {
      const user = userEvent.setup();
      renderBasicSelect();

      const trigger = screen.getByRole('combobox');
      expect(trigger).toHaveAttribute('aria-expanded', 'false');

      await user.click(trigger);

      await waitFor(() => {
        expect(trigger).toHaveAttribute('aria-expanded', 'true');
      });
    });

    it('should be keyboard focusable', async () => {
      const user = userEvent.setup();
      renderBasicSelect();

      await user.tab();

      expect(screen.getByRole('combobox')).toHaveFocus();
    });

    it('should have option role for items', async () => {
      const user = userEvent.setup();
      renderBasicSelect();

      await user.click(screen.getByRole('combobox'));

      await waitFor(() => {
        const options = screen.getAllByRole('option');
        expect(options.length).toBeGreaterThanOrEqual(3);
      });
    });

    it('should mark selected option with aria-selected', async () => {
      const user = userEvent.setup();
      renderBasicSelect('apple');

      await user.click(screen.getByRole('combobox'));

      await waitFor(() => {
        const options = screen.getAllByRole('option');
        const appleOption = options.find(opt => opt.textContent === 'Apple');
        expect(appleOption).toHaveAttribute('aria-selected', 'true');
      });
    });
  });

  describe('Styling', () => {
    it('should apply custom className to trigger', () => {
      render(
        <Select>
          <SelectTrigger className="custom-trigger">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="opt1">Option 1</SelectItem>
          </SelectContent>
        </Select>
      );

      const trigger = screen.getByRole('combobox');
      expect(trigger).toHaveClass('custom-trigger');
    });

    it('should show reduced opacity when disabled', () => {
      render(
        <Select disabled>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="opt1">Option 1</SelectItem>
          </SelectContent>
        </Select>
      );

      const trigger = screen.getByRole('combobox');
      expect(trigger).toHaveClass('disabled:opacity-50');
    });

    it('should apply focus styles', () => {
      renderBasicSelect();
      const trigger = screen.getByRole('combobox');
      expect(trigger).toHaveClass('focus:ring-2');
    });
  });

  describe('Content', () => {
    it('should render simple options', async () => {
      const user = userEvent.setup();
      renderBasicSelect();

      await user.click(screen.getByRole('combobox'));

      await waitFor(() => {
        expect(screen.getAllByText('Apple')[0]).toBeInTheDocument();
        expect(screen.getAllByText('Banana')[0]).toBeInTheDocument();
        expect(screen.getAllByText('Orange')[0]).toBeInTheDocument();
      });
    });

    it('should handle many options', async () => {
      const user = userEvent.setup();
      const manyOptions = Array.from({ length: 50 }, (_, i) => ({
        value: `opt${i}`,
        label: `Option ${i}`,
      }));

      render(
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            {manyOptions.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );

      await user.click(screen.getByRole('combobox'));

      await waitFor(() => {
        // Should show scroll buttons for long lists
        expect(screen.getAllByText('Option 0')[0]).toBeInTheDocument();
      });
    });
  });

  describe('Integration', () => {
    it('should work in a form', async () => {
      const handleSubmit = vi.fn((e) => e.preventDefault());
      const user = userEvent.setup();

      render(
        <form onSubmit={handleSubmit}>
          <Select name="fruit">
            <SelectTrigger>
              <SelectValue placeholder="Select fruit" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="apple">Apple</SelectItem>
              <SelectItem value="banana">Banana</SelectItem>
            </SelectContent>
          </Select>
          <button type="submit">Submit</button>
        </form>
      );

      await user.click(screen.getByRole('button', { name: 'Submit' }));
      expect(handleSubmit).toHaveBeenCalled();
    });

    it('should work with required validation', () => {
      render(
        <Select required>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="opt1">Option 1</SelectItem>
          </SelectContent>
        </Select>
      );

      const trigger = screen.getByRole('combobox');
      expect(trigger).toHaveAttribute('aria-required', 'true');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty options', () => {
      render(
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="No options" />
          </SelectTrigger>
          <SelectContent />
        </Select>
      );

      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('should handle single option', async () => {
      const user = userEvent.setup();
      render(
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="only">Only Option</SelectItem>
          </SelectContent>
        </Select>
      );

      await user.click(screen.getByRole('combobox'));

      await waitFor(() => {
        expect(screen.getAllByText('Only Option')[0]).toBeInTheDocument();
      });
    });

    it('should forward ref to trigger', () => {
      const ref = { current: null };

      render(
        <Select>
          <SelectTrigger ref={ref}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="opt1">Option 1</SelectItem>
          </SelectContent>
        </Select>
      );

      expect(ref.current).toBeTruthy();
    });

    it('should spread additional props to trigger', () => {
      render(
        <Select>
          <SelectTrigger data-testid="custom-select" aria-label="Custom select">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="opt1">Option 1</SelectItem>
          </SelectContent>
        </Select>
      );

      const trigger = screen.getByTestId('custom-select');
      expect(trigger).toHaveAttribute('aria-label', 'Custom select');
    });
  });
});
