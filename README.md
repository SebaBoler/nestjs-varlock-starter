# nestjs-varlock-starter

Minimal NestJS starter. Varlock replaces `.env` files with 1Password vault-backed secrets and schema validation.

## Why

- Cursor, GitHub Copilot, and Claude Code read every file in your working directory. Your `.env` is one of them.
- A missing or malformed variable crashes at the first request that needs it, not at startup.
- Rotating a secret means SSH access and editing files on every server. Varlock fetches from 1Password on boot, so rotation is a vault update.

## Setup

1. Install 1Password CLI:
   ```bash
   brew install --cask 1password-cli
   ```

2. Clone and install:
   ```bash
   git clone https://github.com/SebaBoler/nestjs-varlock-starter
   cd nestjs-varlock-starter
   npm install
   ```

3. Sign in to 1Password:
   ```bash
   op signin
   ```

4. Copy the example schema and update the vault paths:
   ```bash
   cp .env.schema.example .env.schema
   # replace YourVaultName with your actual vault name and item paths
   ```

   > ⚠️ Required: the app exits at startup until you set real vault paths in `.env.schema`.

5. Start:
   ```bash
   npm run start:dev
   ```

## How it works

**Before:**
```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
```

**After:**
```typescript
import 'varlock/auto-load'; // must be first
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
```

That import runs synchronously before NestJS boots. It reads `.env.schema`, fetches every `op://` reference from 1Password, validates types and required fields, then writes everything into `process.env`. Varlock finishes before `NestFactory.create()` runs. `ConfigService.getOrThrow()` continues to work unchanged.

`@nestjs/platform-express` is the HTTP adapter NestFactory requires. Keep it in dependencies.

## Integration paths

- **Development**: add `import 'varlock/auto-load'` as the first line of `main.ts`. Uses your local `op` CLI session.
- **Production containers**: run `varlock run -- node dist/main.js`. Remove the import from `main.ts`. The built artifact has no runtime Varlock dependency.

## .env.schema syntax

```ini
# @plugin(@varlock/1password-plugin)
# @initOp(token=$OP_TOKEN, allowAppAuth=forEnv(dev))
OP_TOKEN=

# @required — Varlock exits at startup if the value is missing or empty
# @sensitive — the value never appears in logs
# @type=string — validated after fetching from the vault
# @required @sensitive @type=string
JWT_SECRET=op(op://YourVaultName/JWT/secret)

# @startsWith validates the value format before the app starts
# @required @sensitive @type=string(startsWith=postgresql://)
DATABASE_URL=op(op://YourVaultName/Database/url)

# @default makes the variable optional. Falls back to 3000 if not set.
# @type=number @default=3000
PORT=

# @type=string @default=development
NODE_ENV=
```

## Prevent secret leaks

Scan staged files for secrets before every commit:

```bash
varlock scan --install-hook
```

## CI/CD (GitHub Actions)

Store your 1Password service account token as `OP_TOKEN` in GitHub repository secrets. Varlock reads it from `.env.schema`.

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
