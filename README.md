# Tool Authorization with Arcade

Ask a loan assistant to approve an application. Arcade checks the signed-in officer's authority, blocks requests above their limit, and routes them to an approver in Slack. After approval, the officer can retry using a single-use grant. A live panel records the decisions.

## Why we built this

An agent that writes to a business system needs limits outside its prompt. This example puts approval limits, tool access, and sensitive-data filtering in Arcade hooks, so the model cannot change those rules.

## Prerequisites

- **[Anthropic API key](https://platform.claude.com/settings/keys)**: set `ANTHROPIC_API_KEY` for the model.
- **[Arcade project and API key](https://api.arcade.dev/dashboard/api-keys)**: set `ARCADE_API_KEY`. The key and Arcade CLI must use the same project.
- **[Arcade CLI](https://docs.arcade.dev/en/references/arcade-cli)**: install with `uv tool install arcade-mcp`, run `arcade login`, then `arcade project set <project_id>`. Check with `arcade whoami`; for multiple organizations, select the organization before the project. [Account setup details](./docs/setup.md#prerequisites).
- **[ngrok domain](https://ngrok.com/docs/universal-gateway/domains/)**: set `APP_PUBLIC_HOST` to your fixed domain without a scheme, such as `my-app.ngrok.app`.
- **[Slack accounts](https://docs.arcade.dev/en/references/auth-providers/slack)**: two people in the same workspace, using their Slack email addresses below. With Arcade's built-in Slack app, invite the requesting officer to your Arcade project. [Account requirements](./docs/app-users-and-arcade-accounts.md).

Only fill in these three environment variables. The setup command generates the remaining required values.

## Quickstart 🚀

1. **Create the project**
   - Run `npx create-mastra@latest --template https://github.com/mastra-ai/template-arcade --no-install`.
   - Choose `loan-approval-limits` as the project name, then run `cd loan-approval-limits` and `bun install`.
2. **Add your API keys**
   - Run `cp .env.example .env` and fill in the values from Prerequisites.
3. **Connect Arcade**
   - Run `bun run setup-arcade <APP_PUBLIC_HOST>`, replacing the placeholder with your domain.
   - When prompted, start `bun run dev` in another terminal and run its printed ngrok command in a third. Return to setup and press Enter.
   - Wait for setup to confirm the gateway and hooks are active. If it prints dashboard forms instead, follow the [fallback steps](./docs/setup.md#quickstart-).
4. **Add yourself and an approver**
   - Run `bun run users add <your-email> --name Alice --role loan_officer --clearance 50000`.
   - Run `bun run users add <approver-email> --name Charlie --role vp_credit --clearance 250000`.
   - Save the passwords printed by these commands. No users are created automatically.
5. **Open Studio**
   - Run `bun run studio`. Open [Authorize Studio](http://localhost:4111/arcade/authorize) and sign in as Alice (`STUDIO_PORT` defaults to 4111).
   - Open [Mastra Studio](http://localhost:4111), select **Loan Operations Assistant**, and send: “Approve loan LN-2291 for $95,000.” Use your configured `STUDIO_PORT` if different.
   - Follow any tool authorization links and resend the prompt. Alice's $50,000 limit blocks the approval and triggers escalation to Charlie. If Studio directs you to the web app to authorize, open `https://<APP_PUBLIC_HOST>` as Alice.

## Try it out

- **Complete the approval:** Charlie opens the Slack link in a separate browser profile and approves. Resend the request in Studio; the single-use grant permits it.
- **Try self-approval:** before Charlie answers, open the approval link as Alice. The request stays pending because the requester cannot approve it.
- **Check redaction:** ask Alice's assistant to “Read LN-2291 and quote its bank account number and tax ID.” Those fields should appear as `[REDACTED]`.
- **Watch the audit trail:** open `https://<APP_PUBLIC_HOST>/panel` to see tool-access decisions, approval checks, and output filtering.

## Customization

- Ask your coding agent: “Adapt this to equipment-lease approvals. Explore the code and propose a plan before making changes.”
- Change an officer's limit with `bun run users set-clearance <email> <amount>`, or follow the [domain-swap guide](./docs/DOMAIN-SWAP.md) to replace the loan data and tools.

## Further reading

- [Setup and walkthrough](./docs/setup.md): account setup, dashboard fallbacks, web chat, and additional demo users.
- [Configuration](./docs/configuration.md): environment settings and resetting the demo.
- [Architecture](./docs/architecture.md), [control plane](./docs/control-plane.md), and [Studio memory](./docs/studio-memory.md): how the implementation works.
- [FAQ](./docs/faq.md) and [deployment](./docs/deploying.md): troubleshooting and hosting.

## About Mastra templates

This partnership template was contributed by Arcade to show how Mastra and Arcade enforce loan approval limits on tool calls. [Contribute on GitHub](https://github.com/mastra-ai/template-arcade).
