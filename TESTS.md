# Tests

## Running Tests

```bash
npx vitest run                          # run all tests once
npx vitest run --reporter=verbose       # verbose output with each test name
npx vitest                              # watch mode (re-runs on file save)
npx vitest run __tests__/audit-engine.test.ts  # run a specific file
```

## Test Files

### `__tests__/audit-engine.test.ts`

7 tests covering the deterministic audit engine (`lib/audit-engine/`).

| # | Test name | What it covers |
|---|---|---|
| 1 | recommends downgrade from GitHub Copilot Business to Individual for small teams | Rule A: wrong plan for seat count; verifies savings math ($18/mo for 2 seats) |
| 2 | returns optimal for Claude Pro single seat writing use case | Rule E: no manufactured recommendations |
| 3 | recommends a coding-specific tool when ChatGPT Plus is used for coding | Rule C: better tool for use case (switch action) |
| 4 | flags redundancy when paying for both Anthropic API and Claude Pro | Double-pay detection: API spend >$50 + Claude Pro → downgrade |
| 5 | sets isHighSavings when total monthly savings exceed $500 | AuditResult.isHighSavings flag calculation |
| 6 | totalMonthlySavings equals sum of all recommendation savings | Math integrity: sum of recs = total |
| 7 | returns valid AuditResult with isOptimal true for empty tools array | Edge case: zero tools input |

### `__tests__/utils.test.ts`

3 tests covering `formatCurrency` in `lib/utils.ts`.

| # | Test name | What it covers |
|---|---|---|
| 1 | formats whole dollars | Integer amounts formatted without decimal places |
| 2 | formats cents | Decimal amounts formatted with 2 decimal places |
| 3 | formats zero | Zero value formatted as $0 |

## CI

All tests run automatically on every push to `main` via `.github/workflows/ci.yml`. The workflow also runs ESLint and TypeScript type checking. See that file for the full pipeline.
