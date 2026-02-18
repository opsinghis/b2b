/**
 * Form Component Tests
 *
 * @package ui
 * @component Form
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import {
  Form,
  FormField,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  useFormField,
} from './form';

describe('Form Component', () => {
  describe('Form', () => {
    it('should render form element', () => {
      render(<Form>Form content</Form>);
      const form = screen.getByText('Form content').closest('form');
      expect(form).toBeInTheDocument();
    });

    it('should apply default spacing', () => {
      const { container } = render(<Form>Content</Form>);
      const form = container.querySelector('form');
      expect(form).toHaveClass('space-y-6');
    });

    it('should merge custom className', () => {
      const { container } = render(<Form className="custom-form">Content</Form>);
      const form = container.querySelector('form');
      expect(form).toHaveClass('custom-form');
      expect(form).toHaveClass('space-y-6');
    });

    it('should forward ref', () => {
      const ref = { current: null } as React.RefObject<HTMLFormElement>;
      render(<Form ref={ref}>Content</Form>);
      expect(ref.current).toBeInstanceOf(HTMLFormElement);
    });

    it('should handle form submission', async () => {
      const handleSubmit = vi.fn((e) => e.preventDefault());
      const user = userEvent.setup();

      render(
        <Form onSubmit={handleSubmit}>
          <button type="submit">Submit</button>
        </Form>
      );

      await user.click(screen.getByRole('button'));
      expect(handleSubmit).toHaveBeenCalled();
    });

    it('should spread additional props', () => {
      render(
        <Form data-testid="test-form" aria-label="Test form">
          Content
        </Form>
      );

      const form = screen.getByTestId('test-form');
      expect(form).toHaveAttribute('aria-label', 'Test form');
    });
  });

  describe('FormField', () => {
    it('should render children', () => {
      render(
        <FormField name="username">
          <div>Field content</div>
        </FormField>
      );

      expect(screen.getByText('Field content')).toBeInTheDocument();
    });

    it('should apply default spacing', () => {
      const { container } = render(
        <FormField name="email">
          <div>Content</div>
        </FormField>
      );

      const field = container.querySelector('.space-y-2');
      expect(field).toBeInTheDocument();
    });

    it('should merge custom className', () => {
      const { container } = render(
        <FormField name="password" className="custom-field">
          <div>Content</div>
        </FormField>
      );

      const field = container.querySelector('.custom-field');
      expect(field).toBeInTheDocument();
      expect(field).toHaveClass('space-y-2');
    });

    it('should provide context with unique ID', () => {
      function TestComponent() {
        const { id } = useFormField();
        return <div data-testid="field-id">{id}</div>;
      }

      render(
        <FormField name="test">
          <TestComponent />
        </FormField>
      );

      const fieldId = screen.getByTestId('field-id').textContent;
      expect(fieldId).toContain('test-');
    });

    it('should provide error in context', () => {
      function TestComponent() {
        const { error } = useFormField();
        return <div data-testid="field-error">{error || 'no error'}</div>;
      }

      render(
        <FormField name="test" error="Field is required">
          <TestComponent />
        </FormField>
      );

      expect(screen.getByTestId('field-error')).toHaveTextContent('Field is required');
    });
  });

  describe('useFormField hook', () => {
    it('should throw error when used outside FormField', () => {
      // Suppress console error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      function TestComponent() {
        useFormField();
        return <div>Test</div>;
      }

      expect(() => {
        render(<TestComponent />);
      }).toThrow('useFormField must be used within a FormField');

      consoleSpy.mockRestore();
    });
  });

  describe('FormLabel', () => {
    it('should render label', () => {
      render(
        <FormField name="username">
          <FormLabel>Username</FormLabel>
        </FormField>
      );

      expect(screen.getByText('Username')).toBeInTheDocument();
    });

    it('should associate with field ID', () => {
      render(
        <FormField name="email">
          <FormLabel>Email</FormLabel>
        </FormField>
      );

      const label = screen.getByText('Email');
      const htmlFor = label.getAttribute('for');
      expect(htmlFor).toContain('email-');
    });

    it('should apply error styling when error exists', () => {
      render(
        <FormField name="password" error="Password is required">
          <FormLabel>Password</FormLabel>
        </FormField>
      );

      const label = screen.getByText('Password');
      expect(label).toHaveClass('text-destructive');
    });

    it('should not apply error styling when no error', () => {
      render(
        <FormField name="username">
          <FormLabel>Username</FormLabel>
        </FormField>
      );

      const label = screen.getByText('Username');
      expect(label).not.toHaveClass('text-destructive');
    });

    it('should merge custom className', () => {
      render(
        <FormField name="test">
          <FormLabel className="custom-label">Label</FormLabel>
        </FormField>
      );

      const label = screen.getByText('Label');
      expect(label).toHaveClass('custom-label');
    });

    it('should forward ref', () => {
      const ref = { current: null };

      render(
        <FormField name="test">
          <FormLabel ref={ref}>Label</FormLabel>
        </FormField>
      );

      expect(ref.current).toBeTruthy();
    });
  });

  describe('FormControl', () => {
    it('should render children', () => {
      render(
        <FormField name="username">
          <FormControl>
            <input type="text" />
          </FormControl>
        </FormField>
      );

      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('should add field ID to input', () => {
      render(
        <FormField name="email">
          <FormControl>
            <input type="email" />
          </FormControl>
        </FormField>
      );

      const input = screen.getByRole('textbox');
      const id = input.getAttribute('id');
      expect(id).toContain('email-');
    });

    it('should add aria-invalid when error exists', () => {
      const { container } = render(
        <FormField name="password" error="Required">
          <FormControl>
            <input type="password" />
          </FormControl>
        </FormField>
      );

      const input = container.querySelector('input[type="password"]');
      expect(input).toHaveAttribute('aria-invalid', 'true');
    });

    it('should not add aria-invalid when no error', () => {
      render(
        <FormField name="username">
          <FormControl>
            <input type="text" />
          </FormControl>
        </FormField>
      );

      const input = screen.getByRole('textbox');
      expect(input).not.toHaveAttribute('aria-invalid', 'true');
    });

    it('should add aria-describedby when error exists', () => {
      render(
        <FormField name="email" error="Invalid email">
          <FormControl>
            <input type="email" />
          </FormControl>
        </FormField>
      );

      const input = screen.getByRole('textbox');
      const describedBy = input.getAttribute('aria-describedby');
      expect(describedBy).toContain('email-');
      expect(describedBy).toContain('-error');
    });

    it('should work with textarea', () => {
      render(
        <FormField name="bio">
          <FormControl>
            <textarea />
          </FormControl>
        </FormField>
      );

      const textarea = screen.getByRole('textbox');
      const id = textarea.getAttribute('id');
      expect(id).toContain('bio-');
    });

    it('should work with select', () => {
      render(
        <FormField name="country">
          <FormControl>
            <select>
              <option>USA</option>
              <option>Canada</option>
            </select>
          </FormControl>
        </FormField>
      );

      const select = screen.getByRole('combobox');
      const id = select.getAttribute('id');
      expect(id).toContain('country-');
    });

    it('should forward ref', () => {
      const ref = { current: null } as React.RefObject<HTMLDivElement>;

      render(
        <FormField name="test">
          <FormControl ref={ref}>
            <input type="text" />
          </FormControl>
        </FormField>
      );

      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });
  });

  describe('FormDescription', () => {
    it('should render description text', () => {
      render(
        <FormField name="username">
          <FormDescription>Enter your username</FormDescription>
        </FormField>
      );

      expect(screen.getByText('Enter your username')).toBeInTheDocument();
    });

    it('should have correct ID for aria-describedby', () => {
      render(
        <FormField name="email">
          <FormDescription>We'll never share your email</FormDescription>
        </FormField>
      );

      const description = screen.getByText("We'll never share your email");
      const id = description.getAttribute('id');
      expect(id).toContain('email-');
      expect(id).toContain('-description');
    });

    it('should apply default styling', () => {
      render(
        <FormField name="test">
          <FormDescription>Description</FormDescription>
        </FormField>
      );

      const description = screen.getByText('Description');
      expect(description).toHaveClass('text-sm', 'text-muted-foreground');
    });

    it('should merge custom className', () => {
      render(
        <FormField name="test">
          <FormDescription className="custom-desc">Description</FormDescription>
        </FormField>
      );

      const description = screen.getByText('Description');
      expect(description).toHaveClass('custom-desc');
      expect(description).toHaveClass('text-sm');
    });

    it('should forward ref', () => {
      const ref = { current: null } as React.RefObject<HTMLParagraphElement>;

      render(
        <FormField name="test">
          <FormDescription ref={ref}>Description</FormDescription>
        </FormField>
      );

      expect(ref.current).toBeInstanceOf(HTMLParagraphElement);
    });
  });

  describe('FormMessage', () => {
    it('should render error message from context', () => {
      render(
        <FormField name="username" error="Username is required">
          <FormMessage />
        </FormField>
      );

      expect(screen.getByText('Username is required')).toBeInTheDocument();
    });

    it('should render children when no error in context', () => {
      render(
        <FormField name="email">
          <FormMessage>Custom message</FormMessage>
        </FormField>
      );

      expect(screen.getByText('Custom message')).toBeInTheDocument();
    });

    it('should prioritize context error over children', () => {
      render(
        <FormField name="password" error="Password is required">
          <FormMessage>Custom message</FormMessage>
        </FormField>
      );

      expect(screen.getByText('Password is required')).toBeInTheDocument();
      expect(screen.queryByText('Custom message')).not.toBeInTheDocument();
    });

    it('should not render when no error or children', () => {
      render(
        <FormField name="username">
          <FormMessage />
        </FormField>
      );

      // FormMessage should not render anything
      const messages = document.querySelectorAll('.text-destructive');
      expect(messages.length).toBe(0);
    });

    it('should have correct ID for aria-describedby', () => {
      render(
        <FormField name="email" error="Invalid email">
          <FormMessage />
        </FormField>
      );

      const message = screen.getByText('Invalid email');
      const id = message.getAttribute('id');
      expect(id).toContain('email-');
      expect(id).toContain('-error');
    });

    it('should apply error styling', () => {
      render(
        <FormField name="test" error="Error message">
          <FormMessage />
        </FormField>
      );

      const message = screen.getByText('Error message');
      expect(message).toHaveClass('text-sm', 'font-medium', 'text-destructive');
    });

    it('should merge custom className', () => {
      render(
        <FormField name="test" error="Error">
          <FormMessage className="custom-message" />
        </FormField>
      );

      const message = screen.getByText('Error');
      expect(message).toHaveClass('custom-message');
      expect(message).toHaveClass('text-destructive');
    });

    it('should forward ref', () => {
      const ref = { current: null } as React.RefObject<HTMLParagraphElement>;

      render(
        <FormField name="test" error="Error">
          <FormMessage ref={ref} />
        </FormField>
      );

      expect(ref.current).toBeInstanceOf(HTMLParagraphElement);
    });
  });

  describe('Integration', () => {
    it('should render complete form field', () => {
      render(
        <Form>
          <FormField name="username">
            <FormLabel>Username</FormLabel>
            <FormControl>
              <input type="text" />
            </FormControl>
            <FormDescription>Choose a unique username</FormDescription>
            <FormMessage />
          </FormField>
        </Form>
      );

      expect(screen.getByText('Username')).toBeInTheDocument();
      expect(screen.getByRole('textbox')).toBeInTheDocument();
      expect(screen.getByText('Choose a unique username')).toBeInTheDocument();
    });

    it('should render form field with error', () => {
      render(
        <Form>
          <FormField name="email" error="Email is required">
            <FormLabel>Email</FormLabel>
            <FormControl>
              <input type="email" />
            </FormControl>
            <FormMessage />
          </FormField>
        </Form>
      );

      const label = screen.getByText('Email');
      const input = screen.getByRole('textbox');
      const error = screen.getByText('Email is required');

      expect(label).toHaveClass('text-destructive');
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(error).toBeInTheDocument();
    });

    it('should render multiple form fields', () => {
      const { container } = render(
        <Form>
          <FormField name="username">
            <FormLabel>Username</FormLabel>
            <FormControl>
              <input type="text" />
            </FormControl>
          </FormField>
          <FormField name="email">
            <FormLabel>Email</FormLabel>
            <FormControl>
              <input type="email" />
            </FormControl>
          </FormField>
          <FormField name="password">
            <FormLabel>Password</FormLabel>
            <FormControl>
              <input type="password" />
            </FormControl>
          </FormField>
        </Form>
      );

      expect(screen.getByText('Username')).toBeInTheDocument();
      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('Password')).toBeInTheDocument();
      expect(container.querySelectorAll('input')).toHaveLength(3);
    });

    it('should handle form submission with fields', async () => {
      const handleSubmit = vi.fn((e) => e.preventDefault());
      const user = userEvent.setup();

      render(
        <Form onSubmit={handleSubmit}>
          <FormField name="username">
            <FormControl>
              <input type="text" name="username" />
            </FormControl>
          </FormField>
          <button type="submit">Submit</button>
        </Form>
      );

      await user.type(screen.getByRole('textbox'), 'testuser');
      await user.click(screen.getByRole('button'));

      expect(handleSubmit).toHaveBeenCalled();
    });

    it('should associate label with input via ID', () => {
      render(
        <FormField name="email">
          <FormLabel>Email Address</FormLabel>
          <FormControl>
            <input type="email" />
          </FormControl>
        </FormField>
      );

      const label = screen.getByText('Email Address');
      const input = screen.getByRole('textbox');
      const labelFor = label.getAttribute('for');
      const inputId = input.getAttribute('id');

      expect(labelFor).toBe(inputId);
    });

    it('should connect error message to input via aria-describedby', () => {
      const { container } = render(
        <FormField name="password" error="Password is too short">
          <FormControl>
            <input type="password" />
          </FormControl>
          <FormMessage />
        </FormField>
      );

      const input = container.querySelector('input[type="password"]');
      const error = screen.getByText('Password is too short');
      const describedBy = input?.getAttribute('aria-describedby');
      const errorId = error.getAttribute('id');

      expect(describedBy).toBe(errorId);
    });
  });
});
