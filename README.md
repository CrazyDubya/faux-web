# faux-web

A fictional agentic web ecosystem: a bank, a shop, and simulated customers that
connect to each other. Every component uses obviously-fake identifiers
(`XX-XXXX-XXXXXXXX-XX` account IDs) so nothing can be confused with real money.

## Components

| Directory | Origin | What it is |
|---|---|---|
| `faux-bank/` | `CrazyDubya/fauxBank` | Full-service simulated bank — double-entry ledger, agent-based access control, KYC/disputes/compliance simulation. The economic backbone the other two plug into. |
| `faux-shop/` | `CrazyDubya/fauxShop` | "Nano Banana Print Shop" — an AI-powered custom print shop where Claude is the autonomous decision-making core, designed to resist social engineering and prompt injection. Connects to fauxBank for payments. |
| `faux-customer/` | `CrazyDubya/fauxCustomer` | "SimulaCust" — behavioral simulation agents (delightful customers, confused novices, frustrated escalators, bad actors) that stress-test agentic commerce systems and FauxBank before real-world deployment. |

## How they connect

```
faux-customer (SimulaCust agents)
      │  shops, chats, attempts manipulation
      ▼
faux-shop (Nano Banana Print Shop)
      │  charges via API
      ▼
faux-bank (FauxBank ledger)
```

Each component keeps its own `package.json`, docs, and tests; there is no
unified build. See `docs/PROVENANCE.md` for source repositories and commit SHAs.

## Consolidated

2026-09-13: the three standalone repositories (`fauxBank`, `fauxShop`,
`fauxCustomer`) were merged here as subdirectories and the sources archived.
Their full git histories remain intact in the archived repositories. Nothing
was deleted.
