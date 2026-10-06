# OnlineShoppingMarketplace

## Marketplace accounts

The sign-in page has separate admin, customer, and seller choices. Customers and sellers can create accounts with an email and a password of at least 8 characters. Passwords are stored as hashes in the `MARKETPLACE_ACCOUNT` table, which the backend creates automatically. Customer accounts can shop and view their own order history; seller accounts can manage their own products and view orders containing their products. Account sessions are independent per browser tab, and customer carts are kept separate by account so multiple customers and sellers can use the marketplace concurrently. Set the same strong `MARKETPLACE_SECRET_KEY` value on all backend workers in a deployment so signed-in sessions work across workers and restarts.

## Order notifications

The admin top bar and seller workspace show recent orders in their notification menus. They refresh every 20 seconds while open in the app; seller notifications are limited to orders containing products owned by the signed-in seller. Read/unread state is saved in the current browser for each admin or seller account.

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