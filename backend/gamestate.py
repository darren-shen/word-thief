from flask import Flask, request, jsonify
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_cors import CORS
from collections import defaultdict
from random import sample, randint
from datetime import datetime
from time import sleep

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret'
CORS(app, resources={r"/*": {"origins": "*"}})
socketio = SocketIO(app, cors_allowed_origins="*")

global games
games = {}
default_gamestate = {
    "started": False,
    "letters": "",
    "letter_counts": defaultdict(int),
    "letter_timer": 10,
    "players": {},
    "words_to_win": 10,
    "ended": False,
    "winner": -1
}

agent_vocabulary = open('./wordlist.txt', 'r').read().splitlines()
alphabet = "AAAAAAAAAAAAABBBCCCDDDDDDEEEEEEEEEEEEEEEEEEFFFGGGGHHHIIIIIIIIIIIIJJKKLLLLLMMMNNNNNNNNOOOOOOOOOOOPPPQQRRRRRRRRRSSSSSSTTTTTTTTTUUUUUUVVVWWWXXYYYZZ"

@socketio.on('join')
def join(data):
    # expected data: game_id, username
    game_id = data.get("game_id", -1)
    username = data.get("username")
    if game_id == -1:
        # add some error
        return
    if game_id not in games:
        initialize(game_id)

    if username in games[game_id]["players"]:
        games[game_id]["players"][username]["active"] = True
    else:
        games[game_id]["players"][username] = {"agent": False, "words": [], "active": True}


@socketio.on('leave')
def leave(data):
    # expected data: game_id, username
    game_id = data.get("game_id", -1)
    username = data.get("username")
    if game_id == -1:
        # add some error
        return
    if username in games[game_id]["players"]:
        games[game_id]["players"][username]["active"] = False

# TODO: update how speed is calculated
@socketio.on('start')
def start(data):
    # expected data: game_id, words_to_win, num_agents, num_players, letter_frequency, max_letters
    game_id = data.get("game_id", -1)
    if game_id == -1:
        # add some error
        return
    
    words_to_win = data.get('words_to_win', games[game_id]['words_to_win'])
    games[game_id]['num_agents'] = num_agents
    num_agents = data.get('num_agents', games[game_id]['num_agents'])
    games[game_id]['words_to_win'] = words_to_win
    num_players = data.get('num_players', games[game_id]['num_players'])
    games[game_id]['num_players'] = num_players
    letter_frequency = data.get('letter_frequency', games[game_id]['letter_frequency'])
    games[game_id]['letter_frequency'] = letter_frequency
    max_letters = data.get('max_letters', games[game_id]['max_letters'])
    games[game_id]['max_letters'] = max_letters

    for i in range(num_players):
        games[game_id]['players'][i] = {"agent": False, "words": []}
    for i in range(num_agents):
        speed = randint(6, 10)
        games[game_id]['players'][num_players + i] = {"agent": True, "words": [], "vocab": sample(agent_vocabulary, randint(1000, len(agent_vocabulary))), "speed": speed, "next_move": speed}
    
    emit('game_state', games[game_id], to=game_id)

    prev_time = datetime.now()
    while not games[game_id]["ended"]:
        curr_time = datetime.now()
        games[game_id]["letter_timer"] -= (curr_time - prev_time).total_seconds() 
        if games[game_id]["letter_timer"] < 0 and len(games[game_id]["letters"]) < max_letters:
            add_random_letter(game_id)
            games[game_id]["letter_timer"] = letter_frequency
        
        for id in games[game_id]["players"]:
            if games[game_id]["players"][id]["agent"]:
                games[game_id]["players"][id]["next_move"] -= (curr_time - prev_time).total_seconds()
                if games[game_id]["players"][id]["next_move"] < 0:
                    agent_move(game_id, id)
                    games[game_id]["players"][id]["next_move"] = games[game_id]["players"][id]["speed"]

        winner = end_check(game_id)
        if winner >= 0:
            print('game over, winner is', winner)
            games[game_id]['ended'] = True
            games[game_id]['winner'] = winner
            emit('game_state', games[game_id], to=game_id)
            return

        sleep(.2)
        prev_time = curr_time
        emit('game_state', games[game_id], to=game_id)


