# my-astro-portfolio

A high-performance personal portfolio and blog built with Astro and Tailwind CSS.
Fast by default, with zero JavaScript shipped to the browser unless needed.

## Features

- Static site generation with Astro for optimal performance
- Responsive design using Tailwind CSS
- Blog with MDX support and syntax highlighting
- Project showcase with filterable categories
- Dark mode support
- SEO-optimized with Open Graph metadata
- RSS feed and sitemap generation
- Accessibility-first component design

## Prerequisites

- Node.js >= 18.0.0
- npm, pnpm, or yarn

## Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/yourusername/my-astro-portfolio.git
cd my-astro-portfolio
npm install
```

Copy the environment variables file and configure it:

```bash
cp .env.example .env
```

## Usage

Start the development server:

```bash
npm run dev
```

The site will be available at `http://localhost:4321`.

Build for production:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

## Project Structure

```
my-astro-portfolio/
├── src/
│   ├── components/     # Reusable Astro and React components
│   ├── layouts/        # Page layout templates
│   ├── pages/          # File-based routing
│   └── content/        # MDX blog posts and project data
├── public/             # Static assets (images, fonts, favicon)
├── astro.config.mjs    # Astro configuration
└── tailwind.config.mjs # Tailwind CSS configuration
```

## Configuration

| Variable         | Description                      | Default       |
|------------------|----------------------------------|---------------|
| `SITE_URL`       | Public URL of the deployed site  | —             |
| `CONTACT_EMAIL`  | Email address for the contact form | —           |

## Contributing

Contributions are welcome. Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Commit your changes: `git commit -m "feat: add your feature"`
4. Push to the branch: `git push origin feat/your-feature`
5. Open a pull request

Please ensure your code passes the linting rules before submitting.

## License

MIT License. See [LICENSE](./LICENSE) for details.
