from flask import Flask, request, jsonify
from flask_socketio import SocketIO, emit
from flask_cors import CORS
from collections import defaultdict
from random import sample, randint
from datetime import datetime
from time import sleep

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret'
CORS(app, resources={r"/*": {"origins": "*"}})
socketio = SocketIO(app, cors_allowed_origins="*")

game_state = {
    "letters": "",
    "letter_counts": defaultdict(int),
    "players": []
}

agent_vocabulary = open('./wordlist.txt', 'r').read().splitlines()
alphabet = "AAAAAAAAAAAAABBBCCCDDDDDDEEEEEEEEEEEEEEEEEEFFFGGGGHHHIIIIIIIIIIIIJJKKLLLLLMMMNNNNNNNNOOOOOOOOOOOPPPQQRRRRRRRRRSSSSSSTTTTTTTTTUUUUUUVVVWWWXXYYYZZ"


# TODO: update how speed is calculated
@socketio.on('initialize')
def initialize(data):
    global game_state
    global words_to_win
    words_to_win, num_agents, num_players, letter_frequency, max_letters = data.get('words_to_win', 10), data.get('num_agents', 2), data.get('num_players', 1), data.get('letter_frequency', 5), data.get('max_letters', 10)
    game_state = {
        "letters": "",
        "letter_counts": defaultdict(int),
        "letter_timer": letter_frequency,
        "players": {},
        "ended": False,
        "winner": -1
    }
    for i in range(num_players):
        game_state['players'][i] = {"agent": False, "words": []}
    for i in range(num_agents):
        speed = randint(6, 10)
        game_state['players'][num_players + i] = {"agent": True, "words": [], "vocab": sample(agent_vocabulary, randint(1000, len(agent_vocabulary))), "speed": speed, "next_move": speed}
    
    emit('game_state', game_state, broadcast=True)

    prev_time = datetime.now()
    while not game_state["ended"]:
        curr_time = datetime.now()
        game_state["letter_timer"] -= (curr_time - prev_time).total_seconds() 
        if game_state["letter_timer"] < 0 and len(game_state["letters"]) < max_letters:
            add_random_letter()
            game_state["letter_timer"] = letter_frequency
        
        for id in game_state["players"]:
            if game_state["players"][id]["agent"]:
                game_state["players"][id]["next_move"] -= (curr_time - prev_time).total_seconds()
                if game_state["players"][id]["next_move"] < 0:
                    agent_move(id)
                    game_state["players"][id]["next_move"] = game_state["players"][id]["speed"]

        winner = win_check()
        if winner >= 0:
            print('game over, winner is', winner)
            game_state['ended'] = True
            game_state['winner'] = winner
            emit('game_state', game_state, broadcast=True)
            return

        sleep(.2)
        prev_time = curr_time
        emit('game_state', game_state, broadcast=True)


@socketio.on('process_packet') 
def process_packet(data):
    print(data)
    if "add_word" in data:
        add_word(data.get("add_word"), int(data.get("add_id")))
    if "remove_word" in data:
        remove_word(data.get("remove_word"), int(data.get("remove_id")))

    if "add_letters" in data:
        add_letters(data.get("add_letters"))
    if "remove_letters" in data:
        remove_letters(data.get("remove_letters"))

    emit('game_state', game_state, broadcast=True)


def add_word(new_word, id):
    game_state['players'][id]["words"].append(new_word)
    
def remove_word(new_word, id):
    if new_word in game_state['players'][id]["words"]:
        game_state['players'][id]["words"].remove(new_word)

def add_letters(new_letters):
    for l in new_letters:
        game_state['letter_counts'][l] += 1
    game_state['letters'] += new_letters

def remove_letters(new_letters):
    new_letter_counts = defaultdict(int)
    for l in new_letters:
        new_letter_counts[l] += 1
    temp = ""
    for l in game_state['letters']:
        if new_letter_counts[l] > 0:
            new_letter_counts[l] -= 1
            game_state['letter_counts'][l] -= 1
        else:
            temp += l
    game_state['letters'] = temp

@app.route('/http-call')
def http_call():
    print('hi')
    data = {'data':'This text was fetched using an HTTP call to server on render'}
    return jsonify(data)
        
def add_random_letter():
    add_letters(alphabet[randint(0, len(alphabet) - 1)])

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

def agent_move(id):
    curr = game_state["players"][id]
    order = sample(range(len(game_state["players"]) + 1), len(game_state["players"]) + 1)
    for listId in order:
        if listId == len(game_state["players"]):
            for vocab_word in curr["vocab"]:
                vocab_word_count = defaultdict(int)
                for l in vocab_word:
                    vocab_word_count[l] += 1
                if contains(vocab_word_count, game_state["letter_counts"]):
                    add_word(vocab_word, id)
                    remove_letters(vocab_word)
                    return
        else:            
            for vocab_word in curr["vocab"]:
                vocab_word_count = defaultdict(int)
                for l in vocab_word:
                    vocab_word_count[vocab_word] += 1
                for word in game_state["players"][listId]["words"]:
                    combined_letter_count = game_state["letter_counts"].copy()
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

# TODO: add win condition
def win_check():
    for id in game_state["players"]:
        if len(game_state["players"][id]["words"]) >= words_to_win:
            return id
    return -1

if __name__ == '__main__':
    socketio.run(app, port=5001, debug=True)
