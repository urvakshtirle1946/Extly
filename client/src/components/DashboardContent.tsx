'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { useApiFetch } from '@/utils/api'
import { UserProfile } from '@clerk/nextjs'
import { 
  Plus, 
  Trash2, 
  Code, 
  FolderOpen, 
  AlertCircle, 
  Loader2, 
  LogOut, 
  Clock,
  X,
  Search,
  BookOpen,
  Link2,
  Grid,
  Star,
  User,
  Users,
  Gift,
  Zap,
  ChevronDown,
  Mic,
  ArrowUp,
  ArrowRight,
  Inbox,
  ChevronRight,
  Eye,
  Settings,
  Command,
  PanelLeftClose,
  MapPin,
  Share2,
  FileText,
  Mail,
  ExternalLink,
  Home,
  Key,
  Lock
} from 'lucide-react'
import { InteractiveFolderGallery } from '@/components/ui/interactive-folder-gallery'
import { PromptInputBox } from '@/components/ui/ai-prompt-box'
import { SidebarNav } from '@/components/ui/dashboard-sidebar'
import { CommandPalette } from '@/components/ui/be-ui-command-palette'
import BillingPage from '@/components/BillingPage'

interface Project {
  id: string
  name: string
  description: string
  status: string
  created_at: string
  updated_at: string
}

interface Template {
  id: string
  name: string
  description: string
  icon: string
  files: Record<string, string>
}

const TEMPLATES: Template[] = [
  {
    id: 'blank',
    name: 'Blank',
    description: 'Describe your extension from scratch.',
    icon: '📄',
    files: {},
  },
  {
    id: 'popup',
    name: 'Popup Utility',
    description: 'Toolbar popup UI with localStorage settings.',
    icon: '🎯',
    files: {
      'manifest.json': `{
  "manifest_version": 3,
  "name": "My Popup Extension",
  "version": "1.0.0",
  "description": "A beautiful popup utility.",
  "action": {
    "default_popup": "popup.html"
  },
  "permissions": ["storage"]
}`,
      'popup.html': `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Popup</title>
  <style>
    body {
      width: 240px;
      padding: 16px;
      background-color: #0f172a;
      color: #f8fafc;
      font-family: system-ui, sans-serif;
    }
    button {
      width: 100%;
      padding: 8px;
      background-color: #6366f1;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
    }
    button:hover {
      background-color: #4f46e5;
    }
  </style>
</head>
<body>
  <h3>Popup Utility</h3>
  <p style="font-size: 12px; color: #94a3b8;">Click below to trigger action.</p>
  <button id="click-btn">Click Me</button>
  <p id="msg" style="font-size: 11px; color: #6366f1; text-align: center; margin-top: 8px;"></p>
  <script src="popup.js"></script>
</body>
</html>`,
      'popup.js': `document.getElementById('click-btn').addEventListener('click', async () => {
  const msg = document.getElementById('msg');
  msg.textContent = 'Action triggered!';
  await browser.storage.local.set({ lastClick: new Date().toISOString() });
  console.log('Button clicked in popup');
});`
    }
  },
  {
    id: 'content_script',
    name: 'Page Injector',
    description: 'Injects scripts to modify DOM/styling on pages.',
    icon: '💉',
    files: {
      'manifest.json': `{
  "manifest_version": 3,
  "name": "Page Injector",
  "version": "1.0.0",
  "description": "Injects content script into all pages.",
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"]
    }
  ],
  "permissions": ["activeTab"]
}`,
      'content.js': `console.log("Promptex Page Injector active!");
const div = document.createElement('div');
div.style.cssText = 'position: fixed; bottom: 10px; right: 10px; background: #6366f1; color: white; padding: 8px; border-radius: 6px; font-size: 12px; z-index: 99999;';
div.textContent = 'Page Injector Active';
document.body.appendChild(div);`
    }
  },
  {
    id: 'options',
    name: 'Options Page',
    description: 'Includes a dedicated configuration/settings page.',
    icon: '⚙️',
    files: {
      'manifest.json': `{
  "manifest_version": 3,
  "name": "Options Extension",
  "version": "1.0.0",
  "options_page": "options.html",
  "permissions": ["storage"]
}`,
      'options.html': `<!DOCTYPE html>
<html>
<head>
  <title>Settings</title>
  <style>
    body {
      font-family: sans-serif;
      padding: 24px;
      background: #0f172a;
      color: white;
    }
  </style>
</head>
<body>
  <h2>Settings</h2>
  <label>Theme Color: <input type="color" id="theme-picker"></label>
  <button id="save" style="margin-top: 10px; display: block;">Save</button>
  <script src="options.js"></script>
</body>
</html>`,
      'options.js': `document.getElementById('save').addEventListener('click', async () => {
  const val = document.getElementById('theme-picker').value;
  await browser.storage.local.set({ themeColor: val });
  alert('Settings saved!');
});`
    }
  }
]

