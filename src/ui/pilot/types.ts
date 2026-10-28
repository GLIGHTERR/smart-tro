export type PilotButtonProps = { label: string; onPress: () => void; disabled?: boolean; testID?: string };
export type PilotFieldProps = { label: string; value: string; onChange: (value: string) => void; error?: string; keyboardType?: "default" | "email-address" | "numeric"; testID?: string };
export type PilotDialogProps = { visible: boolean; title: string; message: string; onClose: () => void; closeTestID?: string };
export type PilotToastEvent = { id: string; message: string };
