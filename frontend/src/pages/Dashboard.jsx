import { useEffect, useState } from "react";

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

  const [loading, setLoading] = useState(true);

  // =====================================================
  // FETCH DASHBOARD DATA
  // =====================================================

  const fetchDashboard = async () => {
    try {
      setLoading(true);

      const response = await fetch(
        "http://10.167.96.27:5000/api/dashboard"
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to load dashboard"
        );
      }

      if (data.success) {
        setStats(data.stats);
        setRecentOrders(
          data.recent_orders || []
        );
      }

    } catch (error) {
      console.error(
        "Dashboard error:",
        error
      );

      alert(
        "Unable to connect to backend."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  // =====================================================
  // FORMAT DATE
  // =====================================================

  const formatDate = (date) => {
    if (!date) {
      return "N/A";
    }

    return String(date).split("T")[0];
  };

  // =====================================================
  // FORMAT CURRENCY
  // =====================================================

  const formatCurrency = (amount) => {
    return `₹${Number(amount || 0).toFixed(2)}`;
  };

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div className="dashboard-page">
        <div className="loading-text">
          Loading dashboard...
        </div>
      </div>
    );
  }

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="dashboard-page">

      {/* HERO */}

      <div className="hero">

        <div>

          <h1>
            Welcome to ShopSphere 👋
          </h1>

          <p>
            Online Shopping Marketplace
            Management System
          </p>

          <span>
            Real-time data from MySQL database
          </span>

        </div>

      </div>


      {/* MAIN STATS */}

      <div className="stats-grid">

        {/* CUSTOMERS */}

        <div className="stat-card">

          <div className="stat-icon">
            👥
          </div>

          <div>

            <p>
              Total Customers
            </p>

            <h2>
              {stats.customers}
            </h2>

          </div>

        </div>


        {/* SELLERS */}

        <div className="stat-card">

          <div className="stat-icon">
            🏪
          </div>

          <div>

            <p>
              Total Sellers
            </p>

            <h2>
              {stats.sellers}
            </h2>

          </div>

        </div>


        {/* PRODUCTS */}

        <div className="stat-card">

          <div className="stat-icon">
            📦
          </div>

          <div>

            <p>
              Total Products
            </p>

            <h2>
              {stats.products}
            </h2>

          </div>

        </div>


        {/* ORDERS */}

        <div className="stat-card">

          <div className="stat-icon">
            🛒
          </div>

          <div>

            <p>
              Total Orders
            </p>

            <h2>
              {stats.orders}
            </h2>

          </div>

        </div>

      </div>


      {/* SECONDARY STATS */}

      <div className="stats-grid">

        <div className="stat-card">

          <div className="stat-icon">
            📂
          </div>

          <div>

            <p>
              Categories
            </p>

            <h2>
              {stats.categories}
            </h2>

          </div>

        </div>


        <div className="stat-card">

          <div className="stat-icon">
            🎁
          </div>

          <div>

            <p>
              Offers
            </p>

            <h2>
              {stats.offers}
            </h2>

          </div>

        </div>


        <div className="stat-card">

          <div className="stat-icon">
            💳
          </div>

          <div>

            <p>
              Payments
            </p>

            <h2>
              {stats.payments}
            </h2>

          </div>

        </div>


        <div className="stat-card">

          <div className="stat-icon">
            ⭐
          </div>

          <div>

            <p>
              Reviews
            </p>

            <h2>
              {stats.reviews}
            </h2>

          </div>

        </div>

      </div>


      {/* REVENUE */}

      <div className="dashboard-card">

        <div className="card-header">

          <div>

            <h2>
              Total Revenue
            </h2>

            <p>
              Revenue from paid orders
            </p>

          </div>

          <h2>
            {formatCurrency(
              stats.revenue
            )}
          </h2>

        </div>

      </div>


      {/* RECENT ORDERS */}

      <div className="dashboard-card">

        <div className="card-header">

          <div>

            <h2>
              Recent Orders
            </h2>

            <p>
              Latest customer orders
            </p>

          </div>

        </div>


        {recentOrders.length === 0 ? (

          <div className="empty-state">
            No orders found
          </div>

        ) : (

          <div className="table-container">

            <table>

              <thead>

                <tr>

                  <th>
                    ORDER ID
                  </th>

                  <th>
                    CUSTOMER
                  </th>

                  <th>
                    DATE
                  </th>

                  <th>
                    AMOUNT
                  </th>

                  <th>
                    STATUS
                  </th>

                </tr>

              </thead>


              <tbody>

                {recentOrders.map(
                  (order) => (

                    <tr
                      key={
                        order.Order_ID
                      }
                    >

                      <td>
                        #{order.Order_ID}
                      </td>

                      <td>
                        <strong>
                          {order.Customer_Name ||
                            "Unknown Customer"}
                        </strong>
                      </td>

                      <td>
                        {formatDate(
                          order.Order_Date
                        )}
                      </td>

                      <td>
                        <strong>
                          {formatCurrency(
                            order.Order_Amount
                          )}
                        </strong>
                      </td>

                      <td>

                        <span
                          className={`status-badge ${
                            String(
                              order.Order_Status ||
                                "Pending"
                            ).toLowerCase()
                          }`}
                        >
                          {order.Order_Status ||
                            "Pending"}
                        </span>

                      </td>

                    </tr>

                  )
                )}

              </tbody>

            </table>

          </div>

        )}

      </div>

    </div>
  );
}

export default Dashboard;