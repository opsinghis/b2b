/**
 * React Query Error Handling Tests
 *
 * @package portal
 * @module dashboard
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider, useQuery, useMutation } from '@tanstack/react-query';
import * as React from 'react';

describe('React Query Error Handling', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
        mutations: {
          retry: false,
        },
      },
    });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe('Query Error Handling', () => {
    it('should set isError to true when query fails', async () => {
      const { result } = renderHook(
        () =>
          useQuery({
            queryKey: ['test'],
            queryFn: async () => {
              throw new Error('Failed to fetch');
            },
          }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });

    it('should provide error object when query fails', async () => {
      const errorMessage = 'Failed to fetch data';

      const { result } = renderHook(
        () =>
          useQuery({
            queryKey: ['test'],
            queryFn: async () => {
              throw new Error(errorMessage);
            },
          }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.error).toBeInstanceOf(Error);
        expect(result.current.error?.message).toBe(errorMessage);
      });
    });

    it('should set isLoading to false after error', async () => {
      const { result } = renderHook(
        () =>
          useQuery({
            queryKey: ['test'],
            queryFn: async () => {
              throw new Error('Failed');
            },
          }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.isError).toBe(true);
      });
    });

    it('should set data to undefined when query fails', async () => {
      const { result } = renderHook(
        () =>
          useQuery({
            queryKey: ['test'],
            queryFn: async () => {
              throw new Error('Failed');
            },
          }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.data).toBeUndefined();
        expect(result.current.isError).toBe(true);
      });
    });

    it('should allow refetch after error', async () => {
      let attempt = 0;

      const { result } = renderHook(
        () =>
          useQuery({
            queryKey: ['test'],
            queryFn: async () => {
              attempt++;
              if (attempt === 1) {
                throw new Error('First attempt failed');
              }
              return { success: true };
            },
          }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      // Refetch
      result.current.refetch();

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
        expect(result.current.data).toEqual({ success: true });
      });
    });

    it('should handle network errors', async () => {
      const { result } = renderHook(
        () =>
          useQuery({
            queryKey: ['test'],
            queryFn: async () => {
              const error = new Error('Network error');
              error.name = 'NetworkError';
              throw error;
            },
          }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
        expect(result.current.error?.name).toBe('NetworkError');
      });
    });

    it('should handle API response errors', async () => {
      const { result } = renderHook(
        () =>
          useQuery({
            queryKey: ['test'],
            queryFn: async () => {
              const response = { error: true, message: 'API Error' };
              if (response.error) {
                throw new Error(response.message);
              }
              return response;
            },
          }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
        expect(result.current.error?.message).toBe('API Error');
      });
    });

    it('should not execute query when enabled is false', () => {
      const queryFn = vi.fn().mockRejectedValue(new Error('Should not run'));

      const { result } = renderHook(
        () =>
          useQuery({
            queryKey: ['test'],
            queryFn,
            enabled: false,
          }),
        { wrapper }
      );

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isError).toBe(false);
      expect(queryFn).not.toHaveBeenCalled();
    });

    it('should handle conditional query execution', () => {
      const queryFn = vi.fn().mockResolvedValue({ data: 'test' });

      const { result } = renderHook(
        () =>
          useQuery({
            queryKey: ['test', 'id-123'],
            queryFn,
            enabled: !!('id-123'),
          }),
        { wrapper }
      );

      expect(queryFn).toHaveBeenCalled();
    });
  });

  describe('Mutation Error Handling', () => {
    it('should set isError to true when mutation fails', async () => {
      const { result } = renderHook(
        () =>
          useMutation({
            mutationFn: async () => {
              throw new Error('Mutation failed');
            },
          }),
        { wrapper }
      );

      result.current.mutate();

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });

    it('should provide error object when mutation fails', async () => {
      const errorMessage = 'Failed to create resource';

      const { result } = renderHook(
        () =>
          useMutation({
            mutationFn: async () => {
              throw new Error(errorMessage);
            },
          }),
        { wrapper }
      );

      result.current.mutate();

      await waitFor(() => {
        expect(result.current.error).toBeInstanceOf(Error);
        expect(result.current.error?.message).toBe(errorMessage);
      });
    });

    it('should set isPending to false after error', async () => {
      const { result } = renderHook(
        () =>
          useMutation({
            mutationFn: async () => {
              throw new Error('Failed');
            },
          }),
        { wrapper }
      );

      result.current.mutate();

      await waitFor(() => {
        expect(result.current.isPending).toBe(false);
        expect(result.current.isError).toBe(true);
      });
    });

    it('should allow retry after mutation error', async () => {
      let attempt = 0;

      const { result } = renderHook(
        () =>
          useMutation({
            mutationFn: async () => {
              attempt++;
              if (attempt === 1) {
                throw new Error('First attempt failed');
              }
              return { success: true };
            },
          }),
        { wrapper }
      );

      // First attempt
      result.current.mutate();

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      // Retry
      result.current.mutate();

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
        expect(result.current.data).toEqual({ success: true });
      });
    });

    it('should handle mutation with try/catch pattern', async () => {
      const { result } = renderHook(
        () =>
          useMutation({
            mutationFn: async (data: { value: string }) => {
              if (!data.value) {
                throw new Error('Value is required');
              }
              return { success: true };
            },
          }),
        { wrapper }
      );

      let caughtError: Error | null = null;

      try {
        await result.current.mutateAsync({ value: '' });
      } catch (error) {
        caughtError = error as Error;
      }

      expect(caughtError).toBeInstanceOf(Error);
      expect(caughtError?.message).toBe('Value is required');
    });

    it('should invalidate queries on success', async () => {
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(
        () =>
          useMutation({
            mutationFn: async () => ({ success: true }),
            onSuccess: () => {
              queryClient.invalidateQueries({ queryKey: ['test'] });
            },
          }),
        { wrapper }
      );

      result.current.mutate();

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['test'] });
    });

    it('should not invalidate queries on error', async () => {
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(
        () =>
          useMutation({
            mutationFn: async () => {
              throw new Error('Failed');
            },
            onSuccess: () => {
              queryClient.invalidateQueries({ queryKey: ['test'] });
            },
          }),
        { wrapper }
      );

      result.current.mutate();

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(invalidateSpy).not.toHaveBeenCalled();
    });
  });

  describe('Error Recovery Patterns', () => {
    it('should clear error on successful refetch', async () => {
      let shouldFail = true;

      const { result } = renderHook(
        () =>
          useQuery({
            queryKey: ['test'],
            queryFn: async () => {
              if (shouldFail) {
                throw new Error('Failed');
              }
              return { success: true };
            },
          }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      shouldFail = false;
      result.current.refetch();

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
        expect(result.current.isError).toBe(false);
        expect(result.current.error).toBeNull();
      });
    });

    it('should reset mutation state', async () => {
      const { result } = renderHook(
        () =>
          useMutation({
            mutationFn: async () => {
              throw new Error('Failed');
            },
          }),
        { wrapper }
      );

      result.current.mutate();

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      result.current.reset();

      // Wait for reset to complete
      await waitFor(() => {
        expect(result.current.isIdle).toBe(true);
      });

      expect(result.current.isError).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('Loading and Error States Combination', () => {
    it('should transition from loading to error', async () => {
      const { result } = renderHook(
        () =>
          useQuery({
            queryKey: ['test'],
            queryFn: async () => {
              await new Promise((resolve) => setTimeout(resolve, 100));
              throw new Error('Failed after loading');
            },
          }),
        { wrapper }
      );

      // Initially loading
      expect(result.current.isLoading).toBe(true);
      expect(result.current.isError).toBe(false);

      // After error
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.isError).toBe(true);
      });
    });

    it('should handle isLoading and isError states independently', async () => {
      const { result } = renderHook(
        () =>
          useQuery({
            queryKey: ['test'],
            queryFn: async () => {
              throw new Error('Failed');
            },
          }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      // Should not be loading when in error state
      expect(result.current.isLoading).toBe(false);
    });

    it('should transition states during refetch', async () => {
      let attempt = 0;

      const { result } = renderHook(
        () =>
          useQuery({
            queryKey: ['test'],
            queryFn: async () => {
              attempt++;
              await new Promise((resolve) => setTimeout(resolve, 50));
              if (attempt === 1) {
                throw new Error('Failed');
              }
              return { success: true };
            },
          }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      result.current.refetch();

      // Should eventually succeed after refetch
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
        expect(result.current.data).toEqual({ success: true });
      });
    });
  });

  describe('Error Message Patterns', () => {
    it('should preserve API error messages', async () => {
      const apiErrorMessage = 'Invalid credentials';

      const { result } = renderHook(
        () =>
          useQuery({
            queryKey: ['test'],
            queryFn: async () => {
              throw new Error(apiErrorMessage);
            },
          }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.error?.message).toBe(apiErrorMessage);
      });
    });

    it('should handle generic error messages', async () => {
      const { result } = renderHook(
        () =>
          useQuery({
            queryKey: ['test'],
            queryFn: async () => {
              throw new Error('Failed to fetch tenants');
            },
          }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.error?.message).toContain('Failed to fetch');
      });
    });
  });
});