@socketio.on('process_packet') 
def process_packet(data):
    print(data)
    game_id = data.get("game_id", -1)
    if game_id == -1:
        # error handling
        return
    if "add_word" in data:
        add_word(game_id, data.get("add_word"), int(data.get("add_id")))
    if "remove_word" in data:
        remove_word(game_id, data.get("remove_word"), int(data.get("remove_id")))

    if "add_letters" in data:
        add_letters(game_id, data.get("add_letters"))
    if "remove_letters" in data:
        remove_letters(game_id, data.get("remove_letters"))

    emit('game_state', games[game_id], broadcast=True)

def initialize(game_id):
    games[game_id] = default_gamestate.copy()
    join_room(game_id)

def add_word(game_id, new_word, id):
    games[game_id]['players'][id]["words"].append(new_word)
    
def remove_word(game_id, new_word, id):
    if new_word in games[game_id]['players'][id]["words"]:
        games[game_id]['players'][id]["words"].remove(new_word)

def add_letters(game_id, new_letters):
    for l in new_letters:
        games[game_id]['letter_counts'][l] += 1
    games[game_id]['letters'] += new_letters

def remove_letters(game_id, new_letters):
    new_letter_counts = defaultdict(int)
    for l in new_letters:
        new_letter_counts[l] += 1
    temp = ""
    for l in games[game_id]['letters']:
        if new_letter_counts[l] > 0:
            new_letter_counts[l] -= 1
            games[game_id]['letter_counts'][l] -= 1
        else:
            temp += l
    games[game_id]['letters'] = temp

@app.route('/http-call')
def http_call():
    print('hi')
    data = {'data':'This text was fetched using an HTTP call to server on render'}
    return jsonify(data)
        
def add_random_letter(game_id):
    add_letters(game_id, alphabet[randint(0, len(alphabet) - 1)])

def contains(smallerCount, largerCount):
    for letter in smallerCount:
        if smallerCount[letter] > largerCount[letter]:
            return False
    return True

def same(smallerCount, largerCount):
    for letter in smallerCount:
        if smallerCount[letter] != largerCount[letter]:
            return False
    for letter in largerCount:
        if smallerCount[letter] != largerCount[letter]:
            return False
    return True

def agent_move(game_id, id):
    curr = games[game_id]["players"][id]
    order = sample(range(len(games[game_id]["players"]) + 1), len(games[game_id]["players"]) + 1)
    for listId in order:
        if listId == len(games[game_id]["players"]):
            for vocab_word in curr["vocab"]:
                vocab_word_count = defaultdict(int)
                for l in vocab_word:
                    vocab_word_count[l] += 1
                if contains(vocab_word_count, games[game_id]["letter_counts"]):
                    add_word(vocab_word, id)
                    remove_letters(vocab_word)
                    return
        else:            
            for vocab_word in curr["vocab"]:
                vocab_word_count = defaultdict(int)
                for l in vocab_word:
                    vocab_word_count[vocab_word] += 1
                for word in games[game_id]["players"][listId]["words"]:
                    combined_letter_count = games[game_id]["letter_counts"].copy()
                    word_count = defaultdict(int)
                    for l in word:
                        combined_letter_count[l] += 1
                        word_count[l] += 1
                    if contains(vocab_word_count, combined_letter_count) and contains(word_count, vocab_word_count) and not same(word_count, vocab_word_count):
                        for l in word_count:
                            combined_letter_count[l] -= word_count[l]
                        add_word(vocab_word, id)
                        remove_word(word, listId)
                        remove_letters(combined_letter_count)
                        return

def end_check(game_id):
    for id in games[game_id]["players"]:
        if len(games[game_id]["players"][id]["words"]) >= games[game_id]["words_to_win"]:
            return id
    return -1
 
def find_winner():
    # TODO: when the end_check becomes changes to smth not words to win
    return

if __name__ == '__main__':
    socketio.run(app, port=5001, debug=True)
