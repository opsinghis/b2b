/**
 * Approvals Inbox List Page Tests
 *
 * @feature approvals-inbox (FE-018)
 * @module approvals
 * @priority P0
 * @dependencies auth, api-client
 */

import * as React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import userEvent from '@testing-library/user-event';

// Mock data for pending approvals
export const TEST_PENDING_APPROVALS = [
  {
    id: 'approval-1',
    stepId: 'step-1',
    entityType: 'QUOTE' as const,
    entityId: 'quote-123',
    level: 1,
    levelName: 'Manager Approval',
    allowDelegation: true,
    delegatedFrom: null,
    requestedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    expiresAt: null,
  },
  {
    id: 'approval-2',
    stepId: 'step-2',
    entityType: 'CONTRACT' as const,
    entityId: 'contract-456',
    level: 2,
    levelName: 'Director Approval',
    allowDelegation: false,
    delegatedFrom: 'user-original',
    requestedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // expires in 7 days
  },
  {
    id: 'approval-3',
    stepId: 'step-3',
    entityType: 'QUOTE' as const,
    entityId: 'quote-789',
    level: 1,
    levelName: 'Manager Approval',
    allowDelegation: true,
    delegatedFrom: null,
    requestedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 minutes ago
    expiresAt: null,
  },
];

export const TEST_USERS_FOR_DELEGATION = [
  {
    id: 'user-1',
    email: 'john.doe@example.com',
    firstName: 'John',
    lastName: 'Doe',
    displayName: 'John Doe',
    isActive: true,
  },
  {
    id: 'user-2',
    email: 'jane.smith@example.com',
    firstName: 'Jane',
    lastName: 'Smith',
    displayName: 'Jane Smith',
    isActive: true,
  },
];

// Mock the approvals hooks
const mockUsePendingApprovals = vi.fn();
const mockUseApproveStep = vi.fn();
const mockUseRejectStep = vi.fn();
const mockUseDelegateStep = vi.fn();
const mockUseUsers = vi.fn();
const mockRefetch = vi.fn();
const mockAddToast = vi.fn();

