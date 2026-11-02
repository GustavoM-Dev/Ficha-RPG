import { SistemaDeRegras } from '../../nucleo/SistemaDeRegras.js';
import { definicoesDeAtributos } from './catalogo/atributos.js';

export class SistemaTormenta20 extends SistemaDeRegras {
    constructor() {
        super('tormenta20', 'Tormenta20');
    }

    get definicoesDeAtributos() {
        return definicoesDeAtributos;
    }

    calcularModificador(valor) {
        if (!Number.isInteger(valor)) {
            throw new TypeError(`Modificador inválido para calcular o modificador: ${valor}`);
        }

        return Math.floor((valor - 10) / 2);
    }
}