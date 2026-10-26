// Versão leve, sem 3D: usada com "reduzir movimento" ativo ou quando não há WebGL.
// Tem a mesma interface do Renderizador3D (animar, acelerar, limpar).

const esperar = ms => new Promise(resolver => setTimeout(resolver, ms));

export class Renderizador2D {
  #lista = document.createElement('div');

  constructor(container) {
    this.#lista.className = 'bandeja-dados__lista';
    container.append(this.#lista);
  }

  async preparar() {}

  async animar(dados) {
    this.#lista.replaceChildren(...dados.map(dado => this.#criarFicha(dado)));
    const reduzir = matchMedia('(prefers-reduced-motion: reduce)').matches;
    await esperar(reduzir ? 0 : 350);
  }

  acelerar() {}

  limpar() {
    this.#lista.replaceChildren();
  }

  #criarFicha({ lados, valor, destaque }) {
    const ficha = document.createElement('div');
    ficha.className = `dado-2d dado-2d--d${lados}`;
    if (destaque) ficha.classList.add(`dado-2d--${destaque}`);

    const numero = document.createElement('span');
    numero.className = 'dado-2d__valor';
    numero.textContent = valor;
    const tipo = document.createElement('span');
    tipo.className = 'dado-2d__tipo';
    tipo.textContent = lados === 100 ? 'd%' : `d${lados}`;

    ficha.append(numero, tipo);
    return ficha;
  }
}
