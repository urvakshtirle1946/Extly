'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { useAuth as useClerkAuth } from '@clerk/nextjs'
import { useApiFetch } from '@/utils/api'
import Link from 'next/link'
import Editor from '@monaco-editor/react'
import ReactMarkdown from 'react-markdown'
import { AgentsThinkingBadge, PixelOrb } from '@/components/ui/grok-agent-thinking-indicator'
import { CommandPalette } from '@/components/ui/be-ui-command-palette'
import { 
  ArrowLeft, 
  Code, 
  Play, 
  Download, 
  Send, 
  Loader2, 
  Folder, 
  FolderOpen, 
  FileCode,
  Sparkles,
  Terminal,
  Settings,
  AlertCircle,
  Eye,
  Activity,
  StopCircle,
  Zap,
  Wrench,
  Clock,
  RotateCcw,
  Plus,
  MoreHorizontal,
  X,
  ChevronDown, ChevronRight,
  Mic,
  ArrowRight,
  Copy,
  ThumbsUp,
  ThumbsDown,
  FileText,
  Square,
  Search
} from 'lucide-react'

interface TreeNode {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: TreeNode[]
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at?: string
  feedback?: 'liked' | 'disliked'
}

interface PreviewLog {
  type: 'log' | 'error' | 'screenshot' | 'status'
  message?: string
  severity?: 'info' | 'warning' | 'error' | 'log'
  data?: string
  timestamp: string
}

// Helper to construct hierarchical tree from flat paths
function buildFileTree(files: Record<string, string>): TreeNode[] {
  const root: TreeNode[] = []

  for (const path of Object.keys(files)) {
    const parts = path.split('/')
    let currentLevel = root

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      const isLast = i === parts.length - 1
      const currentPath = parts.slice(0, i + 1).join('/')

      let existingNode = currentLevel.find((node) => node.name === part)

      if (!existingNode) {
        existingNode = {
          name: part,
          path: currentPath,
          type: isLast ? 'file' : 'directory',
          children: isLast ? undefined : [],
        }
        currentLevel.push(existingNode)
      }

      if (!isLast && existingNode.children) {
        currentLevel = existingNode.children
      }
    }
  }

  const sortNodes = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'directory' ? -1 : 1
      }
      return a.name.localeCompare(b.name)
    })
    nodes.forEach((node) => {
      if (node.children) sortNodes(node.children)
    })
  }

  sortNodes(root)
  return root
}

interface FileTreeNodeProps {
  node: TreeNode
  activeFile: string | null
  onSelectFile: (path: string) => void
  expandedFolders: Record<string, boolean>
  onToggleFolder: (path: string) => void
}

