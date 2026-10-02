import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  CreditCard,
  FolderOpen,
  House,
  Laptop,
  Package,
  Shirt,
  ShoppingCart,
  Smartphone,
  Sparkles,
  Star,
  Store,
  Tag,
  UsersRound,
  WashingMachine,
} from "lucide-react";

const categoryColors = ["blue", "pink", "purple", "gold", "green", "orange"];

const categoryIcon = (name) => {
  const label = name.toLowerCase();
  if (label.includes("mobile") || label.includes("phone")) return Smartphone;
  if (label.includes("fashion") || label.includes("cloth")) return Shirt;
  if (label.includes("electronic")) return Laptop;
  if (label.includes("home") || label.includes("house")) return House;
  if (label.includes("appliance")) return WashingMachine;
  if (label.includes("beauty")) return Sparkles;
  return Package;
};

function Dashboard() {
  const [stats, setStats] = useState({
    customers: 0,
    sellers: 0,
    products: 0,
    orders: 0,
    categories: 0,
    offers: 0,
    payments: 0,
    reviews: 0,
    revenue: 0,
  });

  const [recentOrders, setRecentOrders] = useState([]);
  const [categories, setCategories] = useState([]);
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const response = await fetch("http://localhost:5000/api/dashboard");
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || "Failed to load dashboard");
      if (data.success) {
        setStats(data.stats);
        setRecentOrders(data.recent_orders || []);
      }
    } catch (error) {
      console.error("Dashboard error:", error);
      alert("Unable to connect to backend.");
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboardLists = async () => {
    const [categoriesResult, offersResult] = await Promise.allSettled([
      fetch("http://localhost:5000/api/categories").then((response) => {
        if (!response.ok) throw new Error("Failed to load categories");
        return response.json();
      }),
      fetch("http://localhost:5000/api/offers").then((response) => {
        if (!response.ok) throw new Error("Failed to load offers");
        return response.json();
      }),
    ]);

    if (categoriesResult.status === "fulfilled") setCategories(categoriesResult.value);
    else console.error("Category list error:", categoriesResult.reason);
    if (offersResult.status === "fulfilled") setOffers(offersResult.value);
    else console.error("Offer list error:", offersResult.reason);
  };

  useEffect(() => {
    fetchDashboard();
    fetchDashboardLists();
  }, []);

  const formatDate = (date) => {
    if (!date) return "N/A";
    const parsedDate = new Date(date);
    if (Number.isNaN(parsedDate.getTime())) return String(date);
    return parsedDate.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(Number(amount || 0));

  const activeOffers = offers.filter((offer) => {
    const formatDay = (date) => [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
    ].join("-");
    const today = formatDay(new Date());
    const startsOn = offer.Offer_StartDate ? formatDay(new Date(offer.Offer_StartDate)) : null;
    const endsOn = offer.Offer_EndDate ? formatDay(new Date(offer.Offer_EndDate)) : null;
    return (!startsOn || startsOn <= today) && (!endsOn || endsOn >= today);
  }).slice(0, 3);

  const statCards = [
    { label: "Customers", value: stats.customers, icon: UsersRound, tone: "blue" },
    { label: "Sellers", value: stats.sellers, icon: Store, tone: "green" },
    { label: "Products", value: stats.products, icon: Package, tone: "purple" },
    { label: "Orders", value: stats.orders, icon: ShoppingCart, tone: "orange" },
    { label: "Categories", value: stats.categories, icon: FolderOpen, tone: "pink" },
    { label: "Offers", value: stats.offers, icon: Tag, tone: "gold" },
    { label: "Payments", value: stats.payments, icon: CreditCard, tone: "teal" },
    { label: "Reviews", value: stats.reviews, icon: Star, tone: "yellow" },
  ];

  if (loading) {
    return (
      <div className="dashboard-page">
        <div className="loading-text">Loading marketplace dashboard...</div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="hero">
        <div className="hero-copy">
          <div className="loyalty-pill">Live marketplace insights</div>
          <h1>Welcome back, Admin</h1>
          <p>Track growth, fulfilment, and seller performance in one premium command center.</p>
          <div className="hero-actions">
            <a className="primary-btn small" href="#analytics">View analytics</a>
            <Link className="ghost-btn light" to="/products">Open catalog</Link>
          </div>
        </div>

        <div className="hero-metrics">
          <div className="mini-card">
            <span>GMV</span>
            <strong>{formatCurrency(stats.revenue)}</strong>
          </div>
          <div className="mini-card">
            <span>Orders today</span>
            <strong>{stats.orders}</strong>
          </div>
          <div className="mini-card">
            <span>Active sellers</span>
            <strong>{stats.sellers}</strong>
          </div>
        </div>
      </div>

      <div className="category-strip">
        {categories.length > 0 ? categories.map((category, index) => {
          const Icon = categoryIcon(category.Category_Name);
          return (
            <Link
              key={category.Category_ID}
              className={`category-pill ${categoryColors[index % categoryColors.length]}`}
              to={`/products?category=${category.Category_ID}`}
              title={`${category.Product_Count} products`}
            >
              <span><Icon size={18} strokeWidth={1.8} aria-hidden="true" /></span>
              {category.Category_Name}
            </Link>
          );
        }) : <span className="empty-state">No marketplace categories yet.</span>}
      </div>

      <div className="stats-grid">
        {statCards.map((item) => (
          <div key={item.label} className={`stat-card ${item.tone}`}>
            <div className="stat-icon"><item.icon size={21} strokeWidth={1.8} aria-hidden="true" /></div>
            <div>
              <p>{item.label}</p>
              <h3>{item.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="deal-grid">
        {activeOffers.length > 0 ? activeOffers.map((offer) => (
          <Link key={offer.Offer_ID} to="/offers" className="deal-card dashboard-deal-link">
            <div className="deal-tag">{Number(offer.Offer_Discount)}% off</div>
            <h3>{offer.Offer_Name}</h3>
            <p>{offer.Product_Count} linked products · {offer.Offer_EndDate ? `Ends ${formatDate(offer.Offer_EndDate)}` : "No end date"}</p>
          </Link>
        )) : (
          <Link to="/offers" className="deal-card dashboard-deal-link">
            <div className="deal-tag">Marketplace promotions</div>
            <h3>No active offers</h3>
            <p>Open offers to create or manage a promotion.</p>
          </Link>
        )}
      </div>

      <div className="dashboard-bottom" id="analytics">
        <div className="card revenue-card">
          <div className="card-header">
            <h2>Revenue overview</h2>
            <span className="badge badge-green">Live</span>
          </div>
          <div className="revenue-box">
            <div className="revenue-amount">{formatCurrency(stats.revenue)}</div>
            <div className="revenue-meta">
              <span>Paid transactions</span>
              <strong>{stats.payments}</strong>
            </div>
          </div>
        </div>

        <div className="card order-card">
          <div className="card-header">
            <h2>Recent orders</h2>
            <span className="badge badge-blue">{recentOrders.length}</span>
          </div>

          {recentOrders.length > 0 ? (
            <div className="order-list">
              {recentOrders.map((order) => (
                <div key={order.Order_ID} className="order-row">
                  <div>
                    <strong>#{order.Order_ID}</strong>
                    <span>{order.Customer_Name || "Guest"}</span>
                  </div>
                  <div>
                    <strong>{order.Order_Status}</strong>
                    <span>{formatDate(order.Order_Date)}</span>
                  </div>
                  <div className="amount-text">{formatCurrency(order.Order_Amount)}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-state">No recent orders yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;