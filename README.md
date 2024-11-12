### Features

Developer experience first, extremely flexible code structure and only keep what you need:

- ⚡ [Vite](https://vite.dev/) with App Router support
- ⚛️ [React](https://react.dev) - A modern front-end JavaScript library for building user interfaces based on components
- 🐜 [Ant Design](https://ant.design/) UI Framework
- 🌏 [Axios](https://axios-http.com/vi/docs/intro) Http Client
- ☂️ [TanStack Query](https://tanstack.com/query/latest) Powerful asynchronous state management for TS/JS
- 🏪 [TanStack Router](https://tanstack.com/router/v1) - Fully typesafe, modern and scalable routing for React applications
- 🐻 [Zustand](https://docs.pmnd.rs/zustand/getting-started/introduction) A small, fast, and scalable bearbones state management solution
- ⚙️ [pnpm](https://pnpm.io) - A strict and efficient alternative to npm with up to 3x faster performance
- 🔥 Type checking [TypeScript](https://www.typescriptlang.org)
- ✅ Strict Mode for TypeScript and React 18
- 🌐 Multi-language (i18n) with [i18next](https://react.i18next.com/)
- ♻️ Type-safe environment variables with T3 Env
- ⌨️ Form handling with React Hook Form
- 🔴 Validation library with Zod
- 📏 Linter with [ESLint](https://eslint.org)
- 💖 Code Formatter with [Prettier](https://prettier.io)
- 🦊 Husky for Git Hooks
- 🚫 Lint-staged for running linters on Git staged files
- 🚓 Lint git commit with Commitlint
- 📓 Write standard compliant commit messages with Commitizen
- 🦺 Unit Testing with Vitest and React Testing Library
- 🧪 Integration and E2E Testing with Playwright
- 👷 Run tests on pull request with GitHub Actions
- 🎉 Storybook for UI development
- 🎁 Automatic changelog generation with Semantic Release
- 🔍 Visual testing with Percy (Optional)
- 💡 Absolute Imports using `@` prefix
- 🗂 VSCode configuration: Debug, Settings, Tasks and Extensions

Built-in feature from Next.js:

- ☕ Minify HTML & CSS
- 💨 Live reload
- ✅ Cache busting

### Requirements

- Node.js 20+ and npm

## Getting Started

First, run the development server:

```bash
npm install -g pnpm

pnpm install
```

## Run dev

```bash
pnpm dev
```

## Run build

```bash
pnpm build
```

## Run preview

It is important to note that vite preview is intended for previewing the build locally and not meant as a production server.

```bash
pnpm preview
```

Open [http://localhost:5173/](http://localhost:5173/) with your browser to see the result.

### Project structure

```shell
.
├── README.md                       # README file
├── .husky                          # Husky configuration
├── .storybook                      # Storybook folder
├── .vscode                         # VSCode configuration
├── public                          # Public assets folder
├── src
│   ├── assets                      # access folder
│   ├── components                  # React components
│   │   ├── atoms                   # are the basic building blocks of all matter
│   │   ├── molecules               # are groups of two or more atoms held together by chemical bonds
│   │   ├── organisms               # are assemblies of molecules functioning together as a unit
│   │   ├── pages                   # are page-level objects that place components into a layout and articulate the design’s underlying content structure.
│   │   └── template                # are specific instances of templates that show what a UI looks like with real representative content in place
│   ├── constants                   # constants folder
│   ├── hooks                       # custom hooks folder
│   ├── libs                        # 3rd party libraries configuration
│   ├── provider                    # provider configuration
│   ├── queries                     # contain all tanstack query
│   ├── routes                      # defined routes of application
│   ├── stores                      # global stores
│   ├── styles                      # Styles folder
│   ├── types                       # Type definitions
│   ├── utils                       # Utilities folder
│   ├── routeTree.gen.ts            # route tree auto generate does not modify this file
...
├── tests
│   ├── e2e                         # E2E tests, also includes Monitoring as Code
│   └── integration                 # Integration tests
├── vite.config.ts                  # Vite configuration
└── tsconfig.json                   # TypeScript configuration
...
```
