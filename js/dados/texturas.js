// Desenha os números das faces num <canvas> e transforma em textura.
import * as THREE from 'three';

const TAMANHO = 256;
const AMBIGUOS = new Set(['6', '9']); // sublinhados, para não confundir 6 com 9

export function criarTexturaNumero(texto, { cor, fonte, sublinhar = false }) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = TAMANHO;
  const ctx = canvas.getContext('2d');
  const corpo = texto.length > 1 ? 112 : 148;

  ctx.font = `700 ${corpo}px ${fonte}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = cor;
  ctx.fillText(texto, TAMANHO / 2, TAMANHO / 2 + corpo * 0.05);
  if (sublinhar && AMBIGUOS.has(texto)) {
    ctx.fillRect(TAMANHO / 2 - corpo * 0.22, TAMANHO / 2 + corpo * 0.42, corpo * 0.44, corpo * 0.07);
  }

  const textura = new THREE.CanvasTexture(canvas);
  textura.colorSpace = THREE.SRGBColorSpace;
  textura.anisotropy = 4;
  return textura;
}
