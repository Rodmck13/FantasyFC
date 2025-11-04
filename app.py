from flask import Flask
from flask_cors import CORS
from config import Config
from models.user import init_db
from routes.auth_routes import configure_auth_routes
from routes.user_routes import configure_user_routes
from routes.rating_routes import configure_rating_routes
from routes.preference_routes import configure_preference_routes

app = Flask(__name__,
    static_folder='static',
    static_url_path='',
    template_folder='static')
app.config.from_object(Config)
CORS(app, supports_credentials=True)

# Initialize database BEFORE configuring routes
init_db()

# Configure routes
configure_auth_routes(app)
configure_user_routes(app)
configure_preference_routes(app)
configure_rating_routes(app)

@app.route('/')
def serve_frontend():
    return app.send_static_file('index.html')

@app.route('/<path:path>')
def serve_static(path):
    return app.send_static_file(path)

if __name__ == '__main__':
    # Don't call init_db() here again - it's already called above
    app.run(debug=False, host='0.0.0.0', port=5000)  # Changed for production