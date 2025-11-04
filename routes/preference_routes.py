from flask import request, jsonify
from utils.auth import token_required
from models.user import get_user_preferences, create_user_preferences, are_preferences_complete


def configure_preference_routes(app):
    @app.route('/api/preferences', methods=['GET'])
    @token_required
    def get_preferences(current_user):
        preferences = get_user_preferences(current_user['id'])
        return jsonify({'preferences': preferences}), 200

    @app.route('/api/preferences', methods=['POST'])
    @token_required
    def save_preferences(current_user):
        try:
            data = request.get_json()
            print(f"DEBUG: Received preferences data from user {current_user['email']}")

            # Validate required fields
            if not data.get('position') or not data.get('favorite_team'):
                return jsonify({'error': 'Position and Favorite Team are required'}), 400

            # Handle picture data (could be Data URL or empty)
            picture_data = data.get('picture', '')

            # If it's a Data URL and too long, you might want to store it as a file
            # For simplicity, we'll store it as is for now
            if picture_data and len(picture_data) > 1000000:  # ~1MB limit
                return jsonify({'error': 'Image file too large'}), 400

            create_user_preferences(current_user['id'], data)

            # Get the updated preferences to verify
            updated_preferences = get_user_preferences(current_user['id'])
            print(f"DEBUG: Preferences after save: {updated_preferences}")

            return jsonify({
                'message': 'Preferences saved successfully',
                'preferences': updated_preferences
            }), 200

        except Exception as e:
            print(f"ERROR: Failed to save preferences for user {current_user['email']}: {str(e)}")
            return jsonify({'error': str(e)}), 500

    @app.route('/api/preferences/check', methods=['GET'])
    @token_required
    def check_preferences(current_user):
        """Check if user has completed preferences"""
        complete = are_preferences_complete(current_user['id'])
        print(f"DEBUG: Preferences check for user {current_user['email']}: {complete}")  # Logging
        return jsonify({'preferences_complete': complete}), 200

    @app.route('/api/debug/preferences/<int:user_id>', methods=['GET'])
    def debug_preferences(user_id):
        """Debug endpoint to check preferences in database"""
        from models.user import get_user_preferences, get_db_connection

        conn = get_db_connection()
        all_prefs = conn.execute('SELECT * FROM user_preferences').fetchall()
        conn.close()

        user_prefs = get_user_preferences(user_id)

        return jsonify({
            'user_preferences': user_prefs,
            'all_preferences': [dict(pref) for pref in all_prefs]
        }), 200
