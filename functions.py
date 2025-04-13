import json
import requests
from time import sleep

def get_paper_meta(doi):
    url = "https://api.crossref.org/works/" + doi
    response = requests.get(url)
    response = response.json()
    if response['status'] != 'ok':
        sleep(2)
        get_paper_meta(doi)
        return None
    else:
        return response['message']

def get_authors(doi):
    paper = get_paper_meta(doi)
    authors = paper['author'] if 'author' in paper.keys() else []
    res = []
    #print(authors)
    for author in authors:
        res.append(author['given'] if 'given' in author.keys() else ""  +  " " + author['family'] if 'family' in author.keys() else "")
        
    return res

def get_title(doi):
    paper = get_paper_meta(doi)
    return paper['title']

def get_date(doi):
    paper = get_paper_meta(doi)
    return paper['indexed']['date-time']

def get_url(doi):
    paper = get_paper_meta(doi)
    return paper['URL'] 
   