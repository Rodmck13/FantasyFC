from flask import request, jsonify
from utils.auth import token_required
from models.user import get_db_connection
import sqlalchemy as sa

def configure_user_routes(app):
    @app.route('/api/profile', methods=['GET'])
    @token_required
    def get_profile(current_user):
        conn = get_db_connection()
        result = conn.execute(
            sa.text('SELECT * FROM user_preferences WHERE user_id = :user_id'),
            {"user_id": current_user['id']}
        )
        preferences = result.fetchone()
        conn.close()

        return jsonify({
            'user': {
                'email': current_user['email'],
                'name': current_user['name'],
                'preferences': dict(preferences._mapping) if preferences else None
            }
        }), 200

    @app.route('/api/users/<int:user_id>', methods=['DELETE'])
    def delete_user(user_id):
        """Admin endpoint to delete user"""
        conn = get_db_connection()
        conn.execute(sa.text('DELETE FROM users WHERE id = :user_id'), {"user_id": user_id})

        conn.close()

        return jsonify({'message': 'User deleted successfully'}), 200

    @app.route('/api/users/<int:user_id>', methods=['PUT'])
    def update_user(user_id):
        """Admin endpoint to update user"""
        data = request.get_json()
        email = data.get('email')
        name = data.get('name')

        conn = get_db_connection()
        conn.execute(
            sa.text('UPDATE users SET email = :email, name = :name WHERE id = :user_id'),
            {"email": email, "name": name, "user_id": user_id}
        )

        conn.close()

        return jsonify({'message': 'User updated successfully'}), 200

    @app.route('/api/users', methods=['GET'])
    @token_required
    def get_all_users(current_user):
        """Get all users with their preferences and ratings"""
        conn = get_db_connection()

        # Join users with their preferences and calculate average ratings
        result = conn.execute(sa.text('''
            SELECT 
                u.id, u.email, u.name, u.created_at,
                up.position, up.favorite_team, up.picture, up.slogan,
                COALESCE(AVG(ur.overall_score), 0) as average_rating,
                COUNT(ur.id) as rating_count
            FROM users u
            LEFT JOIN user_preferences up ON u.id = up.user_id
            LEFT JOIN user_ratings ur ON u.id = ur.rated_user_id
            GROUP BY u.id, up.position, up.favorite_team, up.picture, up.slogan
        '''))
        users = result.fetchall()

        conn.close()

        users_list = []
        for user in users:
            user_data = dict(user._mapping)
            # Add default values if preferences don't exist
            if not user_data['position']:
                user_data['position'] = 'Not set'
            if not user_data['favorite_team']:
                user_data['favorite_team'] = 'Not set'
            if not user_data['slogan']:
                user_data['slogan'] = 'No slogan yet'
            if not user_data['picture']:
                user_data['picture'] = ''

            # Convert average rating to integer
            user_data['average_rating'] = int(user_data['average_rating'])

            users_list.append(user_data)

        return jsonify({'users': users_list}), 200

    @app.route('/api/matchday', methods=['GET'])
    def get_matchdayinfo():
        """Get current matchday information"""
        try:
            conn = get_db_connection()

            # Get the single matchday record
            result = conn.execute(sa.text('SELECT * FROM matchdayInfo LIMIT 1'))
            matchday = result.fetchone()

            conn.close()

            if matchday:
                return jsonify({
                    'matchday': {
                        'number': matchday['number'],
                        'topPlayer': matchday['topplayer'],  # Note: PostgreSQL converts to lowercase
                        'lastPlayer': matchday['lastplayer'],
                        'secondToLast': matchday['secondtolast'],
                        'noSubs': matchday['nosubs'],
                        'accumulated': matchday['accumulated']
                    }
                }), 200
            else:
                # Return default data if no matchday info exists
                return jsonify({
                    'matchday': {
                        'number': 1,
                        'topPlayer': "No data yet",
                        'lastPlayer': "No data yet",
                        'secondToLast': "No data yet",
                        'noSubs': "No data yet",
                        'accumulated': "$0"
                    }
                }), 200

        except Exception as e:
            print(f"Error fetching matchday info: {str(e)}")
            return jsonify({
                'error': 'Failed to fetch matchday information',
                'matchday': {
                    'number': 1,
                    'topPlayer': "Error loading",
                    'lastPlayer': "Error loading",
                    'secondToLast': "Error loading",
                    'noSubs': "Error loading",
                    'accumulated': "$0"
                }
            }), 500

    @app.route('/api/matchday', methods=['PUT'])
    def update_matchdayinfo():
        """Update matchday information (admin only)"""
        try:
            data = request.get_json()

            # Validate required fields
            required_fields = ['number', 'topPlayer', 'lastPlayer', 'secondToLast', 'noSubs', 'accumulated']
            for field in required_fields:
                if field not in data:
                    return jsonify({'error': f'Missing required field: {field}'}), 400

            conn = get_db_connection()

            # Check if record exists
            result = conn.execute(sa.text('SELECT id FROM matchdayInfo LIMIT 1'))
            existing = result.fetchone()

            if existing:
                # Update existing record
                conn.execute(sa.text('''
                    UPDATE matchdayInfo 
                    SET number = :number, topPlayer = :topPlayer, lastPlayer = :lastPlayer, 
                        secondToLast = :secondToLast, noSubs = :noSubs, accumulated = :accumulated, 
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = :id
                '''), {
                    "number": data['number'],
                    "topPlayer": data['topPlayer'],
                    "lastPlayer": data['lastPlayer'],
                    "secondToLast": data['secondToLast'],
                    "noSubs": data['noSubs'],
                    "accumulated": data['accumulated'],
                    "id": existing['id']
                })
            else:
                # Insert new record
                conn.execute(sa.text('''
                    INSERT INTO matchdayInfo 
                    (number, topPlayer, lastPlayer, secondToLast, noSubs, accumulated)
                    VALUES (:number, :topPlayer, :lastPlayer, :secondToLast, :noSubs, :accumulated)
                '''), {
                    "number": data['number'],
                    "topPlayer": data['topPlayer'],
                    "lastPlayer": data['lastPlayer'],
                    "secondToLast": data['secondToLast'],
                    "noSubs": data['noSubs'],
                    "accumulated": data['accumulated']
                })


            conn.close()

            return jsonify({'message': 'Matchday information updated successfully'}), 200

        except Exception as e:
            print(f"Error updating matchday info: {str(e)}")
            return jsonify({'error': 'Failed to update matchday information'}), 500