from flask import Flask, request, jsonify
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_cors import CORS
from copy import deepcopy
from collections import defaultdict
from random import sample, randint, choice, choices
from datetime import datetime
from string import ascii_uppercase, digits
from time import sleep


"""
list of bugs to fix:
- display number of letters remaining in flash
"""

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret'
CORS(app, resources={r"/*": {"origins": "*"}})
socketio = SocketIO(app, cors_allowed_origins="*")

global games
games = {}

agent_vocabulary = open('./wordlist.txt', 'r').read().splitlines()
alphabet = "AAAAAAAAAAAAABBBCCCDDDDDDEEEEEEEEEEEEEEEEEEFFFGGGGHHHIIIIIIIIIIIIJJKKLLLLLMMMNNNNNNNNOOOOOOOOOOOPPPQQRRRRRRRRRSSSSSSTTTTTTTTTUUUUUUVVVWWWXXYYYZZ"

default_gamestate = {
    "started": False,
    "host": None,
    "gametype": "flash", 
    "letter_distribution": alphabet, 
    "letters": "",
    "letter_counts": defaultdict(int),
    "max_letters": 10,
    "letter_frequency": 2,
    "letter_timer": 2,
    "players": {},
    "words_to_win": 10,
    "end_countdown": None,
    "ended": False,
    "winner": None
}

@app.route('/validate', methods=['POST'])
def validate():
    data = request.json
    game_id = data.get('game_id', None)
    username = data.get('username')

    if not username:
        return jsonify({'valid': False, 'error': 'Missing username'}), 400

    if not game_id:
        game_id = random_lobby()
        initialize(game_id)

    if game_id not in games:
        return jsonify({'valid': False, 'error': 'Not a valid game ID'}), 409

    if username in games[game_id]["players"]:
        return jsonify({'valid': False, 'error': 'Username already taken in this game'}), 409

    if games[game_id]["started"]:
        return jsonify({'valid': False, 'error': 'Game has already started'}), 411

    return jsonify({'valid': True, 'game_id': game_id}), 200

@socketio.on('join')
def join(data):
    # expected data: game_id, username
    game_id = data.get("game_id", -1)
    username = data.get("username", random_lobby())

    print(username, "joined room", game_id)
    join_room(game_id)

    games[game_id]["players"][username] = {"agent": False, "words": [], "active": True}
    if not games[game_id]["host"]:
        games[game_id]["host"] = username

    emit('lobby_update', {"players": list(games[game_id]["players"].keys()), "host": games[game_id]["host"]}, to=game_id)

@socketio.on('leave')
def leave(data):
    # expected data: game_id, username
    game_id = data.get("game_id", -1)
    username = data.get("username")

    print(username, "left room", game_id)
    leave_room(game_id)

    if username in games[game_id]["players"]:
        del games[game_id]["players"][username]
    
    if games[game_id]["players"] and games[game_id]["host"] == username:
        games[game_id]["host"] = choice(list(games[game_id]["players"].keys()))

    emit('lobby_update', {"players": list(games[game_id]["players"].keys()), "host": games[game_id]["host"]}, to=game_id)

@socketio.on('join_game')
def join_game(data):
    game_id, username = data.get("game_id"), data.get("username")
    join_room(game_id)
    games[game_id]["players"][username]["active"] = True

@socketio.on('leave_game')
def leave_game(data):
    game_id, username = data.get("game_id"), data.get("username")
    leave_room(game_id)
    games[game_id]["players"][username]["active"] = False


# TODO: update how speed is calculated
@socketio.on('start')
def start(data):
    # expected data: game_id, words_to_win, num_agents, letter_frequency, max_letters
    game_id = data.get("game_id", -1)
    print("starting game", game_id)
    games[game_id]["started"] = True
    if game_id == -1:
        # add some error
        return
    
    gametype = data.get('gametype', games[game_id]['gametype'])
    games[game_id]['gametype'] = gametype
    if gametype != "flash":
        words_to_win = data.get('words_to_win', games[game_id]['words_to_win'])
        games[game_id]['words_to_win'] = words_to_win
        letter_frequency = data.get('letter_frequency', games[game_id]['letter_frequency'])
        games[game_id]['letter_frequency'] = letter_frequency
        games[game_id]['letter_timer'] = letter_frequency
        max_letters = data.get('max_letters', games[game_id]['max_letters'])
        games[game_id]['max_letters'] = max_letters

    num_agents = data.get('num_agents', 0)
    for i in range(num_agents):
        speed = randint(6, 10)
        games[game_id]['players']['bot' + str(i)] = {"agent": True, "words": [], "vocab": sample(agent_vocabulary, randint(1000, len(agent_vocabulary))), "speed": speed, "next_move": speed}
    
    emit('game_state', games[game_id], to=game_id)
    emit('game_started', {}, to=game_id)
    print('game', game_id, 'has started')

    prev_time = datetime.now()
    while not empty(game_id):
        if not games[game_id]["ended"]:
            curr_time = datetime.now()
            games[game_id]["letter_timer"] -= (curr_time - prev_time).total_seconds() 
            if games[game_id]["letter_timer"] < 0 and (len(games[game_id]["letters"]) < games[game_id]["max_letters"] or games[game_id]["gametype"] == "flash") and not games[game_id]["end_countdown"]:
                add_random_letter(game_id)
                games[game_id]["letter_timer"] = games[game_id]["letter_frequency"]
            
            for id in games[game_id]["players"]:
                if games[game_id]["players"][id]["agent"]:
                    games[game_id]["players"][id]["next_move"] -= (curr_time - prev_time).total_seconds()
                    if games[game_id]["players"][id]["next_move"] < 0:
                        agent_move(game_id, id)
                        games[game_id]["players"][id]["next_move"] = games[game_id]["players"][id]["speed"]

            if games[game_id]["end_countdown"]:
                if games[game_id]["end_countdown"] > 0:
                    games[game_id]["end_countdown"] -= (curr_time - prev_time).total_seconds() 
                else:
                    winner = find_winner(game_id)
                    print('game over, winner is', winner)
                    games[game_id]['ended'] = True
                    games[game_id]['winner'] = winner
                    emit('game_state', games[game_id], to=game_id)
            else:
                games[game_id]["end_countdown"] = end_check(game_id)

            prev_time = curr_time
            emit('game_state', games[game_id], to=game_id)
        sleep(.1)

    del games[game_id]
    print('deleted', game_id)


