import { Atributo } from './Atributo.js';

export class SistemaDeRegras {
    #id;
    #nome;

    constructor(id, nome) {

        if (new.target === SistemaDeRegras) {
            throw new TypeError('SistemaDeRegras é abstrata: crie uma subclasse, como Tormenta 20.');
        }

        if (typeof id !== 'string' || id.trim() === '') {
            throw new TypeError(`ID de sistema inválido: "${id}"`);
        }
        if (typeof nome !== 'string' || nome.trim() === '') {
            throw new TypeError(`Nome de sistema inválido: "${nome}"`);
        }
        this.#id = id;
        this.#nome = nome;
    }

    get id() {
        return this.#id;
    }

    get nome() {
        return this.#nome;
    }

    get definicoesDeAtributos() {
        throw new Error(`${this.constructor.name} precisa implementar o getter definicoesDeAtributos`);
    }

    calcularModificador(valor) {
        throw new Error(`${this.constructor.name} precisa implementar calcularModificador()`);
    }

    criarAtributos(valorInicial) {
        const atributos = new Map();

        for (const { sigla, nome } of this.definicoesDeAtributos) {
            atributos.set(sigla, new Atributo(sigla, nome, valorInicial));
        }

        return atributos;
    }
}