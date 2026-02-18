/**
 * Table Component Tests
 *
 * @package ui
 * @component Table
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from './table';

describe('Table Component', () => {
  const renderBasicTable = () => {
    return render(
      <Table>
        <TableCaption>A list of users</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>John Doe</TableCell>
            <TableCell>john@example.com</TableCell>
            <TableCell>Active</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Jane Smith</TableCell>
            <TableCell>jane@example.com</TableCell>
            <TableCell>Inactive</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );
  };

  describe('Rendering', () => {
    it('should render table element', () => {
      renderBasicTable();
      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    it('should render table headers', () => {
      renderBasicTable();
      expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: 'Email' })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: 'Status' })).toBeInTheDocument();
    });

    it('should render table rows', () => {
      renderBasicTable();
      const rows = screen.getAllByRole('row');
      // 1 header row + 2 body rows = 3 total
      expect(rows).toHaveLength(3);
    });

    it('should render table cells', () => {
      renderBasicTable();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('should render table caption', () => {
      renderBasicTable();
      expect(screen.getByText('A list of users')).toBeInTheDocument();
    });

    it('should render empty table', () => {
      render(
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Column</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody />
        </Table>
      );

      expect(screen.getByRole('table')).toBeInTheDocument();
    });
  });

  describe('Table Structure', () => {
    it('should have proper thead element', () => {
      const { container } = renderBasicTable();
      const thead = container.querySelector('thead');
      expect(thead).toBeInTheDocument();
    });

    it('should have proper tbody element', () => {
      const { container } = renderBasicTable();
      const tbody = container.querySelector('tbody');
      expect(tbody).toBeInTheDocument();
    });

    it('should have proper th elements', () => {
      const { container } = renderBasicTable();
      const headers = container.querySelectorAll('th');
      expect(headers).toHaveLength(3);
    });

    it('should have proper td elements', () => {
      const { container } = renderBasicTable();
      const cells = container.querySelectorAll('td');
      expect(cells).toHaveLength(6); // 2 rows × 3 columns
    });

    it('should render footer when provided', () => {
      render(
        <Table>
          <TableBody>
            <TableRow>
              <TableCell>Data</TableCell>
            </TableRow>
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell>Footer</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      );

      expect(screen.getByText('Footer')).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('should apply custom className to Table', () => {
      render(
        <Table className="custom-table">
          <TableBody>
            <TableRow>
              <TableCell>Data</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );

      const table = screen.getByRole('table');
      expect(table).toHaveClass('custom-table');
    });

    it('should apply custom className to TableHeader', () => {
      const { container } = render(
        <Table>
          <TableHeader className="custom-header">
            <TableRow>
              <TableHead>Header</TableHead>
            </TableRow>
          </TableHeader>
        </Table>
      );

      const thead = container.querySelector('thead');
      expect(thead).toHaveClass('custom-header');
    });

    it('should apply custom className to TableBody', () => {
      const { container } = render(
        <Table>
          <TableBody className="custom-body">
            <TableRow>
              <TableCell>Data</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );

      const tbody = container.querySelector('tbody');
      expect(tbody).toHaveClass('custom-body');
    });

    it('should apply custom className to TableRow', () => {
      const { container } = render(
        <Table>
          <TableBody>
            <TableRow className="custom-row">
              <TableCell>Data</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );

      const row = container.querySelector('tr');
      expect(row).toHaveClass('custom-row');
    });

    it('should apply custom className to TableCell', () => {
      render(
        <Table>
          <TableBody>
            <TableRow>
              <TableCell className="custom-cell">Data</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );

      const cell = screen.getByText('Data');
      expect(cell).toHaveClass('custom-cell');
    });

    it('should have hover styles on rows', () => {
      const { container } = render(
        <Table>
          <TableBody>
            <TableRow>
              <TableCell>Data</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );

      const row = container.querySelector('tr');
      expect(row).toHaveClass('hover:bg-muted/50');
    });
  });

  describe('Row Selection', () => {
    it('should support selected row state', () => {
      render(
        <Table>
          <TableBody>
            <TableRow data-state="selected">
              <TableCell>Selected</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Not selected</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );

      const selectedRow = screen.getByText('Selected').closest('tr');
      expect(selectedRow).toHaveAttribute('data-state', 'selected');
    });

    it('should apply selected styling to selected row', () => {
      const { container } = render(
        <Table>
          <TableBody>
            <TableRow data-state="selected">
              <TableCell>Selected</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );

      const row = container.querySelector('tr[data-state="selected"]');
      expect(row).toHaveClass('data-[state=selected]:bg-muted');
    });

    it('should handle multiple selected rows', () => {
      render(
        <Table>
          <TableBody>
            <TableRow data-state="selected">
              <TableCell>Row 1</TableCell>
            </TableRow>
            <TableRow data-state="selected">
              <TableCell>Row 2</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Row 3</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );

      const row1 = screen.getByText('Row 1').closest('tr');
      const row2 = screen.getByText('Row 2').closest('tr');
      const row3 = screen.getByText('Row 3').closest('tr');

      expect(row1).toHaveAttribute('data-state', 'selected');
      expect(row2).toHaveAttribute('data-state', 'selected');
      expect(row3).not.toHaveAttribute('data-state', 'selected');
    });
  });

  describe('With Checkboxes', () => {
    it('should render table with checkboxes', () => {
      render(
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <input type="checkbox" aria-label="Select all" />
              </TableHead>
              <TableHead>Name</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>
                <input type="checkbox" aria-label="Select row" />
              </TableCell>
              <TableCell>John Doe</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );

      expect(screen.getByLabelText('Select all')).toBeInTheDocument();
      expect(screen.getByLabelText('Select row')).toBeInTheDocument();
    });

    it('should handle checkbox interactions', async () => {
      const user = userEvent.setup();
      render(
        <Table>
          <TableBody>
            <TableRow>
              <TableCell>
                <input type="checkbox" aria-label="Select" />
              </TableCell>
              <TableCell>Data</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );

      const checkbox = screen.getByLabelText('Select');
      expect(checkbox).not.toBeChecked();

      await user.click(checkbox);
      expect(checkbox).toBeChecked();
    });
  });

  describe('Complex Content', () => {
    it('should render links in cells', () => {
      render(
        <Table>
          <TableBody>
            <TableRow>
              <TableCell>
                <a href="/user/1">View User</a>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );

      expect(screen.getByRole('link', { name: 'View User' })).toBeInTheDocument();
    });

    it('should render buttons in cells', () => {
      render(
        <Table>
          <TableBody>
            <TableRow>
              <TableCell>
                <button>Edit</button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );

      expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
    });

    it('should render badges in cells', () => {
      render(
        <Table>
          <TableBody>
            <TableRow>
              <TableCell>
                <span className="badge">Active</span>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );

      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('should render multiple elements in cell', () => {
      render(
        <Table>
          <TableBody>
            <TableRow>
              <TableCell>
                <div>
                  <p>Primary</p>
                  <p className="text-sm text-muted-foreground">Secondary</p>
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );

      expect(screen.getByText('Primary')).toBeInTheDocument();
      expect(screen.getByText('Secondary')).toBeInTheDocument();
    });
  });

  describe('Empty States', () => {
    it('should render empty table body', () => {
      render(
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody />
        </Table>
      );

      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    it('should render empty state message', () => {
      render(
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={1}>
                <div className="text-center">No results found</div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );

      expect(screen.getByText('No results found')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have table role', () => {
      renderBasicTable();
      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    it('should have columnheader role for headers', () => {
      renderBasicTable();
      const headers = screen.getAllByRole('columnheader');
      expect(headers).toHaveLength(3);
    });

    it('should have row role for rows', () => {
      renderBasicTable();
      const rows = screen.getAllByRole('row');
      expect(rows.length).toBeGreaterThan(0);
    });

    it('should have cell role for cells', () => {
      renderBasicTable();
      const cells = screen.getAllByRole('cell');
      expect(cells.length).toBeGreaterThan(0);
    });

    it('should support caption for accessibility', () => {
      renderBasicTable();
      const caption = screen.getByText('A list of users');
      expect(caption.tagName).toBe('CAPTION');
    });

    it('should support scope attribute on headers', () => {
      render(
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Name</TableHead>
              <TableHead scope="col">Email</TableHead>
            </TableRow>
          </TableHeader>
        </Table>
      );

      const nameHeader = screen.getByRole('columnheader', { name: 'Name' });
      expect(nameHeader).toHaveAttribute('scope', 'col');
    });
  });

  describe('Responsive Behavior', () => {
    it('should have overflow wrapper', () => {
      const { container } = renderBasicTable();
      const wrapper = container.querySelector('.overflow-auto');
      expect(wrapper).toBeInTheDocument();
    });

    it('should have full width', () => {
      renderBasicTable();
      const table = screen.getByRole('table');
      expect(table).toHaveClass('w-full');
    });
  });

  describe('Sorting (External Logic)', () => {
    it('should render sortable header with button', () => {
      render(
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <button>Name ↑</button>
              </TableHead>
            </TableRow>
          </TableHeader>
        </Table>
      );

      expect(screen.getByRole('button', { name: 'Name ↑' })).toBeInTheDocument();
    });

    it('should handle sort button click', async () => {
      const handleSort = vi.fn();
      const user = userEvent.setup();

      render(
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <button onClick={handleSort}>Name</button>
              </TableHead>
            </TableRow>
          </TableHeader>
        </Table>
      );

      await user.click(screen.getByRole('button', { name: 'Name' }));
      expect(handleSort).toHaveBeenCalled();
    });
  });

  describe('Row Actions', () => {
    it('should handle row click', async () => {
      const handleClick = vi.fn();
      const user = userEvent.setup();

      render(
        <Table>
          <TableBody>
            <TableRow onClick={handleClick}>
              <TableCell>Clickable</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );

      const row = screen.getByText('Clickable').closest('tr');
      if (row) {
        await user.click(row);
        expect(handleClick).toHaveBeenCalled();
      }
    });

    it('should render action buttons in row', () => {
      render(
        <Table>
          <TableBody>
            <TableRow>
              <TableCell>Data</TableCell>
              <TableCell>
                <button>Edit</button>
                <button>Delete</button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );

      expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
    });
  });

  describe('Footer', () => {
    it('should render table footer', () => {
      const { container } = render(
        <Table>
          <TableBody>
            <TableRow>
              <TableCell>Data</TableCell>
            </TableRow>
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell>Total: 1</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      );

      const tfoot = container.querySelector('tfoot');
      expect(tfoot).toBeInTheDocument();
      expect(screen.getByText('Total: 1')).toBeInTheDocument();
    });

    it('should apply footer styling', () => {
      const { container } = render(
        <Table>
          <TableFooter>
            <TableRow>
              <TableCell>Footer</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      );

      const tfoot = container.querySelector('tfoot');
      expect(tfoot).toHaveClass('bg-muted/50');
    });
  });

  describe('Integration', () => {
    it('should work with pagination controls', () => {
      render(
        <div>
          <Table>
            <TableBody>
              <TableRow>
                <TableCell>Row 1</TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <div>
            <button>Previous</button>
            <span>Page 1 of 10</span>
            <button>Next</button>
          </div>
        </div>
      );

      expect(screen.getByRole('button', { name: 'Previous' })).toBeInTheDocument();
      expect(screen.getByText('Page 1 of 10')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument();
    });

    it('should work with filter controls', () => {
      render(
        <div>
          <input type="search" placeholder="Filter..." />
          <Table>
            <TableBody>
              <TableRow>
                <TableCell>Data</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      );

      expect(screen.getByPlaceholderText('Filter...')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle large number of rows', () => {
      const rows = Array.from({ length: 100 }, (_, i) => (
        <TableRow key={i}>
          <TableCell>Row {i}</TableCell>
        </TableRow>
      ));

      render(
        <Table>
          <TableBody>{rows}</TableBody>
        </Table>
      );

      expect(screen.getByText('Row 0')).toBeInTheDocument();
      expect(screen.getByText('Row 99')).toBeInTheDocument();
    });

    it('should handle large number of columns', () => {
      render(
        <Table>
          <TableHeader>
            <TableRow>
              {Array.from({ length: 20 }, (_, i) => (
                <TableHead key={i}>Col {i}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
        </Table>
      );

      expect(screen.getByText('Col 0')).toBeInTheDocument();
      expect(screen.getByText('Col 19')).toBeInTheDocument();
    });

    it('should forward ref to table', () => {
      const ref = { current: null } as React.RefObject<HTMLTableElement>;

      render(
        <Table ref={ref}>
          <TableBody>
            <TableRow>
              <TableCell>Data</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );

      expect(ref.current).toBeInstanceOf(HTMLTableElement);
    });

    it('should spread additional props', () => {
      render(
        <Table data-testid="custom-table" aria-label="Data table">
          <TableBody>
            <TableRow>
              <TableCell>Data</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );

      const table = screen.getByTestId('custom-table');
      expect(table).toHaveAttribute('aria-label', 'Data table');
    });
  });
});
