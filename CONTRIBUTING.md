# Contributing to Rentars

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/yourusername/Rentars.git`
3. Install dependencies: `yarn install`

## Development Setup

### Backend

```bash
cd apps/backend
cp .env.example .env.local
# Edit .env.local with your configuration
yarn dev
```

### Frontend

```bash
cd apps/web
cp .env.example .env.local
# Edit .env.local with your configuration
yarn dev
```

### Full Stack with Docker

```bash
docker-compose up -d
```

## Code Quality

- We use Biome for linting and formatting
- Run before committing: `yarn format-and-lint`
- Pre-commit hooks will run automatically via Husky

## Testing

```bash
# Unit tests
yarn test:unit

# Integration tests
yarn test:integration
```

## Release Process

We use Changesets for versioning and changelog management.

### Creating a Release

1. Make changes and commit them
2. Run `yarn changeset` to create a changeset file
3. Commit the changeset file
4. Push to main branch
5. GitHub Actions will automatically:
   - Version the package
   - Update CHANGELOG.md
   - Publish to npm (if applicable)

### Version Bump Types

- `patch`: Bug fixes
- `minor`: New features
- `major`: Breaking changes

## Commit Messages

Follow Conventional Commits:

- `feat: add new feature`
- `fix: resolve bug`
- `docs: update documentation`
- `refactor: restructure code`
- `test: add tests`

## Questions?

Open an issue for discussion before submitting a PR.
