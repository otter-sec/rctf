# Contributing to rCTF

## Workflow

Development primarily occurs with `yarn`. While there are docker containers available, these are meant more for production environments.

You should first clone the repository and perform first-time setup:

```bash
cat <<EOT > rctf.d/00-development.yaml
ctfName: rCTF Development
meta:
  description: 'Example rCTF instance'
  imageUrl: 'https://example.com'
homeContent: 'A description of your CTF. Markdown supported.'

origin: http://127.0.0.1:8080
divisions:
  open: Open
tokenKey: DO_NOT_USE_ME
startTime: 0
endTime: 99999999999999

database:
  sql:
    host: 127.0.0.1
    user: rctf
    password: DO_NOT_USE_ME
    database: rctf
  redis:
    host: 127.0.0.1
    password: DO_NOT_USE_ME
  migrate: before
EOT
```

Then, build all the packages once so that all the required bundles get created:

```bash
yarn
yarn workspace @rctf/api-types build
yarn workspace @rctf/server build
yarn workspace @rctf/client build
```

After that, you can start up a local development environment in the future by running the following commands:

```bash
docker compose -f docker-compose.development.yml up -d
yarn dev
```

These will automatically watch the filesystem for changes, and restart when needed.

**Note that this will start two servers**. The API listens on `http://localhost:3000` by default while the frontend is served by Preact on `http://localhost:8080`.

Before committing your changes, please:

- run `yarn lint` and `yarn lint --fix` to fix any linting errors
- run `yarn test` to ensure there are no regressions

## Commits

Finally, when it's all done, you can commit with `git commit`.

Make sure to follow the [commit message guidelines](https://github.com/angular/angular.js/blob/master/DEVELOPERS.md#-git-commit-guidelines).

## Branches

You should follow the examples below as a guideline for how to name your branches.

```
feature/brief-description-here
fix/bug-description
refactor/some-component
docs/some-component
```
