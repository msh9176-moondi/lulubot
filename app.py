from flask import render_template 
from flask import Flask

app = Flask(__name__)

@app.route("/admin")
def get_admin_panel():
    return render_template("admin.html")

@app.route("/result")
def get_result():
    return render_template("result.html")