"use client";

import React, { useState, useEffect } from 'react';
import { useApiFetch } from '@/utils/api';
import { 
  Search, 
  LayoutDashboard, 
  FolderKanban, 
  Users, 
  Settings, 
  LogOut,
  Hash,
  ChevronDown,
  ChevronRight,
  Inbox,
  Calendar,
  Activity,
  CreditCard,
  Globe,
  Terminal,
  Blocks,
  PanelLeftClose,
  PanelLeftOpen,
  Command,
  X,
  Zap,
  Check,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export type NavItemData = {
  id: string;
  title: string;
  icon: React.ElementType;
  badge?: number | string;
  shortcut?: string;
  children?: NavItemData[];
};

export type NavGroupData = {
  heading?: string;
  items: NavItemData[];
};

const mockNavGroups: NavGroupData[] = [
  {
    items: [
      { id: 'search', title: 'Search', icon: Search, shortcut: '⌘K' },
      { id: 'home', title: 'Home', icon: LayoutDashboard },

    ]
  },
  {
    heading: 'Workspace',
    items: [
      { 
        id: 'projects', 
        title: 'Projects', 
        icon: FolderKanban,
        children: [
          { id: 'p-active', title: 'Active', icon: Hash },
          { id: 'p-archived', title: 'Archived', icon: Hash },
        ]
      },
      { 
        id: 'team', 
        title: 'Team', 
        icon: Users,
        children: [
          { id: 't-design', title: 'Designers', icon: Hash },
          { id: 't-eng', title: 'Engineering', icon: Hash },
          { id: 't-product', title: 'Product', icon: Hash },
        ]
      },
    ]
  }
];

const mockBottomItems: NavItemData[] = [
  { id: 'billing', title: 'Billing', icon: CreditCard },
  { id: 'settings', title: 'Settings', icon: Settings, shortcut: '⌘,' },
  { id: 'logout', title: 'Log out', icon: LogOut },
];
function WorkspaceSwitcher({ selected, onSelect, userEmail }: { selected?: string, onSelect?: (ws: string) => void, userEmail?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [internalSelected, setInternalSelected] = useState("Urvaksh's Promptex");
  
  const current = selected || internalSelected;
  const handleSelect = onSelect || setInternalSelected;
  const initial = current.charAt(0).toUpperCase();

  const [activePlan, setActivePlan] = useState<'free' | 'pro'>('free');
  const [remainingCredits, setRemainingCredits] = useState(5);
  const apiFetch = useApiFetch();

  // Sync remaining credits and plan state on mount and when switcher is opened
  useEffect(() => {
    const loadUsage = async () => {
      try {
        const data = await apiFetch('/api/usage');
        if (data.plan) {
          setActivePlan(data.plan);
        }
        if (data.dailyCredits) {
          setRemainingCredits(data.dailyCredits.remaining);
        }
      } catch (err) {
        console.error('Failed to load usage in sidebar:', err);
      }
    };
    loadUsage();
  }, [isOpen]);

  return (
    <div className="relative w-full">
      {/* Trigger Button */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between px-3 py-2.5 mb-4 rounded-xl border border-neutral-900 bg-neutral-950 hover:bg-neutral-900 hover:border-neutral-800 cursor-pointer transition-all duration-200 select-none group"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center font-bold text-[12px] shadow-sm uppercase shrink-0">
            {initial}
          </div>
          <span className="text-[13px] font-semibold text-neutral-100 truncate">
            {current}
          </span>
        </div>
        <ChevronDown 
          className={`w-3.5 h-3.5 text-neutral-500 group-hover:text-neutral-300 transition-all duration-350 shrink-0 ${isOpen ? 'rotate-180 text-neutral-300' : ''}`} 
          strokeWidth={2} 
        />
      </div>

      {/* Popover Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop layer to capture click outside */}
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            
            <motion.div 
              initial={{ opacity: 0, y: -4, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.95 }}
              transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
              className="absolute top-[48px] left-0 w-[240px] bg-neutral-950 border border-neutral-900 rounded-2xl shadow-2xl z-50 p-4 flex flex-col gap-3 font-sans origin-top-left"
            >
              {/* Profile Card Header */}
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-purple-600 text-white flex items-center justify-center font-extrabold text-base shadow-lg uppercase shrink-0">
                  {initial}
                </div>
                <div className="flex flex-col overflow-hidden">
                  <span className="text-[13px] font-bold text-white truncate leading-tight">
                    {current}
                  </span>
                  <span className="text-[11px] text-neutral-500 mt-0.5 leading-none font-medium">
                    {activePlan === 'pro' ? 'Pro Plan' : 'Free Plan'} • 1 member
                  </span>
                </div>
              </div>

              {/* Divider */}
              <div className="h-[1px] bg-neutral-900/80" />

              {/* Upgrade Banner */}
              {activePlan !== 'pro' && (
                <div className="border border-neutral-900 bg-neutral-950/40 p-2.5 rounded-xl flex items-center justify-between gap-3 shadow-inner">
                  <div className="flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-purple-400 fill-purple-400/20" />
                    <span className="text-[12px] font-extrabold text-neutral-250">Turn Pro</span>
                  </div>
                  <button 
                    onClick={() => { setIsOpen(false); }}
                    className="px-2.5 py-1 bg-purple-600 hover:bg-purple-550 active:scale-95 text-white text-[10px] font-black rounded-lg shadow-md shadow-purple-950/40 transition-all cursor-pointer uppercase tracking-wider"
                  >
                    Upgrade
                  </button>
                </div>
              )}

              {/* Credits Usage Card */}
              <div className="border border-neutral-900 bg-neutral-950/40 p-3 rounded-xl flex flex-col gap-2.5 shadow-inner">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-bold text-neutral-250">Credits</span>
                  <span className="text-[11px] font-semibold text-neutral-400 transition-colors flex items-center gap-0.5">
                    {activePlan === 'pro' ? 'Unlimited' : `${remainingCredits} left`} <ChevronRight className="w-3 h-3 text-neutral-500" />
                  </span>
                </div>
                {/* Progress bar */}
                <div className="w-full h-1.5 bg-neutral-900 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-300 ${
                      activePlan === 'pro' 
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 shadow-md shadow-pink-500/20' 
                        : 'bg-blue-500 shadow-lg shadow-blue-500/50'
                    }`}
                    style={{ width: `${activePlan === 'pro' ? 100 : (remainingCredits / 5) * 100}%` }}
                  />
                </div>
                <div className="flex items-center gap-1.5 text-[9px] text-neutral-500 leading-none">
                  <span className="w-1.5 h-1.5 rounded-full bg-neutral-555 shrink-0" />
                  <span>{activePlan === 'pro' ? 'Unlimited Pro plan active' : 'Daily credits reset at midnight UTC'}</span>
                </div>
              </div>

            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function NavItem({ 
  item, 
  activeId, 
  onSelect,
  level = 0
}: { 
  item: NavItemData; 
  activeId: string; 
  onSelect: (id: string) => void;
  level?: number;
}) {
  const isActive = activeId === item.id;
  const hasChildren = !!item.children;
  const [isOpen, setIsOpen] = useState(false);

  const handleClick = () => {
    if (hasChildren) {
      setIsOpen(!isOpen);
    } else {
      onSelect(item.id);
    }
  };

  return (
    <div className="flex flex-col w-full">
      <div 
        className={`group flex items-center justify-between px-2.5 py-[7px] rounded-[6px] cursor-pointer transition-all duration-200 select-none
          ${isActive 
            ? 'bg-neutral-900 text-white font-medium' 
            : 'text-neutral-400 hover:bg-neutral-950 hover:text-white'
          }
        `}
        style={{ paddingLeft: `${level * 12 + 10}px` }}
        onClick={handleClick}
      >
        <div className="flex items-center gap-2.5">
          <item.icon 
            className={`w-[16px] h-[16px] transition-colors
              ${isActive ? 'text-white' : 'text-neutral-500 group-hover:text-neutral-300'}
            `} 
            strokeWidth={1.5} 
          />
          <span className="text-[13px] tracking-wide truncate">
            {item.title}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {item.shortcut && (
             <kbd className="hidden group-hover:inline-flex items-center justify-center h-5 px-1.5 text-[10px] font-medium font-mono text-neutral-500 bg-neutral-900 border border-neutral-850 rounded-[4px] shadow-xs">
               {item.shortcut}
             </kbd>
          )}
          {item.badge && (
            <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-medium rounded-full bg-purple-600/20 text-purple-400">
              {item.badge}
            </span>
          )}
          {hasChildren && (
            <ChevronRight 
              className={`w-3.5 h-3.5 text-neutral-500 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} 
              strokeWidth={2}
            />
          )}
        </div>
      </div>

      {hasChildren && (
        <div 
          className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${
            isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
          }`}
        >
          <div className="overflow-hidden min-h-0 relative flex flex-col gap-0.5 mt-0.5">
            <div 
              className="absolute top-0 bottom-0 border-l border-neutral-900"
              style={{ left: `${level * 12 + 17.5}px` }}
            />
            {item.children!.map(child => (
              <NavItem 
                key={child.id} 
                item={child} 
                activeId={activeId} 
                onSelect={onSelect} 
                level={level + 1} 
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function SidebarNav({ 
  className = '',
  activeId,
  onSelect,
  activeWorkspace,
  onWorkspaceSelect,
  userEmail,
  projects = []
}: { 
  className?: string,
  activeId?: string,
  onSelect?: (id: string) => void,
  activeWorkspace?: string,
  onWorkspaceSelect?: (ws: string) => void,
  userEmail?: string,
  projects?: Array<{ id: string, name: string }>
}) {
  const [internalId, setInternalId] = useState('home');
  const currentId = activeId !== undefined ? activeId : internalId;
  const handleSelect = onSelect || setInternalId;

  // Dynamically build navigation groups with actual projects
  const navGroups: NavGroupData[] = [
    {
      items: [
        { id: 'search', title: 'Search', icon: Search, shortcut: '⌘K' },
        { id: 'home', title: 'Home', icon: LayoutDashboard },
      ]
    },
    {
      heading: 'Workspace',
      items: [
        { 
          id: 'projects', 
          title: 'Projects', 
          icon: FolderKanban,
          children: projects.map(p => ({
            id: `project-${p.id}`,
            title: p.name,
            icon: Hash
          }))
        },
        { 
          id: 'team', 
          title: 'Team', 
          icon: Users,
          children: [
            { id: 't-urvaksh', title: 'Urvaksh Tirle', icon: Hash }
          ]
        },
      ]
    }
  ];

  return (
    <div className={`flex flex-col w-[260px] h-full bg-black border-r border-neutral-900 p-3 font-sans ${className}`}>
      <WorkspaceSwitcher selected={activeWorkspace} onSelect={onWorkspaceSelect} userEmail={userEmail} />

      <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] flex flex-col gap-4 mt-2">
        {navGroups.map((group, idx) => (
          <div key={idx} className="flex flex-col gap-0.5">
            {group.heading && (
              <span className="px-2.5 mb-1 text-[11px] font-semibold tracking-wider text-neutral-600 uppercase">
                {group.heading}
              </span>
            )}
            {group.items.map(item => (
              <NavItem 
                key={item.id} 
                item={item} 
                activeId={currentId} 
                onSelect={handleSelect} 
              />
            ))}
          </div>
        ))}
      </div>

      <div className="mt-auto pt-4 border-t border-neutral-900 flex flex-col gap-0.5">
        {mockBottomItems.map(item => (
          <NavItem 
            key={item.id} 
            item={item} 
            activeId={currentId} 
            onSelect={handleSelect} 
          />
        ))}
      </div>
    </div>
  );
}
