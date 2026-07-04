import OpenAI from 'openai'

const BYOK_SYSTEM_PROMPT = `You are an elite Chrome Extension developer and UI/UX designer.
You build Manifest V3 extensions with stunning, modern, production-quality interfaces.

CRITICAL OUTPUT FORMAT:
- Output files using EXACTLY this format:
<file path="manifest.json">
...content...
</file>
- NEVER use markdown code blocks
- NEVER explain code outside file tags
- Always start with manifest.json first
- manifest_version must be 3
- Use service_worker for background (not scripts)
- All generated code MUST use the standard 'browser.*' API namespace instead of 'chrome.*'
- Do NOT use inline scripts in HTML files (CSP requirement)
- When outputting a file, write the COMPLETE, FULL code — no placeholders`

const baseURLMap: Record<string, string> = {
  openrouter:       'https://openrouter.ai/api/v1',
  openai:           'https://api.openai.com/v1',
  groq:             'https://api.groq.com/openai/v1',
  anthropic_compat: 'https://api.anthropic.com/v1',
}

const modelMap: Record<string, string> = {
  openrouter:       'moonshotai/kimi-k2',
  openai:           'gpt-4o-mini',
  groq:             'llama-3.3-70b-versatile',
  anthropic_compat: 'claude-haiku-4-5-20251001',
}

export async function generateWithBYOK(
  prompt: string,
  files: Record<string, string>,
  history: Array<{ role: string; content: string }>,
  apiKey: string,
  provider: string,
  onEvent: (event: any) => void
): Promise<{ files: Record<string, string> }> {
  const client = new OpenAI({
    apiKey,
    baseURL: baseURLMap[provider] || baseURLMap.openrouter,
  })

  const filesContext = Object.entries(files)
    .map(([path, content]) => `<file path="${path}">\n${content}\n</file>`)
    .join('\n\n')

  const messages: any[] = [
    { role: 'system', content: BYOK_SYSTEM_PROMPT },
    ...history.slice(-6).map(m => ({ role: m.role, content: m.content })),
    {
      role: 'user',
      content: filesContext
        ? `Current extension files:\n${filesContext}\n\nUser request: ${prompt}`
        : prompt
    }
  ]

  const stream = await client.chat.completions.create({
    model: modelMap[provider] || modelMap.openrouter,
    messages,
    stream: true,
    max_tokens: 8192,
  })

  const generatedFiles: Record<string, string> = {}
  let currentFilePath: string | null = null
  let buffer = ''

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content || ''
    if (!delta) continue

    buffer += delta

    while (true) {
      if (currentFilePath === null) {
        const startMatch = buffer.match(/<file path="([^"]+)">/)
        if (startMatch) {
          currentFilePath = startMatch[1]
          generatedFiles[currentFilePath] = ''
          buffer = buffer.slice(buffer.indexOf(startMatch[0]) + startMatch[0].length)
          onEvent({ type: 'file_start', path: currentFilePath })
        } else {
          // Stream text outside file tags
          const safeText = buffer.replace(/<file.*$/, '')
          if (safeText) {
            onEvent({ type: 'text', delta: safeText })
            buffer = buffer.slice(safeText.length)
          }
          break
        }
      } else {
        const endIdx = buffer.indexOf('</file>')
        if (endIdx !== -1) {
          const fileContent = buffer.slice(0, endIdx)
          generatedFiles[currentFilePath] += fileContent
          onEvent({ type: 'file_chunk', path: currentFilePath, delta: fileContent })
          buffer = buffer.slice(endIdx + 7)
          currentFilePath = null
        } else {
          // Still inside file, stream safe portion
          const safeChunk = buffer.slice(0, Math.max(0, buffer.length - 10))
          if (safeChunk) {
            generatedFiles[currentFilePath] += safeChunk
            onEvent({ type: 'file_chunk', path: currentFilePath, delta: safeChunk })
            buffer = buffer.slice(safeChunk.length)
          }
          break
        }
      }
    }
  }

  return { files: generatedFiles }
}
