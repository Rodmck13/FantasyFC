import os
from database import get_connection
import sqlalchemy as sa


def init_db():
    conn = get_connection()

    try:
        # Users table
        conn.execute(sa.text('''
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                name TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        '''))

        # User preferences table
        conn.execute(sa.text('''
            CREATE TABLE IF NOT EXISTS user_preferences (
                id SERIAL PRIMARY KEY,
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
        '''))

        # New ratings table
        conn.execute(sa.text('''
            CREATE TABLE IF NOT EXISTS user_ratings (
                id SERIAL PRIMARY KEY,
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
        '''))

        conn.execute(sa.text('''
            CREATE TABLE IF NOT EXISTS matchdayInfo (
                id SERIAL PRIMARY KEY,
                number INTEGER NOT NULL,
                topPlayer TEXT NOT NULL,
                lastPlayer TEXT NOT NULL,
                secondToLast TEXT NOT NULL,
                noSubs TEXT NOT NULL,
                accumulated TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        '''))

        conn.commit()
        print("DEBUG: Database tables created successfully")

    except Exception as e:
        print(f"ERROR creating tables: {str(e)}")
        raise e
    finally:
        conn.close()


def get_db_connection():
    return get_connection()


def get_user_by_email(email):
    conn = get_db_connection()
    try:
        result = conn.execute(
            sa.text('SELECT id, email, name, password FROM users WHERE email = :email'),
            {"email": email}
        )
        user = result.fetchone()

        if user:
            return dict(user._mapping)  # Convert to dict
        return None
    finally:
        conn.close()


def get_user_preferences(user_id):
    conn = get_db_connection()
    try:
        result = conn.execute(
            sa.text('SELECT * FROM user_preferences WHERE user_id = :user_id'),
            {"user_id": user_id}
        )
        preferences = result.fetchone()

        if preferences:
            return dict(preferences._mapping)  # Convert to dict
        return None
    finally:
        conn.close()


def create_user_preferences(user_id, preferences_data):
    conn = get_db_connection()

    print(f"DEBUG: Saving preferences for user_id: {user_id}")
    print(f"DEBUG: Preferences data: {preferences_data}")

    try:
        # First, check if preferences already exist
        existing_result = conn.execute(
            sa.text('SELECT id FROM user_preferences WHERE user_id = :user_id'),
            {"user_id": user_id}
        )
        existing_prefs = existing_result.fetchone()

        if existing_prefs:
            # Update existing preferences
            conn.execute(sa.text('''
                UPDATE user_preferences 
                SET position = :position, favorite_team = :favorite_team, 
                    picture = :picture, slogan = :slogan, 
                    completed = :completed, updated_at = CURRENT_TIMESTAMP
                WHERE user_id = :user_id
            '''), {
                "position": preferences_data.get('position'),
                "favorite_team": preferences_data.get('favorite_team'),
                "picture": preferences_data.get('picture'),
                "slogan": preferences_data.get('slogan'),
                "completed": True,
                "user_id": user_id
            })
            print(f"DEBUG: Updated preferences for user_id: {user_id}")
        else:
            # Insert new preferences
            conn.execute(sa.text('''
                INSERT INTO user_preferences 
                (user_id, position, favorite_team, picture, slogan, completed)
                VALUES (:user_id, :position, :favorite_team, :picture, :slogan, :completed)
            '''), {
                "user_id": user_id,
                "position": preferences_data.get('position'),
                "favorite_team": preferences_data.get('favorite_team'),
                "picture": preferences_data.get('picture'),
                "slogan": preferences_data.get('slogan'),
                "completed": True
            })
            print(f"DEBUG: Inserted new preferences for user_id: {user_id}")

        conn.commit()
        print(f"DEBUG: Successfully committed preferences for user_id: {user_id}")

        # Verify the save worked
        saved_prefs = get_user_preferences(user_id)
        print(f"DEBUG: Verified saved preferences: {saved_prefs}")

    except Exception as e:
        print(f"ERROR: Failed to save preferences for user_id {user_id}: {str(e)}")
        conn.rollback()
        raise e
    finally:
        conn.close()


def are_preferences_complete(user_id):
    preferences = get_user_preferences(user_id)
    print(f"DEBUG: Checking preferences completeness for user_id {user_id}: {preferences}")

    if not preferences:
        print(f"DEBUG: No preferences found for user_id {user_id}")
        return False

    # Check if required fields are filled
    completed = bool(preferences.get('position') and preferences.get('favorite_team'))
    print(f"DEBUG: Preferences complete: {completed}")
    return completed