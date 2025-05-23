import json
import psycopg2
from datetime import datetime
import dotenv

import os

dotenv.load_dotenv()

conn = psycopg2.connect(
    dbname=os.getenv("DB_NAME", "cf_test"),
    user=os.getenv("DB_USER", "postgres"),
    password=os.getenv("DB_PASSWORD", "password"),
    host=os.getenv("DB_HOST", "localhost"),
    port=os.getenv("DB_PORT", "5432")
)

def tsv_to_json(tsv_filename, json_filename):
    """Converts a TSV file of citations into JSON format."""
    citations = {}
    with open(tsv_filename, 'r', encoding='utf-8') as tsv_file:
        lines = tsv_file.readlines()
        current_doi = None
        for line in lines:
            line = line.strip()
            if line.startswith('DOI:'):
                current_doi = line.replace('DOI:', '').strip()
                citations[current_doi] = []
            elif line and current_doi:
                parts = line.split('\t')
                if len(parts) == 2:
                    _, cited_doi = parts
                    citations[current_doi].append(cited_doi.strip('"'))
    with open(json_filename, 'w', encoding='utf-8') as json_file:
        json.dump(citations, json_file, indent=4)

def load_json(filename):
    """Loads data from a JSON file."""
    with open(filename, 'r', encoding='utf-8') as f:
        return json.load(f)

def create_tables(conn):
    """Creates the articles table with an array of citations."""
    with conn.cursor() as cur:
        cur.execute("""
            DROP TABLE IF EXISTS articles;
            CREATE TABLE IF NOT EXISTS articles (
                doi VARCHAR PRIMARY KEY,
                title TEXT,
                topics TEXT[],
                publish_date TIMESTAMP,
                url TEXT,
                authors TEXT[],
                citations TEXT[] DEFAULT '{}'
            );
        """)
        conn.commit()

def insert_article(conn, doi, article_data, citations=None):
    """Inserts or updates an article record in the articles table."""
    with conn.cursor() as cur:
        title = article_data.get('title')[0].strip('"{}') if len(article_data.get('title')) >= 1 else "Title missing"
        date_str = article_data.get('date')
        url = article_data.get('url')
        authors = article_data.get('author')
        topics = article_data.get('topic')

        if topics is not None:
            topics = [topics]
        else:
            return 0

        # Convert date string to datetime object
        publish_date = None
        if date_str:
            try:
                publish_date = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
            except ValueError:
                print(f"Invalid date format for DOI {doi}: {date_str}")

        # Insert with conflict handling
        cur.execute("""
            INSERT INTO articles (doi, title, topics, publish_date, url, authors, citations)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (doi) DO UPDATE SET
                topics = EXCLUDED.topics,
                title = EXCLUDED.title,
                publish_date = EXCLUDED.publish_date,
                url = EXCLUDED.url,
                authors = EXCLUDED.authors,
                citations = EXCLUDED.citations;
        """, (doi, title, topics, publish_date, url, authors, citations))
        conn.commit()

def main():

    print("Starting to populating DB")
    # Load data from JSON files
    articles_data = load_json('./data/raw_data.json')
    citations_data = load_json('./data/references.json')

    # Create table
    create_tables(conn)

    # Load articles
    for doi, data in articles_data.items():
        citations = citations_data.get(doi, [])
        insert_article(conn, doi, data, citations)

    conn.close()
    print("Data successfully loaded into the database.")

if __name__ == "__main__":
    main()
