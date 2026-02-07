"use client";

import {
  Button,
  Modal,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalTitle,
  ModalDescription,
} from "@b2b/ui";
import { AlertTriangle, Loader2 } from "lucide-react";

interface DeleteFileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileName: string;
  onConfirm: () => Promise<void>;
  isDeleting: boolean;
}

export function DeleteFileModal({
  open,
  onOpenChange,
  fileName,
  onConfirm,
  isDeleting,
}: DeleteFileModalProps) {
  const handleConfirm = async () => {
    await onConfirm();
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent>
        <ModalHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <ModalTitle>Delete File</ModalTitle>
              <ModalDescription>
                This action cannot be undone.
              </ModalDescription>
            </div>
          </div>
        </ModalHeader>

        <div className="px-6 py-4">
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete{" "}
            <span className="font-medium text-foreground">{fileName}</span>? This
            file will be permanently removed and cannot be recovered.
          </p>
        </div>

        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete File"
            )}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
