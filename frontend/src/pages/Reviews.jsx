import { useEffect, useState } from "react";

function Reviews() {
  const [reviews, setReviews] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [formData, setFormData] = useState({
    Customer_ID: "1",
    Product_ID: "1",
    Review_Rating: "5",
    Review_Comment: "",
    Review_Date: "",
  });

  // =====================================================
  // GET REVIEWS
  // =====================================================

  const fetchReviews = async () => {
    try {
      setLoading(true);

      const response = await fetch(
        "http://10.167.96.27:5000/api/reviews"
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to fetch reviews"
        );
      }

      setReviews(data);
    } catch (error) {
      console.error(
        "Error fetching reviews:",
        error
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
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
  // ADD REVIEW
  // =====================================================

  const handleAddReview = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch(
        "http://10.167.96.27:5000/api/reviews",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            Customer_ID: Number(
              formData.Customer_ID
            ),

            Product_ID: Number(
              formData.Product_ID
            ),

            Review_Rating: Number(
              formData.Review_Rating
            ),

            Review_Comment:
              formData.Review_Comment,

            Review_Date:
              formData.Review_Date || null,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(
          data.message ||
            data.error ||
            "Failed to add review"
        );
        return;
      }

      alert("Review added successfully!");

      setShowModal(false);

      setFormData({
        Customer_ID: "1",
        Product_ID: "1",
        Review_Rating: "5",
        Review_Comment: "",
        Review_Date: "",
      });

      fetchReviews();
    } catch (error) {
      console.error(
        "Add review error:",
        error
      );

      alert("Unable to connect to backend.");
    }
  };

  // =====================================================
  // DELETE REVIEW
  // =====================================================

  const handleDelete = async (reviewId) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this review?"
    );

    if (!confirmDelete) {
      return;
    }

    try {
      const response = await fetch(
        `http://10.167.96.27:5000/api/reviews/${reviewId}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(
          data.message ||
            data.error ||
            "Failed to delete review"
        );
        return;
      }

      alert("Review deleted successfully!");

      fetchReviews();
    } catch (error) {
      console.error(
        "Delete review error:",
        error
      );

      alert("Unable to connect to backend.");
    }
  };

  // =====================================================
  // SEARCH
  // =====================================================

  const filteredReviews = reviews.filter(
    (review) => {
      const searchText =
        search.toLowerCase();

      return (
        String(review.Review_ID)
          .toLowerCase()
          .includes(searchText) ||

        (review.Customer_Name || "")
          .toLowerCase()
          .includes(searchText) ||

        (review.Product_Name || "")
          .toLowerCase()
          .includes(searchText) ||

        String(review.Review_Rating)
          .toLowerCase()
          .includes(searchText) ||

        (review.Review_Comment || "")
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
  // STAR DISPLAY
  // =====================================================

  const displayStars = (rating) => {
    const value = Number(rating) || 0;

    return "★".repeat(value) +
      "☆".repeat(5 - value);
  };

  // =====================================================
  // UI
  // =====================================================

  return (
    <div>

      {/* PAGE HEADER */}

      <div className="page-header">

        <div>

          <h1>Reviews</h1>

          <p>
            Manage customer product reviews
          </p>

        </div>

        <button
          className="primary-btn"
          onClick={() =>
            setShowModal(true)
          }
        >
          + Add Review
        </button>

      </div>


      {/* REVIEW TABLE */}

      <div className="table-card">

        <div className="table-header">

          <div>

            <h2>Review List</h2>

            <p>
              {reviews.length} reviews found
            </p>

          </div>

          <input
            type="text"
            placeholder="Search reviews..."
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            className="search-input"
          />

        </div>


        {loading ? (

          <p className="loading-text">
            Loading reviews...
          </p>

        ) : (

          <div className="table-container">

            <table>

              <thead>

                <tr>
                  <th>ID</th>
                  <th>CUSTOMER</th>
                  <th>PRODUCT</th>
                  <th>RATING</th>
                  <th>COMMENT</th>
                  <th>DATE</th>
                  <th>ACTION</th>
                </tr>

              </thead>


              <tbody>

                {filteredReviews.length > 0 ? (

                  filteredReviews.map(
                    (review) => (

                      <tr
                        key={
                          review.Review_ID
                        }
                      >

                        <td>
                          {review.Review_ID}
                        </td>

                        <td>
                          <strong>
                            {review.Customer_Name ||
                              `Customer ${review.Customer_ID}`}
                          </strong>
                        </td>

                        <td>
                          {review.Product_Name ||
                            `Product ${review.Product_ID}`}
                        </td>

                        <td>

                          <span
                            style={{
                              fontSize: "18px",
                              letterSpacing: "2px",
                            }}
                          >
                            {displayStars(
                              review.Review_Rating
                            )}
                          </span>

                          <br />

                          <small>
                            {review.Review_Rating}/5
                          </small>

                        </td>

                        <td>
                          {review.Review_Comment ||
                            "No comment"}
                        </td>

                        <td>
                          {formatDate(
                            review.Review_Date
                          )}
                        </td>

                        <td>

                          <button
                            className="delete-btn"
                            onClick={() =>
                              handleDelete(
                                review.Review_ID
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
                      No reviews found
                    </td>

                  </tr>

                )}

              </tbody>

            </table>

          </div>

        )}

      </div>


      {/* ADD REVIEW MODAL */}

      {showModal && (

        <div className="modal-overlay">

          <div className="modal">

            <div className="modal-header">

              <h2>Add Review</h2>

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
              onSubmit={handleAddReview}
            >

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


              {/* RATING */}

              <div className="form-group">

                <label>
                  Rating
                </label>

                <select
                  name="Review_Rating"
                  value={
                    formData.Review_Rating
                  }
                  onChange={handleChange}
                >

                  <option value="5">
                    5 - Excellent
                  </option>

                  <option value="4">
                    4 - Very Good
                  </option>

                  <option value="3">
                    3 - Good
                  </option>

                  <option value="2">
                    2 - Average
                  </option>

                  <option value="1">
                    1 - Poor
                  </option>

                </select>

              </div>


              {/* COMMENT */}

              <div className="form-group">

                <label>
                  Comment
                </label>

                <textarea
                  name="Review_Comment"
                  value={
                    formData.Review_Comment
                  }
                  onChange={handleChange}
                  placeholder="Write customer review"
                  rows="4"
                />

              </div>


              {/* DATE */}

              <div className="form-group">

                <label>
                  Review Date
                </label>

                <input
                  type="date"
                  name="Review_Date"
                  value={
                    formData.Review_Date
                  }
                  onChange={handleChange}
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
                  Add Review
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </div>
  );
}

export default Reviews;