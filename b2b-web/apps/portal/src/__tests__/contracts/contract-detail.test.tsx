/**
 * Contract Detail Page Tests
 *
 * Tests for the Contract detail page component that displays
 * detailed contract information, timeline, versions, and workflow actions.
 *
 * Feature: Contract Management (Phase 1)
 * Component: apps/portal/src/app/contracts/[id]/page.tsx
 */

import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as React from 'react';

import ContractDetailPage from '../../app/contracts/[id]/page';
import type {
  ContractDto,
  ContractVersionDto,
  ContractVersionsResponse,
} from '../../app/contracts/hooks';

// =============================================================================
// Mocks
// =============================================================================

// Mock Auth
const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  role: 'USER',
  tenantId: 'test-tenant-id',
  accessToken: 'mock-access-token',
};

vi.mock('@b2b/auth/react', () => ({
  useAuth: () => ({
    user: mockUser,
    isAuthenticated: true,
    isLoading: false,
    error: null,
  }),
  RequireAuth: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock Next.js navigation
const mockPush = vi.fn();
const mockParams = { id: 'contract-123' };

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => '/contracts/contract-123',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => mockParams,
}));

// Mock contract hooks
const mockUseContract = vi.fn();
const mockUseContractVersions = vi.fn();
const mockRefetchContract = vi.fn();

vi.mock('../../app/contracts/hooks', async () => {
  const actual = await vi.importActual('../../app/contracts/hooks');
  return {
    ...actual,
    useContract: (id: string) => mockUseContract(id),
    useContractVersions: (id: string) => mockUseContractVersions(id),
  };
});

// Mock components (we're testing the page, not the child components)
vi.mock('../../app/contracts/components', () => ({
  ContractTimeline: ({ contract }: { contract: ContractDto }) => (
    <div data-testid="contract-timeline">
      Timeline for {contract.contractNumber}
    </div>
  ),
  VersionHistory: ({ versions, isLoading }: { versions: ContractVersionDto[]; isLoading: boolean }) => (
    <div data-testid="version-history">
      {isLoading ? 'Loading versions...' : `${versions.length} versions`}
    </div>
  ),
  WorkflowActions: ({ contractId, status, onSuccess }: any) => (
    <div data-testid="workflow-actions">
      <button onClick={onSuccess} data-testid="workflow-success">
        Trigger Success
      </button>
      <span data-testid="workflow-status">{status}</span>
    </div>
  ),
}));

// Mock file components
vi.mock('@/components/files', () => ({
  FileList: ({ entityType, entityId }: any) => (
    <div data-testid="file-list">
      Files for {entityType}: {entityId}
    </div>
  ),
  FileUpload: ({ entityType, entityId, onUploadComplete }: any) => (
    <div data-testid="file-upload">
      <button onClick={onUploadComplete} data-testid="upload-complete">
        Upload Complete
      </button>
    </div>
  ),
}));

// Mock window.alert for PDF download
global.alert = vi.fn();

// =============================================================================
// Test Data
// =============================================================================

const mockContract: ContractDto = {
  id: 'contract-123',
  contractNumber: 'CON-2024-001',
  title: 'Enterprise Software License Agreement',
  description: 'Annual software license agreement with support and maintenance',
  status: 'ACTIVE',
  startDate: '2024-01-01',
  endDate: '2024-12-31',
  totalValue: '250000',
  currency: 'USD',
  organizationId: 'org-456',
  organizationName: 'Acme Corporation',
  createdById: 'user-789',
  createdByName: 'John Doe',
  createdAt: '2024-01-01T10:00:00Z',
  updatedAt: '2024-01-15T14:30:00Z',
  submittedAt: '2024-01-02T09:00:00Z',
  approvedAt: '2024-01-03T11:00:00Z',
  activatedAt: '2024-01-05T08:00:00Z',
  version: 2,
};

const mockContractDraft: ContractDto = {
  ...mockContract,
  id: 'contract-draft-123',
  contractNumber: 'CON-2024-002',
  title: 'Draft Contract',
  status: 'DRAFT',
  submittedAt: undefined,
  approvedAt: undefined,
  activatedAt: undefined,
  version: 1,
};

