"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet } from "@/components/ui/sheet";
import { Select } from "@/components/ui/select";
import { ConfirmDelete } from "@/components/ui/confirm-delete";
import { Trash2, Plus, Wallet, RefreshCw, CheckCircle2, XCircle } from "lucide-react";
import { mutate } from 'swr';
import { createConnection, deleteConnection, syncProvider } from '@/lib/api';
import { PROVIDERS, getProviderInfo } from '@/lib/providers';
import { SWR_KEYS, useIntegrations } from '@/lib/hooks';
import { cn } from "@/lib/utils";

export function IntegrationManager() {
    const { connections, refresh: refreshConnections } = useIntegrations();
    const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [addError, setAddError] = useState('');
    const [syncStatus, setSyncStatus] = useState<Record<string, 'syncing' | 'ok' | 'error'>>({});

    // New Connection State
    const [newType, setNewType] = useState<string>("pionex");
    const [newName, setNewName] = useState("");
    const [apiKey, setApiKey] = useState("");
    const [apiSecret, setApiSecret] = useState("");
    const [address, setAddress] = useState("");

    const handleAdd = async () => {
        setLoading(true);
        setAddError('');
        try {
            const defaultName = getProviderInfo(newType)?.defaultName ?? `${newType} Connection`;

            const payload = {
                name: newName || defaultName,
                provider: newType,
                api_key: newType === 'wallet' ? null : apiKey,
                api_secret: newType === 'wallet' ? null : apiSecret,
                address: newType === 'wallet' ? address : null
            };

            await createConnection(payload);
            setIsOpen(false);
            refreshConnections();
            setNewName("");
            setApiKey("");
            setApiSecret("");
            setAddress("");
        } catch (err) {
            if (err instanceof Error && err.message.startsWith('API ')) {
                setAddError("新增失敗，請確認 API Key 正確");
            } else {
                setAddError("連線錯誤，請稍後再試");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        setDeleting(true);
        try {
            await deleteConnection(id);
            setPendingDeleteId(null);
            // A deleted connection cascades to delete every asset (and its
            // transaction history) synced from it — refresh both lists so
            // stale assets don't linger until the next periodic revalidation.
            refreshConnections();
            mutate(SWR_KEYS.dashboard);
        } catch (e) {
            console.error(e);
        } finally {
            setDeleting(false);
        }
    };

    const handleSync = async (provider: string) => {
        setSyncStatus(prev => ({ ...prev, [provider]: 'syncing' }));
        try {
            await syncProvider(provider);
            setSyncStatus(prev => ({ ...prev, [provider]: 'ok' }));
            mutate(SWR_KEYS.dashboard);
        } catch {
            setSyncStatus(prev => ({ ...prev, [provider]: 'error' }));
        }
        // Clear status after 3s
        setTimeout(() => setSyncStatus(prev => {
            const next = { ...prev };
            delete next[provider];
            return next;
        }), 3000);
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <Button onClick={() => setIsOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" /> 新增連線
                </Button>
            </div>

            <div className="flex flex-col gap-4">
                {connections.map(conn => {
                    const status = syncStatus[conn.provider];
                    const providerInfo = getProviderInfo(conn.provider);
                    const ProviderIcon = providerInfo?.icon ?? Wallet;
                    return (
                        <div key={conn.id} className="bg-card border border-border rounded-xl p-3 flex items-center justify-between shadow-sm">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className="p-2 bg-muted rounded-lg shrink-0">
                                    <ProviderIcon className={cn("w-5 h-5", providerInfo?.iconColor ?? 'text-purple-500')} />
                                </div>
                                <div className="min-w-0">
                                    <div className="font-semibold text-sm truncate">{conn.name}</div>
                                    <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                                        <span className="capitalize">{conn.provider}</span>
                                        <span className="opacity-40">•</span>
                                        <span className="font-mono opacity-70 truncate max-w-[150px]">
                                            {conn.provider === 'wallet' ? conn.address : conn.api_key_masked}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                {status === 'ok' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                                {status === 'error' && <XCircle className="w-4 h-4 text-destructive" />}
                                <Button
                                    variant="outline"
                                    className={cn("h-8 px-3 text-xs", status === 'syncing' && "opacity-60")}
                                    onClick={() => handleSync(conn.provider)}
                                    disabled={status === 'syncing'}
                                >
                                    <RefreshCw className={cn("w-3.5 h-3.5 md:mr-1.5", status === 'syncing' && "animate-spin")} />
                                    <span className="hidden md:inline">同步</span>
                                </Button>
                                {conn.provider === 'wallet' && (
                                    <span className="text-[10px] text-muted-foreground ml-1 hidden md:inline">含自動掃描</span>
                                )}
                                {pendingDeleteId === conn.id ? (
                                    <ConfirmDelete
                                        label="將一併刪除此連線同步的所有資產與交易紀錄，且無法復原"
                                        onConfirm={() => handleDelete(conn.id)}
                                        onCancel={() => setPendingDeleteId(null)}
                                        loading={deleting}
                                        className="flex items-center gap-1.5"
                                        textClassName="text-[11px] text-destructive max-w-[160px] leading-tight"
                                        confirmClassName="text-xs font-medium text-destructive hover:text-destructive/80 transition-colors disabled:opacity-50 shrink-0"
                                        cancelClassName="text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
                                    />
                                ) : (
                                    <Button variant="ghost" onClick={() => setPendingDeleteId(conn.id)} className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive">
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    );
                })}

                {connections.length === 0 && (
                    <div className="py-8 text-center text-muted-foreground text-sm border border-dashed border-border rounded-xl">
                        尚未連接任何整合。新增一個來追蹤您的加密貨幣。
                    </div>
                )}
            </div>

            <Sheet isOpen={isOpen} onClose={() => { setIsOpen(false); setAddError(''); }} title="新增整合">
                <div className="space-y-4 py-2">
                    <div className="space-y-2">
                        <Label>提供者類型</Label>
                        <Select value={newType} onChange={(e) => setNewType(e.target.value)}>
                            {PROVIDERS.map(p => (
                                <option key={p.id} value={p.id}>{p.label}</option>
                            ))}
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>名稱（可選）</Label>
                        <Input placeholder="例如：主要帳戶" value={newName} onChange={e => setNewName(e.target.value)} />
                    </div>

                    {newType === 'wallet' ? (
                        <div className="space-y-2">
                            <Label>錢包地址 (0x...)</Label>
                            <Input placeholder="0x..." value={address} onChange={e => setAddress(e.target.value)} className="font-mono" />
                        </div>
                    ) : (
                        <>
                            <div className="space-y-2">
                                <Label>API Key</Label>
                                <Input placeholder="輸入 API Key..." value={apiKey} onChange={e => setApiKey(e.target.value)} className="font-mono" />
                            </div>
                            <div className="space-y-2">
                                <Label>API Secret</Label>
                                <Input type="password" placeholder="輸入 Secret..." value={apiSecret} onChange={e => setApiSecret(e.target.value)} className="font-mono" />
                            </div>
                        </>
                    )}

                    {addError && (
                        <p className="text-sm text-destructive">{addError}</p>
                    )}

                    <div className="flex justify-end gap-2 pt-4">
                        <Button variant="outline" onClick={() => { setIsOpen(false); setAddError(''); }}>取消</Button>
                        <Button onClick={handleAdd} disabled={loading}>
                            {loading ? '新增中...' : '新增整合'}
                        </Button>
                    </div>
                </div>
            </Sheet>
        </div>
    );
}
