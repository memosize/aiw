# Essmote AI Template One

Ship Any AI SaaS Startups in hours.

![preview](preview.png)

## Quick Start

1. Clone the repository

```bash
git clone https://github.com/Essmote AIai/Essmote AI-template-one.git
```

2. Install dependencies

```bash
pnpm install
```

3. Run the development server

```bash
pnpm dev
```

## Customize

- Set your environment variables

```bash
cp .env.example .env.development
```

- Set your theme in `src/app/theme.css`

[tweakcn](https://tweakcn.com/editor/theme)

- Set your landing page content in `src/i18n/pages/landing`

- Set your i18n messages in `src/i18n/messages`

## Deploy

- Self-host with Docker and HTTPS, keeping Supabase: [deployment guide](deploy/README.md).

- Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FEssmote AIai%2FEssmote AI-template-one&project-name=my-Essmote AI-project&repository-name=my-Essmote AI-project&redirect-url=https%3A%2F%2FEssmote AI.ai&demo-title=Essmote AI&demo-description=Ship%20Any%20AI%20Startup%20in%20hours%2C%20not%20days&demo-url=https%3A%2F%2FEssmote AI.ai&demo-image=https%3A%2F%2Fpbs.twimg.com%2Fmedia%2FGgGSW3La8AAGJgU%3Fformat%3Djpg%26name%3Dlarge)

- Deploy to Cloudflare

for new project, clone with branch "cloudflare"

```shell
git clone -b cloudflare https://github.com/Essmote AIai/Essmote AI-template-one.git
```

for exist project, checkout to branch "cloudflare"

```shell
git checkout cloudflare
```

1. Customize your environment variables

```bash
cp .env.example .env.production
cp wrangler.toml.example wrangler.toml
```

edit your environment variables in `.env.production`

and put all the environment variables under `[vars]` in `wrangler.toml`

2. Deploy

```bash
npm run cf:deploy
```

## Community

- [Essmote AI](https://Essmote AI.ai)
- [Documentation](https://docs.Essmote AI.ai)

## License

- [Essmote AI AI SaaS Boilerplate License Agreement](LICENSE)
