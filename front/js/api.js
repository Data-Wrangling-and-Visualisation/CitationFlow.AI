import { BASE_URL } from './config.js';

const ENDPOINT = BASE_URL + ":8000";

export async function getNodes(node_num) {
  const response = await fetch(`${ENDPOINT}/nodes?node_num=` + node_num);
  if (!response.ok) {
    throw new Error("Failed to fetch nodes");
  }
  return response.json();
}
