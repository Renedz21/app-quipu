/**
 * Curated icon set for Quipu.
 *
 * Icons are re-exported one by one (NOT via `export * from "lucide-react"`) so
 * that:
 *   1. Tree-shaking is guaranteed by every bundler — no need to trust
 *      `sideEffects: false` in lucide-react's package.json.
 *   2. The set of icons the app can use is explicit. Adding a new icon is a
 *      deliberate choice (design system decision), not a free-for-all.
 *   3. If we ever migrate away from lucide-react, only this file changes.
 *
 * To add a new icon: import it from `lucide-react` and add it to the export
 * list below. The lucide-react docs list all available names.
 */
export {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Banknote,
  Bell,
  Calculator,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronUp,
  CircleDollarSign,
  Clock,
  Coins,
  Copy,
  CreditCard,
  Crown,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  Filter,
  Heart,
  HelpCircle,
  Home,
  Info,
  Loader2,
  Lock,
  LogIn,
  LogOut,
  Mail,
  Menu,
  Minus,
  Moon,
  MoreHorizontal,
  MoreVertical,
  Pencil,
  PiggyBank,
  Plus,
  Receipt,
  Redo2,
  Save,
  Search,
  Settings,
  SlidersHorizontal,
  Star,
  Sun,
  Trash2,
  TrendingDown,
  TrendingUp,
  Undo2,
  Upload,
  User,
  Users,
  Wallet,
  X,
  XCircle,
} from "lucide-react"
