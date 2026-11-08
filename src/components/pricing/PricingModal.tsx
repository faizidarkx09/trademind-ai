import React from 'react';
import { useTrading } from '../../context/TradingContext';
import { Check, Crown, X, Zap, Building2 } from 'lucide-react';

const PLANS = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    icon: <Zap className="w-5 h-5 text-[#18D5C0]" />,
    tagline: 'Learn the platform with paper trading.',
    features: [
      '10 AI agents — view only',
      '5 signals per day',
      'Paper trading ($100,000 virtual)',
      'Basic strategies (10)',
      'Community support',
    ],
    cta: 'Current Plan',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '$29',
    period: '/month',
    icon: <Crown className="w-5 h-5 text-[#F5B942]" />,
    tagline: 'For active paper traders who want the full engine.',
    features: [
      'Everything in Free',
      'Unlimited signals + live agent votes',
      'All 30 curated strategies',
      'Backtesting workspace',
      'Telegram signal alerts',
      'Priority support',
    ],
    cta: 'Upgrade to Pro',
    highlight: true,
  },
  {
    name: 'Business',
    price: '$99',
    period: '/month',
    icon: <Building2 className="w-5 h-5 text-[#A78BFA]" />,
    tagline: 'For desks & teams managing multiple operators.',
    features: [
      'Everything in Pro',
      '5 team seats + RBAC roles',
      'Admin control center',
      'Audit trail & risk invariants',
      'API access (read-only)',
      'Dedicated support',
    ],
    cta: 'Upgrade to Business',
    highlight: false,
  },
];

export const PricingModal: React.FC = () => {
  const { isPricingModalOpen, closePricingModal, showToast } = useTrading();

  if (!isPricingModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-4xl bg-[#0D1420] border border-[#223044] rounded-2xl shadow-2xl overflow-hidden my-8">
        <div className="flex items-center justify-between px-6 py-4 bg-[#111A27] border-b border-[#223044]">
          <div>
            <h3 className="text-base font-bold text-[#F4F7FB]">Choose Your Plan</h3>
            <p className="text-[11px] text-[#64748B]">
              Paper trading only in every plan — no real money, ever, in this MVP.
            </p>
          </div>
          <button
            onClick={closePricingModal}
            className="p-1.5 rounded-lg text-[#91A0B5] hover:text-[#F4F7FB] hover:bg-[#162232]"
            aria-label="Close pricing"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`p-5 rounded-2xl border flex flex-col ${
                plan.highlight
                  ? 'bg-[#18D5C0]/5 border-[#18D5C0]/50 shadow-lg shadow-[#18D5C0]/5'
                  : 'bg-[#111A27] border-[#223044]'
              }`}
            >
              {plan.highlight && (
                <span className="self-start text-[10px] font-bold px-2 py-0.5 rounded bg-[#18D5C0] text-[#080D16] mb-3">
                  MOST POPULAR
                </span>
              )}
              <div className="flex items-center gap-2">
                {plan.icon}
                <span className="font-bold text-[#F4F7FB]">{plan.name}</span>
              </div>
              <div className="mt-3">
                <span className="text-3xl font-extrabold text-[#F4F7FB] font-mono tabular-nums">
                  {plan.price}
                </span>
                <span className="text-xs text-[#64748B]">{plan.period}</span>
              </div>
              <p className="text-[11px] text-[#91A0B5] mt-1 leading-relaxed">{plan.tagline}</p>
              <ul className="space-y-2 mt-4 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-[#91A0B5]">
                    <Check className="w-3.5 h-3.5 text-[#20D99A] shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => {
                  showToast(
                    plan.name === 'Free'
                      ? 'You are already on the Free plan.'
                      : `${plan.name} checkout is a demo in this build — billing is not connected.`,
                    plan.name === 'Free' ? 'info' : 'warning',
                  );
                  closePricingModal();
                }}
                className={`mt-5 w-full py-2.5 text-xs font-bold rounded-lg transition-colors ${
                  plan.highlight
                    ? 'bg-[#18D5C0] text-[#080D16] hover:bg-[#18D5C0]/90'
                    : 'bg-[#162232] text-[#F4F7FB] hover:bg-[#223044]'
                }`}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>

        <p className="px-6 pb-5 text-[11px] text-[#64748B] text-center">
          Signals are research, not guaranteed profit. Cancel anytime. No broker or real-money
          connection exists in this version.
        </p>
      </div>
    </div>
  );
};
