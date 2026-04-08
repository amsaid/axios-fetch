# Contributing to sd-axios-fetch

Thank you for your interest in contributing! This project welcomes bug reports, feature requests, and pull requests.

## Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/sd-axios-fetch.git
   cd sd-axios-fetch
   ```

2. **No dependencies to install** — this is a zero-dependency library.

3. **Build the project**
   ```bash
   npm run build
   ```

4. **Run the tests**
   ```bash
   npm test
   ```

## Project Structure

```
├── src/
│   ├── index.js              # Entry point, exports default instance
│   ├── Axios.js              # Main Axios class
│   ├── adapters/
│   │   └── fetch.js          # Fetch API adapter
│   ├── core/
│   │   ├── AxiosError.js     # Error handling
│   │   ├── CanceledError.js  # Cancellation error
│   │   ├── CancelToken.js    # CancelToken implementation
│   │   ├── InterceptorManager.js
│   │   ├── buildURL.js       # URL building utilities
│   │   ├── mergeConfig.js    # Config merging logic
│   │   ├── settle.js         # Response settlement
│   │   └── transformData.js  # Data transformation
│   └── helpers/
│       └── utils.js          # Type checking utilities
├── test/
│   └── test.js               # Interoperability test suite
├── dist/                     # Build output (generated)
├── build.mjs                 # Bundler script
└── package.json
```

## How to Contribute

### Reporting Bugs

- Search existing [issues](https://github.com/your-username/sd-axios-fetch/issues) first
- Include: Node.js version, environment (browser/Node), minimal reproduction code
- Specify expected vs actual behavior

### Pull Requests

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. **Run tests**: `npm test`
5. **Rebuild**: `npm run build` (dist files must be committed)
6. Commit with clear messages following [Conventional Commits](https://www.conventionalcommits.org/)
7. Open a PR with description and test evidence

### Commit Message Format

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description

[optional body]

[optional footer]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

Examples:
- `feat(adapter): add upload progress tracking`
- `fix(headers): preserve Set-Cookie duplicates`
- `docs(readme): add limitations section`

## Testing Guidelines

- Tests use live APIs (jsonplaceholder.typicode.com)
- Add tests for new features in `test/test.js`
- Use the `test(name, fn)` helper
- Keep tests atomic and independent
- Avoid flaky network-dependent assertions when possible

## Coding Standards

- **No external dependencies** — only native Web APIs and Node.js built-ins
- **CommonJS modules** — source uses `require()`, build bundles into UMD/ESM
- **ES5 compatible** — avoid modern syntax for broader compatibility
- **JSDoc comments** — document public APIs
- **Error handling** — use `AxiosError` factory methods consistently

## Feature Requests

Before submitting a feature request, please consider:

1. Does it align with Fetch API capabilities? (some Axios features can't be replicated)
2. Is there a workaround with existing APIs?
3. Would it add external dependencies? (should be avoided)

See [Known Limitations](README.md#known-limitations) for Fetch API constraints.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
