const BASE_URL = "http://localhost:8000";

export async function getNodes() {
  const response = await fetch(`${BASE_URL}/nodes`, {
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error("Failed to fetch nodes");
  }
  return response.json();
}
