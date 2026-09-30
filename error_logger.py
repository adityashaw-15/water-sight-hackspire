from flask import Flask, request
app = Flask(__name__)

@app.route('/log_error', methods=['POST', 'OPTIONS'])
def log_error():
    if request.method == 'OPTIONS':
        return '', 200, {'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*'}
    with open('browser_errors.txt', 'a') as f:
        f.write(str(request.json) + '\n')
    return '', 200, {'Access-Control-Allow-Origin': '*'}

if __name__ == '__main__':
    app.run(port=5001)
