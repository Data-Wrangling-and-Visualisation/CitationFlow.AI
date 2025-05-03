import { BASE_URL } from './config.js';

const ENDPOINT = "http://" + BASE_URL + ":8000";

export async function getNodes() {
  const response = await fetch(`${ENDPOINT}/nodes`);
  if (!response.ok) {
    throw new Error("Failed to fetch nodes");
  }
  return response.json();
}

export async function getClusters() {
  const response = await fetch(`${ENDPOINT}/clusters`);
  if (!response.ok) {
    throw new Error("Failed to fetch nodes");
  }
  return response.json();
}