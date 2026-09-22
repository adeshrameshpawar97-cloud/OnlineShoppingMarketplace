
import { useEffect, useState } from "react";

function Delivery() {
  const [deliveries, setDeliveries] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [formData, setFormData] = useState({
    Order_ID: "1",
    Delivery_Date: "",
    Delivery_Status: "Pending",
    Delivery_Address: "",
  });

  // =====================================================
  // GET DELIVERY
  // =====================================================

  const fetchDeliveries = async () => {
    try {
      setLoading(true);

      const response = await fetch(
        "http://10.167.96.27:5000/api/delivery"
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to fetch delivery"
        );
      }

      setDeliveries(data);
    } catch (error) {
      console.error(
        "Error fetching delivery:",
        error
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeliveries();
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
  // ADD DELIVERY
  // =====================================================

  const handleAddDelivery = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch(
        "http://10.167.96.27:5000/api/delivery",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            Order_ID: Number(formData.Order_ID),
            Delivery_Date:
              formData.Delivery_Date || null,
            Delivery_Status:
              formData.Delivery_Status,
            Delivery_Address:
              formData.Delivery_Address,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(
          data.message ||
            data.error ||
            "Failed to add delivery"
        );
        return;
      }

      alert("Delivery added successfully!");

      setShowModal(false);

      setFormData({
        Order_ID: "1",
        Delivery_Date: "",
        Delivery_Status: "Pending",
        Delivery_Address: "",
      });

      fetchDeliveries();
    } catch (error) {
      console.error(
        "Add delivery error:",
        error
      );

      alert("Unable to connect to backend.");
    }
  };

  // =====================================================
  // DELETE DELIVERY
  // =====================================================

  const handleDelete = async (deliveryId) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this delivery?"
    );

    if (!confirmDelete) {
      return;
    }

    try {
      const response = await fetch(
        `http://10.167.96.27:5000/api/delivery/${deliveryId}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(
          data.message ||
            data.error ||
            "Failed to delete delivery"
        );
        return;
      }

      alert("Delivery deleted successfully!");

      fetchDeliveries();
    } catch (error) {
      console.error(
        "Delete delivery error:",
        error
      );

      alert("Unable to connect to backend.");
    }
  };

  // =====================================================
  // SEARCH
  // =====================================================

  const filteredDeliveries = deliveries.filter(
    (delivery) => {
      const searchText =
        search.toLowerCase();

      return (
        String(delivery.Delivery_ID)
          .toLowerCase()
          .includes(searchText) ||

        String(delivery.Order_ID)
          .toLowerCase()
          .includes(searchText) ||

        (delivery.Customer_Name || "")
          .toLowerCase()
          .includes(searchText) ||

        (delivery.Delivery_Status || "")
          .toLowerCase()
          .includes(searchText) ||

        (delivery.Delivery_Address || "")
          .toLowerCase()
          .includes(searchText)
      );
    }
  );

  // =====================================================
  // DATE FORMAT
  // =====================================================

  const formatDate = (date) => {
    if (!date) {
      return "N/A";
    }

    return String(date).split("T")[0];
  };

  // =====================================================
  // UI
  // =====================================================

  return (
    <div>

      {/* PAGE HEADER */}

      <div className="page-header">

        <div>
          <h1>Delivery</h1>

          <p>
            Manage customer order deliveries
          </p>
        </div>

        <button
          className="primary-btn"
          onClick={() =>
            setShowModal(true)
          }
        >
          + Add Delivery
        </button>

      </div>


      {/* DELIVERY TABLE */}

      <div className="table-card">

        <div className="table-header">

          <div>
            <h2>Delivery List</h2>

            <p>
              {deliveries.length} deliveries found
            </p>
          </div>

          <input
            type="text"
            placeholder="Search deliveries..."
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            className="search-input"
          />

        </div>


        {loading ? (

          <p className="loading-text">
            Loading deliveries...
          </p>

        ) : (

          <div className="table-container">

            <table>

              <thead>

                <tr>
                  <th>ID</th>
                  <th>ORDER ID</th>
                  <th>CUSTOMER</th>
                  <th>DATE</th>
                  <th>STATUS</th>
                  <th>ADDRESS</th>
                  <th>ACTION</th>
                </tr>

              </thead>


              <tbody>

                {filteredDeliveries.length > 0 ? (

                  filteredDeliveries.map(
                    (delivery) => (

                      <tr
                        key={
                          delivery.Delivery_ID
                        }
                      >

                        <td>
                          {delivery.Delivery_ID}
                        </td>

                        <td>
                          {delivery.Order_ID}
                        </td>

                        <td>
                          {delivery.Customer_Name ||
                            `Customer ${delivery.Customer_ID}`}
                        </td>

                        <td>
                          {formatDate(
                            delivery.Delivery_Date
                          )}
                        </td>

                        <td>
                          <span className="badge">
                            {delivery.Delivery_Status}
                          </span>
                        </td>

                        <td>
                          {delivery.Delivery_Address}
                        </td>

                        <td>

                          <button
                            className="delete-btn"
                            onClick={() =>
                              handleDelete(
                                delivery.Delivery_ID
                              )
                            }
                          >
                            Delete
                          </button>

                        </td>

                      </tr>

                    )
                  )

                ) : (

                  <tr>

                    <td
                      colSpan="7"
                      className="empty-state"
                    >
                      No deliveries found
                    </td>

                  </tr>

                )}

              </tbody>

            </table>

          </div>

        )}

      </div>


      {/* ADD DELIVERY MODAL */}

      {showModal && (

        <div className="modal-overlay">

          <div className="modal">

            <div className="modal-header">

              <h2>Add Delivery</h2>

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
              onSubmit={handleAddDelivery}
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


              {/* DELIVERY DATE */}

              <div className="form-group">

                <label>
                  Delivery Date
                </label>

                <input
                  type="date"
                  name="Delivery_Date"
                  value={
                    formData.Delivery_Date
                  }
                  onChange={handleChange}
                />

              </div>


              {/* DELIVERY STATUS */}

              <div className="form-group">

                <label>
                  Delivery Status
                </label>

                <select
                  name="Delivery_Status"
                  value={
                    formData.Delivery_Status
                  }
                  onChange={handleChange}
                >

                  <option value="Pending">
                    Pending
                  </option>

                  <option value="Shipped">
                    Shipped
                  </option>

                  <option value="Out for Delivery">
                    Out for Delivery
                  </option>

                  <option value="Delivered">
                    Delivered
                  </option>

                  <option value="Cancelled">
                    Cancelled
                  </option>

                </select>

              </div>


              {/* ADDRESS */}

              <div className="form-group">

                <label>
                  Delivery Address
                </label>

                <textarea
                  name="Delivery_Address"
                  value={
                    formData.Delivery_Address
                  }
                  onChange={handleChange}
                  placeholder="Enter delivery address"
                  rows="3"
                  required
                />

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
                  Add Delivery
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </div>
  );
}

export default Delivery;