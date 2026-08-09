from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score

def evaluate_clustering(embeddings, n_clusters=5):
    kmeans = KMeans(n_clusters=n_clusters, random_state=42)
    labels = kmeans.fit_predict(embeddings)
    silhouette_avg = silhouette_score(embeddings, labels)
    inertia = kmeans.inertia_
    return labels, silhouette_avg, inertia
