from flask import Flask, request, jsonify
from flask_socketio import SocketIO, emit
from flask_cors import CORS
from collections import defaultdict
from random import sample, randint

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret'
CORS(app, resources={r"/*": {"origins": "*"}})
socketio = SocketIO(app, cors_allowed_origins="*")

game_state = {
    "letters": [],
    "letter_counts": [0] * 26,
    "players": []
}

agent_vocabulary = open('./wordlist.txt', 'r').read().splitlines()

@socketio.on('initialize')
def initialize(data):
    global game_state
    num_agents, num_players = data.get('num_agents', 2), data.get('num_players', 1)
    game_state = {
        "letters": [],
        "letter_counts": [0] * 26,
        "players": {}
    }
    for i in range(num_players):
        game_state['players'][i] = {"agent": False, "words": []}
    for i in range(num_agents):
        game_state['players'][num_players + i] = {"agent": True, "words": [], "vocab": sample(agent_vocabulary, randint(1000, 10000))}
    emit('game_state', game_state, broadcast=True)

@socketio.on('add_word')
def add_word(data):
    newWord, id = data.get('word'), data.get('id')
    game_state['players'][id].append(newWord)
    emit('game_state', game_state, broadcast=True)
    

@socketio.on('remove_word')
def remove_word(data):
    newWord, id = data.get('word'), data.get('id')
    if newWord in game_state['players'][id]:
        game_state['players'][id].remove(newWord)
    emit('game_state', game_state, broadcast=True)

@socketio.on('add_letters')
def add_letters(data):
    new_letters = data.get('letters', '')
    game_state['letters'] += new_letters
    for l in new_letters:
        game_state['letter_counts'][ord(l) - 65] += 1
    emit('game_state', game_state, broadcast=True)

@socketio.on('remove_letters')
def remove_letters(data):
    new_letters = data.get('letters', '')
    new_letter_counts = defaultdict(int)
    for l in new_letters:
        new_letter_counts[l] += 1
    temp = ""
    for l in game_state['letters']:
        if new_letter_counts[ord(l) - 65] > 0:
            new_letter_counts[ord(l) - 65] -= 1
        else:
            temp += l
            game_state['letter_counts'] [ord(l) - 65] -= 1
    emit('game_state', game_state, broadcast=True)

@app.route('/http-call')
def http_call():
    return jsonify(game_state)

if __name__ == '__main__':
    socketio.run(app, port=5001, debug=True)
