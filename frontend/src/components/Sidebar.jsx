import { NavLink } from "react-router-dom";
import {
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  Package,
  Star,
  Store,
  Tags,
  Truck,
  UsersRound,
  ShoppingCart,
} from "lucide-react";

const navSections = [
  {
    title: "Overview",
    items: [
      { to: "/", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    title: "Marketplace",
    items: [
      { to: "/products", label: "Products", icon: Package },
      { to: "/categories", label: "Categories", icon: Tags },
      { to: "/offers", label: "Offers", icon: Store },
    ],
  },
  {
    title: "People",
    items: [
      { to: "/customers", label: "Customers", icon: UsersRound },
      { to: "/sellers", label: "Sellers", icon: Store },
    ],
  },
  {
    title: "Operations",
    items: [
      { to: "/orders", label: "Orders", icon: ShoppingCart },
      { to: "/order-items", label: "Order Items", icon: ClipboardList },
      { to: "/payments", label: "Payments", icon: CreditCard },
      { to: "/delivery", label: "Delivery", icon: Truck },
      { to: "/reviews", label: "Reviews", icon: Star },
    ],
  },
];

function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="brand-block">
        <div className="brand-mark">G</div>
        <div>
          <div className="brand-name">GridMart</div>
          <div className="brand-tag">Commerce OS</div>
        </div>
      </div>

      {navSections.map((section) => (
        <div key={section.title}>
          <div className="menu-title">{section.title}</div>
          {section.items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
            >
                <span><item.icon size={18} strokeWidth={1.8} aria-hidden="true" /></span>
              {item.label}
            </NavLink>
          ))}
        </div>
      ))}
    </aside>
  );
}

export default Sidebar;