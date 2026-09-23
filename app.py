from flask import render_template 
from flask import Flask

server = Flask(__name__)

@server.route("/admin")
def admin_panel():
    return render_template("admin.html")

@server.route("/result")
def get_result():
    return render_template("result.html")