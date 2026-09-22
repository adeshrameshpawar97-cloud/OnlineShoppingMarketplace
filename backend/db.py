import mysql.connector


def get_db_connection():
    connection = mysql.connector.connect(
        host="localhost",
        user="root",
        password="9022454699aA$",
        database="online_shopping_marketplace"
    )

    return connection