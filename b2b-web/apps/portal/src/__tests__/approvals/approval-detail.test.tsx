/**
 * Approval Detail Page Tests
 *
 * @feature approvals-inbox (FE-018)
 * @module approvals
 * @priority P0
 * @dependencies auth, api-client
 */

import * as React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';

// Mock data for approval detail
export const TEST_APPROVAL_REQUEST = {
  id: 'approval-123',
  entityType: 'QUOTE' as const,
  entityId: 'quote-456',
  status: 'IN_PROGRESS' as const,
  currentLevel: 2,
  chainId: 'chain-789',
  requesterId: 'requester-user-id',
  requestedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
  completedAt: null,
  expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // expires in 5 days
  steps: [
    {
      id: 'step-1',
      level: 1,
      status: 'APPROVED' as const,
      comments: 'Looks good, approved',
      delegatedFrom: null,
      approverId: 'user-111',
      requestedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      respondedAt: new Date(Date.now() - 1.5 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'step-2',
      level: 2,
      status: 'PENDING' as const,
      comments: null,
      delegatedFrom: null,
      approverId: 'test-user-id', // Current user
      requestedAt: new Date(Date.now() - 1.5 * 24 * 60 * 60 * 1000).toISOString(),
      respondedAt: null,
    },
    {
      id: 'step-3',
      level: 3,
      status: 'PENDING' as const,
      comments: null,
      delegatedFrom: null,
      approverId: 'user-333',
      requestedAt: null as any,
      respondedAt: null,
    },
  ],
  metadata: {
    amount: 50000,
    currency: 'USD',
  },
};

export const TEST_COMPLETED_APPROVAL = {
  ...TEST_APPROVAL_REQUEST,
  id: 'approval-completed',
  status: 'APPROVED' as const,
  currentLevel: 3,
  completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // completed 1 day ago
  expiresAt: null,
  steps: TEST_APPROVAL_REQUEST.steps.map(step => ({
    ...step,
    status: 'APPROVED' as const,
    respondedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  })),
};

// Mock hooks
const mockUseApprovalRequest = vi.fn();
const mockUseApproveStep = vi.fn();
const mockUseRejectStep = vi.fn();
const mockUseDelegateStep = vi.fn();
const mockUseCancelApproval = vi.fn();
const mockUseUsers = vi.fn();
const mockRefetch = vi.fn();
const mockAddToast = vi.fn();
const mockRouterBack = vi.fn();
const mockRouterPush = vi.fn();

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

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'approval-123' }),
  useRouter: () => ({
    back: mockRouterBack,
    push: mockRouterPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => '/approvals/approval-123',
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('../../app/approvals/hooks/use-approvals', () => ({
  useApprovalRequest: (id: string) => mockUseApprovalRequest(id),
  useApproveStep: () => mockUseApproveStep(),
  useRejectStep: () => mockUseRejectStep(),
  useDelegateStep: () => mockUseDelegateStep(),
  useCancelApproval: () => mockUseCancelApproval(),
  useUsers: (search?: string) => mockUseUsers(search),
  formatDateTime: (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  },
  getRequestStatusLabel: (status: string) => {
    const labels: Record<string, string> = {
      PENDING: 'Pending',
      IN_PROGRESS: 'In Progress',
      APPROVED: 'Approved',
      REJECTED: 'Rejected',
      CANCELLED: 'Cancelled',
      EXPIRED: 'Expired',
    };
    return labels[status] || status;
  },
  getRequestStatusBadgeColor: (status: string) => {
    const colors: Record<string, string> = {
      PENDING: 'bg-amber-100 text-amber-800',
      IN_PROGRESS: 'bg-blue-100 text-blue-800',
      APPROVED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800',
      CANCELLED: 'bg-gray-100 text-gray-800',
      EXPIRED: 'bg-orange-100 text-orange-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
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
  isApprovalPending: (status: string) => {
    return status === 'PENDING' || status === 'IN_PROGRESS';
  },
  canApproveOrReject: (stepStatus: string) => {
    return stepStatus === 'PENDING';
  },
}));

vi.mock('@b2b/ui', async () => {
  const actual = await vi.importActual('@b2b/ui');
  return {
    ...actual,
    useToast: () => ({ addToast: mockAddToast }),
  };
});

// Mock the ApprovalTimeline component
vi.mock('../../app/approvals/components/approval-timeline', () => ({
  ApprovalTimeline: ({ approval }: any) => (
    <div data-testid="approval-timeline">
      <p>Timeline for {approval.id}</p>
    </div>
  ),
}));

// Import the component after mocks are set up
const ApprovalDetailPage = (await import('../../app/approvals/[id]/page')).default;

describe('Approval Detail Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    mockUseApprovalRequest.mockReturnValue({
      data: TEST_APPROVAL_REQUEST,
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

    mockUseCancelApproval.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });

    mockUseUsers.mockReturnValue({
      data: {
        data: [],
        meta: { total: 0, page: 1, limit: 20, totalPages: 1 },
      },
      isLoading: false,
    });
  });

  describe('Page Rendering', () => {
    it('should render page header with back button', () => {
      render(<ApprovalDetailPage />);

      expect(screen.getByText('Back to Approvals')).toBeInTheDocument();
    });

    it('should render refresh button', () => {
      render(<ApprovalDetailPage />);

      expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
    });

    it('should render page title and status badges', () => {
      render(<ApprovalDetailPage />);

      expect(screen.getByText('Approval Request')).toBeInTheDocument();
      expect(screen.getByText('In Progress')).toBeInTheDocument();
      expect(screen.getByText('Quote')).toBeInTheDocument();
    });

    it('should display requested timestamp', () => {
      render(<ApprovalDetailPage />);

      expect(screen.getByText(/Requested/)).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should display loading skeleton while fetching', () => {
      mockUseApprovalRequest.mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        refetch: mockRefetch,
      });

      const { container } = render(<ApprovalDetailPage />);

      // Check for skeleton elements (animated loading placeholders)
      const skeletons = container.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('Error State', () => {
    it('should display error message when fetch fails', () => {
      mockUseApprovalRequest.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        refetch: mockRefetch,
      });

      render(<ApprovalDetailPage />);

      expect(screen.getByText('Failed to load approval request')).toBeInTheDocument();
    });

    it('should render go back button on error', async () => {
      mockUseApprovalRequest.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        refetch: mockRefetch,
      });

      render(<ApprovalDetailPage />);

      const goBackButton = screen.getByRole('button', { name: /go back/i });
      expect(goBackButton).toBeInTheDocument();

      const user = userEvent.setup();
      await user.click(goBackButton);

      expect(mockRouterBack).toHaveBeenCalled();
    });
  });

  describe('Request Details Section', () => {
    it('should display entity type', () => {
      render(<ApprovalDetailPage />);

      expect(screen.getByText('Entity Type')).toBeInTheDocument();
      expect(screen.getAllByText('Quote')[0]).toBeInTheDocument();
    });

    it('should display current level', () => {
      render(<ApprovalDetailPage />);

      expect(screen.getByText('Current Level')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('should display request status', () => {
      render(<ApprovalDetailPage />);

      expect(screen.getAllByText('Status')[0]).toBeInTheDocument();
      expect(screen.getAllByText('In Progress')[0]).toBeInTheDocument();
    });

    it('should display total steps', () => {
      render(<ApprovalDetailPage />);

      expect(screen.getByText('Total Steps')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('should render link to entity details', () => {
      render(<ApprovalDetailPage />);

      const entityLink = screen.getByRole('link', { name: /Open Quote Details/i });
      expect(entityLink).toBeInTheDocument();
      expect(entityLink).toHaveAttribute('href', '/quotes/quote-456');
    });
  });

  describe('Current User Action Card', () => {
    it('should display action card when user has pending step', () => {
      render(<ApprovalDetailPage />);

      expect(screen.getByText('Your Action Required')).toBeInTheDocument();
      expect(screen.getByText(/This approval is waiting for your decision/)).toBeInTheDocument();
    });

    it('should show approve, reject, and delegate buttons', () => {
      render(<ApprovalDetailPage />);

      const approveButtons = screen.getAllByRole('button', { name: /approve/i });
      const rejectButtons = screen.getAllByRole('button', { name: /reject/i });
      const delegateButtons = screen.getAllByRole('button', { name: /delegate/i });

      expect(approveButtons.length).toBeGreaterThan(0);
      expect(rejectButtons.length).toBeGreaterThan(0);
      expect(delegateButtons.length).toBeGreaterThan(0);
    });

    it('should not display action card when user has no pending steps', () => {
      const approvalWithNoPendingForUser = {
        ...TEST_APPROVAL_REQUEST,
        steps: TEST_APPROVAL_REQUEST.steps.map(step => ({
          ...step,
          approverId: 'other-user-id', // Different user
        })),
      };

      mockUseApprovalRequest.mockReturnValue({
        data: approvalWithNoPendingForUser,
        isLoading: false,
        isError: false,
        refetch: mockRefetch,
      });

      render(<ApprovalDetailPage />);

      expect(screen.queryByText('Your Action Required')).not.toBeInTheDocument();
    });

    it('should disable action buttons when processing', () => {
      mockUseApproveStep.mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: true, // Processing state
      });

      render(<ApprovalDetailPage />);

      const approveButtons = screen.getAllByRole('button', { name: /approve/i });
      approveButtons.forEach(button => {
        expect(button).toBeDisabled();
      });
    });
  });

  describe('Approval History Section', () => {
    it('should display approval history title', () => {
      render(<ApprovalDetailPage />);

      expect(screen.getByText('Approval History')).toBeInTheDocument();
      expect(screen.getByText('Track the progress of this approval request')).toBeInTheDocument();
    });

    it('should display all approval steps', () => {
      render(<ApprovalDetailPage />);

      expect(screen.getByText('Level 1')).toBeInTheDocument();
      expect(screen.getByText('Level 2')).toBeInTheDocument();
      expect(screen.getByText('Level 3')).toBeInTheDocument();
    });

    it('should display step statuses', () => {
      render(<ApprovalDetailPage />);

      expect(screen.getAllByText('APPROVED')[0]).toBeInTheDocument();
      expect(screen.getAllByText('PENDING').length).toBeGreaterThan(0);
    });

    it('should display step comments when present', () => {
      render(<ApprovalDetailPage />);

      expect(screen.getByText(/Looks good, approved/)).toBeInTheDocument();
    });

    it('should display requested timestamp for each step', () => {
      render(<ApprovalDetailPage />);

      const requestedLabels = screen.getAllByText(/Requested:/);
      expect(requestedLabels.length).toBeGreaterThan(0);
    });

    it('should display responded timestamp for completed steps', () => {
      render(<ApprovalDetailPage />);

      const respondedLabels = screen.getAllByText(/Responded:/);
      expect(respondedLabels.length).toBeGreaterThan(0);
    });

    it('should indicate delegated steps', () => {
      const approvalWithDelegation = {
        ...TEST_APPROVAL_REQUEST,
        steps: [
          ...TEST_APPROVAL_REQUEST.steps.slice(0, 1),
          {
            ...TEST_APPROVAL_REQUEST.steps[1],
            delegatedFrom: 'original-user-id',
          },
          ...TEST_APPROVAL_REQUEST.steps.slice(2),
        ],
      };

      mockUseApprovalRequest.mockReturnValue({
        data: approvalWithDelegation,
        isLoading: false,
        isError: false,
        refetch: mockRefetch,
      });

      render(<ApprovalDetailPage />);

      expect(screen.getByText(/Delegated from another user/)).toBeInTheDocument();
    });

    it('should show action buttons for pending steps owned by current user', () => {
      render(<ApprovalDetailPage />);

      // Current user owns step 2, should see action buttons
      const approveButtons = screen.getAllByRole('button', { name: /approve/i });
      expect(approveButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Timeline Section', () => {
    it('should render approval timeline component', () => {
      render(<ApprovalDetailPage />);

      expect(screen.getByTestId('approval-timeline')).toBeInTheDocument();
    });

    it('should pass approval data to timeline', () => {
      render(<ApprovalDetailPage />);

      expect(screen.getByText(/Timeline for approval-123/)).toBeInTheDocument();
    });
  });

  describe('Key Dates Section', () => {
    it('should display requested date', () => {
      render(<ApprovalDetailPage />);

      expect(screen.getByText('Requested')).toBeInTheDocument();
    });

    it('should display completed date when approval is completed', () => {
      mockUseApprovalRequest.mockReturnValue({
        data: TEST_COMPLETED_APPROVAL,
        isLoading: false,
        isError: false,
        refetch: mockRefetch,
      });

      render(<ApprovalDetailPage />);

      expect(screen.getByText('Completed')).toBeInTheDocument();
    });

    it('should display expires date when set and not completed', () => {
      render(<ApprovalDetailPage />);

      expect(screen.getByText('Expires')).toBeInTheDocument();
    });

    it('should not display expires date when approval is completed', () => {
      mockUseApprovalRequest.mockReturnValue({
        data: TEST_COMPLETED_APPROVAL,
        isLoading: false,
        isError: false,
        refetch: mockRefetch,
      });

      render(<ApprovalDetailPage />);

      expect(screen.queryByText('Expires')).not.toBeInTheDocument();
    });
  });

  describe('Progress Section', () => {
    it('should display progress counter', () => {
      render(<ApprovalDetailPage />);

      expect(screen.getByText('Progress')).toBeInTheDocument();
      expect(screen.getByText('1/3')).toBeInTheDocument(); // 1 approved out of 3 total
      expect(screen.getByText('Steps Completed')).toBeInTheDocument();
    });

    it('should show correct count of completed steps', () => {
      mockUseApprovalRequest.mockReturnValue({
        data: TEST_COMPLETED_APPROVAL,
        isLoading: false,
        isError: false,
        refetch: mockRefetch,
      });

      render(<ApprovalDetailPage />);

      expect(screen.getByText('3/3')).toBeInTheDocument(); // All approved
    });
  });

  describe('Navigation', () => {
    it('should navigate back to approvals list', () => {
      render(<ApprovalDetailPage />);

      const backLink = screen.getByRole('link', { name: /back to approvals/i });
      expect(backLink).toHaveAttribute('href', '/approvals');
    });

    it('should have link to view entity', () => {
      render(<ApprovalDetailPage />);

      const viewEntityLink = screen.getAllByRole('link', { name: /view quote/i })[0];
      expect(viewEntityLink).toHaveAttribute('href', '/quotes/quote-456');
    });
  });

  describe('Cancel Functionality', () => {
    it('should show cancel button when user is requester and approval is pending', () => {
      mockUseApprovalRequest.mockReturnValue({
        data: {
          ...TEST_APPROVAL_REQUEST,
          requesterId: 'test-user-id', // Current user is requester
        },
        isLoading: false,
        isError: false,
        refetch: mockRefetch,
      });

      render(<ApprovalDetailPage />);

      expect(screen.getByRole('button', { name: /cancel request/i })).toBeInTheDocument();
    });

    it('should not show cancel button when user is not requester', () => {
      render(<ApprovalDetailPage />);

      expect(screen.queryByRole('button', { name: /cancel request/i })).not.toBeInTheDocument();
    });

    it('should not show cancel button when approval is completed', () => {
      mockUseApprovalRequest.mockReturnValue({
        data: {
          ...TEST_COMPLETED_APPROVAL,
          requesterId: 'test-user-id',
        },
        isLoading: false,
        isError: false,
        refetch: mockRefetch,
      });

      render(<ApprovalDetailPage />);

      expect(screen.queryByRole('button', { name: /cancel request/i })).not.toBeInTheDocument();
    });

    it('should call cancel mutation when cancel button clicked', async () => {
      const mockMutate = vi.fn((id, options) => {
        options.onSuccess();
      });

      mockUseCancelApproval.mockReturnValue({
        mutate: mockMutate,
        isPending: false,
      });

      mockUseApprovalRequest.mockReturnValue({
        data: {
          ...TEST_APPROVAL_REQUEST,
          requesterId: 'test-user-id',
        },
        isLoading: false,
        isError: false,
        refetch: mockRefetch,
      });

      render(<ApprovalDetailPage />);

      const user = userEvent.setup();
      const cancelButton = screen.getByRole('button', { name: /cancel request/i });

      await user.click(cancelButton);

      expect(mockMutate).toHaveBeenCalledWith('approval-123', expect.any(Object));
      expect(mockAddToast).toHaveBeenCalledWith({
        title: 'Cancelled',
        description: 'The approval request has been cancelled',
        variant: 'success',
      });
    });

    it('should show error toast when cancel fails', async () => {
      const mockMutate = vi.fn((id, options) => {
        options.onError();
      });

      mockUseCancelApproval.mockReturnValue({
        mutate: mockMutate,
        isPending: false,
      });

      mockUseApprovalRequest.mockReturnValue({
        data: {
          ...TEST_APPROVAL_REQUEST,
          requesterId: 'test-user-id',
        },
        isLoading: false,
        isError: false,
        refetch: mockRefetch,
      });

      render(<ApprovalDetailPage />);

      const user = userEvent.setup();
      const cancelButton = screen.getByRole('button', { name: /cancel request/i });

      await user.click(cancelButton);

      expect(mockAddToast).toHaveBeenCalledWith({
        title: 'Cancellation failed',
        description: 'Failed to cancel the approval request',
        variant: 'error',
      });
    });

    it('should disable cancel button during processing', () => {
      mockUseCancelApproval.mockReturnValue({
        mutate: vi.fn(),
        isPending: true, // Processing
      });

      mockUseApprovalRequest.mockReturnValue({
        data: {
          ...TEST_APPROVAL_REQUEST,
          requesterId: 'test-user-id',
        },
        isLoading: false,
        isError: false,
        refetch: mockRefetch,
      });

      render(<ApprovalDetailPage />);

      const cancelButton = screen.getByRole('button', { name: /cancel request/i });
      expect(cancelButton).toBeDisabled();
    });
  });

  describe('Refresh Functionality', () => {
    it('should call refetch when refresh button clicked', async () => {
      render(<ApprovalDetailPage />);

      const user = userEvent.setup();
      const refreshButton = screen.getByRole('button', { name: /refresh/i });

      await user.click(refreshButton);

      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  describe('Status Display', () => {
    it('should display IN_PROGRESS status correctly', () => {
      render(<ApprovalDetailPage />);

      const statusBadges = screen.getAllByText('In Progress');
      expect(statusBadges.length).toBeGreaterThan(0);
    });

    it('should display APPROVED status correctly', () => {
      mockUseApprovalRequest.mockReturnValue({
        data: TEST_COMPLETED_APPROVAL,
        isLoading: false,
        isError: false,
        refetch: mockRefetch,
      });

      render(<ApprovalDetailPage />);

      const statusBadges = screen.getAllByText('Approved');
      expect(statusBadges.length).toBeGreaterThan(0);
    });

    it('should display step status badges with correct colors', () => {
      render(<ApprovalDetailPage />);

      const approvedBadge = screen.getAllByText('APPROVED')[0];
      expect(approvedBadge).toHaveClass('bg-green-100');

      const pendingBadges = screen.getAllByText('PENDING');
      pendingBadges.forEach(badge => {
        expect(badge).toHaveClass('bg-amber-100');
      });
    });
  });

  describe('Authentication', () => {
    it('should render with authenticated user', () => {
      const { container } = render(<ApprovalDetailPage />);

      expect(container).toBeInTheDocument();
      expect(screen.getByText('Approval Request')).toBeInTheDocument();
    });
  });
});
