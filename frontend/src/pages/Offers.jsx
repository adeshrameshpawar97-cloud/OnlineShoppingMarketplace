import { useEffect, useState } from "react";

function Offers() {
  const [offers, setOffers] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingOfferId, setEditingOfferId] = useState(null);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
        "http://localhost:5000/api/offers"
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

  const fetchProducts = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/products");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to load products");
      setProducts(data);
    } catch (error) {
      console.error("Offer product list error:", error);
    }
  };

  useEffect(() => {
    fetchOffers();
    fetchProducts();
  }, []);

  const openAddOffer = () => {
    setEditingOfferId(null);
    setSelectedProductIds([]);
    setFormError("");
    setShowModal(true);
  };

  const openOfferProducts = (offer) => {
    setEditingOfferId(offer.Offer_ID);
    setSelectedProductIds(offer.Product_IDs ? String(offer.Product_IDs).split(",") : []);
    setFormError("");
    setShowModal(true);
  };

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
    setFormError("");
    if (!selectedProductIds.length) {
      setFormError("Select at least one product for this offer.");
      return;
    }
    setSubmitting(true);

    try {
      const isEditing = editingOfferId !== null;
      const response = await fetch(
        isEditing
          ? `http://localhost:5000/api/offers/${editingOfferId}/products`
          : "http://localhost:5000/api/offers",
        {
          method: isEditing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(isEditing ? {
            Product_IDs: selectedProductIds,
          } : {
            Offer_Name: formData.Offer_Name,
            Offer_Discount: Number(
              formData.Offer_Discount
            ),
            Offer_StartDate:
              formData.Offer_StartDate || null,
            Offer_EndDate:
              formData.Offer_EndDate || null,
            Product_IDs: selectedProductIds,
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

      alert(isEditing
        ? `Offer products updated: ${data.Product_Count} linked.`
        : `Offer added and linked to ${data.Product_Count} product${data.Product_Count === 1 ? "" : "s"}.`);

      setShowModal(false);
      setEditingOfferId(null);

      setFormData({
        Offer_Name: "",
        Offer_Discount: "",
        Offer_StartDate: "",
        Offer_EndDate: "",
      });
      setSelectedProductIds([]);

      fetchOffers();
    } catch (error) {
      console.error("Add offer error:", error);
      setFormError(error.message || "Unable to connect to backend.");
    } finally {
      setSubmitting(false);
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
        `http://localhost:5000/api/offers/${offerId}`,
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
    `${offer.Offer_Name} ${offer.Product_Names || ""}`.toLowerCase().includes(search.toLowerCase())
  );

  // =========================
  // DATE FORMAT
  // =========================

  const formatDate = (date) => {
    if (!date) {
      return "N/A";
    }

    const parsedDate = new Date(date);
    if (Number.isNaN(parsedDate.getTime())) return String(date);
    return parsedDate.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
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
          onClick={openAddOffer}
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
                        <div className="offer-product-summary">
                          <strong>{Number(offer.Product_Count) || 0} linked</strong>
                          <span>{offer.Product_Names || "No products linked"}</span>
                        </div>
                      </td>

                      <td>
                        <div className="offer-actions">
                          <button className="secondary-btn" onClick={() => openOfferProducts(offer)}>
                            Manage products
                          </button>
                          <button className="delete-btn" onClick={() => handleDelete(offer.Offer_ID)}>
                            Delete
                          </button>
                        </div>
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
              <h2>{editingOfferId !== null ? "Manage offer products" : "Add Offer"}</h2>

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

              {editingOfferId === null && (
                <>
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
                </>
              )}

              <div className="form-group">
                <label htmlFor="offer-products">Apply to products</label>
                <select
                  id="offer-products"
                  className="offer-product-select"
                  multiple
                  size={Math.min(Math.max(products.length, 3), 6)}
                  value={selectedProductIds}
                  onChange={(event) => setSelectedProductIds(
                    Array.from(event.target.selectedOptions, (option) => option.value),
                  )}
                >
                  {products.map((product) => (
                    <option key={product.Product_ID} value={String(product.Product_ID)}>
                      {product.Product_Name} · ₹{product.Product_Price}
                    </option>
                  ))}
                </select>
                <small className="offer-product-help">Select one or more catalog products for this discount.</small>
              </div>

              {/* DATES */}

              {editingOfferId === null && <div className="form-row">

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

              </div>}

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
                  disabled={submitting || !products.length}
                >
                  {submitting ? "Saving offer..." : editingOfferId !== null ? "Save product links" : "Add Offer"}
                </button>

              </div>
              {formError && <p className="offer-form-error" role="alert">{formError}</p>}

            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Offers;