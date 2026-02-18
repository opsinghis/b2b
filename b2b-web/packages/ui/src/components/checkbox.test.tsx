/**
 * Checkbox Component Tests
 *
 * @package ui
 * @component Checkbox
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { Checkbox } from './checkbox';

describe('Checkbox Component', () => {
  describe('Rendering', () => {
    it('should render checkbox', () => {
      render(<Checkbox aria-label="Accept terms" />);
      expect(screen.getByRole('checkbox')).toBeInTheDocument();
    });

    it('should render unchecked by default', () => {
      render(<Checkbox aria-label="Checkbox" />);
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).not.toBeChecked();
    });

    it('should render checked when checked prop is true', () => {
      render(<Checkbox checked aria-label="Checkbox" />);
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeChecked();
    });

    it('should render in indeterminate state', () => {
      render(<Checkbox checked="indeterminate" aria-label="Checkbox" />);
      const checkbox = screen.getByRole('checkbox');
      // Radix UI uses data-state attribute for indeterminate
      expect(checkbox).toHaveAttribute('data-state', 'indeterminate');
    });

    it('should apply custom className', () => {
      render(<Checkbox className="custom-checkbox" aria-label="Checkbox" />);
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toHaveClass('custom-checkbox');
    });

    it('should forward ref', () => {
      const ref = { current: null };
      render(<Checkbox ref={ref} aria-label="Checkbox" />);
      expect(ref.current).toBeTruthy();
    });
  });

  describe('Interactions', () => {
    it('should toggle when clicked', async () => {
      const user = userEvent.setup();
      render(<Checkbox aria-label="Toggle checkbox" />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).not.toBeChecked();

      await user.click(checkbox);
      expect(checkbox).toBeChecked();

      await user.click(checkbox);
      expect(checkbox).not.toBeChecked();
    });

    it('should call onCheckedChange when clicked', async () => {
      const handleChange = vi.fn();
      const user = userEvent.setup();

      render(<Checkbox onCheckedChange={handleChange} aria-label="Checkbox" />);

      await user.click(screen.getByRole('checkbox'));
      expect(handleChange).toHaveBeenCalledWith(true);

      await user.click(screen.getByRole('checkbox'));
      expect(handleChange).toHaveBeenCalledWith(false);
    });

    it('should not toggle when disabled', async () => {
      const handleChange = vi.fn();
      const user = userEvent.setup();

      render(
        <Checkbox
          disabled
          onCheckedChange={handleChange}
          aria-label="Disabled checkbox"
        />
      );

      const checkbox = screen.getByRole('checkbox');
      await user.click(checkbox);

      expect(handleChange).not.toHaveBeenCalled();
      expect(checkbox).not.toBeChecked();
    });

    it('should toggle with Space key', async () => {
      const user = userEvent.setup();
      render(<Checkbox aria-label="Keyboard checkbox" />);

      const checkbox = screen.getByRole('checkbox');
      checkbox.focus();

      await user.keyboard(' ');
      expect(checkbox).toBeChecked();

      await user.keyboard(' ');
      expect(checkbox).not.toBeChecked();
    });

    it('should not toggle with Enter key (not a button)', async () => {
      const handleChange = vi.fn();
      const user = userEvent.setup();

      render(
        <Checkbox
          onCheckedChange={handleChange}
          aria-label="Keyboard checkbox"
        />
      );

      const checkbox = screen.getByRole('checkbox');
      checkbox.focus();

      await user.keyboard('{Enter}');

      // Enter key should not toggle checkbox (only Space)
      expect(handleChange).not.toHaveBeenCalled();
    });
  });

  describe('States', () => {
    it('should be disabled when disabled prop is true', () => {
      render(<Checkbox disabled aria-label="Disabled" />);
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeDisabled();
    });

    it('should have reduced opacity when disabled', () => {
      render(<Checkbox disabled aria-label="Disabled" />);
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toHaveClass('disabled:opacity-50');
    });

    it('should have not-allowed cursor when disabled', () => {
      render(<Checkbox disabled aria-label="Disabled" />);
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toHaveClass('disabled:cursor-not-allowed');
    });

    it('should accept controlled checked state', () => {
      const { rerender } = render(<Checkbox checked={false} aria-label="Controlled" />);
      expect(screen.getByRole('checkbox')).not.toBeChecked();

      rerender(<Checkbox checked={true} aria-label="Controlled" />);
      expect(screen.getByRole('checkbox')).toBeChecked();

      rerender(<Checkbox checked={false} aria-label="Controlled" />);
      expect(screen.getByRole('checkbox')).not.toBeChecked();
    });

    it('should accept uncontrolled defaultChecked state', () => {
      render(<Checkbox defaultChecked aria-label="Uncontrolled" />);
      expect(screen.getByRole('checkbox')).toBeChecked();
    });
  });

  describe('Accessibility', () => {
    it('should be focusable', async () => {
      const user = userEvent.setup();
      render(<Checkbox aria-label="Focusable checkbox" />);

      await user.tab();
      expect(screen.getByRole('checkbox')).toHaveFocus();
    });

    it('should not be focusable when disabled', async () => {
      const user = userEvent.setup();
      render(
        <>
          <Checkbox aria-label="First" />
          <Checkbox disabled aria-label="Disabled" />
          <Checkbox aria-label="Last" />
        </>
      );

      await user.tab();
      expect(screen.getByLabelText('First')).toHaveFocus();

      await user.tab();
      // Should skip disabled checkbox
      expect(screen.getByLabelText('Last')).toHaveFocus();
    });

    it('should support aria-label', () => {
      render(<Checkbox aria-label="Accept terms and conditions" />);
      expect(screen.getByLabelText('Accept terms and conditions')).toBeInTheDocument();
    });

    it('should support aria-labelledby', () => {
      render(
        <>
          <span id="checkbox-label">Subscribe to newsletter</span>
          <Checkbox aria-labelledby="checkbox-label" />
        </>
      );
      expect(screen.getByRole('checkbox')).toHaveAccessibleName('Subscribe to newsletter');
    });

    it('should support aria-describedby', () => {
      render(
        <>
          <Checkbox aria-label="Marketing" aria-describedby="marketing-desc" />
          <p id="marketing-desc">Receive marketing emails</p>
        </>
      );

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toHaveAttribute('aria-describedby', 'marketing-desc');
    });

    it('should be marked as required when required prop is set', () => {
      render(<Checkbox required aria-label="Required checkbox" />);
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeRequired();
    });

    it('should have proper focus ring styles', () => {
      render(<Checkbox aria-label="Focus ring" />);
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toHaveClass('focus-visible:ring-2');
      expect(checkbox).toHaveClass('focus-visible:ring-ring');
    });
  });

  describe('Visual States', () => {
    it('should show check icon when checked', () => {
      const { container } = render(<Checkbox checked aria-label="Checked" />);
      // Radix UI shows indicator when checked
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toHaveAttribute('data-state', 'checked');
    });

    it('should not show check icon when unchecked', () => {
      render(<Checkbox aria-label="Unchecked" />);
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toHaveAttribute('data-state', 'unchecked');
    });

    it('should have correct size (h-4 w-4)', () => {
      render(<Checkbox aria-label="Size test" />);
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toHaveClass('h-4', 'w-4');
    });

    it('should have rounded corners', () => {
      render(<Checkbox aria-label="Rounded" />);
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toHaveClass('rounded-sm');
    });

    it('should have border', () => {
      render(<Checkbox aria-label="Border" />);
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toHaveClass('border', 'border-primary');
    });
  });

  describe('Integration', () => {
    it('should work in a form', async () => {
      const handleSubmit = vi.fn((e) => e.preventDefault());
      const user = userEvent.setup();

      render(
        <form onSubmit={handleSubmit}>
          <Checkbox name="terms" value="accepted" aria-label="Accept terms" />
          <button type="submit">Submit</button>
        </form>
      );

      await user.click(screen.getByRole('checkbox'));
      await user.click(screen.getByRole('button'));

      expect(handleSubmit).toHaveBeenCalled();
    });

    it('should work with label element', async () => {
      const user = userEvent.setup();
      render(
        <label>
          <Checkbox />
          <span>I agree to the terms</span>
        </label>
      );

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).not.toBeChecked();

      // Clicking the label should toggle the checkbox
      await user.click(screen.getByText('I agree to the terms'));
      expect(checkbox).toBeChecked();
    });

    it('should support multiple checkboxes independently', async () => {
      const user = userEvent.setup();
      render(
        <>
          <Checkbox aria-label="Option 1" />
          <Checkbox aria-label="Option 2" />
          <Checkbox aria-label="Option 3" />
        </>
      );

      const checkboxes = screen.getAllByRole('checkbox');

      await user.click(checkboxes[0]);
      expect(checkboxes[0]).toBeChecked();
      expect(checkboxes[1]).not.toBeChecked();
      expect(checkboxes[2]).not.toBeChecked();

      await user.click(checkboxes[2]);
      expect(checkboxes[0]).toBeChecked();
      expect(checkboxes[1]).not.toBeChecked();
      expect(checkboxes[2]).toBeChecked();
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid clicks', async () => {
      const handleChange = vi.fn();
      const user = userEvent.setup();

      render(<Checkbox onCheckedChange={handleChange} aria-label="Rapid clicks" />);

      const checkbox = screen.getByRole('checkbox');

      // Rapid clicks
      await user.click(checkbox);
      await user.click(checkbox);
      await user.click(checkbox);
      await user.click(checkbox);

      expect(handleChange).toHaveBeenCalledTimes(4);
      expect(checkbox).not.toBeChecked(); // Should end up unchecked (4 clicks)
    });

    it('should handle controlled component with no onChange', () => {
      // Should not crash when controlled without onChange
      const { container } = render(<Checkbox checked={true} aria-label="No handler" />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should spread additional HTML attributes', () => {
      render(
        <Checkbox
          data-testid="custom-checkbox"
          data-analytics="checkbox-click"
          aria-label="Custom attrs"
        />
      );

      const checkbox = screen.getByTestId('custom-checkbox');
      expect(checkbox).toHaveAttribute('data-analytics', 'checkbox-click');
    });
  });
});
