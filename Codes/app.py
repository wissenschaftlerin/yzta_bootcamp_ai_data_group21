from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import pandas as pd
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.linear_model import SGDClassifier
import os
from flask_mysqldb import MySQL

app = Flask(__name__)
CORS(app)

# MySQL yapılandırması
app.config['MYSQL_HOST'] = 'localhost'
app.config['MYSQL_USER'] = 'root'       # phpMyAdmin kullanıcı adın
app.config['MYSQL_PASSWORD'] = ''       # phpMyAdmin şifren
app.config['MYSQL_DB'] = 'moodtune_db'  # Veritabanı adın

mysql = MySQL(app)

# Veri dosyası ve model dosyaları
DATA_PATH = "veri.csv"
MODEL_PATH = "model.joblib"
VECTORIZER_PATH = "vectorizer.joblib"

# CSV dosyasını oku ve kontrol et
try:
    df = pd.read_csv(DATA_PATH, encoding="utf-8")
    df["text"] = df["text"].str.lower()
    print("CSV dosyası başarıyla okundu!")
    print("Sütunlar:", df.columns.tolist())
    print(df.head())
except Exception as e:
    print("CSV dosyası okunurken hata oluştu:", e)
    exit(1)

# Model ve vectorizer'ı yükle veya oluştur
if os.path.exists(MODEL_PATH) and os.path.exists(VECTORIZER_PATH):
    model = joblib.load(MODEL_PATH)
    vectorizer = joblib.load(VECTORIZER_PATH)
else:
    vectorizer = CountVectorizer()
    X = vectorizer.fit_transform(df["text"])
    y = df["sentiment"]

    model = SGDClassifier(loss="log_loss")  # Logistic Regression için
    model.fit(X, y)

    joblib.dump(model, MODEL_PATH)
    joblib.dump(vectorizer, VECTORIZER_PATH)

@app.route('/analiz', methods=['POST'])
def analiz():
    data = request.get_json()
    metin = data.get("text", "").lower()
    X_input = vectorizer.transform([metin])
    tahmin = model.predict(X_input)[0]
    return jsonify({"mood": tahmin})

@app.route('/ogren', methods=['POST'])
def ogren():
    data = request.get_json()
    metin = data.get("text", "").lower()
    dogru_etiket = data.get("correct_mood", "")

    if dogru_etiket not in ["mutlu", "huzunlu", "sakin"]:
        return jsonify({"status": "error", "message": "Geçersiz duygu etiketi"}), 400

    X_input = vectorizer.transform([metin])
    model.partial_fit(X_input, [dogru_etiket])

    # MySQL veritabanına kayıt
    cursor = mysql.connection.cursor()
    insert_query = "INSERT INTO feedback (text, sentiment) VALUES (%s, %s)"
    cursor.execute(insert_query, (metin, dogru_etiket))
    mysql.connection.commit()
    cursor.close()

    # Modeli kaydet
    joblib.dump(model, MODEL_PATH)
    joblib.dump(vectorizer, VECTORIZER_PATH)

    # Opsiyonel: CSV dosyasını güncellemek istiyorsan (isteğe bağlı)
    yeni_satir = pd.DataFrame({"text": [metin], "sentiment": [dogru_etiket]})
    global df
    df = pd.concat([df, yeni_satir], ignore_index=True)
    df.to_csv(DATA_PATH, index=False, encoding="utf-8")

    return jsonify({"status": "success", "message": "Model güncellendi ve veri kaydedildi"})

if __name__ == "__main__":
    app.run(debug=True)
