import { useEffect, useState } from "react";

function Categories() {
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [formData, setFormData] = useState({
    Category_Name: "",
    Category_Description: "",
  });

  // =========================
  // GET ALL CATEGORIES
  // =========================
  const fetchCategories = async () => {
    try {
      setLoading(true);

      const response = await fetch(
        "http://10.167.96.27:5000/api/categories"
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to fetch categories"
        );
      }

      setCategories(data);
    } catch (error) {
      console.error("Error fetching categories:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
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
  // ADD CATEGORY
  // =========================
  const handleAddCategory = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch(
        "http://10.167.96.27:5000/api/categories",
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
            "Failed to add category"
        );
        return;
      }

      alert("Category added successfully!");

      setShowModal(false);

      setFormData({
        Category_Name: "",
        Category_Description: "",
      });

      fetchCategories();
    } catch (error) {
      console.error("Add category error:", error);
      alert("Unable to connect to backend.");
    }
  };

  // =========================
  // DELETE CATEGORY
  // =========================
  const handleDelete = async (categoryId) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this category?"
    );

    if (!confirmDelete) {
      return;
    }

    try {
      const response = await fetch(
        "http://10.167.96.27:5000/api/categories/${categoryId}",
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(
          data.message ||
            data.error ||
            "Failed to delete category"
        );
        return;
      }

      alert("Category deleted successfully!");

      fetchCategories();
    } catch (error) {
      console.error("Delete category error:", error);
      alert("Unable to connect to backend.");
    }
  };

  // =========================
  // SEARCH
  // =========================
  const filteredCategories = categories.filter((category) =>
    category.Category_Name
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <div>
      {/* PAGE HEADER */}
      <div className="page-header">
        <div>
          <h1>Categories</h1>
          <p>Manage product categories</p>
        </div>

        <button
          className="primary-btn"
          onClick={() => setShowModal(true)}
        >
          + Add Category
        </button>
      </div>

      {/* CATEGORY TABLE */}
      <div className="table-card">
        <div className="table-header">
          <div>
            <h2>Category List</h2>
            <p>
              {categories.length} categories found
            </p>
          </div>

          <input
            type="text"
            placeholder="Search categories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
          />
        </div>

        {loading ? (
          <p className="loading-text">
            Loading categories...
          </p>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Category Name</th>
                  <th>Description</th>
                  <th>Products</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredCategories.length > 0 ? (
                  filteredCategories.map((category) => (
                    <tr key={category.Category_ID}>
                      <td>{category.Category_ID}</td>

                      <td>
                        <strong>
                          {category.Category_Name}
                        </strong>
                      </td>

                      <td>
                        {category.Category_Description ||
                          "N/A"}
                      </td>

                      <td>
                        {category.Product_Count}
                      </td>

                      <td>
                        <button
                          className="delete-btn"
                          onClick={() =>
                            handleDelete(
                              category.Category_ID
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
                      colSpan="5"
                      className="empty-state"
                    >
                      No categories found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ADD CATEGORY MODAL */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Add Category</h2>

              <button
                className="modal-close"
                onClick={() => setShowModal(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleAddCategory}>
              {/* CATEGORY NAME */}
              <div className="form-group">
                <label>Category Name</label>

                <input
                  type="text"
                  name="Category_Name"
                  value={formData.Category_Name}
                  onChange={handleChange}
                  placeholder="Enter category name"
                  required
                />
              </div>

              {/* DESCRIPTION */}
              <div className="form-group">
                <label>Description</label>

                <textarea
                  name="Category_Description"
                  value={formData.Category_Description}
                  onChange={handleChange}
                  placeholder="Enter category description"
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
                  Add Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Categories;