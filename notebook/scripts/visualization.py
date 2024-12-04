import plotly.express as px
from sklearn.decomposition import PCA
from sklearn.manifold import TSNE
import umap

def visualize_embeddings(embeddings, labels, method='PCA'):
    if method == 'PCA':
        reducer = PCA(n_components=2)
    elif method == 't-SNE':
        reducer = TSNE(n_components=2, perplexity=30, n_iter=1000)
    elif method == 'UMAP':
        reducer = umap.UMAP(n_components=2, n_neighbors=15, min_dist=0.1)
    else:
        raise ValueError("Unsupported method")
    
    reduced = reducer.fit_transform(embeddings)
    fig = px.scatter(
        x=reduced[:, 0],
        y=reduced[:, 1],
        color=labels,
        title=f"Embeddings Visualization - {method}"
    )
    fig.show()
