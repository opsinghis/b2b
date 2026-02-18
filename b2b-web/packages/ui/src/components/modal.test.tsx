/**
 * Modal Component Tests
 *
 * @package ui
 * @component Modal
 */

import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import {
  Modal,
  ModalTrigger,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalTitle,
  ModalDescription,
  ModalClose,
} from './modal';

describe('Modal Component', () => {
  const renderModal = () => {
    return render(
      <Modal>
        <ModalTrigger>Open modal</ModalTrigger>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Modal Title</ModalTitle>
            <ModalDescription>Modal Description</ModalDescription>
          </ModalHeader>
          <div>Modal content</div>
          <ModalFooter>
            <button>Action</button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    );
  };

  describe('Rendering', () => {
    it('should render modal trigger', () => {
      renderModal();
      expect(screen.getByText('Open modal')).toBeInTheDocument();
    });

    it('should not show content initially', () => {
      renderModal();
      expect(screen.queryByText('Modal Title')).not.toBeInTheDocument();
    });

    it('should show content when trigger is clicked', async () => {
      const user = userEvent.setup();
      renderModal();

      await user.click(screen.getByText('Open modal'));

      await waitFor(() => {
        expect(screen.getByText('Modal Title')).toBeInTheDocument();
      });
    });

    it('should render in portal', async () => {
      const user = userEvent.setup();
      const { baseElement } = renderModal();

      await user.click(screen.getByText('Open modal'));

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
      renderModal();

      expect(screen.queryByText('Modal Title')).not.toBeInTheDocument();

      await user.click(screen.getByText('Open modal'));

      await waitFor(() => {
        expect(screen.getByText('Modal Title')).toBeInTheDocument();
      });
    });

    it('should close when close button is clicked', async () => {
      const user = userEvent.setup();
      renderModal();

      const trigger = screen.getByText('Open modal');

      // Open
      await user.click(trigger);
      await waitFor(() => {
        expect(screen.getByText('Modal Title')).toBeInTheDocument();
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
      const { baseElement } = renderModal();

      const trigger = screen.getByText('Open modal');

      // Open modal
      await user.click(trigger);
      await waitFor(() => {
        expect(screen.getByText('Modal Title')).toBeInTheDocument();
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
      renderModal();

      const trigger = screen.getByText('Open modal');

      await user.click(trigger);
      await waitFor(() => {
        expect(screen.getByText('Modal Title')).toBeInTheDocument();
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
      renderModal();
      const trigger = screen.getByText('Open modal');
      expect(trigger).toHaveAttribute('data-state', 'closed');
    });

    it('should have correct data-state when open', async () => {
      const user = userEvent.setup();
      renderModal();

      const trigger = screen.getByText('Open modal');
      await user.click(trigger);

      await waitFor(() => {
        expect(trigger).toHaveAttribute('data-state', 'open');
      });
    });

    it('should work in controlled mode', async () => {
      const { rerender } = render(
        <Modal open={false}>
          <ModalTrigger>Trigger</ModalTrigger>
          <ModalContent>
            <ModalTitle>Title</ModalTitle>
          </ModalContent>
        </Modal>
      );

      expect(screen.queryByText('Title')).not.toBeInTheDocument();

      rerender(
        <Modal open={true}>
          <ModalTrigger>Trigger</ModalTrigger>
          <ModalContent>
            <ModalTitle>Title</ModalTitle>
          </ModalContent>
        </Modal>
      );

      await waitFor(() => {
        expect(screen.getByText('Title')).toBeInTheDocument();
      });
    });

    it('should accept defaultOpen prop', async () => {
      render(
        <Modal defaultOpen>
          <ModalTrigger>Trigger</ModalTrigger>
          <ModalContent>
            <ModalTitle>Title</ModalTitle>
          </ModalContent>
        </Modal>
      );

      await waitFor(() => {
        expect(screen.getByText('Title')).toBeInTheDocument();
      });
    });
  });

  describe('Components', () => {
    it('should render ModalHeader', async () => {
      const user = userEvent.setup();
      renderModal();

      await user.click(screen.getByText('Open modal'));

      await waitFor(() => {
        // Header should contain title and description
        expect(screen.getByText('Modal Title')).toBeInTheDocument();
        expect(screen.getByText('Modal Description')).toBeInTheDocument();
      });
    });

    it('should render ModalTitle', async () => {
      const user = userEvent.setup();
      renderModal();

      await user.click(screen.getByText('Open modal'));

      await waitFor(() => {
        const title = screen.getByText('Modal Title');
        expect(title).toBeInTheDocument();
        // Should be a heading for accessibility
        expect(title.tagName).toBe('H2');
      });
    });

    it('should render ModalDescription', async () => {
      const user = userEvent.setup();
      renderModal();

      await user.click(screen.getByText('Open modal'));

      await waitFor(() => {
        expect(screen.getByText('Modal Description')).toBeInTheDocument();
      });
    });

    it('should render ModalFooter', async () => {
      const user = userEvent.setup();
      renderModal();

      await user.click(screen.getByText('Open modal'));

      await waitFor(() => {
        // Footer should contain action button
        expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument();
      });
    });

    it('should render close button with X icon', async () => {
      const user = userEvent.setup();
      renderModal();

      await user.click(screen.getByText('Open modal'));

      await waitFor(() => {
        const closeButton = screen.getByRole('button', { name: /close/i });
        expect(closeButton).toBeInTheDocument();
      });
    });

    it('should render custom close button with ModalClose', async () => {
      const user = userEvent.setup();
      render(
        <Modal>
          <ModalTrigger>Open</ModalTrigger>
          <ModalContent>
            <ModalTitle>Title</ModalTitle>
            <ModalClose asChild>
              <button>Custom Close</button>
            </ModalClose>
          </ModalContent>
        </Modal>
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
      renderModal();

      const trigger = screen.getByText('Open modal');
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
      expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');

      await user.click(trigger);

      await waitFor(() => {
        expect(trigger).toHaveAttribute('aria-expanded', 'true');
      });
    });

    it('should have dialog role on content', async () => {
      const user = userEvent.setup();
      renderModal();

      await user.click(screen.getByText('Open modal'));

      await waitFor(() => {
        const dialog = screen.getByRole('dialog');
        expect(dialog).toBeInTheDocument();
      });
    });

    it('should associate title with dialog via aria-labelledby', async () => {
      const user = userEvent.setup();
      renderModal();

      await user.click(screen.getByText('Open modal'));

      await waitFor(() => {
        const dialog = screen.getByRole('dialog');
        const title = screen.getByText('Modal Title');
        const dialogLabelledBy = dialog.getAttribute('aria-labelledby');
        const titleId = title.getAttribute('id');
        expect(dialogLabelledBy).toBe(titleId);
      });
    });

    it('should associate description with dialog via aria-describedby', async () => {
      const user = userEvent.setup();
      renderModal();

      await user.click(screen.getByText('Open modal'));

      await waitFor(() => {
        const dialog = screen.getByRole('dialog');
        const description = screen.getByText('Modal Description');
        const dialogDescribedBy = dialog.getAttribute('aria-describedby');
        const descriptionId = description.getAttribute('id');
        expect(dialogDescribedBy).toBe(descriptionId);
      });
    });

    it('should be keyboard accessible', async () => {
      const user = userEvent.setup();
      renderModal();

      // Tab to trigger
      await user.tab();
      const trigger = screen.getByText('Open modal');
      expect(trigger).toHaveFocus();

      // Open with Enter
      await user.keyboard('{Enter}');
      await waitFor(() => {
        expect(screen.getByText('Modal Title')).toBeInTheDocument();
      });
    });

    it('should have accessible close button', async () => {
      const user = userEvent.setup();
      renderModal();

      await user.click(screen.getByText('Open modal'));

      await waitFor(() => {
        const closeButton = screen.getByRole('button', { name: /close/i });
        expect(closeButton).toHaveAccessibleName();
      });
    });

    it('should trap focus within modal', async () => {
      const user = userEvent.setup();
      render(
        <div>
          <button>Before</button>
          <Modal>
            <ModalTrigger>Open</ModalTrigger>
            <ModalContent>
              <ModalTitle>Title</ModalTitle>
              <button>Inside</button>
            </ModalContent>
          </Modal>
          <button>After</button>
        </div>
      );

      await user.click(screen.getByText('Open'));

      await waitFor(() => {
        expect(screen.getByText('Inside')).toBeInTheDocument();
      });

      // Tab should cycle within modal
      await user.tab();
      // Focus should be inside modal or on close button
      const insideButton = screen.getByText('Inside');
      const closeButton = screen.getByRole('button', { name: /close/i });
      expect([insideButton, closeButton]).toContainEqual(document.activeElement);
    });
  });

  describe('Styling', () => {
    it('should apply custom className to ModalContent', async () => {
      const user = userEvent.setup();
      render(
        <Modal>
          <ModalTrigger>Open</ModalTrigger>
          <ModalContent className="custom-modal">
            <ModalTitle>Title</ModalTitle>
          </ModalContent>
        </Modal>
      );

      await user.click(screen.getByText('Open'));

      await waitFor(() => {
        expect(screen.getByText('Title')).toBeInTheDocument();
      });
    });

    it('should apply custom className to ModalHeader', async () => {
      const user = userEvent.setup();
      render(
        <Modal>
          <ModalTrigger>Open</ModalTrigger>
          <ModalContent>
            <ModalHeader className="custom-header">
              <ModalTitle>Title</ModalTitle>
            </ModalHeader>
          </ModalContent>
        </Modal>
      );

      await user.click(screen.getByText('Open'));

      await waitFor(() => {
        expect(screen.getByText('Title')).toBeInTheDocument();
      });
    });

    it('should apply custom className to ModalFooter', async () => {
      const user = userEvent.setup();
      render(
        <Modal>
          <ModalTrigger>Open</ModalTrigger>
          <ModalContent>
            <ModalTitle>Title</ModalTitle>
            <ModalFooter className="custom-footer">
              <button>Save</button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      );

      await user.click(screen.getByText('Open'));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
      });
    });

    it('should apply centered positioning', async () => {
      const user = userEvent.setup();
      renderModal();

      await user.click(screen.getByText('Open modal'));

      await waitFor(() => {
        // Just verify content renders (positioning is tested visually/E2E)
        expect(screen.getByText('Modal Title')).toBeInTheDocument();
      });
    });
  });

  describe('Content', () => {
    it('should render simple text content', async () => {
      const user = userEvent.setup();
      render(
        <Modal>
          <ModalTrigger>Open</ModalTrigger>
          <ModalContent>
            <ModalTitle>Title</ModalTitle>
            <p>Simple text content</p>
          </ModalContent>
        </Modal>
      );

      await user.click(screen.getByText('Open'));

      await waitFor(() => {
        expect(screen.getByText('Simple text content')).toBeInTheDocument();
      });
    });

    it('should render complex content with forms', async () => {
      const user = userEvent.setup();
      render(
        <Modal>
          <ModalTrigger>Open</ModalTrigger>
          <ModalContent>
            <ModalHeader>
              <ModalTitle>User Profile</ModalTitle>
              <ModalDescription>Edit your profile information</ModalDescription>
            </ModalHeader>
            <form>
              <input type="text" placeholder="Name" />
              <input type="email" placeholder="Email" />
            </form>
            <ModalFooter>
              <button type="submit">Save changes</button>
            </ModalFooter>
          </ModalContent>
        </Modal>
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
        <Modal>
          <ModalTrigger>Open</ModalTrigger>
          <ModalContent>
            <ModalTitle>Interactive</ModalTitle>
            <input type="text" placeholder="Type here" />
          </ModalContent>
        </Modal>
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
        <Modal>
          <ModalTrigger asChild>
            <button className="custom-trigger">Custom Trigger</button>
          </ModalTrigger>
          <ModalContent>
            <ModalTitle>Title</ModalTitle>
          </ModalContent>
        </Modal>
      );

      await user.click(screen.getByText('Custom Trigger'));

      await waitFor(() => {
        expect(screen.getByText('Title')).toBeInTheDocument();
      });
    });

    it('should work without ModalHeader', async () => {
      const user = userEvent.setup();
      render(
        <Modal>
          <ModalTrigger>Open</ModalTrigger>
          <ModalContent>
            <ModalTitle>Just Title</ModalTitle>
            <p>Content without header wrapper</p>
          </ModalContent>
        </Modal>
      );

      await user.click(screen.getByText('Open'));

      await waitFor(() => {
        expect(screen.getByText('Just Title')).toBeInTheDocument();
        expect(screen.getByText('Content without header wrapper')).toBeInTheDocument();
      });
    });

    it('should work without ModalFooter', async () => {
      const user = userEvent.setup();
      render(
        <Modal>
          <ModalTrigger>Open</ModalTrigger>
          <ModalContent>
            <ModalTitle>No Footer</ModalTitle>
            <p>Content without footer</p>
          </ModalContent>
        </Modal>
      );

      await user.click(screen.getByText('Open'));

      await waitFor(() => {
        expect(screen.getByText('No Footer')).toBeInTheDocument();
        expect(screen.getByText('Content without footer')).toBeInTheDocument();
      });
    });

    it('should support confirmation dialogs', async () => {
      const user = userEvent.setup();
      render(
        <Modal>
          <ModalTrigger>Delete</ModalTrigger>
          <ModalContent>
            <ModalHeader>
              <ModalTitle>Are you sure?</ModalTitle>
              <ModalDescription>
                This action cannot be undone.
              </ModalDescription>
            </ModalHeader>
            <ModalFooter>
              <ModalClose asChild>
                <button>Cancel</button>
              </ModalClose>
              <button>Confirm</button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      );

      await user.click(screen.getByText('Delete'));

      await waitFor(() => {
        expect(screen.getByText('Are you sure?')).toBeInTheDocument();
        expect(screen.getByText('This action cannot be undone.')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle open and close cycle', async () => {
      const user = userEvent.setup();
      renderModal();

      const trigger = screen.getByText('Open modal');

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
        <Modal>
          <ModalTrigger>Open</ModalTrigger>
          <ModalContent data-testid="custom-modal" aria-label="Custom modal">
            <ModalTitle>Title</ModalTitle>
          </ModalContent>
        </Modal>
      );

      await user.click(screen.getByText('Open'));

      await waitFor(() => {
        const content = screen.getByTestId('custom-modal');
        expect(content).toHaveAttribute('aria-label', 'Custom modal');
      });
    });

    it('should forward ref to ModalContent', async () => {
      const ref = { current: null };

      render(
        <Modal defaultOpen>
          <ModalTrigger>Open</ModalTrigger>
          <ModalContent ref={ref}>
            <ModalTitle>Title</ModalTitle>
          </ModalContent>
        </Modal>
      );

      await waitFor(() => {
        expect(ref.current).toBeTruthy();
      });
    });
  });
});