// Mock modules
vi.mock('@b2b/auth/react', () => ({
  useAuth: () => ({
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      displayName: 'Test User',
      role: 'USER',
      tenantId: 'test-tenant-id',
      accessToken: 'mock-access-token',
    },
    isAuthenticated: true,
    isLoading: false,
    error: null,
    login: vi.fn(),
    logout: vi.fn(),
    hasRole: vi.fn(() => true),
  }),
  RequireAuth: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../../app/approvals/hooks/use-approvals', () => ({
  usePendingApprovals: () => mockUsePendingApprovals(),
  useApproveStep: () => mockUseApproveStep(),
  useRejectStep: () => mockUseRejectStep(),
  useDelegateStep: () => mockUseDelegateStep(),
  useUsers: (search?: string) => mockUseUsers(search),
  formatRelativeTime: (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return 'just now';
    if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  },
  getEntityTypeLabel: (type: string) => {
    switch (type) {
      case 'CONTRACT': return 'Contract';
      case 'QUOTE': return 'Quote';
      default: return type;
    }
  },
  getEntityTypeBadgeColor: (type: string) => {
    switch (type) {
      case 'CONTRACT': return 'bg-purple-100 text-purple-800';
      case 'QUOTE': return 'bg-indigo-100 text-indigo-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  },
  getEntityPath: (type: string, id: string) => {
    switch (type) {
      case 'CONTRACT': return `/contracts/${id}`;
      case 'QUOTE': return `/quotes/${id}`;
      default: return '#';
    }
  },
  ENTITY_TYPES: [
    { value: 'CONTRACT', label: 'Contract' },
    { value: 'QUOTE', label: 'Quote' },
  ],
}));

vi.mock('@b2b/ui', async () => {
  const actual = await vi.importActual('@b2b/ui');
  return {
    ...actual,
    useToast: () => ({ addToast: mockAddToast }),
  };
});

// Import the component after mocks are set up
const ApprovalsPage = (await import('../../app/approvals/page')).default;

describe('Approvals Inbox List Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    mockUsePendingApprovals.mockReturnValue({
      data: TEST_PENDING_APPROVALS,
      isLoading: false,
      isError: false,
      refetch: mockRefetch,
    });

    mockUseApproveStep.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({}),
      isPending: false,
    });

    mockUseRejectStep.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({}),
      isPending: false,
    });

    mockUseDelegateStep.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({}),
      isPending: false,
    });

    mockUseUsers.mockReturnValue({
      data: {
        data: TEST_USERS_FOR_DELEGATION,
        meta: {
          total: TEST_USERS_FOR_DELEGATION.length,
          page: 1,
          limit: 20,
          totalPages: 1,
        },
      },
      isLoading: false,
    });
  });

  describe('Page Rendering', () => {
    it('should render page header with title and description', () => {
      render(<ApprovalsPage />);

      expect(screen.getByText('Approvals Inbox')).toBeInTheDocument();
      expect(screen.getByText('Review and manage pending approval requests')).toBeInTheDocument();
    });

    it('should render refresh button', () => {
      render(<ApprovalsPage />);

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      expect(refreshButton).toBeInTheDocument();
    });

    it('should render pending count badge', () => {
      render(<ApprovalsPage />);

      expect(screen.getByText(/3 pending approvals/i)).toBeInTheDocument();
    });

    it('should render filter controls', () => {
      render(<ApprovalsPage />);

      expect(screen.getByText('Type')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should display loading state while fetching approvals', () => {
      mockUsePendingApprovals.mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        refetch: mockRefetch,
      });

      render(<ApprovalsPage />);

      expect(screen.getByText('Loading approvals...')).toBeInTheDocument();
    });

    it('should disable refresh button during loading', () => {
      mockUsePendingApprovals.mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        refetch: mockRefetch,
      });

      render(<ApprovalsPage />);

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      expect(refreshButton).toBeDisabled();
    });
  });

  describe('Error State', () => {
    it('should display error message when fetch fails', () => {
      mockUsePendingApprovals.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        refetch: mockRefetch,
      });

      render(<ApprovalsPage />);

      expect(screen.getByText('Failed to load approvals')).toBeInTheDocument();
    });

    it('should render try again button on error', () => {
      mockUsePendingApprovals.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        refetch: mockRefetch,
      });

      render(<ApprovalsPage />);

      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should display empty state when no approvals exist', () => {
      mockUsePendingApprovals.mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
        refetch: mockRefetch,
      });

      render(<ApprovalsPage />);

      expect(screen.getByText('All caught up!')).toBeInTheDocument();
      expect(screen.getByText('You have no pending approvals at this time')).toBeInTheDocument();
    });

    it('should display filtered empty state message', async () => {
      render(<ApprovalsPage />);

      const user = userEvent.setup();

      // Open filter dropdown and select CONTRACT
      const filterSelect = screen.getByRole('combobox');
      await user.click(filterSelect);

      const contractOption = screen.getByRole('option', { name: /contract/i });
      await user.click(contractOption);

      // Should show filtered message (only 1 contract approval exists)
      expect(screen.getByText(/1 pending approval/i)).toBeInTheDocument();
    });
  });

  describe('Approvals List Display', () => {
    it('should render all pending approvals', () => {
      render(<ApprovalsPage />);

      TEST_PENDING_APPROVALS.forEach((approval) => {
        const approvalCard = screen.getByText(`${approval.levelName}`).closest('[class*="Card"]');
        expect(approvalCard).toBeInTheDocument();
      });
    });

    it('should display entity type badges', () => {
      render(<ApprovalsPage />);

      const quoteBadges = screen.getAllByText('Quote');
      const contractBadges = screen.getAllByText('Contract');

      expect(quoteBadges.length).toBeGreaterThan(0);
      expect(contractBadges.length).toBeGreaterThan(0);
    });

    it('should display level and level name badges', () => {
      render(<ApprovalsPage />);

      expect(screen.getByText(/Level 1: Manager Approval/)).toBeInTheDocument();
      expect(screen.getByText(/Level 2: Director Approval/)).toBeInTheDocument();
    });

    it('should display relative time for requests', () => {
      render(<ApprovalsPage />);

      expect(screen.getByText(/2 hours ago/i)).toBeInTheDocument();
      expect(screen.getByText(/1 day ago/i)).toBeInTheDocument();
      expect(screen.getByText(/5 minutes ago/i)).toBeInTheDocument();
    });

    it('should indicate delegated approvals', () => {
      render(<ApprovalsPage />);

      expect(screen.getByText(/Delegated to you/i)).toBeInTheDocument();
    });

    it('should display expiration warning when present', () => {
      render(<ApprovalsPage />);

      const expirationText = screen.getByText(/Expires:/);
      expect(expirationText).toBeInTheDocument();
    });

    it('should render entity links', () => {
      render(<ApprovalsPage />);

      const quoteLinks = screen.getAllByRole('link', { name: /View Quote/i });
      const contractLinks = screen.getAllByRole('link', { name: /View Contract/i });

      expect(quoteLinks.length).toBeGreaterThan(0);
      expect(contractLinks.length).toBeGreaterThan(0);
    });

    it('should render detail view links', () => {
      render(<ApprovalsPage />);

      const detailLinks = screen.getAllByRole('link', { name: /View Details/i });
      expect(detailLinks).toHaveLength(TEST_PENDING_APPROVALS.length);
    });
  });

  describe('Filtering', () => {
    it('should filter by entity type - Contract', async () => {
      render(<ApprovalsPage />);

      const user = userEvent.setup();

      // Initially shows all 3 approvals
      expect(screen.getByText(/3 pending approvals/i)).toBeInTheDocument();

      // Open filter and select Contract
      const filterSelect = screen.getByRole('combobox');
      await user.click(filterSelect);

      const contractOption = screen.getByRole('option', { name: /contract/i });
      await user.click(contractOption);

      // Should now show only 1 approval
      await waitFor(() => {
        expect(screen.getByText(/1 pending approval[^s]/i)).toBeInTheDocument();
      });
    });

    it('should filter by entity type - Quote', async () => {
      render(<ApprovalsPage />);

      const user = userEvent.setup();

      const filterSelect = screen.getByRole('combobox');
      await user.click(filterSelect);

      const quoteOption = screen.getByRole('option', { name: /quote/i });
      await user.click(quoteOption);

      await waitFor(() => {
        expect(screen.getByText(/2 pending approvals/i)).toBeInTheDocument();
      });
    });

    it('should show clear filters button when filter is active', async () => {
      render(<ApprovalsPage />);

      const user = userEvent.setup();

      // Initially no clear button
      expect(screen.queryByRole('button', { name: /clear/i })).not.toBeInTheDocument();

      // Apply filter
      const filterSelect = screen.getByRole('combobox');
      await user.click(filterSelect);
      const contractOption = screen.getByRole('option', { name: /contract/i });
      await user.click(contractOption);

      // Clear button should appear
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument();
      });
    });

    it('should clear filters when clear button clicked', async () => {
      render(<ApprovalsPage />);

      const user = userEvent.setup();

      // Apply filter
      const filterSelect = screen.getByRole('combobox');
      await user.click(filterSelect);
      const contractOption = screen.getByRole('option', { name: /contract/i });
      await user.click(contractOption);

      await waitFor(() => {
        expect(screen.getByText(/1 pending approval/i)).toBeInTheDocument();
      });

      // Clear filter
      const clearButton = screen.getByRole('button', { name: /clear/i });
      await user.click(clearButton);

      await waitFor(() => {
        expect(screen.getByText(/3 pending approvals/i)).toBeInTheDocument();
      });
    });
  });

  describe('Action Buttons', () => {
    it('should display approve, reject, and delegate buttons for each approval', () => {
      render(<ApprovalsPage />);

      const approveButtons = screen.getAllByRole('button', { name: /approve/i });
      const rejectButtons = screen.getAllByRole('button', { name: /reject/i });

      expect(approveButtons.length).toBe(TEST_PENDING_APPROVALS.length);
      expect(rejectButtons.length).toBe(TEST_PENDING_APPROVALS.length);
    });

    it('should show delegate button only when delegation is allowed', () => {
      render(<ApprovalsPage />);

      const delegateButtons = screen.getAllByRole('button', { name: /delegate/i });

      // Only 2 out of 3 approvals allow delegation
      const allowDelegationCount = TEST_PENDING_APPROVALS.filter(a => a.allowDelegation).length;
      expect(delegateButtons).toHaveLength(allowDelegationCount);
    });

    it('should disable action buttons during processing', () => {
      mockUseApproveStep.mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: true, // Processing state
      });

      render(<ApprovalsPage />);

      const approveButtons = screen.getAllByRole('button', { name: /approve/i });
      approveButtons.forEach(button => {
        expect(button).toBeDisabled();
      });
    });
  });

  describe('Approve Action', () => {
    it('should open approve modal when approve button clicked', async () => {
      render(<ApprovalsPage />);

      const user = userEvent.setup();
      const approveButtons = screen.getAllByRole('button', { name: /approve/i });

      await user.click(approveButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/Approve Request/i)).toBeInTheDocument();
      });
    });

    it('should call approve mutation with correct parameters', async () => {
      const mockMutateAsync = vi.fn().mockResolvedValue({});
      mockUseApproveStep.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      });

      render(<ApprovalsPage />);

      const user = userEvent.setup();
      const approveButtons = screen.getAllByRole('button', { name: /approve/i });

      await user.click(approveButtons[0]);

      // Find and click confirm in modal
      const confirmButton = await screen.findByRole('button', { name: /^Approve$/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith({
          requestId: TEST_PENDING_APPROVALS[0].id,
          stepId: TEST_PENDING_APPROVALS[0].stepId,
          comments: undefined,
        });
      });
    });

    it('should show success toast after successful approval', async () => {
      const mockMutateAsync = vi.fn().mockResolvedValue({});
      mockUseApproveStep.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      });

      render(<ApprovalsPage />);

      const user = userEvent.setup();
      const approveButtons = screen.getAllByRole('button', { name: /approve/i });

      await user.click(approveButtons[0]);

      const confirmButton = await screen.findByRole('button', { name: /^Approve$/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockAddToast).toHaveBeenCalledWith({
          title: 'Approved',
          description: 'The request has been approved successfully',
          variant: 'success',
        });
      });
    });

    it('should include comments when provided', async () => {
      const mockMutateAsync = vi.fn().mockResolvedValue({});
      mockUseApproveStep.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      });

      render(<ApprovalsPage />);

      const user = userEvent.setup();
      const approveButtons = screen.getAllByRole('button', { name: /approve/i });

      await user.click(approveButtons[0]);

      // Add comments
      const commentsInput = await screen.findByPlaceholderText(/Add optional comments/i);
      await user.type(commentsInput, 'Looks good to me');

      const confirmButton = screen.getByRole('button', { name: /^Approve$/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith({
          requestId: TEST_PENDING_APPROVALS[0].id,
          stepId: TEST_PENDING_APPROVALS[0].stepId,
          comments: 'Looks good to me',
        });
      });
    });
  });

  describe('Reject Action', () => {
    it('should open reject modal when reject button clicked', async () => {
      render(<ApprovalsPage />);

      const user = userEvent.setup();
      const rejectButtons = screen.getAllByRole('button', { name: /reject/i });

      await user.click(rejectButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/Reject Request/i)).toBeInTheDocument();
      });
    });

    it('should call reject mutation with correct parameters', async () => {
      const mockMutateAsync = vi.fn().mockResolvedValue({});
      mockUseRejectStep.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      });

      render(<ApprovalsPage />);

      const user = userEvent.setup();
      const rejectButtons = screen.getAllByRole('button', { name: /reject/i });

      await user.click(rejectButtons[0]);

      // Rejection typically requires comments
      const commentsInput = await screen.findByPlaceholderText(/required/i);
      await user.type(commentsInput, 'Needs more information');

      const confirmButton = screen.getByRole('button', { name: /^Reject$/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith({
          requestId: TEST_PENDING_APPROVALS[0].id,
          stepId: TEST_PENDING_APPROVALS[0].stepId,
          comments: 'Needs more information',
        });
      });
    });

    it('should show success toast after successful rejection', async () => {
      const mockMutateAsync = vi.fn().mockResolvedValue({});
      mockUseRejectStep.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      });

      render(<ApprovalsPage />);

      const user = userEvent.setup();
      const rejectButtons = screen.getAllByRole('button', { name: /reject/i });

      await user.click(rejectButtons[0]);

      const commentsInput = await screen.findByPlaceholderText(/required/i);
      await user.type(commentsInput, 'Not approved');

      const confirmButton = screen.getByRole('button', { name: /^Reject$/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockAddToast).toHaveBeenCalledWith({
          title: 'Rejected',
          description: 'The request has been rejected',
          variant: 'success',
        });
      });
    });
  });

  describe('Delegate Action', () => {
    it('should open delegate modal when delegate button clicked', async () => {
      render(<ApprovalsPage />);

      const user = userEvent.setup();
      const delegateButtons = screen.getAllByRole('button', { name: /delegate/i });

      await user.click(delegateButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/Delegate Approval/i)).toBeInTheDocument();
      });
    });

    it('should display user search in delegate modal', async () => {
      render(<ApprovalsPage />);

      const user = userEvent.setup();
      const delegateButtons = screen.getAllByRole('button', { name: /delegate/i });

      await user.click(delegateButtons[0]);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/search users/i)).toBeInTheDocument();
      });
    });

    it('should call delegate mutation with correct parameters', async () => {
      const mockMutateAsync = vi.fn().mockResolvedValue({});
      mockUseDelegateStep.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      });

      render(<ApprovalsPage />);

      const user = userEvent.setup();
      const delegateButtons = screen.getAllByRole('button', { name: /delegate/i });

      await user.click(delegateButtons[0]);

      // Select a user
      const userSelect = await screen.findByRole('combobox', { name: /delegate to/i });
      await user.click(userSelect);

      const userOption = screen.getByRole('option', { name: /John Doe/i });
      await user.click(userOption);

      const confirmButton = screen.getByRole('button', { name: /^Delegate$/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith({
          requestId: TEST_PENDING_APPROVALS[0].id,
          stepId: TEST_PENDING_APPROVALS[0].stepId,
          delegateToUserId: 'user-1',
          reason: undefined,
        });
      });
    });

    it('should show success toast after successful delegation', async () => {
      const mockMutateAsync = vi.fn().mockResolvedValue({});
      mockUseDelegateStep.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      });

      render(<ApprovalsPage />);

      const user = userEvent.setup();
      const delegateButtons = screen.getAllByRole('button', { name: /delegate/i });

      await user.click(delegateButtons[0]);

      const userSelect = await screen.findByRole('combobox', { name: /delegate to/i });
      await user.click(userSelect);
      const userOption = screen.getByRole('option', { name: /John Doe/i });
      await user.click(userOption);

      const confirmButton = screen.getByRole('button', { name: /^Delegate$/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockAddToast).toHaveBeenCalledWith({
          title: 'Delegated',
          description: 'The approval has been delegated to another user',
          variant: 'success',
        });
      });
    });
  });

  describe('Error Handling', () => {
    it('should show error toast when approve action fails', async () => {
      const mockMutateAsync = vi.fn().mockRejectedValue(new Error('API Error'));
      mockUseApproveStep.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      });

      render(<ApprovalsPage />);

      const user = userEvent.setup();
      const approveButtons = screen.getAllByRole('button', { name: /approve/i });

      await user.click(approveButtons[0]);

      const confirmButton = await screen.findByRole('button', { name: /^Approve$/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockAddToast).toHaveBeenCalledWith({
          title: 'Action failed',
          description: 'Failed to approve the request',
          variant: 'error',
        });
      });
    });

    it('should show error toast when reject action fails', async () => {
      const mockMutateAsync = vi.fn().mockRejectedValue(new Error('API Error'));
      mockUseRejectStep.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      });

      render(<ApprovalsPage />);

      const user = userEvent.setup();
      const rejectButtons = screen.getAllByRole('button', { name: /reject/i });

      await user.click(rejectButtons[0]);

      const commentsInput = await screen.findByPlaceholderText(/required/i);
      await user.type(commentsInput, 'Test');

      const confirmButton = screen.getByRole('button', { name: /^Reject$/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockAddToast).toHaveBeenCalledWith({
          title: 'Action failed',
          description: 'Failed to reject the request',
          variant: 'error',
        });
      });
    });
  });

  describe('Refresh Functionality', () => {
    it('should call refetch when refresh button clicked', async () => {
      render(<ApprovalsPage />);

      const user = userEvent.setup();
      const refreshButton = screen.getByRole('button', { name: /refresh/i });

      await user.click(refreshButton);

      expect(mockRefetch).toHaveBeenCalled();
    });

    it('should show loading state during manual refresh', () => {
      mockUsePendingApprovals.mockReturnValue({
        data: TEST_PENDING_APPROVALS,
        isLoading: true,
        isError: false,
        refetch: mockRefetch,
      });

      render(<ApprovalsPage />);

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      expect(refreshButton).toBeDisabled();
    });
  });

  describe('Modal Interactions', () => {
    it('should close modal when cancel button clicked', async () => {
      render(<ApprovalsPage />);

      const user = userEvent.setup();
      const approveButtons = screen.getAllByRole('button', { name: /approve/i });

      await user.click(approveButtons[0]);

      const modal = await screen.findByText(/Approve Request/i);
      expect(modal).toBeInTheDocument();

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByText(/Approve Request/i)).not.toBeInTheDocument();
      });
    });

    it('should close modal after successful action', async () => {
      const mockMutateAsync = vi.fn().mockResolvedValue({});
      mockUseApproveStep.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      });

      render(<ApprovalsPage />);

      const user = userEvent.setup();
      const approveButtons = screen.getAllByRole('button', { name: /approve/i });

      await user.click(approveButtons[0]);

      const confirmButton = await screen.findByRole('button', { name: /^Approve$/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(screen.queryByText(/Approve Request/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Authentication', () => {
    it('should render with authenticated user', () => {
      const { container } = render(<ApprovalsPage />);

      expect(container).toBeInTheDocument();
      expect(screen.getByText('Approvals Inbox')).toBeInTheDocument();
    });
  });
});
