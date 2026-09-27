from transformers import AutoTokenizer, AutoModelForSeq2SeqLM, AutoModel



def load_model_and_tokenizer(model_name):
    """
    Load tokenizer and model based on the model type.
    :param model_name: Name of the model
    :return: tokenizer and model
    """
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    if models_to_test_general[model_name] == "encoder":
        model = AutoModel.from_pretrained(model_name)
    else:
        model = AutoModelForSeq2SeqLM.from_pretrained(model_name)
    return tokenizer, model

# Define general and French-specific models
models_to_test_general = {
    # Encoder Models
    "sentence-transformers/all-MiniLM-L6-v2": "encoder",
    "sentence-transformers/all-distilroberta-v1": "encoder",
    "sentence-transformers/all-MiniLM-L12-v2": "encoder",
    "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2": "encoder",
    "sentence-transformers/paraphrase-multilingual-mpnet-base-v2": "encoder",
    "sentence-transformers/xlm-r-bert-base-nli-stsb-mean-tokens": "encoder",
    "sentence-transformers/stsb-xlm-r-multilingual": "encoder",
    "sentence-transformers/msmarco-distilbert-base-v2": "encoder",
    "sentence-transformers/msmarco-bert-base-dot-v5": "encoder",
    "sentence-transformers/all-mpnet-base-v2": "encoder",
    "sentence-transformers/roberta-large-v1": "encoder",
    "sentence-transformers/miniLM-L6": "encoder",
    "sentence-transformers/miniLM-L3": "encoder",
    "sentence-transformers/miniLM": "encoder",
    
    # Seq2Seq Models
    "t5-small": "seq2seq",
    "t5-base": "seq2seq",
    "t5-large": "seq2seq",
    "google/flan-t5-small": "seq2seq",
    "google/flan-t5-base": "seq2seq",
    "google/flan-t5-large": "seq2seq",
}


models_to_test_french = {
    "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2": "encoder",
    "sentence-transformers/paraphrase-multilingual-mpnet-base-v2": "encoder",
    "sentence-transformers/xlm-r-bert-base-nli-stsb-mean-tokens": "encoder",
    "sentence-transformers/stsb-xlm-r-multilingual": "encoder",
    "t5-small": "seq2seq",
    "t5-base": "seq2seq",
    "google/flan-t5-small": "seq2seq",
    "google/flan-t5-base": "seq2seq",
}
