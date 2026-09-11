export interface AddAssetFormData {
    name: string;
    ticker: string;
    category: string;
    subCategory: string;
    initialBalance: string;
    includeInNetWorth: boolean;
    icon: string;
    manualAvgCost: string;
    paymentDueDay: string;
}

export const emptyAddAssetForm = (defaultCategory?: string): AddAssetFormData => ({
    name: '',
    ticker: '',
    category: defaultCategory || 'Fluid',
    subCategory: '',
    initialBalance: '',
    includeInNetWorth: true,
    icon: '',
    manualAvgCost: '',
    paymentDueDay: '',
});
