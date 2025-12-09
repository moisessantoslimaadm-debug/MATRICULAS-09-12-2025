
import Dexie, { Table } from 'dexie';
import { School, RegistryStudent } from '../types';

class EducaDatabase extends Dexie {
  schools!: Table<School>;
  students!: Table<RegistryStudent>;

  constructor() {
    super('EducaMunicipioDB');
    
    // Definição do Schema
    // Apenas os campos que queremos indexar para busca rápida precisam ser listados aqui
    (this as any).version(1).stores({
      schools: 'id, inep, name, address',
      students: 'id, enrollmentId, name, cpf, school, status, className' 
    });
  }
}

export const db = new EducaDatabase();