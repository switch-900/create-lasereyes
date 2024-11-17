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
- 🚀 **Best Practices**
  - TypeScript by default
  - ESLint configuration
  - Optimized project structure

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
│   ├── ui/                  # Reusable Shadcn UI components
│   ├── ConnectWallet.tsx    # LaserEyes Wallet connection modal
│   ├── DefaultLayout.tsx    # LaserEyes provider wrapper
│   └── ThemeToggle.tsx      # Light/Dark mode switcher
└── lib/
    └── utils.ts
```

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
