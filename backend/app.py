import json
import os
import secrets
from functools import wraps
from pathlib import Path
from urllib.parse import parse_qs, urlencode, urlparse
from urllib.request import Request, urlopen

from flask import Flask, g, jsonify, request, url_for
from flask_cors import CORS
from db import ensure_marketplace_account_table, ensure_product_image_column, get_db_connection
from decimal import Decimal
from decimal import Decimal, ROUND_HALF_UP
from itsdangerous import BadSignature, URLSafeTimedSerializer
from mysql.connector.errors import IntegrityError
from werkzeug.security import check_password_hash, generate_password_hash

app = Flask(__name__)
app.secret_key = os.environ.get("MARKETPLACE_SECRET_KEY") or secrets.token_urlsafe(32)
CORS(app)
app.config["MAX_CONTENT_LENGTH"] = 6 * 1024 * 1024
MAX_PRODUCT_IMAGE_BYTES = 5 * 1024 * 1024
PRODUCT_IMAGE_DIR = Path(__file__).resolve().parent / "static" / "product-images"

try:
    ensure_product_image_column()
except Exception:
    app.logger.exception("Could not prepare the product image URL column")

try:
    ensure_marketplace_account_table()
except Exception:
    app.logger.exception("Could not prepare the marketplace account table")


def marketplace_token_serializer():
    return URLSafeTimedSerializer(app.secret_key, salt="marketplace-account-v1")


def create_marketplace_session(role, user_id, name, email):
    user = {
        "role": role,
        "id": int(user_id),
        "name": name,
        "email": email,
    }
    return {
        "token": marketplace_token_serializer().dumps(user),
        "user": user,
    }


def require_marketplace_role(role):
    def decorator(view):
        @wraps(view)
        def wrapped(*args, **kwargs):
            authorization = request.headers.get("Authorization", "")
            scheme, _, token = authorization.partition(" ")
            if scheme.lower() != "bearer" or not token:
                return jsonify({"success": False, "message": "Please sign in to continue"}), 401

            try:
                user = marketplace_token_serializer().loads(token, max_age=60 * 60 * 12)
            except BadSignature:
                return jsonify({"success": False, "message": "Your session has expired. Please sign in again."}), 401

            if user.get("role") != role:
                return jsonify({"success": False, "message": "You do not have permission to access this resource"}), 403

            g.marketplace_user = user
            return view(*args, **kwargs)

        return wrapped

    return decorator


def account_payload(data, role):
    name_key = "Customer_Name" if role == "customer" else "Seller_Name"
    email_key = "Customer_Email" if role == "customer" else "Seller_Email"
    phone_key = "Customer_Phone" if role == "customer" else "Seller_Phone"
    address_key = "Customer_Address" if role == "customer" else "Seller_Address"
    name = str(data.get(name_key, "")).strip()
    email = str(data.get(email_key, "")).strip().lower()
    password = data.get("password", "")
    phone = str(data.get(phone_key, "")).strip()
    address = str(data.get(address_key, "")).strip()

    if not name or not email or not address or "@" not in email:
        raise ValueError("Name, a valid email address, and address are required")
    if not isinstance(password, str) or len(password) < 8:
        raise ValueError("Password must be at least 8 characters")

    return name, email, phone, address, password


