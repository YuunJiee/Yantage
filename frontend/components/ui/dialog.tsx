'use client';

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface DialogProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    className?: string;
    /** CSS color string for the 2px top accent bar */
    accent?: string;
}

export function Dialog({ isOpen, onClose, title, children, className, accent }: DialogProps) {
    return (
        <DialogPrimitive.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogPrimitive.Portal>
                <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-foreground/10 backdrop-blur-[3px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
                <DialogPrimitive.Content
                    className={cn(
                        "fixed left-[50%] top-[50%] z-50 w-full max-w-md translate-x-[-50%] translate-y-[-50%]",
                        "bg-card border border-border shadow-2xl shadow-black/8",
                        "rounded-2xl max-h-[90vh] overflow-hidden flex flex-col",
                        "duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out",
                        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
                        "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
                        "data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]",
                        "data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
                        className
                    )}
                >
                    {/* 2px accent bar — use Tailwind class for default so CSS variable resolves correctly */}
                    <div
                        className={cn("h-0.5 w-full shrink-0", !accent && "bg-border")}
                        style={accent ? { background: accent } : undefined}
                    />

                    {/* Sticky header */}
                    <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border/40 shrink-0">
                        <DialogPrimitive.Title className="font-display text-lg font-medium tracking-tight">
                            {title}
                        </DialogPrimitive.Title>
                        <DialogPrimitive.Close
                            onClick={onClose}
                            className="flex items-center justify-center w-7 h-7 rounded-full text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground focus:outline-none"
                        >
                            <X className="h-3.5 w-3.5" />
                            <span className="sr-only">Close</span>
                        </DialogPrimitive.Close>
                    </div>

                    {/* Scrollable body */}
                    <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>
                    <div className="overflow-y-auto flex-1 px-6 py-5">
                        {children}
                    </div>
                </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
    );
}