const mockVersions: ContractVersionDto[] = [
  {
    id: 'version-1',
    contractId: 'contract-123',
    version: 1,
    title: 'Enterprise Software License Agreement',
    description: 'Initial version',
    status: 'DRAFT',
    totalValue: '200000',
    currency: 'USD',
    createdById: 'user-789',
    createdByName: 'John Doe',
    createdAt: '2024-01-01T10:00:00Z',
    comment: 'Initial draft',
  },
  {
    id: 'version-2',
    contractId: 'contract-123',
    version: 2,
    title: 'Enterprise Software License Agreement',
    description: 'Annual software license agreement with support and maintenance',
    status: 'ACTIVE',
    totalValue: '250000',
    currency: 'USD',
    createdById: 'user-789',
    createdByName: 'John Doe',
    createdAt: '2024-01-15T14:30:00Z',
    comment: 'Updated pricing and terms',
  },
];

const mockVersionsResponse: ContractVersionsResponse = {
  data: mockVersions,
  total: 2,
  page: 1,
  limit: 10,
  totalPages: 1,
};

// =============================================================================
// Tests
// =============================================================================

describe('ContractDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRefetchContract.mockResolvedValue(undefined);
  });

  // ===========================================================================
  // Loading State
  // ===========================================================================

  describe('Loading State', () => {
    it('should display loading skeleton while fetching contract', () => {
      mockUseContract.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
        refetch: mockRefetchContract,
      });
      mockUseContractVersions.mockReturnValue({
        data: undefined,
        isLoading: true,
      });

      const { container } = render(<ContractDetailPage />);

      // Should show skeleton with animate-pulse
      expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
    });

    it('should not display loading skeleton when contract is loaded', () => {
      mockUseContract.mockReturnValue({
        data: mockContract,
        isLoading: false,
        error: null,
        refetch: mockRefetchContract,
      });
      mockUseContractVersions.mockReturnValue({
        data: mockVersionsResponse,
        isLoading: false,
      });

      const { container } = render(<ContractDetailPage />);

      expect(container.querySelector('.animate-pulse')).not.toBeInTheDocument();
      expect(screen.getByText(mockContract.title)).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Error State
  // ===========================================================================

  describe('Error State', () => {
    it('should display error message when contract fetch fails', () => {
      mockUseContract.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Failed to fetch contract'),
        refetch: mockRefetchContract,
      });
      mockUseContractVersions.mockReturnValue({
        data: undefined,
        isLoading: false,
      });

      render(<ContractDetailPage />);

      expect(
        screen.getByText('Failed to load contract details')
      ).toBeInTheDocument();
    });

    it('should display retry button in error state', () => {
      mockUseContract.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Failed to fetch contract'),
        refetch: mockRefetchContract,
      });
      mockUseContractVersions.mockReturnValue({
        data: undefined,
        isLoading: false,
      });

      render(<ContractDetailPage />);

      const retryButton = screen.getByRole('button', { name: /Retry/i });
      expect(retryButton).toBeInTheDocument();
    });

    it('should call refetch when retry button is clicked', async () => {
      const user = userEvent.setup();
      mockUseContract.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Failed to fetch contract'),
        refetch: mockRefetchContract,
      });
      mockUseContractVersions.mockReturnValue({
        data: undefined,
        isLoading: false,
      });

      render(<ContractDetailPage />);

      const retryButton = screen.getByRole('button', { name: /Retry/i });
      await user.click(retryButton);

      expect(mockRefetchContract).toHaveBeenCalledTimes(1);
    });

    it('should display error when contract is null', () => {
      mockUseContract.mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
        refetch: mockRefetchContract,
      });
      mockUseContractVersions.mockReturnValue({
        data: undefined,
        isLoading: false,
      });

      render(<ContractDetailPage />);

      expect(
        screen.getByText('Failed to load contract details')
      ).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Page Header
  // ===========================================================================

  describe('Page Header', () => {
    beforeEach(() => {
      mockUseContract.mockReturnValue({
        data: mockContract,
        isLoading: false,
        error: null,
        refetch: mockRefetchContract,
      });
      mockUseContractVersions.mockReturnValue({
        data: mockVersionsResponse,
        isLoading: false,
      });
    });

    it('should render contract title', () => {
      render(<ContractDetailPage />);

      expect(screen.getByText(mockContract.title)).toBeInTheDocument();
    });

    it('should render contract number', () => {
      render(<ContractDetailPage />);

      expect(screen.getByText(mockContract.contractNumber)).toBeInTheDocument();
    });

    it('should render status badge', () => {
      render(<ContractDetailPage />);

      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('should render total value', () => {
      render(<ContractDetailPage />);

      // formatCurrency formats as $250,000.00
      expect(screen.getByText('$250,000.00')).toBeInTheDocument();
      expect(screen.getByText('Total Value')).toBeInTheDocument();
    });

    it('should render Back to Contracts button', () => {
      render(<ContractDetailPage />);

      const backButton = screen.getByRole('button', { name: /Back to Contracts/i });
      expect(backButton).toBeInTheDocument();
    });

    it('should navigate back to contracts list when back button is clicked', async () => {
      const user = userEvent.setup();
      render(<ContractDetailPage />);

      const backButton = screen.getByRole('button', { name: /Back to Contracts/i });
      await user.click(backButton);

      expect(mockPush).toHaveBeenCalledWith('/contracts');
    });

    it('should render Refresh button', () => {
      render(<ContractDetailPage />);

      const refreshButton = screen.getByRole('button', { name: /Refresh/i });
      expect(refreshButton).toBeInTheDocument();
    });

    it('should call refetch when refresh button is clicked', async () => {
      const user = userEvent.setup();
      render(<ContractDetailPage />);

      const refreshButton = screen.getByRole('button', { name: /Refresh/i });
      await user.click(refreshButton);

      expect(mockRefetchContract).toHaveBeenCalledTimes(1);
    });

    it('should render Download PDF button', () => {
      render(<ContractDetailPage />);

      const downloadButton = screen.getByRole('button', { name: /Download PDF/i });
      expect(downloadButton).toBeInTheDocument();
    });

    it('should show alert when Download PDF button is clicked', async () => {
      const user = userEvent.setup();
      render(<ContractDetailPage />);

      const downloadButton = screen.getByRole('button', { name: /Download PDF/i });
      await user.click(downloadButton);

      expect(global.alert).toHaveBeenCalledWith(
        expect.stringContaining('PDF download functionality')
      );
    });
  });

  // ===========================================================================
  // Workflow Actions
  // ===========================================================================

  describe('Workflow Actions', () => {
    beforeEach(() => {
      mockUseContract.mockReturnValue({
        data: mockContract,
        isLoading: false,
        error: null,
        refetch: mockRefetchContract,
      });
      mockUseContractVersions.mockReturnValue({
        data: mockVersionsResponse,
        isLoading: false,
      });
    });

    it('should render WorkflowActions component', () => {
      render(<ContractDetailPage />);

      expect(screen.getByTestId('workflow-actions')).toBeInTheDocument();
    });

    it('should pass contract status to WorkflowActions', () => {
      render(<ContractDetailPage />);

      expect(screen.getByTestId('workflow-status')).toHaveTextContent('ACTIVE');
    });

    it('should refetch contract when workflow action succeeds', async () => {
      const user = userEvent.setup();
      render(<ContractDetailPage />);

      const successButton = screen.getByTestId('workflow-success');
      await user.click(successButton);

      expect(mockRefetchContract).toHaveBeenCalledTimes(1);
    });
  });

  // ===========================================================================
  // Contract Information
  // ===========================================================================

  describe('Contract Information', () => {
    beforeEach(() => {
      mockUseContract.mockReturnValue({
        data: mockContract,
        isLoading: false,
        error: null,
        refetch: mockRefetchContract,
      });
      mockUseContractVersions.mockReturnValue({
        data: mockVersionsResponse,
        isLoading: false,
      });
    });

    it('should render Contract Information card', () => {
      render(<ContractDetailPage />);

      expect(screen.getByText('Contract Information')).toBeInTheDocument();
    });

    it('should render contract description', () => {
      render(<ContractDetailPage />);

      expect(screen.getByText(mockContract.description!)).toBeInTheDocument();
    });

    it('should render start date', () => {
      render(<ContractDetailPage />);

      expect(screen.getAllByText(/Start Date/i)[0]).toBeInTheDocument();
      // formatDate formats as "Jan 1, 2024"
      expect(screen.getAllByText(/Jan 1, 2024/i)[0]).toBeInTheDocument();
    });

    it('should render end date', () => {
      render(<ContractDetailPage />);

      expect(screen.getAllByText(/End Date/i)[0]).toBeInTheDocument();
      expect(screen.getAllByText(/Dec 31, 2024/i)[0]).toBeInTheDocument();
    });

    it('should render organization name', () => {
      render(<ContractDetailPage />);

      expect(screen.getByText('Organization')).toBeInTheDocument();
      expect(screen.getByText(mockContract.organizationName)).toBeInTheDocument();
    });

    it('should render currency', () => {
      render(<ContractDetailPage />);

      expect(screen.getByText('Currency')).toBeInTheDocument();
      expect(screen.getByText(mockContract.currency)).toBeInTheDocument();
    });

    it('should render created by', () => {
      render(<ContractDetailPage />);

      expect(screen.getByText('Created By')).toBeInTheDocument();
      expect(screen.getByText(mockContract.createdByName)).toBeInTheDocument();
    });

    it('should render version', () => {
      render(<ContractDetailPage />);

      expect(screen.getByText('Version')).toBeInTheDocument();
      expect(screen.getByText(`v${mockContract.version}`)).toBeInTheDocument();
    });

    it('should render created timestamp', () => {
      render(<ContractDetailPage />);

      expect(screen.getAllByText(/Created/i)[0]).toBeInTheDocument();
      // formatDateTime includes date and time
      expect(screen.getByText(/Jan 1, 2024, 10:00 AM/i)).toBeInTheDocument();
    });

    it('should render last updated timestamp', () => {
      render(<ContractDetailPage />);

      expect(screen.getByText('Last Updated')).toBeInTheDocument();
      expect(screen.getByText(/Jan 15, 2024, 02:30 PM/i)).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Version History
  // ===========================================================================

  describe('Version History', () => {
    it('should render VersionHistory component', () => {
      mockUseContract.mockReturnValue({
        data: mockContract,
        isLoading: false,
        error: null,
        refetch: mockRefetchContract,
      });
      mockUseContractVersions.mockReturnValue({
        data: mockVersionsResponse,
        isLoading: false,
      });

      render(<ContractDetailPage />);

      expect(screen.getByTestId('version-history')).toBeInTheDocument();
    });

    it('should pass versions data to VersionHistory component', () => {
      mockUseContract.mockReturnValue({
        data: mockContract,
        isLoading: false,
        error: null,
        refetch: mockRefetchContract,
      });
      mockUseContractVersions.mockReturnValue({
        data: mockVersionsResponse,
        isLoading: false,
      });

      render(<ContractDetailPage />);

      expect(screen.getByText('2 versions')).toBeInTheDocument();
    });

    it('should show loading state when versions are loading', () => {
      mockUseContract.mockReturnValue({
        data: mockContract,
        isLoading: false,
        error: null,
        refetch: mockRefetchContract,
      });
      mockUseContractVersions.mockReturnValue({
        data: undefined,
        isLoading: true,
      });

      render(<ContractDetailPage />);

      expect(screen.getByText('Loading versions...')).toBeInTheDocument();
    });

    it('should show empty versions when no data', () => {
      mockUseContract.mockReturnValue({
        data: mockContract,
        isLoading: false,
        error: null,
        refetch: mockRefetchContract,
      });
      mockUseContractVersions.mockReturnValue({
        data: undefined,
        isLoading: false,
      });

      render(<ContractDetailPage />);

      expect(screen.getByText('0 versions')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Timeline
  // ===========================================================================

  describe('Timeline', () => {
    beforeEach(() => {
      mockUseContract.mockReturnValue({
        data: mockContract,
        isLoading: false,
        error: null,
        refetch: mockRefetchContract,
      });
      mockUseContractVersions.mockReturnValue({
        data: mockVersionsResponse,
        isLoading: false,
      });
    });

    it('should render ContractTimeline component', () => {
      render(<ContractDetailPage />);

      expect(screen.getByTestId('contract-timeline')).toBeInTheDocument();
    });

    it('should pass contract data to timeline', () => {
      render(<ContractDetailPage />);

      expect(
        screen.getByText(`Timeline for ${mockContract.contractNumber}`)
      ).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Key Dates
  // ===========================================================================

  describe('Key Dates', () => {
    it('should render Key Dates card', () => {
      mockUseContract.mockReturnValue({
        data: mockContract,
        isLoading: false,
        error: null,
        refetch: mockRefetchContract,
      });
      mockUseContractVersions.mockReturnValue({
        data: mockVersionsResponse,
        isLoading: false,
      });

      render(<ContractDetailPage />);

      expect(screen.getByText('Key Dates')).toBeInTheDocument();
    });

    it('should display submitted date when available', () => {
      mockUseContract.mockReturnValue({
        data: mockContract,
        isLoading: false,
        error: null,
        refetch: mockRefetchContract,
      });
      mockUseContractVersions.mockReturnValue({
        data: mockVersionsResponse,
        isLoading: false,
      });

      render(<ContractDetailPage />);

      expect(screen.getAllByText(/Submitted/i)[0]).toBeInTheDocument();
    });

    it('should display approved date when available', () => {
      mockUseContract.mockReturnValue({
        data: mockContract,
        isLoading: false,
        error: null,
        refetch: mockRefetchContract,
      });
      mockUseContractVersions.mockReturnValue({
        data: mockVersionsResponse,
        isLoading: false,
      });

      render(<ContractDetailPage />);

      expect(screen.getAllByText(/Approved/i)[0]).toBeInTheDocument();
    });

    it('should display activated date when available', () => {
      mockUseContract.mockReturnValue({
        data: mockContract,
        isLoading: false,
        error: null,
        refetch: mockRefetchContract,
      });
      mockUseContractVersions.mockReturnValue({
        data: mockVersionsResponse,
        isLoading: false,
      });

      render(<ContractDetailPage />);

      expect(screen.getAllByText(/Activated/i)[0]).toBeInTheDocument();
    });

    it('should not display workflow dates for draft contract', () => {
      mockUseContract.mockReturnValue({
        data: mockContractDraft,
        isLoading: false,
        error: null,
        refetch: mockRefetchContract,
      });
      mockUseContractVersions.mockReturnValue({
        data: mockVersionsResponse,
        isLoading: false,
      });

      render(<ContractDetailPage />);

      // Should have Created but not Submitted, Approved, or Activated
      expect(screen.getAllByText(/Created/i).length).toBeGreaterThan(0);
      expect(screen.queryByText(/Submitted/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Approved/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Activated/i)).not.toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Files & Attachments
  // ===========================================================================

  describe('Files & Attachments', () => {
    beforeEach(() => {
      mockUseContract.mockReturnValue({
        data: mockContract,
        isLoading: false,
        error: null,
        refetch: mockRefetchContract,
      });
      mockUseContractVersions.mockReturnValue({
        data: mockVersionsResponse,
        isLoading: false,
      });
    });

    it('should render Files & Attachments card', () => {
      render(<ContractDetailPage />);

      expect(screen.getByText('Files & Attachments')).toBeInTheDocument();
    });

    it('should render FileList component', () => {
      render(<ContractDetailPage />);

      expect(screen.getByTestId('file-list')).toBeInTheDocument();
      expect(screen.getByText(/Files for contract: contract-123/i)).toBeInTheDocument();
    });

    it('should render Add File button', () => {
      render(<ContractDetailPage />);

      const addButton = screen.getByRole('button', { name: /Add File/i });
      expect(addButton).toBeInTheDocument();
    });

    it('should show upload form when Add File is clicked', async () => {
      const user = userEvent.setup();
      render(<ContractDetailPage />);

      const addButton = screen.getByRole('button', { name: /Add File/i });
      await user.click(addButton);

      expect(screen.getByTestId('file-upload')).toBeInTheDocument();
    });

    it('should change button text to Hide Upload when form is shown', async () => {
      const user = userEvent.setup();
      render(<ContractDetailPage />);

      const addButton = screen.getByRole('button', { name: /Add File/i });
      await user.click(addButton);

      expect(screen.getByRole('button', { name: /Hide Upload/i })).toBeInTheDocument();
    });

    it('should hide upload form when Hide Upload is clicked', async () => {
      const user = userEvent.setup();
      render(<ContractDetailPage />);

      // Show form
      const addButton = screen.getByRole('button', { name: /Add File/i });
      await user.click(addButton);
      expect(screen.getByTestId('file-upload')).toBeInTheDocument();

      // Hide form
      const hideButton = screen.getByRole('button', { name: /Hide Upload/i });
      await user.click(hideButton);

      expect(screen.queryByTestId('file-upload')).not.toBeInTheDocument();
    });

    it('should hide upload form when upload completes', async () => {
      const user = userEvent.setup();
      render(<ContractDetailPage />);

      // Show form
      const addButton = screen.getByRole('button', { name: /Add File/i });
      await user.click(addButton);
      expect(screen.getByTestId('file-upload')).toBeInTheDocument();

      // Complete upload
      const completeButton = screen.getByTestId('upload-complete');
      await user.click(completeButton);

      expect(screen.queryByTestId('file-upload')).not.toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Query Parameters
  // ===========================================================================

  describe('Query Parameters', () => {
    it('should call useContract with contract id from params', () => {
      mockUseContract.mockReturnValue({
        data: mockContract,
        isLoading: false,
        error: null,
        refetch: mockRefetchContract,
      });
      mockUseContractVersions.mockReturnValue({
        data: mockVersionsResponse,
        isLoading: false,
      });

      render(<ContractDetailPage />);

      expect(mockUseContract).toHaveBeenCalledWith('contract-123');
    });

    it('should call useContractVersions with contract id from params', () => {
      mockUseContract.mockReturnValue({
        data: mockContract,
        isLoading: false,
        error: null,
        refetch: mockRefetchContract,
      });
      mockUseContractVersions.mockReturnValue({
        data: mockVersionsResponse,
        isLoading: false,
      });

      render(<ContractDetailPage />);

      expect(mockUseContractVersions).toHaveBeenCalledWith('contract-123');
    });
  });
});
