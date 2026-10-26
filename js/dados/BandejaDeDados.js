// Bandeja de dados: a única peça que o resto da ficha precisa conhecer.
//
//   const bandeja = new BandejaDeDados();
//   await bandeja.rolar([{ lados: 20, valor: 17, destaque: 'critico' }, { lados: 6, valor: 4 }]);
//
// Os valores chegam prontos da lógica de rolagem; a bandeja só mostra.
// Por isso ela não conhece regra de nenhum sistema de RPG.
import { Renderizador2D } from './Renderizador2D.js';

const LADOS_VALIDOS = [4, 6, 8, 10, 12, 20, 100];
const DESTAQUES = ['critico', 'falha'];
const DURACAO_SAIDA = 250; // ms — igual à transição de opacidade em dados.css

export class BandejaDeDados {
  #raiz = document.createElement('div');
  #anuncio = document.createElement('div');
  #permanencia;
  #forcar2D;
  #renderizador = null;
  #rolando = false;
  #rodada = 0;
  #temporizador = 0;

  /**
   * @param {HTMLElement} container onde a bandeja é inserida
   * @param {object} opcoes
   * @param {number} opcoes.permanencia ms que os dados ficam na tela após parar (0 = até clicar)
   * @param {boolean} opcoes.forcar2D usa sempre a versão sem 3D
   */
  constructor(container = document.body, { permanencia = 3000, forcar2D = false } = {}) {
    this.#permanencia = permanencia;
    this.#forcar2D = forcar2D;

    this.#raiz.className = 'bandeja-dados';
    this.#raiz.setAttribute('aria-hidden', 'true'); // o anúncio abaixo é que fala com leitores de tela
    this.#anuncio.className = 'bandeja-dados__anuncio';
    this.#anuncio.setAttribute('role', 'status');
    container.append(this.#raiz, this.#anuncio);

    this.#raiz.addEventListener('click', () => (this.#rolando ? this.#renderizador?.acelerar() : this.limpar()));
    document.addEventListener('keydown', evento => {
      if (evento.key === 'Escape' && this.#visivel) this.limpar();
    });
  }

  /**
   * Mostra os dados rolando até pararem nos valores informados.
   * @param {{lados: number, valor: number, destaque?: 'critico'|'falha'}[]} dados
   * @param {{anuncio?: string}} opcoes texto lido pelo leitor de tela (padrão: lista dos valores)
   * @returns {Promise<object[]>} os dados validados, quando a animação termina
   */
  async rolar(dados, { anuncio } = {}) {
    const lista = BandejaDeDados.#validar(dados);
    const rodada = ++this.#rodada;
    clearTimeout(this.#temporizador);

    const renderizador = await this.#obterRenderizador();
    if (rodada !== this.#rodada) return lista; // outra rolagem começou enquanto carregava

    this.#anuncio.textContent = '';
    this.#raiz.classList.add('bandeja-dados--visivel');
    this.#rolando = true;
    await renderizador.animar(lista);
    if (rodada !== this.#rodada) return lista; // foi interrompida por outra rolagem ou por limpar()

    this.#rolando = false;
    this.#anuncio.textContent = anuncio ?? BandejaDeDados.#descrever(lista);
    if (this.#permanencia > 0) {
      this.#temporizador = setTimeout(() => this.limpar(), this.#permanencia);
    }
    return lista;
  }

  /** Esconde a bandeja (com transição) e remove os dados. */
  limpar() {
    const rodada = ++this.#rodada;
    clearTimeout(this.#temporizador);
    this.#rolando = false;
    this.#raiz.classList.remove('bandeja-dados--visivel');
    setTimeout(() => {
      const carregado = this.#renderizador && !(this.#renderizador instanceof Promise);
      if (rodada === this.#rodada && carregado) this.#renderizador.limpar();
    }, DURACAO_SAIDA);
  }

  get #visivel() {
    return this.#raiz.classList.contains('bandeja-dados--visivel');
  }

  /** Carrega o 3D só na primeira rolagem; se não der (sem WebGL, CDN fora do ar), usa o 2D. */
  async #obterRenderizador() {
    this.#renderizador ??= this.#criarRenderizador();
    return this.#renderizador = await this.#renderizador;
  }

  async #criarRenderizador() {
    const reduzir = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduzir && !this.#forcar2D) {
      try {
        const { Renderizador3D } = await import('./Renderizador3D.js');
        if (Renderizador3D.suportado()) {
          const renderizador = new Renderizador3D(this.#raiz);
          await renderizador.preparar();
          return renderizador;
        }
      } catch (erro) {
        console.warn('Dados 3D indisponíveis; usando a versão 2D.', erro);
      }
    }
    const renderizador = new Renderizador2D(this.#raiz);
    await renderizador.preparar();
    return renderizador;
  }

  static #validar(dados) {
    if (!Array.isArray(dados) || dados.length === 0) {
      throw new TypeError('rolar() espera uma lista com pelo menos um dado.');
    }
    return dados.map(({ lados, valor, destaque = null }) => {
      if (!LADOS_VALIDOS.includes(lados)) {
        throw new RangeError(`d${lados} não é suportado. Use: ${LADOS_VALIDOS.join(', ')}.`);
      }
      if (!Number.isInteger(valor) || valor < 1 || valor > lados) {
        throw new RangeError(`O valor ${valor} é impossível em um d${lados}.`);
      }
      if (destaque !== null && !DESTAQUES.includes(destaque)) {
        throw new RangeError(`Destaque "${destaque}" desconhecido. Use: ${DESTAQUES.join(', ')}.`);
      }
      return { lados, valor, destaque };
    });
  }

  static #descrever(lista) {
    const nomes = { critico: ' (crítico)', falha: ' (falha)' };
    const partes = lista.map(({ lados, valor, destaque }) =>
      `${lados === 100 ? 'd%' : `d${lados}`}: ${valor}${nomes[destaque] ?? ''}`);
    return `Rolagem — ${partes.join('; ')}.`;
  }
}
