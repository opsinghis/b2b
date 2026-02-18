/**
 * Card Component Tests
 *
 * @package ui
 * @component Card
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from './card';

describe('Card Component', () => {
  describe('Card', () => {
    it('should render card with children', () => {
      render(<Card>Card content</Card>);
      expect(screen.getByText('Card content')).toBeInTheDocument();
    });

    it('should apply default classes', () => {
      const { container } = render(<Card>Content</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('rounded-lg', 'border', 'bg-card', 'shadow-sm');
    });

    it('should merge custom className', () => {
      const { container } = render(<Card className="custom-class">Content</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('custom-class');
      expect(card).toHaveClass('rounded-lg'); // Should still have default classes
    });

    it('should forward ref', () => {
      const ref = { current: null } as React.RefObject<HTMLDivElement>;
      render(<Card ref={ref}>Content</Card>);
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });

    it('should spread additional props', () => {
      render(<Card data-testid="card" aria-label="Test card">Content</Card>);
      const card = screen.getByTestId('card');
      expect(card).toHaveAttribute('aria-label', 'Test card');
    });
  });

  describe('CardHeader', () => {
    it('should render card header', () => {
      render(<CardHeader>Header content</CardHeader>);
      expect(screen.getByText('Header content')).toBeInTheDocument();
    });

    it('should apply default classes', () => {
      const { container } = render(<CardHeader>Header</CardHeader>);
      const header = container.firstChild as HTMLElement;
      expect(header).toHaveClass('flex', 'flex-col', 'space-y-1.5', 'p-6');
    });

    it('should merge custom className', () => {
      const { container } = render(
        <CardHeader className="custom-header">Header</CardHeader>
      );
      const header = container.firstChild as HTMLElement;
      expect(header).toHaveClass('custom-header');
      expect(header).toHaveClass('flex');
    });

    it('should forward ref', () => {
      const ref = { current: null } as React.RefObject<HTMLDivElement>;
      render(<CardHeader ref={ref}>Header</CardHeader>);
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });
  });

  describe('CardTitle', () => {
    it('should render card title', () => {
      render(<CardTitle>Card Title</CardTitle>);
      expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Card Title');
    });

    it('should apply default classes', () => {
      render(<CardTitle>Title</CardTitle>);
      const title = screen.getByRole('heading');
      expect(title).toHaveClass('text-2xl', 'font-semibold', 'leading-none', 'tracking-tight');
    });

    it('should merge custom className', () => {
      render(<CardTitle className="custom-title">Title</CardTitle>);
      const title = screen.getByRole('heading');
      expect(title).toHaveClass('custom-title');
      expect(title).toHaveClass('text-2xl');
    });

    it('should render as h3 element', () => {
      render(<CardTitle>Title</CardTitle>);
      const title = screen.getByText('Title');
      expect(title.tagName).toBe('H3');
    });

    it('should forward ref', () => {
      const ref = { current: null } as React.RefObject<HTMLParagraphElement>;
      render(<CardTitle ref={ref}>Title</CardTitle>);
      expect(ref.current).toBeInstanceOf(HTMLHeadingElement);
    });
  });

  describe('CardDescription', () => {
    it('should render card description', () => {
      render(<CardDescription>Description text</CardDescription>);
      expect(screen.getByText('Description text')).toBeInTheDocument();
    });

    it('should apply default classes', () => {
      const { container } = render(<CardDescription>Description</CardDescription>);
      const description = container.firstChild as HTMLElement;
      expect(description).toHaveClass('text-sm', 'text-muted-foreground');
    });

    it('should merge custom className', () => {
      const { container } = render(
        <CardDescription className="custom-desc">Description</CardDescription>
      );
      const description = container.firstChild as HTMLElement;
      expect(description).toHaveClass('custom-desc');
      expect(description).toHaveClass('text-sm');
    });

    it('should render as paragraph element', () => {
      render(<CardDescription>Description</CardDescription>);
      const description = screen.getByText('Description');
      expect(description.tagName).toBe('P');
    });

    it('should forward ref', () => {
      const ref = { current: null } as React.RefObject<HTMLParagraphElement>;
      render(<CardDescription ref={ref}>Description</CardDescription>);
      expect(ref.current).toBeInstanceOf(HTMLParagraphElement);
    });
  });

  describe('CardContent', () => {
    it('should render card content', () => {
      render(<CardContent>Content text</CardContent>);
      expect(screen.getByText('Content text')).toBeInTheDocument();
    });

    it('should apply default classes', () => {
      const { container } = render(<CardContent>Content</CardContent>);
      const content = container.firstChild as HTMLElement;
      expect(content).toHaveClass('p-6', 'pt-0');
    });

    it('should merge custom className', () => {
      const { container } = render(
        <CardContent className="custom-content">Content</CardContent>
      );
      const content = container.firstChild as HTMLElement;
      expect(content).toHaveClass('custom-content');
      expect(content).toHaveClass('p-6');
    });

    it('should forward ref', () => {
      const ref = { current: null } as React.RefObject<HTMLDivElement>;
      render(<CardContent ref={ref}>Content</CardContent>);
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });
  });

  describe('CardFooter', () => {
    it('should render card footer', () => {
      render(<CardFooter>Footer text</CardFooter>);
      expect(screen.getByText('Footer text')).toBeInTheDocument();
    });

    it('should apply default classes', () => {
      const { container } = render(<CardFooter>Footer</CardFooter>);
      const footer = container.firstChild as HTMLElement;
      expect(footer).toHaveClass('flex', 'items-center', 'p-6', 'pt-0');
    });

    it('should merge custom className', () => {
      const { container } = render(
        <CardFooter className="custom-footer">Footer</CardFooter>
      );
      const footer = container.firstChild as HTMLElement;
      expect(footer).toHaveClass('custom-footer');
      expect(footer).toHaveClass('flex');
    });

    it('should forward ref', () => {
      const ref = { current: null } as React.RefObject<HTMLDivElement>;
      render(<CardFooter ref={ref}>Footer</CardFooter>);
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });
  });

  describe('Integration', () => {
    it('should render complete card structure', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Test Card</CardTitle>
            <CardDescription>This is a test card</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Card content goes here</p>
          </CardContent>
          <CardFooter>
            <button>Action</button>
          </CardFooter>
        </Card>
      );

      expect(screen.getByRole('heading', { name: 'Test Card' })).toBeInTheDocument();
      expect(screen.getByText('This is a test card')).toBeInTheDocument();
      expect(screen.getByText('Card content goes here')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument();
    });

    it('should render card with only title and content', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Simple Card</CardTitle>
          </CardHeader>
          <CardContent>Simple content</CardContent>
        </Card>
      );

      expect(screen.getByRole('heading')).toHaveTextContent('Simple Card');
      expect(screen.getByText('Simple content')).toBeInTheDocument();
    });

    it('should render nested cards', () => {
      render(
        <Card data-testid="outer-card">
          <CardContent>
            <Card data-testid="inner-card">
              <CardContent>Nested content</CardContent>
            </Card>
          </CardContent>
        </Card>
      );

      expect(screen.getByTestId('outer-card')).toBeInTheDocument();
      expect(screen.getByTestId('inner-card')).toBeInTheDocument();
      expect(screen.getByText('Nested content')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should support aria attributes', () => {
      render(
        <Card
          role="article"
          aria-labelledby="card-title"
          aria-describedby="card-desc"
        >
          <CardTitle id="card-title">Accessible Card</CardTitle>
          <CardDescription id="card-desc">Description</CardDescription>
        </Card>
      );

      const card = screen.getByRole('article');
      expect(card).toHaveAttribute('aria-labelledby', 'card-title');
      expect(card).toHaveAttribute('aria-describedby', 'card-desc');
    });

    it('should maintain semantic HTML structure', () => {
      const { container } = render(
        <Card>
          <CardHeader>
            <CardTitle>Title</CardTitle>
            <CardDescription>Description</CardDescription>
          </CardHeader>
          <CardContent>Content</CardContent>
        </Card>
      );

      const card = container.firstChild as HTMLElement;
      const header = card.querySelector('.flex.flex-col');
      const heading = card.querySelector('h3');
      const paragraph = card.querySelector('p');

      expect(card.tagName).toBe('DIV');
      expect(header).toBeInTheDocument();
      expect(heading).toBeInTheDocument();
      expect(paragraph).toBeInTheDocument();
    });
  });
});
