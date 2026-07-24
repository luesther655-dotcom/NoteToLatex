"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { CreditCard, Zap, Check, Loader2 } from "lucide-react";

interface Plan {
  id: string;
  name: string;
  credits: number;
  price: number | string;
  popular?: boolean;
}

const plans: Plan[] = [
  { id: "trial", name: "轻量包", credits: 30, price: 9.9 },
  { id: "basic", name: "标准包", credits: 70, price: 19.9, popular: true },
  { id: "pro", name: "专业包", credits: 180, price: 49.9 },
];

export default function CreditsPurchase() {
  const { user } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [customCredits, setCustomCredits] = useState("");
  const [purchasing, setPurchasing] = useState(false);

  if (!user) return null;

  const handlePurchase = async (planId: string) => {
    setPurchasing(true);
    try {
      // This is a placeholder – actual payment integration will handle this
      alert("支付功能即将上线，敬请期待！");
    } finally {
      setPurchasing(false);
    }
  };

  const customPrice = customCredits
    ? (parseInt(customCredits, 10) * 0.33).toFixed(2)
    : "0.00";

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold">购买额度</h3>
        <p className="text-sm text-muted-foreground mt-1">
          选择适合你的套餐，每次转换消耗 1 次额度
        </p>
      </div>

      {/* Standard Plans */}
      <div className="grid gap-4 sm:grid-cols-3">
        {plans.map((plan) => (
          <button
            key={plan.id}
            onClick={() => {
              setSelectedPlan(plan.id);
              setCustomCredits("");
            }}
            className={`relative rounded-xl border-2 p-4 text-left transition-all ${
              selectedPlan === plan.id
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            } ${plan.popular ? "ring-1 ring-primary" : ""}`}
          >
            {plan.popular && (
              <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-medium text-primary-foreground">
                推荐
              </span>
            )}
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-4 w-4 text-primary" />
              <span className="font-medium">{plan.name}</span>
            </div>
            <div className="text-2xl font-bold mb-1">
              ¥{plan.price}
            </div>
            <div className="text-sm text-muted-foreground">
              {plan.credits} 次
            </div>
            {selectedPlan === plan.id && (
              <Check className="absolute top-3 right-3 h-4 w-4 text-primary" />
            )}
          </button>
        ))}
      </div>

      {/* Custom Amount */}
      <div className="rounded-xl border border-border p-4">
        <div className="flex items-center gap-2 mb-3">
          <CreditCard className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">自定义额度</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <input
              type="number"
              min="1"
              placeholder="输入次数"
              value={customCredits}
              onChange={(e) => {
                setCustomCredits(e.target.value);
                setSelectedPlan(null);
              }}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              次
            </span>
          </div>
          <div className="text-sm font-medium text-muted-foreground whitespace-nowrap">
            ≈ ¥{customPrice}
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          0.33 元/次，按需购买
        </p>
      </div>

      {/* Purchase Button */}
      <button
        onClick={() => {
          const planId = selectedPlan || (customCredits ? "custom" : null);
          if (planId) handlePurchase(planId);
        }}
        disabled={purchasing || (!selectedPlan && !customCredits)}
        className="w-full rounded-xl bg-primary py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {purchasing ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            处理中...
          </span>
        ) : (
          "立即购买"
        )}
      </button>
    </div>
  );
}