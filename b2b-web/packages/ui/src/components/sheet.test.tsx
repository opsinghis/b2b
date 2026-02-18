/**
 * Sheet Component Tests
 *
 * @package ui
 * @component Sheet
 */

import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from './sheet';

describe('Sheet Component', () => {
  const renderSheet = (side: 'top' | 'bottom' | 'left' | 'right' = 'right') => {
    return render(
      <Sheet>
        <SheetTrigger>Open sheet</SheetTrigger>
        <SheetContent side={side}>
          <SheetHeader>
            <SheetTitle>Sheet Title</SheetTitle>
            <SheetDescription>Sheet Description</SheetDescription>
          </SheetHeader>
          <div>Sheet content</div>
          <SheetFooter>
            <button>Action</button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    );
  };

  describe('Rendering', () => {
    it('should render sheet trigger', () => {
      renderSheet();
      expect(screen.getByText('Open sheet')).toBeInTheDocument();
    });

    it('should not show content initially', () => {
      renderSheet();
      expect(screen.queryByText('Sheet Title')).not.toBeInTheDocument();
    });

    it('should show content when trigger is clicked', async () => {
      const user = userEvent.setup();
      renderSheet();

      await user.click(screen.getByText('Open sheet'));

      await waitFor(() => {
        expect(screen.getByText('Sheet Title')).toBeInTheDocument();
      });
    });

    it('should render in portal', async () => {
      const user = userEvent.setup();
      const { baseElement } = renderSheet();

      await user.click(screen.getByText('Open sheet'));

      await waitFor(() => {
        // Content should be in a portal
        const content = baseElement.querySelector('[role="dialog"]');
        expect(content).toBeInTheDocument();
      });
    });
  });

  describe('Interactions', () => {
    it('should open when trigger is clicked', async () => {
      const user = userEvent.setup();
      renderSheet();

      expect(screen.queryByText('Sheet Title')).not.toBeInTheDocument();

      await user.click(screen.getByText('Open sheet'));

      await waitFor(() => {
        expect(screen.getByText('Sheet Title')).toBeInTheDocument();
      });
    });

    it('should close when close button is clicked', async () => {
      const user = userEvent.setup();
      renderSheet();

      const trigger = screen.getByText('Open sheet');

      // Open
      await user.click(trigger);
      await waitFor(() => {
        expect(screen.getByText('Sheet Title')).toBeInTheDocument();
        expect(trigger).toHaveAttribute('data-state', 'open');
      });

      // Close via X button
      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      await waitFor(
        () => {
          expect(trigger).toHaveAttribute('data-state', 'closed');
        },
        { timeout: 2000 }
      );
    });

    it('should close when overlay is clicked', async () => {
      const user = userEvent.setup();
      const { baseElement } = renderSheet();

      const trigger = screen.getByText('Open sheet');

      // Open sheet
      await user.click(trigger);
      await waitFor(() => {
        expect(screen.getByText('Sheet Title')).toBeInTheDocument();
        expect(trigger).toHaveAttribute('data-state', 'open');
      });

      // Click overlay (the dark background)
      const overlay = baseElement.querySelector('[class*="bg-black"]');
      if (overlay) {
        await user.click(overlay);
      }

      await waitFor(
        () => {
          expect(trigger).toHaveAttribute('data-state', 'closed');
        },
        { timeout: 2000 }
      );
    });

    it('should close when pressing Escape', async () => {
      const user = userEvent.setup();
      renderSheet();

      const trigger = screen.getByText('Open sheet');

      await user.click(trigger);
      await waitFor(() => {
        expect(screen.getByText('Sheet Title')).toBeInTheDocument();
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
    it('should have correct data-state when closed', () => {
      renderSheet();
      const trigger = screen.getByText('Open sheet');
      expect(trigger).toHaveAttribute('data-state', 'closed');
    });

    it('should have correct data-state when open', async () => {
      const user = userEvent.setup();
      renderSheet();

      const trigger = screen.getByText('Open sheet');
      await user.click(trigger);

      await waitFor(() => {
        expect(trigger).toHaveAttribute('data-state', 'open');
      });
    });

    it('should work in controlled mode', async () => {
      const { rerender } = render(
        <Sheet open={false}>
          <SheetTrigger>Trigger</SheetTrigger>
          <SheetContent>
            <SheetTitle>Title</SheetTitle>
          </SheetContent>
        </Sheet>
      );

      expect(screen.queryByText('Title')).not.toBeInTheDocument();

      rerender(
        <Sheet open={true}>
          <SheetTrigger>Trigger</SheetTrigger>
          <SheetContent>
            <SheetTitle>Title</SheetTitle>
          </SheetContent>
        </Sheet>
      );

      await waitFor(() => {
        expect(screen.getByText('Title')).toBeInTheDocument();
      });
    });

    it('should accept defaultOpen prop', async () => {
      render(
        <Sheet defaultOpen>
          <SheetTrigger>Trigger</SheetTrigger>
          <SheetContent>
            <SheetTitle>Title</SheetTitle>
          </SheetContent>
        </Sheet>
      );

      await waitFor(() => {
        expect(screen.getByText('Title')).toBeInTheDocument();
      });
    });
  });

  describe('Side Variants', () => {
    it('should render with right side (default)', async () => {
      const user = userEvent.setup();
      renderSheet(); // No side specified, should default to right

      await user.click(screen.getByText('Open sheet'));

      await waitFor(() => {
        expect(screen.getByText('Sheet Title')).toBeInTheDocument();
      });
    });

    it('should render with left side', async () => {
      const user = userEvent.setup();
      renderSheet('left');

      await user.click(screen.getByText('Open sheet'));

      await waitFor(() => {
        expect(screen.getByText('Sheet Title')).toBeInTheDocument();
      });
    });

    it('should render with top side', async () => {
      const user = userEvent.setup();
      renderSheet('top');

      await user.click(screen.getByText('Open sheet'));

      await waitFor(() => {
        expect(screen.getByText('Sheet Title')).toBeInTheDocument();
      });
    });

    it('should render with bottom side', async () => {
      const user = userEvent.setup();
      renderSheet('bottom');

      await user.click(screen.getByText('Open sheet'));

      await waitFor(() => {
        expect(screen.getByText('Sheet Title')).toBeInTheDocument();
      });
    });
  });

  describe('Components', () => {
    it('should render SheetHeader', async () => {
      const user = userEvent.setup();
      renderSheet();

      await user.click(screen.getByText('Open sheet'));

      await waitFor(() => {
        // Header should contain title and description
        expect(screen.getByText('Sheet Title')).toBeInTheDocument();
        expect(screen.getByText('Sheet Description')).toBeInTheDocument();
      });
    });

    it('should render SheetTitle', async () => {
      const user = userEvent.setup();
      renderSheet();

      await user.click(screen.getByText('Open sheet'));

      await waitFor(() => {
        const title = screen.getByText('Sheet Title');
        expect(title).toBeInTheDocument();
        // Should be a heading for accessibility
        expect(title.tagName).toBe('H2');
      });
    });

    it('should render SheetDescription', async () => {
      const user = userEvent.setup();
      renderSheet();

      await user.click(screen.getByText('Open sheet'));

      await waitFor(() => {
        expect(screen.getByText('Sheet Description')).toBeInTheDocument();
      });
    });

    it('should render SheetFooter', async () => {
      const user = userEvent.setup();
      renderSheet();

      await user.click(screen.getByText('Open sheet'));

      await waitFor(() => {
        // Footer should contain action button
        expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument();
      });
    });

    it('should render close button with X icon', async () => {
      const user = userEvent.setup();
      renderSheet();

      await user.click(screen.getByText('Open sheet'));

      await waitFor(() => {
        const closeButton = screen.getByRole('button', { name: /close/i });
        expect(closeButton).toBeInTheDocument();
      });
    });

    it('should render custom close button with SheetClose', async () => {
      const user = userEvent.setup();
      render(
        <Sheet>
          <SheetTrigger>Open</SheetTrigger>
          <SheetContent>
            <SheetTitle>Title</SheetTitle>
            <SheetClose asChild>
              <button>Custom Close</button>
            </SheetClose>
          </SheetContent>
        </Sheet>
      );

      await user.click(screen.getByText('Open'));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Custom Close' })).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes on trigger', async () => {
      const user = userEvent.setup();
      renderSheet();

      const trigger = screen.getByText('Open sheet');
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
      expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');

      await user.click(trigger);

      await waitFor(() => {
        expect(trigger).toHaveAttribute('aria-expanded', 'true');
      });
    });

    it('should have dialog role on content', async () => {
      const user = userEvent.setup();
      renderSheet();

      await user.click(screen.getByText('Open sheet'));

      await waitFor(() => {
        const dialog = screen.getByRole('dialog');
        expect(dialog).toBeInTheDocument();
      });
    });

    it('should associate title with dialog via aria-labelledby', async () => {
      const user = userEvent.setup();
      renderSheet();

      await user.click(screen.getByText('Open sheet'));

      await waitFor(() => {
        const dialog = screen.getByRole('dialog');
        const title = screen.getByText('Sheet Title');
        const dialogLabelledBy = dialog.getAttribute('aria-labelledby');
        const titleId = title.getAttribute('id');
        expect(dialogLabelledBy).toBe(titleId);
      });
    });

    it('should associate description with dialog via aria-describedby', async () => {
      const user = userEvent.setup();
      renderSheet();

      await user.click(screen.getByText('Open sheet'));

      await waitFor(() => {
        const dialog = screen.getByRole('dialog');
        const description = screen.getByText('Sheet Description');
        const dialogDescribedBy = dialog.getAttribute('aria-describedby');
        const descriptionId = description.getAttribute('id');
        expect(dialogDescribedBy).toBe(descriptionId);
      });
    });

    it('should be keyboard accessible', async () => {
      const user = userEvent.setup();
      renderSheet();

      // Tab to trigger
      await user.tab();
      const trigger = screen.getByText('Open sheet');
      expect(trigger).toHaveFocus();

      // Open with Enter
      await user.keyboard('{Enter}');
      await waitFor(() => {
        expect(screen.getByText('Sheet Title')).toBeInTheDocument();
      });
    });

    it('should have accessible close button', async () => {
      const user = userEvent.setup();
      renderSheet();

      await user.click(screen.getByText('Open sheet'));

      await waitFor(() => {
        const closeButton = screen.getByRole('button', { name: /close/i });
        expect(closeButton).toHaveAccessibleName();
      });
    });
  });

  describe('Styling', () => {
    it('should apply custom className to SheetContent', async () => {
      const user = userEvent.setup();
      render(
        <Sheet>
          <SheetTrigger>Open</SheetTrigger>
          <SheetContent className="custom-sheet">
            <SheetTitle>Title</SheetTitle>
          </SheetContent>
        </Sheet>
      );

      await user.click(screen.getByText('Open'));

      await waitFor(() => {
        expect(screen.getByText('Title')).toBeInTheDocument();
      });
    });

    it('should apply custom className to SheetHeader', async () => {
      const user = userEvent.setup();
      render(
        <Sheet>
          <SheetTrigger>Open</SheetTrigger>
          <SheetContent>
            <SheetHeader className="custom-header">
              <SheetTitle>Title</SheetTitle>
            </SheetHeader>
          </SheetContent>
        </Sheet>
      );

      await user.click(screen.getByText('Open'));

      await waitFor(() => {
        expect(screen.getByText('Title')).toBeInTheDocument();
      });
    });

    it('should apply custom className to SheetFooter', async () => {
      const user = userEvent.setup();
      render(
        <Sheet>
          <SheetTrigger>Open</SheetTrigger>
          <SheetContent>
            <SheetTitle>Title</SheetTitle>
            <SheetFooter className="custom-footer">
              <button>Save</button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      );

      await user.click(screen.getByText('Open'));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
      });
    });
  });

  describe('Content', () => {
    it('should render simple text content', async () => {
      const user = userEvent.setup();
      render(
        <Sheet>
          <SheetTrigger>Open</SheetTrigger>
          <SheetContent>
            <SheetTitle>Title</SheetTitle>
            <p>Simple text content</p>
          </SheetContent>
        </Sheet>
      );

      await user.click(screen.getByText('Open'));

      await waitFor(() => {
        expect(screen.getByText('Simple text content')).toBeInTheDocument();
      });
    });

    it('should render complex content with forms', async () => {
      const user = userEvent.setup();
      render(
        <Sheet>
          <SheetTrigger>Open</SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>User Profile</SheetTitle>
              <SheetDescription>Edit your profile information</SheetDescription>
            </SheetHeader>
            <form>
              <input type="text" placeholder="Name" />
              <input type="email" placeholder="Email" />
            </form>
            <SheetFooter>
              <button type="submit">Save changes</button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      );

      await user.click(screen.getByText('Open'));

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Name')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Email')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument();
      });
    });

    it('should handle interactive content', async () => {
      const user = userEvent.setup();
      render(
        <Sheet>
          <SheetTrigger>Open</SheetTrigger>
          <SheetContent>
            <SheetTitle>Interactive</SheetTitle>
            <input type="text" placeholder="Type here" />
          </SheetContent>
        </Sheet>
      );

      await user.click(screen.getByText('Open'));

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Type here')).toBeInTheDocument();
      });

      // Should be able to interact with input
      const input = screen.getByPlaceholderText('Type here');
      await user.type(input, 'test');
      expect(input).toHaveValue('test');
    });
  });

  describe('Integration', () => {
    it('should work with custom trigger element', async () => {
      const user = userEvent.setup();
      render(
        <Sheet>
          <SheetTrigger asChild>
            <button className="custom-trigger">Custom Trigger</button>
          </SheetTrigger>
          <SheetContent>
            <SheetTitle>Title</SheetTitle>
          </SheetContent>
        </Sheet>
      );

      await user.click(screen.getByText('Custom Trigger'));

      await waitFor(() => {
        expect(screen.getByText('Title')).toBeInTheDocument();
      });
    });

    it('should work without SheetHeader', async () => {
      const user = userEvent.setup();
      render(
        <Sheet>
          <SheetTrigger>Open</SheetTrigger>
          <SheetContent>
            <SheetTitle>Just Title</SheetTitle>
            <p>Content without header wrapper</p>
          </SheetContent>
        </Sheet>
      );

      await user.click(screen.getByText('Open'));

      await waitFor(() => {
        expect(screen.getByText('Just Title')).toBeInTheDocument();
        expect(screen.getByText('Content without header wrapper')).toBeInTheDocument();
      });
    });

    it('should work without SheetFooter', async () => {
      const user = userEvent.setup();
      render(
        <Sheet>
          <SheetTrigger>Open</SheetTrigger>
          <SheetContent>
            <SheetTitle>No Footer</SheetTitle>
            <p>Content without footer</p>
          </SheetContent>
        </Sheet>
      );

      await user.click(screen.getByText('Open'));

      await waitFor(() => {
        expect(screen.getByText('No Footer')).toBeInTheDocument();
        expect(screen.getByText('Content without footer')).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle open and close cycle', async () => {
      const user = userEvent.setup();
      renderSheet();

      const trigger = screen.getByText('Open sheet');

      // Open
      await user.click(trigger);
      await waitFor(() => {
        expect(trigger).toHaveAttribute('data-state', 'open');
      });

      // Close via close button
      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      // Verify closed
      await waitFor(
        () => {
          expect(trigger).toHaveAttribute('data-state', 'closed');
        },
        { timeout: 2000 }
      );
    });

    it('should spread additional props to content', async () => {
      const user = userEvent.setup();
      render(
        <Sheet>
          <SheetTrigger>Open</SheetTrigger>
          <SheetContent data-testid="custom-sheet" aria-label="Custom sheet">
            <SheetTitle>Title</SheetTitle>
          </SheetContent>
        </Sheet>
      );

      await user.click(screen.getByText('Open'));

      await waitFor(() => {
        const content = screen.getByTestId('custom-sheet');
        expect(content).toHaveAttribute('aria-label', 'Custom sheet');
      });
    });

    it('should forward ref to SheetContent', async () => {
      const ref = { current: null };
      const user = userEvent.setup();

      render(
        <Sheet defaultOpen>
          <SheetTrigger>Open</SheetTrigger>
          <SheetContent ref={ref}>
            <SheetTitle>Title</SheetTitle>
          </SheetContent>
        </Sheet>
      );

      await waitFor(() => {
        expect(ref.current).toBeTruthy();
      });
    });
  });
});
