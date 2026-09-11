'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { GripHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    DndContext, closestCenter, PointerSensor, TouchSensor,
    useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export type SectionId = 'goals' | 'chart' | 'performers' | 'assets';

const DEFAULT_SECTION_ORDER: SectionId[] = ['goals', 'chart', 'performers', 'assets'];
const STORAGE_KEY = 'dashboard_section_order';

function SortableSection({ id, children }: { id: SectionId; children: ReactNode }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
    return (
        <div
            ref={setNodeRef}
            style={{ transform: CSS.Transform.toString(transform), transition }}
            className={cn(isDragging && "opacity-50 z-50 relative")}
        >
            <div
                {...attributes}
                {...listeners}
                className="flex justify-center pb-2 cursor-grab active:cursor-grabbing touch-none select-none"
            >
                <GripHorizontal className="w-4 h-4 text-muted-foreground/20 hover:text-muted-foreground/50 transition-colors" />
            </div>
            {children}
        </div>
    );
}

interface SortableSectionsProps {
    sections: { id: SectionId; render: () => ReactNode }[];
}

/** Drag-to-reorder dashboard sections, persisted to localStorage across reloads. */
export function SortableSections({ sections }: SortableSectionsProps) {
    const [sectionOrder, setSectionOrder] = useState<SectionId[]>(DEFAULT_SECTION_ORDER);

    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                const parsed: SectionId[] = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length === DEFAULT_SECTION_ORDER.length) {
                    setSectionOrder(parsed);
                }
            } catch { /* ignore */ }
        }
    }, []);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    );

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        setSectionOrder(prev => {
            const next = arrayMove(prev, prev.indexOf(active.id as SectionId), prev.indexOf(over.id as SectionId));
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
            return next;
        });
    }

    const byId = new Map(sections.map(s => [s.id, s]));

    return (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={sectionOrder} strategy={verticalListSortingStrategy}>
                <div className="flex flex-col gap-8">
                    {sectionOrder.map(id => {
                        const section = byId.get(id);
                        if (!section) return null;
                        return (
                            <SortableSection key={id} id={id}>
                                {section.render()}
                            </SortableSection>
                        );
                    })}
                </div>
            </SortableContext>
        </DndContext>
    );
}
