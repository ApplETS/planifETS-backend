import nltk
import re
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize, sent_tokenize

nltk.download('punkt')
nltk.download('stopwords')

stop_words = set(stopwords.words('french'))

def remove_stopwords(text):
    words = word_tokenize(text.lower())
    filtered_words = [word for word in words if word.isalpha() and word not in stop_words]
    return ' '.join(filtered_words)

def preprocess_text(text):
    text = re.sub(r'[^\w\s]', '', text.lower())
    return remove_stopwords(text)
