# nestjs-varlock-starter

Minimal NestJS starter — Varlock replaces .env with 1Password vault-backed secrets and schema validation.

## Why

- **AI tools read .env files** — Cursor, Copilot, and any tool with file system access can leak your secrets silently.
- **No validation until runtime crash** — a missing or malformed variable only blows up in production, not at startup.
- **Rotation requires SSH** — updating a secret means SSHing into every server and editing files by hand. Varlock pulls from 1Password on boot, so rotation is a vault update.

## Setup (5 steps)

1. Install 1Password CLI:
   ```bash
   brew install --cask 1password-cli
   ```

2. Clone the repo and install dependencies:
   ```bash
   git clone <repo-url>
   cd nestjs-varlock-starter
   npm install
   ```

3. Sign in to 1Password:
   ```bash
   op signin
   ```

4. Copy the example schema and update the vault paths to match your 1Password setup:
   ```bash
   cp .env.schema.example .env.schema
   # edit .env.schema — replace YourVaultName and item names with real paths
   ```

   > ⚠️ Required: the app will not start until you replace `YourVaultName` with your actual 1Password vault name.

5. Start the app:
   ```bash
   npm run start:dev
   ```

## How it works

**Before (standard NestJS):**
```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
```

**After (with Varlock):**
```typescript
import 'varlock/auto-load'; // ← one line added, must be first
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
```

That single import runs synchronously before NestJS boots. It reads `.env.schema`, fetches every `op://` reference from 1Password, validates types and required fields, then writes everything into `process.env`. By the time `NestFactory.create()` runs, `process.env` is fully populated. `ConfigService.getOrThrow()` keeps working with no changes.

Note: `@nestjs/platform-express` is the HTTP adapter required by NestFactory — do not remove it.

## Integration paths

- **Development**: `import 'varlock/auto-load'` in `main.ts` — uses your local `op` CLI session.
- **Production containers**: `varlock run -- node dist/main.js` — remove the import entirely, zero runtime dependency on Varlock in the built artifact.

## .env.schema syntax

```ini
# @plugin(@varlock/1password-plugin)
# @initOp(token=$OP_TOKEN, allowAppAuth=forEnv(dev))
OP_TOKEN=

# @required means Varlock will throw at startup if the value is missing or empty
# @sensitive means the value is never logged
# @type=string enforces the type after fetching from the vault
# @required @sensitive @type=string
JWT_SECRET=op(op://YourVaultName/JWT/secret)

# @startsWith validates the value format before the app starts
# @required @sensitive @type=string @startsWith=postgresql://
DATABASE_URL=op(op://YourVaultName/Database/url)

# @default means the variable is optional — falls back to 3000 if not set
# @type=number @default=3000
PORT=

# @enum restricts accepted values
# @type=string @default=development @enum=development,staging,production
NODE_ENV=
```

## Prevent secret leaks

Install a pre-commit hook that scans staged files for secrets before they land in git:

```bash
varlock scan --install-hook
```

## CI/CD (GitHub Actions)

Pass the 1Password service account token as a repository secret. Varlock picks it up via `$OP_TOKEN` as declared in `.env.schema`.

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - run: npm ci
      - run: npm run build
      - run: npm run start:varlock
    env:
      OP_TOKEN: ${{ secrets.OP_TOKEN }}
```

## License

MIT
