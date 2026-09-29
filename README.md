# Agent Action Governance with Arcade

Ask a Mastra assistant to approve a sample loan. Arcade checks the user's permissions, blocks requests above their limit, and lets the assistant request human approval through Slack. Sensitive fields are filtered before the model sees them.

## Why we built this

Alice can approve loans up to $50,000. When she asks the assistant to approve one for $95,000, it needs to get Charlie's approval first. We use a sample loan book so you can see what happens when an agent tries to do something its user isn't allowed to do.

[Arcade](https://www.arcade.dev/) connects agents to tools and handles authorization. In this example, the Mastra assistant calls the loan tools through Arcade, which asks the app's policy code whether each call is allowed. Alice's request is blocked, and the assistant sends Charlie an approval request in Slack. The same setup hides tools a user can't access and removes sensitive fields before the model sees the results. The policy code enforces these rules outside the prompt.

Mastra has built-in [tool approvals](https://mastra.ai/docs/agents/human-in-the-loop) and [processors](https://mastra.ai/docs/agents/processors) to check and filter data within your app. We use Arcade here to manage users' service authorization and keep permission checks in one place. If another agent uses the same Arcade gateway, it goes through the same checks, even if it's built with a different framework.

## Prerequisites

- **[Anthropic API key](https://platform.claude.com/settings/keys)**: `ANTHROPIC_API_KEY`, the credential for the assistant's model.
- **[Arcade project](https://api.arcade.dev/dashboard/api-keys)**: `ARCADE_API_KEY`, a key for the same project used by the [Arcade command-line tool](https://github.com/mastra-ai/template-arcade/blob/main/docs/setup.md#prerequisites). Its installer uses [uv](https://docs.astral.sh/uv/), a Python package manager.
- **[Public app address](https://github.com/mastra-ai/template-arcade/blob/main/docs/deploying.md)**: `APP_PUBLIC_HOST`, the app's public hostname without `https://`. Arcade Cloud needs access to the app through a hosted deployment or a local tunnel; ngrok is optional.
- **[Slack accounts](https://docs.arcade.dev/en/references/auth-providers/slack)**: two people in one workspace, using their Slack email addresses. Arcade's built-in Slack app requires you to invite the requesting officer to your Arcade project. [Account details](https://github.com/mastra-ai/template-arcade/blob/main/docs/app-users-and-arcade-accounts.md).

The first block of `.env.example` holds your two keys and public hostname. Setup fills the generated block with app secrets and sign-in configuration. The optional settings have defaults.

## Quickstart 🚀

1. **Create the project**
   - Run `npx create-mastra@latest --template https://github.com/mastra-ai/template-arcade --no-install`.
   - Choose `loan-approval-limits` as the project name, then run `cd loan-approval-limits` and `bun install`.
2. **Configure the app**
   - Run `cp .env.example .env`. Fill in the first block from Prerequisites; leave the generated block blank and keep the optional defaults.
3. **Connect Arcade**
   - Complete the [Arcade account and command-line setup](https://github.com/mastra-ai/template-arcade/blob/main/docs/setup.md#prerequisites).
   - Run `bun run setup-arcade <APP_PUBLIC_HOST>`, replacing the placeholder with your domain.
   - When prompted, run `bun run dev` through a tunnel, or [deploy the app](https://github.com/mastra-ai/template-arcade/blob/main/docs/deploying.md) at your public hostname. Return to setup and press Enter.
   - Wait for confirmation that the gateway and policy hooks are active. [Dashboard fallback](https://github.com/mastra-ai/template-arcade/blob/main/docs/setup.md#quickstart-).
4. **Add yourself and an approver**
   - Run `bun run users add <your-email> --name Alice --role loan_officer --clearance 50000`.
   - Run `bun run users add <approver-email> --name Charlie --role vp_credit --clearance 250000`.
   - Save the printed passwords. Hosted apps need these commands run against their deployed databases.
5. **Open Studio**
   - Run `bun run studio`. Open [Authorize Studio](http://localhost:4111/arcade/authorize) and sign in as Alice. These links assume the default `STUDIO_PORT` of 4111; adjust them if you changed it.
   - Open [Mastra Studio](http://localhost:4111), select **Loan Operations Assistant**, and send: “Approve loan LN-2291 for $95,000.”
   - Follow the authorization links and resend the prompt. The request should be blocked and escalated to Charlie. [Authorization help](https://github.com/mastra-ai/template-arcade/blob/main/docs/setup.md#quickstart-).

## Try it out

- **Complete the approval:** Charlie opens the Slack link in a separate browser profile and approves. Resend the request in Studio; the single-use grant permits it.
- **Try self-approval:** before Charlie answers, open the approval link as Alice. The request stays pending because the requester cannot approve it.
- **Check redaction:** ask Alice's assistant to “Read LN-2291 and quote its bank account number and tax ID.” Those fields should appear as `[REDACTED]`.

## Customization

- Ask your coding agent: “Adapt this to equipment-lease approvals. Explore the code and propose a plan before making changes.”
- Change an officer's limit with `bun run users set-clearance <email> <amount>`, or follow the [domain-swap guide](https://github.com/mastra-ai/template-arcade/blob/main/docs/DOMAIN-SWAP.md) to replace the loan data and tools.

## Further reading

- [Setup and walkthrough](https://github.com/mastra-ai/template-arcade/blob/main/docs/setup.md): web chat, the audit panel, and additional users.
- [Configuration](https://github.com/mastra-ai/template-arcade/blob/main/docs/configuration.md): environment settings and resetting the demo.
- [Architecture](https://github.com/mastra-ai/template-arcade/blob/main/docs/architecture.md): tools, policies, and identity.
- [FAQ](https://github.com/mastra-ai/template-arcade/blob/main/docs/faq.md) and [deployment](https://github.com/mastra-ai/template-arcade/blob/main/docs/deploying.md): troubleshooting and hosting.

## About Mastra templates

This partnership template was contributed by Arcade to show how Mastra and Arcade enforce loan approval limits on tool calls. [Contribute on GitHub](https://github.com/mastra-ai/template-arcade).
