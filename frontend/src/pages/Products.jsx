import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

const FALLBACK_PRODUCT_IMAGE = "https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=320&q=80";

const inventoryProductImage = (product) => {
  if (product.Product_Image_URL) return product.Product_Image_URL;
  const text = `${product.Product_Name} ${product.Category_Name || ""}`.toLowerCase();
  if (text.includes("tea cup") || text.includes("cup") || text.includes("mug") || text.includes("teacup")) {
    return "https://images.unsplash.com/photo-1616371041303-a468ea826828?auto=format&fit=crop&w=320&q=80";
  }
  if (text.includes("headphone") || text.includes("audio")) {
    return "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=320&q=80";
  }
  if (text.includes("watch")) {
    return "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=320&q=80";
  }
  if (text.includes("phone") || text.includes("mobile")) {
    return "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=320&q=80";
  }
  if (text.includes("fashion") || text.includes("shirt") || text.includes("shoe") || text.includes("pant") || text.includes("trouser") || text.includes("jean")) {
    return "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=320&q=80";
  }
  return FALLBACK_PRODUCT_IMAGE;
};

function Products() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeCategoryId = searchParams.get("category") || "";
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);

  const [formData, setFormData] = useState({
    Product_Name: "",
    Product_Description: "",
    Product_Price: "",
    Product_Stock: "",
    Category_ID: "1",
    Seller_ID: "1",
    Product_Image_URL: "",
  });
  const [imageMode, setImageMode] = useState("upload");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // =========================
  // GET PRODUCTS
  // =========================
  const fetchProducts = async () => {
    try {
      setLoading(true);

      const response = await fetch(
        "http://localhost:5000/api/products",
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

  const handleImageFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setFormError("Choose a JPG, PNG, GIF, or WebP image.");
      event.target.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setFormError("Product images must be 5 MB or smaller.");
      event.target.value = "";
      return;
    }
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setFormError("");
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const clearImageSelection = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview("");
  };

  // =========================
  // ADD PRODUCT
  // =========================
  const handleAddProduct = async (e) => {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);

    try {
      const payload = new FormData();
      payload.append("Product_Name", formData.Product_Name);
      payload.append("Product_Description", formData.Product_Description);
      payload.append("Product_Price", formData.Product_Price);
      payload.append("Product_Stock", formData.Product_Stock);
      payload.append("Category_ID", formData.Category_ID);
      payload.append("Seller_ID", formData.Seller_ID);
      if (imageMode === "upload" && imageFile) {
        payload.append("Product_Image", imageFile);
      }
      if (imageMode === "url" && formData.Product_Image_URL.trim()) {
        payload.append("Product_Image_URL", formData.Product_Image_URL.trim());
      }

      const response = await fetch(
        "http://localhost:5000/api/products",
        {
          method: "POST",
          body: payload,
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

      alert(data.image_found
        ? "Product added with a matching image."
        : "Product added. Google image search is unavailable, so a fallback image is shown.");

      setShowModal(false);

      setFormData({
        Product_Name: "",
        Product_Description: "",
        Product_Price: "",
        Product_Stock: "",
        Category_ID: "1",
        Seller_ID: "1",
        Product_Image_URL: "",
      });
      clearImageSelection();
      setImageMode("upload");

      fetchProducts();
    } catch (error) {
      console.error("Add product error:", error);
      setFormError(error.message || "Unable to connect to backend.");
    } finally {
      setSubmitting(false);
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
        `http://localhost:5000/api/products/${productId}`,
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
  const filteredProducts = products.filter((product) => {
    const matchesSearch = `${product.Product_Name} ${product.Product_Description || ""} ${product.Category_Name || ""}`
      .toLowerCase()
      .includes(search.toLowerCase());
    const stock = Number(product.Product_Stock) || 0;
    const matchesStock = stockFilter === "all"
      || (stockFilter === "available" && stock > 5)
      || (stockFilter === "low" && stock > 0 && stock <= 5)
      || (stockFilter === "out" && stock === 0);
    const matchesCategory = !activeCategoryId || String(product.Category_ID) === activeCategoryId;
    return matchesSearch && matchesStock && matchesCategory;
  });
  const totalUnits = products.reduce((total, product) => total + (Number(product.Product_Stock) || 0), 0);
  const lowStockCount = products.filter((product) => Number(product.Product_Stock) > 0 && Number(product.Product_Stock) <= 5).length;
  const activeCategoryName = products.find((product) => String(product.Category_ID) === activeCategoryId)?.Category_Name;

  // =========================
  // UI
  // =========================
  return (
    <div>
      {/* PAGE HEADER */}
      <div className="page-header">
        <div>
          <h1>Product catalog</h1>
          <p>Keep listings, availability, and seller inventory in sync.</p>
        </div>

        <button
          className="primary-btn"
          onClick={() => setShowModal(true)}
        >
          + Add Product
        </button>
      </div>

      {activeCategoryId && (
        <div className="inventory-active-filter">
          <span>Category: {activeCategoryName || `#${activeCategoryId}`}</span>
          <button type="button" onClick={() => setSearchParams({})}>Clear filter</button>
        </div>
      )}

      <div className="inventory-summary" aria-label="Inventory overview">
        <div><span>Catalog listings</span><strong>{products.length}</strong><small>products in the database</small></div>
        <div><span>Units on hand</span><strong>{totalUnits.toLocaleString("en-IN")}</strong><small>across all listings</small></div>
        <div className={lowStockCount ? "attention" : ""}><span>Low stock</span><strong>{lowStockCount}</strong><small>5 units or fewer</small></div>
      </div>

      {/* PRODUCT TABLE */}
      <div className="table-card">
        <div className="table-header">
          <div>
            <h2>All products</h2>
            <p>Showing {filteredProducts.length} of {products.length} listings</p>
          </div>

          <div className="inventory-toolbar-controls">
            <select aria-label="Filter by stock level" value={stockFilter} onChange={(e) => setStockFilter(e.target.value)}>
              <option value="all">All stock levels</option>
              <option value="available">In stock</option>
              <option value="low">Low stock</option>
              <option value="out">Out of stock</option>
            </select>
            <input
              type="search"
              placeholder="Search catalog..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="search-input"
            />
          </div>
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
                  <th>Image</th>
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
                        <img
                          className="inventory-product-image"
                          src={inventoryProductImage(product)}
                          alt={product.Product_Name}
                          loading="lazy"
                          onError={(event) => {
                            event.currentTarget.onerror = null;
                            event.currentTarget.src = FALLBACK_PRODUCT_IMAGE;
                          }}
                        />
                      </td>

                      <td>
                        <div className="inventory-product-name">
                          <strong>{product.Product_Name}</strong>
                          <small>SKU #{product.Product_ID}</small>
                        </div>
                      </td>

                      <td>
                        {product.Product_Description}
                      </td>

                      <td>
                        ₹{product.Product_Price}
                      </td>

                      <td>
                        <span className={`inventory-stock ${Number(product.Product_Stock) === 0 ? "out" : Number(product.Product_Stock) <= 5 ? "low" : ""}`}>
                          {product.Product_Stock} {Number(product.Product_Stock) === 1 ? "unit" : "units"}
                        </span>
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
                      colSpan="9"
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

              <fieldset className="product-image-fieldset">
                <legend>Product image <span>(optional)</span></legend>
                <div className="product-image-mode" role="group" aria-label="Choose image source">
                  <button
                    type="button"
                    className={imageMode === "upload" ? "selected" : ""}
                    aria-pressed={imageMode === "upload"}
                    onClick={() => { setImageMode("upload"); setFormError(""); }}
                  >Upload image</button>
                  <button
                    type="button"
                    className={imageMode === "url" ? "selected" : ""}
                    aria-pressed={imageMode === "url"}
                    onClick={() => { setImageMode("url"); clearImageSelection(); setFormError(""); }}
                  >Use image URL</button>
                </div>
                {imageMode === "upload" ? (
                  <div className="product-image-upload">
                    <label htmlFor="product-image-file">Choose a product photo</label>
                    <input
                      id="product-image-file"
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      onChange={handleImageFileChange}
                    />
                    <small>JPG, PNG, GIF, or WebP · up to 5 MB</small>
                    {imagePreview && (
                      <div className="product-image-preview">
                        <img src={imagePreview} alt="Selected product preview" />
                        <span>{imageFile?.name}</span>
                        <button type="button" onClick={clearImageSelection}>Remove</button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="product-image-upload">
                    <label htmlFor="product-image-url">Secure image URL</label>
                    <input
                      id="product-image-url"
                      type="url"
                      name="Product_Image_URL"
                      value={formData.Product_Image_URL}
                      onChange={handleChange}
                      placeholder="https://example.com/product.jpg"
                    />
                    <small>Paste a direct HTTPS link to the product image.</small>
                  </div>
                )}
              </fieldset>

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
                  disabled={submitting}
                >
                  {submitting ? "Adding product..." : "Add Product"}
                </button>
              </div>
              {formError && <p className="product-form-error" role="alert">{formError}</p>}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Products;