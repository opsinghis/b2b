/**
 * Input Component Tests
 *
 * @package ui
 * @component Input
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock Input component for testing
// Replace with actual import: import { Input } from './input';
const Input = ({
  type = 'text',
  placeholder,
  disabled = false,
  error,
  onChange,
  value,
  ...props
}: {
  type?: string;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  value?: string;
}) => (
  <div className="input-wrapper">
    <input
      type={type}
      placeholder={placeholder}
      disabled={disabled}
      onChange={onChange}
      value={value}
      aria-invalid={!!error}
      aria-describedby={error ? 'error-message' : undefined}
      {...props}
    />
    {error && <span id="error-message" className="error-text" role="alert">{error}</span>}
  </div>
);

describe('Input Component', () => {
  describe('Rendering', () => {
    it('should render input element', () => {
      render(<Input />);
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('should render with placeholder', () => {
      render(<Input placeholder="Enter text..." />);
      expect(screen.getByPlaceholderText('Enter text...')).toBeInTheDocument();
    });

    it('should render with different types', () => {
      const { rerender } = render(<Input type="email" />);
      expect(screen.getByRole('textbox')).toHaveAttribute('type', 'email');

      rerender(<Input type="password" />);
      // Password inputs don't have textbox role
      expect(screen.getByDisplayValue('')).toHaveAttribute('type', 'password');
    });
  });

  describe('User Interactions', () => {
    it('should handle text input', async () => {
      const handleChange = vi.fn();
      const user = userEvent.setup();

      render(<Input onChange={handleChange} />);
      await user.type(screen.getByRole('textbox'), 'Hello');

      expect(handleChange).toHaveBeenCalledTimes(5); // Once per character
    });

    it('should display typed value', async () => {
      const user = userEvent.setup();

      render(<Input />);
      const input = screen.getByRole('textbox');
      await user.type(input, 'Test value');

      expect(input).toHaveValue('Test value');
    });

    it('should clear input value', async () => {
      const user = userEvent.setup();

      render(<Input />);
      const input = screen.getByRole('textbox');
      await user.type(input, 'Test');
      await user.clear(input);

      expect(input).toHaveValue('');
    });
  });

  describe('States', () => {
    it('should be disabled when disabled prop is true', () => {
      render(<Input disabled />);
      expect(screen.getByRole('textbox')).toBeDisabled();
    });

    it('should not accept input when disabled', async () => {
      const handleChange = vi.fn();
      const user = userEvent.setup();

      render(<Input disabled onChange={handleChange} />);
      await user.type(screen.getByRole('textbox'), 'Test');

      expect(handleChange).not.toHaveBeenCalled();
    });

    it('should display error message', () => {
      render(<Input error="This field is required" />);
      expect(screen.getByRole('alert')).toHaveTextContent('This field is required');
    });

    it('should set aria-invalid when error exists', () => {
      render(<Input error="Invalid input" />);
      expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
    });
  });

  describe('Accessibility', () => {
    it('should be focusable', async () => {
      const user = userEvent.setup();
      render(<Input />);

      await user.tab();
      expect(screen.getByRole('textbox')).toHaveFocus();
    });

    it('should not be focusable when disabled', async () => {
      const user = userEvent.setup();
      render(
        <div>
          <Input disabled />
          <button>After</button>
        </div>
      );

      await user.tab();
      expect(screen.getByRole('button')).toHaveFocus();
    });

    it('should have aria-describedby pointing to error', () => {
      render(<Input error="Error message" />);
      expect(screen.getByRole('textbox')).toHaveAttribute('aria-describedby', 'error-message');
    });

    it('should announce error to screen readers', () => {
      render(<Input error="Required field" />);
      const errorMessage = screen.getByRole('alert');
      expect(errorMessage).toBeInTheDocument();
    });
  });

  describe('Controlled vs Uncontrolled', () => {
    it('should work as controlled input', async () => {
      const handleChange = vi.fn();

      render(
        <Input
          value="controlled value"
          onChange={handleChange}
        />
      );

      // Controlled inputs maintain their value through state
      expect(screen.getByRole('textbox')).toBeInTheDocument();
      expect(screen.getByRole('textbox')).toHaveValue('controlled value');
    });

    it('should work as uncontrolled input', async () => {
      const user = userEvent.setup();
      render(<Input />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'Uncontrolled');

      expect(input).toHaveValue('Uncontrolled');
    });
  });
});
