export type PilotButtonProps = { label: string; onPress: () => void; disabled?: boolean };
export type PilotFieldProps = { label: string; value: string; onChange: (value: string) => void; error?: string; keyboardType?: "default" | "email-address" | "numeric" };
export type PilotDialogProps = { visible: boolean; title: string; message: string; onClose: () => void };
export type PilotToastEvent = { id: string; message: string };
