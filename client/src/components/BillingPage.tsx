"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRazorpay } from '@/hooks/useRazorpay';
import { useUser } from '@clerk/nextjs';
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
import { PromptexLogoMark } from '@/components/ui/promptex-logo';
import { AnimatedTicket } from '@/components/ui/ticket-confirmation-card';
import { CartesianGrid, Line, LineChart as RechartsLineChart, XAxis } from 'recharts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/line-chart';

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

const DEFAULT_USD_TO_INR = 94.98;

export default function BillingPage() {
  const apiFetch = useApiFetch();
  const { user } = useUser();
  const [completedTransaction, setCompletedTransaction] = useState<{
    ticketId: string;
    amount: number;
    date: Date;
    cardHolder: string;
    last4Digits: string;
    barcodeValue: string;
  } | null>(null);
  const [isUsageGraphOpen, setIsUsageGraphOpen] = useState(false);
  const [projectCount, setProjectCount] = useState(0);
  const [usdToInrRate, setUsdToInrRate] = useState<number>(DEFAULT_USD_TO_INR);

  // Plan States
  const [selectedProIndex, setSelectedProIndex] = useState(0); // Default 20 credits
  const [selectedBusinessIndex, setSelectedBusinessIndex] = useState(0); // Default 100 credits
  


  // Modal Dialog toggles
  const [activeSelector, setActiveSelector] = useState<'pro' | 'business' | null>(null);

  // Usage states
  const [usageData, setUsageData] = useState<{ date: string; count: number }[]>([]);
  const [loadingUsage, setLoadingUsage] = useState(true);
  const [activePlan, setActivePlan] = useState<'free' | 'pro'>('free');
  const [dailyCredits, setDailyCredits] = useState<{ limit: number; usedToday: number; remaining: number }>({
    limit: 10,
    usedToday: 0,
    remaining: 10
  });
  const [isUpgrading, setIsUpgrading] = useState(false);

  const [verifyingPayment, setVerifyingPayment] = useState(false);
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
      if (typeof data.projectCount === 'number') {
        setProjectCount(data.projectCount);
      }
    } catch (err) {
      console.error('Failed to load usage:', err);
    } finally {
      setLoadingUsage(false);
    }
  };

  // Fetch real-time exchange rate on mount
  useEffect(() => {
    const fetchExchangeRate = async () => {
      try {
        const res = await fetch('https://open.er-api.com/v6/latest/USD');
        const data = await res.json();
        if (data && data.rates && typeof data.rates.INR === 'number') {
          setUsdToInrRate(data.rates.INR);
          console.log('Real-time USD to INR rate loaded:', data.rates.INR);
        }
      } catch (err) {
        console.error('Failed to fetch real-time exchange rate, using fallback:', err);
      }
    };
    fetchExchangeRate();
  }, []);

  // Fetch real usage data from backend
  useEffect(() => {
    loadUsageDetails();
  }, []);

  const handleUpgrade = async () => {
    if (!activeSelector) return;
    const isPro = activeSelector === 'pro';
    const priceUSD = isPro ? getProPrice() : getBusinessPrice();
    const priceINR = priceUSD * usdToInrRate;
    const credits = isPro ? activePro.credits : activeBusiness.credits;
    const planType = isPro ? 'pro' : 'business' as 'pro' | 'business';

    setIsUpgrading(true);

    openCheckout({
      amount: priceINR,
      currency: 'INR',
      name: 'Promptex',
      description: `Upgrade to ${credits} Credits Plan`,
      credits,
      planType,
      onSuccess: async (data) => {
        setVerifyingPayment(true);
        try {
          await loadUsageDetails();
          const last4 = data.payment_id ? data.payment_id.slice(-4).replace(/[^0-9]/g, '4') : '4242';
          setCompletedTransaction({
            ticketId: data.payment_id || `TXN-${Date.now()}`,
            amount: priceUSD,
            date: new Date(),
            cardHolder: user?.fullName || user?.primaryEmailAddress?.emailAddress?.split('@')[0] || 'Promptex Customer',
            last4Digits: last4.length === 4 ? last4 : '4242',
            barcodeValue: data.order_id || `BAR-${Date.now()}`,
          });
        } catch (err) {
          console.error('Failed to load usage details after checkout:', err);
        } finally {
          setVerifyingPayment(false);
          setIsUpgrading(false);
          setActiveSelector(null);
        }
      },
      onError: (error) => {
        alert('Payment failed or cancelled: ' + error);
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

  // Helper to calculate price
  const getProPrice = () => {
    return activePro.price;
  };

  const getBusinessPrice = () => {
    return activeBusiness.price;
  };

  if (verifyingPayment) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[400px] text-neutral-200">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-t-purple-550 border-neutral-900 animate-spin" />
          <h3 className="text-lg font-bold text-white">Verifying your payment...</h3>
          <p className="text-xs text-neutral-500">Please do not close or reload this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 relative z-10 max-w-5xl w-full mx-auto font-sans text-neutral-200">
      {/* Top Section - Promptex Free & Usage Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        
        {/* Promptex Free Usage Card */}
        <div className="bg-[#131315]/90 border border-neutral-900 rounded-2xl p-5 flex flex-col justify-between shadow-lg shadow-black/20">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                {/* Logo Gradient Icon */}
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-md">
                  <PromptexLogoMark width={16} height={16} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-bold text-white leading-none">
                      {activePlan === 'pro' ? 'Promptex Pro' : 'Promptex Free'}
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
                  Build credits <HelpCircle className="w-3.5 h-3.5 text-neutral-500" />
                </span>
                <span className="text-white font-bold">{dailyCredits.remaining} left</span>
              </div>
              <div className="w-full h-2 bg-neutral-900 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    activePlan !== 'free' 
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 shadow-md shadow-pink-500/20'
                      : 'bg-blue-500 shadow-lg shadow-blue-500/30'
                  }`}
                  style={{ width: `${Math.max(0, Math.min(100, (dailyCredits.remaining / dailyCredits.limit) * 100))}%` }}
                />
              </div>
              <span className="text-[10px] text-neutral-500 block">
                {activePlan !== 'free' ? `${activePlan.toUpperCase()} plan active • ${dailyCredits.remaining}/${dailyCredits.limit} credits remaining` : 'Free usage credits'}
              </span>
            </div>

            {/* Projects bar */}
            <div className="bg-neutral-950/80 border border-neutral-900/60 p-4 rounded-xl space-y-2 mb-2">
              <div className="flex items-center justify-between text-xs font-semibold text-neutral-350">
                <span className="flex items-center gap-1.5">
                  Project capacity <HelpCircle className="w-3.5 h-3.5 text-neutral-500" />
                </span>
                <span className="text-white font-bold">
                  {activePlan !== 'free' ? `${projectCount} created` : `${projectCount} / 3 created`}
                </span>
              </div>
              <div className="w-full h-2 bg-neutral-900 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    activePlan !== 'free' 
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 shadow-md shadow-pink-500/20'
                      : 'bg-purple-500 shadow-lg shadow-purple-550/30'
                  }`}
                  style={{ width: `${activePlan !== 'free' ? 100 : Math.max(0, Math.min(100, (projectCount / 3) * 100))}%` }}
                />
              </div>
              <span className="text-[10px] text-neutral-500 block">
                {activePlan !== 'free' ? 'Unlimited project capacity active' : 'Up to 3 projects allowed on free plan'}
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
            <button 
              onClick={() => setIsUsageGraphOpen(true)}
              className="px-3.5 py-1.5 bg-neutral-900 hover:bg-neutral-850 border border-neutral-850 text-neutral-350 font-bold rounded-lg transition-colors text-xs cursor-pointer"
            >
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
            <p className="text-[11px] text-neutral-500">shared across unlimited users • cancel anytime</p>
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
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-purple-400 shrink-0" strokeWidth={3} />
                <span>Unlimited projects (3 limit on free)</span>
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
                    ${activeSelector === 'pro' ? activePro.price : activeBusiness.price}
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

      {/* Transaction Confirmation Ticket Modal */}
      <AnimatePresence>
        {completedTransaction !== null && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            {/* Backdrop Overlay */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCompletedTransaction(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />

            {/* Ticket wrapper */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
              className="relative z-50 w-full max-w-sm flex flex-col items-center gap-4"
            >
              <AnimatedTicket
                ticketId={completedTransaction.ticketId}
                amount={completedTransaction.amount}
                date={completedTransaction.date}
                cardHolder={completedTransaction.cardHolder}
                last4Digits={completedTransaction.last4Digits}
                barcodeValue={completedTransaction.barcodeValue}
                className="w-full shadow-2xl border border-neutral-900 bg-neutral-950 text-neutral-200"
              />

              <button 
                onClick={() => setCompletedTransaction(null)}
                className="px-6 py-2.5 bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 hover:border-neutral-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md"
              >
                Close Ticket
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Usage Graph Modal Overlay */}
      <AnimatePresence>
        {isUsageGraphOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop Overlay */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsUsageGraphOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />

            {/* Modal Dialog Card wrapper */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative z-50 w-full max-w-2xl"
            >
              <Card className="w-full bg-[#131315]/95 border border-neutral-900 shadow-2xl p-6 relative overflow-hidden select-none">
                <CardHeader className="flex flex-row items-center justify-between pb-6 p-0">
                  <div>
                    <CardTitle className="text-xl font-bold text-white flex items-center gap-2 leading-none">
                      Extension Build Activity
                      {totalBuilds > 0 && (
                        <Badge
                          variant="outline"
                          className="text-purple-400 bg-purple-950/30 border-purple-900/40 ml-2 py-0.5 text-[10px]"
                        >
                          <TrendingUp className="h-3 w-3 mr-1" />
                          <span>Active</span>
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="text-xs text-neutral-500 mt-1.5">Last 30 days build statistics</CardDescription>
                  </div>
                  <button 
                    onClick={() => setIsUsageGraphOpen(false)}
                    className="absolute right-6 top-6 rounded-full bg-neutral-900 border border-neutral-850 p-1.5 hover:bg-neutral-850 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4 text-neutral-400" />
                  </button>
                </CardHeader>
                <CardContent className="p-0 pt-2">
                  {loadingUsage ? (
                    <div className="h-64 flex items-center justify-center text-xs text-neutral-500 animate-pulse">
                      Loading chart data...
                    </div>
                  ) : usageData.length === 0 ? (
                    <div className="h-64 flex items-center justify-center text-xs text-neutral-500">
                      No builds recorded in the last 30 days.
                    </div>
                  ) : (
                    <ChartContainer 
                      config={{
                        count: {
                          label: "Builds",
                          color: "#844cf2"
                        }
                      }} 
                      className="w-full aspect-auto h-64 [&_.recharts-cartesian-grid_line]:stroke-neutral-900"
                    >
                      <RechartsLineChart
                        accessibilityLayer
                        data={usageData}
                        margin={{
                          left: 12,
                          right: 12,
                          top: 10,
                          bottom: 10
                        }}
                      >
                        <CartesianGrid vertical={false} strokeDasharray="3 3" />
                        <XAxis
                          dataKey="date"
                          tickLine={false}
                          axisLine={false}
                          tickMargin={8}
                          tickFormatter={(value) => {
                            const parts = value.split('-');
                            if (parts.length === 3) {
                              const day = parseInt(parts[2], 10);
                              return day % 5 === 0 ? parts[2] : '';
                            }
                            return value;
                          }}
                        />
                        <ChartTooltip
                          cursor={{ stroke: 'rgba(255, 255, 255, 0.1)', strokeWidth: 1 }}
                          content={<ChartTooltipContent nameKey="count" />}
                        />
                        <Line
                          dataKey="count"
                          type="monotone"
                          stroke="#844cf2"
                          strokeWidth={2}
                          dot={{ r: 3, fill: '#844cf2', strokeWidth: 0 }}
                          activeDot={{ r: 5, fill: '#a855f7' }}
                        />
                      </RechartsLineChart>
                    </ChartContainer>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
