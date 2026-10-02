import { Link } from "react-router-dom";
import { Bell, Search } from "lucide-react";

function Topbar() {
  const adminName = localStorage.getItem("adminUsername") || "Admin";

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
          <span className="notification"><Bell size={17} strokeWidth={1.8} aria-hidden="true" /></span>
          <div className="avatar">{adminName.charAt(0).toUpperCase()}</div>
          <div className="profile-info">
            <strong>{adminName}</strong>
            <small>Marketplace Admin</small>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Topbar;