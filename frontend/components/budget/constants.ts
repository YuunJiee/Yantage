export const COLOR_OPTIONS = [
    { value: 'emerald', bg: 'bg-emerald-100', text: 'text-emerald-600', bar: 'bg-emerald-500' },
    { value: 'blue', bg: 'bg-blue-100', text: 'text-blue-600', bar: 'bg-blue-500' },
    { value: 'purple', bg: 'bg-purple-100', text: 'text-purple-600', bar: 'bg-purple-500' },
    { value: 'amber', bg: 'bg-amber-100', text: 'text-amber-600', bar: 'bg-amber-500' },
    { value: 'pink', bg: 'bg-pink-100', text: 'text-pink-600', bar: 'bg-pink-500' },
    { value: 'cyan', bg: 'bg-cyan-100', text: 'text-cyan-600', bar: 'bg-cyan-500' },
    { value: 'orange', bg: 'bg-orange-100', text: 'text-orange-600', bar: 'bg-orange-500' },
    { value: 'rose', bg: 'bg-rose-100', text: 'text-rose-600', bar: 'bg-rose-500' },
];

export const getColors = (color: string | null) => COLOR_OPTIONS.find(c => c.value === color) ?? COLOR_OPTIONS[0];

export const MACRO_GROUPS = ['Fixed', 'Living', 'Investment', 'Growth', 'Unassigned'] as const;

export const GROUP_ZH: Record<string, string> = {
    Fixed: '固定生存',
    Living: '生活支出',
    Investment: '投資',
    Growth: '成長',
    Unassigned: '未分類',
};