def create_account(role, data):
    name, email, phone, address, password = account_payload(data, role)
    table = "CUSTOMER" if role == "customer" else "SELLER"
    id_column = "Customer_ID" if role == "customer" else "Seller_ID"
    name_column = "Customer_Name" if role == "customer" else "Seller_Name"
    email_column = "Customer_Email" if role == "customer" else "Seller_Email"
    address_column = "Customer_Address" if role == "customer" else "Seller_Address"

    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(dictionary=True)
        cur.execute(
            "SELECT Account_ID FROM MARKETPLACE_ACCOUNT WHERE Account_Role = %s AND Account_Email = %s",
            (role, email),
        )
        if cur.fetchone():
            return jsonify({"success": False, "message": "An account with this email already exists"}), 409

        cur.execute(
            f"SELECT {id_column} AS user_id FROM {table} WHERE {email_column} = %s LIMIT 1 FOR UPDATE",
            (email,),
        )
        existing_user = cur.fetchone()
        if existing_user:
            user_id = existing_user["user_id"]
            cur.execute(
                f"UPDATE {table} SET {name_column} = %s, {address_column} = %s WHERE {id_column} = %s",
                (name, address, user_id),
            )
        elif role == "customer":
            cur.execute(
                "INSERT INTO CUSTOMER (Customer_Name, Customer_Email, Customer_Address) VALUES (%s, %s, %s)",
                (name, email, address),
            )
            user_id = cur.lastrowid
        else:
            cur.execute(
                "INSERT INTO SELLER (Seller_Name, Seller_Email, Seller_Phone, Seller_Address) VALUES (%s, %s, %s, %s)",
                (name, email, phone or None, address),
            )
            user_id = cur.lastrowid

        if role == "customer" and phone:
            cur.execute(
                "SELECT Customer_ID FROM CUSTOMER_PHONE WHERE Customer_ID = %s AND Customer_Phone = %s",
                (user_id, phone),
            )
            if not cur.fetchone():
                cur.execute(
                    "INSERT INTO CUSTOMER_PHONE (Customer_ID, Customer_Phone) VALUES (%s, %s)",
                    (user_id, phone),
                )

        cur.execute(
            """
            INSERT INTO MARKETPLACE_ACCOUNT
                (Account_Role, User_ID, Account_Email, Password_Hash)
            VALUES (%s, %s, %s, %s)
            """,
            (role, user_id, email, generate_password_hash(password)),
        )
        conn.commit()
        return jsonify({
            "success": True,
            **create_marketplace_session(role, user_id, name, email),
        }), 201
    except IntegrityError:
        if conn:
            conn.rollback()
        return jsonify({"success": False, "message": "An account with this email already exists"}), 409
    except Exception:
        if conn:
            conn.rollback()
        app.logger.exception("Could not create %s account", role)
        return jsonify({"success": False, "message": "Unable to create account"}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


@app.route("/api/auth/register/<role>", methods=["POST"])
def register_marketplace_account(role):
    if role not in {"customer", "seller"}:
        return jsonify({"success": False, "message": "Choose customer or seller registration"}), 404
    try:
        return create_account(role, request.get_json(silent=True) or {})
    except ValueError as error:
        return jsonify({"success": False, "message": str(error)}), 400


@app.route("/api/auth/login/<role>", methods=["POST"])
def login_marketplace_account(role):
    if role not in {"customer", "seller"}:
        return jsonify({"success": False, "message": "Choose customer or seller login"}), 404
    data = request.get_json(silent=True) or {}
    email = str(data.get("email", "")).strip().lower()
    password = data.get("password", "")
    if not email or not isinstance(password, str) or not password:
        return jsonify({"success": False, "message": "Email and password are required"}), 400

    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(dictionary=True)
        cur.execute("""
            SELECT
                a.User_ID,
                a.Account_Email,
                a.Password_Hash,
                CASE
                    WHEN a.Account_Role = 'customer' THEN c.Customer_Name
                    ELSE s.Seller_Name
                END AS User_Name
            FROM MARKETPLACE_ACCOUNT a
            LEFT JOIN CUSTOMER c
                ON a.Account_Role = 'customer' AND a.User_ID = c.Customer_ID
            LEFT JOIN SELLER s
                ON a.Account_Role = 'seller' AND a.User_ID = s.Seller_ID
            WHERE a.Account_Role = %s AND a.Account_Email = %s
        """, (role, email))
        account = cur.fetchone()
        if not account or not check_password_hash(account["Password_Hash"], password):
            return jsonify({"success": False, "message": "Invalid email or password"}), 401
        return jsonify({
            "success": True,
            **create_marketplace_session(role, account["User_ID"], account["User_Name"], account["Account_Email"]),
        })
    except Exception:
        app.logger.exception("Could not sign in %s account", role)
        return jsonify({"success": False, "message": "Unable to sign in right now"}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

@app.errorhandler(413)
def product_upload_too_large(_error):
    return jsonify({
        "success": False,
        "message": "Product image uploads must be 5 MB or smaller"
    }), 413


def find_google_product_image(product_name):
    api_key = os.environ.get("GOOGLE_CSE_API_KEY")
    search_engine_id = os.environ.get("GOOGLE_CSE_CX")
    if not api_key or not search_engine_id:
        return None

    params = urlencode({
        "key": api_key,
        "cx": search_engine_id,
        "q": f"{product_name} product photo",
        "searchType": "image",
        "num": 5,
        "safe": "active",
        "rights": "cc_publicdomain,cc_attribute,cc_sharealike",
        "fields": "items(link)",
    })
    request_url = f"https://www.googleapis.com/customsearch/v1?{params}"

    try:
        with urlopen(Request(request_url), timeout=6) as response:
            results = json.loads(response.read().decode("utf-8")).get("items", [])
        for result in results:
            image_url = result.get("link", "")
            if urlparse(image_url).scheme == "https":
                return image_url
    except Exception:
        app.logger.warning("Google image search failed for a product")

    return None


def save_uploaded_product_image(image_file):
    if not image_file or not image_file.filename:
        return None, None

    image_data = image_file.stream.read(MAX_PRODUCT_IMAGE_BYTES + 1)
    if len(image_data) > MAX_PRODUCT_IMAGE_BYTES:
        raise ValueError("Product images must be 5 MB or smaller")

    signatures = (
        (image_data.startswith(b"\xff\xd8\xff"), "jpg"),
        (image_data.startswith(b"\x89PNG\r\n\x1a\n"), "png"),
        (image_data.startswith((b"GIF87a", b"GIF89a")), "gif"),
        (image_data[:4] == b"RIFF" and image_data[8:12] == b"WEBP", "webp"),
    )
    extension = next((ext for matches, ext in signatures if matches), None)
    if not extension:
        raise ValueError("Upload a valid JPG, PNG, GIF, or WebP image")

    PRODUCT_IMAGE_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"{secrets.token_hex(16)}.{extension}"
    image_path = PRODUCT_IMAGE_DIR / filename
    image_path.write_bytes(image_data)
    image_url = url_for("static", filename=f"product-images/{filename}", _external=True)
    return image_url, image_path


def validate_product_image_url(image_url):
    image_url = (image_url or "").strip()
    if not image_url:
        return None
    parsed_url = urlparse(image_url)
    if len(image_url) > 2048 or parsed_url.scheme != "https" or not parsed_url.netloc:
        raise ValueError("Image URL must be a valid HTTPS URL")

    hostname = (parsed_url.hostname or "").lower()
    if hostname == "bing.com" or hostname.endswith(".bing.com"):
        media_url = parse_qs(parsed_url.query).get("mediaurl", [None])[0]
        media_parsed_url = urlparse(media_url or "")
        if media_parsed_url.scheme != "https" or not media_parsed_url.netloc:
            raise ValueError("Paste the image address itself, not a search result page")
        image_url = media_url

    return image_url


# =========================================================
# HOME
# =========================================================

@app.route("/")
def home():
    return jsonify({
        "message": "Online Shopping Marketplace API is running"
    })


# =========================================================
# TEST DATABASE
# =========================================================

@app.route("/api/test-db")
def test_db():
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("SELECT DATABASE()")
        database = cur.fetchone()[0]

        cur.close()
        conn.close()

        return jsonify({
            "success": True,
            "database": database,
            "message": "MySQL connected successfully"
        })

    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# =========================================================
# ADMIN LOGIN
# =========================================================

@app.route("/api/login", methods=["POST"])
def admin_login():

    try:
        data = request.get_json()

        username = data.get("username")
        password = data.get("password")

        # Demo admin credentials
        if username == "admin" and password == "admin123":

            return jsonify({
                "success": True,
                "message": "Login successful",
                "username": "admin"
            })

        return jsonify({
            "success": False,
            "message": "Invalid username or password"
        }), 401

    except Exception as e:

        return jsonify({
            "success": False,
            "message": "Login failed",
            "error": str(e)
        }), 500


# =========================================================
# DASHBOARD
# =========================================================

@app.route("/api/dashboard", methods=["GET"])
def dashboard():

    try:
        conn = get_db_connection()
        cur = conn.cursor(dictionary=True)

        # Customers
        cur.execute("""
            SELECT COUNT(*) AS total
            FROM CUSTOMER
        """)
        customers = cur.fetchone()["total"]

        # Sellers
        cur.execute("""
            SELECT COUNT(*) AS total
            FROM SELLER
        """)
        sellers = cur.fetchone()["total"]

        # Products
        cur.execute("""
            SELECT COUNT(*) AS total
            FROM PRODUCT
        """)
        products = cur.fetchone()["total"]

        # Orders
        cur.execute("""
            SELECT COUNT(*) AS total
            FROM ORDERS
        """)
        orders = cur.fetchone()["total"]

        # Categories
        cur.execute("""
            SELECT COUNT(*) AS total
            FROM CATEGORY
        """)
        categories = cur.fetchone()["total"]

        # Offers
        cur.execute("""
            SELECT COUNT(*) AS total
            FROM OFFER
        """)
        offers = cur.fetchone()["total"]

        # Payments
        cur.execute("""
            SELECT COUNT(*) AS total
            FROM PAYMENT
        """)
        payments = cur.fetchone()["total"]

        # Reviews
        cur.execute("""
            SELECT COUNT(*) AS total
            FROM REVIEW
        """)
        reviews = cur.fetchone()["total"]

        # Revenue
        cur.execute("""
            SELECT COALESCE(
                SUM(Payment_Amount), 0
            ) AS total
            FROM PAYMENT
            WHERE Payment_Status = 'Paid'
        """)
        revenue = cur.fetchone()["total"]

        # Recent orders
        cur.execute("""
            SELECT
                o.Order_ID,
                c.Customer_Name,
                o.Order_Date,
                o.Order_Status,
                COALESCE(
                    SUM(
                        oi.OrderItem_Quantity *
                        oi.OrderItem_Price
                    ),
                    0
                ) AS Order_Amount
            FROM ORDERS o

            LEFT JOIN CUSTOMER c
                ON o.Customer_ID = c.Customer_ID

            LEFT JOIN ORDER_ITEM oi
                ON o.Order_ID = oi.Order_ID

            GROUP BY
                o.Order_ID,
                c.Customer_Name,
                o.Order_Date,
                o.Order_Status

            ORDER BY o.Order_ID DESC

            LIMIT 5
        """)

        recent_orders = cur.fetchall()

        cur.close()
        conn.close()

        return jsonify({

            "success": True,

            "stats": {
                "customers": customers,
                "sellers": sellers,
                "products": products,
                "orders": orders,
                "categories": categories,
                "offers": offers,
                "payments": payments,
                "reviews": reviews,
                "revenue": float(revenue or 0)
            },

            "recent_orders": recent_orders
        })

    except Exception as e:

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# =========================================================
# PRODUCTS
# =========================================================

@app.route("/api/products", methods=["GET"])
def get_products():

    try:
        conn = get_db_connection()
        cur = conn.cursor(dictionary=True)

        cur.execute("""
            SELECT
                p.Product_ID,
                p.Product_Name,
                p.Product_Description,
                p.Product_Image_URL,
                p.Product_Price,
                p.Product_Stock,
                p.Category_ID,
                p.Seller_ID,
                c.Category_Name,
                s.Seller_Name

            FROM PRODUCT p

            LEFT JOIN CATEGORY c
                ON p.Category_ID = c.Category_ID

            LEFT JOIN SELLER s
                ON p.Seller_ID = s.Seller_ID

            ORDER BY p.Product_ID DESC
        """)

        data = cur.fetchall()

        cur.close()
        conn.close()

        return jsonify(data)

    except Exception as e:

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route("/api/products", methods=["POST"])
def add_product():
    uploaded_image_path = None
    conn = None
    cur = None
    try:
        data = request.form if request.mimetype == "multipart/form-data" else (request.get_json(silent=True) or {})
        product_name = str(data.get("Product_Name", "")).strip()
        if not product_name:
            return jsonify({
                "success": False,
                "message": "Product name is required"
            }), 400

        uploaded_image = request.files.get("Product_Image")
        if uploaded_image and uploaded_image.filename:
            image_url, uploaded_image_path = save_uploaded_product_image(uploaded_image)
        else:
            image_url = validate_product_image_url(data.get("Product_Image_URL"))
        if not image_url:
            image_url = find_google_product_image(product_name)

        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("""
            INSERT INTO PRODUCT
            (
                Product_Name,
                Product_Description,
                Product_Image_URL,
                Product_Price,
                Product_Stock,
                Category_ID,
                Seller_ID
            )

            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (
            product_name,
            data.get("Product_Description"),
            image_url,
            data.get("Product_Price"),
            data.get("Product_Stock"),
            data.get("Category_ID"),
            data.get("Seller_ID")
        ))

        conn.commit()

        product_id = cur.lastrowid

        return jsonify({
            "success": True,
            "message": "Product added successfully",
            "Product_ID": product_id,
            "Product_Image_URL": image_url,
            "image_found": bool(image_url)
        }), 201

    except ValueError as error:
        if uploaded_image_path and uploaded_image_path.exists():
            uploaded_image_path.unlink()
        if conn:
            conn.rollback()
        return jsonify({"success": False, "message": str(error)}), 400
    except Exception as e:
        if uploaded_image_path and uploaded_image_path.exists():
            uploaded_image_path.unlink()
        if conn:
            conn.rollback()

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


@app.route("/api/products/<int:product_id>", methods=["DELETE"])
def delete_product(product_id):

    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute(
            """
            DELETE FROM PRODUCT
            WHERE Product_ID = %s
            """,
            (product_id,)
        )

        if cur.rowcount == 0:

            cur.close()
            conn.close()

            return jsonify({
                "success": False,
                "message": "Product not found"
            }), 404

        conn.commit()

        cur.close()
        conn.close()

        return jsonify({
            "success": True,
            "message": "Product deleted successfully"
        })

    except Exception as e:

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# =========================================================
# CATEGORIES
# =========================================================

@app.route("/api/categories", methods=["GET"])
def get_categories():

    try:
        conn = get_db_connection()
        cur = conn.cursor(dictionary=True)

        cur.execute("""
            SELECT
                c.Category_ID,
                c.Category_Name,
                c.Category_Description,
                COUNT(p.Product_ID) AS Product_Count

            FROM CATEGORY c

            LEFT JOIN PRODUCT p
                ON c.Category_ID = p.Category_ID

            GROUP BY
                c.Category_ID,
                c.Category_Name,
                c.Category_Description

            ORDER BY c.Category_ID DESC
        """)

        data = cur.fetchall()

        cur.close()
        conn.close()

        return jsonify(data)

    except Exception as e:

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route("/api/categories", methods=["POST"])
def add_category():

    try:
        data = request.get_json()

        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("""
            INSERT INTO CATEGORY
            (
                Category_Name,
                Category_Description
            )

            VALUES (%s, %s)
        """, (
            data.get("Category_Name"),
            data.get("Category_Description")
        ))

        conn.commit()

        category_id = cur.lastrowid

        cur.close()
        conn.close()

        return jsonify({
            "success": True,
            "message": "Category added successfully",
            "Category_ID": category_id
        }), 201

    except Exception as e:

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route("/api/categories/<int:category_id>", methods=["DELETE"])
def delete_category(category_id):

    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute(
            """
            DELETE FROM CATEGORY
            WHERE Category_ID = %s
            """,
            (category_id,)
        )

        if cur.rowcount == 0:

            cur.close()
            conn.close()

            return jsonify({
                "success": False,
                "message": "Category not found"
            }), 404

        conn.commit()

        cur.close()
        conn.close()

        return jsonify({
            "success": True,
            "message": "Category deleted successfully"
        })

    except Exception as e:

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# =========================================================
# SELLERS
# =========================================================

@app.route("/api/sellers", methods=["GET"])
def get_sellers():

    try:
        conn = get_db_connection()
        cur = conn.cursor(dictionary=True)

        cur.execute("""
            SELECT
                s.Seller_ID,
                s.Seller_Name,
                s.Seller_Email,
                s.Seller_Phone,
                s.Seller_Address,
                COUNT(DISTINCT p.Product_ID) AS Product_Count

            FROM SELLER s

            LEFT JOIN PRODUCT p
                ON s.Seller_ID = p.Seller_ID

            GROUP BY
                s.Seller_ID,
                s.Seller_Name,
                s.Seller_Email,
                s.Seller_Phone,
                s.Seller_Address

            ORDER BY s.Seller_ID DESC
        """)

        data = cur.fetchall()

        cur.close()
        conn.close()

        return jsonify(data)

    except Exception as e:

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route("/api/sellers", methods=["POST"])
def add_seller():

    try:
        data = request.get_json()

        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("""
            INSERT INTO SELLER
            (
                Seller_Name,
                Seller_Email,
                Seller_Phone,
                Seller_Address
            )

            VALUES (%s, %s, %s, %s)
        """, (
            data.get("Seller_Name"),
            data.get("Seller_Email"),
            data.get("Seller_Phone"),
            data.get("Seller_Address")
        ))

        conn.commit()

        seller_id = cur.lastrowid

        cur.close()
        conn.close()

        return jsonify({
            "success": True,
            "message": "Seller added successfully",
            "Seller_ID": seller_id
        }), 201

    except Exception as e:

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route("/api/sellers/<int:seller_id>", methods=["DELETE"])
def delete_seller(seller_id):

    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute(
            """
            DELETE FROM SELLER
            WHERE Seller_ID = %s
            """,
            (seller_id,)
        )

        if cur.rowcount == 0:

            cur.close()
            conn.close()

            return jsonify({
                "success": False,
                "message": "Seller not found"
            }), 404

        conn.commit()

        cur.close()
        conn.close()

        return jsonify({
            "success": True,
            "message": "Seller deleted successfully"
        })

    except Exception as e:

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# =========================================================
# CUSTOMERS
# =========================================================

@app.route("/api/customers", methods=["GET"])
def get_customers():

    try:
        conn = get_db_connection()
        cur = conn.cursor(dictionary=True)

        cur.execute("""
            SELECT
                c.Customer_ID,
                c.Customer_Name,
                c.Customer_Email,
                c.Customer_Address,

                GROUP_CONCAT(
                    DISTINCT cp.Customer_Phone
                    SEPARATOR ', '
                ) AS Customer_Phone,

                COUNT(
                    DISTINCT o.Order_ID
                ) AS Order_Count

            FROM CUSTOMER c

            LEFT JOIN CUSTOMER_PHONE cp
                ON c.Customer_ID = cp.Customer_ID

            LEFT JOIN ORDERS o
                ON c.Customer_ID = o.Customer_ID

            GROUP BY
                c.Customer_ID,
                c.Customer_Name,
                c.Customer_Email,
                c.Customer_Address

            ORDER BY c.Customer_ID DESC
        """)

        data = cur.fetchall()

        cur.close()
        conn.close()

        return jsonify(data)

    except Exception as e:

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route("/api/customers", methods=["POST"])
def add_customer():

    conn = None
    cur = None

    try:
        data = request.get_json()

        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("""
            INSERT INTO CUSTOMER
            (
                Customer_Name,
                Customer_Email,
                Customer_Address
            )

            VALUES (%s, %s, %s)
        """, (
            data.get("Customer_Name"),
            data.get("Customer_Email"),
            data.get("Customer_Address")
        ))

        customer_id = cur.lastrowid

        if data.get("Customer_Phone"):

            cur.execute("""
                INSERT INTO CUSTOMER_PHONE
                (
                    Customer_ID,
                    Customer_Phone
                )

                VALUES (%s, %s)
            """, (
                customer_id,
                data.get("Customer_Phone")
            ))

        conn.commit()

        cur.close()
        conn.close()

        return jsonify({
            "success": True,
            "message": "Customer added successfully",
            "Customer_ID": customer_id
        }), 201

    except Exception as e:

        if conn:
            conn.rollback()

        if cur:
            cur.close()

        if conn:
            conn.close()

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route("/api/customers/<int:customer_id>", methods=["DELETE"])
def delete_customer(customer_id):

    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute(
            """
            DELETE FROM CUSTOMER_PHONE
            WHERE Customer_ID = %s
            """,
            (customer_id,)
        )

        cur.execute(
            """
            DELETE FROM CUSTOMER
            WHERE Customer_ID = %s
            """,
            (customer_id,)
        )

        if cur.rowcount == 0:

            conn.rollback()

            cur.close()
            conn.close()

            return jsonify({
                "success": False,
                "message": "Customer not found"
            }), 404

        conn.commit()

        cur.close()
        conn.close()

        return jsonify({
            "success": True,
            "message": "Customer deleted successfully"
        })

    except Exception as e:

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# =========================================================
# OFFERS
# =========================================================

@app.route("/api/offers", methods=["GET"])
def get_offers():

    try:
        conn = get_db_connection()
        cur = conn.cursor(dictionary=True)

        cur.execute("""
            SELECT
                o.Offer_ID,
                o.Offer_Name,
                o.Offer_Discount,
                o.Offer_StartDate,
                o.Offer_EndDate,

                COUNT(
                    op.Product_ID
                ) AS Product_Count,

                GROUP_CONCAT(
                    DISTINCT p.Product_Name
                    ORDER BY p.Product_Name
                    SEPARATOR ', '
                ) AS Product_Names,

                GROUP_CONCAT(
                    DISTINCT op.Product_ID
                    ORDER BY op.Product_ID
                    SEPARATOR ','
                ) AS Product_IDs

            FROM OFFER o

            LEFT JOIN OFFER_PRODUCT op
                ON o.Offer_ID = op.Offer_ID

            LEFT JOIN PRODUCT p
                ON op.Product_ID = p.Product_ID

            GROUP BY
                o.Offer_ID,
                o.Offer_Name,
                o.Offer_Discount,
                o.Offer_StartDate,
                o.Offer_EndDate

            ORDER BY o.Offer_ID DESC
        """)

        data = cur.fetchall()

        cur.close()
        conn.close()

        return jsonify(data)

    except Exception as e:

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route("/api/offers", methods=["POST"])
def add_offer():
    conn = None
    cur = None
    try:
        data = request.get_json(silent=True) or {}
        raw_product_ids = data.get("Product_IDs")
        if not isinstance(raw_product_ids, list) or not raw_product_ids:
            return jsonify({
                "success": False,
                "message": "Select at least one product for this offer"
            }), 400

        try:
            product_ids = sorted({int(product_id) for product_id in raw_product_ids})
        except (TypeError, ValueError):
            return jsonify({
                "success": False,
                "message": "Offer products must have valid product IDs"
            }), 400

        if any(product_id < 1 for product_id in product_ids):
            return jsonify({
                "success": False,
                "message": "Offer products must have valid product IDs"
            }), 400

        try:
            discount = float(data.get("Offer_Discount"))
        except (TypeError, ValueError):
            return jsonify({"success": False, "message": "Enter a valid discount"}), 400
        if discount <= 0 or discount > 100:
            return jsonify({
                "success": False,
                "message": "Discount must be greater than 0 and no more than 100%"
            }), 400

        conn = get_db_connection()
        cur = conn.cursor()

        placeholders = ", ".join(["%s"] * len(product_ids))
        cur.execute(
            f"SELECT Product_ID FROM PRODUCT WHERE Product_ID IN ({placeholders})",
            tuple(product_ids)
        )
        found_product_ids = {int(row[0]) for row in cur.fetchall()}
        if found_product_ids != set(product_ids):
            conn.rollback()
            return jsonify({
                "success": False,
                "message": "One or more selected products no longer exist"
            }), 400

        cur.execute("""
            INSERT INTO OFFER
            (
                Offer_Name,
                Offer_Discount,
                Offer_StartDate,
                Offer_EndDate
            )

            VALUES (%s, %s, %s, %s)
        """, (
            data.get("Offer_Name"),
            discount,
            data.get("Offer_StartDate"),
            data.get("Offer_EndDate")
        ))

        offer_id = cur.lastrowid
        cur.executemany("""
            INSERT INTO OFFER_PRODUCT (Offer_ID, Product_ID)
            VALUES (%s, %s)
        """, [(offer_id, product_id) for product_id in product_ids])

        conn.commit()

        return jsonify({
            "success": True,
            "message": "Offer added successfully",
            "Offer_ID": offer_id,
            "Product_Count": len(product_ids)
        }), 201

    except Exception as e:
        if conn:
            conn.rollback()

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


@app.route("/api/offers/<int:offer_id>/products", methods=["PUT"])
def update_offer_products(offer_id):
    data = request.get_json(silent=True) or {}
    raw_product_ids = data.get("Product_IDs")
    if not isinstance(raw_product_ids, list) or not raw_product_ids:
        return jsonify({
            "success": False,
            "message": "Select at least one product for this offer"
        }), 400

    try:
        product_ids = sorted({int(product_id) for product_id in raw_product_ids})
    except (TypeError, ValueError):
        return jsonify({
            "success": False,
            "message": "Offer products must have valid product IDs"
        }), 400
    if any(product_id < 1 for product_id in product_ids):
        return jsonify({
            "success": False,
            "message": "Offer products must have valid product IDs"
        }), 400

    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT Offer_ID FROM OFFER WHERE Offer_ID = %s", (offer_id,))
        if not cur.fetchone():
            return jsonify({"success": False, "message": "Offer not found"}), 404

        placeholders = ", ".join(["%s"] * len(product_ids))
        cur.execute(
            f"SELECT Product_ID FROM PRODUCT WHERE Product_ID IN ({placeholders})",
            tuple(product_ids)
        )
        found_product_ids = {int(row[0]) for row in cur.fetchall()}
        if found_product_ids != set(product_ids):
            return jsonify({
                "success": False,
                "message": "One or more selected products no longer exist"
            }), 400

        cur.execute("DELETE FROM OFFER_PRODUCT WHERE Offer_ID = %s", (offer_id,))
        cur.executemany("""
            INSERT INTO OFFER_PRODUCT (Offer_ID, Product_ID)
            VALUES (%s, %s)
        """, [(offer_id, product_id) for product_id in product_ids])
        conn.commit()
        return jsonify({
            "success": True,
            "message": "Offer products updated successfully",
            "Product_Count": len(product_ids)
        })
    except Exception as error:
        if conn:
            conn.rollback()
        return jsonify({"success": False, "error": str(error)}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


@app.route("/api/offers/<int:offer_id>", methods=["DELETE"])
def delete_offer(offer_id):

    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute(
            """
            DELETE FROM OFFER_PRODUCT
            WHERE Offer_ID = %s
            """,
            (offer_id,)
        )

        cur.execute(
            """
            DELETE FROM OFFER
            WHERE Offer_ID = %s
            """,
            (offer_id,)
        )

        if cur.rowcount == 0:

            conn.rollback()

            cur.close()
            conn.close()

            return jsonify({
                "success": False,
                "message": "Offer not found"
            }), 404

        conn.commit()

        cur.close()
        conn.close()

        return jsonify({
            "success": True,
            "message": "Offer deleted successfully"
        })

    except Exception as e:

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# =========================================================
# ORDERS
# =========================================================

@app.route("/api/orders", methods=["GET"])
def get_orders():

    try:
        conn = get_db_connection()
        cur = conn.cursor(dictionary=True)

        cur.execute("""
            SELECT
                o.Order_ID,
                o.Customer_ID,
                c.Customer_Name,
                o.Order_Date,
                o.Order_Status,

                COALESCE(
                    SUM(
                        oi.OrderItem_Quantity *
                        oi.OrderItem_Price
                    ),
                    0
                ) AS Order_Amount

            FROM ORDERS o

            LEFT JOIN CUSTOMER c
                ON o.Customer_ID = c.Customer_ID

            LEFT JOIN ORDER_ITEM oi
                ON o.Order_ID = oi.Order_ID

            GROUP BY
                o.Order_ID,
                o.Customer_ID,
                c.Customer_Name,
                o.Order_Date,
                o.Order_Status

            ORDER BY o.Order_ID DESC
        """)

        data = cur.fetchall()

        cur.close()
        conn.close()

        return jsonify(data)

    except Exception as e:

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route("/api/orders", methods=["POST"])
def add_order():

    try:
        data = request.get_json()

        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("""
            INSERT INTO ORDERS
            (
                Customer_ID,
                Order_Date,
                Order_Status
            )

            VALUES (%s, %s, %s)
        """, (
            data.get("Customer_ID"),
            data.get("Order_Date"),
            data.get("Order_Status") or "Pending"
        ))

        conn.commit()

        order_id = cur.lastrowid

        cur.close()
        conn.close()

        return jsonify({
            "success": True,
            "message": "Order added successfully",
            "Order_ID": order_id
        }), 201

    except Exception as e:

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route("/api/orders/<int:order_id>", methods=["DELETE"])
def delete_order(order_id):

    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute(
            """
            DELETE FROM ORDERS
            WHERE Order_ID = %s
            """,
            (order_id,)
        )

        if cur.rowcount == 0:

            conn.rollback()

            cur.close()
            conn.close()

            return jsonify({
                "success": False,
                "message": "Order not found"
            }), 404

        conn.commit()

        cur.close()
        conn.close()

        return jsonify({
            "success": True,
            "message": "Order deleted successfully"
        })

    except Exception as e:

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# =========================================================
# ORDER ITEMS
# =========================================================

@app.route("/api/order-items", methods=["GET"])
def get_order_items():

    try:
        conn = get_db_connection()
        cur = conn.cursor(dictionary=True)

        cur.execute("""
            SELECT
                oi.OrderItem_ID,
                oi.Order_ID,
                oi.Product_ID,
                o.Customer_ID,
                c.Customer_Name,
                p.Product_Name,
                oi.OrderItem_Quantity,
                oi.OrderItem_Price,

                (
                    oi.OrderItem_Quantity *
                    oi.OrderItem_Price
                ) AS OrderItem_Total

            FROM ORDER_ITEM oi

            LEFT JOIN ORDERS o
                ON oi.Order_ID = o.Order_ID

            LEFT JOIN CUSTOMER c
                ON o.Customer_ID = c.Customer_ID

            LEFT JOIN PRODUCT p
                ON oi.Product_ID = p.Product_ID

            ORDER BY oi.OrderItem_ID DESC
        """)

        data = cur.fetchall()

        cur.close()
        conn.close()

        return jsonify(data)

    except Exception as e:

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route("/api/order-items", methods=["POST"])
def add_order_item():

    conn = None
    cur = None

    try:
        data = request.get_json()

        order_id = data.get("Order_ID")
        product_id = data.get("Product_ID")
        quantity = data.get("OrderItem_Quantity")

        if not order_id or not product_id or not quantity:

            return jsonify({
                "success": False,
                "message": "Order ID, Product ID and quantity are required"
            }), 400

        conn = get_db_connection()
        cur = conn.cursor(dictionary=True)

        cur.execute(
            """
            SELECT Order_ID
            FROM ORDERS
            WHERE Order_ID = %s
            """,
            (order_id,)
        )

        if not cur.fetchone():

            return jsonify({
                "success": False,
                "message": "Order not found"
            }), 404

        cur.execute("""
            SELECT
                Product_ID,
                Product_Price,
                Product_Stock

            FROM PRODUCT

            WHERE Product_ID = %s
        """, (product_id,))

        product = cur.fetchone()

        if not product:

            return jsonify({
                "success": False,
                "message": "Product not found"
            }), 404

        if int(quantity) > int(product["Product_Stock"]):

            return jsonify({
                "success": False,
                "message": "Not enough product stock"
            }), 400

        cur.execute("""
            INSERT INTO ORDER_ITEM
            (
                Order_ID,
                Product_ID,
                OrderItem_Quantity,
                OrderItem_Price
            )

            VALUES (%s, %s, %s, %s)
        """, (
            order_id,
            product_id,
            quantity,
            product["Product_Price"]
        ))

        cur.execute("""
            UPDATE PRODUCT

            SET Product_Stock =
                Product_Stock - %s

            WHERE Product_ID = %s
        """, (
            quantity,
            product_id
        ))

        conn.commit()

        order_item_id = cur.lastrowid

        cur.close()
        conn.close()

        return jsonify({
            "success": True,
            "message": "Order item added successfully",
            "OrderItem_ID": order_item_id
        }), 201

    except Exception as e:

        if conn:
            conn.rollback()

        if cur:
            cur.close()

        if conn:
            conn.close()

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route(
    "/api/order-items/<int:order_item_id>",
    methods=["DELETE"]
)
def delete_order_item(order_item_id):

    try:
        conn = get_db_connection()
        cur = conn.cursor(dictionary=True)

        cur.execute("""
            SELECT
                Product_ID,
                OrderItem_Quantity

            FROM ORDER_ITEM

            WHERE OrderItem_ID = %s
        """, (order_item_id,))

        item = cur.fetchone()

        if not item:

            return jsonify({
                "success": False,
                "message": "Order item not found"
            }), 404

        cur.execute("""
            UPDATE PRODUCT

            SET Product_Stock =
                Product_Stock + %s

            WHERE Product_ID = %s
        """, (
            item["OrderItem_Quantity"],
            item["Product_ID"]
        ))

        cur.execute("""
            DELETE FROM ORDER_ITEM

            WHERE OrderItem_ID = %s
        """, (order_item_id,))

        conn.commit()

        cur.close()
        conn.close()

        return jsonify({
            "success": True,
            "message": "Order item deleted successfully"
        })

    except Exception as e:

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# =========================================================
# PAYMENTS
# =========================================================

@app.route("/api/payments", methods=["GET"])
def get_payments():

    try:
        conn = get_db_connection()
        cur = conn.cursor(dictionary=True)

        cur.execute("""
            SELECT
                p.Payment_ID,
                p.Order_ID,
                o.Customer_ID,
                c.Customer_Name,
                p.Payment_Date,
                p.Payment_Method,
                p.Payment_Status,
                p.Payment_Amount

            FROM PAYMENT p

            LEFT JOIN ORDERS o
                ON p.Order_ID = o.Order_ID

            LEFT JOIN CUSTOMER c
                ON o.Customer_ID = c.Customer_ID

            ORDER BY p.Payment_ID DESC
        """)

        data = cur.fetchall()

        cur.close()
        conn.close()

        return jsonify(data)

    except Exception as e:

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route("/api/payments", methods=["POST"])
def add_payment():

    try:
        data = request.get_json()

        order_id = data.get("Order_ID")
        payment_date = data.get("Payment_Date")
        payment_method = data.get("Payment_Method")
        payment_status = (
            data.get("Payment_Status")
            or "Pending"
        )
        payment_amount = data.get("Payment_Amount")

        conn = get_db_connection()
        cur = conn.cursor(dictionary=True)

        cur.execute(
            """
            SELECT Order_ID
            FROM ORDERS
            WHERE Order_ID = %s
            """,
            (order_id,)
        )

        if not cur.fetchone():

            return jsonify({
                "success": False,
                "message": "Order not found"
            }), 404

        cur.execute(
            """
            SELECT Payment_ID
            FROM PAYMENT
            WHERE Order_ID = %s
            """,
            (order_id,)
        )

        if cur.fetchone():

            return jsonify({
                "success": False,
                "message": "Payment already exists for this order"
            }), 400

        if payment_amount is None or payment_amount == "":

            cur.execute("""
                SELECT COALESCE(
                    SUM(
                        OrderItem_Quantity *
                        OrderItem_Price
                    ),
                    0
                ) AS Total

                FROM ORDER_ITEM

                WHERE Order_ID = %s
            """, (order_id,))

            payment_amount = cur.fetchone()["Total"]

        cur.execute("""
            INSERT INTO PAYMENT
            (
                Order_ID,
                Payment_Date,
                Payment_Method,
                Payment_Status,
                Payment_Amount
            )

            VALUES (%s, %s, %s, %s, %s)
        """, (
            order_id,
            payment_date,
            payment_method,
            payment_status,
            payment_amount
        ))

        conn.commit()

        payment_id = cur.lastrowid

        cur.close()
        conn.close()

        return jsonify({
            "success": True,
            "message": "Payment added successfully",
            "Payment_ID": payment_id
        }), 201

    except Exception as e:

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route(
    "/api/payments/<int:payment_id>",
    methods=["DELETE"]
)
def delete_payment(payment_id):

    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute(
            """
            DELETE FROM PAYMENT
            WHERE Payment_ID = %s
            """,
            (payment_id,)
        )

        if cur.rowcount == 0:

            cur.close()
            conn.close()

            return jsonify({
                "success": False,
                "message": "Payment not found"
            }), 404

        conn.commit()

        cur.close()
        conn.close()

        return jsonify({
            "success": True,
            "message": "Payment deleted successfully"
        })

    except Exception as e:

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# =========================================================
# DELIVERY
# =========================================================

@app.route("/api/delivery", methods=["GET"])
def get_delivery():

    try:
        conn = get_db_connection()
        cur = conn.cursor(dictionary=True)

        cur.execute("""
            SELECT
                d.Delivery_ID,
                d.Order_ID,
                o.Customer_ID,
                c.Customer_Name,
                d.Delivery_Date,
                d.Delivery_Status,
                d.Delivery_Address

            FROM DELIVERY d

            LEFT JOIN ORDERS o
                ON d.Order_ID = o.Order_ID

            LEFT JOIN CUSTOMER c
                ON o.Customer_ID = c.Customer_ID

            ORDER BY d.Delivery_ID DESC
        """)

        data = cur.fetchall()

        cur.close()
        conn.close()

        return jsonify(data)

    except Exception as e:

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route("/api/delivery", methods=["POST"])
def add_delivery():

    try:
        data = request.get_json()

        order_id = data.get("Order_ID")
        delivery_date = data.get("Delivery_Date")
        delivery_status = (
            data.get("Delivery_Status")
            or "Pending"
        )
        delivery_address = data.get(
            "Delivery_Address"
        )

        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute(
            """
            SELECT Order_ID
            FROM ORDERS
            WHERE Order_ID = %s
            """,
            (order_id,)
        )

        if not cur.fetchone():

            return jsonify({
                "success": False,
                "message": "Order not found"
            }), 404

        cur.execute("""
            SELECT Delivery_ID

            FROM DELIVERY

            WHERE Order_ID = %s
        """, (order_id,))

        if cur.fetchone():

            return jsonify({
                "success": False,
                "message": "Delivery already exists for this order"
            }), 400

        cur.execute("""
            INSERT INTO DELIVERY
            (
                Order_ID,
                Delivery_Date,
                Delivery_Status,
                Delivery_Address
            )

            VALUES (%s, %s, %s, %s)
        """, (
            order_id,
            delivery_date,
            delivery_status,
            delivery_address
        ))

        conn.commit()

        delivery_id = cur.lastrowid

        cur.close()
        conn.close()

        return jsonify({
            "success": True,
            "message": "Delivery added successfully",
            "Delivery_ID": delivery_id
        }), 201

    except Exception as e:

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route(
    "/api/delivery/<int:delivery_id>",
    methods=["DELETE"]
)
def delete_delivery(delivery_id):

    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute(
            """
            DELETE FROM DELIVERY
            WHERE Delivery_ID = %s
            """,
            (delivery_id,)
        )

        if cur.rowcount == 0:

            cur.close()
            conn.close()

            return jsonify({
                "success": False,
                "message": "Delivery not found"
            }), 404

        conn.commit()

        cur.close()
        conn.close()

        return jsonify({
            "success": True,
            "message": "Delivery deleted successfully"
        })

    except Exception as e:

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# =========================================================
# REVIEWS
# =========================================================

@app.route("/api/reviews", methods=["GET"])
def get_reviews():

    try:
        conn = get_db_connection()
        cur = conn.cursor(dictionary=True)

        cur.execute("""
            SELECT
                r.Review_ID,
                r.Customer_ID,
                c.Customer_Name,
                r.Product_ID,
                p.Product_Name,
                r.Review_Rating,
                r.Review_Comment,
                r.Review_Date

            FROM REVIEW r

            LEFT JOIN CUSTOMER c
                ON r.Customer_ID = c.Customer_ID

            LEFT JOIN PRODUCT p
                ON r.Product_ID = p.Product_ID

            ORDER BY r.Review_ID DESC
        """)

        data = cur.fetchall()

        cur.close()
        conn.close()

        return jsonify(data)

    except Exception as e:

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route("/api/reviews", methods=["POST"])
def add_review():

    try:
        data = request.get_json()

        customer_id = data.get("Customer_ID")
        product_id = data.get("Product_ID")
        rating = data.get("Review_Rating")
        comment = data.get("Review_Comment")
        review_date = data.get("Review_Date")

        if not customer_id or not product_id:

            return jsonify({
                "success": False,
                "message": "Customer ID and Product ID are required"
            }), 400

        if rating is None:

            return jsonify({
                "success": False,
                "message": "Review rating is required"
            }), 400

        if int(rating) < 1 or int(rating) > 5:

            return jsonify({
                "success": False,
                "message": "Rating must be between 1 and 5"
            }), 400

        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute(
            """
            SELECT Customer_ID
            FROM CUSTOMER
            WHERE Customer_ID = %s
            """,
            (customer_id,)
        )

        if not cur.fetchone():

            return jsonify({
                "success": False,
                "message": "Customer not found"
            }), 404

        cur.execute(
            """
            SELECT Product_ID
            FROM PRODUCT
            WHERE Product_ID = %s
            """,
            (product_id,)
        )

        if not cur.fetchone():

            return jsonify({
                "success": False,
                "message": "Product not found"
            }), 404

        cur.execute("""
            INSERT INTO REVIEW
            (
                Customer_ID,
                Product_ID,
                Review_Rating,
                Review_Comment,
                Review_Date
            )

            VALUES (%s, %s, %s, %s, %s)
        """, (
            customer_id,
            product_id,
            rating,
            comment,
            review_date
        ))

        conn.commit()

        review_id = cur.lastrowid

        cur.close()
        conn.close()

        return jsonify({
            "success": True,
            "message": "Review added successfully",
            "Review_ID": review_id
        }), 201

    except Exception as e:

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route(
    "/api/reviews/<int:review_id>",
    methods=["DELETE"]
)
def delete_review(review_id):

    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute(
            """
            DELETE FROM REVIEW
            WHERE Review_ID = %s
            """,
            (review_id,)
        )

        if cur.rowcount == 0:

            cur.close()
            conn.close()

            return jsonify({
                "success": False,
                "message": "Review not found"
            }), 404

        conn.commit()

        cur.close()
        conn.close()

        return jsonify({
            "success": True,
            "message": "Review deleted successfully"
        })

    except Exception as e:

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# =========================================================
# CUSTOMER AND SELLER PORTALS
# =========================================================

@app.route("/api/customer/orders", methods=["GET"])
@require_marketplace_role("customer")
def get_customer_account_orders():
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(dictionary=True)
        cur.execute("""
            SELECT
                o.Order_ID,
                o.Order_Date,
                o.Order_Status,
                COALESCE(SUM(oi.OrderItem_Quantity * oi.OrderItem_Price), 0) AS Order_Amount,
                GROUP_CONCAT(DISTINCT p.Product_Name ORDER BY p.Product_Name SEPARATOR ', ') AS Products
            FROM ORDERS o
            LEFT JOIN ORDER_ITEM oi ON o.Order_ID = oi.Order_ID
            LEFT JOIN PRODUCT p ON oi.Product_ID = p.Product_ID
            WHERE o.Customer_ID = %s
            GROUP BY o.Order_ID, o.Order_Date, o.Order_Status
            ORDER BY o.Order_ID DESC
        """, (g.marketplace_user["id"],))
        return jsonify(cur.fetchall())
    except Exception:
        app.logger.exception("Could not load customer order history")
        return jsonify({"success": False, "message": "Unable to load your orders"}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


@app.route("/api/seller/products", methods=["GET"])
@require_marketplace_role("seller")
def get_seller_account_products():
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(dictionary=True)
        cur.execute("""
            SELECT
                p.Product_ID,
                p.Product_Name,
                p.Product_Description,
                p.Product_Image_URL,
                p.Product_Price,
                p.Product_Stock,
                p.Category_ID,
                c.Category_Name
            FROM PRODUCT p
            LEFT JOIN CATEGORY c ON p.Category_ID = c.Category_ID
            WHERE p.Seller_ID = %s
            ORDER BY p.Product_ID DESC
        """, (g.marketplace_user["id"],))
        return jsonify(cur.fetchall())
    except Exception:
        app.logger.exception("Could not load seller products")
        return jsonify({"success": False, "message": "Unable to load your products"}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


@app.route("/api/seller/products", methods=["POST"])
@require_marketplace_role("seller")
def add_seller_account_product():
    uploaded_image_path = None
    conn = None
    cur = None
    try:
        data = request.form if request.mimetype == "multipart/form-data" else (request.get_json(silent=True) or {})
        product_name = str(data.get("Product_Name", "")).strip()
        if not product_name:
            return jsonify({"success": False, "message": "Product name is required"}), 400

        try:
            price = Decimal(str(data.get("Product_Price", "")))
            stock = int(data.get("Product_Stock", ""))
            category_id = int(data.get("Category_ID", ""))
        except (ValueError, TypeError, ArithmeticError):
            return jsonify({"success": False, "message": "Enter a valid price, stock quantity, and category"}), 400
        if not price.is_finite() or price <= 0 or stock < 0 or category_id < 1:
            return jsonify({"success": False, "message": "Price must be positive, stock cannot be negative, and category is required"}), 400

        uploaded_image = request.files.get("Product_Image")
        if uploaded_image and uploaded_image.filename:
            image_url, uploaded_image_path = save_uploaded_product_image(uploaded_image)
        else:
            image_url = validate_product_image_url(data.get("Product_Image_URL"))
        if not image_url:
            image_url = find_google_product_image(product_name)

        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO PRODUCT
                (Product_Name, Product_Description, Product_Image_URL,
                 Product_Price, Product_Stock, Category_ID, Seller_ID)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (
            product_name,
            str(data.get("Product_Description", "")).strip() or None,
            image_url,
            price,
            stock,
            category_id,
            g.marketplace_user["id"],
        ))
        conn.commit()
        return jsonify({
            "success": True,
            "Product_ID": cur.lastrowid,
            "Product_Image_URL": image_url,
        }), 201
    except ValueError as error:
        if uploaded_image_path and uploaded_image_path.exists():
            uploaded_image_path.unlink()
        if conn:
            conn.rollback()
        return jsonify({"success": False, "message": str(error)}), 400
    except Exception:
        if uploaded_image_path and uploaded_image_path.exists():
            uploaded_image_path.unlink()
        if conn:
            conn.rollback()
        app.logger.exception("Could not add seller product")
        return jsonify({"success": False, "message": "Unable to add product"}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


@app.route("/api/seller/products/<int:product_id>", methods=["DELETE"])
@require_marketplace_role("seller")
def delete_seller_account_product(product_id):
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            "DELETE FROM PRODUCT WHERE Product_ID = %s AND Seller_ID = %s",
            (product_id, g.marketplace_user["id"]),
        )
        if not cur.rowcount:
            return jsonify({"success": False, "message": "Product not found"}), 404
        conn.commit()
        return jsonify({"success": True, "message": "Product deleted"})
    except Exception:
        if conn:
            conn.rollback()
        app.logger.exception("Could not delete seller product")
        return jsonify({"success": False, "message": "Unable to delete product"}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


@app.route("/api/seller/orders", methods=["GET"])
@require_marketplace_role("seller")
def get_seller_account_orders():
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(dictionary=True)
        cur.execute("""
            SELECT
                o.Order_ID,
                o.Order_Date,
                o.Order_Status,
                c.Customer_Name,
                SUM(oi.OrderItem_Quantity * oi.OrderItem_Price) AS Order_Amount,
                GROUP_CONCAT(DISTINCT p.Product_Name ORDER BY p.Product_Name SEPARATOR ', ') AS Products
            FROM ORDERS o
            INNER JOIN ORDER_ITEM oi ON o.Order_ID = oi.Order_ID
            INNER JOIN PRODUCT p ON oi.Product_ID = p.Product_ID
            LEFT JOIN CUSTOMER c ON o.Customer_ID = c.Customer_ID
            WHERE p.Seller_ID = %s
            GROUP BY o.Order_ID, o.Order_Date, o.Order_Status, c.Customer_Name
            ORDER BY o.Order_ID DESC
        """, (g.marketplace_user["id"],))
        return jsonify(cur.fetchall())
    except Exception:
        app.logger.exception("Could not load seller orders")
        return jsonify({"success": False, "message": "Unable to load your orders"}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


# =========================================================
# RUN SERVER
# =========================================================

@app.route("/api/store/checkout", methods=["POST"])
def store_checkout():
    authenticated_customer = None
    authorization = request.headers.get("Authorization", "")
    if authorization:
        scheme, _, token = authorization.partition(" ")
        if scheme.lower() != "bearer" or not token:
            return jsonify({"success": False, "message": "Invalid customer session"}), 401
        try:
            authenticated_customer = marketplace_token_serializer().loads(token, max_age=60 * 60 * 12)
        except BadSignature:
            return jsonify({"success": False, "message": "Your session has expired. Please sign in again."}), 401
        if authenticated_customer.get("role") != "customer":
            return jsonify({"success": False, "message": "Only customer accounts can place orders"}), 403

    data = request.get_json(silent=True) or {}
    customer_name = str(data.get("Customer_Name", "")).strip()
    customer_email = str(data.get("Customer_Email", "")).strip()
    customer_phone = str(data.get("Customer_Phone", "")).strip()
    customer_address = str(data.get("Customer_Address", "")).strip()
    payment_method = str(data.get("Payment_Method", "")).strip()
    items = data.get("items")
    allowed_methods = {
        "UPI", "Credit Card", "Debit Card", "Net Banking", "Cash on Delivery"
    }

    if not customer_name or not customer_email or not customer_address:
        return jsonify({
            "success": False,
            "message": "Name, email, and delivery address are required"
        }), 400

    if payment_method not in allowed_methods:
        return jsonify({
            "success": False,
            "message": "Choose a supported payment method"
        }), 400

    if not isinstance(items, list) or not items:
        return jsonify({"success": False, "message": "Your cart is empty"}), 400

    quantities = {}
    try:
        for item in items:
            product_id = int(item.get("Product_ID"))
            quantity = int(item.get("quantity"))
            if product_id < 1 or quantity < 1:
                raise ValueError
            quantities[product_id] = quantities.get(product_id, 0) + quantity
    except (AttributeError, TypeError, ValueError):
        return jsonify({
            "success": False,
            "message": "Cart items must have a valid product and quantity"
        }), 400

    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(dictionary=True)

        locked_products = []
        total = Decimal("0.00")
        for product_id, quantity in quantities.items():
            cur.execute("""
                SELECT
                    p.Product_ID,
                    p.Product_Name,
                    p.Product_Price,
                    p.Product_Stock,
                    COALESCE((
                        SELECT MAX(o.Offer_Discount)
                        FROM OFFER_PRODUCT op
                        INNER JOIN OFFER o ON o.Offer_ID = op.Offer_ID
                        WHERE op.Product_ID = p.Product_ID
                          AND (o.Offer_StartDate IS NULL OR o.Offer_StartDate <= CURRENT_DATE)
                          AND (o.Offer_EndDate IS NULL OR o.Offer_EndDate >= CURRENT_DATE)
                    ), 0) AS Offer_Discount
                FROM PRODUCT p
                WHERE p.Product_ID = %s
                FOR UPDATE
            """, (product_id,))
            product = cur.fetchone()
            if not product:
                raise ValueError("A product in your cart is no longer available")
            if quantity > int(product["Product_Stock"]):
                raise ValueError(
                    f"Only {product['Product_Stock']} units of {product['Product_Name']} are available"
                )
            discount = Decimal(str(product["Offer_Discount"] or 0))
            unit_price = (
                Decimal(str(product["Product_Price"]))
                * (Decimal("1") - discount / Decimal("100"))
            ).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            total += unit_price * quantity
            locked_products.append((product, quantity, unit_price))

        if authenticated_customer:
            cur.execute("""
                SELECT c.Customer_ID, c.Customer_Name, c.Customer_Email
                FROM MARKETPLACE_ACCOUNT a
                INNER JOIN CUSTOMER c ON a.User_ID = c.Customer_ID
                WHERE a.Account_Role = 'customer'
                  AND a.User_ID = %s
                FOR UPDATE
            """, (authenticated_customer["id"],))
            customer = cur.fetchone()
            if not customer:
                raise ValueError("Your customer account is no longer available")
            customer_id = customer["Customer_ID"]
            customer_name = customer["Customer_Name"]
            customer_email = customer["Customer_Email"]
            cur.execute("""
                UPDATE CUSTOMER
                SET Customer_Address = %s
                WHERE Customer_ID = %s
            """, (customer_address, customer_id))
        else:
            cur.execute("""
                SELECT Customer_ID
                FROM CUSTOMER
                WHERE Customer_Email = %s
                LIMIT 1
                FOR UPDATE
            """, (customer_email,))
            customer = cur.fetchone()
            if customer:
                customer_id = customer["Customer_ID"]
                cur.execute("""
                    UPDATE CUSTOMER
                    SET Customer_Name = %s, Customer_Address = %s
                    WHERE Customer_ID = %s
                """, (customer_name, customer_address, customer_id))
            else:
                cur.execute("""
                    INSERT INTO CUSTOMER (Customer_Name, Customer_Email, Customer_Address)
                    VALUES (%s, %s, %s)
                """, (customer_name, customer_email, customer_address))
                customer_id = cur.lastrowid

        if customer_phone:
            cur.execute("""
                SELECT Customer_ID
                FROM CUSTOMER_PHONE
                WHERE Customer_ID = %s AND Customer_Phone = %s
            """, (customer_id, customer_phone))
            if not cur.fetchone():
                cur.execute("""
                    INSERT INTO CUSTOMER_PHONE (Customer_ID, Customer_Phone)
                    VALUES (%s, %s)
                """, (customer_id, customer_phone))

        cur.execute("""
            INSERT INTO ORDERS (Customer_ID, Order_Date, Order_Status)
            VALUES (%s, CURRENT_DATE, 'Pending')
        """, (customer_id,))
        order_id = cur.lastrowid

        for product, quantity, unit_price in locked_products:
            cur.execute("""
                INSERT INTO ORDER_ITEM
                    (Order_ID, Product_ID, OrderItem_Quantity, OrderItem_Price)
                VALUES (%s, %s, %s, %s)
            """, (order_id, product["Product_ID"], quantity, unit_price))
            cur.execute("""
                UPDATE PRODUCT
                SET Product_Stock = Product_Stock - %s
                WHERE Product_ID = %s
            """, (quantity, product["Product_ID"]))

        cur.execute("""
            INSERT INTO PAYMENT
                (Order_ID, Payment_Date, Payment_Method, Payment_Status, Payment_Amount)
            VALUES (%s, CURRENT_DATE, %s, 'Pending', %s)
        """, (order_id, payment_method, total))
        cur.execute("""
            INSERT INTO DELIVERY
                (Order_ID, Delivery_Date, Delivery_Status, Delivery_Address)
            VALUES (%s, CURRENT_DATE, 'Pending', %s)
        """, (order_id, customer_address))

        conn.commit()
        return jsonify({
            "success": True,
            "Order_ID": order_id,
            "total": format(total, ".2f"),
            "message": "Order placed successfully. Payment is pending confirmation."
        }), 201
    except ValueError as error:
        if conn:
            conn.rollback()
        return jsonify({"success": False, "message": str(error)}), 400
    except Exception as error:
        if conn:
            conn.rollback()
        return jsonify({"success": False, "message": str(error)}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


if __name__ == "__main__":

    app.run(
        host="0.0.0.0",
        debug=True,
        port=5000
    )