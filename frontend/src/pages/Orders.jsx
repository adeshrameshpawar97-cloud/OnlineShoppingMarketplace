import { useEffect, useState } from "react";

function Orders() {
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [formData, setFormData] = useState({
    Customer_ID: "1",
    Order_Date: "",
    Order_Status: "Pending",
  });

  // =========================
  // GET ORDERS
  // =========================

  const fetchOrders = async () => {
    try {
      setLoading(true);

      const response = await fetch(
        "http://10.167.96.27:5000/api/orders"
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to fetch orders"
        );
      }

      setOrders(data);
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // =========================
  // FORM CHANGE
  // =========================

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // =========================
  // ADD ORDER
  // =========================

  const handleAddOrder = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch(
        "http://10.167.96.27:5000/api/orders",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            Customer_ID: Number(formData.Customer_ID),
            Order_Date:
              formData.Order_Date || null,
            Order_Status: formData.Order_Status,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(
          data.message ||
            data.error ||
            "Failed to add order"
        );
        return;
      }

      alert("Order added successfully!");

      setShowModal(false);

      setFormData({
        Customer_ID: "1",
        Order_Date: "",
        Order_Status: "Pending",
      });

      fetchOrders();
    } catch (error) {
      console.error("Add order error:", error);
      alert("Unable to connect to backend.");
    }
  };

  // =========================
  // DELETE ORDER
  // =========================

  const handleDelete = async (orderId) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this order?"
    );

    if (!confirmDelete) {
      return;
    }

    try {
      const response = await fetch(
        "http://10.167.96.27:5000/api/orders/${orderId}",
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(
          data.message ||
            data.error ||
            "Failed to delete order"
        );
        return;
      }

      alert("Order deleted successfully!");

      fetchOrders();
    } catch (error) {
      console.error("Delete order error:", error);
      alert("Unable to connect to backend.");
    }
  };

  // =========================
  // SEARCH
  // =========================

  const filteredOrders = orders.filter((order) =>
    String(order.Order_ID)
      .toLowerCase()
      .includes(search.toLowerCase()) ||
    (order.Customer_Name || "")
      .toLowerCase()
      .includes(search.toLowerCase()) ||
    (order.Order_Status || "")
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  // =========================
  // DATE FORMAT
  // =========================

  const formatDate = (date) => {
    if (!date) {
      return "N/A";
    }

    return String(date).split("T")[0];
  };

  // =========================
  // UI
  // =========================

  return (
    <div>
      {/* PAGE HEADER */}

      <div className="page-header">
        <div>
          <h1>Orders</h1>
          <p>Manage customer orders</p>
        </div>

        <button
          className="primary-btn"
          onClick={() => setShowModal(true)}
        >
          + Add Order
        </button>
      </div>

      {/* ORDER TABLE */}

      <div className="table-card">
        <div className="table-header">
          <div>
            <h2>Order List</h2>

            <p>
              {orders.length} orders found
            </p>
          </div>

          <input
            type="text"
            placeholder="Search orders..."
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            className="search-input"
          />
        </div>

        {loading ? (
          <p className="loading-text">
            Loading orders...
          </p>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredOrders.length > 0 ? (
                  filteredOrders.map((order) => (
                    <tr key={order.Order_ID}>
                      <td>
                        {order.Order_ID}
                      </td>

                      <td>
                        <strong>
                          {order.Customer_Name ||
                            `Customer ${order.Customer_ID}`}
                        </strong>
                      </td>

                      <td>
                        {formatDate(
                          order.Order_Date
                        )}
                      </td>

                      <td>
                        ₹
                        {Number(
                          order.Order_Amount || 0
                        ).toFixed(2)}
                      </td>

                      <td>
                        <span className="badge">
                          {order.Order_Status}
                        </span>
                      </td>

                      <td>
                        <button
                          className="delete-btn"
                          onClick={() =>
                            handleDelete(
                              order.Order_ID
                            )
                          }
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan="6"
                      className="empty-state"
                    >
                      No orders found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ADD ORDER MODAL */}

      {showModal && (
        <div className="modal-overlay">
          <div className="modal">

            <div className="modal-header">
              <h2>Add Order</h2>

              <button
                className="modal-close"
                onClick={() =>
                  setShowModal(false)
                }
              >
                ×
              </button>
            </div>

            <form onSubmit={handleAddOrder}>

              {/* CUSTOMER ID */}

              <div className="form-group">
                <label>
                  Customer ID
                </label>

                <input
                  type="number"
                  name="Customer_ID"
                  value={
                    formData.Customer_ID
                  }
                  onChange={handleChange}
                  min="1"
                  required
                />
              </div>

              {/* ORDER DATE */}

              <div className="form-group">
                <label>
                  Order Date
                </label>

                <input
                  type="date"
                  name="Order_Date"
                  value={
                    formData.Order_Date
                  }
                  onChange={handleChange}
                />
              </div>

              {/* STATUS */}

              <div className="form-group">
                <label>
                  Order Status
                </label>

                <select
                  name="Order_Status"
                  value={
                    formData.Order_Status
                  }
                  onChange={handleChange}
                >
                  <option value="Pending">
                    Pending
                  </option>

                  <option value="Confirmed">
                    Confirmed
                  </option>

                  <option value="Shipped">
                    Shipped
                  </option>

                  <option value="Delivered">
                    Delivered
                  </option>

                  <option value="Cancelled">
                    Cancelled
                  </option>
                </select>
              </div>

              {/* BUTTONS */}

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() =>
                    setShowModal(false)
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-btn"
                >
                  Add Order
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Orders;