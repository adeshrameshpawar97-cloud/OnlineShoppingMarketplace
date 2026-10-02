# OnlineShoppingMarketplace

## Automatic product images

When adding a product, choose an image file (JPG, PNG, GIF, or WebP up to 5 MB) or paste a direct HTTPS image URL. Uploads are stored under `backend/static/product-images/`; the resulting URL is saved in the MySQL `Product_Image_URL` column and displayed in both the admin catalog and storefront. On startup, the backend adds that nullable column if it does not already exist.

If neither manual image option is supplied, the backend can use Google Programmable Search image results when configured. If Google search is unavailable, product creation still succeeds and the app uses its local fallback image mapping.

Create a Programmable Search Engine configured to search the web, enable image search and the Custom Search JSON API for its Google Cloud project, then set these variables in the PowerShell session used to start Flask:

```powershell
$env:GOOGLE_CSE_API_KEY = "YOUR_GOOGLE_API_KEY"
$env:GOOGLE_CSE_CX = "YOUR_SEARCH_ENGINE_ID"
python app.py
```

Restart Flask after setting the variables. Keep both values on the backend; never add them to frontend code or commit them to the repository. The image query requests Creative Commons-filtered results, but verify image usage rights before using results commercially.