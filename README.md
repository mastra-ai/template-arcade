# Agent Action Governance with Arcade

Ask a Mastra assistant to approve a sample loan. Arcade checks the user's permissions, blocks requests above their limit, and lets the assistant request human approval through Slack. Sensitive fields are filtered before the model sees them.

## Why we built this

Alice can approve loans up to $50,000. When she asks the assistant to approve one for $95,000, it needs to get Charlie's approval first. We use a sample loan book so you can see what happens when an agent tries to do something its user isn't allowed to do.

[Arcade](https://www.arcade.dev/) connects agents to tools and handles authorization. In this example, the Mastra assistant calls the loan tools through Arcade, which asks the app's policy code whether each call is allowed. Alice's request is blocked, and the assistant sends Charlie an approval request in Slack. The same setup hides tools a user can't access and removes sensitive fields before the model sees the results. The policy code enforces these rules outside the prompt.

Mastra has built-in [tool approvals](https://mastra.ai/docs/agents/human-in-the-loop) and [processors](https://mastra.ai/docs/agents/processors) to check and filter data within your app. We use Arcade here to manage users' service authorization and keep permission checks in one place. If another agent uses the same Arcade gateway, it goes through the same checks, even if it's built with a different framework.

## Prerequisites

- **[Bun](https://bun.sh/docs/installation)**: runs the app and installs its dependencies.
- **[uv](https://docs.astral.sh/uv/)**: a Python package manager used to install the Arcade CLI, which deploys this example's Python tools.
- **[Anthropic API key](https://platform.claude.com/settings/keys)**: gives the assistant access to Claude.
- **[Arcade project, API key, and CLI](https://docs.arcade.dev/en/references/arcade-cli)**: connect the assistant to its tools and authorization checks. The key and CLI must use the same Arcade project; Quickstart walks through this.
- **[ngrok](https://ngrok.com/docs/universal-gateway/domains/) or a [hosted app](https://github.com/mastra-ai/template-arcade/blob/main/docs/deploying.md)**: provides a public HTTPS address so Arcade can reach the app's sign-in endpoints and policy checks. Another tunnel works too.
- **[Slack workspace](https://docs.arcade.dev/en/references/auth-providers/slack) with two people**: one requests approval and the other approves. You'll need their Slack email addresses. With Arcade's built-in Slack app, the requester also needs membership in your Arcade project.

See the [configuration docs](https://github.com/mastra-ai/template-arcade/blob/main/docs/configuration.md) for advanced options.

## Quickstart 🚀

1. **Create the project**
   - Install [Bun](https://bun.sh/docs/installation) if needed. This app uses Bun's SQLite support and workspaces.
   - Run `npx create-mastra@latest --template https://github.com/mastra-ai/template-arcade --no-install`.
   - Choose `loan-approval-limits` as the project name, then run `cd loan-approval-limits` and `bun install`. Keep `--no-install`: the default npm install cannot resolve this project's workspace dependencies.

2. **Prepare the Arcade CLI**
   - Install [uv](https://docs.astral.sh/uv/getting-started/installation/), then run `uv tool install arcade-mcp`. The Arcade CLI deploys this example's Python toolkits.
   - Run `arcade login`. Create a project in the Arcade dashboard and an API key in that project.
   - Run `arcade project list`, then `arcade project set <project_id>`. If you have multiple organizations, run `arcade org set <org_id>` first, because switching organizations resets the active project.
   - Run `arcade whoami` to confirm the CLI uses the same project as your API key.

3. **Configure the app**
   - Run `cp .env.example .env`. In the first block, set `ANTHROPIC_API_KEY` to your Anthropic key and `ARCADE_API_KEY` to the key from your Arcade project.
   - Set `APP_PUBLIC_HOST` to your public hostname without `https://`. For ngrok, use your assigned domain. Arcade Cloud needs this address to reach the app through your tunnel or hosted deployment.
   - Leave the generated block blank and keep the optional defaults. Setup writes the app secrets and sign-in configuration for you.

4. **Register the app with Arcade**
   - Run `bun run setup-arcade <APP_PUBLIC_HOST>`, replacing the placeholder with your public hostname. Start setup before starting the app: it prepares the sign-in configuration first.
   - Setup checks the Arcade project, generates the app configuration, registers authorization and policy hooks, and deploys the Loan and Approvals tools. Keep this terminal open when it asks you to start the app.
   - To preview these actions first, add `--dry-run`. This prints the planned requests with secrets masked, without writing configuration or deploying tools.

5. **Start the app and finish setup**
   - In another terminal, run `bun run dev`. The app listens on `PORT`, which defaults to 3000.
   - Make the app reachable over HTTPS at your public hostname. For local development, start your tunnel in a third terminal, pointing it at the app's port. Ngrok is optional; if you use it, the dev server prints the matching command. A [hosted deployment](https://github.com/mastra-ai/template-arcade/blob/main/docs/deploying.md) can supply the public address instead.
   - Return to the setup terminal and press Enter. Setup checks that Arcade can reach the app, creates the User Source and gateway, then enables the policy hooks. Wait for confirmation that the hooks are active before trying the demo.
   - If setup prints dashboard forms, create the User Source first, then the gateway using that source, then rerun `bun run setup-arcade <APP_PUBLIC_HOST>` to enable the hooks. Follow the printed values and the [dashboard fallback instructions](https://github.com/mastra-ai/template-arcade/blob/main/docs/setup.md#quickstart-).

6. **Add yourself and an approver**
   - With Arcade's built-in Slack app, invite the requesting officer to your Arcade project. See [account details](https://github.com/mastra-ai/template-arcade/blob/main/docs/app-users-and-arcade-accounts.md) for the custom Slack app alternative.
   - Use your real Slack email addresses in both commands. “Alice” and “Charlie” are display names for the walkthrough.
   - Run `bun run users add <your-email> --name Alice --role loan_officer --clearance 50000`.
   - Run `bun run users add <approver-email> --name Charlie --role vp_credit --clearance 250000`.
   - Each command prints a password once. Save it: each person signs into the app with their email and this password. No users or passwords ship with the template, and adding users needs no restart.
   - Run `bun run users list` to check their roles and limits. For a hosted app, run these commands against its deployed databases; see the [deployment guide](https://github.com/mastra-ai/template-arcade/blob/main/docs/deploying.md).

7. **Open Studio**
   - Run `bun run studio` in another terminal. Open [Authorize Studio](http://localhost:4111/arcade/authorize) and sign in as Alice using her email and generated password. These links assume the default `STUDIO_PORT` of 4111.
   - Open [Mastra Studio](http://localhost:4111), select **loan-operations**, and send: “Approve loan LN-2291 for $95,000.”
   - The first loan tool call may return an authorization link. Open it, sign in as the same Alice, grant access, and resend the prompt. This tool authorization is separate from authorizing Studio.
   - If Studio has no authorization link, open `https://<APP_PUBLIC_HOST>`, sign in as Alice, and choose **Authorize the gateway**. Ask the web chat to read LN-2291, follow its tool authorization card, and select **Continue**. Then retry in Studio.
   - Alice's $50,000 limit should block the approval and leave the loan pending. Follow any Slack authorization link as Alice, then resend the prompt. Charlie should receive an approval request by Slack DM from Alice's account, and the agent should stop to wait for his decision.

## Try it out

- Open the Slack approval link in a separate browser profile and sign in as Charlie with his email and generated password. Approve the request, then resend it in Studio. The single-use grant lets Alice's approval go through. If you're using the web chat, it resumes automatically.

- Before Charlie answers, open the approval link as Alice and try to approve your own request. It stays pending because the requester cannot also be the approver.

- Ask Alice's assistant: “Read LN-2291 and quote its bank account number and tax ID.” Those fields should appear as `[REDACTED]` because they are filtered before the model sees them.

- Open `https://<APP_PUBLIC_HOST>/panel` alongside the chat to watch the policy checks. The Access, Pre, and Post lanes show tool visibility, permission checks, and result filtering.

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
