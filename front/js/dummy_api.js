function randomDOI(i) {
  return `10.1000/${i.toString().padStart(4, '0')}`;
}

function randomTerms() {
  const terms = ['AI', 'ML', 'Bioinformatics', 'NLP', 'Vision', 'Data Mining', "Aboba"];
  return [
    terms[Math.floor(Math.random() * terms.length)],
    terms[Math.floor(Math.random() * terms.length)]
  ];
}

function randomAuthors() {
  const names = ['Alice', 'Bob', 'Carol', 'Dave', 'Eve', 'Frank'];
  return Array.from({ length: Math.floor(Math.random() * 3 + 1) }, () =>
    names[Math.floor(Math.random() * names.length)]
  );
}

function randomDate() {
  const year = 2020 + Math.floor(Math.random() * 5);
  const month = String(Math.floor(Math.random() * 12 + 1)).padStart(2, '0');
  const day = String(Math.floor(Math.random() * 28 + 1)).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function generateNodes(n = 100) {
  return Array.from({ length: n }, (_, i) => ({
    doi: randomDOI(i),
    terms: randomTerms(),
    refs: Math.floor(Math.random() * 4),
    date: randomDate() // ⬅️ Date added here
  }));
}

const mockNodes = generateNodes(100);

export async function getNodes() {
  return mockNodes;
}

export async function getNodeInfo(doi) {
  const node = mockNodes.find(n => n.doi === doi);
  if (!node) return null;
  return {
    doi: node.doi,
    title: `A Study on ${node.terms[0]}`,
    authors: randomAuthors(),
    date: node.date,
    topics: node.terms,
    url: `https://doi.org/${node.doi}`,
    refs: node.refs
  };
}

export async function getNodeRefs(doi) {
  const sourceIndex = mockNodes.findIndex(n => n.doi === doi);
  if (sourceIndex === -1) return [];

  const refCount = mockNodes[sourceIndex].refs;
  const targets = new Set();

  while (targets.size < refCount) {
    const randomIndex = Math.floor(Math.random() * mockNodes.length);
    if (randomIndex !== sourceIndex) {
      targets.add(mockNodes[randomIndex].doi);
    }
  }

  return Array.from(targets);
}
