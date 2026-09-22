import { useEffect, useState } from "react";

function Customers() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [formData, setFormData] = useState({
    Customer_Name: "",
    Customer_Email: "",
    Customer_Phone: "",
    Customer_Address: "",
  });

  // =========================
  // GET CUSTOMERS
  // =========================

  const fetchCustomers = async () => {
    try {
      setLoading(true);

      const response = await fetch(
        "http://10.167.96.27:5000/api/customers"
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to fetch customers"
        );
      }

      setCustomers(data);
    } catch (error) {
      console.error(
        "Error fetching customers:",
        error
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
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
  // ADD CUSTOMER
  // =========================

  const handleAddCustomer = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch(
        "http://10.167.96.27:5000/api/customers",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(
          data.message ||
            data.error ||
            "Failed to add customer"
        );
        return;
      }

      alert("Customer added successfully!");

      setShowModal(false);

      setFormData({
        Customer_Name: "",
        Customer_Email: "",
        Customer_Phone: "",
        Customer_Address: "",
      });

      fetchCustomers();
    } catch (error) {
      console.error(
        "Add customer error:",
        error
      );

      alert("Unable to connect to backend.");
    }
  };

  // =========================
  // DELETE CUSTOMER
  // =========================

  const handleDelete = async (customerId) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this customer?"
    );

    if (!confirmDelete) {
      return;
    }

    try {
      const response = await fetch(
        "http://10.167.96.27:5000/api/customers/${customerId}",
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(
          data.message ||
            data.error ||
            "Failed to delete customer"
        );
        return;
      }

      alert("Customer deleted successfully!");

      fetchCustomers();
    } catch (error) {
      console.error(
        "Delete customer error:",
        error
      );

      alert("Unable to connect to backend.");
    }
  };

  // =========================
  // SEARCH
  // =========================

  const filteredCustomers = customers.filter(
    (customer) =>
      customer.Customer_Name
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      customer.Customer_Email
        .toLowerCase()
        .includes(search.toLowerCase())
  );

  // =========================
  // UI
  // =========================

  return (
    <div>
      {/* PAGE HEADER */}

      <div className="page-header">
        <div>
          <h1>Customers</h1>

          <p>
            Manage marketplace customers
          </p>
        </div>

        <button
          className="primary-btn"
          onClick={() => setShowModal(true)}
        >
          + Add Customer
        </button>
      </div>

      {/* CUSTOMER TABLE */}

      <div className="table-card">
        <div className="table-header">
          <div>
            <h2>Customer List</h2>

            <p>
              {customers.length} customers found
            </p>
          </div>

          <input
            type="text"
            placeholder="Search customers..."
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            className="search-input"
          />
        </div>

        {loading ? (
          <p className="loading-text">
            Loading customers...
          </p>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Customer</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Address</th>
                  <th>Orders</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredCustomers.length > 0 ? (
                  filteredCustomers.map(
                    (customer) => (
                      <tr
                        key={
                          customer.Customer_ID
                        }
                      >
                        <td>
                          {customer.Customer_ID}
                        </td>

                        <td>
                          <strong>
                            {
                              customer.Customer_Name
                            }
                          </strong>
                        </td>

                        <td>
                          {
                            customer.Customer_Email
                          }
                        </td>

                        <td>
                          {customer.Customer_Phone ||
                            "N/A"}
                        </td>

                        <td>
                          {
                            customer.Customer_Address ||
                            "N/A"
                          }
                        </td>

                        <td>
                          {customer.Order_Count}
                        </td>

                        <td>
                          <button
                            className="delete-btn"
                            onClick={() =>
                              handleDelete(
                                customer.Customer_ID
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
                      No customers found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ADD CUSTOMER MODAL */}

      {showModal && (
        <div className="modal-overlay">
          <div className="modal">

            <div className="modal-header">
              <h2>Add Customer</h2>

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
              onSubmit={handleAddCustomer}
            >
              {/* NAME */}

              <div className="form-group">
                <label>
                  Customer Name
                </label>

                <input
                  type="text"
                  name="Customer_Name"
                  value={
                    formData.Customer_Name
                  }
                  onChange={handleChange}
                  placeholder="Enter customer name"
                  required
                />
              </div>

              {/* EMAIL */}

              <div className="form-group">
                <label>Email</label>

                <input
                  type="email"
                  name="Customer_Email"
                  value={
                    formData.Customer_Email
                  }
                  onChange={handleChange}
                  placeholder="Enter customer email"
                  required
                />
              </div>

              {/* PHONE */}

              <div className="form-group">
                <label>Phone</label>

                <input
                  type="text"
                  name="Customer_Phone"
                  value={
                    formData.Customer_Phone
                  }
                  onChange={handleChange}
                  placeholder="Enter phone number"
                />
              </div>

              {/* ADDRESS */}

              <div className="form-group">
                <label>Address</label>

                <textarea
                  name="Customer_Address"
                  value={
                    formData.Customer_Address
                  }
                  onChange={handleChange}
                  placeholder="Enter customer address"
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
                  Add Customer
                </button>
              </div>
            </form>

          </div>
        </div>
      )}
    </div>
  );
}

export default Customers;