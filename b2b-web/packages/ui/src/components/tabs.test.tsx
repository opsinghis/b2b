/**
 * Tabs Component Tests
 *
 * @package ui
 * @component Tabs
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './tabs';

describe('Tabs Component', () => {
  const renderTabs = () => {
    return render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          <TabsTrigger value="tab3">Tab 3</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content 1</TabsContent>
        <TabsContent value="tab2">Content 2</TabsContent>
        <TabsContent value="tab3">Content 3</TabsContent>
      </Tabs>
    );
  };

  describe('Rendering', () => {
    it('should render tabs', () => {
      renderTabs();

      expect(screen.getByRole('tab', { name: 'Tab 1' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Tab 2' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Tab 3' })).toBeInTheDocument();
    });

    it('should render tabs list', () => {
      renderTabs();

      const tablist = screen.getByRole('tablist');
      expect(tablist).toBeInTheDocument();
    });

    it('should render tab panels', () => {
      renderTabs();

      // Only the active tab panel should be visible
      expect(screen.getByRole('tabpanel')).toHaveTextContent('Content 1');
    });

    it('should show default tab content', () => {
      renderTabs();

      expect(screen.getByText('Content 1')).toBeInTheDocument();
      expect(screen.queryByText('Content 2')).not.toBeInTheDocument();
      expect(screen.queryByText('Content 3')).not.toBeInTheDocument();
    });
  });

  describe('Tab Switching', () => {
    it('should switch tabs when clicked', async () => {
      const user = userEvent.setup();
      renderTabs();

      // Initially show content 1
      expect(screen.getByText('Content 1')).toBeInTheDocument();

      // Click tab 2
      await user.click(screen.getByRole('tab', { name: 'Tab 2' }));

      // Should show content 2
      expect(screen.getByText('Content 2')).toBeInTheDocument();
      expect(screen.queryByText('Content 1')).not.toBeInTheDocument();
    });

    it('should switch to third tab', async () => {
      const user = userEvent.setup();
      renderTabs();

      await user.click(screen.getByRole('tab', { name: 'Tab 3' }));

      expect(screen.getByText('Content 3')).toBeInTheDocument();
      expect(screen.queryByText('Content 1')).not.toBeInTheDocument();
      expect(screen.queryByText('Content 2')).not.toBeInTheDocument();
    });

    it('should switch back to first tab', async () => {
      const user = userEvent.setup();
      renderTabs();

      // Switch to tab 2
      await user.click(screen.getByRole('tab', { name: 'Tab 2' }));
      expect(screen.getByText('Content 2')).toBeInTheDocument();

      // Switch back to tab 1
      await user.click(screen.getByRole('tab', { name: 'Tab 1' }));
      expect(screen.getByText('Content 1')).toBeInTheDocument();
      expect(screen.queryByText('Content 2')).not.toBeInTheDocument();
    });
  });

  describe('Tab States', () => {
    it('should mark first tab as selected by default', () => {
      renderTabs();

      const tab1 = screen.getByRole('tab', { name: 'Tab 1' });
      expect(tab1).toHaveAttribute('data-state', 'active');
    });

    it('should mark clicked tab as active', async () => {
      const user = userEvent.setup();
      renderTabs();

      const tab2 = screen.getByRole('tab', { name: 'Tab 2' });
      await user.click(tab2);

      expect(tab2).toHaveAttribute('data-state', 'active');
    });

    it('should mark previous tab as inactive', async () => {
      const user = userEvent.setup();
      renderTabs();

      const tab1 = screen.getByRole('tab', { name: 'Tab 1' });
      const tab2 = screen.getByRole('tab', { name: 'Tab 2' });

      await user.click(tab2);

      expect(tab1).toHaveAttribute('data-state', 'inactive');
      expect(tab2).toHaveAttribute('data-state', 'active');
    });
  });

  describe('Keyboard Navigation', () => {
    it('should navigate to next tab with ArrowRight', async () => {
      const user = userEvent.setup();
      renderTabs();

      const tab1 = screen.getByRole('tab', { name: 'Tab 1' });
      tab1.focus();

      await user.keyboard('{ArrowRight}');

      const tab2 = screen.getByRole('tab', { name: 'Tab 2' });
      expect(tab2).toHaveFocus();
    });

    it('should navigate to previous tab with ArrowLeft', async () => {
      const user = userEvent.setup();
      renderTabs();

      const tab2 = screen.getByRole('tab', { name: 'Tab 2' });
      tab2.focus();

      await user.keyboard('{ArrowLeft}');

      const tab1 = screen.getByRole('tab', { name: 'Tab 1' });
      expect(tab1).toHaveFocus();
    });

    it('should activate tab with Space key', async () => {
      const user = userEvent.setup();
      renderTabs();

      const tab2 = screen.getByRole('tab', { name: 'Tab 2' });
      tab2.focus();

      await user.keyboard(' ');

      expect(screen.getByText('Content 2')).toBeInTheDocument();
    });

    it('should activate tab with Enter key', async () => {
      const user = userEvent.setup();
      renderTabs();

      const tab3 = screen.getByRole('tab', { name: 'Tab 3' });
      tab3.focus();

      await user.keyboard('{Enter}');

      expect(screen.getByText('Content 3')).toBeInTheDocument();
    });
  });

  describe('Disabled Tabs', () => {
    it('should render disabled tab', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2" disabled>Tab 2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2">Content 2</TabsContent>
        </Tabs>
      );

      const tab2 = screen.getByRole('tab', { name: 'Tab 2' });
      expect(tab2).toBeDisabled();
    });

    it('should not switch to disabled tab when clicked', async () => {
      const user = userEvent.setup();

      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2" disabled>Tab 2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2">Content 2</TabsContent>
        </Tabs>
      );

      await user.click(screen.getByRole('tab', { name: 'Tab 2' }));

      // Should still show content 1
      expect(screen.getByText('Content 1')).toBeInTheDocument();
      expect(screen.queryByText('Content 2')).not.toBeInTheDocument();
    });

    it('should have reduced opacity when disabled', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2" disabled>Disabled</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
        </Tabs>
      );

      const disabledTab = screen.getByRole('tab', { name: 'Disabled' });
      expect(disabledTab).toHaveClass('disabled:opacity-50');
    });
  });

  describe('Styling', () => {
    it('should apply custom className to TabsList', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList className="custom-list">
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
        </Tabs>
      );

      const tablist = screen.getByRole('tablist');
      expect(tablist).toHaveClass('custom-list');
    });

    it('should apply custom className to TabsTrigger', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1" className="custom-trigger">
              Tab 1
            </TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
        </Tabs>
      );

      const tab = screen.getByRole('tab');
      expect(tab).toHaveClass('custom-trigger');
    });

    it('should apply custom className to TabsContent', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1" className="custom-content">
            Content 1
          </TabsContent>
        </Tabs>
      );

      const panel = screen.getByRole('tabpanel');
      expect(panel).toHaveClass('custom-content');
    });

    it('should have active tab styling', () => {
      renderTabs();

      const activeTab = screen.getByRole('tab', { name: 'Tab 1' });
      expect(activeTab).toHaveClass('data-[state=active]:bg-background');
      expect(activeTab).toHaveClass('data-[state=active]:text-foreground');
    });

    it('should have focus ring styles', () => {
      renderTabs();

      const tab = screen.getByRole('tab', { name: 'Tab 1' });
      expect(tab).toHaveClass('focus-visible:ring-2');
      expect(tab).toHaveClass('focus-visible:ring-ring');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA roles', () => {
      renderTabs();

      expect(screen.getByRole('tablist')).toBeInTheDocument();
      expect(screen.getAllByRole('tab')).toHaveLength(3);
      expect(screen.getByRole('tabpanel')).toBeInTheDocument();
    });

    it('should associate tab with tabpanel', () => {
      renderTabs();

      const tab1 = screen.getByRole('tab', { name: 'Tab 1' });
      const panel = screen.getByRole('tabpanel');

      const tabControls = tab1.getAttribute('aria-controls');
      const panelId = panel.getAttribute('id');

      expect(tabControls).toBe(panelId);
    });

    it('should set aria-selected on active tab', () => {
      renderTabs();

      const tab1 = screen.getByRole('tab', { name: 'Tab 1' });
      expect(tab1).toHaveAttribute('aria-selected', 'true');

      const tab2 = screen.getByRole('tab', { name: 'Tab 2' });
      expect(tab2).toHaveAttribute('aria-selected', 'false');
    });

    it('should update aria-selected when switching tabs', async () => {
      const user = userEvent.setup();
      renderTabs();

      const tab1 = screen.getByRole('tab', { name: 'Tab 1' });
      const tab2 = screen.getByRole('tab', { name: 'Tab 2' });

      await user.click(tab2);

      expect(tab1).toHaveAttribute('aria-selected', 'false');
      expect(tab2).toHaveAttribute('aria-selected', 'true');
    });

    it('should be keyboard focusable', async () => {
      const user = userEvent.setup();
      renderTabs();

      await user.tab();

      const tab1 = screen.getByRole('tab', { name: 'Tab 1' });
      expect(tab1).toHaveFocus();
    });
  });

  describe('Controlled Mode', () => {
    it('should work in controlled mode', async () => {
      const user = userEvent.setup();
      let currentValue = 'tab1';

      const { rerender } = render(
        <Tabs value={currentValue}>
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2">Content 2</TabsContent>
        </Tabs>
      );

      expect(screen.getByText('Content 1')).toBeInTheDocument();

      // Update controlled value
      currentValue = 'tab2';
      rerender(
        <Tabs value={currentValue}>
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2">Content 2</TabsContent>
        </Tabs>
      );

      expect(screen.getByText('Content 2')).toBeInTheDocument();
      expect(screen.queryByText('Content 1')).not.toBeInTheDocument();
    });
  });

  describe('Integration', () => {
    it('should render complex tab content', () => {
      render(
        <Tabs defaultValue="profile">
          <TabsList>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
          <TabsContent value="profile">
            <div>
              <h2>Profile</h2>
              <p>User profile information</p>
            </div>
          </TabsContent>
          <TabsContent value="settings">
            <div>
              <h2>Settings</h2>
              <button>Save</button>
            </div>
          </TabsContent>
        </Tabs>
      );

      expect(screen.getByRole('heading', { name: 'Profile' })).toBeInTheDocument();
      expect(screen.getByText('User profile information')).toBeInTheDocument();
    });

    it('should work with many tabs', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            {[1, 2, 3, 4, 5].map((i) => (
              <TabsTrigger key={i} value={`tab${i}`}>
                Tab {i}
              </TabsTrigger>
            ))}
          </TabsList>
          {[1, 2, 3, 4, 5].map((i) => (
            <TabsContent key={i} value={`tab${i}`}>
              Content {i}
            </TabsContent>
          ))}
        </Tabs>
      );

      expect(screen.getAllByRole('tab')).toHaveLength(5);
    });
  });
});
