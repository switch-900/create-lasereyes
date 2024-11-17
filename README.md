# create-lasereyes

Interactive CLI tool to scaffold Next.js projects with LaserEyes integration to quickly start building Bitcoin Apps.

## Quick Start

```bash
npx create-lasereyes
```

## Features

- ⚡️ **Next.js Integration** - Creates a modern Next.js project with App Router using React 18
- 🔐 **LaserEyes Wallet Connect Modal** - Pre-configured Bitcoin wallet integration
- 🎨 **Styling**
  - Shadcn / Tailwind CSS setup
  - Light / Dark Mode App Toggle
- 🤖 **.cursorrules**: For developers using Cursor editor, provides AI assistant configuration to make working with AI tools easier than ever

## Project Structure

After running the command, your project will include:

```
src/
├── app/
│   ├── favicon.ico
│   ├── globals.css
│   ├── layout.tsx           # Root layout with providers
│   └── page.tsx             # Home page
├── components/
│   ├── ui/                  # Reusable Shadcn UI Components
│   ├── ConnectWallet.tsx    # LaserEyes Wallet Connection Modal
│   ├── DefaultLayout.tsx    # LaserEyes Provider Wrapper
│   └── ThemeToggle.tsx      # Light/Dark Mode Toggle
├── lib/
│   └── utils.ts
└── .cursorrules             # AI assistant configuration for Cursor editor
```

### Key Components

- **ConnectWallet.tsx**: Modal component for connecting Bitcoin wallets
- **DefaultLayout.tsx**: Wraps your app in `useLaserEyesProvider` for Bitcoin functionality
- **ThemeToggle.tsx**: Toggle component for switching between light and dark modes

### AI Assistance

- **.cursorrules**: For developers using Cursor editor, provides AI assistant configuration to make working with AI tools easier than ever

## Development

1. Create a new project:

   ```bash
   npx create-lasereyes
   ```

2. Follow the interactive prompts to customize your setup

3. Navigate to your project:

   ```bash
   cd your-project-name
   ```

4. Start developing:
   ```bash
   npm run dev
   ```

## Coming Soon

- Vue.js template support
- Vanilla JavaScript template
- Additional wallet integrations

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - feel free to use this in your own projects!
