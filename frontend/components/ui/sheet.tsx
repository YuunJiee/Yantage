'use client';

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SheetProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    className?: string;
}

export function Sheet({ isOpen, onClose, title, children, className }: SheetProps) {
    return (
        <DialogPrimitive.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogPrimitive.Portal>
                <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-foreground/15 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
                <DialogPrimitive.Content
                    className={cn(
                        "fixed bottom-0 left-0 right-0 z-50",
                        "bg-card border-t border-border/60 shadow-2xl shadow-black/12",
                        "rounded-t-3xl max-h-[92vh] flex flex-col",
                        "duration-300 data-[state=open]:animate-in data-[state=closed]:animate-out",
                        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
                        "data-[state=closed]:slide-out-to-bottom-full data-[state=open]:slide-in-from-bottom-full",
                        className
                    )}
                >
                    {/* Drag handle indicator */}
                    <div className="flex justify-center pt-3 pb-1 shrink-0">
                        <div className="w-9 h-1 rounded-full bg-border" />
                    </div>

                    {/* Header */}
                    <div className="flex items-center justify-between px-6 pt-3 pb-4 shrink-0">
                        <DialogPrimitive.Title className="font-display text-lg font-medium tracking-tight">
                            {title}
                        </DialogPrimitive.Title>
                        <DialogPrimitive.Close
                            onClick={onClose}
                            className="flex items-center justify-center w-7 h-7 rounded-full text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground focus:outline-none"
                        >
                            <X className="h-3.5 w-3.5" />
                            <span className="sr-only">關閉</span>
                        </DialogPrimitive.Close>
                    </div>

                    {/* Scrollable body */}
                    <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>
                    <div className="overflow-y-auto flex-1 px-6 pb-10">
                        {children}
                    </div>
                </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
    );
}
