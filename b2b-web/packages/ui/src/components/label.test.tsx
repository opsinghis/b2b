/**
 * Label Component Tests
 *
 * @package ui
 * @component Label
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Label } from './label';

describe('Label Component', () => {
  describe('Rendering', () => {
    it('should render label with text', () => {
      render(<Label>Username</Label>);
      expect(screen.getByText('Username')).toBeInTheDocument();
    });

    it('should render as label element', () => {
      render(<Label>Test Label</Label>);
      const label = screen.getByText('Test Label');
      expect(label.tagName).toBe('LABEL');
    });

    it('should apply default classes', () => {
      render(<Label>Default</Label>);
      const label = screen.getByText('Default');
      expect(label).toHaveClass('text-sm', 'font-medium', 'leading-none');
    });

    it('should merge custom className', () => {
      render(<Label className="custom-label">Custom</Label>);
      const label = screen.getByText('Custom');
      expect(label).toHaveClass('custom-label');
      expect(label).toHaveClass('text-sm'); // Should still have default
    });

    it('should forward ref', () => {
      const ref = { current: null };
      render(<Label ref={ref}>Ref test</Label>);
      expect(ref.current).toBeInstanceOf(HTMLLabelElement);
    });
  });

  describe('htmlFor Association', () => {
    it('should associate with input using htmlFor', () => {
      render(
        <>
          <Label htmlFor="email-input">Email</Label>
          <input id="email-input" type="email" />
        </>
      );

      const label = screen.getByText('Email');
      const input = screen.getByRole('textbox');

      expect(label).toHaveAttribute('for', 'email-input');
      expect(input).toHaveAttribute('id', 'email-input');
    });

    it('should associate with checkbox using htmlFor', () => {
      render(
        <>
          <Label htmlFor="terms-checkbox">Accept terms</Label>
          <input id="terms-checkbox" type="checkbox" />
        </>
      );

      const label = screen.getByText('Accept terms');
      const checkbox = screen.getByRole('checkbox');

      expect(label).toHaveAttribute('for', 'terms-checkbox');
      expect(checkbox).toHaveAttribute('id', 'terms-checkbox');
    });

    it('should work without htmlFor (implicit association)', () => {
      render(
        <Label>
          Password
          <input type="password" />
        </Label>
      );

      const label = screen.getByText(/Password/);
      expect(label.tagName).toBe('LABEL');
    });
  });

  describe('Peer Disabled Styles', () => {
    it('should have peer-disabled styles', () => {
      render(<Label>Peer disabled</Label>);
      const label = screen.getByText('Peer disabled');
      expect(label).toHaveClass('peer-disabled:cursor-not-allowed');
      expect(label).toHaveClass('peer-disabled:opacity-70');
    });

    it('should style appropriately when associated input is disabled', () => {
      render(
        <>
          <Label htmlFor="disabled-input">Disabled field</Label>
          <input id="disabled-input" className="peer" disabled />
        </>
      );

      const label = screen.getByText('Disabled field');
      expect(label).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should support aria attributes', () => {
      render(
        <Label aria-label="Field label" aria-describedby="helper-text">
          Field name
        </Label>
      );

      const label = screen.getByText('Field name');
      expect(label).toHaveAttribute('aria-label', 'Field label');
      expect(label).toHaveAttribute('aria-describedby', 'helper-text');
    });

    it('should maintain semantic HTML', () => {
      render(<Label>Semantic label</Label>);
      const label = screen.getByText('Semantic label');
      expect(label.tagName).toBe('LABEL');
    });

    it('should work with nested form controls', () => {
      render(
        <Label>
          Select option
          <select>
            <option>Option 1</option>
            <option>Option 2</option>
          </select>
        </Label>
      );

      expect(screen.getByText('Select option')).toBeInTheDocument();
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });
  });

  describe('Content', () => {
    it('should render text content', () => {
      render(<Label>Simple text</Label>);
      expect(screen.getByText('Simple text')).toBeInTheDocument();
    });

    it('should render with JSX content', () => {
      render(
        <Label>
          <span>Email</span> <span className="required">*</span>
        </Label>
      );

      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('*')).toBeInTheDocument();
    });

    it('should render with icon', () => {
      render(
        <Label>
          <svg data-testid="icon" />
          Label with icon
        </Label>
      );

      expect(screen.getByTestId('icon')).toBeInTheDocument();
      expect(screen.getByText('Label with icon')).toBeInTheDocument();
    });
  });

  describe('Integration', () => {
    it('should work in a form', () => {
      render(
        <form>
          <Label htmlFor="username">Username</Label>
          <input id="username" type="text" />
        </form>
      );

      const label = screen.getByText('Username');
      const input = screen.getByRole('textbox');

      expect(label).toBeInTheDocument();
      expect(input).toBeInTheDocument();
    });

    it('should work with multiple form fields', () => {
      render(
        <>
          <Label htmlFor="first-name">First Name</Label>
          <input id="first-name" type="text" />

          <Label htmlFor="last-name">Last Name</Label>
          <input id="last-name" type="text" />

          <Label htmlFor="email">Email</Label>
          <input id="email" type="email" />
        </>
      );

      expect(screen.getByText('First Name')).toBeInTheDocument();
      expect(screen.getByText('Last Name')).toBeInTheDocument();
      expect(screen.getByText('Email')).toBeInTheDocument();
    });

    it('should work with required field indicator', () => {
      render(
        <>
          <Label htmlFor="required-field">
            Required Field <span aria-label="required">*</span>
          </Label>
          <input id="required-field" required />
        </>
      );

      expect(screen.getByText('Required Field')).toBeInTheDocument();
      expect(screen.getByLabelText('required')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty label', () => {
      const { container } = render(<Label />);
      const label = container.querySelector('label');
      expect(label).toBeInTheDocument();
    });

    it('should spread additional props', () => {
      render(
        <Label data-testid="custom-label" data-field="username">
          Username
        </Label>
      );

      const label = screen.getByTestId('custom-label');
      expect(label).toHaveAttribute('data-field', 'username');
    });

    it('should handle long text', () => {
      const longText = 'This is a very long label text that might wrap to multiple lines in the UI';
      render(<Label>{longText}</Label>);
      expect(screen.getByText(longText)).toBeInTheDocument();
    });

    it('should work with special characters', () => {
      render(<Label>Name (required) - français & español</Label>);
      expect(screen.getByText(/Name \(required\) - français & español/)).toBeInTheDocument();
    });
  });

  describe('Typography', () => {
    it('should have text-sm size', () => {
      render(<Label>Small text</Label>);
      const label = screen.getByText('Small text');
      expect(label).toHaveClass('text-sm');
    });

    it('should have font-medium weight', () => {
      render(<Label>Medium weight</Label>);
      const label = screen.getByText('Medium weight');
      expect(label).toHaveClass('font-medium');
    });

    it('should have leading-none line height', () => {
      render(<Label>No leading</Label>);
      const label = screen.getByText('No leading');
      expect(label).toHaveClass('leading-none');
    });
  });
});