export default function DashboardContent() {
  const router = useRouter()
  const { user, logout } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [userPlan, setUserPlan] = useState('free')

  useEffect(() => {
    async function getPlan() {
      try {
        const data = await apiFetch('/api/usage')
        setUserPlan(data.plan || 'free')
      } catch (err) {
        console.error('Failed to load usage details:', err)
      }
    }
    getPlan()
  }, [])

  const [loading, setLoading] = useState(true)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [creating, setCreating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  
  // Quick Prompt Idea State
  const [quickPrompt, setQuickPrompt] = useState('')
  const [activeTab, setActiveTab] = useState<'projects' | 'recent' | 'gallery'>('projects')
  
  // Sidebar Nav States
  const [sidebarActiveId, setSidebarActiveId] = useState('home')
  const [activeWorkspace, setActiveWorkspace] = useState('')
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false)
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const tab = params.get('tab')
      if (tab === 'billing') {
        setSidebarActiveId('billing')
      } else if (tab === 'settings') {
        setSidebarActiveId('settings')
      }
    }
  }, [])

  const handleSidebarSelect = (id: string) => {
    if (id === 'logout') {
      logout()
    } else if (id === 'search') {
      setIsCommandPaletteOpen(true)
    } else if (id === 'home') {
      setActiveTab('projects')
      setSidebarActiveId('home')
    } else if (id.startsWith('project-')) {
      const projectId = id.replace('project-', '')
      router.push(`/projects/${projectId}`)
    } else {
      setSidebarActiveId(id)
    }
  }

  // Populate command palette items
  const apiFetch = useApiFetch()

  const commandItems = useMemo(() => {
    const baseItems = [
      {
        id: 'home',
        label: 'Go to Home',
        group: 'Navigation',
        icon: Home,
        hint: 'G H',
        onSelect: () => {
          setActiveTab('projects')
          setSidebarActiveId('home')
        }
      },
      {
        id: 'profile',
        label: 'Open Urvaksh Tirle Profile',
        group: 'Navigation',
        icon: User,
        hint: 'G P',
        onSelect: () => {
          setSidebarActiveId('t-urvaksh')
        }
      },
      {
        id: 'settings',
        label: 'Open Settings',
        group: 'Navigation',
        icon: Settings,
        hint: 'G S',
        onSelect: () => {
          setSidebarActiveId('settings')
        }
      },
    ]

    const projectItems = projects.map(p => ({
      id: `project-${p.id}`,
      label: `Open project: ${p.name}`,
      group: 'Projects',
      icon: FolderOpen,
      onSelect: () => {
        router.push(`/projects/${p.id}`)
      }
    }))

    return [...baseItems, ...projectItems]
  }, [projects, router])

  // Fetch projects on mount
  useEffect(() => {
    async function loadProjects() {
      try {
        const data = await apiFetch('/api/projects')
        setProjects(data)
      } catch (err: any) {
        console.error('Failed to load projects:', err)
        setError(err.message || 'Failed to load projects')
      } finally {
        setLoading(false)
      }
    }
    if (user) {
      loadProjects()
    }
  }, [user])

  const handleQuickCreateFromMessage = async (
    message: string,
    useByok: boolean = false,
    byokProvider: string = 'openrouter',
    byokApiKey: string = ''
  ) => {
    if (!message.trim()) return

    if (userPlan !== 'pro' && userPlan !== 'business' && projects.length >= 3) {
      alert('Free tier limit reached: You can only create up to 3 projects. Please upgrade your plan in the Billing section to create more projects.')
      return
    }

    setCreating(true)
    setError('')

    try {
      // Strip any special prefixes like [Search], [Think], [Canvas]
      const cleanDescription = message.replace(/^\[(Search|Think|Canvas)\]\s*/, '')
      
      // Auto-generate a name from the prompt
      const generatedName = cleanDescription
        .split(' ')
        .slice(0, 3)
        .join('-')
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '') || 'my-extension'

      const project = await apiFetch('/api/projects', {
        method: 'POST',
        body: JSON.stringify({
          name: generatedName,
          description: message,
          template: 'Blank',
          files: {},
          workspace_type: useByok ? 'byok' : 'standard',
          byok_provider: useByok ? byokProvider : null,
          byok_api_key: useByok ? byokApiKey : null
        })
      })

      router.push(`/projects/${project.id}`)
    } catch (err: any) {
      setError(err.message || 'Failed to create project')
      setCreating(false)
    }
  }

  const handleDeleteProject = async (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()

    if (!confirm('Are you sure you want to delete this project?')) return

    setDeletingId(projectId)

    try {
      await apiFetch(`/api/projects/${projectId}`, {
        method: 'DELETE'
      })
      setProjects(projects.filter(p => p.id !== projectId))
    } catch (err: any) {
      alert('Error deleting project: ' + err.message)
    } finally {
      setDeletingId(null)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const userDisplayName = user?.email ? user.email.split('@')[0] : 'Developer'
  const userInitials = userDisplayName.substring(0, 2).toUpperCase()

  return (
    <div className="min-h-screen bg-black text-neutral-100 flex overflow-hidden font-sans relative">
      
      {/* 1. Left Sidebar (New SidebarNav Component with Collapsible Transition) */}
      <div 
        className={`h-screen transition-all duration-300 ease-in-out shrink-0 overflow-hidden relative z-10 ${
          isSidebarOpen ? 'w-[260px] opacity-100' : 'w-0 opacity-0'
        }`}
      >
        <SidebarNav 
          className="w-[260px] h-full"
          activeId={sidebarActiveId}
          onSelect={handleSidebarSelect}
          activeWorkspace={activeWorkspace}
          onWorkspaceSelect={setActiveWorkspace}
          userEmail={user?.email}
          projects={projects}
        />
      </div>

      {/* 2. Main Content Area (Island Card Wrapper) */}
      <div className="flex-1 flex flex-col h-[calc(100vh-16px)] m-2 rounded-2xl border border-neutral-900/60 bg-neutral-950/20 backdrop-blur-[2px] relative overflow-hidden z-10">
        
        {/* Hero Video Background (matches landing page) */}
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden bg-black">
          <video
            ref={videoRef}
            src="/Hero.mp4"
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover opacity-60"
          />
        </div>

        {/* Scrollable Content Container */}
        <main className="flex-1 overflow-y-auto relative z-10 flex flex-col h-full">

        {/* Top Header Actions */}
        <header className="h-14 flex items-center justify-between px-8 relative z-10 shrink-0">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 bg-neutral-950/80 hover:bg-neutral-900 border border-neutral-900/80 text-neutral-300 hover:text-white rounded-xl shadow-md transition-all flex items-center justify-center"
            title={isSidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
          >
            <PanelLeftClose className={`w-[16px] h-[16px] transition-transform duration-300 ${!isSidebarOpen ? 'rotate-180' : ''}`} strokeWidth={1.5} />
          </button>
          <div className="flex items-center space-x-3">
          </div>
        </header>

        {sidebarActiveId !== 'home' ? (
          sidebarActiveId === 't-urvaksh' ? (
            /* Urvaksh Tirle's Native React Profile Page */
            <div className="flex-1 overflow-y-auto p-8 md:p-12 relative z-10 max-w-4xl w-full mx-auto bg-black/60 border border-neutral-900/60 backdrop-blur-md rounded-3xl my-6 shadow-2xl">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12">
                
                {/* Left Column */}
                <div className="md:col-span-4 flex flex-col items-center md:items-start text-center md:text-left space-y-6">
                  {/* Custom SVG Avatar */}
                  <div className="relative">
                    <svg viewBox="0 0 100 100" className="w-28 h-28 rounded-full border border-neutral-800 bg-white shadow-xl shadow-white/5">
                      {/* Hair */}
                      <path d="M 15,48 C 15,15 85,15 85,48 C 80,38 70,28 50,33 C 30,28 20,38 15,48 Z" fill="#171717" />
                      {/* Eyes */}
                      <circle cx="42" cy="54" r="3.5" fill="#171717" />
                      <circle cx="58" cy="54" r="3.5" fill="#171717" />
                      {/* Smile */}
                      <path d="M 44,65 Q 50,69 56,65" stroke="#171717" strokeWidth="3" strokeLinecap="round" fill="none" />
                    </svg>
                  </div>

                  {/* Name and Tagline */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-center md:justify-start gap-2">
                      <h2 className="text-2xl font-bold text-white tracking-tight">Urvaksh Tirle</h2>
                      {/* Verified Badge */}
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#3b82f6" stroke="#000000" strokeWidth="1.5" className="w-5 h-5 text-blue-500">
                        <path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z" />
                        <path d="m9 12 2 2 4-4" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                      </svg>
                    </div>
                    
                    <p className="text-sm font-semibold text-neutral-200 tracking-wide max-w-[240px]">
                      FINALIST @SIH2025 | 3x Hack Winner
                    </p>

                    <div className="flex items-center justify-center md:justify-start gap-1.5 text-xs font-semibold text-neutral-300">
                      <MapPin className="w-4 h-4 text-purple-400" />
                      <span>Indore, MP</span>
                    </div>
                  </div>

                  {/* Socials */}
                  <div className="flex items-center justify-center md:justify-start gap-5 text-neutral-400 pt-2">
                    <a href="https://www.linkedin.com/in/urvaksh-tirle-772601297/" target="_blank" rel="noreferrer" className="hover:text-white hover:scale-110 transition-all duration-200">
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.779-1.75-1.75s.784-1.75 1.75-1.75 1.75.779 1.75 1.75-.784 1.75-1.75 1.75zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                      </svg>
                    </a>
                    <a href="https://github.com/urvakshtirle1946" target="_blank" rel="noreferrer" className="hover:text-white hover:scale-110 transition-all duration-200">
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                      </svg>
                    </a>
                    <a href="mailto:urvakshtirle@gmail.com" className="hover:text-white hover:scale-110 transition-all duration-200">
                      <Mail className="w-5 h-5" />
                    </a>
                  </div>
                </div>

                {/* Right Column */}
                <div className="md:col-span-8 space-y-10">
                  {/* About Me */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-neutral-350 tracking-wider uppercase">About Me</h3>
                    <p className="text-[13px] leading-relaxed text-neutral-200 italic font-medium">
                      "Hello World! I’m a dedicated Full-Stack Developer with a passion for creating innovative digital solutions. With over 5 months of experience in web development, I specialize in building scalable, user-friendly applications that solve real-world problems."
                    </p>
                  </div>

                  {/* Experience */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-neutral-350 tracking-wider uppercase">Experience</h3>
                    <div className="relative border-l border-neutral-900 pl-5 ml-2.5 space-y-6">
                      {/* Experience Item 1 */}
                      <div className="relative">
                        {/* Bullet point */}
                        <div className="absolute -left-[26.5px] top-1.5 w-3 h-3 rounded-full bg-white border-2 border-neutral-950" />
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            <h4 className="text-sm font-bold text-white">Software Developer Intern</h4>
                            <p className="text-xs font-semibold text-neutral-300">Bhoomy Informtics Pvt. Ltd.</p>
                          </div>
                          <span className="text-[10px] font-bold text-neutral-200 bg-neutral-900/80 border border-neutral-800/80 px-2.5 py-0.5 rounded-full whitespace-nowrap">
                            2025 Jul - December
                          </span>
                        </div>
                      </div>

                      {/* Experience Item 2 */}
                      <div className="relative">
                        {/* Bullet point */}
                        <div className="absolute -left-[26.5px] top-1.5 w-3 h-3 rounded-full bg-white border-2 border-neutral-950" />
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            <h4 className="text-sm font-bold text-white">Full Stack developer</h4>
                            <p className="text-xs font-semibold text-neutral-300">Megabyte Solutions</p>
                          </div>
                          <span className="text-[10px] font-bold text-neutral-200 bg-neutral-900/80 border border-neutral-800/80 px-2.5 py-0.5 rounded-full whitespace-nowrap">
                            2024 Jul - December
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Key Projects */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-neutral-350 tracking-wider uppercase">Key Projects</h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Project 1 */}
                      <div className="bg-neutral-955/80 border border-neutral-900/60 backdrop-blur-md rounded-2xl p-5 hover:border-neutral-700 transition-all duration-300 flex flex-col justify-between space-y-4 shadow-lg shadow-black/20">
                        <div className="space-y-1.5">
                          <h4 className="text-sm font-extrabold text-white">Zelp</h4>
                          <p className="text-xs leading-relaxed text-neutral-200 font-medium">
                            A healtterch producrt, whgere users can compare & book diagnostic tests at discounted rates
                          </p>
                        </div>
                        <a href="https://tryzelp.app" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-400 hover:text-purple-300 hover:underline transition-colors pt-2 w-fit">
                          Live Site <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>

                      {/* Project 2 */}
                      <div className="bg-neutral-955/80 border border-neutral-900/60 backdrop-blur-md rounded-2xl p-5 hover:border-neutral-700 transition-all duration-300 flex flex-col justify-between space-y-4 shadow-lg shadow-black/20">
                        <div className="space-y-1.5">
                          <h4 className="text-sm font-extrabold text-white">NeoCare</h4>
                          <p className="text-xs leading-relaxed text-neutral-200 font-medium">
                            Medical Intelligence
                          </p>
                        </div>
                        <a href="https://neo-care-git-main-urvakshtirle-gmailcoms-projects.vercel.app" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-400 hover:text-purple-300 hover:underline transition-colors pt-2 w-fit">
                          Live Site <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>

                      {/* Project 3 */}
                      <div className="bg-neutral-955/80 border border-neutral-900/60 backdrop-blur-md rounded-2xl p-5 hover:border-neutral-700 transition-all duration-300 flex flex-col justify-between space-y-4 shadow-lg shadow-black/20">
                        <div className="space-y-1.5">
                          <h4 className="text-sm font-extrabold text-white">Travel Genesis</h4>
                          <p className="text-xs leading-relaxed text-neutral-200 font-medium">
                            An Travel Company
                          </p>
                        </div>
                        <a href="https://travel-genesis-ai-guide-three.vercel.app" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-400 hover:text-purple-300 hover:underline transition-colors pt-2 w-fit">
                          Live Site <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>

                      {/* Project 4 */}
                      <div className="bg-neutral-955/80 border border-neutral-900/60 backdrop-blur-md rounded-2xl p-5 hover:border-neutral-700 transition-all duration-300 flex flex-col justify-between space-y-4 shadow-lg shadow-black/20">
                        <div className="space-y-1.5">
                          <h4 className="text-sm font-extrabold text-white">Yashashvi Advertising</h4>
                          <p className="text-xs leading-relaxed text-neutral-200 font-medium">
                            An Adevertising Agency Portfolio
                          </p>
                        </div>
                        <a href="https://www.yashasviadvertising.works" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-400 hover:text-purple-300 hover:underline transition-colors pt-2 w-fit">
                          Live Site <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>

                  </div>

                </div>

              </div>
            </div>
          ) : sidebarActiveId === 'billing' ? (
            <BillingPage />
          ) : sidebarActiveId === 'settings' ? (
            /* Clerk UserProfile Settings Page */
            <div className="flex-1 overflow-y-auto p-6 md:p-8 relative z-10 max-w-4xl w-full mx-auto flex flex-col gap-6">
              <div className="flex flex-col gap-1">
                <h2 className="text-xl font-extrabold text-white tracking-tight">Account Settings</h2>
                <p className="text-xs text-neutral-450 font-medium">Manage your personal profile details, authentication options, and security settings.</p>
              </div>
              <div className="flex-1 flex justify-center items-start pt-2">
                <UserProfile
                  routing="hash"
                  appearance={{
                    variables: {
                      colorPrimary: '#8b5cf6',
                      colorBackground: '#0a0a0b',
                      colorInputBackground: '#0f0f11',
                      colorInputText: '#f5f5f5',
                      colorText: '#f5f5f5',
                      colorTextSecondary: '#a1a1aa',
                      colorNeutral: '#3f3f46',
                      borderRadius: '0.75rem',
                      fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
                    },
                    elements: {
                      card: 'bg-[#0a0a0b] border border-neutral-900 shadow-2xl shadow-black/40 w-full max-w-full',
                      navbar: 'border-r border-neutral-900 pr-6',
                      navbarButton: 'text-neutral-450 hover:text-white transition-colors hover:bg-neutral-900/40 rounded-lg',
                      navbarButtonActive: 'bg-neutral-900 text-white font-bold',
                      pageScrollable: 'bg-[#0a0a0b] px-8 py-6',
                      profileSectionTitle: 'text-white border-b border-neutral-900 pb-2 mb-4 font-bold',
                      headerTitle: 'text-white font-bold',
                      headerSubtitle: 'text-neutral-400',
                      socialButtonsBlockButton: 'border-neutral-800 hover:border-neutral-700 bg-neutral-950 text-white',
                      formFieldInput: 'bg-[#0f0f11] border-neutral-800 text-white placeholder-neutral-600 focus:border-violet-500',
                      formFieldLabel: 'text-neutral-400 text-xs font-semibold uppercase tracking-wider',
                      footerActionLink: 'text-violet-400 hover:text-violet-300',
                      formButtonPrimary: 'bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-700 hover:to-purple-800 text-white font-semibold',
                    },
                  }}
                />
              </div>
            </div>
          ) : (
            /* Other Under Development Views */
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 relative z-10">
              <div className="w-16 h-16 rounded-2xl bg-neutral-950 border border-neutral-900 flex items-center justify-center text-neutral-400 mb-4 shadow-xl">
                <Command className="w-8 h-8" />
              </div>
              <h2 className="text-[13px] font-bold text-white mb-1 uppercase tracking-widest">
                {sidebarActiveId.toUpperCase()}
              </h2>
              <p className="text-[11px] text-neutral-550 max-w-xs leading-relaxed">
                This section is currently under development. Promptex will support this workspace feature in a future release.
              </p>
            </div>
          )
        ) : (
          <section className="flex-1 flex flex-col items-center justify-center px-6 max-w-4xl w-full mx-auto relative z-10 pb-24 select-none">
            <div className="text-center space-y-7 w-full">
              <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white leading-tight">
                Got an idea, {userDisplayName}?
              </h1>
              
              {/* New AI Prompt Box */}
              <div className="w-full text-left">
                <PromptInputBox 
                  placeholder="Ask Promptex to create a prototype..."
                  isLoading={creating}
                  onSend={handleQuickCreateFromMessage}
                  showByokToggle={true}
                />
              </div>
            </div>
          </section>
        )}

      </main>
    </div>

      <CommandPalette
        open={isCommandPaletteOpen}
        onOpenChange={setIsCommandPaletteOpen}
        items={commandItems}
      />
    </div>
  )
}
