import { useEffect, useState } from "react";

function Payments() {
  const [payments, setPayments] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [formData, setFormData] = useState({
    Order_ID: "1",
    Payment_Date: "",
    Payment_Method: "UPI",
    Payment_Status: "Pending",
    Payment_Amount: "",
  });

  // =====================================================
  // GET PAYMENTS
  // =====================================================

  const fetchPayments = async () => {
    try {
      setLoading(true);

      const response = await fetch(
        "http://10.167.96.27:5000/api/payments"
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to fetch payments"
        );
      }

      setPayments(data);
    } catch (error) {
      console.error(
        "Error fetching payments:",
        error
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
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
  // ADD PAYMENT
  // =====================================================

  const handleAddPayment = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch(
        "http://10.167.96.27:5000/api/payments",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            Order_ID: Number(formData.Order_ID),

            Payment_Date:
              formData.Payment_Date || null,

            Payment_Method:
              formData.Payment_Method,

            Payment_Status:
              formData.Payment_Status,

            Payment_Amount:
              formData.Payment_Amount === ""
                ? null
                : Number(
                    formData.Payment_Amount
                  ),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(
          data.message ||
            data.error ||
            "Failed to add payment"
        );
        return;
      }

      alert("Payment added successfully!");

      setShowModal(false);

      setFormData({
        Order_ID: "1",
        Payment_Date: "",
        Payment_Method: "UPI",
        Payment_Status: "Pending",
        Payment_Amount: "",
      });

      fetchPayments();
    } catch (error) {
      console.error(
        "Add payment error:",
        error
      );

      alert("Unable to connect to backend.");
    }
  };

  // =====================================================
  // DELETE PAYMENT
  // =====================================================

  const handleDelete = async (paymentId) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this payment?"
    );

    if (!confirmDelete) {
      return;
    }

    try {
      const response = await fetch(
        "http://10.167.96.27:5000/api/payments/${paymentId}",
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(
          data.message ||
            data.error ||
            "Failed to delete payment"
        );
        return;
      }

      alert("Payment deleted successfully!");

      fetchPayments();
    } catch (error) {
      console.error(
        "Delete payment error:",
        error
      );

      alert("Unable to connect to backend.");
    }
  };

  // =====================================================
  // SEARCH
  // =====================================================

  const filteredPayments = payments.filter(
    (payment) => {
      const searchText =
        search.toLowerCase();

      return (
        String(payment.Payment_ID)
          .toLowerCase()
          .includes(searchText) ||

        String(payment.Order_ID)
          .toLowerCase()
          .includes(searchText) ||

        (payment.Customer_Name || "")
          .toLowerCase()
          .includes(searchText) ||

        (payment.Payment_Method || "")
          .toLowerCase()
          .includes(searchText) ||

        (payment.Payment_Status || "")
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
          <h1>Payments</h1>

          <p>
            Manage customer order payments
          </p>
        </div>

        <button
          className="primary-btn"
          onClick={() =>
            setShowModal(true)
          }
        >
          + Add Payment
        </button>

      </div>


      {/* PAYMENT TABLE */}

      <div className="table-card">

        <div className="table-header">

          <div>
            <h2>Payment List</h2>

            <p>
              {payments.length} payments found
            </p>
          </div>

          <input
            type="text"
            placeholder="Search payments..."
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            className="search-input"
          />

        </div>


        {loading ? (

          <p className="loading-text">
            Loading payments...
          </p>

        ) : (

          <div className="table-container">

            <table>

              <thead>

                <tr>
                  <th>ID</th>
                  <th>ORDER ID</th>
                  <th>CUSTOMER</th>
                  <th>AMOUNT</th>
                  <th>METHOD</th>
                  <th>DATE</th>
                  <th>STATUS</th>
                  <th>ACTION</th>
                </tr>

              </thead>


              <tbody>

                {filteredPayments.length > 0 ? (

                  filteredPayments.map(
                    (payment) => (

                      <tr
                        key={
                          payment.Payment_ID
                        }
                      >

                        <td>
                          {payment.Payment_ID}
                        </td>

                        <td>
                          {payment.Order_ID}
                        </td>

                        <td>
                          {payment.Customer_Name ||
                            `Customer ${payment.Customer_ID}`}
                        </td>

                        <td>
                          <strong>
                            ₹
                            {Number(
                              payment.Payment_Amount ||
                                0
                            ).toFixed(2)}
                          </strong>
                        </td>

                        <td>
                          {payment.Payment_Method}
                        </td>

                        <td>
                          {formatDate(
                            payment.Payment_Date
                          )}
                        </td>

                        <td>
                          <span className="badge">
                            {payment.Payment_Status}
                          </span>
                        </td>

                        <td>

                          <button
                            className="delete-btn"
                            onClick={() =>
                              handleDelete(
                                payment.Payment_ID
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
                      colSpan="8"
                      className="empty-state"
                    >
                      No payments found
                    </td>

                  </tr>

                )}

              </tbody>

            </table>

          </div>

        )}

      </div>


      {/* ADD PAYMENT MODAL */}

      {showModal && (

        <div className="modal-overlay">

          <div className="modal">

            <div className="modal-header">

              <h2>Add Payment</h2>

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
              onSubmit={handleAddPayment}
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


              {/* PAYMENT DATE */}

              <div className="form-group">

                <label>
                  Payment Date
                </label>

                <input
                  type="date"
                  name="Payment_Date"
                  value={
                    formData.Payment_Date
                  }
                  onChange={handleChange}
                />

              </div>


              {/* PAYMENT METHOD */}

              <div className="form-group">

                <label>
                  Payment Method
                </label>

                <select
                  name="Payment_Method"
                  value={
                    formData.Payment_Method
                  }
                  onChange={handleChange}
                  required
                >

                  <option value="UPI">
                    UPI
                  </option>

                  <option value="Credit Card">
                    Credit Card
                  </option>

                  <option value="Debit Card">
                    Debit Card
                  </option>

                  <option value="Net Banking">
                    Net Banking
                  </option>

                  <option value="Cash on Delivery">
                    Cash on Delivery
                  </option>

                </select>

              </div>


              {/* PAYMENT STATUS */}

              <div className="form-group">

                <label>
                  Payment Status
                </label>

                <select
                  name="Payment_Status"
                  value={
                    formData.Payment_Status
                  }
                  onChange={handleChange}
                >

                  <option value="Pending">
                    Pending
                  </option>

                  <option value="Paid">
                    Paid
                  </option>

                  <option value="Failed">
                    Failed
                  </option>

                  <option value="Refunded">
                    Refunded
                  </option>

                </select>

              </div>


              {/* AMOUNT */}

              <div className="form-group">

                <label>
                  Payment Amount
                </label>

                <input
                  type="number"
                  name="Payment_Amount"
                  value={
                    formData.Payment_Amount
                  }
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  placeholder="Leave empty to calculate from order"
                />

              </div>


              <p
                style={{
                  fontSize: "13px",
                  color: "#64748b",
                  marginBottom: "20px",
                }}
              >
                Leave amount empty to automatically
                calculate it from the order items.
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
                  Add Payment
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </div>
  );
}

export default Payments;