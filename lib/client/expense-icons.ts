import {
  Baby,
  Banknote,
  BookOpen,
  Car,
  CigaretteIcon,
  Coffee,
  CookingPot,
  Dumbbell,
  FileText,
  Film,
  Gamepad,
  Gift,
  GraduationCap,
  HeartPulse,
  Home,
  Music,
  Package,
  PawPrint,
  Plane,
  Plus,
  Scissors,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Tag,
  Truck,
  Tv,
  Utensils,
  Wifi,
  Wine,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";

export type ExpenseIconEntry = {
  Icon: LucideIcon;
  label: string;
};

export const EXPENSE_ICONS: Record<string, ExpenseIconEntry> = {
  belanja:    { Icon: ShoppingCart,  label: "Belanja" },
  makanan:    { Icon: CookingPot,    label: "Makanan" },
  kopi:       { Icon: Coffee,        label: "Kopi" },
  tagihan:    { Icon: FileText,      label: "Tagihan" },
  mobil:      { Icon: Truck,         label: "Transport" },
  rokok:      { Icon: CigaretteIcon, label: "Rokok" },
  game:       { Icon: Gamepad,       label: "Game" },
  hiburan:    { Icon: Film,          label: "Hiburan" },
  rumah:      { Icon: Home,          label: "Rumah" },
  listrik:    { Icon: Zap,           label: "Listrik" },
  internet:   { Icon: Wifi,          label: "Internet" },
  kesehatan:  { Icon: HeartPulse,    label: "Kesehatan" },
  travel:     { Icon: Plane,         label: "Travel" },
  hadiah:     { Icon: Gift,          label: "Hadiah" },
  salon:      { Icon: Scissors,      label: "Salon" },
  olahraga:   { Icon: Dumbbell,      label: "Olahraga" },
  musik:      { Icon: Music,         label: "Musik" },
  restoran:   { Icon: Utensils,      label: "Restoran" },
  fashion:    { Icon: ShoppingBag,   label: "Fashion" },
  gadget:     { Icon: Smartphone,    label: "Gadget" },
  pendidikan: { Icon: GraduationCap, label: "Pendidikan" },
  peliharaan: { Icon: PawPrint,      label: "Peliharaan" },
  bayi:       { Icon: Baby,          label: "Bayi" },
  cicilan:    { Icon: Banknote,      label: "Cicilan" },
  bensin:     { Icon: Car,           label: "Bensin" },
  servis:     { Icon: Wrench,        label: "Servis" },
  streaming:  { Icon: Tv,            label: "Streaming" },
  buku:       { Icon: BookOpen,      label: "Buku" },
  minuman:    { Icon: Wine,          label: "Minuman" },
  lainnya:    { Icon: Package,       label: "Lainnya" },
};

export { Plus, Tag };

export function getExpenseIcon(key: string | null | undefined): LucideIcon {
  if (key && key in EXPENSE_ICONS) return EXPENSE_ICONS[key].Icon;
  return Tag;
}
