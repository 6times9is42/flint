import type { ToolId, UseCase } from './types';

export interface Plan {
  id: string;
  name: string;
  monthlyPricePerSeat: number; // USD. For flat-rate plans: price / 1 seat
  isFlat: boolean; // true = not per-seat (e.g. Claude Pro = $20 flat per user)
  minSeats?: number;
  maxSeats?: number; // undefined = unlimited
  notes?: string;
}

export interface ToolPricing {
  toolId: ToolId;
  displayName: string;
  category: 'coding-assistant' | 'general-llm' | 'api';
  primaryUseCases: UseCase[];
  plans: Plan[];
  officialPricingUrl: string;
}

// All prices verified from PRICING_DATA.md — sourced 2026-05-23
export const PRICING: Record<ToolId, ToolPricing> = {
  cursor: {
    toolId: 'cursor',
    displayName: 'Cursor',
    category: 'coding-assistant',
    primaryUseCases: ['coding'],
    officialPricingUrl: 'https://cursor.com/pricing',
    plans: [
      {
        id: 'hobby',
        name: 'Hobby',
        monthlyPricePerSeat: 0,
        isFlat: false,
        notes: 'Limited completions and chat requests',
      },
      {
        id: 'individual',
        name: 'Individual',
        monthlyPricePerSeat: 20,
        isFlat: false,
        notes: 'Formerly "Pro"; full AI features',
      },
      {
        id: 'teams',
        name: 'Teams',
        monthlyPricePerSeat: 40,
        isFlat: false,
        notes: 'Centralized billing, admin controls, audit logs',
      },
      {
        id: 'enterprise',
        name: 'Enterprise',
        monthlyPricePerSeat: 0,
        isFlat: false,
        notes: 'Custom pricing; contact sales',
      },
    ],
  },

  'github-copilot': {
    toolId: 'github-copilot',
    displayName: 'GitHub Copilot',
    category: 'coding-assistant',
    primaryUseCases: ['coding'],
    officialPricingUrl: 'https://github.com/features/copilot',
    plans: [
      {
        id: 'free',
        name: 'Free',
        monthlyPricePerSeat: 0,
        isFlat: false,
        notes: '50 monthly premium requests, 2,000 completions/mo',
      },
      {
        id: 'individual',
        name: 'Pro',
        monthlyPricePerSeat: 10,
        isFlat: false,
        notes: '300 monthly premium requests',
      },
      {
        id: 'pro-plus',
        name: 'Pro+',
        monthlyPricePerSeat: 39,
        isFlat: false,
        notes: '1,500 monthly premium requests; access to all models',
      },
      {
        id: 'business',
        name: 'Business',
        monthlyPricePerSeat: 19,
        isFlat: false,
        notes: 'For organizations; includes policy management, audit logs',
      },
      {
        id: 'enterprise',
        name: 'Enterprise',
        monthlyPricePerSeat: 39,
        isFlat: false,
        notes: 'Requires GitHub Enterprise Cloud; enterprise-grade controls',
      },
    ],
  },

  claude: {
    toolId: 'claude',
    displayName: 'Claude (claude.ai)',
    category: 'general-llm',
    primaryUseCases: ['writing', 'research', 'mixed', 'coding'],
    officialPricingUrl: 'https://claude.ai/pricing',
    plans: [
      {
        id: 'free',
        name: 'Free',
        monthlyPricePerSeat: 0,
        isFlat: true,
        notes: 'Basic usage limits',
      },
      {
        id: 'pro',
        name: 'Pro',
        monthlyPricePerSeat: 20,
        isFlat: true,
        notes: 'Per user, flat rate; increased usage limits',
      },
      {
        id: 'max',
        name: 'Max',
        monthlyPricePerSeat: 100,
        isFlat: true,
        notes: '5× Pro usage limits; for heavy users',
      },
      {
        id: 'team',
        name: 'Team',
        monthlyPricePerSeat: 25,
        isFlat: false,
        minSeats: 5,
        maxSeats: 150,
        notes: 'Admin controls, SSO, billing management',
      },
      {
        id: 'team-premium',
        name: 'Team (Premium)',
        monthlyPricePerSeat: 125,
        isFlat: false,
        minSeats: 5,
        notes: 'Team admin features + Max-level usage per seat',
      },
      {
        id: 'enterprise',
        name: 'Enterprise',
        monthlyPricePerSeat: 0,
        isFlat: false,
        notes: 'Custom pricing; hybrid per-seat + usage',
      },
    ],
  },

  'anthropic-api': {
    toolId: 'anthropic-api',
    displayName: 'Anthropic API',
    category: 'api',
    primaryUseCases: ['coding', 'writing', 'data', 'research', 'mixed'],
    officialPricingUrl: 'https://anthropic.com/pricing',
    plans: [
      {
        id: 'api',
        name: 'API (usage-based)',
        monthlyPricePerSeat: 0,
        isFlat: true,
        notes: 'Pay-per-token; enter your average monthly bill',
      },
    ],
  },

  chatgpt: {
    toolId: 'chatgpt',
    displayName: 'ChatGPT',
    category: 'general-llm',
    primaryUseCases: ['writing', 'research', 'mixed'],
    officialPricingUrl: 'https://openai.com/chatgpt/pricing',
    plans: [
      {
        id: 'free',
        name: 'Free',
        monthlyPricePerSeat: 0,
        isFlat: true,
        notes: 'Limited GPT-4o access',
      },
      {
        id: 'go',
        name: 'Go',
        monthlyPricePerSeat: 8,
        isFlat: true,
        notes: 'Lightweight paid tier',
      },
      {
        id: 'plus',
        name: 'Plus',
        monthlyPricePerSeat: 20,
        isFlat: true,
        notes: 'Full GPT-4o + other models; most popular paid tier',
      },
      {
        id: 'pro',
        name: 'Pro ($100)',
        monthlyPricePerSeat: 100,
        isFlat: true,
        notes: 'Between Plus and Pro $200',
      },
      {
        id: 'pro-power',
        name: 'Pro ($200)',
        monthlyPricePerSeat: 200,
        isFlat: true,
        notes: 'Maximum usage limits; o1 Pro mode',
      },
      {
        id: 'business',
        name: 'Business',
        monthlyPricePerSeat: 25,
        isFlat: false,
        minSeats: 2,
        notes: 'Formerly "Team"; admin console, no training on data',
      },
      {
        id: 'enterprise',
        name: 'Enterprise',
        monthlyPricePerSeat: 0,
        isFlat: false,
        notes: 'Custom pricing; annual commitment',
      },
    ],
  },

  'openai-api': {
    toolId: 'openai-api',
    displayName: 'OpenAI API',
    category: 'api',
    primaryUseCases: ['coding', 'writing', 'data', 'research', 'mixed'],
    officialPricingUrl: 'https://openai.com/api/pricing',
    plans: [
      {
        id: 'api',
        name: 'API (usage-based)',
        monthlyPricePerSeat: 0,
        isFlat: true,
        notes: 'Pay-per-token; enter your average monthly bill',
      },
    ],
  },

  gemini: {
    toolId: 'gemini',
    displayName: 'Gemini',
    category: 'general-llm',
    primaryUseCases: ['writing', 'research', 'mixed'],
    officialPricingUrl: 'https://one.google.com/about/plans',
    plans: [
      {
        id: 'free',
        name: 'Free',
        monthlyPricePerSeat: 0,
        isFlat: true,
        notes: '15 GB storage; basic Gemini access',
      },
      {
        id: 'ai-plus',
        name: 'Google AI Plus',
        monthlyPricePerSeat: 9.99,
        isFlat: true,
        notes: '200 GB storage; 2× higher Gemini usage limits',
      },
      {
        id: 'ai-pro',
        name: 'Google AI Pro (Gemini Advanced)',
        monthlyPricePerSeat: 19.99,
        isFlat: true,
        notes: '5 TB storage; formerly "Google One AI Premium"',
      },
      {
        id: 'ai-ultra',
        name: 'Google AI Ultra',
        monthlyPricePerSeat: 100,
        isFlat: true,
        notes: '20 TB+ storage; up to 20× more limits vs Pro',
      },
    ],
  },

  windsurf: {
    toolId: 'windsurf',
    displayName: 'Windsurf',
    category: 'coding-assistant',
    primaryUseCases: ['coding'],
    officialPricingUrl: 'https://windsurf.com/pricing',
    plans: [
      {
        id: 'free',
        name: 'Free',
        monthlyPricePerSeat: 0,
        isFlat: false,
        notes: 'Limited daily/weekly usage quota',
      },
      {
        id: 'pro',
        name: 'Pro',
        monthlyPricePerSeat: 20,
        isFlat: false,
        notes: 'Full premium model access; daily & weekly quota refreshes',
      },
      {
        id: 'max',
        name: 'Max',
        monthlyPricePerSeat: 200,
        isFlat: false,
        notes: 'Heavy usage at API pricing',
      },
      {
        id: 'teams',
        name: 'Teams',
        monthlyPricePerSeat: 40,
        isFlat: false,
        notes: 'Centralized billing, admin dashboard, SSO, RBAC',
      },
      {
        id: 'enterprise',
        name: 'Enterprise',
        monthlyPricePerSeat: 0,
        isFlat: false,
        notes: 'Custom pricing; volume discounts',
      },
    ],
  },
};

/**
 * Look up a specific plan for a tool.
 * Returns undefined if the toolId or planId is not found.
 */
export function getPlan(toolId: ToolId, planId: string): Plan | undefined {
  return PRICING[toolId]?.plans.find(p => p.id === planId);
}