@socketio.on('process_packet') 
def process_packet(data):
    print(data)
    game_id = data.get("game_id", -1)
    if game_id == -1:
        # error handling
        return
    if "add_word" in data:
        add_word(game_id, data.get("add_word"), data.get("add_id"))
    if "remove_word" in data:
        remove_word(game_id, data.get("remove_word"), data.get("remove_id"))

    if "add_letters" in data:
        add_letters(game_id, data.get("add_letters"))
    if "remove_letters" in data:
        remove_letters(game_id, data.get("remove_letters"))

    emit('game_state', games[game_id], to=game_id)

def initialize(game_id):
    games[game_id] = deepcopy(default_gamestate)

def add_word(game_id, new_word, id):
    games[game_id]['players'][id]["words"].append(new_word)
    
def remove_word(game_id, new_word, id):
    print(id)
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

@app.route('/')
def index():
    data = {'data':'This text was fetched using an HTTP call to server on render'}
    return jsonify(data)
        
def add_random_letter(game_id):
    if games[game_id]["gametype"] == "flash":
        index = randint(0, len(games[game_id]["letter_distribution"]) - 1)
        add_letters(game_id, games[game_id]["letter_distribution"][index])
        games[game_id]["letter_distribution"] = games[game_id]["letter_distribution"].replace(games[game_id]["letter_distribution"][index], '', 1)
    else:
        add_letters(game_id, games[game_id]["letter_distribution"][randint(0, len(games[game_id]["letter_distribution"]) - 1)])

def contains(smallerCount, largerCount):
    for letter in smallerCount:
        if smallerCount[letter] > largerCount[letter]:
            return False
    return True

def empty(game_id):
    for player in games[game_id]["players"]:
        if (not games[game_id]["players"][player]["agent"]) and games[game_id]["players"][player]["active"]:
            return False
    print('game', game_id, 'is empty')
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
    order = sample(list(games[game_id]["players"].keys()) + ["letters"], len(games[game_id]["players"]) + 1)
    for listId in order:
        if listId == "letters":
            for vocab_word in curr["vocab"]:
                # should go through the vocab list in a random order ideally
                vocab_word_count = defaultdict(int)
                for l in vocab_word:
                    vocab_word_count[l] += 1
                if contains(vocab_word_count, games[game_id]["letter_counts"]):
                    print(id, 'took word', vocab_word)
                    add_word(game_id, vocab_word, id)
                    remove_letters(game_id, vocab_word)
                    return
        else:            
            for vocab_word in curr["vocab"]:
                vocab_word_count = defaultdict(int)
                for l in vocab_word:
                    vocab_word_count[l] += 1
                for word in games[game_id]["players"][listId]["words"]:
                    combined_letter_count = deepcopy(games[game_id]["letter_counts"])
                    word_count = defaultdict(int)
                    for l in word:
                        combined_letter_count[l] += 1
                        word_count[l] += 1
                    if contains(vocab_word_count, combined_letter_count) and contains(word_count, vocab_word_count) and not same(word_count, vocab_word_count):
                        for l in vocab_word_count:
                            combined_letter_count[l] -= vocab_word_count[l]
                        remove = ""
                        for l in games[game_id]['letters']:
                            if combined_letter_count[l] > 0:
                                combined_letter_count[l] -= 1
                            else:
                                remove += l
                        print(id, 'took word', vocab_word, 'from', listId, 'using extra letters', remove)
                        add_word(game_id, vocab_word, id)
                        remove_word(game_id, word, listId)
                        remove_letters(game_id, remove)
                        return

def random_lobby():
    fails = 0
    while fails < 10:
        temp = ''.join(choices(ascii_uppercase + digits, k=6))
        if temp in games:
            fails += 1
        else:
            return temp
    # TODO: return some error
    return


def end_check(game_id):
    if games[game_id]["gametype"] == "flash":
        if (len(games[game_id]["letter_distribution"]) == 0):
            return 10
        return None
    else:
        for id in games[game_id]["players"]:
            if len(games[game_id]["players"][id]["words"]) >= games[game_id]["words_to_win"]:
                return 0
        return None
 
def find_winner(game_id):
    if games[game_id]["gametype"] == "flash":
        max_letters, winner = 0, None
        for player in games[game_id]["players"]:
            curr_letters = 0
            for word in games[game_id]["players"][player]["words"]:
                curr_letters += len(word)
            if curr_letters > max_letters:
                max_letters, winner = curr_letters, player
        return winner
    else:
        max_words, winner = 0, None
        for player in games[game_id]["players"]:
            curr_words = len(games[game_id]["players"][player]["words"])
            if curr_words > max_words:
                max_words, winner = curr_words, player
        return winner

if __name__ == '__main__':
    socketio.run(debug=True, host='127.0.0.1', port=5004)
