from app.main import app
from flask_socketio import SocketIO
 
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='eventlet')

if __name__ == "__main__":
    socketio.run(app, port=5001, debug=True)