# Deploying

The app needs a public HTTPS address so Arcade Cloud can call it. You can host it without ngrok or another local tunnel. Build the root `Dockerfile`. It makes one image, running on Bun, that serves everything on one host: the pages, the hooks under `/hooks`, the loan API under `/bank` and the identity provider. The two toolkits are not in it, because they ship with `arcade deploy`. CI builds the image and boots it on every push.

- **The variables are the ones in `.env.example`.** Set `APP_PUBLIC_HOST` to the deployment's own host. The image runs in production mode, so nothing falls back to a development value: without `ARCADE_HOOK_SIGNING_SECRET`, `APPROVALS_STORE_TOKEN` and `BETTER_AUTH_SECRET` the app still starts, but the control plane and the identity provider refuse to, and `/health` names the refusal.
- **One persistent disk holds all three databases.** Point `GOVERNANCE_DB_PATH`, `LOANS_DB_PATH` and `IDP_DB_PATH` at files on it, for example under `/data`. Without it the databases are recreated with every new container.
- **A redeploy is not a reset.** The databases seed from their fixtures only when empty, and the disk survives a deploy, so every edit and every approval carries forward. `bun run reset` is the way back.
- **The disk holds the OAuth clients Arcade is registered against.** If `idp.db` is recreated, the clients change and the registration in Arcade goes stale.

## Registering a hosted app

The setup script creates sign-in clients in a local `idp.db` as well as writing `.env`. The hosted app must use those same clients; deploying with a new identity database will break sign-in.

1. Reserve your deployment's HTTPS hostname and set it as `APP_PUBLIC_HOST` in the checkout's `.env`.
2. Run `bun run setup-arcade <APP_PUBLIC_HOST>` from the checkout with the Arcade CLI configured. It generates configuration and deploys the toolkits before pausing for the app to become reachable.
3. At that pause, transfer the generated environment values to the deployment's secret configuration and copy the generated `idp.db` to its persistent disk. Set `IDP_DB_PATH` to that file and the other database paths to the same persistent disk. Do not bake secrets or databases into the image.
4. Start the container behind HTTPS at the configured hostname, setting `PORT` to your host's expected port. Return to setup and press Enter. It checks the public sign-in endpoint, registers the gateway, and enables the hooks. No tunnel is needed, even though the setup prompt suggests ngrok.
5. User-management commands must target the deployed identity and governance databases. Run them from a full source checkout on the host with the same environment and database paths. The runtime image does not include the management scripts.

This is an alternative deployment procedure, not an automated hosting integration. It has not been validated against a hosting provider in this review.
