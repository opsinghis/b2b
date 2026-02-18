/**
 * Switch Component Tests
 *
 * @package ui
 * @component Switch
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { Switch } from './switch';

describe('Switch Component', () => {
  describe('Rendering', () => {
    it('should render switch', () => {
      render(<Switch aria-label="Toggle feature" />);
      expect(screen.getByRole('switch')).toBeInTheDocument();
    });

    it('should render unchecked (off) by default', () => {
      render(<Switch aria-label="Switch" />);
      const switchElement = screen.getByRole('switch');
      expect(switchElement).toHaveAttribute('data-state', 'unchecked');
      expect(switchElement).toHaveAttribute('aria-checked', 'false');
    });

    it('should render checked (on) when checked prop is true', () => {
      render(<Switch checked aria-label="Switch" />);
      const switchElement = screen.getByRole('switch');
      expect(switchElement).toHaveAttribute('data-state', 'checked');
      expect(switchElement).toHaveAttribute('aria-checked', 'true');
    });

    it('should apply custom className', () => {
      render(<Switch className="custom-switch" aria-label="Switch" />);
      const switchElement = screen.getByRole('switch');
      expect(switchElement).toHaveClass('custom-switch');
    });

    it('should forward ref', () => {
      const ref = { current: null };
      render(<Switch ref={ref} aria-label="Switch" />);
      expect(ref.current).toBeTruthy();
    });
  });

  describe('Interactions', () => {
    it('should toggle when clicked', async () => {
      const user = userEvent.setup();
      render(<Switch aria-label="Toggle switch" />);

      const switchElement = screen.getByRole('switch');
      expect(switchElement).toHaveAttribute('data-state', 'unchecked');

      await user.click(switchElement);
      expect(switchElement).toHaveAttribute('data-state', 'checked');

      await user.click(switchElement);
      expect(switchElement).toHaveAttribute('data-state', 'unchecked');
    });

    it('should call onCheckedChange when toggled', async () => {
      const handleChange = vi.fn();
      const user = userEvent.setup();

      render(<Switch onCheckedChange={handleChange} aria-label="Switch" />);

      await user.click(screen.getByRole('switch'));
      expect(handleChange).toHaveBeenCalledWith(true);

      await user.click(screen.getByRole('switch'));
      expect(handleChange).toHaveBeenCalledWith(false);
    });

    it('should not toggle when disabled', async () => {
      const handleChange = vi.fn();
      const user = userEvent.setup();

      render(
        <Switch
          disabled
          onCheckedChange={handleChange}
          aria-label="Disabled switch"
        />
      );

      const switchElement = screen.getByRole('switch');
      await user.click(switchElement);

      expect(handleChange).not.toHaveBeenCalled();
      expect(switchElement).toHaveAttribute('data-state', 'unchecked');
    });

    it('should toggle with Space key', async () => {
      const user = userEvent.setup();
      render(<Switch aria-label="Keyboard switch" />);

      const switchElement = screen.getByRole('switch');
      switchElement.focus();

      await user.keyboard(' ');
      expect(switchElement).toHaveAttribute('data-state', 'checked');

      await user.keyboard(' ');
      expect(switchElement).toHaveAttribute('data-state', 'unchecked');
    });

    it('should toggle with Enter key', async () => {
      const user = userEvent.setup();
      render(<Switch aria-label="Keyboard switch" />);

      const switchElement = screen.getByRole('switch');
      switchElement.focus();

      await user.keyboard('{Enter}');
      expect(switchElement).toHaveAttribute('data-state', 'checked');

      await user.keyboard('{Enter}');
      expect(switchElement).toHaveAttribute('data-state', 'unchecked');
    });
  });

  describe('States', () => {
    it('should be disabled when disabled prop is true', () => {
      render(<Switch disabled aria-label="Disabled" />);
      const switchElement = screen.getByRole('switch');
      expect(switchElement).toBeDisabled();
    });

    it('should have reduced opacity when disabled', () => {
      render(<Switch disabled aria-label="Disabled" />);
      const switchElement = screen.getByRole('switch');
      expect(switchElement).toHaveClass('disabled:opacity-50');
    });

    it('should have not-allowed cursor when disabled', () => {
      render(<Switch disabled aria-label="Disabled" />);
      const switchElement = screen.getByRole('switch');
      expect(switchElement).toHaveClass('disabled:cursor-not-allowed');
    });

    it('should accept controlled checked state', () => {
      const { rerender } = render(<Switch checked={false} aria-label="Controlled" />);
      expect(screen.getByRole('switch')).toHaveAttribute('data-state', 'unchecked');

      rerender(<Switch checked={true} aria-label="Controlled" />);
      expect(screen.getByRole('switch')).toHaveAttribute('data-state', 'checked');

      rerender(<Switch checked={false} aria-label="Controlled" />);
      expect(screen.getByRole('switch')).toHaveAttribute('data-state', 'unchecked');
    });

    it('should accept uncontrolled defaultChecked state', () => {
      render(<Switch defaultChecked aria-label="Uncontrolled" />);
      expect(screen.getByRole('switch')).toHaveAttribute('data-state', 'checked');
    });
  });

  describe('Accessibility', () => {
    it('should be focusable', async () => {
      const user = userEvent.setup();
      render(<Switch aria-label="Focusable switch" />);

      await user.tab();
      expect(screen.getByRole('switch')).toHaveFocus();
    });

    it('should not be focusable when disabled', async () => {
      const user = userEvent.setup();
      render(
        <>
          <Switch aria-label="First" />
          <Switch disabled aria-label="Disabled" />
          <Switch aria-label="Last" />
        </>
      );

      await user.tab();
      expect(screen.getByLabelText('First')).toHaveFocus();

      await user.tab();
      // Should skip disabled switch
      expect(screen.getByLabelText('Last')).toHaveFocus();
    });

    it('should support aria-label', () => {
      render(<Switch aria-label="Enable notifications" />);
      expect(screen.getByLabelText('Enable notifications')).toBeInTheDocument();
    });

    it('should support aria-labelledby', () => {
      render(
        <>
          <span id="switch-label">Dark mode</span>
          <Switch aria-labelledby="switch-label" />
        </>
      );
      expect(screen.getByRole('switch')).toHaveAccessibleName('Dark mode');
    });

    it('should support aria-describedby', () => {
      render(
        <>
          <Switch aria-label="Auto-save" aria-describedby="save-desc" />
          <p id="save-desc">Automatically save your changes</p>
        </>
      );

      const switchElement = screen.getByRole('switch');
      expect(switchElement).toHaveAttribute('aria-describedby', 'save-desc');
    });

    it('should be marked as required when required prop is set', () => {
      render(<Switch required aria-label="Required switch" />);
      const switchElement = screen.getByRole('switch');
      expect(switchElement).toHaveAttribute('aria-required', 'true');
    });

    it('should have proper focus ring styles', () => {
      render(<Switch aria-label="Focus ring" />);
      const switchElement = screen.getByRole('switch');
      expect(switchElement).toHaveClass('focus-visible:ring-2');
      expect(switchElement).toHaveClass('focus-visible:ring-ring');
    });

    it('should have correct ARIA role', () => {
      render(<Switch aria-label="Test switch" />);
      const switchElement = screen.getByRole('switch');
      expect(switchElement).toHaveAttribute('role', 'switch');
    });
  });

  describe('Visual States', () => {
    it('should have correct size (h-6 w-11)', () => {
      render(<Switch aria-label="Size test" />);
      const switchElement = screen.getByRole('switch');
      expect(switchElement).toHaveClass('h-6', 'w-11');
    });

    it('should have rounded corners', () => {
      render(<Switch aria-label="Rounded" />);
      const switchElement = screen.getByRole('switch');
      expect(switchElement).toHaveClass('rounded-full');
    });

    it('should have cursor pointer', () => {
      render(<Switch aria-label="Cursor" />);
      const switchElement = screen.getByRole('switch');
      expect(switchElement).toHaveClass('cursor-pointer');
    });

    it('should have transition animations', () => {
      render(<Switch aria-label="Transitions" />);
      const switchElement = screen.getByRole('switch');
      expect(switchElement).toHaveClass('transition-colors');
    });

    it('should have primary background when checked', () => {
      render(<Switch checked aria-label="Checked colors" />);
      const switchElement = screen.getByRole('switch');
      expect(switchElement).toHaveClass('data-[state=checked]:bg-primary');
    });

    it('should have input background when unchecked', () => {
      render(<Switch aria-label="Unchecked colors" />);
      const switchElement = screen.getByRole('switch');
      expect(switchElement).toHaveClass('data-[state=unchecked]:bg-input');
    });
  });

  describe('Thumb Animation', () => {
    it('should render thumb element', () => {
      const { container } = render(<Switch aria-label="Thumb test" />);
      // Thumb is a child element with specific transform classes
      const thumb = container.querySelector('[class*="translate-x"]');
      expect(thumb).toBeInTheDocument();
    });

    it('should have thumb at start position when unchecked', () => {
      const { container } = render(<Switch aria-label="Unchecked thumb" />);
      const thumb = container.querySelector('[class*="translate-x-0"]');
      expect(thumb).toBeInTheDocument();
    });

    it('should have thumb at end position when checked', () => {
      const { container } = render(<Switch checked aria-label="Checked thumb" />);
      const thumb = container.querySelector('[class*="translate-x-5"]');
      expect(thumb).toBeInTheDocument();
    });
  });

  describe('Integration', () => {
    it('should work in a form', async () => {
      const handleSubmit = vi.fn((e) => e.preventDefault());
      const user = userEvent.setup();

      render(
        <form onSubmit={handleSubmit}>
          <Switch name="notifications" value="enabled" aria-label="Enable notifications" />
          <button type="submit">Submit</button>
        </form>
      );

      await user.click(screen.getByRole('switch'));
      await user.click(screen.getByRole('button'));

      expect(handleSubmit).toHaveBeenCalled();
    });

    it('should work with label element', async () => {
      const user = userEvent.setup();
      render(
        <label>
          <span>Enable feature</span>
          <Switch />
        </label>
      );

      const switchElement = screen.getByRole('switch');
      expect(switchElement).toHaveAttribute('data-state', 'unchecked');

      // Clicking the label should toggle the switch
      await user.click(screen.getByText('Enable feature'));
      expect(switchElement).toHaveAttribute('data-state', 'checked');
    });

    it('should support multiple switches independently', async () => {
      const user = userEvent.setup();
      render(
        <>
          <Switch aria-label="Option 1" />
          <Switch aria-label="Option 2" />
          <Switch aria-label="Option 3" />
        </>
      );

      const switches = screen.getAllByRole('switch');

      await user.click(switches[0]);
      expect(switches[0]).toHaveAttribute('data-state', 'checked');
      expect(switches[1]).toHaveAttribute('data-state', 'unchecked');
      expect(switches[2]).toHaveAttribute('data-state', 'unchecked');

      await user.click(switches[2]);
      expect(switches[0]).toHaveAttribute('data-state', 'checked');
      expect(switches[1]).toHaveAttribute('data-state', 'unchecked');
      expect(switches[2]).toHaveAttribute('data-state', 'checked');
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid toggles', async () => {
      const handleChange = vi.fn();
      const user = userEvent.setup();

      render(<Switch onCheckedChange={handleChange} aria-label="Rapid toggles" />);

      const switchElement = screen.getByRole('switch');

      // Rapid toggles
      await user.click(switchElement);
      await user.click(switchElement);
      await user.click(switchElement);
      await user.click(switchElement);

      expect(handleChange).toHaveBeenCalledTimes(4);
      expect(switchElement).toHaveAttribute('data-state', 'unchecked'); // Should end unchecked (4 clicks)
    });

    it('should handle controlled component with no onChange', () => {
      // Should not crash when controlled without onChange
      const { container } = render(<Switch checked={true} aria-label="No handler" />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should spread additional HTML attributes', () => {
      render(
        <Switch
          data-testid="custom-switch"
          data-analytics="switch-toggle"
          aria-label="Custom attrs"
        />
      );

      const switchElement = screen.getByTestId('custom-switch');
      expect(switchElement).toHaveAttribute('data-analytics', 'switch-toggle');
    });

    it('should maintain state after re-render', () => {
      const { rerender } = render(<Switch defaultChecked aria-label="Re-render test" />);

      const switchElement = screen.getByRole('switch');
      expect(switchElement).toHaveAttribute('data-state', 'checked');

      // Re-render with same props
      rerender(<Switch defaultChecked aria-label="Re-render test" />);

      // State should persist
      expect(switchElement).toHaveAttribute('data-state', 'checked');
    });
  });
});
