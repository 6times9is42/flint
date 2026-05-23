export type ToolId =
  | 'cursor'
  | 'github-copilot'
  | 'claude'
  | 'chatgpt'
  | 'anthropic-api'
  | 'openai-api'
  | 'gemini'
  | 'windsurf';

export type UseCase = 'coding' | 'writing' | 'data' | 'research' | 'mixed';

export interface ToolInput {
  toolId: ToolId;
  planId: string;
  monthlySpend: number;
  seats: number;
}

export interface AuditInput {
  tools: ToolInput[];
  teamSize: number;
  useCase: UseCase;
}

export type RecommendationAction =
  | 'downgrade'
  | 'upgrade'
  | 'switch'
  | 'use-credits'
  | 'optimal'
  | 'review-usage';

export interface ToolRecommendation {
  toolId: ToolId;
  currentSpend: number;
  recommendedAction: RecommendationAction;
  recommendedPlanId: string | null;
  recommendedToolId: ToolId | null;
  projectedMonthlySpend: number;
  monthlySavings: number;
  reasoning: string;
}

export interface AuditResult {
  input: AuditInput;
  recommendations: ToolRecommendation[];
  totalCurrentSpend: number;
  totalProjectedSpend: number;
  totalMonthlySavings: number;
  totalAnnualSavings: number;
  isOptimal: boolean;
  isHighSavings: boolean;
  aiSummary: string | null;
  createdAt: string;
}

export interface StoredAudit {
  id: string;
  audit_result: AuditResult;
  public_slug: string;
  email: string | null;
  company_name: string | null;
  role: string | null;
  created_at: string;
}
