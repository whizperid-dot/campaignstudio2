import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 rounded-full',
  {
    variants: {
      variant: {
        default:     'bg-[#1434cb] text-white hover:bg-[#0e2490]',
        destructive: 'bg-[#dc2626] text-white hover:bg-[#b91c1c]',
        outline:     'border border-[#dde3f5] bg-white text-[#07143a] hover:bg-[#f0f3fb]',
        secondary:   'border border-[#dde3f5] bg-white text-[#07143a] hover:bg-[#f0f3fb]',
        ghost:       'text-[#4a5578] hover:bg-[#f0f3fb]',
        link:        'text-[#1434cb] underline-offset-4 hover:underline',
        success:     'bg-[#16a34a] text-white hover:bg-[#15803d]',
      },
      size: {
        default: 'h-10 px-5 py-2',
        sm:      'h-8 px-4 text-xs',
        lg:      'h-12 px-7 text-base',
        icon:    'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  showChevron?: boolean;
}

const ShadcnButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, showChevron, children, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    const isDark = !variant || variant === 'default' || variant === 'destructive' || variant === 'success';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      >
        {children}
        {showChevron && (
          <ChevronRight
            size={14}
            className="ml-1 flex-shrink-0"
            style={{ color: isDark ? '#f7b600' : '#1434cb' }}
          />
        )}
      </Comp>
    );
  }
);
ShadcnButton.displayName = 'Button';

export { ShadcnButton as Button, buttonVariants };

// App-level button used by campaign components
type AppVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
type AppSize = 'sm' | 'md' | 'lg';

interface AppButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: AppVariant;
  size?: AppSize;
  loading?: boolean;
  icon?: React.ReactNode;
  showChevron?: boolean;
}

const appVariantStyles: Record<AppVariant, { bg: string; text: string; border: string; hoverBg: string; chevronColor: string }> = {
  primary:   { bg: '#1434cb', text: '#fff',     border: '#1434cb', hoverBg: '#0e2490', chevronColor: '#f7b600' },
  secondary: { bg: '#fff',    text: '#07143a',  border: '#dde3f5', hoverBg: '#f0f3fb', chevronColor: '#1434cb' },
  ghost:     { bg: 'transparent', text: '#4a5578', border: 'transparent', hoverBg: '#f0f3fb', chevronColor: '#1434cb' },
  danger:    { bg: '#dc2626', text: '#fff',     border: '#dc2626', hoverBg: '#b91c1c', chevronColor: '#f7b600' },
  success:   { bg: '#16a34a', text: '#fff',     border: '#16a34a', hoverBg: '#15803d', chevronColor: '#f7b600' },
};

const appSizeStyles: Record<AppSize, string> = {
  sm: 'px-4 py-1.5 text-xs',
  md: 'px-5 py-2 text-sm',
  lg: 'px-7 py-3 text-base',
};

function AppButton({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  showChevron = true,
  children,
  className = '',
  disabled,
  style,
  onMouseEnter,
  onMouseLeave,
  ...props
}: AppButtonProps) {
  const v = appVariantStyles[variant];
  const [hovered, setHovered] = React.useState(false);

  return (
    <button
      className={`inline-flex items-center gap-2 font-medium transition-all rounded-full disabled:opacity-50 disabled:cursor-not-allowed ${appSizeStyles[size]} ${className}`}
      style={{
        background: hovered ? v.hoverBg : v.bg,
        color: v.text,
        border: `1.5px solid ${v.border}`,
        ...style,
      }}
      disabled={disabled || loading}
      onMouseEnter={(e) => { setHovered(true); onMouseEnter?.(e); }}
      onMouseLeave={(e) => { setHovered(false); onMouseLeave?.(e); }}
      {...props}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        icon
      )}
      {children}
      {!loading && showChevron && (
        <ChevronRight size={13} className="flex-shrink-0" style={{ color: v.chevronColor }} />
      )}
    </button>
  );
}

export default AppButton;
