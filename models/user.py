import sqlite3
from config import Config


def init_db():
    conn = sqlite3.connect(Config.DATABASE_PATH)
    c = conn.cursor()

    # Users table
    c.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            name TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # User preferences table
    c.execute('''
        CREATE TABLE IF NOT EXISTS user_preferences (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            position TEXT,
            favorite_team TEXT,
            picture TEXT,
            slogan TEXT,
            completed BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
            UNIQUE(user_id)
        )
    ''')

    # New ratings table
    c.execute('''
            CREATE TABLE IF NOT EXISTS user_ratings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                rated_user_id INTEGER NOT NULL,
                rater_user_id INTEGER NOT NULL,
                skill_1 INTEGER NOT NULL,
                skill_2 INTEGER NOT NULL,
                skill_3 INTEGER NOT NULL,
                skill_4 INTEGER NOT NULL,
                skill_5 INTEGER NOT NULL,
                skill_6 INTEGER NOT NULL,
                overall_score INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (rated_user_id) REFERENCES users (id) ON DELETE CASCADE,
                FOREIGN KEY (rater_user_id) REFERENCES users (id) ON DELETE CASCADE,
                UNIQUE(rated_user_id, rater_user_id)
            )
        ''')

    c.execute('''
                CREATE TABLE IF NOT EXISTS matchdayInfo (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    number INTEGER NOT NULL,
                    topPlayer TEXT NOT NULL,
                    lastPlayer TEXT NOT NULL,
                    secondToLast TEXT NOT NULL,
                    noSubs TEXT NOT NULL,
                    accumulated TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')

    conn.commit()
    conn.close()


def get_db_connection():
    conn = sqlite3.connect(Config.DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def get_user_by_email(email):
    conn = get_db_connection()
    user = conn.execute(
        'SELECT id, email, name, password FROM users WHERE email = ?',
        (email,)
    ).fetchone()
    conn.close()

    if user:
        return dict(user)
    return None


def get_user_preferences(user_id):
    conn = get_db_connection()
    preferences = conn.execute(
        'SELECT * FROM user_preferences WHERE user_id = ?',
        (user_id,)
    ).fetchone()
    conn.close()

    if preferences:
        return dict(preferences)
    return None


def create_user_preferences(user_id, preferences_data):
    conn = get_db_connection()
    c = conn.cursor()

    print(f"DEBUG: Saving preferences for user_id: {user_id}")  # Logging
    print(f"DEBUG: Preferences data: {preferences_data}")  # Logging

    try:
        # First, check if preferences already exist
        existing_prefs = c.execute(
            'SELECT id FROM user_preferences WHERE user_id = ?',
            (user_id,)
        ).fetchone()

        if existing_prefs:
            # Update existing preferences
            c.execute('''
                UPDATE user_preferences 
                SET position = ?, favorite_team = ?, picture = ?, slogan = ?, 
                    completed = ?, updated_at = CURRENT_TIMESTAMP
                WHERE user_id = ?
            ''', (
                preferences_data.get('position'),
                preferences_data.get('favorite_team'),
                preferences_data.get('picture'),
                preferences_data.get('slogan'),
                True,
                user_id
            ))
            print(f"DEBUG: Updated preferences for user_id: {user_id}")  # Logging
        else:
            # Insert new preferences
            c.execute('''
                INSERT INTO user_preferences 
                (user_id, position, favorite_team, picture, slogan, completed)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                user_id,
                preferences_data.get('position'),
                preferences_data.get('favorite_team'),
                preferences_data.get('picture'),
                preferences_data.get('slogan'),
                True
            ))
            print(f"DEBUG: Inserted new preferences for user_id: {user_id}")  # Logging

        conn.commit()
        print(f"DEBUG: Successfully committed preferences for user_id: {user_id}")  # Logging

        # Verify the save worked
        saved_prefs = get_user_preferences(user_id)
        print(f"DEBUG: Verified saved preferences: {saved_prefs}")  # Logging

    except Exception as e:
        print(f"ERROR: Failed to save preferences for user_id {user_id}: {str(e)}")  # Logging
        conn.rollback()
        raise e
    finally:
        conn.close()


def are_preferences_complete(user_id):
    preferences = get_user_preferences(user_id)
    print(f"DEBUG: Checking preferences completeness for user_id {user_id}: {preferences}")  # Logging

    if not preferences:
        print(f"DEBUG: No preferences found for user_id {user_id}")  # Logging
        return False

    # Check if required fields are filled
    completed = bool(preferences.get('position') and preferences.get('favorite_team'))
    print(f"DEBUG: Preferences complete: {completed}")  # Logging
    return completed