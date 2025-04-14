const BASE_URL = "http://localhost:8000";

export async function getNodes() {
  const response = await fetch(`${BASE_URL}/nodes`);
  if (!response.ok) {
    throw new Error("Failed to fetch nodes");
  }
  return response.json();
}

export async function getNodeInfo(doi) {
  const encodedDOI = encodeURIComponent(doi);
  const response = await fetch(`${BASE_URL}/node?doi=${encodedDOI}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch node info for DOI: ${doi}`);
  }
  return response.json();
}

export async function getNodeRefs(doi) {
  const encodedDOI = encodeURIComponent(doi);
  const response = await fetch(`${BASE_URL}/refs?doi=${encodedDOI}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch references for DOI: ${doi}`);
  }
  return response.json();
}

