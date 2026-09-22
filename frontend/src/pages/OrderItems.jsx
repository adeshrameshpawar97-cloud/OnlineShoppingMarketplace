import { useEffect, useState } from "react";

function OrderItems() {
  const [orderItems, setOrderItems] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [formData, setFormData] = useState({
    Order_ID: "1",
    Product_ID: "1",
    OrderItem_Quantity: "1",
  });

  // =====================================================
  // GET ORDER ITEMS
  // =====================================================

  const fetchOrderItems = async () => {
    try {
      setLoading(true);

      const response = await fetch(
        "http://10.167.96.27:5000/api/order-items"
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to fetch order items"
        );
      }

      setOrderItems(data);
    } catch (error) {
      console.error(
        "Error fetching order items:",
        error
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrderItems();
  }, []);

  // =====================================================
  // FORM CHANGE
  // =====================================================

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // =====================================================
  // ADD ORDER ITEM
  // =====================================================

  const handleAddOrderItem = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch(
        "http://10.167.96.27:5000/api/order-items",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            Order_ID: Number(formData.Order_ID),
            Product_ID: Number(formData.Product_ID),
            OrderItem_Quantity: Number(
              formData.OrderItem_Quantity
            ),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(
          data.message ||
            data.error ||
            "Failed to add order item"
        );
        return;
      }

      alert("Order item added successfully!");

      setShowModal(false);

      setFormData({
        Order_ID: "1",
        Product_ID: "1",
        OrderItem_Quantity: "1",
      });

      fetchOrderItems();
    } catch (error) {
      console.error(
        "Add order item error:",
        error
      );

      alert("Unable to connect to backend.");
    }
  };

  // =====================================================
  // DELETE ORDER ITEM
  // =====================================================

  const handleDelete = async (orderItemId) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this order item?"
    );

    if (!confirmDelete) {
      return;
    }

    try {
      const response = await fetch(
        "http://10.167.96.27:5000/api/order-items/${orderItemId}",
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(
          data.message ||
            data.error ||
            "Failed to delete order item"
        );
        return;
      }

      alert("Order item deleted successfully!");

      fetchOrderItems();
    } catch (error) {
      console.error(
        "Delete order item error:",
        error
      );

      alert("Unable to connect to backend.");
    }
  };

  // =====================================================
  // SEARCH
  // =====================================================

  const filteredItems = orderItems.filter((item) => {
    const searchText = search.toLowerCase();

    return (
      String(item.OrderItem_ID)
        .toLowerCase()
        .includes(searchText) ||
      String(item.Order_ID)
        .toLowerCase()
        .includes(searchText) ||
      (item.Product_Name || "")
        .toLowerCase()
        .includes(searchText) ||
      (item.Customer_Name || "")
        .toLowerCase()
        .includes(searchText)
    );
  });

  // =====================================================
  // UI
  // =====================================================

  return (
    <div>

      {/* PAGE HEADER */}

      <div className="page-header">

        <div>
          <h1>Order Items</h1>

          <p>
            Manage products included in customer orders
          </p>
        </div>

        <button
          className="primary-btn"
          onClick={() => setShowModal(true)}
        >
          + Add Order Item
        </button>

      </div>


      {/* TABLE */}

      <div className="table-card">

        <div className="table-header">

          <div>
            <h2>Order Item List</h2>

            <p>
              {orderItems.length} order items found
            </p>
          </div>

          <input
            type="text"
            placeholder="Search order items..."
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            className="search-input"
          />

        </div>


        {loading ? (

          <p className="loading-text">
            Loading order items...
          </p>

        ) : (

          <div className="table-container">

            <table>

              <thead>

                <tr>
                  <th>ID</th>
                  <th>ORDER ID</th>
                  <th>CUSTOMER</th>
                  <th>PRODUCT</th>
                  <th>QUANTITY</th>
                  <th>PRICE</th>
                  <th>TOTAL</th>
                  <th>ACTION</th>
                </tr>

              </thead>


              <tbody>

                {filteredItems.length > 0 ? (

                  filteredItems.map((item) => (

                    <tr key={item.OrderItem_ID}>

                      <td>
                        {item.OrderItem_ID}
                      </td>

                      <td>
                        {item.Order_ID}
                      </td>

                      <td>
                        {item.Customer_Name ||
                          `Customer ${item.Customer_ID}`}
                      </td>

                      <td>
                        <strong>
                          {item.Product_Name ||
                            `Product ${item.Product_ID}`}
                        </strong>
                      </td>

                      <td>
                        {item.OrderItem_Quantity}
                      </td>

                      <td>
                        ₹
                        {Number(
                          item.OrderItem_Price || 0
                        ).toFixed(2)}
                      </td>

                      <td>
                        <strong>
                          ₹
                          {Number(
                            item.OrderItem_Total || 0
                          ).toFixed(2)}
                        </strong>
                      </td>

                      <td>

                        <button
                          className="delete-btn"
                          onClick={() =>
                            handleDelete(
                              item.OrderItem_ID
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
                      colSpan="8"
                      className="empty-state"
                    >
                      No order items found
                    </td>

                  </tr>

                )}

              </tbody>

            </table>

          </div>

        )}

      </div>


      {/* ADD ORDER ITEM MODAL */}

      {showModal && (

        <div className="modal-overlay">

          <div className="modal">

            <div className="modal-header">

              <h2>Add Order Item</h2>

              <button
                className="modal-close"
                onClick={() =>
                  setShowModal(false)
                }
              >
                ×
              </button>

            </div>


            <form
              onSubmit={handleAddOrderItem}
            >

              {/* ORDER ID */}

              <div className="form-group">

                <label>
                  Order ID
                </label>

                <input
                  type="number"
                  name="Order_ID"
                  value={
                    formData.Order_ID
                  }
                  onChange={handleChange}
                  min="1"
                  required
                />

              </div>


              {/* PRODUCT ID */}

              <div className="form-group">

                <label>
                  Product ID
                </label>

                <input
                  type="number"
                  name="Product_ID"
                  value={
                    formData.Product_ID
                  }
                  onChange={handleChange}
                  min="1"
                  required
                />

              </div>


              {/* QUANTITY */}

              <div className="form-group">

                <label>
                  Quantity
                </label>

                <input
                  type="number"
                  name="OrderItem_Quantity"
                  value={
                    formData.OrderItem_Quantity
                  }
                  onChange={handleChange}
                  min="1"
                  required
                />

              </div>


              {/* INFO */}

              <p
                style={{
                  fontSize: "13px",
                  color: "#64748b",
                  marginBottom: "20px",
                }}
              >
                Product price will be fetched
                automatically from the database.
              </p>


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
                  Add Order Item
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </div>
  );
}

export default OrderItems;