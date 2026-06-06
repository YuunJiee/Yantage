import { Sheet } from "@/components/ui/sheet";
import { IntegrationManager } from "./IntegrationManager";

interface IntegrationDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

export function IntegrationDialog({ isOpen, onClose }: IntegrationDialogProps) {
    return (
        <Sheet isOpen={isOpen} onClose={onClose} title="串接整合">
            <IntegrationManager />
        </Sheet>
    );
}
