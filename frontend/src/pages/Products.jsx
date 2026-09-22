import { useEffect, useState } from "react";

function Products() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);

  const [formData, setFormData] = useState({
    Product_Name: "",
    Product_Description: "",
    Product_Price: "",
    Product_Stock: "",
    Category_ID: "1",
    Seller_ID: "1",
  });

  // =========================
  // GET PRODUCTS
  // =========================
  const fetchProducts = async () => {
    try {
      setLoading(true);

      const response = await fetch(
        "http://10.167.96.27:5000/api/products"
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch products");
      }

      setProducts(data);
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
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
  // ADD PRODUCT
  // =========================
  const handleAddProduct = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch(
        "http://10.167.96.27:5000/api/products",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            Product_Name: formData.Product_Name,
            Product_Description: formData.Product_Description,
            Product_Price: Number(formData.Product_Price),
            Product_Stock: Number(formData.Product_Stock),
            Category_ID: Number(formData.Category_ID),
            Seller_ID: Number(formData.Seller_ID),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(
          data.message ||
            data.error ||
            "Failed to add product"
        );
        return;
      }

      alert("Product added successfully!");

      setShowModal(false);

      setFormData({
        Product_Name: "",
        Product_Description: "",
        Product_Price: "",
        Product_Stock: "",
        Category_ID: "1",
        Seller_ID: "1",
      });

      fetchProducts();
    } catch (error) {
      console.error("Add product error:", error);
      alert("Unable to connect to backend.");
    }
  };

  // =========================
  // DELETE PRODUCT
  // =========================
  const handleDelete = async (productId) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this product?"
    );

    if (!confirmDelete) {
      return;
    }

    try {
      const response = await fetch(
        `http://10.167.96.27:5000/api/products/${productId}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(
          data.message ||
            data.error ||
            "Failed to delete product"
        );
        return;
      }

      alert("Product deleted successfully!");

      fetchProducts();
    } catch (error) {
      console.error("Delete product error:", error);
      alert("Unable to connect to backend.");
    }
  };

  // =========================
  // SEARCH
  // =========================
  const filteredProducts = products.filter((product) =>
    product.Product_Name.toLowerCase().includes(
      search.toLowerCase()
    )
  );

  // =========================
  // UI
  // =========================
  return (
    <div>
      {/* PAGE HEADER */}
      <div className="page-header">
        <div>
          <h1>Products</h1>
          <p>Manage products in your marketplace</p>
        </div>

        <button
          className="primary-btn"
          onClick={() => setShowModal(true)}
        >
          + Add Product
        </button>
      </div>

      {/* PRODUCT TABLE */}
      <div className="table-card">
        <div className="table-header">
          <div>
            <h2>Product List</h2>
            <p>{products.length} products found</p>
          </div>

          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
          />
        </div>

        {loading ? (
          <p className="loading-text">
            Loading products...
          </p>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Product</th>
                  <th>Description</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Category</th>
                  <th>Seller</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredProducts.length > 0 ? (
                  filteredProducts.map((product) => (
                    <tr key={product.Product_ID}>
                      <td>{product.Product_ID}</td>

                      <td>
                        <strong>
                          {product.Product_Name}
                        </strong>
                      </td>

                      <td>
                        {product.Product_Description}
                      </td>

                      <td>
                        ₹{product.Product_Price}
                      </td>

                      <td>
                        {product.Product_Stock}
                      </td>

                      <td>
                        {product.Category_Name || "N/A"}
                      </td>

                      <td>
                        {product.Seller_Name || "N/A"}
                      </td>

                      <td>
                        <button
                          className="delete-btn"
                          onClick={() =>
                            handleDelete(
                              product.Product_ID
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
                      No products found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ADD PRODUCT MODAL */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Add Product</h2>

              <button
                className="modal-close"
                onClick={() => setShowModal(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleAddProduct}>
              {/* PRODUCT NAME */}
              <div className="form-group">
                <label>Product Name</label>

                <input
                  type="text"
                  name="Product_Name"
                  value={formData.Product_Name}
                  onChange={handleChange}
                  placeholder="Enter product name"
                  required
                />
              </div>

              {/* DESCRIPTION */}
              <div className="form-group">
                <label>Description</label>

                <textarea
                  name="Product_Description"
                  value={formData.Product_Description}
                  onChange={handleChange}
                  placeholder="Enter product description"
                />
              </div>

              {/* PRICE + STOCK */}
              <div className="form-row">
                <div className="form-group">
                  <label>Price</label>

                  <input
                    type="number"
                    name="Product_Price"
                    value={formData.Product_Price}
                    onChange={handleChange}
                    placeholder="Enter price"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Stock</label>

                  <input
                    type="number"
                    name="Product_Stock"
                    value={formData.Product_Stock}
                    onChange={handleChange}
                    placeholder="Enter stock"
                    min="0"
                    required
                  />
                </div>
              </div>

              {/* CATEGORY + SELLER */}
              <div className="form-row">
                <div className="form-group">
                  <label>Category ID</label>

                  <input
                    type="number"
                    name="Category_ID"
                    value={formData.Category_ID}
                    onChange={handleChange}
                    min="1"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Seller ID</label>

                  <input
                    type="number"
                    name="Seller_ID"
                    value={formData.Seller_ID}
                    onChange={handleChange}
                    min="1"
                    required
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
                  Add Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Products;