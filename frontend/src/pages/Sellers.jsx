import { useEffect, useState } from "react";

function Sellers() {
  const [sellers, setSellers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [formData, setFormData] = useState({
    Seller_Name: "",
    Seller_Email: "",
    Seller_Phone: "",
    Seller_Address: "",
  });

  // =========================
  // GET SELLERS
  // =========================
  const fetchSellers = async () => {
    try {
      setLoading(true);

      const response = await fetch(
        "http://10.167.96.27:5000/api/sellers"
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to fetch sellers"
        );
      }

      setSellers(data);
    } catch (error) {
      console.error("Error fetching sellers:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSellers();
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
  // ADD SELLER
  // =========================
  const handleAddSeller = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch(
        "http://10.167.96.27:5000/api/sellers",
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
            "Failed to add seller"
        );
        return;
      }

      alert("Seller added successfully!");

      setShowModal(false);

      setFormData({
        Seller_Name: "",
        Seller_Email: "",
        Seller_Phone: "",
        Seller_Address: "",
      });

      fetchSellers();
    } catch (error) {
      console.error("Add seller error:", error);
      alert("Unable to connect to backend.");
    }
  };

  // =========================
  // DELETE SELLER
  // =========================
  const handleDelete = async (sellerId) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this seller?"
    );

    if (!confirmDelete) {
      return;
    }

    try {
      const response = await fetch(
        "http://10.167.96.27:5000/api/sellers/${sellerId}",
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(
          data.message ||
            data.error ||
            "Failed to delete seller"
        );
        return;
      }

      alert("Seller deleted successfully!");

      fetchSellers();
    } catch (error) {
      console.error("Delete seller error:", error);
      alert("Unable to connect to backend.");
    }
  };

  // =========================
  // SEARCH
  // =========================
  const filteredSellers = sellers.filter((seller) =>
    seller.Seller_Name.toLowerCase().includes(
      search.toLowerCase()
    )
  );

  return (
    <div>
      {/* PAGE HEADER */}
      <div className="page-header">
        <div>
          <h1>Sellers</h1>
          <p>Manage marketplace sellers</p>
        </div>

        <button
          className="primary-btn"
          onClick={() => setShowModal(true)}
        >
          + Add Seller
        </button>
      </div>

      {/* SELLER TABLE */}
      <div className="table-card">
        <div className="table-header">
          <div>
            <h2>Seller List</h2>
            <p>
              {sellers.length} sellers found
            </p>
          </div>

          <input
            type="text"
            placeholder="Search sellers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
          />
        </div>

        {loading ? (
          <p className="loading-text">
            Loading sellers...
          </p>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Seller</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Address</th>
                  <th>Products</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredSellers.length > 0 ? (
                  filteredSellers.map((seller) => (
                    <tr key={seller.Seller_ID}>
                      <td>{seller.Seller_ID}</td>

                      <td>
                        <strong>
                          {seller.Seller_Name}
                        </strong>
                      </td>

                      <td>{seller.Seller_Email}</td>

                      <td>
                        {seller.Seller_Phone || "N/A"}
                      </td>

                      <td>
                        {seller.Seller_Address || "N/A"}
                      </td>

                      <td>
                        {seller.Product_Count}
                      </td>

                      <td>
                        <button
                          className="delete-btn"
                          onClick={() =>
                            handleDelete(
                              seller.Seller_ID
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
                      colSpan="7"
                      className="empty-state"
                    >
                      No sellers found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ADD SELLER MODAL */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Add Seller</h2>

              <button
                className="modal-close"
                onClick={() =>
                  setShowModal(false)
                }
              >
                ×
              </button>
            </div>

            <form onSubmit={handleAddSeller}>
              <div className="form-group">
                <label>Seller Name</label>

                <input
                  type="text"
                  name="Seller_Name"
                  value={formData.Seller_Name}
                  onChange={handleChange}
                  placeholder="Enter seller name"
                  required
                />
              </div>

              <div className="form-group">
                <label>Email</label>

                <input
                  type="email"
                  name="Seller_Email"
                  value={formData.Seller_Email}
                  onChange={handleChange}
                  placeholder="Enter seller email"
                  required
                />
              </div>

              <div className="form-group">
                <label>Phone</label>

                <input
                  type="text"
                  name="Seller_Phone"
                  value={formData.Seller_Phone}
                  onChange={handleChange}
                  placeholder="Enter phone number"
                />
              </div>

              <div className="form-group">
                <label>Address</label>

                <textarea
                  name="Seller_Address"
                  value={formData.Seller_Address}
                  onChange={handleChange}
                  placeholder="Enter seller address"
                />
              </div>

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
                  Add Seller
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Sellers;