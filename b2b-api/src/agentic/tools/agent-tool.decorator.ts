import { SetMetadata } from '@nestjs/common';

export const AGENT_TOOL_KEY = 'agent_tool';

export interface AgentToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  required?: boolean;
  enum?: string[];
  default?: unknown;
}

export interface AgentToolMetadata {
  name: string;
  description: string;
  category: string;
  parameters: AgentToolParameter[];
  permissions?: string[];
  examples?: { input: Record<string, unknown>; output: string }[];
}

export const AgentTool = (metadata: AgentToolMetadata): MethodDecorator =>
  SetMetadata(AGENT_TOOL_KEY, metadata);

export interface RegisteredTool extends AgentToolMetadata {
  handler: string;
  controller: string;
  method: string;
  path: string;
}
