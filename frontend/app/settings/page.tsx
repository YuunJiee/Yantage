'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CustomSelect } from "@/components/ui/custom-select";
import { Download, Trash2, History, PieChart, ChevronRight, SquareSplitHorizontal } from 'lucide-react';
import { CategoryVisibility } from "@/components/CategoryVisibility";
import { fetchSetting, updateSetting, fetchDashboardData, apiFetch, API_URL } from '@/lib/api';

export default function SettingsPage() {
    const [budgetStartDay, setBudgetStartDay] = useState('1');
    const [updateInterval, setUpdateInterval] = useState('60');
    const [resetStep, setResetStep] = useState(0);

    useEffect(() => {
        Promise.all([
            fetchSetting('budget_start_day'),
            fetchSetting('price_update_interval_minutes'),
        ]).then(([d, u]) => {
            if (d.value) setBudgetStartDay(String(d.value));
            if (u.value) setUpdateInterval(String(u.value));
        }).catch(console.error);
    }, []);

    const handleSaveUpdateInterval = (val: string) => {
        setUpdateInterval(val);
        updateSetting('price_update_interval_minutes', val);
    };

    const handleSaveBudgetDay = (val: string) => {
        setBudgetStartDay(val);
        updateSetting('budget_start_day', val);
    };

    const handleExport = async () => {
        try {
            const data = await fetchDashboardData();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `asset_dashboard_backup_${new Date().toISOString().split('T')[0]}.json`;
            a.click();
        } catch (e) {
            console.error("Export failed:", e);
        }
    };

    const handleReset = async () => {
        try {
            await apiFetch('/system/reset', { method: 'DELETE' });
            window.location.href = '/';
        } catch (e) {
            console.error(e);
            setResetStep(0);
        }
    };

    return (
        <div className="mx-auto max-w-2xl px-4 py-8 space-y-8 pb-24">

            <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Yantage</p>
                <h1 className="text-2xl font-bold tracking-tight">設定</h1>
            </div>

            {/* Quick links */}
            <section className="space-y-2">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">頁面</h2>
                <div className="rounded-2xl border border-border bg-card divide-y divide-border/50 overflow-hidden">
                    <Link href="/budget" className="flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors">
                        <div className="flex items-center gap-3">
                            <PieChart className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm font-medium">預算規劃</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
                    </Link>
                    <Link href="/history" className="flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors">
                        <div className="flex items-center gap-3">
                            <History className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm font-medium">歷史紀錄</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
                    </Link>
                    <Link href="/subscriptions" className="flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors">
                        <div className="flex items-center gap-3">
                            <SquareSplitHorizontal className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm font-medium">分帳訂閱</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
                    </Link>
                </div>
            </section>

            {/* Preferences */}
            <section className="space-y-3">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">偏好設定</h2>
                <div className="rounded-2xl border border-border bg-card divide-y divide-border/50">
                    <div className="flex items-center justify-between px-4 py-3">
                        <div>
                            <p className="text-sm font-medium">價格更新頻率</p>
                            <p className="text-xs text-muted-foreground mt-0.5">自動抓取股票和加密貨幣最新價格的間隔</p>
                        </div>
                        <div className="w-[160px] shrink-0">
                            <CustomSelect
                                value={updateInterval}
                                onChange={handleSaveUpdateInterval}
                                options={[
                                    { value: '15', label: '每 15 分鐘' },
                                    { value: '30', label: '每 30 分鐘' },
                                    { value: '60', label: '每小時' },
                                    { value: '1440', label: '每日' },
                                ]}
                            />
                        </div>
                    </div>
                </div>
            </section>

            {/* Budget cycle */}
            <section className="space-y-3">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">預算週期</h2>
                <div className="rounded-2xl border border-border bg-card divide-y divide-border/50">
                    <div className="flex items-center justify-between px-4 py-3">
                        <div>
                            <p className="text-sm font-medium">每月結算日</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{`每月 ${budgetStartDay} 號重置預算`}</p>
                        </div>
                        <Input
                            type="number"
                            min="1"
                            max="31"
                            className="w-20 bg-muted/50 border border-border text-center shrink-0"
                            value={budgetStartDay}
                            onChange={(e) => {
                                const val = parseInt(e.target.value);
                                if (val >= 1 && val <= 31) handleSaveBudgetDay(e.target.value);
                                else if (e.target.value === '') setBudgetStartDay('');
                            }}
                            onBlur={(e) => {
                                if (!e.target.value || parseInt(e.target.value) < 1) handleSaveBudgetDay('1');
                                if (parseInt(e.target.value) > 31) handleSaveBudgetDay('31');
                            }}
                        />
                    </div>
                </div>
            </section>

            {/* Category visibility */}
            <section className="space-y-3">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">資產顯示設定</h2>
                <div className="rounded-2xl border border-border bg-card px-4 py-3">
                    <CategoryVisibility />
                </div>
            </section>

            {/* Data management */}
            <section className="space-y-3">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">資料管理</h2>
                <div className="rounded-2xl border border-border bg-card divide-y divide-border/50">
                    <div className="flex items-center justify-between px-4 py-3">
                        <p className="text-sm font-medium">備份資料</p>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={handleExport}>
                                <Download className="w-3.5 h-3.5 mr-1.5" /> JSON
                            </Button>
                            <Button variant="outline" onClick={() => window.open(`${API_URL}/system/export/csv`, '_blank')}>
                                <Download className="w-3.5 h-3.5 mr-1.5" /> CSV
                            </Button>
                        </div>
                    </div>
                    <div className="flex items-center justify-between px-4 py-3">
                        <div>
                            <p className="text-sm font-medium text-red-500">系統重置</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                {resetStep === 0 && '刪除所有資產、交易紀錄和目標'}
                                {resetStep === 1 && '確定要刪除所有資料？此操作無法復原。'}
                                {resetStep === 2 && '最後確認：所有資料將永久消失。'}
                            </p>
                        </div>
                        {resetStep === 0 && (
                            <Button variant="destructive" onClick={() => setResetStep(1)}>
                                <Trash2 className="w-3.5 h-3.5 mr-1.5" /> 重置
                            </Button>
                        )}
                        {resetStep === 1 && (
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={() => setResetStep(0)}>取消</Button>
                                <Button variant="destructive" onClick={() => setResetStep(2)}>確定</Button>
                            </div>
                        )}
                        {resetStep === 2 && (
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={() => setResetStep(0)}>取消</Button>
                                <Button variant="destructive" onClick={handleReset}>確定清除</Button>
                            </div>
                        )}
                    </div>
                </div>
            </section>

        </div>
    );
}
