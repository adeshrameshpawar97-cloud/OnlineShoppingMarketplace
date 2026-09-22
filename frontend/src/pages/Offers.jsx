import { useEffect, useState } from "react";

function Offers() {
  const [offers, setOffers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [formData, setFormData] = useState({
    Offer_Name: "",
    Offer_Discount: "",
    Offer_StartDate: "",
    Offer_EndDate: "",
  });

  // =========================
  // GET OFFERS
  // =========================

  const fetchOffers = async () => {
    try {
      setLoading(true);

      const response = await fetch(
        "http://10.167.96.27:5000/api/offers"
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to fetch offers"
        );
      }

      setOffers(data);
    } catch (error) {
      console.error("Error fetching offers:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOffers();
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
  // ADD OFFER
  // =========================

  const handleAddOffer = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch(
        "http://10.167.96.27:5000/api/offers",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            Offer_Name: formData.Offer_Name,
            Offer_Discount: Number(
              formData.Offer_Discount
            ),
            Offer_StartDate:
              formData.Offer_StartDate || null,
            Offer_EndDate:
              formData.Offer_EndDate || null,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(
          data.message ||
            data.error ||
            "Failed to add offer"
        );
        return;
      }

      alert("Offer added successfully!");

      setShowModal(false);

      setFormData({
        Offer_Name: "",
        Offer_Discount: "",
        Offer_StartDate: "",
        Offer_EndDate: "",
      });

      fetchOffers();
    } catch (error) {
      console.error("Add offer error:", error);
      alert("Unable to connect to backend.");
    }
  };

  // =========================
  // DELETE OFFER
  // =========================

  const handleDelete = async (offerId) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this offer?"
    );

    if (!confirmDelete) {
      return;
    }

    try {
      const response = await fetch(
        "http://10.167.96.27:5000/api/offers/${offerId}",
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(
          data.message ||
            data.error ||
            "Failed to delete offer"
        );
        return;
      }

      alert("Offer deleted successfully!");

      fetchOffers();
    } catch (error) {
      console.error("Delete offer error:", error);
      alert("Unable to connect to backend.");
    }
  };

  // =========================
  // SEARCH
  // =========================

  const filteredOffers = offers.filter((offer) =>
    offer.Offer_Name.toLowerCase().includes(
      search.toLowerCase()
    )
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

  return (
    <div>
      {/* PAGE HEADER */}

      <div className="page-header">
        <div>
          <h1>Offers</h1>

          <p>
            Manage marketplace offers and discounts
          </p>
        </div>

        <button
          className="primary-btn"
          onClick={() => setShowModal(true)}
        >
          + Add Offer
        </button>
      </div>

      {/* OFFER TABLE */}

      <div className="table-card">
        <div className="table-header">
          <div>
            <h2>Offer List</h2>

            <p>
              {offers.length} offers found
            </p>
          </div>

          <input
            type="text"
            placeholder="Search offers..."
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            className="search-input"
          />
        </div>

        {loading ? (
          <p className="loading-text">
            Loading offers...
          </p>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Offer</th>
                  <th>Discount</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Products</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredOffers.length > 0 ? (
                  filteredOffers.map((offer) => (
                    <tr key={offer.Offer_ID}>
                      <td>{offer.Offer_ID}</td>

                      <td>
                        <strong>
                          {offer.Offer_Name}
                        </strong>
                      </td>

                      <td>
                        {offer.Offer_Discount}%
                      </td>

                      <td>
                        {formatDate(
                          offer.Offer_StartDate
                        )}
                      </td>

                      <td>
                        {formatDate(
                          offer.Offer_EndDate
                        )}
                      </td>

                      <td>
                        {offer.Product_Count}
                      </td>

                      <td>
                        <button
                          className="delete-btn"
                          onClick={() =>
                            handleDelete(
                              offer.Offer_ID
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
                      No offers found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ADD OFFER MODAL */}

      {showModal && (
        <div className="modal-overlay">
          <div className="modal">

            <div className="modal-header">
              <h2>Add Offer</h2>

              <button
                className="modal-close"
                onClick={() =>
                  setShowModal(false)
                }
              >
                ×
              </button>
            </div>

            <form onSubmit={handleAddOffer}>

              {/* OFFER NAME */}

              <div className="form-group">
                <label>Offer Name</label>

                <input
                  type="text"
                  name="Offer_Name"
                  value={formData.Offer_Name}
                  onChange={handleChange}
                  placeholder="Enter offer name"
                  required
                />
              </div>

              {/* DISCOUNT */}

              <div className="form-group">
                <label>Discount (%)</label>

                <input
                  type="number"
                  name="Offer_Discount"
                  value={formData.Offer_Discount}
                  onChange={handleChange}
                  placeholder="Enter discount"
                  min="0"
                  max="100"
                  step="0.01"
                  required
                />
              </div>

              {/* DATES */}

              <div className="form-row">

                <div className="form-group">
                  <label>Start Date</label>

                  <input
                    type="date"
                    name="Offer_StartDate"
                    value={
                      formData.Offer_StartDate
                    }
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label>End Date</label>

                  <input
                    type="date"
                    name="Offer_EndDate"
                    value={
                      formData.Offer_EndDate
                    }
                    onChange={handleChange}
                  />
                </div>

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
                  Add Offer
                </button>

              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Offers;