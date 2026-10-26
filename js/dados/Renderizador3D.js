// Dados 3D com Three.js. A animação é "roteirizada": cada dado gira e quica
// até parar exatamente na face sorteada — o valor vem pronto de fora.
import * as THREE from 'three';
import { obterModelo, rotulosDoConjunto } from './geometrias.js';
import { criarTexturaNumero } from './texturas.js';

const EIXO_Z = new THREE.Vector3(0, 0, 1);
const ESPACO_ENTRE_DADOS = 2.7;
const DURACAO = 1500;           // ms até um dado parar
const ATRASO_ENTRE_DADOS = 60;  // ms entre o lançamento de um dado e o seguinte
const FONTE = 'Cinzel, "Times New Roman", serif';
const CINZA_FALHA = new THREE.Color('#6b6461');

const aleatorio = (min, max) => min + Math.random() * (max - min);
const lerp = (a, b, t) => a + (b - a) * t;

function lerCor(nome, reserva) {
  const valor = getComputedStyle(document.documentElement).getPropertyValue(nome).trim();
  return valor || reserva;
}

export class Renderizador3D {
  #renderer;
  #cena = new THREE.Scene();
  #camera = new THREE.PerspectiveCamera(30, 1, 0.1, 400);
  #luz = new THREE.DirectionalLight(0xffffff, 2.4);
  #cores;
  #materialBorda;
  #materiaisRotulo = new Map();
  #planoRotulo = new THREE.PlaneGeometry(1, 1);
  #dados = [];
  #inicio = 0;
  #resolver = null;
  #idQuadro = 0;

  static suportado() {
    try {
      const canvas = document.createElement('canvas');
      return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
    } catch {
      return false;
    }
  }

  constructor(container) {
    this.#cores = {
      corpo: new THREE.Color(lerCor('--vermelho', '#a8282c')),
      borda: new THREE.Color(lerCor('--vermelho-escuro', '#7d1a1e')),
      numero: lerCor('--papel-claro', '#f6f4f0'),
      brilho: new THREE.Color(lerCor('--foco', '#d9363c')),
    };
    this.#materialBorda = new THREE.LineBasicMaterial({ color: this.#cores.borda });

    this.#renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    this.#renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.#renderer.shadowMap.enabled = true;
    this.#renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.#renderer.domElement.classList.add('bandeja-dados__canvas');
    container.append(this.#renderer.domElement);

    this.#montarCena();
    this.#ajustarTamanho();
    window.addEventListener('resize', () => this.#ajustarTamanho());
  }

  /** Espera a fonte dos números carregar, para a textura não sair com fonte reserva. */
  async preparar() {
    try { await document.fonts?.load(`700 64px ${FONTE}`); } catch { /* segue com a fonte reserva */ }
  }

  /** Anima os dados; a Promise termina quando todos param. */
  animar(dados) {
    this.limpar();
    const fisicos = dados.flatMap(d => this.#paraDadosFisicos(d));
    const posicoes = this.#distribuir(fisicos.length);

    this.#dados = fisicos.map((fisico, i) => this.#criarDado(fisico, posicoes[i], i));
    this.#inicio = performance.now();
    return new Promise(resolver => {
      this.#resolver = resolver;
      this.#idQuadro = requestAnimationFrame(this.#quadro);
    });
  }

  /** Pula direto para o fim da animação (ex.: clique durante a rolagem). */
  acelerar() {
    this.#inicio = -Infinity;
  }

  limpar() {
    cancelAnimationFrame(this.#idQuadro);
    for (const dado of this.#dados) {
      this.#cena.remove(dado.objeto);
      dado.material.dispose();
    }
    this.#dados = [];
    this.#renderer.clear();
    this.#resolver?.();
    this.#resolver = null;
  }

  #montarCena() {
    this.#cena.add(new THREE.HemisphereLight(0xffffff, 0x8a6f62, 1.4));
    this.#luz.position.set(-4, 6, 14);
    this.#luz.castShadow = true;
    this.#luz.shadow.mapSize.set(1024, 1024);
    this.#cena.add(this.#luz);

    const chao = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.ShadowMaterial({ opacity: 0.22 }));
    chao.receiveShadow = true;
    this.#cena.add(chao);
  }

  #ajustarTamanho() {
    this.#renderer.setSize(window.innerWidth, window.innerHeight, false);
    this.#camera.aspect = window.innerWidth / window.innerHeight;
    this.#camera.updateProjectionMatrix();
  }