function FileTreeNode({
  node,
  activeFile,
  onSelectFile,
  expandedFolders,
  onToggleFolder,
}: FileTreeNodeProps) {
  const isDirectory = node.type === 'directory'
  const isExpanded = expandedFolders[node.path] ?? true
  const isActive = activeFile === node.path

  // Check if folder contains active file to style its text color as yellow
  const isActiveFolder = isDirectory && activeFile && activeFile.startsWith(node.path + '/')

  const getFileIcon = (fileName: string) => {
    if (fileName.endsWith('.json')) {
      return <span className="font-extrabold text-[10px] text-neutral-405 font-mono w-4 shrink-0 text-center select-none">{"{}"}</span>;
    }
    if (fileName.endsWith('.ts') || fileName.endsWith('.tsx')) {
      return <span className="font-extrabold text-[9px] text-[#0066cc] bg-[#0066cc]/10 px-0.5 rounded font-mono shrink-0 w-4 text-center select-none">TS</span>;
    }
    if (fileName.endsWith('.js') || fileName.endsWith('.jsx') || fileName.endsWith('.mjs')) {
      return <span className="font-extrabold text-[9px] text-[#EAB308] bg-[#EAB308]/10 px-0.5 rounded font-mono shrink-0 w-4 text-center select-none">JS</span>;
    }
    if (fileName.endsWith('.css')) {
      return <span className="font-extrabold text-[8px] text-[#06B6D4] bg-[#06B6D4]/10 px-0.5 rounded font-mono shrink-0 w-4 text-center select-none">CSS</span>;
    }
    if (fileName.endsWith('.html')) {
      return <span className="font-extrabold text-[8px] text-[#E34F26] bg-[#E34F26]/10 px-0.5 rounded font-mono shrink-0 w-4 text-center select-none">HTML</span>;
    }
    if (fileName.toLowerCase() === 'readme.md') {
      return <FileText className="w-3.5 h-3.5 text-neutral-400 shrink-0" />;
    }
    // Blue diamond icon for gitignore
    if (fileName === '.gitignore') {
      return (
        <svg viewBox="0 0 100 100" className="w-3.5 h-3.5 text-blue-500 shrink-0 fill-current ml-0.5">
          <polygon points="50,15 85,50 50,85 15,50" />
        </svg>
      );
    }
    return <FileCode className="w-3.5 h-3.5 text-neutral-450 shrink-0" />;
  };

  if (isDirectory) {
    return (
      <div className="text-xs select-none">
        <div
          onClick={() => onToggleFolder(node.path)}
          className={`flex items-center py-1.5 px-2 hover:bg-neutral-900/60 rounded-md cursor-pointer transition-colors ${
            isActiveFolder ? 'text-[#EAB308]' : (isExpanded ? 'text-neutral-200' : 'text-neutral-400')
          }`}
        >
          {isExpanded ? (
            <ChevronDown className="w-3 h-3 text-[#EAB308] shrink-0 mr-1.5" />
          ) : (
            <ChevronRight className="w-3 h-3 text-neutral-500 shrink-0 mr-1.5" />
          )}
          <span className="font-bold truncate text-[11px]">{node.name}</span>
        </div>
        {isExpanded && node.children && (
          <div className="pl-3 border-l border-neutral-900/40 ml-3.5 mt-0.5 space-y-0.5">
            {node.children.map((child) => (
              <FileTreeNode
                key={child.path}
                node={child}
                activeFile={activeFile}
                onSelectFile={onSelectFile}
                expandedFolders={expandedFolders}
                onToggleFolder={onToggleFolder}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      onClick={() => onSelectFile(node.path)}
      className={`flex items-center space-x-2 py-1.5 px-2.5 rounded-lg cursor-pointer text-xs select-none transition-all ${
        isActive
          ? 'bg-[#242426] text-white font-semibold'
          : 'text-neutral-400 hover:bg-neutral-900/40 hover:text-neutral-200'
      }`}
    >
      {getFileIcon(node.name)}
      <span className="truncate text-[11px]">{node.name}</span>
    </div>
  )
}

export default function EditorPage() {
  const { id: projectId } = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const { getToken: getClerkToken } = useClerkAuth()
  const apiFetch = useApiFetch()
  const abortControllerRef = useRef<AbortController | null>(null)
  const workspaceTextareaRef = useRef<HTMLTextAreaElement>(null)

  const [prompt, setPrompt] = useState('')

  useEffect(() => {
    const textarea = workspaceTextareaRef.current
    if (textarea) {
      textarea.style.height = "auto"
      textarea.style.height = `${textarea.scrollHeight}px`
    }
  }, [prompt])

  const [project, setProject] = useState<any>(null)
  const [files, setFiles] = useState<Record<string, string>>({})
  const [activeFile, setActiveFile] = useState<string | null>(null)
  const [pendingReview, setPendingReview] = useState(false)
  const [lastGeneratedCount, setLastGeneratedCount] = useState(0)
  const [messages, setMessages] = useState<Message[]>([])
  const [selfHealAttempts, setSelfHealAttempts] = useState(0)
  const [isCreditsModalOpen, setIsCreditsModalOpen] = useState(false)
  
  // Multi-tab Open Files States
  const [openFiles, setOpenFiles] = useState<string[]>([])

  const handleSelectFile = (path: string) => {
    setActiveFile(path)
    if (!openFiles.includes(path)) {
      setOpenFiles((prev) => [...prev, path])
    }
  }

  const handleCloseFile = (path: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const newOpenFiles = openFiles.filter((f) => f !== path)
    setOpenFiles(newOpenFiles)
    if (activeFile === path) {
      if (newOpenFiles.length > 0) {
        setActiveFile(newOpenFiles[newOpenFiles.length - 1])
      } else {
        setActiveFile(null)
      }
    }
  }

  // Helper to map tab file icons
  const getFileIconForTabs = (fileName: string) => {
    if (fileName.endsWith('.json')) {
      return <span className="font-extrabold text-[10px] text-neutral-450 font-mono select-none shrink-0 w-3 text-center bg-neutral-900 px-0.5 rounded">{"{}"}</span>;
    }
    if (fileName.endsWith('.ts') || fileName.endsWith('.tsx')) {
      return <span className="font-extrabold text-[9px] text-[#0066cc] bg-[#0066cc]/10 px-0.5 rounded font-mono shrink-0 select-none">TS</span>;
    }
    if (fileName.endsWith('.js') || fileName.endsWith('.jsx') || fileName.endsWith('.mjs')) {
      return <span className="font-extrabold text-[9px] text-[#EAB308] bg-[#EAB308]/10 px-0.5 rounded font-mono shrink-0 select-none">JS</span>;
    }
    if (fileName.endsWith('.css')) {
      return <span className="font-extrabold text-[8px] text-[#06B6D4] bg-[#06B6D4]/10 px-0.5 rounded font-mono shrink-0 select-none">CSS</span>;
    }
    if (fileName.endsWith('.html')) {
      return <span className="font-extrabold text-[8px] text-[#E34F26] bg-[#E34F26]/10 px-0.5 rounded font-mono shrink-0 select-none">HTML</span>;
    }
    if (fileName.toLowerCase() === 'readme.md') {
      return <FileText className="w-3.5 h-3.5 text-neutral-400 shrink-0" />;
    }
    if (fileName === '.gitignore') {
      return (
        <svg viewBox="0 0 100 100" className="w-3 h-3 text-blue-500 shrink-0 fill-current">
          <polygon points="50,15 85,50 50,85 15,50" />
        </svg>
      );
    }
    return <FileCode className="w-3.5 h-3.5 text-neutral-400 shrink-0" />;
  };
  
  // Dynamic Iframe Scaling States
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [iframeScale, setIframeScale] = useState(0.875)
  const [iframeWidth, setIframeWidth] = useState(320)
  const [iframeHeight, setIframeHeight] = useState(390)
  const [status, setStatus] = useState<'idle' | 'generating' | 'previewing' | 'packaging' | 'failed'>('idle')
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({})
  
  // Preview States
  const [previewActive, setPreviewActive] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [previewLogs, setPreviewLogs] = useState<PreviewLog[]>([])
  const [previewScreenshot, setPreviewScreenshot] = useState<string | null>(null)
  const [previewTab, setPreviewTab] = useState<'status' | 'popup' | 'logs' | 'screenshot' | 'history'>('status')

  // Search / Command Palette States
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false)

  // Mapped command palette items for project workspace
  const commandItems = useMemo(() => {
    const baseItems = [
      {
        id: 'back-dashboard',
        label: 'Back to Dashboard',
        group: 'Navigation',
        icon: ArrowLeft,
        hint: 'G D',
        onSelect: () => {
          router.push('/')
        }
      },
      {
        id: 'download-zip',
        label: 'Download Extension (.zip)',
        group: 'Actions',
        icon: Download,
        hint: '⌘ D',
        onSelect: () => {
          handleDownload()
        }
      }
    ]

    // If generation is running, add Stop option
    if (status === 'generating') {
      baseItems.push({
        id: 'stop-generation',
        label: 'Stop Generation',
        group: 'Actions',
        icon: Square,
        hint: 'ESC',
        onSelect: () => {
          handleStopGeneration()
        }
      })
    }

    // Map all current project files dynamically so users can search & switch!
    const fileItems = Object.keys(files).map(filePath => ({
      id: `file-${filePath}`,
      label: `Open file: ${filePath}`,
      group: 'Files',
      icon: FileCode,
      onSelect: () => {
        handleSelectFile(filePath)
      }
    }))

    return [...baseItems, ...fileItems]
  }, [files, status, router])
  const [detectedError, setDetectedError] = useState<string | null>(null)
  const [popupBlobUrl, setPopupBlobUrl] = useState<string | null>(null)

  // History States
  const [historyList, setHistoryList] = useState<any[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  const chatEndRef = useRef<HTMLDivElement>(null)
  const logsEndRef = useRef<HTMLDivElement>(null)
  const eventSourceRef = useRef<EventSource | null>(null)

  // 1. Fetch project details, files, and messages
  useEffect(() => {
    async function initProject() {
      setLoading(true)
      setError('')

      try {
        const data = await apiFetch(`/api/projects/${projectId}`)
        setProject(data.project)
        setStatus(data.project.status as any)

        const filesMap: Record<string, string> = {}
        data.files.forEach((f: any) => {
          filesMap[f.path] = f.content
        })
        setFiles(filesMap)

        if (data.files && data.files.length > 0) {
          const hasManifest = data.files.find((f: any) => f.path === 'manifest.json')
          const initialFile = hasManifest ? 'manifest.json' : data.files[0].path
          setActiveFile(initialFile)
          setOpenFiles([initialFile])
        }

        setMessages(data.messages || [])
        setLoading(false)

        if ((!data.files || data.files.length === 0) && data.project.description) {
          handleTriggerInitialGeneration(data.project.description)
        }
      } catch (err: any) {
        setError(err.message || 'Project not found')
        setLoading(false)
      }
    }

    if (projectId && user) {
      initProject()
    }
  }, [projectId, user])

  // Scroll chat & logs to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [previewLogs])

  // 2. Compile Popup for Mock Shell (Frontend Preview)
  useEffect(() => {
    if (files['popup.html']) {
      const htmlContent = files['popup.html']
      const cssContent = files['popup.css'] || ''
      const jsContent = files['popup.js'] || ''

      const mockBrowserScript = `
        <script>
          window.browser = {
            runtime: {
              sendMessage: (msg) => {
                window.parent.postMessage({ 
                  type: 'MOCK_LOG', 
                  message: '[Runtime Message] Sent: ' + JSON.stringify(msg),
                  severity: 'log'
                }, '*');
                return Promise.resolve({ success: true, response: "Mock response" });
              },
              onMessage: {
                addListener: (cb) => {
                  window.parent.postMessage({ 
                    type: 'MOCK_LOG', 
                    message: '[Runtime] Registered onMessage listener',
                    severity: 'info'
                  }, '*');
                }
              },
              getURL: (path) => path
            },
            storage: {
              local: {
                get: (keys) => {
                  const data = {};
                  if (typeof keys === 'string') {
                    data[keys] = localStorage.getItem('mock_storage_' + keys);
                  } else if (Array.isArray(keys)) {
                    keys.forEach(k => data[k] = localStorage.getItem('mock_storage_' + k));
                  }
                  return Promise.resolve(data);
                },
                set: (items) => {
                  Object.entries(items).forEach(([k, v]) => {
                    localStorage.setItem('mock_storage_' + k, typeof v === 'object' ? JSON.stringify(v) : String(v));
                  });
                  window.parent.postMessage({ 
                    type: 'MOCK_LOG', 
                    message: '[Storage] Set: ' + JSON.stringify(items),
                    severity: 'log'
                  }, '*');
                  return Promise.resolve();
                },
                clear: () => {
                  localStorage.clear();
                  return Promise.resolve();
                }
              }
            },
            tabs: {
              query: () => Promise.resolve([{ id: 1, url: 'https://example.com', title: 'Example Page' }])
            }
          };

          const _log = console.log;
          const _err = console.error;
          console.log = (...args) => {
            _log(...args);
            window.parent.postMessage({ type: 'MOCK_LOG', message: '[Popup Console] ' + args.join(' '), severity: 'log' }, '*');
          };
          console.error = (...args) => {
            _err(...args);
            window.parent.postMessage({ type: 'MOCK_LOG', message: '[Popup Error] ' + args.join(' '), severity: 'error' }, '*');
          };

          window.addEventListener('error', (event) => {
            window.parent.postMessage({ 
              type: 'MOCK_LOG', 
              message: '[Popup Exception] ' + event.message, 
              severity: 'error' 
            }, '*');
          });
          window.addEventListener('unhandledrejection', (event) => {
            window.parent.postMessage({ 
              type: 'MOCK_LOG', 
              message: '[Popup Promise Rejection] ' + (event.reason ? event.reason.message || event.reason : 'Unknown reason'), 
              severity: 'error' 
            }, '*');
          });
        </script>
      `

      let inlined = htmlContent
        .replace('<head>', `<head>${mockBrowserScript}`)
        .replace(/<link[^>]*href=["'][^"']*popup\.css["'][^>]*>/gi, `<style>${cssContent}</style>`)
        .replace(/<script[^>]*src=["'][^"']*popup\.js["'][^>]*><\/script>/gi, `<script>${jsContent}</script>`)

      const blob = new Blob([inlined], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      setPopupBlobUrl(url)

      return () => {
        URL.revokeObjectURL(url)
      }
    } else {
      setPopupBlobUrl(null)
    }
  }, [files])

  // Listen to messages from popup iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'MOCK_LOG') {
        const newLog: PreviewLog = {
          type: 'log',
          message: event.data.message,
          severity: event.data.severity,
          timestamp: new Date().toISOString()
        }
        setPreviewLogs((prev) => [...prev, newLog])

        if (event.data.severity === 'error') {
          setDetectedError(event.data.message)
        }
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  // 3. Autosave manual edits in Monaco with 1-second debounce
  useEffect(() => {
    if (!activeFile || status === 'generating') return

    const timer = setTimeout(async () => {
      try {
        await apiFetch(`/api/projects/${projectId}/files`, {
          method: 'PUT',
          body: JSON.stringify({
            path: activeFile,
            content: files[activeFile]
          })
        })
      } catch (err) {
        console.error('Autosave failed:', err)
      }
    }, 1000)

    return () => clearTimeout(timer)
  }, [files[activeFile ?? '']])

  const handleToggleFolder = (path: string) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [path]: !prev[path],
    }))
  }

  async function handleTriggerInitialGeneration(initialDesc: string) {
    setTimeout(() => {
      handleSendMessage(undefined, initialDesc, true)
    }, 500)
  }

  async function handleSendMessage(e?: React.FormEvent, overridePrompt?: string, isInitial = false) {
    if (e) e.preventDefault()
    const activePrompt = overridePrompt || prompt
    if (!activePrompt.trim() || status === 'generating') return

    // Reset self-heal attempts if the user manually sent a message
    if (!overridePrompt) {
      setSelfHealAttempts(0)
    }

    setPrompt('')
    setStatus('generating')
    setDetectedError(null)

    if (!isInitial) {
      const userMessage: Message = {
        id: Math.random().toString(),
        role: 'user',
        content: activePrompt,
      }
      setMessages((prev) => [...prev, userMessage])
    }

    const assistantMessageId = Math.random().toString()
    setMessages((prev) => [
      ...prev,
      { id: assistantMessageId, role: 'assistant', content: '' }
    ])

    let accumulatedText = ''

    // Create new AbortController
    const controller = new AbortController()
    abortControllerRef.current = controller

    try {
      const token = await getClerkToken()
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000'}/api/ai/generate`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          projectId,
          prompt: activePrompt,
          files,
          history: messages.map((m) => ({ role: m.role, content: m.content, feedback: m.feedback }))
        }),
        signal: controller.signal
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errMsg = errorData.error || `HTTP error ${response.status}`;
        if (response.status === 403 || errMsg.toLowerCase().includes('credits') || errMsg.toLowerCase().includes('limit reached')) {
          setIsCreditsModalOpen(true)
        }
        throw new Error(errMsg);
      }

      if (!response.body) throw new Error('No response body')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      const processLine = (line: string) => {
        if (!line.startsWith('data: ')) return
        const dataStr = line.slice(6).trim()
        if (!dataStr) return

        try {
          const event = JSON.parse(dataStr)

          if (event.type === 'text') {
            accumulatedText += event.delta
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMessageId
                  ? { ...m, content: m.content + event.delta }
                  : m
              )
            )
          } else if (event.type === 'file_start') {
            setFiles((prev) => ({ ...prev, [event.path]: '' }))
            setActiveFile(event.path)
          } else if (event.type === 'file_chunk') {
            setFiles((prev) => ({
              ...prev,
              [event.path]: (prev[event.path] || '') + event.delta
            }))
          } else if (event.type === 'done') {
            setFiles(event.files)
            setStatus('idle')
            const modifiedCount = Object.keys(event.files).length
            setLastGeneratedCount(modifiedCount)
            setPendingReview(true)
          } else if (event.type === 'error') {
            setError(event.message)
            setStatus('failed')
          }
        } catch (err) {
          console.error('Error parsing event JSON:', err, dataStr)
        }
      }

      while (true) {
        const { value, done } = await reader.read()
        if (done) {
          if (buffer.trim()) {
            processLine(buffer)
          }
          break
        }

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          processLine(line)
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('Generation aborted by user.')
        return
      }
      console.error('Streaming error:', err)
      const errStr = String(err?.message || '')
      const isCreditError = 
        errStr.toLowerCase().includes('credits') || 
        errStr.toLowerCase().includes('limit reached') || 
        errStr.toLowerCase().includes('403')
      setError(err.message || 'Streaming failed')
      setStatus('failed')
      
      const errorMessage = isCreditError
        ? "⚠️ **Daily Build Credits Exhausted**\n\nYou have used your 5 free build credits for today. Please [upgrade your plan](/dashboard?tab=billing) to continue building and deploying extensions."
        : `❌ **Generation Failed**\n\nAn error occurred during response generation: \`${err.message || 'Unknown stream error'}\`. Please try again.`;

      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMessageId
            ? { ...m, content: errorMessage }
            : m
        )
      )
    } finally {
      abortControllerRef.current = null
    }
  }

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setStatus('idle')
  }

  const handleFeedback = async (messageId: string, type: 'liked' | 'disliked') => {
    // Update local state optimistically
    setMessages(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, feedback: type } : msg
    ))

    try {
      await apiFetch(`/api/projects/${projectId}/messages/${messageId}/feedback`, {
        method: 'POST',
        body: JSON.stringify({ feedback: type })
      })
    } catch (err) {
      console.error('Failed to save message feedback:', err)
    }
  }

  // 4. Launch Playwright Preview Runner
  const handleLaunchPreview = async () => {
    if (previewActive) {
      handleStopPreview()
      return
    }

    setPreviewActive(true)
    setPreviewTab('screenshot')
    setPreviewLogs([{
      type: 'status',
      message: 'Launching Playwright preview session on backend...',
      severity: 'info',
      timestamp: new Date().toISOString()
    }])
    setDetectedError(null)

    try {
      const data = await apiFetch(`/api/projects/${projectId}/preview`, {
        method: 'POST',
        body: JSON.stringify({ files })
      })

      setSessionId(data.sessionId)

      const eventSource = new EventSource(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000'}/api/preview/${data.sessionId}/logs`)
      eventSourceRef.current = eventSource

      eventSource.onmessage = (e) => {
        try {
          const event = JSON.parse(e.data)
          if (event.type === 'screenshot') {
            setPreviewScreenshot(`data:image/jpeg;base64,${event.data}`)
          } else {
            setPreviewLogs((prev) => [...prev, event])
            
            if (event.type === 'error' || event.severity === 'error') {
              setDetectedError(event.message || 'Runtime exception captured in browser context')
            }
          }
        } catch (err) {
          console.error('Error parsing preview log:', err)
        }
      }

      eventSource.onerror = (err) => {
        console.error('EventSource connection error:', err)
        eventSource.close()
      }

    } catch (err: any) {
      setPreviewActive(false)
      setPreviewLogs((prev) => [...prev, {
        type: 'error',
        message: `Failed to launch preview: ${err.message}`,
        severity: 'error',
        timestamp: new Date().toISOString()
      }])
    }
  }

  const handleStopPreview = async () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }

    if (sessionId) {
      apiFetch(`/api/preview/${sessionId}`, {
        method: 'DELETE'
      })
    }

    setPreviewActive(false)
    setSessionId(null)
    setPreviewScreenshot(null)
    setPreviewLogs((prev) => [...prev, {
      type: 'status',
      message: 'Preview session stopped',
      severity: 'warning',
      timestamp: new Date().toISOString()
    }])
  }

  // 5. Self-Healing Trigger
  const handleSelfHeal = () => {
    if (!detectedError) return
    setSelfHealAttempts((prev) => prev + 1)

    // Check if we have already sent a message containing this exact error
    const isRepeated = messages.some(
      (m) => m.role === 'user' && m.content.includes(detectedError)
    )

    let fixPrompt = `I encountered this runtime error during preview. Please fix it:\n"${detectedError}"`
    if (isRepeated) {
      fixPrompt += `\n\n⚠️ IMPORTANT: This error is persisting even after your previous attempt to fix it. Your previous approach failed. Do NOT repeat the same code changes or logic. Please analyze why it didn't work and try a completely different approach or workaround to resolve this.`
    }

    handleSendMessage(undefined, fixPrompt)
  }

  // Automatic Autonomous Self-Healing
  useEffect(() => {
    if (detectedError && status === 'idle' && selfHealAttempts < 3) {
      console.log(`[Autonomous Self-Healing] Auto-fixing error (Attempt ${selfHealAttempts + 1}/3):`, detectedError)
      
      const timer = setTimeout(() => {
        handleSelfHeal()
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [detectedError, status, selfHealAttempts])

  // Dynamic Iframe Measurement on Load
  const handleIframeLoad = () => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      try {
        const doc = iframeRef.current.contentDocument || iframeRef.current.contentWindow.document
        if (doc && doc.body) {
          // Force body height to fit content if not explicitly set
          const scrollWidth = doc.body.scrollWidth
          const scrollHeight = doc.body.scrollHeight
          
          const width = scrollWidth > 0 ? scrollWidth : 320
          const height = scrollHeight > 0 ? scrollHeight : 390
          
          setIframeWidth(width)
          setIframeHeight(height)
          
          // Calculate scale to fit 280px width and 342px height (370px - 28px header)
          const scale = Math.min(280 / width, 342 / height)
          setIframeScale(scale)
        }
      } catch (err) {
        console.error('Error reading iframe dimensions:', err)
      }
    }
  }

  // 6. Download Extension Package
  const handleDownload = async () => {
    try {
      setStatus('packaging')
      const response = await apiFetch('/api/download', {
        method: 'POST',
        body: JSON.stringify({ projectId, files }),
      })

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const manifest = JSON.parse(files['manifest.json'] || '{}')
      const name = manifest.name || 'extension'
      a.download = `${name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_extension.zip`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
      
      setStatus('idle')
    } catch (err: any) {
      console.error('Download error:', err)
      alert(`Download failed: ${err.message}`)
      setStatus('failed')
    }
  }

  // 7. Version History & Rollback
  const fetchHistory = async () => {
    setLoadingHistory(true)
    try {
      const data = await apiFetch(`/api/projects/${projectId}/history`)
      setHistoryList(data)
    } catch (err) {
      console.error('Error fetching history:', err)
    } finally {
      setLoadingHistory(false)
    }
  }

  const handleRollback = async (genId: string) => {
    if (!confirm('Are you sure you want to rollback? This will overwrite your current files in the workspace.')) return

    try {
      setStatus('generating')
      const data = await apiFetch(`/api/projects/${projectId}/history/${genId}/rollback`, {
        method: 'POST'
      })
      setFiles(data.files)
      
      if (data.files['manifest.json']) {
        setActiveFile('manifest.json')
      } else {
        const paths = Object.keys(data.files)
        if (paths.length > 0) setActiveFile(paths[0])
      }

      fetchHistory()
      
      // Fetch updated messages
      const projectData = await apiFetch(`/api/projects/${projectId}`)
      setMessages(projectData.messages || [])

      setStatus('idle')
      alert('Workspace successfully rolled back!')
    } catch (err: any) {
      console.error('Rollback error:', err)
      alert(`Rollback failed: ${err.message}`)
      setStatus('failed')
    }
  }

  const handleMonacoChange = (val: string | undefined) => {
    if (activeFile && val !== undefined) {
      setFiles((prev) => ({
        ...prev,
        [activeFile]: val,
      }))
    }
  }

  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
    }
  }, [])

  const fileTree = buildFileTree(files)

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-6 h-6 text-white animate-spin" />
        <p className="text-neutral-450 text-xs tracking-wide uppercase">Loading workspace...</p>
      </div>
    )
  }

  if (error && !project) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center space-y-4 text-center p-4">
        <AlertCircle className="w-10 h-10 text-neutral-400" />
        <h3 className="text-lg font-bold text-white">Workspace Error</h3>
        <p className="text-neutral-400 text-xs max-w-sm">{error}</p>
        <Link href="/dashboard" className="px-4 py-2 bg-neutral-900 border border-neutral-800 rounded-md text-xs font-medium hover:bg-neutral-850 transition-all text-white">
          Back to Dashboard
        </Link>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-black text-neutral-100 overflow-hidden">
      {/* Header */}
      <header className="h-14 border-b border-neutral-900 bg-[#09090A] flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center space-x-3">
          <Link
            href="/dashboard"
            className="p-2 hover:bg-neutral-900 border border-transparent text-neutral-400 hover:text-white rounded-md transition-all flex items-center justify-center cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="h-4 w-[1px] bg-neutral-850" />
          <div>
            <h1 className="font-bold text-sm text-white">{project?.name}</h1>
            <div className="flex items-center space-x-1.5 mt-0.5">
              <span className={`w-1.5 h-1.5 rounded-full ${
                status === 'generating' 
                  ? 'bg-purple-400 animate-pulse' 
                  : status === 'previewing'
                  ? 'bg-indigo-400 animate-pulse'
                  : 'bg-emerald-400'
              }`} />
              <span className="text-[10px] text-neutral-500 font-medium uppercase tracking-wider">
                {status === 'generating' 
                  ? 'Generating...' 
                  : status === 'previewing'
                  ? 'Previewing...'
                  : 'Ready'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsCommandPaletteOpen(true)}
            className="p-2 hover:bg-neutral-900 text-neutral-400 hover:text-white rounded-md transition-all flex items-center justify-center cursor-pointer"
            title="Search files & commands (Ctrl+J)"
          >
            <Search className="w-4 h-4" />
          </button>
          <button
            onClick={handleDownload}
            disabled={status === 'generating' || status === 'packaging'}
            className="px-3.5 py-1.5 bg-white hover:bg-neutral-200 active:scale-95 text-black font-bold rounded-md text-xs transition-all flex items-center space-x-1.5 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm border border-neutral-255 cursor-pointer"
            title="Download unpacked extension .zip"
          >
            {status === 'packaging' ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Zipping...</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5 text-black" />
                <span>Download</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* 4-Panel Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Panel 1: Chat (Width: 320px) */}
        <aside className="w-80 border-r border-neutral-900 flex flex-col bg-black shrink-0">
          <div className="p-4 border-b border-neutral-900 flex items-center justify-between shrink-0 bg-black">
            <h2 className="font-semibold text-xs text-neutral-200">Chrome Extension AI Build</h2>
            <div className="flex items-center text-neutral-400">
              <button title="Close" className="hover:text-white transition-colors" onClick={() => router.push('/dashboard')}>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col text-xs leading-relaxed break-words overflow-hidden ${
                  msg.role === 'user'
                    ? 'bg-neutral-900 border border-neutral-800 text-white rounded-xl p-3.5 ml-auto rounded-tr-none max-w-[85%] shadow-sm'
                    : 'bg-transparent border-b border-neutral-900/50 text-neutral-205 rounded-none py-4 px-1 mr-auto w-full max-w-full'
                }`}
              >
                <span className="font-semibold text-[10px] text-neutral-450 uppercase tracking-wider mb-1">
                  {msg.role === 'user' ? 'You' : 'Gemini Assistant'}
                </span>
                {msg.content ? (
                  <div className="space-y-2.5 break-words overflow-hidden">
                    <ReactMarkdown
                      components={{
                        p: ({node, ...props}) => <p className="leading-relaxed" {...props} />,
                        ul: ({node, ...props}) => <ul className="list-disc pl-4 space-y-1 my-1" {...props} />,
                        ol: ({node, ...props}) => <ol className="list-decimal pl-4 space-y-1 my-1" {...props} />,
                        li: ({node, ...props}) => <li className="text-neutral-300" {...props} />,
                        code: ({node, inline, className, children, ...props}: any) => {
                          return inline ? (
                            <code className="bg-neutral-955 text-neutral-100 px-1.5 py-0.5 rounded font-mono text-[10px] border border-neutral-850" {...props}>{children}</code>
                          ) : (
                            <code className="block bg-neutral-955 text-neutral-300 p-2.5 rounded-md font-mono text-[10px] border border-neutral-900 overflow-x-auto my-1.5" {...props}>{children}</code>
                          )
                        },
                        strong: ({node, ...props}) => <strong className="font-semibold text-white" {...props} />,
                        a: ({node, ...props}) => <a className="text-white underline hover:text-neutral-300" target="_blank" rel="noopener noreferrer" {...props} />,
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>

                    {/* Collapsible File Change Block (Only for Assistant Responses) */}
                    {msg.role === 'assistant' && (
                      <div className="mt-4">
                        <div className="flex items-center justify-between bg-neutral-900/40 border border-neutral-900 rounded-lg p-2.5 text-[11px] text-neutral-300 shadow-sm">
                          <div className="flex items-center space-x-2">
                            <FileCode className="w-3.5 h-3.5 text-neutral-450" />
                            <span className="font-medium">1 file changed</span>
                            <span className="text-emerald-500 font-semibold font-mono">+13</span>
                            <span className="text-red-500 font-semibold font-mono">-3</span>
                          </div>
                          <button className="px-2.5 py-1 bg-neutral-950 border border-neutral-850 rounded text-[10px] font-semibold text-neutral-200 hover:bg-neutral-900 flex items-center space-x-1.5 transition-all">
                            <FileText className="w-3 h-3" />
                            <span>Review</span>
                          </button>
                        </div>
                        {/* Feedback Actions */}
                        <div className="mt-3.5 flex items-center space-x-3.5 text-neutral-550 pl-1">
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(msg.content)
                            }}
                            className="hover:text-neutral-300 transition-colors" 
                            title="Copy response"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => handleFeedback(msg.id, 'liked')}
                            className={`hover:text-neutral-300 transition-colors ${msg.feedback === 'liked' ? 'text-emerald-555 hover:text-emerald-400' : ''}`} 
                            title="Helpful"
                          >
                            <ThumbsUp className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => handleFeedback(msg.id, 'disliked')}
                            className={`hover:text-neutral-300 transition-colors ${msg.feedback === 'disliked' ? 'text-red-555 hover:text-red-400' : ''}`} 
                            title="Unhelpful"
                          >
                            <ThumbsDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  status === 'generating' && msg.id === messages[messages.length - 1].id && (
                    <div className="mt-2 text-left">
                      <AgentsThinkingBadge label="Agent is writing code..." count={4} />
                    </div>
                  )
                )}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Self-Healing Banner */}
          {detectedError && status !== 'generating' && (
            <div className="mx-4 mb-3 p-3.5 bg-neutral-955 border border-neutral-900 text-neutral-200 rounded-lg flex flex-col space-y-2.5 shadow-md">
              <div className="flex items-start space-x-2 text-xs">
                <AlertCircle className="w-4 h-4 text-red-550 shrink-0 mt-0.5" />
                <span className="line-clamp-2 font-medium">Error: {detectedError}</span>
              </div>
              <button
                onClick={handleSelfHeal}
                className="w-full py-2 bg-white hover:bg-neutral-200 text-black text-xs font-bold rounded-md flex items-center justify-center space-x-1.5 transition-all shadow-sm"
              >
                <Wrench className="w-3.5 h-3.5 text-black" />
                <span>Fix with AI</span>
              </button>
            </div>
          )}

          {/* Accept / Reject PR-style Review Bar */}
          {pendingReview && (
            <div className="mx-4 mb-3 bg-neutral-950 border border-neutral-900 rounded-lg p-2.5 flex items-center justify-between text-[11px] text-neutral-300 shadow-md animate-fade-in">
              <div className="flex items-center space-x-2.5">
                <ArrowLeft className="w-3 h-3 text-neutral-550 cursor-pointer hover:text-white" onClick={() => setPendingReview(false)} />
                <FileCode className="w-3.5 h-3.5 text-neutral-450" />
                <span className="font-mono text-neutral-400">{lastGeneratedCount || 1} File...</span>
              </div>
              <div className="flex items-center space-x-2.5">
                <button 
                  onClick={() => setPendingReview(false)}
                  className="text-neutral-400 hover:text-white transition-colors px-2 py-1 hover:bg-neutral-900 rounded font-medium"
                >
                  Reject all
                </button>
                <button 
                  onClick={() => setPendingReview(false)}
                  className="bg-[#0066cc] hover:bg-[#0052a3] text-white rounded px-3 py-1 font-semibold transition-all shadow-sm"
                >
                  Accept all
                </button>
              </div>
            </div>
          )}

          <form onSubmit={(e) => handleSendMessage(e)} className="p-4 border-t border-neutral-900 shrink-0 bg-black">
            <div className="bg-neutral-955 border border-neutral-900 rounded-xl p-2.5 flex flex-col space-y-2 shadow-sm relative">
              <div className="relative w-full">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSendMessage()
                    }
                  }}
                  disabled={status === 'generating'}
                  placeholder="Ask to modify or add features..."
                  rows={2}
                  className="w-full bg-transparent text-white placeholder-neutral-550 text-xs focus:outline-none resize-none max-h-24 overflow-y-auto px-1.5 pt-1 pr-8"
                />
                {prompt.trim() && (
                  <div className="absolute right-1.5 top-1.5 pointer-events-none">
                    <PixelOrb size={14} grid={5} speed={4} orbitSpeed={3} />
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between border-t border-neutral-900/60 pt-2.5 px-1">
                <div />
                {/* Right Side: Microphone and Send Button */}
                <div className="flex items-center space-x-2">
                  <button type="button" className="p-1 hover:bg-neutral-900 rounded text-neutral-455 hover:text-white transition-all">
                    <Mic className="w-3.5 h-3.5" />
                  </button>
                  {status === 'generating' ? (
                    <button
                      type="button"
                      onClick={handleStopGeneration}
                      className="p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-full transition-all flex items-center justify-center shadow-md animate-pulse"
                      title="Stop generating"
                    >
                      <Square className="w-3.5 h-3.5 fill-white text-white" />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={!prompt.trim()}
                      className="p-1.5 bg-[#0066cc] hover:bg-[#0052a3] disabled:bg-neutral-900 text-white disabled:text-neutral-600 rounded-full transition-all flex items-center justify-center"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </form>
        </aside>

        {/* Panel 2: File Tree (Width: 220px) */}
        <aside className="w-56 border-r border-neutral-900 flex flex-col bg-[#070708] shrink-0">

          <div className="flex-1 overflow-y-auto p-3 space-y-0.5">
            {fileTree.length === 0 ? (
              <div className="text-center text-slate-500 text-xs mt-8">Empty workspace</div>
            ) : (
              fileTree.map((node) => (
                <FileTreeNode
                  key={node.path}
                  node={node}
                  activeFile={activeFile}
                  onSelectFile={handleSelectFile}
                  expandedFolders={expandedFolders}
                  onToggleFolder={handleToggleFolder}
                />
              ))
            )}
          </div>
        </aside>

        {/* Panel 3: Monaco Editor (Flex-1) */}
        <main className="flex-1 flex flex-col bg-[#09090A] min-w-0">
          {/* Open Tabs Bar */}
          <div className="h-10 border-b border-neutral-900 bg-black flex items-center shrink-0 select-none overflow-x-auto gap-px scrollbar-none">
            {openFiles.map((path) => {
              const isActive = activeFile === path
              const fileName = path.split('/').pop() || ''
              return (
                <div
                  key={path}
                  onClick={() => handleSelectFile(path)}
                  className={`flex items-center space-x-2.5 px-4 h-full text-xs font-bold cursor-pointer border-r border-neutral-900 transition-colors relative shrink-0 ${
                    isActive 
                      ? 'bg-[#09090A] text-white border-t border-t-[#0066cc]' 
                      : 'bg-black text-neutral-450 hover:bg-neutral-900/40 hover:text-neutral-200'
                  }`}
                >
                  {/* File Icon */}
                  {getFileIconForTabs(fileName)}
                  <span>{fileName}</span>
                  <button
                    onClick={(e) => handleCloseFile(path, e)}
                    className="p-0.5 rounded-md hover:bg-neutral-850 hover:text-white transition-colors"
                  >
                    <X className="w-3 h-3 text-neutral-500 hover:text-neutral-350" />
                  </button>
                </div>
              )
            })}
          </div>

          {/* Breadcrumbs Bar */}
          {activeFile && (
            <div className="h-7 bg-[#09090A] border-b border-neutral-900 flex items-center px-4 text-[10px] text-neutral-500 font-semibold select-none gap-1.5 shrink-0 overflow-x-auto scrollbar-none">
              <span className="text-neutral-500">extension</span>
              {activeFile.split('/').map((seg, idx, arr) => {
                const isLast = idx === arr.length - 1
                return (
                  <React.Fragment key={idx}>
                    <span className="text-neutral-600 font-normal">&gt;</span>
                    <div className="flex items-center gap-1">
                      {!isLast && <Folder className="w-3 h-3 text-neutral-650 shrink-0" />}
                      {isLast && getFileIconForTabs(seg)}
                      <span className={isLast ? 'text-neutral-350 font-bold' : 'text-neutral-550'}>
                        {seg}
                      </span>
                    </div>
                  </React.Fragment>
                )
              })}
            </div>
          )}

          <div className="flex-1 min-h-0 bg-[#09090A]">
            {activeFile ? (
              <Editor
                height="100%"
                theme="luminos-theme"
                language={
                  activeFile.endsWith('.html') 
                    ? 'html' 
                    : activeFile.endsWith('.css') 
                    ? 'css' 
                    : activeFile.endsWith('.json') 
                    ? 'json' 
                    : 'javascript'
                }
                value={files[activeFile] || ''}
                onChange={handleMonacoChange}
                beforeMount={(monaco) => {
                  monaco.editor.defineTheme('luminos-theme', {
                    base: 'vs-dark',
                    inherit: true,
                    rules: [
                      { token: 'keyword', foreground: 'D9AC34', fontStyle: 'bold' },
                      { token: 'storage', foreground: 'D9AC34', fontStyle: 'bold' },
                      { token: 'type', foreground: 'D34D97' },
                      { token: 'string', foreground: 'D34D97' },
                      { token: 'comment', foreground: '666666', fontStyle: 'italic' },
                      { token: 'number', foreground: '569CD6' },
                      { token: 'delimiter', foreground: 'D9AC34' },
                    ],
                    colors: {
                      'editor.background': '#09090A',
                      'editor.foreground': '#D4D4D8',
                      'editor.lineHighlightBackground': '#141416',
                      'editorGutter.background': '#09090A',
                      'editor.selectionBackground': '#2A2A2E',
                      'editorLineNumber.foreground': '#52525B',
                      'editorLineNumber.activeForeground': '#E4E4E7',
                      'scrollbarSlider.background': '#18181B40',
                      'scrollbarSlider.hoverBackground': '#27272A60',
                    }
                  })
                }}
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  lineNumbers: 'on',
                  roundedSelection: false,
                  scrollBeyondLastLine: false,
                  readOnly: status === 'generating',
                  fontFamily: 'Consolas, "Fira Code", "Courier New", monospace',
                  lineHeight: 20,
                  cursorBlinking: 'smooth',
                }}
              />
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-neutral-600 space-y-2">
                <Code className="w-6 h-6 text-neutral-800" />
                <span className="text-[11px] tracking-tight">Select a file to start editing</span>
              </div>
            )}
          </div>
        </main>
        <aside className="w-80 border-l border-neutral-900 flex flex-col bg-black shrink-0 overflow-hidden">
          {/* Top Section: Popup UI */}
          <div className="h-[440px] border-b border-neutral-900 flex flex-col overflow-hidden bg-black">
            <div className="h-8 border-b border-neutral-900 bg-black px-3 flex items-center justify-between shrink-0 select-none">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 flex items-center space-x-1.5">
                <Eye className="w-3 h-3 text-neutral-400" />
                <span>Popup UI</span>
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>

            <div className="flex-1 flex items-center justify-center p-4 min-h-0 overflow-hidden bg-black">
              {popupBlobUrl ? (
                <div className="w-[280px] h-[370px] border border-neutral-900 rounded-xl bg-black flex flex-col overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.85)]">
                  {/* Mac-style Window Header */}
                  <div className="h-7 bg-neutral-950 border-b border-neutral-900 px-3 flex items-center shrink-0 relative">
                    {/* Left: Window Controls */}
                    <div className="flex items-center space-x-1.5 z-10">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f56] opacity-90" />
                      <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e] opacity-90" />
                      <div className="w-2.5 h-2.5 rounded-full bg-[#27c93f] opacity-90" />
                    </div>
                    {/* Center: Window Title */}
                    <div className="absolute inset-0 flex items-center justify-center text-[9px] text-neutral-500 font-mono font-medium tracking-tight">
                      {project?.name ? `${project.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_popup.html` : 'popup.html'}
                    </div>
                  </div>
                  <div className="flex-1 w-full bg-[#09090A] overflow-hidden relative">
                    {status === 'generating' ? (
                      <div className="absolute inset-0 bg-[#09090A] flex flex-col items-center justify-center p-6 text-center select-none">
                        <div className="w-9 h-9 rounded-full bg-purple-500/10 flex items-center justify-center mb-5 animate-pulse">
                          <Sparkles className="w-4 h-4 text-purple-400 animate-spin" style={{ animationDuration: '4s' }} />
                        </div>
                        <p className="text-xs text-neutral-300 font-medium italic leading-relaxed max-w-[200px]">
                          "Your extension is under building. Every line of code brings ideas to life."
                        </p>
                        <div className="mt-5 flex items-center space-x-1.5 justify-center">
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-ping" />
                          <span className="text-[9px] text-neutral-500 font-bold uppercase tracking-wider">AI Builder Active</span>
                        </div>
                      </div>
                    ) : (
                      <iframe 
                        key={popupBlobUrl}
                        ref={iframeRef}
                        src={popupBlobUrl} 
                        onLoad={handleIframeLoad}
                        className="absolute top-0 left-0 border-none origin-top-left"
                        scrolling="no"
                        style={{ 
                          width: `${iframeWidth}px`, 
                          height: `${iframeHeight}px`, 
                          transform: `scale(${iframeScale})`,
                          overflow: 'hidden' 
                        }}
                        sandbox="allow-scripts allow-same-origin"
                      />
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center text-neutral-650 text-xs py-4">
                  <Eye className="w-5 h-5 mx-auto text-neutral-800 mb-1" />
                  No `popup.html` found
                </div>
              )}
            </div>
          </div>

          {/* Bottom Section: Live Logs */}
          <div className="flex-1 flex flex-col overflow-hidden bg-black">
            <div className="h-8 border-b border-neutral-900 bg-black px-3 flex items-center justify-between shrink-0">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 flex items-center space-x-1.5">
                <Terminal className="w-3 h-3 text-neutral-400" />
                <span>Live Logs</span>
              </span>
              <button 
                onClick={() => setPreviewLogs([])}
                className="text-[9px] text-neutral-450 hover:text-white transition-all font-semibold uppercase tracking-wider"
              >
                Clear
              </button>
            </div>
            <div className="flex-1 p-3 overflow-y-auto font-mono text-[10px] text-slate-400 space-y-2.5 scrollbar-thin">
              {previewLogs.length === 0 ? (
                <div className="text-neutral-750 font-sans">[System] No console logs captured yet.</div>
              ) : (
                previewLogs.map((log, idx) => (
                  <div 
                    key={idx} 
                    className={`leading-relaxed break-all p-1.5 rounded border ${
                      log.severity === 'error' || log.type === 'error'
                        ? 'text-red-400 bg-red-955/20 border-red-900/30' 
                        : log.severity === 'warning' 
                        ? 'text-yellow-400 bg-yellow-955/20 border-yellow-900/30' 
                        : 'text-neutral-250 bg-neutral-950/40 border-neutral-900/50'
                    }`}
                  >
                    <span className="text-neutral-500 mr-1.5 font-sans text-[9px]">
                      [{new Date(log.timestamp).toLocaleTimeString()}]
                    </span>
                    {log.message}
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>
      </div>

      <CommandPalette
        open={isCommandPaletteOpen}
        onOpenChange={setIsCommandPaletteOpen}
        items={commandItems}
      />

      {isCreditsModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-950 border border-neutral-900 w-full max-w-sm rounded-2xl shadow-2xl p-6 text-center relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Close Button */}
            <button
              onClick={() => setIsCreditsModalOpen(false)}
              className="absolute top-4 right-4 p-1 hover:bg-neutral-900 text-neutral-500 hover:text-white rounded-lg transition-all"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Glowing Icon */}
            <div className="w-12 h-12 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto mb-4 shadow-[0_0_20px_rgba(168,85,247,0.15)]">
              <Zap className="w-5 h-5 text-purple-400 fill-purple-400/20 animate-pulse" />
            </div>

            {/* Title & Description */}
            <h3 className="text-base font-bold text-white mb-2">Daily Credits Exhausted</h3>
            <p className="text-neutral-450 text-xs leading-relaxed mb-6">
              You have completed all 5 of your free daily extension builds. Upgrade to the Pro plan for unlimited generations, advanced AI capabilities, and immediate previews.
            </p>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <Link
                href="/dashboard?tab=billing"
                className="w-full py-2.5 bg-purple-600 hover:bg-purple-550 active:scale-98 text-white text-xs font-bold rounded-xl flex items-center justify-center space-x-1.5 transition-all shadow-md shadow-purple-950/40"
              >
                <Zap className="w-3.5 h-3.5 fill-white text-white" />
                <span>Upgrade to Pro Plan</span>
              </Link>
              <button
                onClick={() => setIsCreditsModalOpen(false)}
                className="w-full py-2.5 bg-transparent hover:bg-neutral-900 text-neutral-400 hover:text-neutral-200 text-xs font-semibold rounded-xl transition-all border border-neutral-900"
              >
                Keep Editing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
