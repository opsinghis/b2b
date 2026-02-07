import createClient from "openapi-fetch";

// Base API configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

// Create typed API client
// When the OpenAPI spec is generated, import types from ./generated/api
export const apiClient = createClient({
  baseUrl: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Re-export for convenience
export { createClient };

// Export API configuration
export const apiConfig = {
  baseUrl: API_BASE_URL,
};
