'use client';
import type { LucideIcon } from 'lucide-react';
import {
    Activity,
    Archive,
    ArrowLeftRight,
    Award,
    BadgeCheck,
    BarChart3,
    Brain,
    Briefcase,
    Check,
    CheckCircle2,
    ChevronRight,
    Circle,
    ClipboardList,
    Droplets,
    FileDown,
    FileText,
    Flame,
    Gift,
    Heart,
    HeartOff,
    Home,
    Leaf,
    Lock,
    LogOut,
    Mail,
    Menu,
    MapPin,
    MessageCircle,
    Mountain,
    Package,
    Phone,
    Receipt,
    RefreshCcw,
    Search,
    Send,
    Sparkles,
    Scale,
    Handshake,
    ShoppingBag,
    Store,
    Star,
    TicketPercent,
    Timer,
    Truck,
    User,
    Users,
    Wallet,
    XCircle,
    AlertTriangle,
} from 'lucide-react';

type AppIconName = string;

type AppIconProps = {
    name?: AppIconName;
    size?: number;
    strokeWidth?: number;
    className?: string;
    'aria-hidden'?: boolean;
};

const ICONS: Record<string, LucideIcon> = {
    activity: Activity,
    archive: Archive,
    badge: BadgeCheck,
    barChart: BarChart3,
    brain: Brain,
    briefcase: Briefcase,
    check: Check,
    checkCircle: CheckCircle2,
    chevronRight: ChevronRight,
    circle: Circle,
    clipboard: ClipboardList,
    drop: Droplets,
    fileDown: FileDown,
    fileText: FileText,
    flame: Flame,
    gift: Gift,
    heart: Heart,
    heartOff: HeartOff,
    home: Home,
    leaf: Leaf,
    lock: Lock,
    logout: LogOut,
    mail: Mail,
    menu: Menu,
    mapPin: MapPin,
    message: MessageCircle,
    mountain: Mountain,
    package: Package,
    phone: Phone,
    receipt: Receipt,
    refresh: RefreshCcw,
    search: Search,
    send: Send,
    sparkles: Sparkles,
    scale: Scale,
    handshake: Handshake,
    shopping: ShoppingBag,
    store: Store,
    star: Star,
    swap: ArrowLeftRight,
    arrowLeftRight: ArrowLeftRight,
    ticket: TicketPercent,
    timer: Timer,
    truck: Truck,
    user: User,
    users: Users,
    wallet: Wallet,
    xCircle: XCircle,
    alertTriangle: AlertTriangle,
    award: Award,
};

export function resolveIconName(value?: string): AppIconName {
    if (!value) return 'circle';
    return value;
}

export default function AppIcon({ name = 'circle', size = 18, strokeWidth = 1.9, className, ...rest }: AppIconProps) {
    const resolvedName = resolveIconName(name);
    const Icon = ICONS[resolvedName] || Circle;
    return <Icon size={size} strokeWidth={strokeWidth} className={className} {...rest} />;
}
