export interface ValidationError {
  field: string
  message: string
  severity: 'error' | 'warning'
}

export function validateManifest(files: Record<string, string>): ValidationError[] {
  const errors: ValidationError[] = []

  // 1. Check if manifest.json exists
  if (!files['manifest.json']) {
    errors.push({
      field: 'manifest.json',
      message: 'Missing manifest.json file in the root directory.',
      severity: 'error',
    })
    return errors
  }

  // 2. Parse JSON
  let manifest: any
  try {
    manifest = JSON.parse(files['manifest.json'])
  } catch (e) {
    errors.push({
      field: 'manifest.json',
      message: 'manifest.json is not valid JSON.',
      severity: 'error',
    })
    return errors
  }

  // 3. Verify manifest_version
  if (manifest.manifest_version !== 3) {
    errors.push({
      field: 'manifest_version',
      message: `manifest_version must be 3 (received: ${manifest.manifest_version || 'none'}).`,
      severity: 'error',
    })
  }

  // 4. Verify required fields
  if (!manifest.name || typeof manifest.name !== 'string' || !manifest.name.trim()) {
    errors.push({
      field: 'name',
      message: 'Required field "name" is missing or empty.',
      severity: 'error',
    })
  }

  if (!manifest.version || typeof manifest.version !== 'string' || !manifest.version.trim()) {
    errors.push({
      field: 'version',
      message: 'Required field "version" is missing or empty.',
      severity: 'error',
    })
  }

  // 5. Verify service worker
  if (manifest.background && manifest.background.service_worker) {
    const swPath = manifest.background.service_worker
    if (!files[swPath]) {
      errors.push({
        field: 'background.service_worker',
        message: `Background service worker file "${swPath}" does not exist in the project.`,
        severity: 'error',
      })
    }
  }

  // 6. Verify popup
  if (manifest.action && manifest.action.default_popup) {
    const popupPath = manifest.action.default_popup
    if (!files[popupPath]) {
      errors.push({
        field: 'action.default_popup',
        message: `Popup HTML file "${popupPath}" does not exist in the project.`,
        severity: 'error',
      })
    }
  }

  // 7. Verify content scripts
  if (manifest.content_scripts && Array.isArray(manifest.content_scripts)) {
    manifest.content_scripts.forEach((script: any, idx: number) => {
      if (script.js && Array.isArray(script.js)) {
        script.js.forEach((jsPath: string) => {
          if (!files[jsPath] && jsPath !== 'browser-polyfill.js') {
            errors.push({
              field: `content_scripts[${idx}].js`,
              message: `Content script JS file "${jsPath}" does not exist in the project.`,
              severity: 'error',
            })
          }
        })
      }
      if (script.css && Array.isArray(script.css)) {
        script.css.forEach((cssPath: string) => {
          if (!files[cssPath]) {
            errors.push({
              field: `content_scripts[${idx}].css`,
              message: `Content script CSS file "${cssPath}" does not exist in the project.`,
              severity: 'error',
            })
          }
        })
      }
    })
  }

  // 8. Verify icons
  if (manifest.icons && typeof manifest.icons === 'object') {
    Object.entries(manifest.icons).forEach(([size, iconPath]) => {
      if (typeof iconPath === 'string' && !files[iconPath]) {
        errors.push({
          field: `icons.${size}`,
          message: `Icon file "${iconPath}" (size ${size}) does not exist in the project.`,
          severity: 'warning',
        })
      }
    })
  }

  // 9. Verify host permissions format
  if (manifest.host_permissions && Array.isArray(manifest.host_permissions)) {
    const matchPatternRegex = /^(\*|https?|file|ftp):\/\/(\*|\*\.[^/]+|[^/]+)\/.*$/
    manifest.host_permissions.forEach((perm: string, idx: number) => {
      if (perm !== '<all_urls>' && !matchPatternRegex.test(perm)) {
        errors.push({
          field: `host_permissions[${idx}]`,
          message: `Host permission "${perm}" is not a valid match pattern.`,
          severity: 'warning',
        })
      }
    })
  }

  return errors
}
