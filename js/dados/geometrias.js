// Formas dos dados e "qual face mostra qual número".
// Nada de regra de jogo aqui: este módulo só sabe desenhar dados.
import * as THREE from 'three';

const TOLERANCIA = 1e-4;

const sequencia = (n, formatar = i => String(i + 1)) => Array.from({ length: n }, (_, i) => formatar(i));

/** Números impressos em cada tipo de dado, na ordem dos valores. */
const ROTULOS = {
  4: sequencia(4),
  6: sequencia(6),
  8: sequencia(8),
  10: sequencia(10),
  12: sequencia(12),
  20: sequencia(20),
  dezenas: sequencia(10, i => `${i}0`),   // d% — dado das dezenas: 00, 10 … 90
  unidades: sequencia(10, i => String(i)), // d% — dado das unidades: 0 … 9
};

export function rotulosDoConjunto(conjunto) {
  const rotulos = ROTULOS[conjunto];
  if (!rotulos) throw new RangeError(`Conjunto de rótulos desconhecido: ${conjunto}`);
  return rotulos;
}

/**
 * d10: trapezoedro pentagonal. Dois anéis de 5 vértices (alturas ±a)
 * e dois polos (±h). A razão h/a abaixo deixa cada face ("pipa") plana.
 */
function criarGeometriaD10(raio) {
  const c = Math.cos(Math.PI / 5);
  const a = 0.105 * raio;
  const h = a * (1 + c) / (1 - c);
  const anel = (z, defasagem) => sequencia(5, i => i).map(i => {
    const ang = (2 * Math.PI * i) / 5 + defasagem;
    return new THREE.Vector3(raio * Math.cos(ang), raio * Math.sin(ang), z);
  });
  const topo = new THREE.Vector3(0, 0, h);
  const base = new THREE.Vector3(0, 0, -h);
  const sup = anel(a, 0);
  const inf = anel(-a, Math.PI / 5);

  const triangulos = [];
  for (let k = 0; k < 5; k++) {
    const k1 = (k + 1) % 5;
    triangulos.push([topo, sup[k], inf[k]], [topo, inf[k], sup[k1]]);
    triangulos.push([base, inf[k], sup[k1]], [base, sup[k1], inf[k1]]);
  }

  // Garante a ordem dos vértices com a normal para fora (senão a face some na renderização).
  const posicoes = [];
  for (const [p, q, r] of triangulos) {
    const normal = new THREE.Triangle(p, q, r).getNormal(new THREE.Vector3());
    const centro = p.clone().add(q).add(r);
    const [v1, v2] = normal.dot(centro) < 0 ? [r, q] : [q, r];
    posicoes.push(...p.toArray(), ...v1.toArray(), ...v2.toArray());
  }
  const geometria = new THREE.BufferGeometry();
  geometria.setAttribute('position', new THREE.Float32BufferAttribute(posicoes, 3));
  geometria.computeVertexNormals();
  return geometria;
}

const FORMAS = {
  4: () => new THREE.TetrahedronGeometry(1.15),
  6: () => new THREE.BoxGeometry(1.25, 1.25, 1.25),
  8: () => new THREE.OctahedronGeometry(1.05),
  10: () => criarGeometriaD10(1),
  12: () => new THREE.DodecahedronGeometry(1),
  20: () => new THREE.IcosahedronGeometry(1.05),
};

/**
 * Agrupa os triângulos da geometria em faces (triângulos com a mesma normal)
 * e calcula, para cada face: centro, normal, direção "para cima" do número
 * e o tamanho que o número pode ocupar.
 */
export function extrairFaces(geometria, { alinharPelaAresta = false } = {}) {
  const pos = geometria.attributes.position;
  const faces = [];
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();

  for (let i = 0; i < pos.count; i += 3) {
    a.fromBufferAttribute(pos, i);
    b.fromBufferAttribute(pos, i + 1);
    c.fromBufferAttribute(pos, i + 2);
    const normal = new THREE.Triangle(a, b, c).getNormal(new THREE.Vector3());
    if (normal.dot(a.clone().add(b).add(c)) < 0) normal.negate();

    let face = faces.find(f => f.normal.dot(normal) > 1 - TOLERANCIA);
    if (!face) faces.push(face = { normal, vertices: [] });
    for (const v of [a, b, c]) {
      if (!face.vertices.some(w => w.distanceTo(v) < TOLERANCIA)) face.vertices.push(v.clone());
    }
  }
  return faces.map(face => completarFace(face, alinharPelaAresta));
}

function completarFace({ normal, vertices }, alinharPelaAresta) {
  const centro = vertices.reduce((s, v) => s.add(v), new THREE.Vector3()).divideScalar(vertices.length);

  // Ordena os vértices em volta do centro para percorrer as arestas.
  const e1 = vertices[0].clone().sub(centro).normalize();
  const e2 = normal.clone().cross(e1);
  const angulo = v => { const d = v.clone().sub(centro); return Math.atan2(d.dot(e2), d.dot(e1)); };
  vertices.sort((p, q) => angulo(p) - angulo(q));

  const arestas = vertices.map((v, i) => [v, vertices[(i + 1) % vertices.length]]);
  const raioInterno = Math.min(...arestas.map(([p, q]) => {
    const direcao = q.clone().sub(p).normalize();
    return centro.clone().sub(p).cross(direcao).length();
  }));

  // Para onde aponta o "topo" do número: aresta (d6) ou vértice mais distante (demais).
  const alvo = alinharPelaAresta
    ? arestas[0][0].clone().add(arestas[0][1]).multiplyScalar(0.5)
    : vertices.reduce((longe, v) => (v.distanceTo(centro) > longe.distanceTo(centro) ? v : longe));
  const cima = alvo.clone().sub(centro).normalize();

  const direita = cima.clone().cross(normal);
  const orientacao = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(direita, cima, normal));

  return { normal, centro, cima, raioInterno, orientacao };
}

/**
 * Distribui os valores pelas faces como num dado de verdade:
 * faces opostas somam (menor + maior), ex.: 1 oposto ao 20 no d20.
 * Devolve, para cada face, o índice do valor que ela mostra.
 */
function numerarFaces(faces) {
  const indices = new Array(faces.length).fill(-1);
  let menor = 0, maior = faces.length - 1;
  faces.forEach((face, i) => {
    if (indices[i] !== -1) return;
    const oposta = faces.findIndex((f, j) => indices[j] === -1 && j !== i && f.normal.dot(face.normal) < -1 + TOLERANCIA);
    indices[i] = menor++;
    if (oposta !== -1) indices[oposta] = maior--;
  });
  return indices;
}

const modelos = new Map();

/** Geometria, bordas e faces de um tipo de dado (criadas uma vez e reaproveitadas). */
export function obterModelo(lados) {
  if (!modelos.has(lados)) {
    const criar = FORMAS[lados];
    if (!criar) throw new RangeError(`Forma de dado desconhecida: d${lados}`);
    let geometria = criar();
    if (geometria.index) geometria = geometria.toNonIndexed();
    const faces = extrairFaces(geometria, { alinharPelaAresta: lados === 6 });
    modelos.set(lados, {
      geometria,
      bordas: new THREE.EdgesGeometry(geometria, 10),
      faces,
      valorDaFace: numerarFaces(faces),
      alturaDeRepouso: faces[0].centro.dot(faces[0].normal),
    });
  }
  return modelos.get(lados);
}
