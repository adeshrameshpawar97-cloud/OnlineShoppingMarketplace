import { NavLink } from "react-router-dom";

function Sidebar() {
  return (
    <aside className="sidebar">

      <div className="logo">
        Shop<span>Sphere</span>
      </div>

      <p className="logo-subtitle">
        Online Shopping Marketplace
      </p>

      <div className="menu-title">MAIN</div>

      <NavLink
        to="/"
        className={({ isActive }) =>
          `nav-link ${isActive ? "active" : ""}`
        }
      >
        <span>📊</span>
        Dashboard
      </NavLink>

      <div className="menu-title">MARKETPLACE</div>

      <NavLink
        to="/products"
        className="nav-link"
      >
        <span>📦</span>
        Products
      </NavLink>

      <NavLink
        to="/categories"
        className="nav-link"
      >
        <span>📂</span>
        Categories
      </NavLink>

      <NavLink
        to="/offers"
        className="nav-link"
      >
        <span>🎁</span>
        Offers
      </NavLink>

      <div className="menu-title">USERS</div>

      <NavLink
        to="/customers"
        className="nav-link"
      >
        <span>👤</span>
        Customers
      </NavLink>

      <NavLink
        to="/sellers"
        className="nav-link"
      >
        <span>🏪</span>
        Sellers
      </NavLink>

      <div className="menu-title">ORDERS</div>

      <NavLink
        to="/orders"
        className="nav-link"
      >
        <span>🛒</span>
        Orders
      </NavLink>

      <NavLink
        to="/order-items"
        className="nav-link"
      >
        <span>📋</span>
        Order Items
      </NavLink>

      <NavLink
        to="/payments"
        className="nav-link"
      >
        <span>💳</span>
        Payments
      </NavLink>

      <NavLink
        to="/delivery"
        className="nav-link"
      >
        <span>🚚</span>
        Delivery
      </NavLink>

      <NavLink
        to="/reviews"
        className="nav-link"
      >
        <span>⭐</span>
        Reviews
      </NavLink>

    </aside>
  );
}

export default Sidebar;