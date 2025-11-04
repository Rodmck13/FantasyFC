from flask import request, jsonify
from utils.auth import token_required
from models.user import get_db_connection


def configure_rating_routes(app):
    # Skill definitions by position
    POSITION_SKILLS = {
        'Goalkeeper': ['Diving', 'Handling', 'Kicking', 'Reflexes', 'Positioning', 'Speed'],
        'Defender': ['Defending', 'Physicality', 'Pace', 'Interceptions', 'Heading Accuracy', 'Marking'],
        'Midfielder': ['Passing', 'Dribbling', 'Physicality', 'Defending', 'Pace', 'Shooting'],
        'Forward': ['Shooting', 'Pace', 'Dribbling', 'Finishing', 'Positioning', 'Physicality']
    }

    @app.route('/api/ratings/<int:user_id>', methods=['GET'])
    @token_required
    def get_user_ratings(current_user, user_id):
        """Get all ratings for a specific user"""
        conn = get_db_connection()

        # Get user's position to determine which skills to show
        user_prefs = conn.execute(
            'SELECT position FROM user_preferences WHERE user_id = ?',
            (user_id,)
        ).fetchone()

        position = user_prefs['position'] if user_prefs else None
        skills = POSITION_SKILLS.get(position, [])

        # Get all ratings for this user
        ratings = conn.execute('''
            SELECT ur.*, u.name as rater_name 
            FROM user_ratings ur 
            JOIN users u ON ur.rater_user_id = u.id 
            WHERE ur.rated_user_id = ?
        ''', (user_id,)).fetchall()

        conn.close()

        # Calculate average overall score
        total_score = 0
        rating_count = len(ratings)

        ratings_list = []
        for rating in ratings:
            rating_dict = dict(rating)
            ratings_list.append(rating_dict)
            total_score += rating_dict['overall_score']

        average_score = round(total_score / rating_count) if rating_count > 0 else 0

        return jsonify({
            'ratings': ratings_list,
            'average_score': average_score,
            'rating_count': rating_count,
            'skills': skills,
            'position': position
        }), 200

    @app.route('/api/ratings/<int:user_id>', methods=['POST'])
    @token_required
    def rate_user(current_user, user_id):
        """Rate another user"""
        try:
            data = request.get_json()

            # Prevent users from rating themselves
            if current_user['id'] == user_id:
                return jsonify({'error': 'You cannot rate yourself'}), 400

            # Get the rated user's position
            conn = get_db_connection()
            user_prefs = conn.execute(
                'SELECT position FROM user_preferences WHERE user_id = ?',
                (user_id,)
            ).fetchone()

            if not user_prefs or not user_prefs['position']:
                return jsonify({'error': 'User has no position set'}), 400

            position = user_prefs['position']
            skills = POSITION_SKILLS.get(position)

            if not skills:
                return jsonify({'error': 'Invalid position'}), 400

            # Validate all skills are provided and within range
            skills_data = {}
            for i, skill in enumerate(skills, 1):
                skill_value = data.get(f'skill_{i}')
                if skill_value is None:
                    return jsonify({'error': f'Missing skill: {skill}'}), 400
                if not isinstance(skill_value, int) or skill_value < 0 or skill_value > 100:
                    return jsonify({'error': f'Skill {skill} must be between 0 and 100'}), 400
                skills_data[f'skill_{i}'] = skill_value

            # Calculate overall score (average of all skills)
            skill_values = list(skills_data.values())
            overall_score = round(sum(skill_values) / len(skill_values))

            # Insert or update rating
            c = conn.cursor()
            c.execute('''
                INSERT OR REPLACE INTO user_ratings 
                (rated_user_id, rater_user_id, skill_1, skill_2, skill_3, skill_4, skill_5, skill_6, overall_score)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                user_id,
                current_user['id'],
                skills_data['skill_1'],
                skills_data['skill_2'],
                skills_data['skill_3'],
                skills_data['skill_4'],
                skills_data['skill_5'],
                skills_data['skill_6'],
                overall_score
            ))

            conn.commit()
            conn.close()

            return jsonify({
                'message': 'Rating submitted successfully',
                'overall_score': overall_score
            }), 200

        except Exception as e:
            print(f"ERROR: Failed to save rating: {str(e)}")
            return jsonify({'error': str(e)}), 500

    @app.route('/api/ratings/<int:user_id>/my-rating', methods=['GET'])
    @token_required
    def get_my_rating(current_user, user_id):
        """Get current user's rating for another user"""
        conn = get_db_connection()

        rating = conn.execute('''
            SELECT * FROM user_ratings 
            WHERE rated_user_id = ? AND rater_user_id = ?
        ''', (user_id, current_user['id'])).fetchone()

        # Get user's position for skill names
        user_prefs = conn.execute(
            'SELECT position FROM user_preferences WHERE user_id = ?',
            (user_id,)
        ).fetchone()

        position = user_prefs['position'] if user_prefs else None
        skills = POSITION_SKILLS.get(position, [])

        conn.close()

        if rating:
            rating_dict = dict(rating)
            # Add skill names to the response
            rating_dict['skill_names'] = skills
            return jsonify({'rating': rating_dict}), 200
        else:
            return jsonify({'rating': None, 'skill_names': skills}), 200