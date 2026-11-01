export class Atributo {
    #sigla;
    #nome;
    #valor;

    constructor(sigla, nome, valor) {
        if (typeof sigla !== 'string' || sigla.trim() === '') {
            throw new TypeError(`Sigla inválida:`);
        }
        this.#sigla = sigla;
        if (typeof nome !== 'string' || nome.trim() === '') {
            throw new TypeError(`Nome inválido:`);
        }
        this.#nome = nome;
        this.valor = valor;
    }

    get nome() {
        return this.#nome;
    }

    get sigla() {
        return this.#sigla;
    }

    get valor() {
        return this.#valor;
    }

    set valor(novoValor) {
        if (!Number.isInteger(novoValor)) {
            throw new TypeError(`${this.#nome} recebeu um valor inválido: ${novoValor}`);
        }
        this.#valor = novoValor;
    }
}