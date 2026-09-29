# Agent Action Governance with Arcade

Enforce tool permissions, require human approval, and filter sensitive data for a Mastra agent, using a sample loan workflow.

## Why we built this

Alice asks the assistant to approve a $95,000 loan. Her limit is $50,000, so Charlie must approve the request first. Loans illustrate the broader problem: agents need enforceable limits on their actions.

[Arcade](https://www.arcade.dev/) connects agents to tools and manages authorization. Mastra runs the assistant; Arcade invokes the app's checks to block unauthorized actions, hide unavailable tools, and filter sensitive results. The blocked loan request triggers a human approval request through Slack. These rules live outside the model's prompt.

## Prerequisites

- **[Anthropic API key](https://platform.claude.com/settings/keys)**: put your model key in `ANTHROPIC_API_KEY`.
- **[Arcade project](https://api.arcade.dev/dashboard/api-keys)**: put its key in `ARCADE_API_KEY`. [Set up the Arcade CLI](./docs/setup.md#prerequisites) for that project. Its installer uses [uv](https://docs.astral.sh/uv/), a Python package manager, to install the command-line tool.
- **[Public app address](./docs/deploying.md)**: set `APP_PUBLIC_HOST` to the app's HTTPS hostname, without `https://`. Arcade Cloud must reach the app. Use a hosted deployment or a local tunnel; ngrok is optional.
- **[Slack accounts](https://docs.arcade.dev/en/references/auth-providers/slack)**: two people in one workspace, using their Slack email addresses. With Arcade's built-in Slack app, invite the requesting officer to your Arcade project. [Account details](./docs/app-users-and-arcade-accounts.md).

In `.env.example`, **fill in the first block** (two keys and a hostname), **leave the generated block blank**, and **keep optional defaults**. Setup fills the app secrets and sign-in configuration.

## Quickstart 🚀

1. **Create the project**
   - Run `npx create-mastra@latest --template https://github.com/mastra-ai/template-arcade --no-install`.
   - Choose `loan-approval-limits` as the project name, then run `cd loan-approval-limits` and `bun install`.
2. **Add your API keys**
   - Run `cp .env.example .env`. Fill in only the first block, using the values from Prerequisites.
3. **Connect Arcade**
   - Run `bun run setup-arcade <APP_PUBLIC_HOST>`, replacing the placeholder with your domain.
   - When prompted, run `bun run dev` through a tunnel, or [deploy the app](./docs/deploying.md) at your public hostname. Return to setup and press Enter.
   - Wait for confirmation that the gateway and policy hooks are active. [Dashboard fallback](./docs/setup.md#quickstart-).
4. **Add yourself and an approver**
   - Run `bun run users add <your-email> --name Alice --role loan_officer --clearance 50000`.
   - Run `bun run users add <approver-email> --name Charlie --role vp_credit --clearance 250000`.
   - Save the printed passwords. Hosted apps need these commands run against their deployed databases.
5. **Open Studio**
   - Run `bun run studio`. Open [Authorize Studio](http://localhost:4111/arcade/authorize) and sign in as Alice (`STUDIO_PORT` defaults to 4111).
   - Open [Mastra Studio](http://localhost:4111), select **Loan Operations Assistant**, and send: “Approve loan LN-2291 for $95,000.”
   - Follow the authorization links and resend the prompt. The request should be blocked and escalated to Charlie. [Authorization help](./docs/setup.md#quickstart-).

## Try it out

- **Complete the approval:** Charlie opens the Slack link in a separate browser profile and approves. Resend the request in Studio; the single-use grant permits it.
- **Try self-approval:** before Charlie answers, open the approval link as Alice. The request stays pending because the requester cannot approve it.
- **Check redaction:** ask Alice's assistant to “Read LN-2291 and quote its bank account number and tax ID.” Those fields should appear as `[REDACTED]`.

## Customization

- Ask your coding agent: “Adapt this to equipment-lease approvals. Explore the code and propose a plan before making changes.”
- Change an officer's limit with `bun run users set-clearance <email> <amount>`, or follow the [domain-swap guide](./docs/DOMAIN-SWAP.md) to replace the loan data and tools.

## Further reading

- [Setup and walkthrough](./docs/setup.md): web chat, the audit panel, and additional users.
- [Configuration](./docs/configuration.md): environment settings and resetting the demo.
- [Architecture](./docs/architecture.md): tools, policies, and identity.
- [FAQ](./docs/faq.md) and [deployment](./docs/deploying.md): troubleshooting and hosting.

## About Mastra templates

This partnership template was contributed by Arcade to show how Mastra and Arcade enforce loan approval limits on tool calls. [Contribute on GitHub](https://github.com/mastra-ai/template-arcade).
