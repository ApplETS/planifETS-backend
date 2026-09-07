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


def visualize_embeddings_programs_type(embeddings, program_df, method='PCA'):
    # Define a function to assign categories
    def assign_category(title):
        title = title.lower()
        color_map = {
            "logiciel": "blue",
            "mécanique": "green",
            "construction": "orange",
            "information": "purple",
            "production": "red",
            "logistique": "yellow",
            "électrique": "pink",
            "santé": "brown",
            "financière": "gray",
            "télécom": "black",
            "gestion": "cyan",
            "environnement": "magenta",
            "aérospatiale": "olive",
            "expérience": "teal",
            "interna": "navy",
            "entreprenariat": "maroon",
            "projet": "gold",
            "génie": "silver",
            "informatique": "indigo",
            "aérospatial": "orchid",
        }

        for category, color in color_map.items():
            if category in title:
                return category

        return "Other"

    # Assign categories to the program DataFrame
    program_df['category'] = program_df['title'].apply(assign_category)

    # Choose dimensionality reduction method
    if method == 'PCA':
        reducer = PCA(n_components=2)
    elif method == 't-SNE':
        reducer = TSNE(n_components=2, perplexity=30, n_iter=1000)
    elif method == 'UMAP':
        reducer = umap.UMAP(n_components=2, n_neighbors=15, min_dist=0.1)
    else:
        raise ValueError("Unsupported method")

    # Reduce embeddings to 2D
    reduced = reducer.fit_transform(embeddings)

    # Create scatter plot
    fig = px.scatter(
        x=reduced[:, 0],
        y=reduced[:, 1],
        color=program_df['category'],
        labels={'color': 'Category'},
        title=f"Embeddings Visualization - {method}",
        hover_data={'Title': program_df['title']}
    )

    # Show the figure
    fig.show()

def visualize_embeddings_programs(embeddings, program_df, method='PCA'):
    # Define a function to assign categories
    def assign_category(title):
        title = title.lower()
        if "dess" in title:
            return "DESS"
        elif "micro" in title:
            return "Microprogramme"
        elif "certificat" in title:
            return "Certificat"
        elif "court" in title:
            return "Programme court"
        elif "bac" in title:
            return "Baccalauréat"
        elif "maîtrise" in title or "maitrise" in title:
            return "Maîtrise"
        elif "doc" in title:
            return "Doctorat"
        elif "Cheminement" in title:
            return "Cheminement"
        elif "Annee" in title:
            return "Année"
        else:
            return "Other"

    # Assign categories to the program DataFrame
    program_df['category'] = program_df['title'].apply(assign_category)

    # Choose dimensionality reduction method
    if method == 'PCA':
        reducer = PCA(n_components=2)
    elif method == 't-SNE':
        reducer = TSNE(n_components=2, perplexity=30, n_iter=1000)
    elif method == 'UMAP':
        reducer = umap.UMAP(n_components=2, n_neighbors=15, min_dist=0.1)
    else:
        raise ValueError("Unsupported method")

    # Reduce embeddings to 2D
    reduced = reducer.fit_transform(embeddings)

    # Create scatter plot
    fig = px.scatter(
        x=reduced[:, 0],
        y=reduced[:, 1],
        color=program_df['category'],
        labels={'color': 'Category'},
        title=f"Embeddings Visualization - {method}",
        hover_data={'Title': program_df['title']}
    )

    # Show the figure
    fig.show()
