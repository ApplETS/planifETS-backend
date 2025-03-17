import torch
import time

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

def generate_embeddings(texts, model, tokenizer, batch_size=32):
    """
    Generate embeddings using the encoder of a T5 model.
    Returns embeddings and time taken in seconds.
    """
    model.to(device)
    model.eval()
    embeddings = []
    start_time = time.time()

    with torch.no_grad():
        for i in range(0, len(texts), batch_size):
            batch_texts = texts[i:i+batch_size]
            tokens = tokenizer(batch_texts, return_tensors='pt', padding=True, truncation=True, max_length=512)
            tokens = {k: v.to(device) for k, v in tokens.items()}

            # Use the encoder of T5
            encoder_outputs = model.encoder(input_ids=tokens['input_ids'], attention_mask=tokens['attention_mask'])
            batch_embeddings = encoder_outputs.last_hidden_state.mean(dim=1)  # Mean pooling
            embeddings.append(batch_embeddings.cpu())

    embeddings = torch.cat(embeddings, dim=0).numpy()
    time_taken = time.time() - start_time
    return embeddings, time_taken
