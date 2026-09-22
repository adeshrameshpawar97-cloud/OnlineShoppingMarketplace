from flask import Flask, jsonify, request
from flask_cors import CORS
from db import get_db_connection

app = Flask(__name__)
CORS(app)


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

    try:
        data = request.get_json()

        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("""
            INSERT INTO PRODUCT
            (
                Product_Name,
                Product_Description,
                Product_Price,
                Product_Stock,
                Category_ID,
                Seller_ID
            )

            VALUES (%s, %s, %s, %s, %s, %s)
        """, (
            data.get("Product_Name"),
            data.get("Product_Description"),
            data.get("Product_Price"),
            data.get("Product_Stock"),
            data.get("Category_ID"),
            data.get("Seller_ID")
        ))

        conn.commit()

        product_id = cur.lastrowid

        cur.close()
        conn.close()

        return jsonify({
            "success": True,
            "message": "Product added successfully",
            "Product_ID": product_id
        }), 201

    except Exception as e:

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


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
                ) AS Product_Count

            FROM OFFER o

            LEFT JOIN OFFER_PRODUCT op
                ON o.Offer_ID = op.Offer_ID

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

    try:
        data = request.get_json()

        conn = get_db_connection()
        cur = conn.cursor()

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
            data.get("Offer_Discount"),
            data.get("Offer_StartDate"),
            data.get("Offer_EndDate")
        ))

        conn.commit()

        offer_id = cur.lastrowid

        cur.close()
        conn.close()

        return jsonify({
            "success": True,
            "message": "Offer added successfully",
            "Offer_ID": offer_id
        }), 201

    except Exception as e:

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


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
# RUN SERVER
# =========================================================

if __name__ == "__main__":

    app.run(
        host="0.0.0.0",
        debug=True,
        port=5000
    )