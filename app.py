from flask import Flask, redirect, render_template, request

app = Flask(__name__)

@app.route("/")
def index():
    """Show maps and dashboard"""
    return render_template("index.html")