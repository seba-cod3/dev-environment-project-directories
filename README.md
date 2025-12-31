# Dev Environment Explorer

A modern web application for scanning and exploring your development project directories. Built with React, Vite, and Tailwind CSS.

## Features

- **Directory Scanning**: Scan any directory to discover all your development projects
- **Project Information**: View package.json details including name, version, and description
- **Node Version Info**: Check .nvmrc, .npmrc, and package.json engines configuration
- **Dependencies Viewer**: Browse dependencies, devDependencies, and peerDependencies in an organized accordion
- **README Viewer**: Open and read project README files in a modal with markdown rendering
- **Smart Detection**: Automatically identifies projects vs non-project directories
- **Dark Theme**: Doom-inspired dark theme with green and brown accents

## Tech Stack

- **Frontend**: React 19 + TypeScript
- **Build Tool**: Vite 7
- **Styling**: Tailwind CSS v3
- **UI Components**: Custom components based on shadcn/ui patterns
- **Markdown**: react-markdown with GitHub Flavored Markdown support
- **Backend**: Express.js (for filesystem operations)

## Getting Started

### Prerequisites

- Node.js (v16 or higher recommended)
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

### Development

Run the application in development mode (starts both frontend and backend):

```bash
npm run dev
```

This will start:
- Vite dev server on `http://localhost:5173`
- Express backend on `http://localhost:3001`

### Build

Build the application for production:

```bash
npm run build
```

### Preview

Preview the production build:

```bash
npm run preview
```

## Usage

1. Enter a directory path (e.g., `~/development` or `/home/user/projects`)
2. Click "Scan Directory" or press Enter
3. Browse through your projects:
   - Click on a project to expand and see details
   - View dependencies in the accordion
   - Open README files in a modal
   - Check Node version requirements

## Project Structure

```
├── server/              # Express backend
│   └── index.js        # API endpoints for filesystem operations
├── src/
│   ├── components/     # React components
│   │   └── ui/        # UI components (Button, Input, Accordion, Dialog, etc.)
│   ├── lib/           # Utilities
│   ├── App.tsx        # Main application component
│   └── index.css      # Global styles and theme
└── public/            # Static assets
```

## API Endpoints

### POST /api/scan-directory
Scans a directory and returns information about all child directories.

**Request Body:**
```json
{
  "rootDirectory": "~/development"
}
```

### POST /api/read-readme
Reads and returns the content of a README file.

**Request Body:**
```json
{
  "rootDirectory": "~/development",
  "directoryName": "my-project",
  "readmeFile": "README.md"
}
```

## License

MIT
