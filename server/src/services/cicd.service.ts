/**
 * Bedframe-inspired CI/CD Publishing Workflow Generator
 * Creates GitHub Actions workflows for automated extension linting, testing, and store deployment.
 */

export interface CICDWorkflows {
  'publish.yml': string
  'lint.yml': string
  'README-CICD.md': string
}

export function generateCICDWorkflows(projectName: string = 'extension'): CICDWorkflows {
  const safeName = projectName.toLowerCase().replace(/[^a-z0-9]/g, '-')

  const publishYaml = `name: Build & Publish Browser Extension

on:
  push:
    tags:
      - 'v*'
  workflow_dispatch:

jobs:
  lint-and-package:
    name: Lint & Build Extension
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install web-ext & Dependencies
        run: |
          npm install -g web-ext
          npm ci || npm install

      - name: Run web-ext Lint
        run: web-ext lint --self-hosted

      - name: Build Zip Package
        run: web-ext build --overwrite-dest --artifacts-dir dist/

      - name: Upload Artifact
        uses: actions/upload-artifact@v4
        with:
          name: ${safeName}-package
          path: dist/*.zip

  publish-chrome:
    name: Publish to Chrome Web Store
    needs: lint-and-package
    runs-on: ubuntu-latest
    if: startsWith(github.ref, 'refs/tags/v')
    steps:
      - name: Download Build Artifact
        uses: actions/download-artifact@v4
        with:
          name: ${safeName}-package
          path: ./dist

      - name: Submit to Chrome Web Store
        uses: mnao305/chrome-extension-upload@v2
        with:
          file-path: ./dist/*.zip
          extension-id: \${{ secrets.CHROME_EXTENSION_ID }}
          client-id: \${{ secrets.CHROME_CLIENT_ID }}
          client-secret: \${{ secrets.CHROME_CLIENT_SECRET }}
          refresh-token: \${{ secrets.CHROME_REFRESH_TOKEN }}

  publish-firefox:
    name: Sign & Publish to Firefox Add-ons (AMO)
    needs: lint-and-package
    runs-on: ubuntu-latest
    if: startsWith(github.ref, 'refs/tags/v')
    steps:
      - name: Download Build Artifact
        uses: actions/download-artifact@v4
        with:
          name: ${safeName}-package
          path: ./dist

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Sign with web-ext
        run: npx web-ext sign --apiKey="\${{ secrets.AMO_JWT_ISSUER }}" --apiSecret="\${{ secrets.AMO_JWT_SECRET }}" --source-dir=./
`

  const lintYaml = `name: Extension Quality Checks

on:
  push:
    branches: [ main, master ]
  pull_request:
    branches: [ main, master ]

jobs:
  web-ext-lint:
    name: Run web-ext Server-Side Lint Rules
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Run web-ext Lint
        run: npx web-ext lint --self-hosted
`

  const readmeMd = `# Bedframe CI/CD Extension Publishing Setup

This repository is equipped with Bedframe-style automated publishing workflows.

## Workflow Capabilities
1. **Quality Checks (\`.github/workflows/lint.yml\`)**: Automatically runs \`web-ext lint\` on every push & pull request.
2. **Publish Pipeline (\`.github/workflows/publish.yml\`)**: Packages your extension into a zip archive and publishes releases to store marketplaces when a new tag (\`v1.0.0\`) is pushed.

## Secret Configuration (GitHub Repository Settings -> Secrets & Variables -> Actions)

| Secret Name | Store | Description |
|-------------|-------|-------------|
| \`CHROME_EXTENSION_ID\` | Chrome Web Store | Your Chrome Extension ID |
| \`CHROME_CLIENT_ID\` | Chrome Web Store | Google API Console OAuth2 Client ID |
| \`CHROME_CLIENT_SECRET\` | Chrome Web Store | Google API Console OAuth2 Client Secret |
| \`CHROME_REFRESH_TOKEN\` | Chrome Web Store | Google OAuth2 Refresh Token |
| \`AMO_JWT_ISSUER\` | Firefox Add-ons | Mozilla Developer Hub API Key |
| \`AMO_JWT_SECRET\` | Firefox Add-ons | Mozilla Developer Hub API Secret |

## Triggering a Release
\`\`\`bash
git tag v1.0.0
git push origin v1.0.0
\`\`\`
`

  return {
    'publish.yml': publishYaml,
    'lint.yml': lintYaml,
    'README-CICD.md': readmeMd,
  }
}