  /** O d% vira dois d10 (dezenas + unidades); os outros são um dado só. */
  #paraDadosFisicos({ lados, valor, destaque }) {
    if (lados === 100) {
      const dezena = Math.floor(valor / 10) % 10;
      return [
        { forma: 10, conjunto: 'dezenas', rotulo: `${dezena}0`, destaque },
        { forma: 10, conjunto: 'unidades', rotulo: String(valor % 10), destaque },
      ];
    }
    return [{ forma: lados, conjunto: lados, rotulo: String(valor), destaque }];
  }

  /** Posições finais em grade e câmera afastada o bastante para caber tudo. */
  #distribuir(quantidade) {
    const aspecto = this.#camera.aspect;
    const colunas = Math.min(quantidade, Math.max(1, Math.round(Math.sqrt(quantidade * aspecto * 0.8))));
    const linhas = Math.ceil(quantidade / colunas);

    const posicoes = [];
    for (let i = 0; i < quantidade; i++) {
      const linha = Math.floor(i / colunas);
      const naLinha = linha === linhas - 1 ? quantidade - linha * colunas : colunas;
      posicoes.push(new THREE.Vector2(
        ((i % colunas) - (naLinha - 1) / 2) * ESPACO_ENTRE_DADOS + aleatorio(-0.3, 0.3),
        ((linhas - 1) / 2 - linha) * ESPACO_ENTRE_DADOS + aleatorio(-0.3, 0.3),
      ));
    }

    const meiaAltura = Math.max(linhas, colunas / aspecto) * ESPACO_ENTRE_DADOS / 2 + 1.8;
    const distancia = Math.max(16, meiaAltura / Math.tan(THREE.MathUtils.degToRad(this.#camera.fov / 2)));
    this.#camera.position.set(0, -distancia * 0.18, distancia);
    this.#camera.lookAt(0, 0, 0);

    const sombra = this.#luz.shadow.camera;
    const alcance = meiaAltura * Math.max(1, aspecto) + 4;
    Object.assign(sombra, { left: -alcance, right: alcance, top: alcance, bottom: -alcance, near: 1, far: 60 });
    sombra.updateProjectionMatrix();
    return posicoes;
  }

  #criarDado({ forma, conjunto, rotulo, destaque }, destino, ordem) {
    const modelo = obterModelo(forma);
    const rotulos = rotulosDoConjunto(conjunto);
    const material = new THREE.MeshStandardMaterial({
      color: this.#cores.corpo, roughness: 0.42, metalness: 0.08, flatShading: true,
    });

    const objeto = new THREE.Group();
    const corpo = new THREE.Mesh(modelo.geometria, material);
    corpo.castShadow = true;
    objeto.add(corpo, new THREE.LineSegments(modelo.bordas, this.#materialBorda));

    let faceAlvo = 0;
    modelo.faces.forEach((face, i) => {
      const texto = rotulos[modelo.valorDaFace[i]];
      if (texto === rotulo) faceAlvo = i;
      const numero = new THREE.Mesh(this.#planoRotulo, this.#materialRotulo(texto, rotulos.length >= 10));
      numero.position.copy(face.centro).addScaledVector(face.normal, 0.004);
      numero.quaternion.copy(face.orientacao);
      numero.scale.setScalar(face.raioInterno * 2.1);
      objeto.add(numero);
    });
    this.#cena.add(objeto);

    const lancamento = new THREE.Vector2(aleatorio(6, 10), -aleatorio(6, 10));
    return {
      objeto,
      material,
      destaque,
      inicio: destino.clone().add(lancamento),
      fim: destino,
      repouso: modelo.alturaDeRepouso,
      atraso: Math.min(ordem, 10) * ATRASO_ENTRE_DADOS,
      duracao: DURACAO * aleatorio(0.85, 1.1),
      eixo: new THREE.Vector3(aleatorio(-1, 1), aleatorio(-1, 1), aleatorio(-1, 1)).normalize(),
      giros: aleatorio(2.5, 4) * 2 * Math.PI,
      orientacaoFinal: this.#orientacaoMostrando(modelo.faces[faceAlvo]),
      parado: false,
    };
  }

  /** Rotação que deixa a face virada para cima (+Z) com o número em pé (+Y). */
  #orientacaoMostrando(face) {
    const deitar = new THREE.Quaternion().setFromUnitVectors(face.normal, EIXO_Z);
    const cima = face.cima.clone().applyQuaternion(deitar);
    const endireitar = Math.PI / 2 - Math.atan2(cima.y, cima.x) + aleatorio(-0.25, 0.25);
    return new THREE.Quaternion().setFromAxisAngle(EIXO_Z, endireitar).multiply(deitar);
  }

  #materialRotulo(texto, sublinhar) {
    if (!this.#materiaisRotulo.has(texto)) {
      this.#materiaisRotulo.set(texto, new THREE.MeshStandardMaterial({
        map: criarTexturaNumero(texto, { cor: this.#cores.numero, fonte: FONTE, sublinhar }),
        transparent: true, roughness: 0.6, depthWrite: false,
      }));
    }
    return this.#materiaisRotulo.get(texto);
  }

  #quadro = agora => {
    let todosParados = true;
    for (const dado of this.#dados) {
      const t = THREE.MathUtils.clamp((agora - this.#inicio - dado.atraso) / dado.duracao, 0, 1);
      this.#mover(dado, t);
      if (t < 1) todosParados = false;
      else this.#destacar(dado, agora);
    }
    this.#renderer.render(this.#cena, this.#camera);

    if (todosParados && this.#resolver) {
      this.#resolver();
      this.#resolver = null;
    }
    // Continua desenhando enquanto os dados estão na tela (brilho do crítico pulsa).
    this.#idQuadro = requestAnimationFrame(this.#quadro);
  };

  #mover(dado, t) {
    const avanco = 1 - (1 - t) ** 3;                                  // desacelera ao chegar
    const quique = 3.2 * (1 - t) ** 1.6 * Math.abs(Math.cos(2.5 * Math.PI * t));
    dado.objeto.position.set(
      lerp(dado.inicio.x, dado.fim.x, avanco),
      lerp(dado.inicio.y, dado.fim.y, avanco),
      dado.repouso + quique,
    );
    const giroRestante = dado.giros * (1 - t) ** 4;                   // gira rápido e vai parando
    dado.objeto.quaternion.setFromAxisAngle(dado.eixo, giroRestante).multiply(dado.orientacaoFinal);
  }

  #destacar(dado, agora) {
    if (dado.destaque === 'critico') {
      dado.material.emissive.copy(this.#cores.brilho);
      dado.material.emissiveIntensity = 0.45 + 0.35 * Math.sin(agora / 170);
    } else if (dado.destaque === 'falha' && !dado.parado) {
      dado.material.color.copy(CINZA_FALHA);
    }
    dado.parado = true;
  }
}
