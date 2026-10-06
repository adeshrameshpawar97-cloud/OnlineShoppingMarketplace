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


def ensure_marketplace_account_table():
    connection = get_db_connection()
    cursor = connection.cursor()

    try:
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS MARKETPLACE_ACCOUNT (
                Account_ID INT NOT NULL AUTO_INCREMENT,
                Account_Role VARCHAR(16) NOT NULL,
                User_ID INT NOT NULL,
                Account_Email VARCHAR(254) NOT NULL,
                Password_Hash VARCHAR(255) NOT NULL,
                PRIMARY KEY (Account_ID),
                UNIQUE KEY uq_marketplace_account_role_email
                    (Account_Role, Account_Email),
                UNIQUE KEY uq_marketplace_account_role_user
                    (Account_Role, User_ID)
            )
        """)
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        cursor.close()
        connection.close()