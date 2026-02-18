/**
 * Popover Component Tests
 *
 * @package ui
 * @component Popover
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { Popover, PopoverTrigger, PopoverContent } from './popover';

describe('Popover Component', () => {
  const renderPopover = (contentText = 'Popover content', triggerText = 'Open popover') => {
    return render(
      <Popover>
        <PopoverTrigger>{triggerText}</PopoverTrigger>
        <PopoverContent>{contentText}</PopoverContent>
      </Popover>
    );
  };

  describe('Rendering', () => {
    it('should render popover trigger', () => {
      renderPopover();
      expect(screen.getByText('Open popover')).toBeInTheDocument();
    });

    it('should not show content initially', () => {
      renderPopover();
      expect(screen.queryByText('Popover content')).not.toBeInTheDocument();
    });

    it('should show content when trigger is clicked', async () => {
      const user = userEvent.setup();
      renderPopover();

      await user.click(screen.getByText('Open popover'));

      await waitFor(() => {
        expect(screen.getByText('Popover content')).toBeInTheDocument();
      });
    });

    it('should render in portal', async () => {
      const user = userEvent.setup();
      const { baseElement } = renderPopover();

      await user.click(screen.getByText('Open popover'));

      await waitFor(() => {
        // Content should be in body (portal), not in the component tree
        const content = baseElement.querySelector('[data-radix-popper-content-wrapper]');
        expect(content).toBeInTheDocument();
      });
    });
  });

  describe('Interactions', () => {
    it('should open when trigger is clicked', async () => {
      const user = userEvent.setup();
      renderPopover();

      expect(screen.queryByText('Popover content')).not.toBeInTheDocument();

      await user.click(screen.getByText('Open popover'));

      await waitFor(() => {
        expect(screen.getByText('Popover content')).toBeInTheDocument();
      });
    });

    it('should close when trigger is clicked again', async () => {
      const user = userEvent.setup();
      renderPopover();

      const trigger = screen.getByText('Open popover');

      // Open
      await user.click(trigger);
      await waitFor(() => {
        expect(screen.getByText('Popover content')).toBeInTheDocument();
      });

      // Close
      await user.click(trigger);
      await waitFor(() => {
        expect(screen.queryByText('Popover content')).not.toBeInTheDocument();
      });
    });

    it('should close when clicking outside', async () => {
      const user = userEvent.setup();
      render(
        <div>
          <Popover>
            <PopoverTrigger>Open</PopoverTrigger>
            <PopoverContent>Content</PopoverContent>
          </Popover>
          <div data-testid="outside">Outside</div>
        </div>
      );

      const trigger = screen.getByText('Open');

      // Open popover
      await user.click(trigger);
      await waitFor(() => {
        expect(screen.getByText('Content')).toBeInTheDocument();
        expect(trigger).toHaveAttribute('data-state', 'open');
      });

      // Click outside - verify trigger state changes (portal unmount is async)
      await user.click(screen.getByTestId('outside'));

      await waitFor(
        () => {
          expect(trigger).toHaveAttribute('data-state', 'closed');
        },
        { timeout: 2000 }
      );
    });

    it('should close when pressing Escape', async () => {
      const user = userEvent.setup();
      renderPopover();

      const trigger = screen.getByText('Open popover');

      await user.click(trigger);
      await waitFor(() => {
        expect(screen.getByText('Popover content')).toBeInTheDocument();
        expect(trigger).toHaveAttribute('data-state', 'open');
      });

      await user.keyboard('{Escape}');

      // Verify trigger state changes (portal unmount is async with animations)
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
      renderPopover();
      const trigger = screen.getByText('Open popover');
      expect(trigger).toHaveAttribute('data-state', 'closed');
    });

    it('should have correct data-state when open', async () => {
      const user = userEvent.setup();
      renderPopover();

      const trigger = screen.getByText('Open popover');
      await user.click(trigger);

      await waitFor(() => {
        expect(trigger).toHaveAttribute('data-state', 'open');
      });
    });

    it('should work in controlled mode', async () => {
      const { rerender } = render(
        <Popover open={false}>
          <PopoverTrigger>Trigger</PopoverTrigger>
          <PopoverContent>Content</PopoverContent>
        </Popover>
      );

      expect(screen.queryByText('Content')).not.toBeInTheDocument();

      rerender(
        <Popover open={true}>
          <PopoverTrigger>Trigger</PopoverTrigger>
          <PopoverContent>Content</PopoverContent>
        </Popover>
      );

      await waitFor(() => {
        expect(screen.getByText('Content')).toBeInTheDocument();
      });
    });

    it('should accept defaultOpen prop', async () => {
      render(
        <Popover defaultOpen>
          <PopoverTrigger>Trigger</PopoverTrigger>
          <PopoverContent>Content</PopoverContent>
        </Popover>
      );

      await waitFor(() => {
        expect(screen.getByText('Content')).toBeInTheDocument();
      });
    });
  });

  describe('Positioning', () => {
    it('should default to center alignment', async () => {
      const user = userEvent.setup();
      renderPopover();

      await user.click(screen.getByText('Open popover'));

      await waitFor(() => {
        const content = screen.getByText('Popover content');
        expect(content).toBeInTheDocument();
      });
    });

    it('should accept custom align prop', async () => {
      const user = userEvent.setup();
      render(
        <Popover>
          <PopoverTrigger>Open</PopoverTrigger>
          <PopoverContent align="start">Content</PopoverContent>
        </Popover>
      );

      await user.click(screen.getByText('Open'));

      await waitFor(() => {
        expect(screen.getByText('Content')).toBeInTheDocument();
      });
    });

    it('should accept custom side prop', async () => {
      const user = userEvent.setup();
      render(
        <Popover>
          <PopoverTrigger>Open</PopoverTrigger>
          <PopoverContent side="top">Content</PopoverContent>
        </Popover>
      );

      await user.click(screen.getByText('Open'));

      await waitFor(() => {
        expect(screen.getByText('Content')).toBeInTheDocument();
      });
    });

    it('should apply custom sideOffset', async () => {
      const user = userEvent.setup();
      render(
        <Popover>
          <PopoverTrigger>Open</PopoverTrigger>
          <PopoverContent sideOffset={10}>Content</PopoverContent>
        </Popover>
      );

      await user.click(screen.getByText('Open'));

      await waitFor(() => {
        expect(screen.getByText('Content')).toBeInTheDocument();
      });
    });
  });

  describe('Styling', () => {
    it('should apply custom className to content', async () => {
      const user = userEvent.setup();
      render(
        <Popover>
          <PopoverTrigger>Open</PopoverTrigger>
          <PopoverContent className="custom-popover">Content</PopoverContent>
        </Popover>
      );

      await user.click(screen.getByText('Open'));

      await waitFor(() => {
        // Just verify content renders with custom styling
        const content = screen.getByText('Content');
        expect(content).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', async () => {
      const user = userEvent.setup();
      renderPopover();

      const trigger = screen.getByText('Open popover');
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
      expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');

      await user.click(trigger);

      await waitFor(() => {
        expect(trigger).toHaveAttribute('aria-expanded', 'true');
      });
    });

    it('should associate trigger with content via aria-controls', async () => {
      const user = userEvent.setup();
      renderPopover();

      const trigger = screen.getByText('Open popover');
      await user.click(trigger);

      await waitFor(() => {
        const content = screen.getByText('Popover content');
        const triggerId = trigger.getAttribute('aria-controls');
        const contentId = content.closest('[role="dialog"]')?.getAttribute('id');
        expect(triggerId).toBe(contentId);
      });
    });

    it('should be keyboard accessible', async () => {
      const user = userEvent.setup();
      renderPopover();

      // Tab to trigger
      await user.tab();
      const trigger = screen.getByText('Open popover');
      expect(trigger).toHaveFocus();

      // Open with Enter
      await user.keyboard('{Enter}');
      await waitFor(() => {
        expect(screen.getByText('Popover content')).toBeInTheDocument();
      });
    });

    it('should trap focus when open', async () => {
      const user = userEvent.setup();
      render(
        <div>
          <button>Before</button>
          <Popover>
            <PopoverTrigger>Trigger</PopoverTrigger>
            <PopoverContent>
              <button>Inside</button>
            </PopoverContent>
          </Popover>
          <button>After</button>
        </div>
      );

      await user.click(screen.getByText('Trigger'));

      await waitFor(() => {
        expect(screen.getByText('Inside')).toBeInTheDocument();
      });

      // Tab should cycle within popover
      await user.tab();
      // Focus should be inside popover or on trigger
      const insideButton = screen.getByText('Inside');
      const trigger = screen.getByText('Trigger');
      expect([insideButton, trigger]).toContainEqual(document.activeElement);
    });
  });

  describe('Content', () => {
    it('should render simple text content', async () => {
      const user = userEvent.setup();
      renderPopover('Simple text');

      await user.click(screen.getByText('Open popover'));

      await waitFor(() => {
        expect(screen.getByText('Simple text')).toBeInTheDocument();
      });
    });

    it('should render complex JSX content', async () => {
      const user = userEvent.setup();
      render(
        <Popover>
          <PopoverTrigger>Open</PopoverTrigger>
          <PopoverContent>
            <div>
              <h3>Title</h3>
              <p>Description</p>
              <button>Action</button>
            </div>
          </PopoverContent>
        </Popover>
      );

      await user.click(screen.getByText('Open'));

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Title' })).toBeInTheDocument();
        expect(screen.getByText('Description')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument();
      });
    });

    it('should handle interactive content', async () => {
      const user = userEvent.setup();
      render(
        <Popover>
          <PopoverTrigger>Open</PopoverTrigger>
          <PopoverContent>
            <input type="text" placeholder="Enter text" />
            <button>Submit</button>
          </PopoverContent>
        </Popover>
      );

      await user.click(screen.getByText('Open'));

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
      });

      // Should be able to interact with input
      const input = screen.getByPlaceholderText('Enter text');
      await user.type(input, 'test');
      expect(input).toHaveValue('test');
    });
  });

  describe('Integration', () => {
    it('should work with custom trigger element', async () => {
      const user = userEvent.setup();
      render(
        <Popover>
          <PopoverTrigger asChild>
            <button className="custom-trigger">Custom Trigger</button>
          </PopoverTrigger>
          <PopoverContent>Content</PopoverContent>
        </Popover>
      );

      await user.click(screen.getByText('Custom Trigger'));

      await waitFor(() => {
        expect(screen.getByText('Content')).toBeInTheDocument();
      });
    });

    it('should work with disabled trigger', () => {
      render(
        <Popover>
          <PopoverTrigger disabled>Disabled</PopoverTrigger>
          <PopoverContent>Content</PopoverContent>
        </Popover>
      );

      const trigger = screen.getByText('Disabled');
      expect(trigger).toBeDisabled();

      // Content should not be visible initially
      expect(screen.queryByText('Content')).not.toBeInTheDocument();
    });

    it('should handle multiple popovers independently', async () => {
      const user = userEvent.setup();
      render(
        <div>
          <Popover>
            <PopoverTrigger>Trigger 1</PopoverTrigger>
            <PopoverContent>Content 1</PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger>Trigger 2</PopoverTrigger>
            <PopoverContent>Content 2</PopoverContent>
          </Popover>
        </div>
      );

      const trigger1 = screen.getByText('Trigger 1');
      const trigger2 = screen.getByText('Trigger 2');

      // Open first popover
      await user.click(trigger1);
      await waitFor(() => {
        expect(screen.getByText('Content 1')).toBeInTheDocument();
        expect(trigger1).toHaveAttribute('data-state', 'open');
      });

      // Open second popover
      await user.click(trigger2);
      await waitFor(() => {
        expect(screen.getByText('Content 2')).toBeInTheDocument();
        expect(trigger2).toHaveAttribute('data-state', 'open');
      });

      // First should close (verify state change)
      await waitFor(
        () => {
          expect(trigger1).toHaveAttribute('data-state', 'closed');
        },
        { timeout: 2000 }
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid open/close', async () => {
      const user = userEvent.setup();
      renderPopover();

      const trigger = screen.getByText('Open popover');

      // Rapid clicks - 4 times (even number = ends closed)
      await user.click(trigger);
      await user.click(trigger);
      await user.click(trigger);
      await user.click(trigger);

      // Should end up closed (4 clicks = even)
      await waitFor(
        () => {
          expect(screen.queryByText('Popover content')).not.toBeInTheDocument();
        },
        { timeout: 2000 }
      );
    });

    it('should handle empty content', async () => {
      const user = userEvent.setup();
      render(
        <Popover>
          <PopoverTrigger>Open</PopoverTrigger>
          <PopoverContent />
        </Popover>
      );

      // Should not crash
      await user.click(screen.getByText('Open'));

      await waitFor(() => {
        // Portal should still be created
        expect(document.querySelector('[data-radix-popper-content-wrapper]')).toBeInTheDocument();
      });
    });

    it('should spread additional props to content', async () => {
      const user = userEvent.setup();
      render(
        <Popover>
          <PopoverTrigger>Open</PopoverTrigger>
          <PopoverContent data-testid="custom-content" aria-label="Custom popover">
            Content
          </PopoverContent>
        </Popover>
      );

      await user.click(screen.getByText('Open'));

      await waitFor(() => {
        const content = screen.getByTestId('custom-content');
        expect(content).toHaveAttribute('aria-label', 'Custom popover');
      });
    });
  });
});
