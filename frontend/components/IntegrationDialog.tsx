import { Dialog } from "@/components/ui/dialog";
import { IntegrationManager } from "./IntegrationManager";

interface IntegrationDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

export function IntegrationDialog({ isOpen, onClose }: IntegrationDialogProps) {
    return (
        <Dialog isOpen={isOpen} onClose={onClose} title="管理整合">
            <div className="max-h-[80vh] overflow-y-auto pr-1">
                <IntegrationManager />
            </div>
        </Dialog>
    );
}
