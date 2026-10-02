import mysql.connector


def get_db_connection():
    connection = mysql.connector.connect(
        host="localhost",
        user="root",
        password="9022454699aA$",
        database="online_shopping_marketplace"
    )

    return connection


def ensure_product_image_column():
    connection = get_db_connection()
    cursor = connection.cursor()

    try:
        cursor.execute("SHOW COLUMNS FROM PRODUCT LIKE %s", ("Product_Image_URL",))
        if not cursor.fetchone():
            cursor.execute(
                "ALTER TABLE PRODUCT ADD COLUMN Product_Image_URL VARCHAR(2048) NULL"
            )
            connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        cursor.close()
        connection.close()