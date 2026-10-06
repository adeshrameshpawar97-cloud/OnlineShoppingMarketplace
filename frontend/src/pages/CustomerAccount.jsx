import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { clearMarketplaceSession, getMarketplaceSession, marketplaceFetch } from "../auth";

const API = "http://localhost:5000/api";
const money = (amount) => new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
}).format(Number(amount) || 0);

function CustomerAccount() {
  const navigate = useNavigate();
  const session = getMarketplaceSession("customer");
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    marketplaceFetch("customer", `${API}/customer/orders`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Could not load your orders");
        if (active) setOrders(data);
      })
      .catch((loadError) => {
        if (active) setError(loadError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const signOut = () => {
    clearMarketplaceSession("customer");
    navigate("/login?role=customer", { replace: true });
  };

  return (
    <main className="portal-page">
      <header className="portal-header">
        <div>
          <span className="portal-eyebrow">CUSTOMER ACCOUNT</span>
          <h1>Welcome, {session.user.name}</h1>
          <p>{session.user.email}</p>
        </div>
        <div className="portal-actions">
          <Link className="secondary-btn" to="/shop">Continue shopping</Link>
          <button className="delete-btn" onClick={signOut}>Sign out</button>
        </div>
      </header>

      <section className="portal-section">
        <div className="portal-section-heading">
          <div><h2>Your orders</h2><p>Only orders placed from your customer account appear here.</p></div>
          <span className="portal-count">{orders.length} orders</span>
        </div>
        {error && <p className="portal-error" role="alert">{error}</p>}
        {loading ? (
          <p className="loading-text">Loading your orders...</p>
        ) : orders.length ? (
          <div className="table-container">
            <table>
              <thead><tr><th>Order</th><th>Date</th><th>Items</th><th>Status</th><th>Total</th></tr></thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.Order_ID}>
                    <td>#{order.Order_ID}</td>
                    <td>{String(order.Order_Date || "").slice(0, 10)}</td>
                    <td>{order.Products || "Order details"}</td>
                    <td><span className="portal-status">{order.Order_Status}</span></td>
                    <td className="amount-text">{money(order.Order_Amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="portal-empty"><strong>No orders yet</strong><p>Explore the catalog and place your first order.</p><Link className="primary-btn" to="/shop">Browse products</Link></div>
        )}
      </section>
    </main>
  );
}

export default CustomerAccount;
