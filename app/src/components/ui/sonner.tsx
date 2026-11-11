import { Toaster as Sonner, type ToasterProps } from 'sonner';
import { useTheme } from '@/hooks/useTheme';

export function Toaster(props: ToasterProps) {
  const { theme } = useTheme();
  return (
    <Sonner
      theme={theme}
      closeButton
      toastOptions={{
        classNames: {
          toast: 'rounded-xl border bg-popover text-popover-foreground shadow-lift font-sans',
          description: 'text-muted-foreground',
        },
      }}
      {...props}
    />
  );
}
