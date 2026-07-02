export type StreamEvent =
  | { type: 'text'; delta: string }
  | { type: 'file_start'; path: string }
  | { type: 'file_chunk'; path: string; delta: string }
  | { type: 'file_end'; path: string }

export class XmlStreamParser {
  private mode: 'text' | 'file' = 'text'
  private currentFilePath: string = ''
  private buffer: string = ''
  private fileContentAccumulator: string = ''
  private files: Record<string, string> = {}

  constructor() {}

  /**
   * Pushes a new chunk of text from the LLM stream and returns any parsed events.
   */
  public push(chunk: string): StreamEvent[] {
    this.buffer += chunk
    const events: StreamEvent[] = []

    while (this.buffer.length > 0) {
      if (this.mode === 'text') {
        // Look for the start of a file tag: <file path="xxxx">
        const openTagIndex = this.buffer.indexOf('<file')
        
        if (openTagIndex === -1) {
          // No '<file' found. Flush most of the buffer as text, leaving a small tail for split tag safety
          const flushLength = Math.max(0, this.buffer.length - 10)
          if (flushLength > 0) {
            const textToFlush = this.buffer.substring(0, flushLength)
            this.buffer = this.buffer.substring(flushLength)
            events.push({ type: 'text', delta: textToFlush })
          }
          break // Wait for more data
        } else {
          // Flush any text before the '<file' tag
          if (openTagIndex > 0) {
            const textBefore = this.buffer.substring(0, openTagIndex)
            events.push({ type: 'text', delta: textBefore })
            this.buffer = this.buffer.substring(openTagIndex)
          }

          // Check if we have the complete opening tag
          const closeBracketIndex = this.buffer.indexOf('>')
          if (closeBracketIndex === -1) {
            // Incomplete tag, wait for more chunks
            break
          }

          const fullTag = this.buffer.substring(0, closeBracketIndex + 1)
          const pathMatch = fullTag.match(/path="([^"]+)"/)
          const path = pathMatch ? pathMatch[1] : 'unknown_file'

          this.mode = 'file'
          this.currentFilePath = path
          this.fileContentAccumulator = ''
          events.push({ type: 'file_start', path })

          this.buffer = this.buffer.substring(closeBracketIndex + 1)
        }
      } else if (this.mode === 'file') {
        // Look for the closing tag: </file>
        const closeTagIndex = this.buffer.indexOf('</file>')

        if (closeTagIndex === -1) {
          // No '</file>' found. Flush most of the content, leaving a tail for split tag safety
          const flushLength = Math.max(0, this.buffer.length - 7)
          if (flushLength > 0) {
            const contentChunk = this.buffer.substring(0, flushLength)
            this.buffer = this.buffer.substring(flushLength)
            this.fileContentAccumulator += contentChunk
            events.push({
              type: 'file_chunk',
              path: this.currentFilePath,
              delta: contentChunk,
            })
          }
          break // Wait for more data
        } else {
          // Found closing tag. Flush remaining content before it
          if (closeTagIndex > 0) {
            const finalContentChunk = this.buffer.substring(0, closeTagIndex)
            this.fileContentAccumulator += finalContentChunk
            events.push({
              type: 'file_chunk',
              path: this.currentFilePath,
              delta: finalContentChunk,
            })
          }

          events.push({ type: 'file_end', path: this.currentFilePath })
          this.files[this.currentFilePath] = this.fileContentAccumulator

          this.mode = 'text'
          this.buffer = this.buffer.substring(closeTagIndex + 7)
          this.currentFilePath = ''
          this.fileContentAccumulator = ''
        }
      }
    }

    return events
  }

  /**
   * Flushes any remaining content at the end of the stream.
   * Ensures that unclosed file tags are closed gracefully.
   */
  public flush(): StreamEvent[] {
    const events: StreamEvent[] = []
    
    if (this.buffer.length > 0) {
      if (this.mode === 'file') {
        this.fileContentAccumulator += this.buffer
        events.push({
          type: 'file_chunk',
          path: this.currentFilePath,
          delta: this.buffer,
        })
        events.push({ type: 'file_end', path: this.currentFilePath })
        this.files[this.currentFilePath] = this.fileContentAccumulator
      } else {
        events.push({ type: 'text', delta: this.buffer })
      }
      this.buffer = ''
    } else if (this.mode === 'file') {
      events.push({ type: 'file_end', path: this.currentFilePath })
      this.files[this.currentFilePath] = this.fileContentAccumulator
    }
    
    return events
  }

  public getFiles(): Record<string, string> {
    return this.files
  }
}
