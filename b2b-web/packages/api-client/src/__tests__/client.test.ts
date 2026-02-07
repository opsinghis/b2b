import { describe, it, expect } from "vitest";
import {
  createApiClient,
  apiClient,
  apiConfig,
  type paths,
  type components,
  type LoginDto,
  type UserResponseDto,
  type TenantResponseDto,
} from "../index";

describe("@b2b/api-client", () => {
  describe("createApiClient", () => {
    it("should create a client with default config", () => {
      const client = createApiClient();
      expect(client).toBeDefined();
      expect(typeof client.GET).toBe("function");
      expect(typeof client.POST).toBe("function");
      expect(typeof client.PUT).toBe("function");
      expect(typeof client.PATCH).toBe("function");
      expect(typeof client.DELETE).toBe("function");
    });

    it("should create a client with custom options", () => {
      const client = createApiClient({
        baseUrl: "https://api.example.com",
        tenantId: "acme",
        token: "test-token",
      });
      expect(client).toBeDefined();
    });

    it("should create a client with custom headers", () => {
      const client = createApiClient({
        headers: {
          "X-Custom-Header": "custom-value",
        },
      });
      expect(client).toBeDefined();
    });
  });

  describe("apiClient", () => {
    it("should export a default client instance", () => {
      expect(apiClient).toBeDefined();
      expect(typeof apiClient.GET).toBe("function");
      expect(typeof apiClient.POST).toBe("function");
    });
  });

  describe("apiConfig", () => {
    it("should export API configuration", () => {
      expect(apiConfig).toBeDefined();
      expect(apiConfig.baseUrl).toBe("http://localhost:3000");
    });
  });

  describe("type exports", () => {
    it("should export path types", () => {
      // Type-level test - if this compiles, the types are exported
      const pathCheck: keyof paths = "/api/v1/health";
      expect(pathCheck).toBe("/api/v1/health");
    });

    it("should export schema types", () => {
      // Type-level tests - these verify the types exist and compile
      const loginDto: LoginDto = {
        email: "test@example.com",
        password: "password",
      };
      expect(loginDto.email).toBe("test@example.com");

      // UserResponseDto should have expected shape
      const userShape: Partial<UserResponseDto> = {
        id: "123",
        email: "user@example.com",
      };
      expect(userShape.id).toBe("123");

      // TenantResponseDto should have expected shape
      const tenantShape: Partial<TenantResponseDto> = {
        id: "tenant-123",
        name: "Test Tenant",
        slug: "test-tenant",
      };
      expect(tenantShape.slug).toBe("test-tenant");
    });
  });

  describe("generated types", () => {
    it("should have components schemas available", () => {
      // Verify schemas type exists and has expected structure
      type Schema = components["schemas"];
      type CreateUserDto = Schema["CreateUserDto"];

      const createUser: CreateUserDto = {
        email: "new@example.com",
        password: "password123",
        firstName: "John",
        lastName: "Doe",
        role: "USER",
      };
      expect(createUser.email).toBe("new@example.com");
    });
  });
});
