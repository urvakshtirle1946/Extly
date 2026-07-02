"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRazorpay } from '@/hooks/useRazorpay';
import { 
  ChevronRight, 
  ChevronDown, 
  Check, 
  Zap, 
  Globe, 
  Users, 
  Settings, 
  X, 
  CreditCard,
  HelpCircle,
  TrendingUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApiFetch } from '@/utils/api';
import { ExtlyLogoMark } from '@/components/ui/extly-logo';

// Pro Credits Options & Prices
const PRO_CREDITS_OPTIONS = [
  { credits: 20, price: 5 },
  { credits: 100, price: 24 },
  { credits: 200, price: 49 },
  { credits: 400, price: 99 },
  { credits: 800, price: 199 },
  { credits: 1200, price: 299 },
  { credits: 2000, price: 499 },
  { credits: 3000, price: 749 },
  { credits: 4000, price: 999 },
  { credits: 5000, price: 1249 },
  { credits: 7500, price: 1849 },
];

// Business Credits Options & Prices
const BUSINESS_CREDITS_OPTIONS = [
  { credits: 100, price: 50 },
  { credits: 200, price: 99 },
  { credits: 500, price: 249 },
  { credits: 1000, price: 499 },
  { credits: 2000, price: 999 },
];

export default function BillingPage() {
  const apiFetch = useApiFetch();
  // Plan States
  const [selectedProIndex, setSelectedProIndex] = useState(0); // Default 20 credits
  const [selectedBusinessIndex, setSelectedBusinessIndex] = useState(0); // Default 100 credits
  
  const [isProAnnual, setIsProAnnual] = useState(false);
  const [isBusinessAnnual, setIsBusinessAnnual] = useState(false);

  // Modal Dialog toggles
  const [activeSelector, setActiveSelector] = useState<'pro' | 'business' | null>(null);

  // Usage states
  const [usageData, setUsageData] = useState<{ date: string; count: number }[]>([]);
  const [loadingUsage, setLoadingUsage] = useState(true);
  const [activePlan, setActivePlan] = useState<'free' | 'pro'>('free');
  const [dailyCredits, setDailyCredits] = useState<{ limit: number; usedToday: number; remaining: number }>({
    limit: 5,
    usedToday: 0,
    remaining: 5
  });
  const [isUpgrading, setIsUpgrading] = useState(false);

  const { openCheckout } = useRazorpay();

  const loadUsageDetails = async () => {
    try {
      const data = await apiFetch('/api/usage');
      setUsageData(data.chartData || []);
      if (data.dailyCredits) {
        setDailyCredits(data.dailyCredits);
      }
      if (data.plan) {
        setActivePlan(data.plan);
      }
    } catch (err) {
      console.error('Failed to load usage:', err);
    } finally {
      setLoadingUsage(false);
    }
  };

  // Fetch real usage data from backend
  useEffect(() => {
    loadUsageDetails();
  }, []);

  const handleUpgrade = async () => {
    const price = getProPrice();
    setIsUpgrading(true);

    openCheckout({
      amount: price,           // ₹price
      name: 'Extly',
      description: `Pro Plan – ${formatCredits(activePro.credits)}`,
      onSuccess: async ({ payment_id, order_id }) => {
        // Payment verified — now upgrade plan in DB
        try {
          const res = await apiFetch('/api/usage/upgrade', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ plan: 'pro' })
          });
          if (res.status === 'success') {
            setActivePlan('pro');
            await loadUsageDetails();
            setActiveSelector(null);
            alert(`🎉 Plan upgraded successfully! Payment ID: ${payment_id}`);
          } else {
            alert('Payment succeeded but plan upgrade failed. Contact support with Payment ID: ' + payment_id);
          }
        } catch (err: any) {
          alert('Payment succeeded but plan upgrade failed. Contact support with Payment ID: ' + payment_id);
        } finally {
          setIsUpgrading(false);
        }
      },
      onError: (error) => {
        alert('Payment failed: ' + error);
        setIsUpgrading(false);
      },
      onDismiss: () => {
        setIsUpgrading(false);
      },
    });
  };

  // Map database dates to build counts
  const usageMap = useMemo(() => {
    const map = new Map<string, number>();
    usageData.forEach(item => {
      map.set(item.date, item.count);
    });
    return map;
  }, [usageData]);

  // Construct last 30 days list dynamically
  const last30Days = useMemo(() => {
    const arr = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      arr.push(dateStr);
    }
    return arr;
  }, []);

  // Pre-format dates for bars loop to avoid new Date instantiations on every render frame
  const formattedDates = useMemo(() => {
    const map = new Map<string, string>();
    last30Days.forEach(dateStr => {
      const parts = dateStr.split('-');
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const month = monthNames[parseInt(parts[1], 10) - 1];
      const day = parseInt(parts[2], 10);
      map.set(dateStr, `${month} ${day}`);
    });
    return map;
  }, [last30Days]);

  const startDateLabel = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 29);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }, []);

  const endDateLabel = useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }, []);

  const totalBuilds = useMemo(() => {
    return usageData.reduce((acc, curr) => acc + curr.count, 0);
  }, [usageData]);

  // Selected details
  const activePro = PRO_CREDITS_OPTIONS[selectedProIndex];
  const activeBusiness = BUSINESS_CREDITS_OPTIONS[selectedBusinessIndex];

  // Helper to format credits label
  const formatCredits = (val: number) => {
    return `${val.toLocaleString()} credits / month`;
  };

  // Helper to calculate price (apply 20% discount if annual)
  const getProPrice = () => {
    const raw = activePro.price;
    return isProAnnual ? Math.floor(raw * 0.8) : raw;
  };

  const getBusinessPrice = () => {
    const raw = activeBusiness.price;
    return isBusinessAnnual ? Math.floor(raw * 0.8) : raw;
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 relative z-10 max-w-5xl w-full mx-auto font-sans text-neutral-200">
      {/* Top Section - Extly Free & Usage Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        
        {/* Extly Free Usage Card */}
        <div className="bg-[#131315]/90 border border-neutral-900 rounded-2xl p-5 flex flex-col justify-between shadow-lg shadow-black/20">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                {/* Logo Gradient Icon */}
                <div className="px-2 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-md">
                  <ExtlyLogoMark width={38} height={10} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-bold text-white leading-none">
                      {activePlan === 'pro' ? 'Extly Pro' : 'Extly Free'}
                    </span>
                    <button className="px-2 py-0.5 bg-neutral-900 border border-neutral-850 hover:bg-neutral-800 text-[10px] text-neutral-300 font-semibold rounded transition-colors uppercase tracking-wider">
                      Manage
                    </button>
                  </div>
                  <span className="text-[11px] text-neutral-450 mt-1 block">
                    {activePlan === 'pro' ? 'Pro subscription active ⓘ' : 'Free usage included ⓘ'}
                  </span>
                </div>
              </div>
            </div>

            {/* Credits bar */}
            <div className="bg-neutral-950/80 border border-neutral-900/60 p-4 rounded-xl space-y-2 mb-4">
              <div className="flex items-center justify-between text-xs font-semibold text-neutral-350">
                <span className="flex items-center gap-1.5">
                  Daily build credits <HelpCircle className="w-3.5 h-3.5 text-neutral-500" />
                </span>
                <span className="text-white font-bold">{activePlan === 'pro' ? 'Unlimited' : `${dailyCredits.remaining} left`}</span>
              </div>
              <div className="w-full h-2 bg-neutral-900 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    activePlan === 'pro' 
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 shadow-md shadow-pink-500/20'
                      : 'bg-blue-500 shadow-lg shadow-blue-500/30'
                  }`}
                  style={{ width: `${activePlan === 'pro' ? 100 : Math.max(0, Math.min(100, (dailyCredits.remaining / dailyCredits.limit) * 100))}%` }}
                />
              </div>
              <span className="text-[10px] text-neutral-500 block">
                {activePlan === 'pro' ? 'Unlimited Pro plan active' : 'Resets at midnight UTC'}
              </span>
            </div>
          </div>

          <div className="border-t border-neutral-900 pt-4 mt-2 flex items-center justify-between text-xs text-neutral-400">
            {activePlan === 'pro' ? (
              <>
                <span>You are currently upgraded to the Pro plan.</span>
                <button 
                  disabled
                  className="px-3.5 py-1.5 bg-neutral-900 border border-neutral-850 text-neutral-550 font-bold rounded-lg cursor-not-allowed whitespace-nowrap"
                >
                  Upgraded
                </button>
              </>
            ) : (
              <>
                <span>Need more credits? Upgrade your plan for more credits.</span>
                <button 
                  onClick={() => setActiveSelector('pro')}
                  className="px-3.5 py-1.5 bg-neutral-900 hover:bg-neutral-850 border border-neutral-850 text-white font-bold rounded-lg transition-colors whitespace-nowrap"
                >
                  Upgrade plan
                </button>
              </>
            )}
          </div>
        </div>

        {/* Usage Analytics Card */}
        <div className="bg-[#131315]/90 border border-neutral-900 rounded-2xl p-5 flex flex-col justify-between shadow-lg shadow-black/20">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[14px] font-bold text-white">Usage</span>
              <span className="text-xs text-neutral-400 font-semibold">{totalBuilds} builds in last 30 days</span>
            </div>
            
            {/* Timeline Graphic Bar Chart */}
            <div className="h-20 flex items-end justify-between border-b border-neutral-900 pb-2 relative gap-[3px] px-1 select-none">
              {/* Grid guide */}
              <div className="absolute inset-x-0 bottom-2 border-t border-neutral-900/60 pointer-events-none" />
              
              {loadingUsage ? (
                <div className="w-full h-full flex items-center justify-center text-xs text-neutral-500 animate-pulse">
                  Loading usage details...
                </div>
              ) : (
                last30Days.map((dateStr) => {
                  const count = usageMap.get(dateStr) || 0;
                  // Base 4px for 0, 12px per count (max 60px height)
                  const height = count > 0 ? Math.min(60, 4 + count * 12) : 4;
                  
                  return (
                    <div key={dateStr} className="flex-1 group relative flex flex-col items-center">
                      {/* Tooltip */}
                      <div className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 transition-opacity bg-neutral-900 border border-neutral-800 px-2 py-1 rounded text-[9px] text-white font-mono whitespace-nowrap pointer-events-none z-10 shadow-2xl">
                        {formattedDates.get(dateStr)}: {count} builds
                      </div>
                      
                      {/* Interactive Bar */}
                      <div 
                        className={`w-full rounded-full transition-all duration-300 ${
                          count > 0 
                            ? 'bg-gradient-to-t from-blue-600 to-blue-400 shadow-md shadow-blue-500/20' 
                            : 'bg-neutral-850 group-hover:bg-neutral-800'
                        }`}
                        style={{ height: `${height}px` }}
                      />
                    </div>
                  );
                })
              )}
            </div>
            
            <div className="flex justify-between items-center text-[10px] text-neutral-500 font-bold uppercase tracking-wider mt-2.5">
              <span>{startDateLabel}</span>
              <span>{endDateLabel}</span>
            </div>
          </div>

          <div className="mt-4">
            <button className="px-3.5 py-1.5 bg-neutral-900 hover:bg-neutral-850 border border-neutral-850 text-neutral-300 font-bold rounded-lg transition-colors text-xs">
              More usage details
            </button>
          </div>
        </div>
      </div>

      {/* Single Unified Credits Upgrade Card */}
      <div className="max-w-xl mx-auto bg-[#131315]/95 border border-neutral-900 rounded-3xl p-6 md:p-8 flex flex-col justify-between shadow-lg shadow-black/20 border-t-purple-550/45 border-t-2 space-y-6">
        <div className="space-y-5">
          <div className="space-y-1.5">
            <h3 className="text-xl font-extrabold text-white">Upgrade your plan</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Scale your build capacity dynamically. Select the monthly credits tier you want to start creating and deploying extensions.
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-baseline gap-1.5">
              <span className="text-4xl font-black text-white">${getProPrice()}</span>
              <span className="text-neutral-400 text-sm font-semibold">per month</span>
            </div>
            <p className="text-[11px] text-neutral-500">shared across unlimited users • {isProAnnual ? "billed annually ($" + getProPrice() * 12 + "/yr)" : "cancel anytime"}</p>
          </div>

          {/* Annual billing switch */}
          <div className="flex items-center gap-3 py-1">
            <button 
              type="button"
              onClick={() => setIsProAnnual(!isProAnnual)}
              className={`w-9 h-5 rounded-full p-0.5 transition-colors flex items-center cursor-pointer ${isProAnnual ? 'bg-purple-600' : 'bg-neutral-800'}`}
            >
              <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 transform ${isProAnnual ? 'translate-x-4' : 'translate-x-0'}`} />
            </button>
            <span className="text-xs font-semibold text-neutral-350">Annual billing (save 20%)</span>
          </div>

          {/* Credit Selector box */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Select credits tier</span>
            <div 
              onClick={() => setActiveSelector('pro')}
              className="w-full px-4 py-3 rounded-xl bg-neutral-950 hover:bg-neutral-900 border border-neutral-900 hover:border-neutral-850 flex items-center justify-between text-xs font-bold text-neutral-200 cursor-pointer select-none transition-colors shadow-inner"
            >
              <span>{formatCredits(activePro.credits)}</span>
              <ChevronDown className="w-4 h-4 text-neutral-400" />
            </div>
          </div>

          {/* Action button */}
          <button 
            onClick={activePlan === 'pro' ? undefined : () => setActiveSelector('pro')}
            disabled={activePlan === 'pro'}
            className={`w-full py-3 text-white font-extrabold rounded-xl text-xs transition-all uppercase tracking-wider ${
              activePlan === 'pro' 
                ? 'bg-neutral-900 border border-neutral-850 text-neutral-500 cursor-not-allowed'
                : 'bg-purple-600 hover:bg-purple-550 active:scale-[0.99] shadow-lg shadow-purple-950/40 cursor-pointer'
            }`}
          >
            {activePlan === 'pro' ? 'Upgraded' : 'Upgrade Plan'}
          </button>

          {/* Features checkmark list */}
          <div className="space-y-3 pt-5 border-t border-neutral-900/80">
            <span className="text-[11px] font-bold text-neutral-450 uppercase tracking-wider block">Upgrade includes:</span>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 text-xs text-neutral-300">
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-purple-400 shrink-0" strokeWidth={3} />
                <span>Included grants ⓘ</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-purple-400 shrink-0" strokeWidth={3} />
                <span>On-demand credit top-ups</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* DYNAMIC CREDIT PRICING MODAL POPUP */}
      <AnimatePresence>
        {activeSelector !== null && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            
            {/* Backdrop Overlay */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveSelector(null)}
              className="absolute inset-0 bg-black/70"
            />

            {/* Modal Dialog Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ type: "spring", stiffness: 450, damping: 38 }}
              className="relative w-full max-w-md bg-neutral-950 border border-neutral-900 rounded-3xl p-6 shadow-2xl z-50 flex flex-col gap-5 origin-center select-none"
            >
              {/* Close Button */}
              <button 
                onClick={() => setActiveSelector(null)}
                className="absolute right-4 top-4 rounded-full bg-neutral-900 border border-neutral-850 p-1.5 hover:bg-neutral-850 transition-colors"
              >
                <X className="w-4 h-4 text-neutral-400" />
              </button>

              {/* Header Title */}
              <div className="space-y-1">
                <h2 className="text-xl font-bold text-white tracking-tight">Upgrade your plan</h2>
                <p className="text-xs text-neutral-500">Keep the momentum going</p>
              </div>

              {/* Upgrade pricing banner */}
              <div className="bg-neutral-950/80 border border-neutral-900/60 p-5 rounded-2xl flex flex-col gap-3">
                <span className="text-sm font-bold text-neutral-250">
                  Upgrade to {activeSelector === 'pro' ? `Pro ${selectedProIndex}` : `Business ${selectedBusinessIndex}`}
                </span>
                
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-extrabold text-white">
                    ${activeSelector === 'pro' 
                      ? (isProAnnual ? Math.floor(activePro.price * 0.8) : activePro.price)
                      : (isBusinessAnnual ? Math.floor(activeBusiness.price * 0.8) : activeBusiness.price)
                    }
                  </span>
                  <span className="text-neutral-500 text-xs font-semibold">per month</span>
                </div>

                {/* Main Select Input Box (toggles option dropdown items) */}
                <div className="relative">
                  <span className="text-[10px] font-bold text-neutral-600 uppercase tracking-wider block mb-1.5">
                    Select Credits Tier
                  </span>
                  
                  {/* Styled Selector Input */}
                  <div className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-850 flex items-center justify-between text-xs font-semibold text-white">
                    <span>
                      {formatCredits(activeSelector === 'pro' ? activePro.credits : activeBusiness.credits)}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
                  </div>

                  {/* Scrollable list options overlay */}
                  <div className="mt-2.5 max-h-[220px] overflow-y-auto border border-neutral-850 bg-neutral-950 rounded-2xl p-1.5 flex flex-col gap-0.5 scrollbar-thin">
                    {activeSelector === 'pro' ? (
                      PRO_CREDITS_OPTIONS.map((opt, idx) => {
                        const isSelected = selectedProIndex === idx;
                        return (
                          <button
                            key={idx}
                            onClick={() => {
                              setSelectedProIndex(idx);
                              setActiveSelector(null);
                            }}
                            className={`flex items-center justify-between w-full text-left text-[12px] px-3 py-2 rounded-lg font-semibold transition-all ${
                              isSelected
                                ? 'bg-purple-950/40 text-purple-400 border border-purple-900/30'
                                : 'text-neutral-400 hover:bg-neutral-900 hover:text-white'
                            }`}
                          >
                            <span>{formatCredits(opt.credits)}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-purple-400" strokeWidth={2.5} />}
                          </button>
                        );
                      })
                    ) : (
                      BUSINESS_CREDITS_OPTIONS.map((opt, idx) => {
                        const isSelected = selectedBusinessIndex === idx;
                        return (
                          <button
                            key={idx}
                            onClick={() => {
                              setSelectedBusinessIndex(idx);
                              setActiveSelector(null);
                            }}
                            className={`flex items-center justify-between w-full text-left text-[12px] px-3 py-2 rounded-lg font-semibold transition-all ${
                              isSelected
                                ? 'bg-purple-950/40 text-purple-400 border border-purple-900/30'
                                : 'text-neutral-400 hover:bg-neutral-900 hover:text-white'
                            }`}
                          >
                            <span>{formatCredits(opt.credits)}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-purple-400" />}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

              </div>

              {/* Confirm / Continue Button */}
              <div className="flex gap-3 justify-end pt-2">
                <button 
                  onClick={() => setActiveSelector(null)}
                  className="px-4 py-2 border border-neutral-900 bg-transparent hover:bg-neutral-900 text-neutral-400 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleUpgrade}
                  disabled={isUpgrading}
                  className="px-5 py-2 bg-purple-650 hover:bg-purple-550 active:scale-95 text-white font-extrabold rounded-xl text-xs shadow-md transition-colors cursor-pointer uppercase tracking-wider disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isUpgrading ? 'Processing...' : 'Confirm & Pay'}
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
