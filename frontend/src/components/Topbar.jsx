import { Link, useNavigate } from "react-router-dom";
import { LogOut, Search } from "lucide-react";
import NotificationBell from "./NotificationBell";

function Topbar() {
  const navigate = useNavigate();
  const adminName = localStorage.getItem("adminUsername") || "Admin";

  const handleLogout = () => {
    localStorage.removeItem("adminLoggedIn");
    localStorage.removeItem("adminUsername");
    navigate("/login", { replace: true });
  };

  return (
    <header className="topbar">
      <div className="topbar-search-wrap">
        <div className="search-icon"><Search size={18} strokeWidth={1.8} aria-hidden="true" /></div>
        <input
          className="topbar-search"
          type="text"
          placeholder="Search products, customers, orders..."
        />
      </div>

      <div className="topbar-actions">
        <a className="ghost-btn storefront-link" href="/shop">Open storefront</a>
        <Link className="ghost-btn storefront-link" to="/shop?view=wishlist">Wishlist</Link>
        <Link className="primary-btn small topbar-campaign-link" to="/offers">+ New Campaign</Link>

        <div className="profile">
          <NotificationBell role="admin" />
          <div className="avatar">{adminName.charAt(0).toUpperCase()}</div>
          <div className="profile-info">
            <strong>{adminName}</strong>
            <small>Marketplace Admin</small>
          </div>
          <button
            className="ghost-btn admin-logout-btn"
            type="button"
            onClick={handleLogout}
            aria-label="Log out of admin account"
          >
            <LogOut size={16} aria-hidden="true" />
            <span>Log out</span>
          </button>
        </div>
      </div>
    </header>
  );
}

export default Topbar;